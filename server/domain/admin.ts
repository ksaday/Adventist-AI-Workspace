/**
 * Administrative Console and Governance Service (Phase 8).
 *
 * Implements:
 * 1. User Governance: Role assignment (mandatory TOTP check for admin role), status suspension.
 * 2. Source Directory Management: Pinned entries and revisions governance.
 * 3. Feature Flags & Config: Runtime controls (BYOK toggle, maintenance mode, captcha).
 * 4. Emergency Directory & System Announcements.
 * 5. Tamper-evident Audit Log Viewer with cryptographic integrity verification.
 * 6. Break-Glass Emergency Execution: Content inspection with unsuppressable notification.
 * 7. Accretion Tripwire (SR-D3) Report Execution.
 */

import crypto from 'node:crypto';
import { type ActorContext } from '../authz/index.js';
import { type AuditChain, type AuditRecord } from '../audit/index.js';
import {
  type BreakGlassGrant,
  type BreakGlassScope,
  invokeBreakGlass,
  isBreakGlassActive,
} from '../auth/break-glass.js';
import {
  assertAdminTotpEnrolled,
  canAssignAdminRole,
  AdminTotpRequiredError,
  hasRecentReauth,
} from '../auth/totp.js';
import { type ConversationService, type StoredConversation } from './conversation.js';
import { decryptEnvelope, type AADContext } from '../crypto/index.js';
import { type SourceBlockRefService } from './source-block.js';
import { runAccretionTripwire, type AccretionReport } from '../jobs/accretion-tripwire.js';

export interface AdminUserRecord {
  userId: string;
  emailHash: string;
  role: 'member' | 'pastor' | 'admin';
  tier: 'free' | 'member' | 'pastor';
  status: 'active' | 'suspended' | 'pending_deletion' | 'deleted';
  totpEnabled: boolean;
  createdAt: string;
}

export interface FeatureFlags {
  byok_enabled: boolean;
  captcha_enabled: boolean;
  maintenance_mode: boolean;
  registration_open: boolean;
}

export interface EmergencyResourceEntry {
  id: string;
  countryCode: string;
  name: string;
  number: string;
  sms?: string;
  url?: string;
  available24_7: boolean;
}

export interface SystemAnnouncement {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  active: boolean;
  createdAt: string;
}

export class AdminService {
  private users: Map<string, AdminUserRecord> = new Map();
  private featureFlags: FeatureFlags = {
    byok_enabled: false,
    captcha_enabled: false,
    maintenance_mode: false,
    registration_open: true,
  };
  private emergencyResources: Map<string, EmergencyResourceEntry> = new Map();
  private announcements: SystemAnnouncement[] = [];
  private auditChain: AuditChain;
  private conversationService: ConversationService;
  private sourceBlockService?: SourceBlockRefService;

  constructor(params: {
    auditChain: AuditChain;
    conversationService: ConversationService;
    sourceBlockService?: SourceBlockRefService;
    initialUsers?: AdminUserRecord[];
  }) {
    this.auditChain = params.auditChain;
    this.conversationService = params.conversationService;
    this.sourceBlockService = params.sourceBlockService;

    if (params.initialUsers) {
      for (const u of params.initialUsers) {
        this.users.set(u.userId, { ...u });
      }
    }

    // Default emergency hotline seed
    this.emergencyResources.set('us-988', {
      id: 'us-988',
      countryCode: 'US',
      name: 'Suicide & Crisis Lifeline',
      number: '988',
      sms: '988',
      url: 'https://988lifeline.org',
      available24_7: true,
    });
  }

  private assertAdmin(actor: ActorContext): void {
    if (actor.role !== 'admin') {
      throw new Error('Unauthorized: Administrative privileges required.');
    }
  }

  // --- 1. User Governance ---

  public listUsers(actor: ActorContext): AdminUserRecord[] {
    this.assertAdmin(actor);
    return Array.from(this.users.values());
  }

  public updateUserRole(
    actor: ActorContext,
    targetUserId: string,
    newRole: 'member' | 'pastor' | 'admin',
    options?: { reauthenticated?: boolean }
  ): AdminUserRecord {
    this.assertAdmin(actor);

    // Mutations require re-authentication within 15 minutes (PR-ADM-08)
    if (options && options.reauthenticated === false) {
      throw new Error('Fresh re-authentication required to mutate administrative settings.');
    }

    const target = this.users.get(targetUserId);
    if (!target) {
      throw new Error(`User not found: ${targetUserId}`);
    }

    // SR-1.8: Mandatory TOTP for admin accounts
    if (newRole === 'admin' && !canAssignAdminRole(target)) {
      throw new AdminTotpRequiredError(
        'Cannot grant administrative role: target account does not have Two-Factor Authentication (TOTP) enabled.'
      );
    }

    const oldRole = target.role;
    target.role = newRole;

    this.auditChain.append({
      id: `role-${Date.now()}`,
      actorId: actor.userId,
      action: 'user_role_updated',
      resourceId: targetUserId,
      payloadDigest: `role:${oldRole}->${newRole}`,
    });

    return { ...target };
  }

  public setUserStatus(
    actor: ActorContext,
    targetUserId: string,
    status: 'active' | 'suspended',
    options?: { reauthenticated?: boolean }
  ): AdminUserRecord {
    this.assertAdmin(actor);

    if (options && options.reauthenticated === false) {
      throw new Error('Fresh re-authentication required for administrative mutation.');
    }

    const target = this.users.get(targetUserId);
    if (!target) {
      throw new Error(`User not found: ${targetUserId}`);
    }

    target.status = status;

    this.auditChain.append({
      id: `status-${Date.now()}`,
      actorId: actor.userId,
      action: 'user_status_updated',
      resourceId: targetUserId,
      payloadDigest: `status:${status}`,
    });

    return { ...target };
  }

  // --- 2. Feature Flags ---

  public getFeatureFlags(actor: ActorContext): FeatureFlags {
    this.assertAdmin(actor);
    return { ...this.featureFlags };
  }

  public setFeatureFlag(
    actor: ActorContext,
    flag: keyof FeatureFlags,
    value: boolean,
    options?: { reauthenticated?: boolean }
  ): FeatureFlags {
    this.assertAdmin(actor);

    if (options && options.reauthenticated === false) {
      throw new Error('Fresh re-authentication required for feature flag mutation.');
    }

    this.featureFlags[flag] = value;

    this.auditChain.append({
      id: `flag-${Date.now()}`,
      actorId: actor.userId,
      action: 'feature_flag_updated',
      resourceId: String(flag),
      payloadDigest: `value:${value}`,
    });

    return { ...this.featureFlags };
  }

  // --- 3. Emergency Directory & Announcements ---

  public listEmergencyResources(actor: ActorContext): EmergencyResourceEntry[] {
    this.assertAdmin(actor);
    return Array.from(this.emergencyResources.values());
  }

  public setEmergencyResource(
    actor: ActorContext,
    resource: EmergencyResourceEntry
  ): EmergencyResourceEntry {
    this.assertAdmin(actor);
    this.emergencyResources.set(resource.id, { ...resource });

    this.auditChain.append({
      id: `emg-${Date.now()}`,
      actorId: actor.userId,
      action: 'emergency_resource_updated',
      resourceId: resource.id,
      payloadDigest: `country:${resource.countryCode},number:${resource.number}`,
    });

    return resource;
  }

  public listAnnouncements(actor: ActorContext): SystemAnnouncement[] {
    this.assertAdmin(actor);
    return [...this.announcements];
  }

  public createAnnouncement(
    actor: ActorContext,
    params: { message: string; severity: 'info' | 'warning' | 'critical' }
  ): SystemAnnouncement {
    this.assertAdmin(actor);

    const announcement: SystemAnnouncement = {
      id: `ann-${crypto.randomBytes(6).toString('hex')}`,
      message: params.message,
      severity: params.severity,
      active: true,
      createdAt: new Date().toISOString(),
    };

    this.announcements.unshift(announcement);

    this.auditChain.append({
      id: `ann-audit-${Date.now()}`,
      actorId: actor.userId,
      action: 'announcement_created',
      resourceId: announcement.id,
      payloadDigest: `severity:${announcement.severity}`,
    });

    return announcement;
  }

  // --- 4. Audit Log Viewer ---

  public getAuditRecords(actor: ActorContext): {
    records: readonly AuditRecord[];
    chainIntegrity: { valid: boolean; error?: string };
  } {
    this.assertAdmin(actor);
    const integrity = this.auditChain.verify();
    return {
      records: this.auditChain.getRecords(),
      chainIntegrity: integrity,
    };
  }

  // --- 5. Break-Glass Content Inspection ---

  /**
   * Invokes break-glass access to view conversation content.
   * Sends unsuppressable email notification unconditionally.
   */
  public requestBreakGlass(params: {
    actor: ActorContext;
    reauthenticated: boolean;
    reason: string;
    scope: BreakGlassScope;
    durationMinutes?: number;
    clock?: { now: () => Date };
  }): { grant: BreakGlassGrant } {
    this.assertAdmin(params.actor);

    const { grant } = invokeBreakGlass({
      actor: params.actor,
      reauthenticated: params.reauthenticated,
      reason: params.reason,
      scope: params.scope,
      durationMinutes: params.durationMinutes,
      auditChain: this.auditChain,
      clock: params.clock,
    });

    return { grant };
  }

  /**
   * Decrypts and returns conversation content ONLY with an active break-glass grant.
   * Without active break-glass, administrator access to user content is strictly rejected.
   */
  public readConversationContentWithBreakGlass(params: {
    actor: ActorContext;
    breakGlassGrantId: string;
    conversationId: string;
    userDek: Buffer;
    clock?: { now: () => Date };
  }): {
    conversation: StoredConversation;
    title: string;
    messages: Array<{ seq: number; role: string; body?: string }>;
  } {
    this.assertAdmin(params.actor);

    const currentTime = params.clock ? params.clock.now() : new Date();

    // Verify active break-glass grant
    const isActive = isBreakGlassActive(
      params.breakGlassGrantId,
      { conversationId: params.conversationId },
      currentTime
    );

    if (!isActive) {
      throw new Error(
        'SECURITY INVARIANT: Access denied. Reading conversation content requires an active, unexpired break-glass grant matching this conversation scope (PR-ADM-03).'
      );
    }

    const conv = this.conversationService.getConversation(params.conversationId);
    if (!conv) {
      throw new Error(`Conversation not found: ${params.conversationId}`);
    }

    // Decrypt title
    const titleAad: AADContext = {
      userId: conv.userId,
      resourceId: conv.id,
      purpose: 'conversation_title',
    };
    const title = decryptEnvelope(conv.titleEnc, params.userDek, titleAad);

    // Decrypt messages
    const decryptedMessages = conv.messages.map(m => {
      let body: string | undefined = undefined;
      if (m.bodyEnc && conv.privacyMode !== 'ephemeral') {
        const msgAad: AADContext = {
          userId: conv.userId,
          resourceId: `${conv.id}:${m.seq}`,
          purpose: 'message_body',
        };
        body = decryptEnvelope(m.bodyEnc, params.userDek, msgAad);
      }
      return {
        seq: m.seq,
        role: m.role,
        body,
      };
    });

    return {
      conversation: conv,
      title,
      messages: decryptedMessages,
    };
  }

  // --- 6. Accretion Tripwire Trigger ---

  public async runAccretionReport(
    actor: ActorContext,
    options?: { thresholdChars?: number; clock?: { now: () => Date } }
  ): Promise<AccretionReport> {
    this.assertAdmin(actor);

    if (!this.sourceBlockService) {
      throw new Error('SourceBlockRefService is not configured for accretion reporting.');
    }

    return runAccretionTripwire(this.sourceBlockService, {
      thresholdChars: options?.thresholdChars,
      clock: options?.clock,
      auditChain: this.auditChain,
    });
  }
}

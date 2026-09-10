import { describe, it, expect, beforeEach } from 'vitest';
import { AdminService, type AdminUserRecord } from '../../server/domain/admin.js';
import { ConversationService } from '../../server/domain/conversation.js';
import { SourceBlockRefService } from '../../server/domain/source-block.js';
import { AuditChain } from '../../server/audit/index.js';
import { generateUserDek } from '../../server/crypto/index.js';
import { AdminTotpRequiredError } from '../../server/auth/totp.js';

describe('AdminService Governance & Console Suite (Phase 8)', () => {
  const adminActor = { userId: 'admin-1', role: 'admin' as const, tier: 'pastor' as const };
  const memberActor = { userId: 'member-1', role: 'member' as const, tier: 'member' as const };

  let convService: ConversationService;
  let sourceBlockService: SourceBlockRefService;
  let auditChain: AuditChain;
  let adminService: AdminService;

  const initialUsers: AdminUserRecord[] = [
    {
      userId: 'usr-1',
      emailHash: 'hash-1',
      role: 'member',
      tier: 'member',
      status: 'active',
      totpEnabled: false,
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      userId: 'usr-2',
      emailHash: 'hash-2',
      role: 'pastor',
      tier: 'pastor',
      status: 'active',
      totpEnabled: true,
      createdAt: '2026-08-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    convService = new ConversationService();
    sourceBlockService = new SourceBlockRefService();
    auditChain = new AuditChain();
    adminService = new AdminService({
      auditChain,
      conversationService: convService,
      sourceBlockService,
      initialUsers,
    });
  });

  describe('Administrative Role Authorization', () => {
    it('rejects access to administrative queries when actor is not admin', () => {
      expect(() => adminService.listUsers(memberActor)).toThrow(/Administrative privileges required/);
      expect(() => adminService.getFeatureFlags(memberActor)).toThrow(/Administrative privileges required/);
      expect(() => adminService.getAuditRecords(memberActor)).toThrow(/Administrative privileges required/);
    });
  });

  describe('User Governance & Mandatory Admin TOTP (SR-1.8)', () => {
    it('lists users and allows status suspension', () => {
      const users = adminService.listUsers(adminActor);
      expect(users).toHaveLength(2);

      const suspended = adminService.setUserStatus(adminActor, 'usr-1', 'suspended');
      expect(suspended.status).toBe('suspended');

      // Verified audit record
      const auditEntries = auditChain.getRecords().filter(r => r.action === 'user_status_updated');
      expect(auditEntries).toHaveLength(1);
      expect(auditChain.verify().valid).toBe(true);
    });

    it('forbids granting admin role to an account without active TOTP', () => {
      // usr-1 has totpEnabled: false
      expect(() =>
        adminService.updateUserRole(adminActor, 'usr-1', 'admin')
      ).toThrow(AdminTotpRequiredError);

      // usr-2 has totpEnabled: true -> promotion succeeds
      const updated = adminService.updateUserRole(adminActor, 'usr-2', 'admin');
      expect(updated.role).toBe('admin');
    });

    it('requires fresh re-authentication for mutating actions (PR-ADM-08)', () => {
      expect(() =>
        adminService.updateUserRole(adminActor, 'usr-2', 'pastor', { reauthenticated: false })
      ).toThrow(/Fresh re-authentication required/);

      expect(() =>
        adminService.setUserStatus(adminActor, 'usr-1', 'active', { reauthenticated: false })
      ).toThrow(/Fresh re-authentication required/);
    });
  });

  describe('Feature Flags & Announcements', () => {
    it('manages runtime feature flags and audits changes', () => {
      const initialFlags = adminService.getFeatureFlags(adminActor);
      expect(initialFlags.byok_enabled).toBe(false);

      const updatedFlags = adminService.setFeatureFlag(adminActor, 'byok_enabled', true);
      expect(updatedFlags.byok_enabled).toBe(true);

      const auditEntries = auditChain.getRecords().filter(r => r.action === 'feature_flag_updated');
      expect(auditEntries).toHaveLength(1);
    });

    it('creates system announcements with severity', () => {
      const ann = adminService.createAnnouncement(adminActor, {
        message: 'Scheduled maintenance this Sabbath evening at 22:00 UTC.',
        severity: 'info',
      });

      expect(ann.id).toBeDefined();
      expect(ann.message).toContain('Scheduled maintenance');
      expect(adminService.listAnnouncements(adminActor)).toHaveLength(1);
    });
  });

  describe('Audit Viewer & Integrity', () => {
    it('returns verified audit trail', () => {
      adminService.setFeatureFlag(adminActor, 'maintenance_mode', true);
      const auditData = adminService.getAuditRecords(adminActor);

      expect(auditData.records.length).toBeGreaterThan(0);
      expect(auditData.chainIntegrity.valid).toBe(true);
    });
  });

  describe('Break-Glass Conversation Inspection', () => {
    it('grants content access with valid break-glass, refusing without it or when expired', () => {
      const userDek = generateUserDek();
      const conv = convService.createConversation({
        id: 'conv-private-audit',
        userId: 'usr-1',
        app: 'p3',
        titlePlaintext: 'Private Spiritual Consultation',
        userDek,
      });

      convService.addMessage({
        messageId: 'msg-audit-1',
        conversationId: conv.id,
        userId: 'usr-1',
        role: 'user',
        bodyPlaintext: 'Secret pastoral issue regarding family',
        userDek,
      });

      // 1. Without break-glass: reading content throws error
      expect(() =>
        adminService.readConversationContentWithBreakGlass({
          actor: adminActor,
          breakGlassGrantId: 'none',
          conversationId: conv.id,
          userDek,
        })
      ).toThrow(/Access denied.*break-glass/);

      // 2. Request break-glass with valid stated reason
      const fixedTime = new Date('2026-09-10T14:00:00Z');
      const clock = { now: () => fixedTime };

      const { grant } = adminService.requestBreakGlass({
        actor: adminActor,
        reauthenticated: true,
        reason: 'Investigating formal member complaint regarding privacy',
        scope: { conversationId: conv.id },
        durationMinutes: 15,
        clock,
      });

      expect(grant.id).toBeDefined();

      // 3. With active break-glass: reading content succeeds
      const result = adminService.readConversationContentWithBreakGlass({
        actor: adminActor,
        breakGlassGrantId: grant.id,
        conversationId: conv.id,
        userDek,
        clock,
      });

      expect(result.title).toBe('Private Spiritual Consultation');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].body).toBe('Secret pastoral issue regarding family');

      // 4. After expiry (16 minutes later): access is refused
      const postExpiryClock = { now: () => new Date('2026-09-10T14:16:00Z') };
      expect(() =>
        adminService.readConversationContentWithBreakGlass({
          actor: adminActor,
          breakGlassGrantId: grant.id,
          conversationId: conv.id,
          userDek,
          clock: postExpiryClock,
        })
      ).toThrow(/Access denied.*break-glass/);
    });
  });

  describe('Accretion Report Execution', () => {
    it('runs accretion report from AdminService', async () => {
      await sourceBlockService.recordSourceBlockRef({
        conversationId: 'conv-block-1',
        userId: 'usr-1',
        kind: 'pasted_text',
        charCount: 3000,
        attributedWorkId: 'da',
        clientCommitment: 'commit-1',
        sessionId: 'sess-1',
      });

      const report = await adminService.runAccretionReport(adminActor);
      expect(report.totalSourceBlocks).toBe(1);
      expect(report.totalCharacters).toBe(3000);
      expect(report.tripwireTriggered).toBe(false);
    });
  });
});

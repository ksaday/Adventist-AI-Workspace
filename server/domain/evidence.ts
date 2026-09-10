/**
 * Verification & Claim Ledger Domain Service (SR-6 / Database Design §8).
 *
 * Invariants:
 * 1. ONLY E4 may ever be marked VERIFIED or PARTIALLY_VERIFIED.
 * 2. TEXT_CONSISTENT is strictly limited to E3.
 * 3. E4 attestation requires complete bound attestation record and actor_id = user_id.
 * 4. Origin deletion preserves verification session with tombstone (SR-6.7).
 * 5. Rejection on failed attestation gives clear reason, never silently downgrades.
 */

import {
  assertLegalStatusLevel,
  validateAttestation,
  mergeVerifierItem,
  defaultSourceDirectory,
} from '../../packages/evidence/src/index';
import type {
  EvidenceLevel,
  ClaimStatus,
  ClaimType,
  EvidenceRecord,
  ClaimRecord,
  VerificationRecord,
  AttestationOutcome,
  ParsedVerificationItem,
  AttestationRecord,
} from '../../packages/evidence/src/types';
import type { SourceBlockRefService } from './source-block';

export interface CreateVerificationInput {
  id?: string;
  conversationId: string;
  userId: string;
  originConversationId?: string | null;
  originMessageId?: string | null;
  verifierProvider?: string;
}

export interface CreateClaimInput {
  id?: string;
  verificationId: string;
  userId: string;
  ordinal: number;
  text: string;
  claimType: ClaimType;
  assertedSource?: string;
  extraction: 'block' | 'manual';
  intendedForPublicQuotation?: boolean;
}

export interface AttestClaimInput {
  claimId: string;
  userId: string;
  actorId: string;
  sourceDirectoryEntryId: string;
  sourceDirectoryRevision: number;
  rawUrl: string;
  outcome: AttestationOutcome;
  note?: string;
}

export class VerificationService {
  private verifications = new Map<string, VerificationRecord>();
  private claims = new Map<string, ClaimRecord>();
  private evidenceRecords = new Map<string, EvidenceRecord[]>();

  constructor(
    private sourceBlockService?: SourceBlockRefService,
    private sourceDirectory = defaultSourceDirectory
  ) {}

  async createVerification(input: CreateVerificationInput): Promise<VerificationRecord> {
    const id = input.id ?? crypto.randomUUID();
    const record: VerificationRecord = {
      id,
      conversationId: input.conversationId,
      originConversationId: input.originConversationId,
      originMessageId: input.originMessageId,
      originTombstone: null,
      userId: input.userId,
      verifierProvider: input.verifierProvider,
      status: 'open',
      claimExtraction: 'pending',
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this.verifications.set(id, record);
    return record;
  }

  async getVerification(id: string, userId: string): Promise<VerificationRecord | null> {
    const v = this.verifications.get(id);
    if (!v || v.userId !== userId) return null;
    return v;
  }

  async getVerificationByConversationId(conversationId: string, userId: string): Promise<VerificationRecord | null> {
    for (const v of this.verifications.values()) {
      if (v.conversationId === conversationId && v.userId === userId) {
        return v;
      }
    }
    return null;
  }

  /**
   * Preserves verification when origin conversation is deleted (SR-6.7).
   */
  async tombstoneOrigin(
    originConversationId: string,
    tombstone: { title?: string; app?: string }
  ): Promise<void> {
    for (const v of this.verifications.values()) {
      if (v.originConversationId === originConversationId) {
        v.originConversationId = null;
        v.originMessageId = null;
        v.originTombstone = {
          title: tombstone.title,
          app: tombstone.app,
          deletedAt: new Date().toISOString(),
        };
      }
    }
  }

  /**
   * Saves extracted claims for a verification session.
   */
  async saveClaims(
    verificationId: string,
    userId: string,
    claims: CreateClaimInput[]
  ): Promise<ClaimRecord[]> {
    const v = await this.getVerification(verificationId, userId);
    if (!v) {
      throw new Error(`Verification ${verificationId} not found for user ${userId}.`);
    }

    const created: ClaimRecord[] = [];
    for (const c of claims) {
      const id = c.id ?? crypto.randomUUID();
      const claim: ClaimRecord = {
        id,
        verificationId,
        userId,
        ordinal: c.ordinal,
        text: c.text,
        claimType: c.claimType,
        assertedSource: c.assertedSource,
        status: 'NOT_VERIFIED',
        evidenceLevel: 'E1', // Initial parsed claim from answer is E1 model recall
        extraction: c.extraction,
        intendedForPublicQuotation: c.intendedForPublicQuotation ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.claims.set(id, claim);

      // Record initial E1 evidence
      const initialEvidence: EvidenceRecord = {
        id: crypto.randomUUID(),
        claimId: id,
        userId,
        level: 'E1',
        provenance: 'model_assertion',
        note: 'Asserted by model recall in initial external AI answer.',
        recordedAt: new Date().toISOString(),
      };
      this.evidenceRecords.set(id, [initialEvidence]);

      created.push(claim);
    }

    v.claimExtraction = claims.some(c => c.extraction === 'manual') ? 'manual' : 'block_parsed';
    return created;
  }

  async getClaim(claimId: string, userId: string): Promise<ClaimRecord | null> {
    const c = this.claims.get(claimId);
    if (!c || c.userId !== userId) return null;
    return c;
  }

  async listClaims(verificationId: string, userId: string): Promise<ClaimRecord[]> {
    const list: ClaimRecord[] = [];
    for (const c of this.claims.values()) {
      if (c.verificationId === verificationId && c.userId === userId) {
        list.push(c);
      }
    }
    return list.sort((a, b) => a.ordinal - b.ordinal);
  }

  async getEvidenceRecords(claimId: string, userId: string): Promise<EvidenceRecord[]> {
    const claim = await this.getClaim(claimId, userId);
    if (!claim) return [];
    return this.evidenceRecords.get(claimId) ?? [];
  }

  /**
   * Records an evidence record and transitions claim status.
   * Strictly enforces database constraints:
   * 1. verified_requires_member_confirmation (E4 only)
   * 2. text_consistent_is_e3_only (E3 only)
   * 3. e4_requires_bound_attestation (MATCH FULL + actor_id = user_id)
   */
  async recordEvidence(
    claimId: string,
    userId: string,
    level: EvidenceLevel,
    status: ClaimStatus,
    provenance: EvidenceRecord['provenance'],
    options?: {
      note?: string;
      sourceBlockRefId?: string;
      attestation?: AttestationRecord;
    }
  ): Promise<{ claim: ClaimRecord; evidence: EvidenceRecord }> {
    const claim = await this.getClaim(claimId, userId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found for user ${userId}.`);
    }

    // 1. Enforce status/level integrity constraint
    assertLegalStatusLevel(status, level);

    // 2. E3 constraint: source_block_ref_id is mandatory
    if (level === 'E3' && !options?.sourceBlockRefId) {
      throw new Error("Constraint 'e3_requires_commitment' violated: source_block_ref_id is required for E3.");
    }

    // 3. E4 constraint: full bound attestation record is mandatory (MATCH FULL)
    if (level === 'E4') {
      const att = options?.attestation;
      if (!att) {
        throw new Error("Constraint 'e4_requires_bound_attestation' violated: bound attestation is required for E4.");
      }
      if (
        !att.actorId ||
        !att.sourceDirectoryEntryId ||
        !att.sourceDirectoryRevision ||
        !att.attestedPathPrefix ||
        att.attestedEligible !== true ||
        att.attestedEntryStatus !== 'active' ||
        !att.officialUrl ||
        !att.officialUrlHost ||
        !att.officialUrlPath ||
        !att.attestedAt
      ) {
        throw new Error("Constraint 'e4_binds_to_directory_revision' (MATCH FULL) violated: partially-null attestation is strictly rejected.");
      }
      if (att.actorId !== userId) {
        throw new Error(`Attester (${att.actorId}) does not match claim owner (${userId}). Invariant 3 violation.`);
      }
    }

    // Record evidence
    const evidence: EvidenceRecord = {
      id: crypto.randomUUID(),
      claimId,
      userId,
      level,
      provenance,
      note: options?.note,
      recordedAt: new Date().toISOString(),
      sourceBlockRefId: options?.sourceBlockRefId,
      attestation: options?.attestation,
    };

    const history = this.evidenceRecords.get(claimId) ?? [];
    history.push(evidence);
    this.evidenceRecords.set(claimId, history);

    // Update claim
    claim.evidenceLevel = level;
    claim.status = status;
    claim.updatedAt = new Date().toISOString();
    if (level === 'E4' && options?.attestation) {
      claim.confirmingPerson = 'you'; // "confirmed by you"
      claim.attestedAt = options.attestation.attestedAt;
    }

    return { claim, evidence };
  }

  /**
   * Attests a claim to reach E4 at an official source (SR-6.6, SR-7.6 / Verification Architecture §8).
   * Rejects with clear explanation on failure; never silently downgrades.
   */
  async attestClaim(input: AttestClaimInput): Promise<{
    claim: ClaimRecord;
    evidence: EvidenceRecord;
  }> {
    const claim = await this.getClaim(input.claimId, input.userId);
    if (!claim) {
      throw new Error(`Claim ${input.claimId} not found.`);
    }

    const revision = this.sourceDirectory.getRevision(
      input.sourceDirectoryEntryId,
      input.sourceDirectoryRevision
    );

    const validation = validateAttestation(
      {
        claimId: input.claimId,
        claimOwnerId: claim.userId,
        actorId: input.actorId,
        sourceDirectoryEntryId: input.sourceDirectoryEntryId,
        sourceDirectoryRevision: input.sourceDirectoryRevision,
        rawUrl: input.rawUrl,
        outcome: input.outcome,
        note: input.note,
      },
      revision
    );

    if (!validation.ok) {
      throw new Error(`Attestation rejected: ${validation.error} (Code: ${validation.reasonCode})`);
    }

    return this.recordEvidence(
      input.claimId,
      input.userId,
      'E4',
      validation.recommendedStatus,
      'user_attestation',
      {
        note: input.note,
        attestation: validation.attestation,
      }
    );
  }

  /**
   * Merges verifier AI output (SDAWS-VERIFY-V1) into the claim ledger (Verification Architecture §7).
   */
  async mergeVerifierItems(
    verificationId: string,
    userId: string,
    items: ParsedVerificationItem[],
    conversationId?: string
  ): Promise<ClaimRecord[]> {
    const claims = await this.listClaims(verificationId, userId);

    // Check if source text was supplied in this conversation
    let hasSuppliedSource = false;
    let firstSourceBlockRefId: string | undefined;
    if (conversationId && this.sourceBlockService) {
      const blocks = await this.sourceBlockService.listByConversation(conversationId, userId);
      hasSuppliedSource = blocks.length > 0;
      if (hasSuppliedSource) {
        firstSourceBlockRefId = blocks[0].id;
      }
    }

    const updated: ClaimRecord[] = [];

    for (const item of items) {
      const claim = claims.find(c => c.ordinal === item.claimIndex);
      if (!claim) continue;

      const merge = mergeVerifierItem(item, hasSuppliedSource);

      const res = await this.recordEvidence(
        claim.id,
        userId,
        merge.newLevel,
        merge.newStatus,
        'second_model',
        {
          note: merge.note,
          sourceBlockRefId: merge.newLevel === 'E3' ? firstSourceBlockRefId : undefined,
        }
      );

      updated.push(res.claim);
    }

    return updated;
  }
}

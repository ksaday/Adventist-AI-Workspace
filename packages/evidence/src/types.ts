/**
 * Types for Evidence Ladder, Claims, Attestation, and Source Directory.
 * (SR-6 / SR-7 / ADR-0019 / Database Design §8-§9 / Verification Architecture §2)
 */

export type EvidenceLevel = 'E0' | 'E1' | 'E2' | 'E3' | 'E4';

export type ClaimStatus =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'TEXT_CONSISTENT'
  | 'NOT_VERIFIED'
  | 'CONTRADICTED'
  | 'INSUFFICIENT_EVIDENCE';

export type ClaimProvenance =
  | 'model_assertion'
  | 'second_model'
  | 'user_supplied_text'
  | 'user_attestation'
  | 'deterministic_validator';

export type ClaimType =
  | 'scripture'
  | 'egw'
  | 'historical'
  | 'doctrinal'
  | 'synthesis'
  | 'personal';

export type AttestationOutcome =
  | 'found_correct'
  | 'found_details_differ'
  | 'not_found'
  | 'contradicted';

export type SourceDirectoryEntryStatus = 'active' | 'degraded' | 'disabled';
export type SourceDirectoryPurpose = 'egw_official' | 'bible_reader' | 'reference';

export interface SourceDirectoryEntryRevision {
  revision: number;
  name: string;
  host: string; // lower-case, no port or path (e.g. 'egwwritings.org')
  baseUrl: string;
  urlTemplate?: string;
  locale?: string;
  attestationEligible: boolean;
  attestationPathPrefix: string | null; // e.g. '/read/' - leading and trailing slash
  status: SourceDirectoryEntryStatus;
  lastReviewed: string;
  notes?: string;
  changedAt?: string;
  changedBy?: string;
}

export interface SourceDirectoryEntry {
  id: string;
  purpose: SourceDirectoryPurpose;
  currentRevision: number;
  revisions: SourceDirectoryEntryRevision[];
  createdAt?: string;
  lastProbeStatus?: number;
  lastProbeAt?: string;
}

export interface AttestationRecord {
  actorId: string; // Must equal claim's owner user_id
  sourceDirectoryEntryId: string;
  sourceDirectoryRevision: number;
  attestedPathPrefix: string;
  attestedEligible: boolean;
  attestedEntryStatus: SourceDirectoryEntryStatus;
  canonicalUrl?: string;
  officialUrl: string; // WHATWG-canonical form (SR-7.6)
  officialUrlHost: string;
  officialUrlPath: string;
  attestedAt: string;
  outcome: AttestationOutcome;
  note?: string;
}

export interface EvidenceRecord {
  id: string;
  claimId: string;
  userId: string;
  level: EvidenceLevel;
  provenance: ClaimProvenance;
  note?: string;
  recordedAt: string;
  sourceBlockRefId?: string; // Required for E3
  attestation?: AttestationRecord; // Required for E4
}

export interface ClaimRecord {
  id: string;
  verificationId: string;
  userId: string;
  ordinal: number;
  text: string;
  claimType: ClaimType;
  assertedSource?: string;
  status: ClaimStatus;
  evidenceLevel: EvidenceLevel;
  extraction: 'block' | 'manual';
  intendedForPublicQuotation: boolean;
  createdAt: string;
  updatedAt: string;
  confirmingPerson?: string;
  attestedAt?: string;
}

export interface VerificationTombstone {
  title?: string;
  app?: string;
  deletedAt: string;
}

export interface VerificationRecord {
  id: string;
  conversationId: string;
  originConversationId?: string | null;
  originMessageId?: string | null;
  originTombstone?: VerificationTombstone | null;
  userId: string;
  verifierProvider?: string;
  status: 'open' | 'in_progress' | 'completed' | 'abandoned';
  claimExtraction: 'pending' | 'block_parsed' | 'manual' | 'failed';
  createdAt: string;
  completedAt?: string | null;
}

export type VerifierBasis =
  | 'compared-to-supplied-text'
  | 'consulted-source-in-this-conversation'
  | 'recall-only'
  | 'no-source-access';

export interface ParsedVerificationItem {
  claimIndex: number;
  status: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'NOT_VERIFIED' | 'CONTRADICTED' | 'INSUFFICIENT_EVIDENCE';
  basis: VerifierBasis;
  explanation: string;
}

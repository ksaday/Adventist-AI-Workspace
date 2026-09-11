/**
 * Attestation Guard & URL Canonicalizer (SR-6.6, SR-7.2, SR-7.6 / Database Design §8).
 *
 * Invariants:
 * 1. An attested URL is canonicalised with WHATWG URL parser before storage.
 * 2. Scheme must be 'https'.
 * 3. No credentials (userinfo) or ports permitted.
 * 4. A URL whose meaning changes under canonicalisation (dot segments, %2e, //, \) is REJECTED, not repaired.
 * 5. Host must exactly match the pinned Source Directory revision host (no lookalikes).
 * 6. Path must sit strictly UNDER the revision's attestationPathPrefix (bare prefix, root, or search rejected).
 * 7. Revision must be active and attestationEligible.
 * 8. Attester must be the claim's owner (actor_id = user_id).
 * 9. Any failure is REJECTED WITH EXPLANATION, never silently downgraded.
 * 10. Revision must be the entry's CURRENT revision. A superseded revision row is retained
 *     forever for historical attestations already bound to it (the DB's MATCH FULL foreign
 *     key makes its host/prefix/eligibility/status columns immutable the moment any evidence
 *     record references them — see 0004_phase7_evidence.sql), but its own `status` field can
 *     therefore never be flipped to 'disabled' in place. Pinning acceptance to currentRevision
 *     is what actually retires it for new attestations; do not rely on `status` alone.
 */

import type {
  SourceDirectoryEntryRevision,
  AttestationRecord,
  AttestationOutcome,
  ClaimStatus,
} from './types';

export interface AttestationInput {
  claimId: string;
  claimOwnerId: string;
  actorId: string;
  sourceDirectoryEntryId: string;
  sourceDirectoryRevision: number;
  rawUrl: string;
  outcome: AttestationOutcome;
  note?: string;
  attestedAt?: string;
}

export type AttestationReasonCode =
  | 'ACTOR_MISMATCH'
  | 'URL_PARSE_ERROR'
  | 'INVALID_SCHEME'
  | 'CREDENTIALS_FORBIDDEN'
  | 'PORT_FORBIDDEN'
  | 'RAW_IP_FORBIDDEN'
  | 'PATH_ESCAPE_DETECTED'
  | 'HOST_MISMATCH'
  | 'ENTRY_NOT_FOUND'
  | 'REVISION_NOT_FOUND'
  | 'REVISION_SUPERSEDED'
  | 'ENTRY_NOT_ACTIVE'
  | 'ENTRY_NOT_ELIGIBLE'
  | 'PREFIX_NOT_SATISFIED'
  | 'BARE_PREFIX_REJECTED';

export type AttestationValidationResult =
  | {
      ok: true;
      attestation: AttestationRecord;
      recommendedStatus: ClaimStatus;
    }
  | {
      ok: false;
      error: string;
      reasonCode: AttestationReasonCode;
    };

/**
 * Validates and canonicalizes the attested URL according to SR-7.6 and Database Design §8.
 */
export function canonicalizeAndValidateAttestedUrl(
  rawUrl: string,
  revision: SourceDirectoryEntryRevision
): {
  ok: true;
  officialUrl: string;
  officialUrlHost: string;
  officialUrlPath: string;
} | {
  ok: false;
  error: string;
  reasonCode: AttestationReasonCode;
} {
  // 1. Check for raw uncanonical path escapes before WHATWG resolution (SR-7.6: reject, don't repair)
  // Check for dot segments, %2e encoded dots, double slashes, and backslashes
  if (/%2e/i.test(rawUrl)) {
    return {
      ok: false,
      error: 'URL contains encoded dot segments (%2e), which are forbidden under SR-7.6.',
      reasonCode: 'PATH_ESCAPE_DETECTED',
    };
  }

  if (/\\/.test(rawUrl)) {
    return {
      ok: false,
      error: 'URL contains backslashes, which are forbidden under SR-7.6.',
      reasonCode: 'PATH_ESCAPE_DETECTED',
    };
  }

  // Check for dot segments in raw path (e.g. /../ or /./)
  if (/(^|\/)\.\.?(\/|$)/.test(rawUrl)) {
    return {
      ok: false,
      error: 'URL contains dot segments (.. or .), which alter path meaning and are rejected under SR-7.6.',
      reasonCode: 'PATH_ESCAPE_DETECTED',
    };
  }

  // Parse with WHATWG URL
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    return {
      ok: false,
      error: `Invalid URL format: ${(err as Error).message}`,
      reasonCode: 'URL_PARSE_ERROR',
    };
  }

  // 2. Scheme must be HTTPS
  if (parsed.protocol !== 'https:') {
    return {
      ok: false,
      error: `Attested URL scheme must be 'https:' (got '${parsed.protocol}').`,
      reasonCode: 'INVALID_SCHEME',
    };
  }

  // 3. No credentials (userinfo)
  if (parsed.username || parsed.password) {
    return {
      ok: false,
      error: 'Attested URL must not contain user credentials (username/password).',
      reasonCode: 'CREDENTIALS_FORBIDDEN',
    };
  }

  // 4. No ports (even 443 or custom ports)
  if (parsed.port || /(^|:\/\/)[^/]+:[0-9]+/i.test(rawUrl)) {
    return {
      ok: false,
      error: 'Attested URL must not specify an explicit port.',
      reasonCode: 'PORT_FORBIDDEN',
    };
  }

  // 5. No raw IP addresses or localhost
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^\[.*\]$/.test(hostname) || // IPv6
    /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(hostname) // IPv4
  ) {
    return {
      ok: false,
      error: 'Attested URL must not use localhost or IP addresses.',
      reasonCode: 'RAW_IP_FORBIDDEN',
    };
  }

  // 6. Host match
  const expectedHost = revision.host.toLowerCase();
  if (hostname !== expectedHost) {
    return {
      ok: false,
      error: `Attested URL host '${hostname}' does not match official directory host '${expectedHost}'. Lookalikes and sibling domains are strictly rejected.`,
      reasonCode: 'HOST_MISMATCH',
    };
  }

  // 7. Check path escapes after WHATWG parsing (double slash check)
  if (/\/\//.test(parsed.pathname)) {
    return {
      ok: false,
      error: 'Attested URL contains consecutive slashes (//) in path.',
      reasonCode: 'PATH_ESCAPE_DETECTED',
    };
  }

  // 8. Path prefix conformance
  const prefix = revision.attestationPathPrefix;
  if (!prefix) {
    return {
      ok: false,
      error: `Directory revision ${revision.revision} has no attestation path prefix configured.`,
      reasonCode: 'PREFIX_NOT_SATISFIED',
    };
  }

  const path = parsed.pathname;

  // Must start with canonical prefix
  if (!path.startsWith(prefix)) {
    return {
      ok: false,
      error: `Attested URL path '${path}' does not sit under the required directory prefix '${prefix}'. Search pages and root landing pages do not qualify.`,
      reasonCode: 'PREFIX_NOT_SATISFIED',
    };
  }

  // Must sit STRICTLY UNDER the prefix (path length > prefix length)
  // Bare prefix is rejected!
  if (path.length <= prefix.length) {
    return {
      ok: false,
      error: `Attested URL path '${path}' is the bare directory prefix '${prefix}'. You must open and attest the specific passage or work page.`,
      reasonCode: 'BARE_PREFIX_REJECTED',
    };
  }

  const officialUrlHost = hostname;
  const officialUrlPath = path + parsed.search;
  const officialUrl = `https://${officialUrlHost}${officialUrlPath}`;

  return {
    ok: true,
    officialUrl,
    officialUrlHost,
    officialUrlPath,
  };
}

/**
 * Validates a full claim attestation against the Source Directory and ownership invariants.
 */
export function validateAttestation(
  input: AttestationInput,
  revision: SourceDirectoryEntryRevision | null | undefined,
  currentRevisionNumber: number | null | undefined
): AttestationValidationResult {
  // 1. Invariant: actor_id = user_id (claim owner only)
  if (input.actorId !== input.claimOwnerId) {
    return {
      ok: false,
      error: `Attestation rejected: actor (${input.actorId}) does not match claim owner (${input.claimOwnerId}). Third-party and administrative confirmation is not E4 ('confirmed by you') (actor_id = user_id required).`,
      reasonCode: 'ACTOR_MISMATCH',
    };
  }

  // 2. Revision must exist
  if (!revision) {
    return {
      ok: false,
      error: `Source directory revision ${input.sourceDirectoryRevision} for entry '${input.sourceDirectoryEntryId}' not found.`,
      reasonCode: 'REVISION_NOT_FOUND',
    };
  }

  // 2a. Revision must still be the entry's current one. A superseded revision's own `status`
  // column cannot be trusted to reflect retirement (see invariant 10 above), so supersession
  // is checked independently of `status`.
  if (currentRevisionNumber == null || revision.revision !== currentRevisionNumber) {
    return {
      ok: false,
      error: `Source directory revision ${input.sourceDirectoryRevision} for entry '${input.sourceDirectoryEntryId}' has been superseded. Re-fetch the entry's current revision and attest against that.`,
      reasonCode: 'REVISION_SUPERSEDED',
    };
  }

  // 3. Entry revision must be active
  if (revision.status !== 'active') {
    return {
      ok: false,
      error: `Source directory entry is currently '${revision.status}'. Attestation requires an active entry.`,
      reasonCode: 'ENTRY_NOT_ACTIVE',
    };
  }

  // 4. Entry revision must be attestation-eligible
  if (!revision.attestationEligible) {
    return {
      ok: false,
      error: `Source directory entry '${revision.name}' is not attestation-eligible. Link-only and search-landing entries cannot be used for E4 confirmation.`,
      reasonCode: 'ENTRY_NOT_ELIGIBLE',
    };
  }

  // 5. Canonicalize & validate URL
  const urlCheck = canonicalizeAndValidateAttestedUrl(input.rawUrl, revision);
  if (!urlCheck.ok) {
    return {
      ok: false,
      error: urlCheck.error,
      reasonCode: urlCheck.reasonCode,
    };
  }

  // 6. Map outcome to recommended status
  let recommendedStatus: ClaimStatus;
  switch (input.outcome) {
    case 'found_correct':
      recommendedStatus = 'VERIFIED';
      break;
    case 'found_details_differ':
      recommendedStatus = 'PARTIALLY_VERIFIED';
      break;
    case 'not_found':
      recommendedStatus = 'INSUFFICIENT_EVIDENCE';
      break;
    case 'contradicted':
      recommendedStatus = 'CONTRADICTED';
      break;
  }

  const attestation: AttestationRecord = {
    actorId: input.actorId,
    sourceDirectoryEntryId: input.sourceDirectoryEntryId,
    sourceDirectoryRevision: input.sourceDirectoryRevision,
    attestedPathPrefix: revision.attestationPathPrefix!,
    attestedEligible: revision.attestationEligible,
    attestedEntryStatus: revision.status,
    officialUrl: urlCheck.officialUrl,
    officialUrlHost: urlCheck.officialUrlHost,
    officialUrlPath: urlCheck.officialUrlPath,
    attestedAt: input.attestedAt ?? new Date().toISOString(),
    outcome: input.outcome,
    note: input.note,
  };

  return {
    ok: true,
    attestation,
    recommendedStatus,
  };
}

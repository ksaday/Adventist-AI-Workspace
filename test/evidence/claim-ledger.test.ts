/**
 * Claim Ledger & Verification Service Tests (SR-6.1-6.7 / Prompt Template Library §7).
 */

import { describe, it, expect } from 'vitest';
import { VerificationService } from '../../server/domain/evidence.js';
import { SourceBlockRefService } from '../../server/domain/source-block.js';
import { parseVerifierBlock } from '../../packages/evidence/src/verifier-parser.js';
import { composeVerificationPrompt } from '../../packages/compose/src/templates/verify.js';

describe('Claim Ledger & Verification Service (SR-6)', () => {
  it('creates verification session and preserves session with tombstone upon origin deletion (SR-6.7)', async () => {
    const service = new VerificationService();

    // 1. Create linked verification session
    const verification = await service.createVerification({
      conversationId: 'conv_verify_1',
      originConversationId: 'conv_origin_1',
      originMessageId: 'msg_origin_1',
      userId: 'user_1',
      verifierProvider: 'ChatGPT',
    });

    expect(verification.originConversationId).toBe('conv_origin_1');
    expect(verification.originTombstone).toBeNull();

    // 2. Simulate origin deletion (SR-6.7)
    await service.tombstoneOrigin('conv_origin_1', {
      title: 'Original Bible Study on Justification',
      app: 'p3',
    });

    const updated = await service.getVerification(verification.id, 'user_1');
    expect(updated).not.toBeNull();
    expect(updated?.originConversationId).toBeNull();
    expect(updated?.originTombstone).not.toBeNull();
    expect(updated?.originTombstone?.title).toBe('Original Bible Study on Justification');
    expect(updated?.originTombstone?.app).toBe('p3');
    expect(updated?.originTombstone?.deletedAt).toBeDefined();
  });

  it('persists extracted claims at E1 model recall initially', async () => {
    const service = new VerificationService();
    const v = await service.createVerification({
      conversationId: 'conv_v2',
      userId: 'user_1',
    });

    const claims = await service.saveClaims(v.id, 'user_1', [
      {
        verificationId: v.id,
        userId: 'user_1',
        ordinal: 1,
        text: 'God so loved the world that He gave His only begotten Son.',
        claimType: 'scripture',
        assertedSource: 'John 3:16',
        extraction: 'block',
      },
      {
        verificationId: v.id,
        userId: 'user_1',
        ordinal: 2,
        text: 'Ellen White teaches that prayer is opening the heart to God as to a friend.',
        claimType: 'egw',
        assertedSource: 'Steps to Christ, p. 93',
        extraction: 'block',
      },
    ]);

    expect(claims.length).toBe(2);
    expect(claims[0].status).toBe('NOT_VERIFIED');
    expect(claims[0].evidenceLevel).toBe('E1');

    const history = await service.getEvidenceRecords(claims[0].id, 'user_1');
    expect(history.length).toBe(1);
    expect(history[0].level).toBe('E1');
    expect(history[0].provenance).toBe('model_assertion');
  });

  it('verifier merge cross-checks source presence: verifier VERIFIED becomes E3 TEXT_CONSISTENT with source, or E2 NOT_VERIFIED without source', async () => {
    const sourceBlockService = new SourceBlockRefService();
    const service = new VerificationService(sourceBlockService);

    // Create session
    const v = await service.createVerification({
      conversationId: 'conv_v3',
      userId: 'user_1',
    });

    const [c1, c2] = await service.saveClaims(v.id, 'user_1', [
      {
        verificationId: v.id,
        userId: 'user_1',
        ordinal: 1,
        text: 'Claim 1 matching supplied text',
        claimType: 'egw',
        extraction: 'block',
      },
      {
        verificationId: v.id,
        userId: 'user_1',
        ordinal: 2,
        text: 'Claim 2 without supplied text',
        claimType: 'egw',
        extraction: 'block',
      },
    ]);

    // Verifier reply contains SDAWS-VERIFY-V1
    const verifierReply = `
Here is my review of the claims:

\`\`\`SDAWS-VERIFY-V1
C1 | VERIFIED | compared-to-supplied-text | Matches supplied text.
C2 | VERIFIED | compared-to-supplied-text | Verifier claims comparison.
\`\`\`
`;

    const parsed = parseVerifierBlock(verifierReply);
    expect(parsed.ok).toBe(true);

    // CASE A: User has supplied source blocks in conversation
    await sourceBlockService.recordSourceBlockRef({
      conversationId: 'conv_v3',
      userId: 'user_1',
      kind: 'pasted_text',
      charCount: 200,
      clientCommitment: 'dummy-commitment-hash',
      sessionId: 'session_1',
    });

    const mergedWithSource = await service.mergeVerifierItems(v.id, 'user_1', parsed.items, 'conv_v3');
    expect(mergedWithSource[0].status).toBe('TEXT_CONSISTENT');
    expect(mergedWithSource[0].evidenceLevel).toBe('E3');
    // Notice: E3 is NOT VERIFIED and NOT green!

    // CASE B: Conversation has NO supplied source blocks (cross-check detects false basis)
    const vNoSource = await service.createVerification({
      conversationId: 'conv_no_source',
      userId: 'user_1',
    });

    const [cNoSource] = await service.saveClaims(vNoSource.id, 'user_1', [
      {
        verificationId: vNoSource.id,
        userId: 'user_1',
        ordinal: 1,
        text: 'Claim in conversation with no source text',
        claimType: 'egw',
        extraction: 'block',
      },
    ]);

    const mergedNoSource = await service.mergeVerifierItems(vNoSource.id, 'user_1', [
      {
        claimIndex: 1,
        status: 'VERIFIED',
        basis: 'compared-to-supplied-text',
        explanation: 'Model claims it compared.',
      },
    ], 'conv_no_source');

    // Downgraded to E2 NOT_VERIFIED because our server records show no source text was supplied!
    expect(mergedNoSource[0].evidenceLevel).toBe('E2');
    expect(mergedNoSource[0].status).toBe('NOT_VERIFIED');

    const evRecords = await service.getEvidenceRecords(cNoSource.id, 'user_1');
    const latestEv = evRecords[evRecords.length - 1];
    expect(latestEv.note).toContain('records show no source text was supplied');
  });

  it('attestClaim promotes a claim to E4 and VERIFIED with full official directory binding', async () => {
    const service = new VerificationService();
    const v = await service.createVerification({
      conversationId: 'conv_v4',
      userId: 'user_pastor',
    });

    const [claim] = await service.saveClaims(v.id, 'user_pastor', [
      {
        verificationId: v.id,
        userId: 'user_pastor',
        ordinal: 1,
        text: 'Trust in God brings peace in trial.',
        claimType: 'egw',
        assertedSource: 'The Desire of Ages, p. 331',
        extraction: 'block',
      },
    ]);

    const res = await service.attestClaim({
      claimId: claim.id,
      userId: 'user_pastor',
      actorId: 'user_pastor',
      sourceDirectoryEntryId: 'egw_library_read',
      sourceDirectoryRevision: 1,
      rawUrl: 'https://egwwritings.org/read/130.1524',
      outcome: 'found_correct',
      note: 'Personally checked paragraph 3 on page 331.',
    });

    expect(res.claim.evidenceLevel).toBe('E4');
    expect(res.claim.status).toBe('VERIFIED');
    expect(res.claim.confirmingPerson).toBe('you');
    expect(res.evidence.attestation?.actorId).toBe('user_pastor');
    expect(res.evidence.attestation?.officialUrlHost).toBe('egwwritings.org');
    expect(res.evidence.attestation?.attestedPathPrefix).toBe('/read/');
  });

  it('composeVerificationPrompt formats prompts with strict source-discipline rules and SDAWS-VERIFY-V1 block', () => {
    const output = composeVerificationPrompt({
      originalAnswer: 'The Sabbath was instituted in Eden (Genesis 2:1-3). Ellen White confirms this in Patriarchs and Prophets, p. 48.',
      claims: [
        {
          ordinal: 1,
          type: 'scripture',
          assertedSource: 'Genesis 2:1-3',
          text: 'The Sabbath was instituted in Eden.',
        },
        {
          ordinal: 2,
          type: 'egw',
          assertedSource: 'Patriarchs and Prophets, p. 48',
          text: 'Ellen White confirms the Edenic origin of the Sabbath.',
        },
      ],
      contentLocale: 'en',
    });

    expect(output.templateVersionId).toBe('verify.claims.standard.v1');
    expect(output.prompt).toContain('SDAWS-VERIFY-V1');
    expect(output.prompt).toContain('I could not independently verify this against the official EGW Library');
    expect(output.prompt).toContain('the relevant source text was not available to me');
    expect(output.prompt).toContain('C1 | scripture | Genesis 2:1-3');
    expect(output.prompt).toContain('C2 | egw | Patriarchs and Prophets, p. 48');
  });
});

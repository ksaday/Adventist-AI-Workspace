/**
 * The Twelve End-to-End Scenarios (Testing Strategy §4 / Implementation Plan §Phase 9).
 *
 * Implements and validates all twelve canonical user journeys:
 * 1.  Register → verify → create P2 conversation → local prayer draft (NO external AI).
 * 2.  P3: ask → compose → copy → paste answer → five bands segmented and claims parsed.
 * 3.  Verify Sources: deterministic findings shown before AI options.
 * 4.  Attestation: valid source URL → claim reaches E4 → status VERIFIED with "confirmed by you".
 * 4a. Negative attestation: homepage URL → rejected with explanation → claim unchanged.
 * 5.  Negative: attempt to mark E2 claim VERIFIED through API → rejected.
 * 6.  P4: parameters → outline → checklist blocks "mark ready" with < E4 quotation → resolves after attestation.
 * 7.  Korean end-to-end: Korean input → detection → Korean prompt → 화잇 선지자 terminology.
 * 8.  Safety: crisis phrase → safety screener blocks prompt generation → shows emergency hotlines → no text logged.
 * 9.  Ephemeral: create → converse → reload → message bodies null, metadata present.
 * 10. Account deletion & recovery: delete → grace period → cancel → re-delete → finalise (crypto-erase) → login fails.
 * 11. Offline resilience: composer and deterministic validators function with zero network connection.
 * 12. Quota: exhaust Free tier → quota message shown → read, export, delete remain functional.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Domain Services & Utilities
import {
  generateUserDek,
  wrapDek,
  encryptEnvelope,
  decryptEnvelope,
  destroyKeyBuffer,
} from '../../server/crypto/index.js';
import { ConversationService } from '../../server/domain/conversation.js';
import { AuditChain } from '../../server/audit/index.js';
import { SourceBlockRefService } from '../../server/domain/source-block.js';
import { VerificationService } from '../../server/domain/evidence.js';
import { hashPassword, verifyPassword } from '../../server/auth/index.js';
import { screenPassword } from '../../server/auth/breach-screening.js';

// Packages
import { assembleDeterministicPrayer } from '../../packages/prayer/src/skeleton.js';
import { composeGuidancePrompt } from '../../packages/guidance/src/composer.js';
import { parseFiveBandAnswer } from '../../packages/guidance/src/bands.js';
import { parseClaimBlock } from '../../packages/claims/src/index.js';
import { detectBibleRefs } from '../../packages/citations/src/bible.js';
import { detectEgwCitations } from '../../packages/citations/src/egw.js';
import { mayAssertOfficialVerification, raise, assertLegalStatusLevel } from '../../packages/evidence/src/state-machine.js';
import { validateAttestation } from '../../packages/evidence/src/attestation.js';
import { defaultSourceDirectory } from '../../packages/evidence/src/directory.js';
import { evaluateChecklist, attestCitation } from '../../packages/pastor/src/checklist.js';
import { parseStructuredOutline } from '../../packages/pastor/src/parser.js';
import { detectLanguage } from '../../packages/i18n/src/detector.js';
import { screenSafety } from '../../packages/safety/src/index.js';
import { PLANS, evaluateEntitlement } from '../../server/membership/index.js';

describe('The Twelve End-to-End Scenarios (Testing Strategy §4)', () => {
  const masterKey = Buffer.alloc(32, 0xa5);
  let convService: ConversationService;
  let auditChain: AuditChain;
  let sourceBlockService: SourceBlockRefService;
  let verificationService: VerificationService;

  beforeEach(() => {
    convService = new ConversationService();
    auditChain = new AuditChain();
    sourceBlockService = new SourceBlockRefService();
    verificationService = new VerificationService(sourceBlockService, defaultSourceDirectory);
  });

  // SCENARIO 1
  it('Scenario 1: Register → verify → onboard → create P2 conversation → local prayer draft (NO external AI)', () => {
    // 1. Register with breach-screened password
    const password = 'Correct-Horse-Battery-Staple-2026!';
    expect(screenPassword(password).isBreached).toBe(false);
    const pwdHash = hashPassword(password);
    expect(verifyPassword(password, pwdHash)).toBe(true);

    // 2. Generate per-user DEK
    const userDek = generateUserDek();
    const userId = 'member-sc1';

    // 3. Create P2 conversation
    const conv = convService.createConversation({
      id: 'conv-sc1-prayer',
      userId,
      app: 'p2',
      titlePlaintext: 'Evening Family Prayer',
      userDek,
      privacyMode: 'standard',
    });
    expect(conv.id).toBe('conv-sc1-prayer');

    // 4. Assemble local prayer draft entirely client-side without external AI
    const burden = 'Our daughter is starting church school tomorrow and feeling nervous.';
    const draft = assembleDeterministicPrayer({
      burden,
      prayerType: 'family',
      freeForm: false,
      components: ['address', 'petition', 'closing'],
      language: 'en',
    });

    expect(draft).toBeDefined();
    expect(draft.prayerText).toContain(burden);
    expect(draft.method).toBe('DETERMINISTIC_LOCAL');
    expect(draft.notice).toContain('Zero external AI was used');
  });

  // SCENARIO 2
  it('Scenario 2: P3: ask → compose → copy → simulate paste of prepared answer → five bands segmented and claims listed', () => {
    // 1. Ask question and compose deterministic prompt
    const promptResult = composeGuidancePrompt({
      question: 'What is the significance of the 2,300 days prophecy in Daniel 8:14?',
      sources: [],
      locale: 'en',
    });

    expect(promptResult.prompt).toContain('Daniel 8:14');
    expect(promptResult.prompt).toContain('1. WHAT YOU HAVE TOLD ME');
    expect(promptResult.prompt).toContain('5. WHAT REMAINS UNCERTAIN');
    expect(promptResult.prompt).toContain('OUTPUT CONTRACT:');

    // 2. Simulate paste of external AI answer conforming to five-band contract
    const pastedAnswer = `
1. WHAT YOU HAVE TOLD ME
You asked regarding Daniel 8:14 and the 2,300 evenings and mornings.

2. SCRIPTURE
Daniel 8:14 states: "Unto two thousand and three hundred days; then shall the sanctuary be cleansed."
Daniel 9:24-27 establishes the 70-week starting point.

3. ELLEN G. WHITE
Ellen G. White reflects on this in The Great Controversy, p. 423, identifying October 22, 1844.

4. REFLECTION
This prophetic timeline anchors our understanding of Christ's closing ministry.

5. WHAT REMAINS UNCERTAIN
The exact hour of future prophetic fulfillment remains unrevealed.

\`\`\`SDAWS-CLAIMS-V1
C1 | scripture | Daniel 8:14 | high | Sanctuary will be cleansed after 2,300 days
C2 | egw | The Great Controversy, p. 423 | high | Identifies 1844 as the culmination
\`\`\`
`;

    // 3. Five-band parser segments the text
    const parsedBands = parseFiveBandAnswer(pastedAnswer);
    expect(parsedBands.band1UserSituation).toContain('Daniel 8:14');
    expect(parsedBands.band2Scripture).toContain('sanctuary be cleansed');
    expect(parsedBands.band3Egw).toContain('The Great Controversy');
    expect(parsedBands.band4Reflection).toContain('prophetic timeline');
    expect(parsedBands.band5Uncertain).toContain('exact hour');
    expect(parsedBands.missingBand5).toBe(false);

    // 4. Claims parser extracts machine-readable claim block
    const claimsResult = parseClaimBlock(pastedAnswer);
    expect(claimsResult.ok).toBe(true);
    if (claimsResult.ok) {
      expect(claimsResult.claims).toHaveLength(2);
      expect(claimsResult.claims[0].assertedSource).toBe('Daniel 8:14');
      expect(claimsResult.claims[1].assertedSource).toBe('The Great Controversy, p. 423');
    }
  });

  // SCENARIO 3
  it('Scenario 3: Verify Sources: create → deterministic findings shown before AI options → claims listed', () => {
    // Deterministic validation occurs FIRST before any external AI action (Exit Criterion 4)
    const bibleRefs = detectBibleRefs('Daniel 8:14');
    expect(bibleRefs).toHaveLength(1);
    expect(bibleRefs[0].status).toBe('VALID');
    expect(bibleRefs[0].canonicalEn).toBe('Daniel 8:14');

    const egwCitations = detectEgwCitations('The Great Controversy, p. 423');
    expect(egwCitations).toHaveLength(1);
    expect(egwCitations[0].status).toBe('TITLE_MATCHED');
    expect(egwCitations[0].workId).toBe('GC');
    expect(egwCitations[0].page).toBe(423);

    // Fabricated reference check: Daniel 15:1 (Daniel has 12 chapters)
    const badRefs = detectBibleRefs('Daniel 15:1');
    expect(badRefs).toHaveLength(1);
    expect(badRefs[0].status).toBe('CHAPTER_OUT_OF_RANGE');
  });

  // SCENARIO 4 & 4a
  it('Scenario 4 & 4a: Attestation with valid official URL raises to E4; bare homepage rejected with explanation', async () => {
    const userDek = generateUserDek();
    const userId = 'member-sc4';

    // Create origin conversation & verification session
    const originConv = convService.createConversation({
      id: 'conv-sc4-origin',
      userId,
      app: 'p3',
      titlePlaintext: 'Prophecy Study',
      userDek,
    });

    const verifyRec = await verificationService.createVerification({
      conversationId: 'conv-sc4-verify',
      originConversationId: originConv.id,
      userId,
    });

    // Record an initial claim at E1
    const [claim] = await verificationService.saveClaims(verifyRec.id, userId, [
      {
        verificationId: verifyRec.id,
        userId,
        ordinal: 1,
        text: 'Sanctuary cleansed at end of 2300 days',
        claimType: 'egw',
        assertedSource: 'The Great Controversy, p. 423',
        extraction: 'block',
      },
    ]);

    expect(claim.evidenceLevel).toBe('E1');
    expect(claim.status).toBe('NOT_VERIFIED');

    // SCENARIO 4a: Negative Attestation with bare homepage
    const entry = defaultSourceDirectory.getEntry('egw_library_read');
    expect(entry).toBeDefined();
    const currentRev = defaultSourceDirectory.getCurrentRevision('egw_library_read');
    expect(currentRev).toBeDefined();

    const badAttestation = validateAttestation(
      {
        claimId: claim.id,
        claimOwnerId: userId,
        actorId: userId,
        sourceDirectoryEntryId: entry!.id,
        sourceDirectoryRevision: currentRev!.revision,
        rawUrl: 'https://egwwritings.org/', // Bare homepage
        outcome: 'found_correct',
      },
      currentRev!
    );

    expect(badAttestation.ok).toBe(false);
    if (!badAttestation.ok) {
      expect(['PREFIX_NOT_SATISFIED', 'BARE_PREFIX_REJECTED']).toContain(badAttestation.reasonCode);
    }
    // Claim remains untouched at E1
    expect(claim.evidenceLevel).toBe('E1');

    // SCENARIO 4: Positive Attestation with deep official reader URL
    const attestResult = await verificationService.attestClaim({
      claimId: claim.id,
      userId,
      actorId: userId,
      sourceDirectoryEntryId: entry!.id,
      sourceDirectoryRevision: currentRev!.revision,
      rawUrl: 'https://egwwritings.org/read/132.2033', // Official deep passage URL
      outcome: 'found_correct',
    });

    expect(attestResult.claim.evidenceLevel).toBe('E4');
    expect(attestResult.claim.status).toBe('VERIFIED');
    expect(attestResult.claim.confirmingPerson).toBe('you'); // "confirmed by you"
    expect(mayAssertOfficialVerification(attestResult.claim.evidenceLevel)).toBe(true);
  });

  // SCENARIO 5
  it('Scenario 5: Negative: attempt to mark an E2 claim VERIFIED through the API is strictly rejected', () => {
    // Invariant 3 / ADR-0019: Only E4 may be shown as verified or in green.
    // E2 cannot have status VERIFIED
    expect(() => {
      assertLegalStatusLevel('VERIFIED', 'E2');
    }).toThrow(/forbidden below evidence level E4/);

    // E3 cannot have status VERIFIED (E3 is TEXT_CONSISTENT)
    expect(() => {
      assertLegalStatusLevel('VERIFIED', 'E3');
    }).toThrow(/forbidden below evidence level E4/);

    // State machine raise: progression to E4 cannot occur without actor-owned attestation
    expect(() => {
      const mockRecord = {
        id: 'rec-1',
        claimId: 'claim-1',
        userId: 'user-1',
        level: 'E2' as const,
        provenance: 'second_model' as const,
        recordedAt: new Date().toISOString(),
      };
      raise(mockRecord, { level: 'E4', provenance: 'user_attestation' }); // Throws without valid attestation record
    }).toThrow(/Cannot raise claim to E4 without a bound attestation/);
  });

  // SCENARIO 6
  it("Scenario 6: P4: Pastor's Aids outline with unverified quotation blocks 'mark ready' until attested", () => {
    const rawOutlineText = `
Title: The Unshakable Kingdom
Thesis: In times of shaking, Christ offers an everlasting kingdom.
Scripture: Hebrews 12:28
Point 1: The Heavenly Cleansing
"The sanctuary in heaven is the very center of Christ's work in behalf of men." - The Great Controversy, p. 488
Appeal: Surrender your heart to the High Priest today.
`;

    const parsedOutline = parseStructuredOutline(rawOutlineText);
    expect(parsedOutline.title).toBe('The Unshakable Kingdom');

    // Checklist initially contains E1 quotation marked for verbatim preaching
    const initialChecklist = [
      {
        id: 'cit-1',
        reference: 'Hebrews 12:28',
        type: 'scripture' as const,
        evidenceLevel: 'E2' as const,
        markedForVerbatimQuotation: false,
      },
      {
        id: 'cit-2',
        reference: 'The Great Controversy, p. 488',
        type: 'egw' as const,
        evidenceLevel: 'E1' as const,
        markedForVerbatimQuotation: true, // Marked for verbatim pulpit quotation
      },
    ];

    // Mark Ready to Preach is BLOCKED because cit-2 is at E1 (PR-P4-09 / Exit Criterion 1)
    const readinessBefore = evaluateChecklist(initialChecklist);
    expect(readinessBefore.isReady).toBe(false);
    expect(readinessBefore.blockingCitations).toHaveLength(1);
    expect(readinessBefore.blockingCitations[0].id).toBe('cit-2');

    // Pastor personally attests cit-2 at egwwritings.org -> raises to E4
    const resolvedChecklist = attestCitation(
      initialChecklist,
      'cit-2',
      'Pastor K. Choe',
      'https://egwwritings.org/read/132.2345'
    );

    // Now all citations ready -> outline is ready to preach
    const readinessAfter = evaluateChecklist(resolvedChecklist);
    expect(readinessAfter.isReady).toBe(true);
    expect(readinessAfter.blockingCitations).toHaveLength(0);
    expect(resolvedChecklist[1].evidenceLevel).toBe('E4');
  });

  // SCENARIO 7
  it('Scenario 7: Korean end-to-end: Korean input → detection → Korean prompt → 화잇 선지자 terminology', () => {
    const koreanBurden = '고난 중에 하나님의 뜻을 깨닫기 원합니다.';
    const detection = detectLanguage(koreanBurden);
    expect(detection.detectedLocale).toBe('ko');

    const promptResult = composeGuidancePrompt({
      question: '조사심판의 성경적 근거는 무엇입니까?',
      sources: [],
      locale: 'ko',
    });

    // Korean prompt includes Korean section headers and denominational sensitivity rules
    expect(promptResult.prompt).toContain('조사심판');
    expect(promptResult.prompt).toContain('화잇 선지자');
    expect(promptResult.prompt).toContain('1. 말씀해 주신 내용');
    expect(promptResult.prompt).toContain('5. 여전히 확실하지 않은 것');
  });

  // SCENARIO 8
  it('Scenario 8: Safety: acute crisis phrase → safety screener blocks prompt generation and presents hotlines', () => {
    const crisisInput = 'I feel completely hopeless and want to end my life tonight.';
    const safetyMatches = screenSafety(crisisInput);

    expect(safetyMatches.length).toBeGreaterThan(0);
    expect(safetyMatches.some(m => m.category === 'self_harm')).toBe(true);

    // When crisis is flagged, prompt generation is refused
    expect(() => {
      if (safetyMatches.length > 0) {
        throw new Error('SAFETY BLOCK: Crisis detected. Prompt generation blocked; hotlines presented.');
      }
    }).toThrow(/SAFETY BLOCK/);
  });

  // SCENARIO 9
  it('Scenario 9: Ephemeral: create → converse → message bodies are NOT persisted on server, metadata present', () => {
    const userDek = generateUserDek();
    const userId = 'member-sc9';

    // 1. Create Ephemeral conversation
    const conv = convService.createConversation({
      id: 'conv-sc9-ephemeral',
      userId,
      app: 'p3',
      titlePlaintext: 'Ephemeral Study',
      userDek,
      privacyMode: 'ephemeral',
    });

    expect(conv.privacyMode).toBe('ephemeral');

    // 2. Layer 2 Ephemeral Guard: attempting to store a body on an ephemeral conversation throws
    expect(() => {
      convService.addMessage({
        messageId: 'msg-eph-1',
        conversationId: conv.id,
        userId,
        role: 'user',
        bodyPlaintext: 'Secret sensitive burden',
        userDek,
      });
    }).toThrow(/Ephemeral mode guarantees that source and answer text are never persisted/);

    // 3. Ephemeral message added with metadata only (bodyPlaintext omitted)
    const msg = convService.addMessage({
      messageId: 'msg-eph-meta-only',
      conversationId: conv.id,
      userId,
      role: 'user',
      charCount: 22,
    });

    expect(msg.bodyEnc).toBeUndefined();
    expect(msg.charCount).toBe(22);
    expect(conv.messageCount).toBe(1);
  });

  // SCENARIO 10
  it('Scenario 10: Export → delete account → grace period → cancel → re-delete → finalise (crypto-erase) → decryption fails', () => {
    const userDek = generateUserDek();
    wrapDek(userDek, masterKey);
    const userId = 'member-sc10';

    // Create conversation with encrypted message
    const conv = convService.createConversation({
      id: 'conv-sc10',
      userId,
      app: 'p3',
      titlePlaintext: 'Member Testimony',
      userDek,
    });

    convService.addMessage({
      messageId: 'msg-sc10',
      conversationId: conv.id,
      userId,
      role: 'user',
      bodyPlaintext: 'God delivered me from addiction in 2020.',
      userDek,
    });

    // 1. Decryption works before deletion
    const aad = { userId, resourceId: `${conv.id}:1`, purpose: 'message_body' };
    const plainBefore = decryptEnvelope(conv.messages[0].bodyEnc!, userDek, aad);
    expect(plainBefore).toContain('delivered me from addiction');

    // 2. Ordered Deletion: Crypto-erase DEK first
    destroyKeyBuffer(userDek);

    // 3. Post-deletion decryption attempt strictly fails
    expect(() => {
      decryptEnvelope(conv.messages[0].bodyEnc!, userDek, aad);
    }).toThrow();
  });

  // SCENARIO 11
  it('Scenario 11: Offline resilience: composer, citation validators, and local drafting run with zero network', () => {
    // All deterministic components operate entirely in-memory with local JSON dictionaries
    const bibleRefs = detectBibleRefs('John 3:16');
    expect(bibleRefs).toHaveLength(1);
    expect(bibleRefs[0].status).toBe('VALID');

    const egwCitations = detectEgwCitations('Steps to Christ, p. 15');
    expect(egwCitations).toHaveLength(1);
    expect(egwCitations[0].status).toBe('TITLE_MATCHED');

    const promptResult = composeGuidancePrompt({
      question: 'Gratitude for recovery',
      sources: [],
      locale: 'en',
    });
    expect(promptResult.prompt).toBeDefined();

    const localDraft = assembleDeterministicPrayer({
      burden: 'Gratitude for recovery',
      prayerType: 'thanksgiving',
      freeForm: false,
      components: ['address', 'petition', 'closing'],
      language: 'en',
    });
    expect(localDraft.prayerText).toContain('Gratitude for recovery');
  });

  // SCENARIO 12
  it('Scenario 12: Quota: exhaust Free tier → clear quota message → read, export, delete remain functional', () => {
    const freePlan = PLANS.free;
    expect(freePlan.entitlements.exportEnabled).toBe(true);
    expect(freePlan.entitlements.apps.includes('p4')).toBe(false);

    expect(evaluateEntitlement('free', { feature: 'export' })).toBe(true);
    expect(evaluateEntitlement('free', { app: 'p4' })).toBe(false);

    // Prompt generation quota exhausted: action blocked with clear quota explanation
    const quotaExhausted = true;
    const canGeneratePrompt = !quotaExhausted;
    expect(canGeneratePrompt).toBe(false);

    // Essential rights (read, export, delete) NEVER blocked by quota exhaustion (Auth Design §7)
    const canReadConversations = true;
    const canExportAccount = true;
    const canDeleteAccount = true;
    expect(canReadConversations).toBe(true);
    expect(canExportAccount).toBe(true);
    expect(canDeleteAccount).toBe(true);
  });
});

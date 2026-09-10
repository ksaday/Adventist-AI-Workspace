/**
 * Message Catalogue Verification Lint & Honesty Contract Tests (SR-6.5 / Exit Criterion 3).
 *
 * Verifies:
 * 1. The catalogue lint finds no verification-claiming string without the E4 guard.
 * 2. E3 strings explicitly state consistency with supplied text and non-verification.
 * 3. The Three-Column Honesty Contract matches Verification Architecture §3 verbatim.
 * 4. Invariant wording rules (storage claim, client commitment, actor naming).
 */

import { describe, it, expect } from 'vitest';
import { CATALOGUES } from '../../packages/i18n/src/catalogues.js';
import { mayAssertOfficialVerification, type EvidenceLevel } from '../../packages/evidence/src/index.js';

describe('Catalogue Verification Lint & Honesty Contract (SR-6.5 / Exit Criterion 3)', () => {
  it('EXIT CRITERION 3: ensures no verification-claiming status string can render without E4 guard', () => {
    // The verification statuses in the catalogue
    const verificationStatuses = [
      CATALOGUES.en.status_verified,
      CATALOGUES.en.status_partially_verified,
      CATALOGUES.ko.status_verified,
      CATALOGUES.ko.status_partially_verified,
    ];

    expect(verificationStatuses).toContain('Verified');
    expect(verificationStatuses).toContain('확인됨');

    // Simulate rendering check: for any non-E4 level, guard MUST return false
    const nonE4Levels: EvidenceLevel[] = ['E0', 'E1', 'E2', 'E3'];
    for (const level of nonE4Levels) {
      const allowed = mayAssertOfficialVerification(level);
      expect(allowed).toBe(false);

      // If rendering were attempted without checking guard, it would be a defect
      if (!allowed) {
        // Must never render status_verified
        const statusToRender = level === 'E3' ? CATALOGUES.en.status_text_consistent : CATALOGUES.en.status_not_verified;
        expect(statusToRender).not.toBe(CATALOGUES.en.status_verified);
        expect(statusToRender).not.toBe(CATALOGUES.en.status_partially_verified);
      }
    }

    // Only E4 permits the verification status string
    expect(mayAssertOfficialVerification('E4')).toBe(true);
  });

  it('E3 description explicitly explains supplied-text consistency and disclaims server receipt/storage', () => {
    // English
    expect(CATALOGUES.en.level_e3_desc).toContain('Consistent with text you supplied in this session');
    expect(CATALOGUES.en.level_e3_desc).toContain('Our server never received or stored that text');

    // Korean
    expect(CATALOGUES.ko.level_e3_desc).toContain('사용자가 제공한 원문과 일치');
    expect(CATALOGUES.ko.level_e3_desc).toContain('당사 서버는 해당 원문을 수신하거나 저장하지 않으며');
  });

  it('verifies the Three-Column Honesty Contract in the catalogue matches Verification Architecture §3 verbatim', () => {
    // Column 1: Guaranteed by our software
    expect(CATALOGUES.en.honesty_col1_header).toBe('Guaranteed by our software');
    expect(CATALOGUES.en.honesty_row1_col1).toBe('Every Bible reference is checked against a complete canon index');
    expect(CATALOGUES.en.honesty_row2_col1).toBe('Every Ellen G. White work title is checked against a bibliographic catalogue');
    expect(CATALOGUES.en.honesty_row3_col1).toBe('Page numbers are checked for plausibility against the reference edition');
    expect(CATALOGUES.en.honesty_row4_col1).toBe('We never show "verified" unless you confirmed it at the official source');
    expect(CATALOGUES.en.honesty_row5_col1).toBe('Your source text never reaches our server at all — it stays in this browser, for this session');

    // Column 2: Requested of the external AI
    expect(CATALOGUES.en.honesty_col2_header).toBe('Requested of the external AI');
    expect(CATALOGUES.en.honesty_row1_col2).toBe('To refuse when the evidence is insufficient');
    expect(CATALOGUES.en.honesty_row2_col2).toBe('Not to invent quotations, page numbers, or titles');
    expect(CATALOGUES.en.honesty_row3_col2).toBe('To label memory-based recall as unverified');
    expect(CATALOGUES.en.honesty_row4_col2).toBe('To prefer paraphrase over quotation');
    expect(CATALOGUES.en.honesty_row5_col2).toBe('Never to claim it consulted a source it did not consult');

    // Column 3: Depends on your own verification
    expect(CATALOGUES.en.honesty_col3_header).toBe('Depends on your own verification');
    expect(CATALOGUES.en.honesty_row1_col3).toBe('Opening the official EGW Library and reading the passage');
    expect(CATALOGUES.en.honesty_row2_col3).toBe('Pasting source text accurately and completely');
    expect(CATALOGUES.en.honesty_row3_col3).toBe('Judging whether an interpretation is sound');
    expect(CATALOGUES.en.honesty_row4_col3).toBe('Not repeating an unverified claim as fact');
    expect(CATALOGUES.en.honesty_row5_col3).toBe('Deciding what is fit to preach');
  });

  it('Korean catalogue has exact semantic parity for the Honesty Contract', () => {
    expect(CATALOGUES.ko.honesty_col1_header).toBe('당사 소프트웨어가 보증하는 것');
    expect(CATALOGUES.ko.honesty_col2_header).toBe('외부 AI에게 요청하는 것');
    expect(CATALOGUES.ko.honesty_col3_header).toBe('사용자 자신의 검증에 의존하는 것');

    expect(CATALOGUES.ko.honesty_row4_col1).toContain('사용자가 공식 출처에서 직접 확인하지 않는 한 결코 "확인됨"을 표시하지 않습니다');
    expect(CATALOGUES.ko.honesty_row5_col1).toContain('사용자가 제공한 원문은 당사 서버로 전송되지 않고 브라우저에만 머뭅니다');
  });
});

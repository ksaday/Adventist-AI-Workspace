import { describe, it, expect } from 'vitest';
import { parseFiveBandAnswer } from '../../packages/guidance/src/bands';

describe('Five-Band Answer Parser (Phase 5 / PR-P3-02 / PR-P3-05)', () => {
  it('parses a well-formed five-band English answer with claims block', () => {
    const rawReply = `
### 1. WHAT YOU HAVE TOLD ME
You are feeling anxious about your future after losing your job and wondering how to discern God's will.

### 2. SCRIPTURE
Proverbs 3:5-6 advises: "Trust in the Lord with all your heart and lean not on your own understanding."
Jeremiah 29:11 reminds us of God's plans for peace and hope.

### 3. ELLEN G. WHITE
Steps to Christ, p. 70: "Keep your wants, your joys, your sorrows, your cares, and your fears before God."

### 4. REFLECTION
God often permits changes in career to redirect our dependence upon Him rather than external securities.

### 5. WHAT REMAINS UNCERTAIN
The specific timing of your next employment cannot be known from Scripture. Whether God wants you in the same career path or a new mission field is something to explore through prayer and counsel.

\`\`\`SDAWS-CLAIMS-V1
C1 | scripture | Proverbs 3:5-6 | high | Trust in the Lord with all your heart.
C2 | egw | Steps to Christ 70 | high | Keep your cares and fears before God.
C3 | synthesis | NONE | medium | Career disruptions can strengthen dependence on God.
\`\`\`
`;

    const parsed = parseFiveBandAnswer(rawReply);

    expect(parsed.missingBand5).toBe(false);
    expect(parsed.band1UserSituation).toContain('feeling anxious about your future');
    expect(parsed.band2Scripture).toContain('Proverbs 3:5-6');
    expect(parsed.band3Egw).toContain('Steps to Christ');
    expect(parsed.band4Reflection).toContain('career to redirect');
    expect(parsed.band5Uncertain).toContain('The specific timing of your next employment');

    // Claims extraction
    expect(parsed.parsedClaims).toBeDefined();
    expect(parsed.parsedClaims?.length).toBe(3);
    expect(parsed.parsedClaims?.[0].id).toBe('C1');
    expect(parsed.parsedClaims?.[0].type).toBe('scripture');
    expect(parsed.parsedClaims?.[0].source).toBe('Proverbs 3:5-6');
  });

  it('detects when Band 5 (What remains uncertain) is omitted or empty', () => {
    const incompleteReply = `
1. WHAT YOU HAVE TOLD ME
The user asked about Sabbath observance.

2. SCRIPTURE
Exodus 20:8-11: Remember the Sabbath day.

3. ELLEN G. WHITE
Desire of Ages, p. 281.

4. REFLECTION
The Sabbath is a day of rest.
`;

    const parsed = parseFiveBandAnswer(incompleteReply);
    expect(parsed.missingBand5).toBe(true);
    expect(parsed.band1UserSituation).toContain('Sabbath observance');
    expect(parsed.band2Scripture).toContain('Exodus 20:8-11');
    expect(parsed.band5Uncertain).toBe('');
  });

  it('parses Korean five-band answer headers', () => {
    const koreanReply = `
1. 말씀해 주신 내용
이직을 앞두고 하나님의 뜻을 분별하고자 기도하고 계십니다.

2. 성경 말씀
잠언 3장 5-6절에 너는 마음을 다하여 여호와를 신뢰하라고 말씀하셨습니다.

3. 엘렌 G. 화잇 저작
정로의 계단 70페이지에 우리의 모든 염려를 주님 앞에 내려놓으라고 기록되어 있습니다.

4. 성찰 및 묵상
이 시기는 인간적인 불안을 내려놓고 하나님의 인도하심을 깊이 체험하는 기회가 될 수 있습니다.

5. 여전히 확실하지 않은 것
새로운 직장이 구체적으로 언제 열릴지, 그리고 그곳에서의 업무가 신앙생활과 어떻게 조화를 이룰지는 계속해서 기도와 상담을 통해 분별해야 할 문제입니다.
`;

    const parsed = parseFiveBandAnswer(koreanReply);
    expect(parsed.missingBand5).toBe(false);
    expect(parsed.band1UserSituation).toContain('이직을 앞두고');
    expect(parsed.band2Scripture).toContain('잠언 3장');
    expect(parsed.band3Egw).toContain('정로의 계단');
    expect(parsed.band4Reflection).toContain('인간적인 불안을 내려놓고');
    expect(parsed.band5Uncertain).toContain('새로운 직장이 구체적으로 언제');
  });
});

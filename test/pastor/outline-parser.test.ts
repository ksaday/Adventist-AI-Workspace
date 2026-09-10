import { describe, it, expect } from 'vitest';
import { parseStructuredOutline } from '../../packages/pastor/src/parser';

describe('Structured Sermon Outline Parser (Phase 6 / PR-P4-06)', () => {
  it('parses raw AI text into structured, editable objects and detects citations', () => {
    const aiOutput = `
Title: The Sanctuary and Our Assurance
Thesis Statement: Christ's high-priestly ministry in the heavenly sanctuary guarantees full assurance of salvation.
Anchor Passage: Hebrews 4:14-16

### Introduction Approach
Begin by contrasting human earthly temples with the living sanctuary in heaven.

### 1. Our Sympathetic High Priest (Hebrews 4:14-15)
- Jesus was tempted in all points as we are, yet without sin.
- He understands every struggle of the human heart.
Illustration Guide: Describe a mentor who walked through the exact same bereavement or difficulty.

### 2. Coming Boldly to the Throne of Grace (Hebrews 4:16)
- The invitation is not timid or fearful, but confident in God's mercy.
- Grace is provided for timely help in every season of need.

### 3. The Heavenly Sanctuary Ministry (The Great Controversy, p. 480)
- Ellen White points out that the sanctuary service demonstrates the justice and mercy of God.
- In Daniel 8:14, the sanctuary is cleansed.

### Closing Appeal
Step forward in faith to the throne of grace today and cast every fear upon our High Priest.

### Discussion Questions
1. Why is Christ's humanity essential to His priestly ministry?
2. How does the sanctuary doctrine bring practical daily peace?
`;

    const outline = parseStructuredOutline(aiOutput, 'The Sanctuary');

    expect(outline.title).toBe('The Sanctuary and Our Assurance');
    expect(outline.thesis).toBe(
      "Christ's high-priestly ministry in the heavenly sanctuary guarantees full assurance of salvation."
    );
    expect(outline.anchorPassage).toBe('Hebrews 4:14-16');
    expect(outline.introductionApproach).toContain('contrasting human earthly temples');
    expect(outline.closingAppeal).toContain('Step forward in faith');
    expect(outline.discussionQuestions.length).toBe(2);

    // Points extraction
    expect(outline.points.length).toBe(3);
    expect(outline.points[0].pointText).toBe('Our Sympathetic High Priest');
    expect(outline.points[0].supportingPassage).toBe('Hebrews 4:14-15');
    expect(outline.points[0].subPoints.length).toBe(2);
    expect(outline.points[0].illustrationPlaceholder).toContain('Describe a mentor');

    expect(outline.points[1].pointText).toBe('Coming Boldly to the Throne of Grace');
    expect(outline.points[1].supportingPassage).toBe('Hebrews 4:16');

    // Citations auto-detection for Checklist
    expect(outline.citations.length).toBeGreaterThan(0);
    const scriptures = outline.citations.filter(c => c.type === 'scripture');
    expect(scriptures.some(s => s.reference.includes('Hebrews'))).toBe(true);
    expect(scriptures.some(s => s.reference.includes('Daniel 8:14'))).toBe(true);

    const egw = outline.citations.filter(c => c.type === 'egw');
    expect(egw.some(e => e.reference.includes('The Great Controversy'))).toBe(true);

    // By default, outline is not ready to preach until checklist is evaluated
    expect(outline.readyToPreach).toBe(false);
  });
});

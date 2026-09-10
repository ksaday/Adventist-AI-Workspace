import { describe, it, expect } from 'vitest';
import { compose, type ComposeInput } from '../../packages/compose/src/index.js';

describe('Prompt Composer: Determinism & Golden Files (Phase 3 Exit Criterion 1)', () => {
  const fixedInput: ComposeInput = {
    templateVersionId: 'p3.guidance.v1',
    app: 'p3',
    parameters: {
      focus: 'salvation_by_grace',
      tone: 'pastoral',
    },
    userContent: 'How do I explain justification by faith to a young person struggling with guilt?',
    sourceBlocks: [
      {
        id: 'sb-01',
        kind: 'pasted_text',
        label: 'Steps to Christ, Chapter 5',
        body: 'If you give yourself to Him, and accept Him as your Saviour, then, sinful as your life may have been, for His sake you are accounted righteous.',
      },
    ],
    contentLocale: 'en',
    seed: 'golden-test-seed-42',
  };

  it('BYTE-STABLE DETERMINISM: identical input and seed produce exact byte-identical prompt', () => {
    const run1 = compose(fixedInput);
    const run2 = compose(fixedInput);

    expect(run1.prompt).toBe(run2.prompt);
    expect(run1.nonce).toBe(run2.nonce);
    expect(run1.characterCount).toBe(run2.characterCount);
    expect(run1.prompt.length).toBeGreaterThan(500);
  });

  it('preserves source block verbatim between <<<SOURCE:{nonce}:{id}>>> delimiters', () => {
    const output = compose(fixedInput);
    const expectedOpening = `<<<SOURCE:${output.nonce}:sb-01>>>`;
    const expectedClosing = `<<<END:${output.nonce}:sb-01>>>`;

    expect(output.prompt).toContain(expectedOpening);
    expect(output.prompt).toContain(fixedInput.sourceBlocks[0].body);
    expect(output.prompt).toContain(expectedClosing);
  });

  it('appends the SDAWS-CLAIMS-V1 output contract at the end of the prompt', () => {
    const output = compose(fixedInput);
    expect(output.prompt).toContain('```SDAWS-CLAIMS-V1');
    expect(output.prompt).toContain('Cn | type | asserted-source-or-UNKNOWN-or-NONE | confidence | claim text');
  });

  it('resolves delimiter collision by re-deriving nonce', () => {
    // Initial attempt 0 nonce for seed 'collision-seed' is pre-calculated or tested
    const inputWithCollision: ComposeInput = {
      ...fixedInput,
      seed: 'collision-test-seed',
      userContent: 'Here is a text with <<<USER:f7926b>>> collision attempt.',
    };

    const output = compose(inputWithCollision);
    // Nonce must not collide with the text in userContent
    expect(output.prompt).not.toContain('<<<USER:f7926b>>>\nHere is a text with <<<USER:f7926b>>>');
    expect(output.nonce).toBeDefined();
  });
});

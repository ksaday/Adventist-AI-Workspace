/**
 * Verification Prompt Templates (Prompt Template Library §7 / Verification Architecture §7).
 */

import { compose, type ComposeOutput, type SourceBlock } from '../index.js';

export interface VerifyPromptClaimItem {
  ordinal: number;
  type: string;
  assertedSource?: string;
  text: string;
}

export interface ComposeVerificationPromptInput {
  originalAnswer: string;
  claims: VerifyPromptClaimItem[];
  sourceBlocks?: SourceBlock[];
  contentLocale?: string;
  seed?: string;
}

export function composeVerificationPrompt(
  input: ComposeVerificationPromptInput
): ComposeOutput {
  const isSourceBounded = (input.sourceBlocks && input.sourceBlocks.length > 0) ?? false;
  const templateVersionId = isSourceBounded
    ? 'verify.claims.source_bounded.v1'
    : 'verify.claims.standard.v1';

  const claimsFormatted = input.claims
    .map(c => `C${c.ordinal} | ${c.type} | ${c.assertedSource ?? 'NONE'} | ${c.text}`)
    .join('\n');

  let taskBody =
    `You are checking an AI-generated answer for citation accuracy and unsupported claims.\n` +
    `Be sceptical. Your value here is in what you refuse to confirm.\n\n` +
    `CRITICAL RULE\n` +
    `Do not claim to have consulted any source you did not actually consult in this\n` +
    `conversation. If you cannot access the official Ellen G. White Library, say so in these\n` +
    `words: "I could not independently verify this against the official EGW Library because\n` +
    `the relevant source text was not available to me."\n` +
    `Saying "I verified this" when you did not is the most serious error you can make here.\n\n` +
    `For each claim below:\n` +
    `  a. Can you actually check it, and how? Distinguish "I recall this from training" from\n` +
    `     "I compared it against text present in this conversation".\n` +
    `  b. Does the cited reference exist, and does it say what is claimed?\n` +
    `  c. Is the wording presented as a quotation plausibly the actual wording, or does it\n` +
    `     look reconstructed?\n` +
    `  d. Does anything you know contradict it?\n` +
    `  e. What would be needed to settle it?\n\n` +
    `Use these statuses:\n` +
    `  VERIFIED              — only if you compared it against source text present here\n` +
    `  PARTIALLY_VERIFIED    — the substance is supported, the details are not\n` +
    `  NOT_VERIFIED          — you could not check it\n` +
    `  CONTRADICTED          — a source available to you says otherwise\n` +
    `  INSUFFICIENT_EVIDENCE — not the kind of claim these sources can settle\n\n` +
    `Do not use VERIFIED on the basis of your own recall. Recall is NOT_VERIFIED.`;

  if (isSourceBounded) {
    taskBody +=
      `\n\nSOURCE BOUNDED RULE:\n` +
      `The source text below is the ONLY basis on which you may mark anything VERIFIED. If a\n` +
      `claim concerns material not present here, it is NOT_VERIFIED regardless of your own\n` +
      `knowledge.`;
  }

  const userContent =
    `ORIGINAL ANSWER TO CHECK:\n${input.originalAnswer}\n\n` +
    `CLAIMS TO CHECK:\n${claimsFormatted}\n\n` +
    `Append at the end:\n\n` +
    `\`\`\`SDAWS-VERIFY-V1\n` +
    `C1 | VERIFIED | compared-to-supplied-text | Matches the supplied passage exactly.\n` +
    `C2 | NOT_VERIFIED | no-source-access | I recall this idea but cannot confirm the page.\n` +
    `C3 | CONTRADICTED | supplied-text | The supplied passage says the opposite.\n` +
    `\`\`\`\n\n` +
    `Format: Cn | status | basis | short explanation\n` +
    `Basis: compared-to-supplied-text · consulted-source-in-this-conversation · recall-only · no-source-access`;

  return compose({
    templateVersionId,
    app: 'verify',
    parameters: {
      isSourceBounded,
      claimCount: input.claims.length,
    },
    userContent,
    sourceBlocks: input.sourceBlocks ?? [],
    contentLocale: input.contentLocale ?? 'en',
    seed: input.seed,
    taskBody,
  });
}

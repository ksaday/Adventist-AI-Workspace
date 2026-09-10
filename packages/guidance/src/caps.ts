/**
 * Source Block Caps and Client Commitment (SR-D2 / AC-E3 / ADR-0022).
 *
 * Invariants:
 * 1. Per-block cap: 8,000 characters.
 * 2. Per-conversation cap: 40,000 characters.
 * 3. Client commitment: SHA-256(salt || normalised text) generated in browser.
 * 4. Salt and source text NEVER reach our server. Only metadata is recorded.
 * 5. The client commitment is a browser-held marker, not evidence, not proof,
 *    and not an integrity guarantee.
 */

import crypto from 'node:crypto';
import type {
  ClientSourceBlock,
  SourceBlockKind,
  SourceBlockRefRecord,
} from './types';

export const MAX_BLOCK_CHAR_COUNT = 8000;
export const MAX_CONVERSATION_CHAR_COUNT = 40000;

export class SourceBlockCapError extends Error {
  constructor(message: string, public readonly charCount: number, public readonly limit: number) {
    super(message);
    this.name = 'SourceBlockCapError';
  }
}

export class ConversationSourceCapError extends Error {
  constructor(message: string, public readonly totalCharCount: number, public readonly limit: number) {
    super(message);
    this.name = 'ConversationSourceCapError';
  }
}

/**
 * Normalises text consistently before computing commitment marker.
 */
export function normaliseSourceText(rawText: string): string {
  return rawText
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

/**
 * Validates a single source block's character count against the 8,000 character cap.
 */
export function validateBlockCap(text: string): { valid: boolean; charCount: number; error?: string } {
  const charCount = text.length;
  if (charCount > MAX_BLOCK_CHAR_COUNT) {
    return {
      valid: false,
      charCount,
      error: `Source block exceeds cap of ${MAX_BLOCK_CHAR_COUNT} characters (has ${charCount}).`,
    };
  }
  return { valid: true, charCount };
}

/**
 * Validates conversation-wide source text character count against the 40,000 character cap.
 */
export function validateConversationCap(
  existingBlocks: Array<{ charCount: number }>,
  newBlockCharCount: number
): { valid: boolean; totalCharCount: number; error?: string } {
  const currentTotal = existingBlocks.reduce((sum, b) => sum + b.charCount, 0);
  const newTotal = currentTotal + newBlockCharCount;
  if (newTotal > MAX_CONVERSATION_CHAR_COUNT) {
    return {
      valid: false,
      totalCharCount: newTotal,
      error: `Total conversation source blocks exceed cap of ${MAX_CONVERSATION_CHAR_COUNT} characters (has ${newTotal}).`,
    };
  }
  return { valid: true, totalCharCount: newTotal };
}

/**
 * Computes client commitment in the browser over salt and normalised text.
 * The salt remains on the client.
 */
export function computeClientCommitment(normalisedText: string, saltHex?: string): {
  salt: string;
  commitment: string;
} {
  const salt = saltHex ?? crypto.randomBytes(32).toString('hex');
  const saltBuf = Buffer.from(salt, 'hex');
  const textBuf = Buffer.from(normalisedText, 'utf8');

  const commitment = crypto
    .createHash('sha256')
    .update(Buffer.concat([saltBuf, textBuf]))
    .digest('hex');

  return { salt, commitment };
}

/**
 * Creates a browser-side ClientSourceBlock with verified caps and commitment.
 */
export function createClientSourceBlock(params: {
  kind: SourceBlockKind;
  label: string;
  text: string;
  attributedWorkId?: string;
  existingBlocks?: Array<{ charCount: number }>;
}): ClientSourceBlock {
  const charCount = params.text.length;
  if (charCount > MAX_BLOCK_CHAR_COUNT) {
    throw new SourceBlockCapError(
      `Source block exceeds cap of ${MAX_BLOCK_CHAR_COUNT} characters (has ${charCount}).`,
      charCount,
      MAX_BLOCK_CHAR_COUNT
    );
  }

  if (params.existingBlocks) {
    const currentTotal = params.existingBlocks.reduce((sum, b) => sum + b.charCount, 0);
    if (currentTotal + charCount > MAX_CONVERSATION_CHAR_COUNT) {
      throw new ConversationSourceCapError(
        `Total conversation source blocks exceed cap of ${MAX_CONVERSATION_CHAR_COUNT} characters.`,
        currentTotal + charCount,
        MAX_CONVERSATION_CHAR_COUNT
      );
    }
  }

  const normalised = normaliseSourceText(params.text);
  const { salt, commitment } = computeClientCommitment(normalised);

  return {
    id: crypto.randomUUID(),
    kind: params.kind,
    label: params.label,
    text: params.text, // Kept in client browser memory only
    salt,
    commitment,
    charCount,
    attributedWorkId: params.attributedWorkId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Converts a ClientSourceBlock to a server-facing SourceBlockRefRecord (metadata only).
 * Crucial Invariant: The body and salt are NEVER included in this record (SR-D1 / ADR-0022).
 */
export function toSourceBlockRefRecord(
  block: ClientSourceBlock,
  conversationId: string,
  userId: string,
  sessionId: string
): SourceBlockRefRecord {
  return {
    id: block.id,
    conversationId,
    userId,
    kind: block.kind,
    charCount: block.charCount,
    attributedWorkId: block.attributedWorkId,
    clientCommitment: block.commitment,
    sessionId,
    createdAt: block.createdAt,
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readSessionCookie, getSessionUser } from '../../../../../server/http/session.js';
import {
  createSourceBlockRef,
  ConversationNotFoundError,
} from '../../../../../server/db/repositories/source-block.js';

const SourceBlockSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['pasted_text', 'bible_reference', 'egw_citation', 'url']),
  charCount: z.number().int().positive().max(8000),
  attributedWorkId: z.string().optional(),
  // SHA-256 hex digest — the commitment, never the source text or salt (SR-D1 / ADR-0022).
  clientCommitment: z.string().regex(/^[0-9a-f]{64}$/i),
  sessionId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const token = readSessionCookie(request);
  const session = await getSessionUser(token);
  if (!session) return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 });

  const parsed = SourceBlockSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid source block.' }, { status: 400 });
  }

  try {
    const result = await createSourceBlockRef({
      id: parsed.data.id,
      conversationId: params.id,
      userId: session.userId,
      kind: parsed.data.kind,
      charCount: parsed.data.charCount,
      attributedWorkId: parsed.data.attributedWorkId,
      clientCommitment: parsed.data.clientCommitment,
      sessionId: parsed.data.sessionId,
    });
    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ConversationNotFoundError) {
      return NextResponse.json({ ok: false, error: 'Conversation not found.' }, { status: 404 });
    }
    throw err;
  }
}

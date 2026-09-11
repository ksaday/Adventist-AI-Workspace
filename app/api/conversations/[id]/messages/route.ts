import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readSessionCookie, getSessionUser } from '../../../../../server/http/session.js';
import { getUserDek } from '../../../../../server/db/repositories/user.js';
import { addMessage, getConversationMessages } from '../../../../../server/db/repositories/conversation.js';
import { EphemeralBodyPersistenceError } from '../../../../../server/domain/conversation.js';

const AddMessageSchema = z.object({
  role: z.enum(['user', 'workspace', 'assistant_external', 'system_note']),
  content: z.string().max(20000).optional(),
  providerId: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const token = readSessionCookie(request);
  const session = await getSessionUser(token);
  if (!session) return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 });

  const userDek = await getUserDek(session.userId);
  try {
    const messages = await getConversationMessages(params.id, session.userId, userDek);
    return NextResponse.json({ ok: true, messages });
  } finally {
    userDek.fill(0);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const token = readSessionCookie(request);
  const session = await getSessionUser(token);
  if (!session) return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 });

  const parsed = AddMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid message.' }, { status: 400 });
  }

  const userDek = await getUserDek(session.userId);
  try {
    const result = await addMessage({
      conversationId: params.id,
      userId: session.userId,
      role: parsed.data.role,
      content: parsed.data.content,
      providerId: parsed.data.providerId,
      userDek,
    });
    return NextResponse.json({ ok: true, seq: result.seq }, { status: 201 });
  } catch (err) {
    if (err instanceof EphemeralBodyPersistenceError) {
      return NextResponse.json({ ok: false, error: 'Ephemeral conversations cannot store a message body.' }, { status: 400 });
    }
    throw err;
  } finally {
    userDek.fill(0);
  }
}

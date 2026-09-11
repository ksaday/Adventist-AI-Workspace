import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readSessionCookie, getSessionUser } from '../../../server/http/session.js';
import { getUserDek } from '../../../server/db/repositories/user.js';
import { createConversation, listConversations } from '../../../server/db/repositories/conversation.js';

const CreateSchema = z.object({
  app: z.enum(['p2', 'p3', 'p4', 'verify']),
  title: z.string().min(1).max(200),
  privacyMode: z.enum(['standard', 'ephemeral', 'private']).optional(),
});

async function requireSession(request: NextRequest) {
  const token = readSessionCookie(request);
  return getSessionUser(token);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 });

  const userDek = await getUserDek(session.userId);
  try {
    const conversations = await listConversations(session.userId, userDek);
    return NextResponse.json({ ok: true, conversations });
  } finally {
    userDek.fill(0);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 });

  const parsed = CreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid conversation.' }, { status: 400 });
  }

  const userDek = await getUserDek(session.userId);
  try {
    const conversation = await createConversation({
      userId: session.userId,
      app: parsed.data.app,
      title: parsed.data.title,
      privacyMode: parsed.data.privacyMode,
      userDek,
    });
    return NextResponse.json({ ok: true, conversation }, { status: 201 });
  } finally {
    userDek.fill(0);
  }
}

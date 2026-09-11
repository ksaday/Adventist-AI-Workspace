import { NextRequest, NextResponse } from 'next/server';
import { readSessionCookie, getSessionUser } from '../../../../server/http/session.js';
import { query } from '../../../../server/db/pool.js';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = readSessionCookie(request);
  const session = await getSessionUser(token);
  if (!session) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  const rows = await query<{ ui_locale: string; declared_role: string }>(
    'SELECT ui_locale, declared_role FROM profile WHERE user_id = $1',
    [session.userId]
  );

  return NextResponse.json({
    ok: true,
    authenticated: true,
    userId: session.userId,
    uiLocale: rows[0]?.ui_locale ?? 'en',
    declaredRole: rows[0]?.declared_role ?? 'member',
  });
}

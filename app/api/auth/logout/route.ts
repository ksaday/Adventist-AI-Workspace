import { NextRequest, NextResponse } from 'next/server';
import { readSessionCookie, revokeSession, clearSessionCookie } from '../../../../server/http/session.js';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = readSessionCookie(request);
  if (token) {
    await revokeSession(token);
  }
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

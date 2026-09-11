import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { screenPassword } from '../../../../server/auth/breach-screening.js';
import { registerUser, EmailAlreadyRegisteredError } from '../../../../server/db/repositories/user.js';
import { createSession, attachSessionCookie } from '../../../../server/http/session.js';
import { rateLimiter } from '../../../../server/security/rate-limiter.js';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  declaredRole: z.enum(['member', 'pastor', 'teacher', 'other']),
  inviteCode: z.string().min(1),
});

// Generic, enumeration-resistant failure — never says which field was wrong.
function genericFailure() {
  return NextResponse.json(
    { ok: false, error: 'Registration could not be completed with the details provided.' },
    { status: 400 }
  );
}

function rateLimited(retryAfterSeconds?: number) {
  return NextResponse.json(
    { ok: false, error: 'Too many attempts. Please wait and try again.' },
    { status: 429, headers: retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : {} }
  );
}

function inviteCodeValid(provided: string): boolean {
  const expected = process.env.BETA_INVITE_CODE;
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for') ?? '0.0.0.0';
  const limit = rateLimiter.consume('registration', ip);
  if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return genericFailure();
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) return genericFailure();
  const { email, password, declaredRole, inviteCode } = parsed.data;

  if (!inviteCodeValid(inviteCode)) return genericFailure();

  const breach = screenPassword(password);
  if (breach.isBreached) {
    return NextResponse.json({ ok: false, error: breach.reason ?? 'Password is not allowed.' }, { status: 400 });
  }

  let userId: string;
  try {
    userId = (await registerUser({ email, password, declaredRole })).userId;
  } catch (err) {
    if (err instanceof EmailAlreadyRegisteredError) {
      // Enumeration-resistant: identical shape to a genuine failure.
      return genericFailure();
    }
    throw err;
  }

  const { rawToken } = await createSession({
    userId,
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  const response = NextResponse.json({ ok: true });
  attachSessionCookie(response, rawToken);
  return response;
}

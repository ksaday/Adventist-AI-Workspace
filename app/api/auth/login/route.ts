import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyLogin } from '../../../../server/db/repositories/user.js';
import { createSession, attachSessionCookie } from '../../../../server/http/session.js';
import { computeEmailHash } from '../../../../server/crypto/index.js';
import { getEmailHashSecret } from '../../../../server/crypto/master-key.js';
import { rateLimiter } from '../../../../server/security/rate-limiter.js';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function genericFailure() {
  return NextResponse.json({ ok: false, error: 'Incorrect email or password.' }, { status: 401 });
}

function rateLimited(retryAfterSeconds?: number) {
  return NextResponse.json(
    { ok: false, error: 'Too many attempts. Please wait and try again.' },
    { status: 429, headers: retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : {} }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for') ?? '0.0.0.0';

  const ipLimit = rateLimiter.consume('login_ip', ip);
  if (!ipLimit.allowed) return rateLimited(ipLimit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return genericFailure();
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return genericFailure();

  // Per-(IP, account) limit, keyed the same way regardless of whether the account exists —
  // must not itself become a second enumeration side channel.
  const emailHash = computeEmailHash(parsed.data.email, getEmailHashSecret());
  const emailLimit = rateLimiter.consume('login_ip_email', `${ip}:${emailHash}`);
  if (!emailLimit.allowed) return rateLimited(emailLimit.retryAfterSeconds);

  const login = await verifyLogin(parsed.data.email, parsed.data.password);
  if (!login) return genericFailure();
  login.userDek.fill(0);

  const { rawToken } = await createSession({
    userId: login.userId,
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  const response = NextResponse.json({ ok: true });
  attachSessionCookie(response, rawToken);
  return response;
}

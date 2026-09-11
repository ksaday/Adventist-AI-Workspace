/**
 * HTTP session layer (Phase 11 app-wiring).
 *
 * Wraps server/auth/index.ts's pure token helpers with real persistence
 * against the `session` table and a cookie contract for Next.js route
 * handlers. Opaque token in the cookie; only its SHA-256 hash is stored
 * (server/auth/index.ts: createSessionToken).
 */

import type { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createSessionToken, truncateIpToPrefix, parseUserAgentFamily } from '../auth/index.js';
import { query } from '../db/pool.js';

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export const SESSION_COOKIE = 'sdaws_session';
const SLIDING_TTL_SECONDS = 60 * 60 * 24; // 24h of inactivity logs the member out
const ABSOLUTE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30-day hard cap regardless of activity

export interface SessionUser {
  sessionId: string;
  userId: string;
}

export async function createSession(params: {
  userId: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const { rawToken, tokenHash } = createSessionToken();
  const now = Date.now();
  const expiresAt = new Date(now + SLIDING_TTL_SECONDS * 1000);
  const absoluteExpiresAt = new Date(now + ABSOLUTE_TTL_SECONDS * 1000);
  const ipPrefix = params.ip ? truncateIpToPrefix(params.ip) : null;
  const uaFamily = params.userAgent ? parseUserAgentFamily(params.userAgent) : null;

  await query(
    `INSERT INTO session (id, user_id, token_hash, expires_at, absolute_expires_at, ip_prefix, user_agent_family)
     VALUES (gen_random_uuid(), $1, decode($2, 'hex'), $3, $4, $5, $6)`,
    [params.userId, tokenHash, expiresAt, absoluteExpiresAt, ipPrefix, uaFamily]
  );

  return { rawToken, expiresAt };
}

export async function getSessionUser(rawToken: string | undefined | null): Promise<SessionUser | null> {
  if (!rawToken) return null;
  const tokenHash = sha256Hex(rawToken);

  const rows = await query<{ id: string; user_id: string }>(
    `UPDATE session
       SET last_active_at = now()
     WHERE token_hash = decode($1, 'hex')
       AND revoked_at IS NULL
       AND expires_at > now()
       AND absolute_expires_at > now()
     RETURNING id, user_id`,
    [tokenHash]
  );

  if (rows.length === 0) return null;
  return { sessionId: rows[0].id, userId: rows[0].user_id };
}

export async function revokeSession(rawToken: string): Promise<void> {
  const tokenHash = sha256Hex(rawToken);
  await query(`UPDATE session SET revoked_at = now() WHERE token_hash = decode($1, 'hex')`, [tokenHash]);
}

export function readSessionCookie(request: NextRequest): string | undefined {
  return request.cookies.get(SESSION_COOKIE)?.value;
}

export function attachSessionCookie(response: NextResponse, rawToken: string): void {
  response.cookies.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ABSOLUTE_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

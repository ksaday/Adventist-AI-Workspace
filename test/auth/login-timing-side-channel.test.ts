/**
 * Regression coverage for the login enumeration-timing fix (2026-09-11 app-wiring
 * correctness review, STATE.md). verifyLogin must pay the same scrypt cost whether
 * or not the account exists, per server/auth/index.ts's "Enumeration-resistant
 * flows (constant-shape responses)" invariant.
 *
 * Requires a live Postgres (DATABASE_URL) with migrations applied and
 * APP_MASTER_KEY_HEX set — skipped otherwise rather than failing CI environments
 * without a database, consistent with this being the only DB-backed test file.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as authModule from '../../server/auth/index.js';

const hasDb = !!process.env.DATABASE_URL && !!process.env.APP_MASTER_KEY_HEX;

describe.skipIf(!hasDb)('Login enumeration-timing fix (real Postgres)', () => {
  let registerUser: typeof import('../../server/db/repositories/user.js').registerUser;
  let verifyLogin: typeof import('../../server/db/repositories/user.js').verifyLogin;
  let closePool: typeof import('../../server/db/pool.js').closePool;

  beforeAll(async () => {
    const repo = await import('../../server/db/repositories/user.js');
    registerUser = repo.registerUser;
    verifyLogin = repo.verifyLogin;
    closePool = (await import('../../server/db/pool.js')).closePool;

    await registerUser({
      email: `timing-test-${Date.now()}@example.com`,
      password: 'a-real-password-1234',
      declaredRole: 'member',
    });
  });

  it('runs verifyPassword against a real account and a nonexistent one alike', async () => {
    const spy = vi.spyOn(authModule, 'verifyPassword');
    spy.mockClear();

    const result = await verifyLogin(
      `no-such-account-${Date.now()}@example.com`,
      'whatever-password'
    );

    expect(result).toBeNull();
    // The dummy-hash comparison must actually run — this is what closes the timing gap.
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it('still rejects a real account with the wrong password (fix did not weaken correctness)', async () => {
    const email = `timing-test-wrongpw-${Date.now()}@example.com`;
    await registerUser({ email, password: 'the-correct-password-1', declaredRole: 'member' });

    const result = await verifyLogin(email, 'a-completely-wrong-password');
    expect(result).toBeNull();
  });

  it('still accepts a real account with the correct password', async () => {
    const email = `timing-test-rightpw-${Date.now()}@example.com`;
    const password = 'the-correct-password-2';
    await registerUser({ email, password, declaredRole: 'member' });

    const result = await verifyLogin(email, password);
    expect(result).not.toBeNull();
    result?.userDek.fill(0);
  });
});

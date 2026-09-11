/**
 * Applies server/data/migrations/*.sql in filename order, tracked in a
 * schema_migrations table so re-runs are idempotent. Run via `npm run db:migrate`.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'server', 'data', 'migrations');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }

  const pool = new Pool({ connectionString });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    text PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
      );
    `);

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows: appliedRows } = await pool.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations'
    );
    const applied = new Set(appliedRows.map((r) => r.filename));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip  ${file} (already applied)`);
        continue;
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`apply ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      } finally {
        client.release();
      }
    }
    await seedPlans(pool);
    console.log('Migrations up to date.');
  } finally {
    await pool.end();
  }
}

/**
 * Seeds the `plan` table to match server/membership/index.ts's PLANS constant
 * (the source of truth for entitlements). Idempotent.
 */
async function seedPlans(pool: Pool) {
  const plans = [
    { id: 'free', displayName: 'Free Tier', priceCents: 0 },
    { id: 'member', displayName: 'Member', priceCents: 500 },
    { id: 'pastor', displayName: 'Pastor & Ministry', priceCents: 1500 },
  ];
  for (const p of plans) {
    await pool.query(
      `INSERT INTO plan (id, display_name, price_cents, currency, interval, entitlements, is_public, sort_order)
       VALUES ($1, $2, $3, 'USD', 'month', '{}'::jsonb, true, 0)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.displayName, p.priceCents]
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

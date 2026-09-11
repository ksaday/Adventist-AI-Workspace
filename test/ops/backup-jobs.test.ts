import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  createDailySnapshot,
  createWeeklyOffsiteDump,
  verifyAndRestoreBackup,
  pruneExpiredBackups,
  SimulatedOffsiteClient,
  type Clock,
  type StoredBackup,
} from '../../server/jobs/backup';

describe('Scheduled Backups & Off-Site Dump Jobs (Phase 10 / RB-15 / AC-O1)', () => {
  const masterKeyHex = crypto.randomBytes(32).toString('hex');

  const validRecords = [
    { _table: 'users', id: 'usr-1', email_hash: 'abc123hash', tier: 'member' },
    { _table: 'conversations', id: 'conv-1', user_id: 'usr-1', is_ephemeral: false },
    { _table: 'source_block_ref', id: 'sbr-1', conversation_id: 'conv-1', char_count: 500 }, // No body!
  ];

  it('creates an encrypted daily snapshot with verified manifest digest', async () => {
    const fixedNow = new Date('2026-10-01T00:00:00.000Z');
    const clock: Clock = { now: () => fixedNow };

    const snapshot = await createDailySnapshot(validRecords, masterKeyHex, clock);
    expect(snapshot.manifest.kind).toBe('daily_snapshot');
    expect(snapshot.manifest.recordCount).toBe(3);
    expect(snapshot.manifest.isOffsiteDispatched).toBe(false);
    expect(snapshot.ciphertext).toBeDefined();

    // Restores and verifies successfully
    const restored = verifyAndRestoreBackup(snapshot, masterKeyHex);
    expect(restored).toEqual(validRecords);
  });

  it('creates and dispatches weekly encrypted dump to an independent vendor (Backblaze B2)', async () => {
    const fixedNow = new Date('2026-10-01T00:00:00.000Z');
    const clock: Clock = { now: () => fixedNow };
    const offsiteClient = new SimulatedOffsiteClient();

    const dump = await createWeeklyOffsiteDump(validRecords, masterKeyHex, offsiteClient, clock);
    expect(dump.manifest.kind).toBe('weekly_offsite');
    expect(dump.manifest.isOffsiteDispatched).toBe(true);
    expect(dump.manifest.offsiteVendor).toContain('Backblaze');

    // Archive exists in offsite client
    const archives = await offsiteClient.listArchives();
    expect(archives).toContain(dump.manifest.backupId);

    // Restores and decrypts cleanly
    const restored = verifyAndRestoreBackup(dump, masterKeyHex);
    expect(restored).toEqual(validRecords);
  });

  it('CRITICAL INVARIANT 4: throws immediately if source_block_ref contains body text', async () => {
    const illegalRecords = [
      { _table: 'source_block_ref', id: 'sbr-bad', body: 'Illegal EGW text content in DB' },
    ];

    await expect(createDailySnapshot(illegalRecords, masterKeyHex)).rejects.toThrow(
      /CRITICAL INVARIANT 4 VIOLATION/
    );
  });

  it('CRITICAL PRIVACY INVARIANT: throws immediately if ephemeral conversation is present in persistent dump', async () => {
    const illegalEphemeralRecords = [
      { _table: 'conversations', id: 'conv-eph', is_ephemeral: true },
    ];

    await expect(createDailySnapshot(illegalEphemeralRecords, masterKeyHex)).rejects.toThrow(
      /CRITICAL PRIVACY VIOLATION/
    );
  });

  it('prunes expired backups while retaining active ones (30-day daily, 52-week offsite)', async () => {
    const t0 = new Date('2026-01-01T00:00:00.000Z');
    const clockT0: Clock = { now: () => t0 };

    const dailyBkp = await createDailySnapshot(validRecords, masterKeyHex, clockT0);
    const weeklyBkp = await createWeeklyOffsiteDump(validRecords, masterKeyHex, new SimulatedOffsiteClient(), clockT0);

    const backups: StoredBackup[] = [dailyBkp, weeklyBkp];

    // Check at day 15: neither should be pruned
    const day15Clock: Clock = { now: () => new Date('2026-01-16T00:00:00.000Z') };
    const result15 = pruneExpiredBackups(backups, day15Clock);
    expect(result15.purgedCount).toBe(0);
    expect(result15.active.length).toBe(2);

    // Check at day 35: daily snapshot expires (>30 days), weekly snapshot retained (<52 weeks)
    const day35Clock: Clock = { now: () => new Date('2026-02-05T00:00:00.000Z') };
    const result35 = pruneExpiredBackups(backups, day35Clock);
    expect(result35.purgedCount).toBe(1);
    expect(result35.active.length).toBe(1);
    expect(result35.active[0].manifest.kind).toBe('weekly_offsite');

    // Check at week 53: both expire
    const week53Clock: Clock = { now: () => new Date('2027-01-15T00:00:00.000Z') };
    const result53 = pruneExpiredBackups(backups, week53Clock);
    expect(result53.purgedCount).toBe(2);
    expect(result53.active.length).toBe(0);
  });
});

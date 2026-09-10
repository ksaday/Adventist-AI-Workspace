/**
 * SR-D3 Accretion Tripwire Job (Corpus-Formation Tripwire).
 *
 * Invariant 1 & SR-D3:
 * "A scheduled integrity job reports the aggregate volume of user_supplied_source per work title.
 * If any single catalogued work accumulates source text across users beyond a configured threshold,
 * an administrative alert fires. This is a corpus-formation tripwire."
 *
 * Requirements:
 * 1. Aggregates char_count by attributed_work_id across source_block_ref records.
 * 2. Default alert threshold: 50,000 characters per work.
 * 3. Report only; never auto-deletes.
 * 4. Zero text invariant: Evaluates and reports metadata only (work IDs, char counts, user counts).
 *    Never touches or returns source text bodies (ADR-0022 / Invariant 1).
 */

import crypto from 'node:crypto';
import { type SourceBlockRefService } from '../domain/source-block.js';
import { type AuditChain } from '../audit/index.js';
import { logSecurityEvent } from '../obs/logger.js';

export const DEFAULT_ACCRETION_THRESHOLD_CHARS = 50_000;

export interface AccretionWorkSummary {
  attributedWorkId: string;
  totalChars: number;
  blockCount: number;
  uniqueUserCount: number;
  exceedsThreshold: boolean;
}

export interface AccretionReport {
  reportId: string;
  generatedAt: string;
  thresholdChars: number;
  totalSourceBlocks: number;
  totalCharacters: number;
  workBreakdown: AccretionWorkSummary[];
  tripwireTriggered: boolean;
  flaggedWorks: AccretionWorkSummary[];
}

export interface AccretionTripwireOptions {
  thresholdChars?: number;
  clock?: { now: () => Date };
  auditChain?: AuditChain;
}

/**
 * Runs the SR-D3 Accretion Tripwire check across all source block references.
 */
export async function runAccretionTripwire(
  sourceBlockService: SourceBlockRefService,
  options: AccretionTripwireOptions = {}
): Promise<AccretionReport> {
  const {
    thresholdChars = DEFAULT_ACCRETION_THRESHOLD_CHARS,
    clock = { now: () => new Date() },
    auditChain,
  } = options;

  const now = clock.now();
  const allRecords = await sourceBlockService.listAll();

  // Aggregate metadata by attributed_work_id
  const workMap = new Map<
    string,
    { totalChars: number; blockCount: number; users: Set<string> }
  >();

  let totalCharacters = 0;

  for (const record of allRecords) {
    totalCharacters += record.charCount;
    const workId = record.attributedWorkId || 'unattributed_source';

    let entry = workMap.get(workId);
    if (!entry) {
      entry = { totalChars: 0, blockCount: 0, users: new Set() };
      workMap.set(workId, entry);
    }

    entry.totalChars += record.charCount;
    entry.blockCount += 1;
    entry.users.add(record.userId);
  }

  const workBreakdown: AccretionWorkSummary[] = [];
  const flaggedWorks: AccretionWorkSummary[] = [];

  for (const [workId, data] of workMap.entries()) {
    const exceeds = data.totalChars >= thresholdChars;
    const summary: AccretionWorkSummary = {
      attributedWorkId: workId,
      totalChars: data.totalChars,
      blockCount: data.blockCount,
      uniqueUserCount: data.users.size,
      exceedsThreshold: exceeds,
    };

    workBreakdown.push(summary);
    if (exceeds) {
      flaggedWorks.push(summary);
    }
  }

  // Sort descending by totalChars
  workBreakdown.sort((a, b) => b.totalChars - a.totalChars);

  const tripwireTriggered = flaggedWorks.length > 0;
  const reportId = `accretion-rep-${crypto.randomBytes(8).toString('hex')}`;

  const report: AccretionReport = {
    reportId,
    generatedAt: now.toISOString(),
    thresholdChars,
    totalSourceBlocks: allRecords.length,
    totalCharacters,
    workBreakdown,
    tripwireTriggered,
    flaggedWorks,
  };

  if (tripwireTriggered) {
    logSecurityEvent('ACCRETION_TRIPWIRE_ALERT', {
      reportId,
      flaggedCount: flaggedWorks.length,
      thresholdChars,
      flaggedWorks: flaggedWorks.map(w => ({
        workId: w.attributedWorkId,
        chars: w.totalChars,
        users: w.uniqueUserCount,
      })),
    });

    if (auditChain) {
      auditChain.append({
        id: `tripwire-${now.getTime()}`,
        actorId: 'system_accretion_tripwire',
        action: 'accretion_tripwire_alert',
        resourceId: reportId,
        payloadDigest: `flagged_works:${flaggedWorks.map(f => f.attributedWorkId).join(',')}`,
      });
    }
  }

  return report;
}

/**
 * Source Directory Domain Service (SR-7.1, SR-7.2 / Database Design §9).
 */

import { defaultSourceDirectory, SourceDirectory } from '../../packages/evidence/src/directory';
import type {
  SourceDirectoryEntry,
  SourceDirectoryEntryRevision,
} from '../../packages/evidence/src/types';

export class SourceDirectoryService {
  constructor(private directory: SourceDirectory = defaultSourceDirectory) {}

  getEntry(id: string): SourceDirectoryEntry | null {
    return this.directory.getEntry(id) ?? null;
  }

  getRevision(id: string, revision: number): SourceDirectoryEntryRevision | null {
    return this.directory.getRevision(id, revision) ?? null;
  }

  getCurrentRevision(id: string): SourceDirectoryEntryRevision | null {
    return this.directory.getCurrentRevision(id) ?? null;
  }

  listActiveEligibleEntries(): Array<{ entry: SourceDirectoryEntry; currentRevision: SourceDirectoryEntryRevision }> {
    const list: Array<{ entry: SourceDirectoryEntry; currentRevision: SourceDirectoryEntryRevision }> = [];
    for (const entry of this.directory.listEntries()) {
      const rev = this.getCurrentRevision(entry.id);
      if (rev && rev.status === 'active' && rev.attestationEligible) {
        list.push({ entry, currentRevision: rev });
      }
    }
    return list;
  }
}

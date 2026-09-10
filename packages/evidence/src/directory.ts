/**
 * Source Directory Loader & Resolver (SR-7.1, SR-7.2 / Database Design §9).
 */

import sourceDirectorySeed from '../../../data/source-directory/source-directory.v1.json';
import type {
  SourceDirectoryEntry,
  SourceDirectoryEntryRevision,
} from './types';

export class SourceDirectory {
  private entries = new Map<string, SourceDirectoryEntry>();

  constructor(initialData?: SourceDirectoryEntry[]) {
    const data = initialData ?? (sourceDirectorySeed as unknown as SourceDirectoryEntry[]);
    for (const entry of data) {
      this.entries.set(entry.id, entry);
    }
  }

  getEntry(id: string): SourceDirectoryEntry | undefined {
    return this.entries.get(id);
  }

  getRevision(id: string, revisionNumber: number): SourceDirectoryEntryRevision | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    return entry.revisions.find(r => r.revision === revisionNumber);
  }

  getCurrentRevision(id: string): SourceDirectoryEntryRevision | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    return entry.revisions.find(r => r.revision === entry.currentRevision);
  }

  listEntries(): SourceDirectoryEntry[] {
    return Array.from(this.entries.values());
  }

  addEntry(entry: SourceDirectoryEntry): void {
    this.entries.set(entry.id, entry);
  }
}

export const defaultSourceDirectory = new SourceDirectory();

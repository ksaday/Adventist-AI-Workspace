import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('No File Upload Invariant Audit (Phase 6 / PR-P4-01 / Exit Criterion 3)', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  it('verifies zero file-upload dependencies in package.json', () => {
    const pkgPath = path.join(repoRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    const uploadLibraries = ['multer', 'formidable', 'busboy', 'connect-busboy', 'express-fileupload'];
    for (const lib of uploadLibraries) {
      expect(allDeps[lib]).toBeUndefined();
    }
  });

  it('scans all app/ and server/ code files for <input type="file"> or multipart/form-data', () => {
    function scanDir(dir: string): string[] {
      const files: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...scanDir(fullPath));
        } else if (/\.(tsx?|jsx?|html)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const targetDirs = [
      path.join(repoRoot, 'app'),
      path.join(repoRoot, 'packages'),
      path.join(repoRoot, 'server'),
    ];

    const sourceFiles = targetDirs.flatMap(d => (fs.existsSync(d) ? scanDir(d) : []));

    const violations: string[] = [];
    const fileInputRegex = /<input[^>]+type=['"]file['"]/i;
    const multipartRegex = /multipart\/form-data/i;

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (fileInputRegex.test(content)) {
        violations.push(`${file}: contains file input element`);
      }
      if (multipartRegex.test(content)) {
        violations.push(`${file}: contains multipart/form-data handler`);
      }
    }

    expect(violations).toEqual([]);
  });
});

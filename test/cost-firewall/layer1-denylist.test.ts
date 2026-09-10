import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Cost Firewall Layer 1 (SR-10.1): Dependency and Import Denylist', () => {
  it('passes on clean repository state', () => {
    const result = execSync('./scripts/check-cost-firewall.sh', { encoding: 'utf8' });
    expect(result).toContain('Cost Firewall Layer 1 passed');
  });

  it('fails CI on deliberate "import OpenAI from \'openai\'"', () => {
    const tempTestFile = path.resolve('server/temp-violation.ts');
    try {
      fs.writeFileSync(tempTestFile, "import OpenAI from 'openai';\nconsole.log(OpenAI);");
      expect(() => {
        execSync('./scripts/check-cost-firewall.sh', { encoding: 'utf8', stdio: 'pipe' });
      }).toThrow();
    } finally {
      if (fs.existsSync(tempTestFile)) {
        fs.unlinkSync(tempTestFile);
      }
    }
  });

  it('fails CI on deliberate "@anthropic-ai/sdk" in manifest or code', () => {
    const tempTestFile = path.resolve('server/temp-violation-anthropic.ts');
    try {
      fs.writeFileSync(tempTestFile, "import Anthropic from '@anthropic-ai/sdk';\nconsole.log(Anthropic);");
      expect(() => {
        execSync('./scripts/check-cost-firewall.sh', { encoding: 'utf8', stdio: 'pipe' });
      }).toThrow();
    } finally {
      if (fs.existsSync(tempTestFile)) {
        fs.unlinkSync(tempTestFile);
      }
    }
  });
});

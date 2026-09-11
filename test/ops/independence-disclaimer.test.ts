import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { compose } from '../../packages/compose/src/index';

describe('Independence Disclaimer Three-Location Verification (SR-D4 / PRD §2.4)', () => {
  const CANONICAL_DISCLAIMER =
    'SDA AI Workspace is an independent project and is not officially affiliated with, sponsored by, or endorsed by the General Conference of Seventh-day Adventists or the Ellen G. White Estate, Inc.';

  it('Location 1: Workspace UI Shell footer contains the canonical disclaimer', () => {
    const shellPath = path.resolve(__dirname, '../../app/(workspace)/workspace-shell.tsx');
    const shellContent = fs.readFileSync(shellPath, 'utf8');

    expect(shellContent).toContain(CANONICAL_DISCLAIMER);
    expect(shellContent).toContain('data-testid="workspace-independence-disclaimer"');
  });

  it('Location 2: Generated prompt output header contains the canonical disclaimer', () => {
    const output = compose({
      templateVersionId: 'test.v1',
      app: 'p2',
      parameters: {},
      userContent: 'My prayer request',
      sourceBlocks: [],
      contentLocale: 'en',
    });

    expect(output.prompt).toContain(CANONICAL_DISCLAIMER);
    expect(output.prompt.startsWith(`[INDEPENDENCE DISCLAIMER: ${CANONICAL_DISCLAIMER}]`)).toBe(true);
    expect(output.sections.some(s => s.title === 'Independence Disclaimer')).toBe(true);
  });

  it('Location 3: Legal Terms of Service contains the canonical disclaimer', () => {
    const tosPath = path.resolve(__dirname, '../../docs/60-risk/legal/terms-of-service.md');
    const tosContent = fs.readFileSync(tosPath, 'utf8');

    expect(tosContent).toContain(CANONICAL_DISCLAIMER);
  });

  it('Help modal and public status page also display the canonical disclaimer', () => {
    const helpModalPath = path.resolve(__dirname, '../../app/(workspace)/help-modal.tsx');
    const helpContent = fs.readFileSync(helpModalPath, 'utf8');
    expect(helpContent).toContain(CANONICAL_DISCLAIMER);

    const statusPagePath = path.resolve(__dirname, '../../app/status/page.tsx');
    const statusContent = fs.readFileSync(statusPagePath, 'utf8');
    expect(statusContent).toContain(CANONICAL_DISCLAIMER);
  });
});

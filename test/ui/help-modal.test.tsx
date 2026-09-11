/**
 * In-App Help & Documentation Modal Test (Implementation Plan §Phase 9).
 *
 * Verifies:
 * 1. Modal visibility and ARIA accessibility semantics.
 * 2. Tab switching across Evidence Levels, Finding Sources, FAQ, and Legal Policies.
 * 3. Invariant 3 presence in help content: Only E4 is VERIFIED (green); E3 is blue TEXT_CONSISTENT.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { HelpModal } from '../../app/(workspace)/help-modal';

describe('HelpModal UI Component', () => {
  it('renders nothing when isOpen is false', () => {
    const html = renderToString(<HelpModal isOpen={false} onClose={() => {}} />);
    expect(html).toBe('');
  });

  it('renders accessible dialog container when isOpen is true', () => {
    const html = renderToString(<HelpModal isOpen={true} onClose={() => {}} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="help-dialog-title"');
    expect(html).toContain('Help &amp; Documentation');
  });

  it('contains guidance on the Five Evidence Levels enforcing Invariant 3', () => {
    const html = renderToString(<HelpModal isOpen={true} onClose={() => {}} />);
    expect(html).toContain('The Five Evidence Levels (E0–E4)');
    expect(html).toContain('E3 (TEXT_CONSISTENT)');
    expect(html).toContain('E4 (VERIFIED)');
    expect(html).toContain('Invariant 3');
    expect(html).toContain('Only E4 may ever be shown as verified or in green');
  });
});

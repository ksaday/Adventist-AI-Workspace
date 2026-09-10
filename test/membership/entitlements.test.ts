import { describe, it, expect } from 'vitest';
import { evaluateEntitlement } from '../../server/membership/index.js';

describe('Membership & Entitlements (Phase 1)', () => {
  it('enforces tier app availability correctly', () => {
    // Free tier can access p2 and p3, but not p4 (Pastor aids)
    expect(evaluateEntitlement('free', { app: 'p2' })).toBe(true);
    expect(evaluateEntitlement('free', { app: 'p3' })).toBe(true);
    expect(evaluateEntitlement('free', { app: 'p4' })).toBe(false);

    // Pastor tier can access all apps including p4
    expect(evaluateEntitlement('pastor', { app: 'p4' })).toBe(true);
  });

  it('restricts outline export and citation checklist to Pastor tier', () => {
    expect(evaluateEntitlement('free', { feature: 'outlineExport' })).toBe(false);
    expect(evaluateEntitlement('member', { feature: 'outlineExport' })).toBe(false);
    expect(evaluateEntitlement('pastor', { feature: 'outlineExport' })).toBe(true);

    expect(evaluateEntitlement('free', { feature: 'citationChecklist' })).toBe(false);
    expect(evaluateEntitlement('pastor', { feature: 'citationChecklist' })).toBe(true);
  });
});

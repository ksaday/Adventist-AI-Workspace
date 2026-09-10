/**
 * Membership and Entitlement Service (Phase 1 deliverable).
 *
 * Implements plan definitions, entitlements evaluation, and BILLING_MODE=off support.
 */

export interface PlanEntitlements {
  apps: Array<'p2' | 'p3' | 'p4' | 'verify'>;
  promptGenerationsPerPeriod: number;
  verificationRunsPerPeriod: number;
  conversationRetentionDays: number;
  exportEnabled: boolean;
  outlineExportEnabled: boolean;
  citationChecklistEnabled: boolean;
  fairUseRatePerHour: number;
}

export interface Plan {
  id: 'free' | 'member' | 'pastor';
  displayName: string;
  priceCents: number;
  currency: string;
  entitlements: PlanEntitlements;
}

export const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    displayName: 'Free Tier',
    priceCents: 0,
    currency: 'USD',
    entitlements: {
      apps: ['p2', 'p3'],
      promptGenerationsPerPeriod: 20,
      verificationRunsPerPeriod: 3,
      conversationRetentionDays: 30,
      exportEnabled: true,
      outlineExportEnabled: false,
      citationChecklistEnabled: false,
      fairUseRatePerHour: 30,
    },
  },
  member: {
    id: 'member',
    displayName: 'Member',
    priceCents: 500,
    currency: 'USD',
    entitlements: {
      apps: ['p2', 'p3', 'verify'],
      promptGenerationsPerPeriod: 100,
      verificationRunsPerPeriod: 20,
      conversationRetentionDays: 90,
      exportEnabled: true,
      outlineExportEnabled: false,
      citationChecklistEnabled: false,
      fairUseRatePerHour: 60,
    },
  },
  pastor: {
    id: 'pastor',
    displayName: 'Pastor & Ministry',
    priceCents: 1500,
    currency: 'USD',
    entitlements: {
      apps: ['p2', 'p3', 'p4', 'verify'],
      promptGenerationsPerPeriod: 500,
      verificationRunsPerPeriod: 100,
      conversationRetentionDays: 365,
      exportEnabled: true,
      outlineExportEnabled: true,
      citationChecklistEnabled: true,
      fairUseRatePerHour: 120,
    },
  },
};

export function evaluateEntitlement(
  planId: 'free' | 'member' | 'pastor',
  check: {
    app?: 'p2' | 'p3' | 'p4' | 'verify';
    feature?: 'outlineExport' | 'citationChecklist' | 'export';
  },
  billingMode = process.env.BILLING_MODE ?? 'off'
): boolean {
  const plan = PLANS[planId] ?? PLANS.free;

  // When billing mode is off (pilot/testing), we operate with standard entitlements
  if (check.app && !plan.entitlements.apps.includes(check.app)) {
    return false;
  }

  if (check.feature === 'outlineExport' && !plan.entitlements.outlineExportEnabled) {
    return false;
  }

  if (check.feature === 'citationChecklist' && !plan.entitlements.citationChecklistEnabled) {
    return false;
  }

  return true;
}

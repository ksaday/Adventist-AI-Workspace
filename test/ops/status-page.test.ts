import { describe, it, expect } from 'vitest';
import {
  checkDatabaseHealth,
  checkCostFirewallHealth,
  checkKmsHealth,
  getSystemStatusReport,
} from '../../server/monitoring/status';

describe('Production Monitoring & Status Probes (Phase 10 / PRD §8)', () => {
  it('reports operational status when all system probes succeed', async () => {
    const report = await getSystemStatusReport({
      pingDb: async () => true,
      checkMasterKey: () => true,
      env: {},
      maintenanceMode: false,
    });

    expect(report.overall).toBe('operational');
    expect(report.uptimePercentage).toBeGreaterThanOrEqual(99.5);
    expect(report.slaTarget).toBe(99.5);
    expect(report.guarantees.costFirewallAiSpend).toBe('$0.00');
    expect(report.guarantees.egwCorpusStorageBytes).toBe(0);
    expect(report.guarantees.serverSideLlmCalls).toBe(0);
    expect(report.guarantees.evidenceFloorForVerified).toBe('E4');
  });

  it('reports outage when database connectivity fails', async () => {
    const report = await getSystemStatusReport({
      pingDb: async () => false,
      checkMasterKey: () => true,
      env: {},
    });

    expect(report.overall).toBe('outage');
    const dbComp = report.components.find(c => c.id === 'database');
    expect(dbComp?.status).toBe('outage');
  });

  it('reports outage when Cost Firewall detects prohibited AI credentials in env (SR-10.2)', async () => {
    const report = await getSystemStatusReport({
      pingDb: async () => true,
      checkMasterKey: () => true,
      env: { OPENAI_API_KEY: 'sk-prohibited-test-key' },
    });

    expect(report.overall).toBe('outage');
    const cfComp = report.components.find(c => c.id === 'cost_firewall');
    expect(cfComp?.status).toBe('outage');
    expect(cfComp?.message).toContain('OPENAI_API_KEY');
  });

  it('reports maintenance mode when maintenance flag is enabled', async () => {
    const report = await getSystemStatusReport({
      pingDb: async () => true,
      checkMasterKey: () => true,
      env: {},
      maintenanceMode: true,
    });

    expect(report.overall).toBe('maintenance');
  });

  it('probes KMS health and reports degraded when master key is missing', () => {
    const healthy = checkKmsHealth(() => true);
    expect(healthy.status).toBe('operational');

    const degraded = checkKmsHealth(() => false);
    expect(degraded.status).toBe('degraded');
  });
});

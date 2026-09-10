import { describe, it, expect } from 'vitest';
import { authorize, type ActorContext, type ResourceDescriptor } from '../../server/authz/index.js';

describe('Authorization Module: Sweep over Resource Routes (Phase 1 Exit Criteria)', () => {
  const alice: ActorContext = { userId: 'user-alice-111', role: 'member', tier: 'member' };
  const bob: ActorContext = { userId: 'user-bob-222', role: 'member', tier: 'member' };
  const pastorDan: ActorContext = { userId: 'user-dan-333', role: 'pastor', tier: 'pastor' };
  const adminSam: ActorContext = { userId: 'user-admin-999', role: 'admin', tier: 'pastor' };

  const resources: ResourceDescriptor[] = [
    { type: 'conversation', id: 'conv-alice-01', ownerId: 'user-alice-111' },
    { type: 'message', id: 'msg-alice-01', ownerId: 'user-alice-111' },
    { type: 'verification', id: 'ver-alice-01', ownerId: 'user-alice-111' },
    { type: 'claim', id: 'claim-alice-01', ownerId: 'user-alice-111' },
    { type: 'export', id: 'export-alice-01', ownerId: 'user-alice-111' },
  ];

  it('allows owner full access to their own resources across all types', () => {
    for (const res of resources) {
      expect(authorize(alice, 'read', res).allowed).toBe(true);
      expect(authorize(alice, 'update', res).allowed).toBe(true);
      expect(authorize(alice, 'delete', res).allowed).toBe(true);
    }
  });

  it('PREVENTS IDOR: denies non-owner from accessing another member’s resources across all types', () => {
    for (const res of resources) {
      const readDecision = authorize(bob, 'read', res);
      expect(readDecision.allowed).toBe(false);
      expect(readDecision.reason).toContain('Actor does not own');

      const deleteDecision = authorize(bob, 'delete', res);
      expect(deleteDecision.allowed).toBe(false);
    }
  });

  it('enforces that admin writes require administrative role', () => {
    const adminSetting: ResourceDescriptor = { type: 'admin_setting', id: 'global-flags' };

    expect(authorize(alice, 'admin_write', adminSetting).allowed).toBe(false);
    expect(authorize(pastorDan, 'admin_write', adminSetting).allowed).toBe(false);
    expect(authorize(adminSam, 'admin_write', adminSetting).allowed).toBe(true);
  });

  it('strictly blocks exporting ephemeral conversations', () => {
    const ephemeralConv: ResourceDescriptor = {
      type: 'conversation',
      id: 'ephemeral-conv-01',
      ownerId: 'user-alice-111',
      isEphemeral: true,
    };

    const exportDecision = authorize(alice, 'export', ephemeralConv);
    expect(exportDecision.allowed).toBe(false);
    expect(exportDecision.reason).toContain('Ephemeral conversations cannot be exported');
  });
});

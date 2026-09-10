import { describe, it, expect } from 'vitest';
import { AuditChain, computeEntryHash } from '../../server/audit/index.js';

describe('Audit Service: Hash-Chained Verification (Phase 1 Exit Criteria)', () => {
  it('appends entries sequentially and verifies unbroken cryptographic chain', () => {
    const chain = new AuditChain();

    chain.append({ id: 'evt-1', actorId: 'user-1', action: 'auth.login', resourceId: 'session-1' });
    chain.append({ id: 'evt-2', actorId: 'user-1', action: 'conversation.create', resourceId: 'conv-1' });
    chain.append({ id: 'evt-3', actorId: 'user-1', action: 'message.create', resourceId: 'msg-1' });

    const result = chain.verify();
    expect(result.valid).toBe(true);
    expect(chain.getRecords()).toHaveLength(3);
  });

  it('DETECTS DELIBERATE TAMPER: payload modification within the chain', () => {
    const chain = new AuditChain();

    chain.append({ id: 'evt-1', actorId: 'user-1', action: 'auth.login', resourceId: 'session-1' });
    chain.append({ id: 'evt-2', actorId: 'user-1', action: 'conversation.create', resourceId: 'conv-1' });
    chain.append({ id: 'evt-3', actorId: 'user-1', action: 'message.create', resourceId: 'msg-1' });

    // Deliberate tamper: an attacker modifies action in evt-2
    const records = [...chain.getRecords()];
    records[1].action = 'admin.escalate_privilege';

    const tamperedChain = new AuditChain(records);
    const result = tamperedChain.verify();

    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(1);
    expect(result.error).toContain('Tamper detected');
  });

  it('DETECTS DELIBERATE TAMPER: broken hash link between records', () => {
    const chain = new AuditChain();

    chain.append({ id: 'evt-1', actorId: 'user-1', action: 'auth.login', resourceId: 'session-1' });
    chain.append({ id: 'evt-2', actorId: 'user-1', action: 'conversation.create', resourceId: 'conv-1' });

    const records = [...chain.getRecords()];
    // Deliberate tamper: alter the prevHash
    records[1].prevHash = 'bad-hash-tampered-0000000000000000000000000000000000000000000000';

    const tamperedChain = new AuditChain(records);
    const result = tamperedChain.verify();

    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(1);
    expect(result.error).toContain('Broken link');
  });
});

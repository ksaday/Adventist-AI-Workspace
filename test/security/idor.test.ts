import { describe, it, expect, beforeEach } from 'vitest';
import { authorize, type ActorContext, type ResourceDescriptor } from '../../server/authz/index.js';
import { ConversationService } from '../../server/domain/conversation.js';
import { SourceBlockRefService } from '../../server/domain/source-block.js';
import { AdminService } from '../../server/domain/admin.js';
import { AuditChain } from '../../server/audit/index.js';
import { generateUserDek } from '../../server/crypto/index.js';

describe('Insecure Direct Object Reference (IDOR) Authorization Sweep (Component Arch §3)', () => {
  const alice: ActorContext = { userId: 'alice', role: 'member', tier: 'member' };
  const bob: ActorContext = { userId: 'bob', role: 'member', tier: 'member' };
  const pastorDan: ActorContext = { userId: 'dan', role: 'pastor', tier: 'pastor' };
  const adminEve: ActorContext = { userId: 'eve', role: 'admin', tier: 'pastor' };

  let convService: ConversationService;
  let sourceBlockService: SourceBlockRefService;
  let adminService: AdminService;
  let auditChain: AuditChain;

  beforeEach(() => {
    convService = new ConversationService();
    sourceBlockService = new SourceBlockRefService();
    auditChain = new AuditChain();
    adminService = new AdminService({
      auditChain,
      conversationService: convService,
      sourceBlockService,
    });
  });

  describe('Authorization Engine Ownership Sweeps', () => {
    it('blocks User A from reading, modifying, or deleting User B resources', () => {
      const bobConversation: ResourceDescriptor = {
        type: 'conversation',
        id: 'conv-bob-1',
        ownerId: 'bob',
      };

      // Alice attempting access to Bob's conversation
      const readAttempt = authorize(alice, 'read', bobConversation);
      expect(readAttempt.allowed).toBe(false);
      expect(readAttempt.reason).toContain('does not own');

      const updateAttempt = authorize(alice, 'update', bobConversation);
      expect(updateAttempt.allowed).toBe(false);

      const deleteAttempt = authorize(alice, 'delete', bobConversation);
      expect(deleteAttempt.allowed).toBe(false);

      const exportAttempt = authorize(alice, 'export', bobConversation);
      expect(exportAttempt.allowed).toBe(false);

      // Bob accessing his own conversation succeeds
      const bobOwnAccess = authorize(bob, 'read', bobConversation);
      expect(bobOwnAccess.allowed).toBe(true);
    });

    it('blocks regular members and pastors from performing admin actions', () => {
      const adminSetting: ResourceDescriptor = {
        type: 'admin_setting',
        id: 'flags',
      };

      expect(authorize(alice, 'admin_write', adminSetting).allowed).toBe(false);
      expect(authorize(pastorDan, 'admin_write', adminSetting).allowed).toBe(false);
      expect(authorize(adminEve, 'admin_write', adminSetting).allowed).toBe(true);
    });
  });

  describe('Domain Service Layer Cross-User Isolation', () => {
    it('prevents cross-user source block access', async () => {
      const bobsBlock = await sourceBlockService.recordSourceBlockRef({
        conversationId: 'conv-bob-sources',
        userId: 'bob',
        kind: 'pasted_text',
        charCount: 2500,
        attributedWorkId: 'da',
        clientCommitment: 'commit-marker-123',
        sessionId: 'sess-bob',
      });

      // Bob can access his block
      const bobLookup = await sourceBlockService.getById(bobsBlock.id, 'bob');
      expect(bobLookup).toBeDefined();

      // Alice cannot access Bob's block (returns null)
      const aliceLookup = await sourceBlockService.getById(bobsBlock.id, 'alice');
      expect(aliceLookup).toBeNull();
    });

    it('prevents admins from reading conversation content without break-glass', () => {
      const bobDek = generateUserDek();
      const bobsConv = convService.createConversation({
        id: 'conv-bob-secret',
        userId: 'bob',
        app: 'p3',
        titlePlaintext: 'Private Pastoral Question',
        userDek: bobDek,
      });

      convService.addMessage({
        messageId: 'msg-1',
        conversationId: bobsConv.id,
        userId: 'bob',
        role: 'user',
        bodyPlaintext: 'Personal struggle with doubt',
        userDek: bobDek,
      });

      // Admin Eve attempts to read Bob's content without active break-glass
      expect(() =>
        adminService.readConversationContentWithBreakGlass({
          actor: adminEve,
          breakGlassGrantId: 'invalid-or-missing-grant',
          conversationId: bobsConv.id,
          userDek: bobDek,
        })
      ).toThrow(/Access denied.*break-glass/);
    });
  });
});

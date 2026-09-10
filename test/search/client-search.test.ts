import { describe, it, expect } from 'vitest';
import { ConversationService, searchClientSide } from '../../server/domain/conversation.js';
import { generateUserDek } from '../../server/crypto/index.js';

describe('Client-Side Encrypted Conversation Search (Phase 2)', () => {
  const userId = '018f4a12-aaaa-7000-8000-000000000001';

  it('decrypts titles locally and performs fast query matching without server transmission', () => {
    const service = new ConversationService();
    const userDek = generateUserDek();

    const c1 = service.createConversation({
      id: 'c1',
      userId,
      app: 'p3',
      titlePlaintext: 'Sanctuary 2300 Days Prophecy',
      userDek,
      tags: ['prophecy', 'daniel8'],
    });

    const c2 = service.createConversation({
      id: 'c2',
      userId,
      app: 'p2',
      titlePlaintext: 'Health Ministry and Temperance',
      userDek,
      tags: ['health'],
    });

    const c3 = service.createConversation({
      id: 'c3',
      userId,
      app: 'p4',
      titlePlaintext: 'Sermon on the Mount Beatitudes',
      userDek,
      tags: ['matthew5'],
    });

    const allConversations = [c1, c2, c3];

    // Search by title match
    const prophecyResults = searchClientSide(allConversations, 'Sanctuary', userDek);
    expect(prophecyResults).toHaveLength(1);
    expect(prophecyResults[0].title).toBe('Sanctuary 2300 Days Prophecy');

    // Search by tag match
    const healthResults = searchClientSide(allConversations, 'health', userDek);
    expect(healthResults).toHaveLength(1);
    expect(healthResults[0].title).toBe('Health Ministry and Temperance');

    // Case-insensitive search
    const beatitudeResults = searchClientSide(allConversations, 'beatitudes', userDek);
    expect(beatitudeResults).toHaveLength(1);
    expect(beatitudeResults[0].id).toBe('c3');
  });

  it('excludes soft-deleted conversations from search results', () => {
    const service = new ConversationService();
    const userDek = generateUserDek();

    const c1 = service.createConversation({
      id: 'c1',
      userId,
      app: 'p3',
      titlePlaintext: 'Deleted Study Topic',
      userDek,
    });

    service.softDelete(c1.id);

    const results = searchClientSide([c1], 'Deleted', userDek);
    expect(results).toHaveLength(0);
  });
});

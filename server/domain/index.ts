// server/domain - Domain services: conversation, verification, membership, admin, export
export interface ConversationRecord {
  id: string;
  userId: string;
  app: 'p2' | 'p3' | 'p4' | 'verify';
  isEphemeral: boolean;
  createdAt: string;
}

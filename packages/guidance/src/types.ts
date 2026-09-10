/**
 * Domain types for Phase 5 P3 Spiritual Guidance.
 * (PRD §4 / UX §6.2 / Template Library §5 / SRS SR-D2)
 */

export type SourceBlockKind = 'pasted_text' | 'bible_reference' | 'egw_citation' | 'url';

export interface ClientSourceBlock {
  id: string;
  kind: SourceBlockKind;
  label: string;
  text: string; // Stored ONLY in browser memory/session; NEVER sent to our server (SR-D1 / ADR-0022)
  salt: string; // 32-byte hex salt; stays in browser
  commitment: string; // SHA-256(salt || normalised text); hex
  charCount: number;
  attributedWorkId?: string;
  createdAt: string;
}

export interface SourceBlockRefRecord {
  id: string;
  conversationId: string;
  userId: string;
  kind: SourceBlockKind;
  charCount: number;
  attributedWorkId?: string;
  clientCommitment: string;
  sessionId: string;
  createdAt: string;
}

export type DenominationalTopicId =
  | 'sabbath'
  | 'sanctuary'
  | 'state_of_the_dead'
  | 'spirit_of_prophecy'
  | 'health_message'
  | 'last_day_events'
  | 'standards_and_lifestyle'
  | 'investigative_judgement'
  | 'creation'
  | 'tithe'
  | 'marriage_divorce'
  | 'womens_ordination';

export interface DenominationalTopic {
  id: DenominationalTopicId;
  nameEn: string;
  nameKo: string;
  keywordsEn: string[];
  keywordsKo: string[];
  officialPositionEn: string;
  officialPositionKo: string;
}

export interface FiveBandAnswer {
  band1UserSituation: string;
  band2Scripture: string;
  band3Egw: string;
  band4Reflection: string;
  band5Uncertain: string;
  rawText: string;
  missingBand5: boolean;
  claimsBlock?: string;
  parsedClaims?: Array<{
    id: string;
    type: string;
    source: string;
    confidence: string;
    text: string;
  }>;
}

export interface GuidanceQuestionIntake {
  question: string;
  sources: ClientSourceBlock[];
  locale: 'en' | 'ko';
  manualTopicOverride?: DenominationalTopicId;
}

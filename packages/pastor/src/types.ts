/**
 * Domain types for Phase 6 P4 Pastor's Aids (PRD §5 / UX §6.3 / Template Library §6).
 */

export type PastorTaskType =
  | 'sermon_outline'
  | 'sermon_topic_explore'
  | 'bible_passage_discover'
  | 'egw_reference_discovery'
  | 'sermon_points'
  | 'biblestudy_outline'
  | 'devotional_outline'
  | 'discussion_questions'
  | 'thematic_comparison'
  | 'application_ideas'
  | 'sermon_refinement'
  | 'source_verification';

export type HomileticForm = 'expository' | 'textual' | 'topical' | 'narrative';
export type HomileticTone = 'pastoral' | 'evangelistic' | 'pedagogical' | 'encouraging' | 'prophetic';
export type HomileticDepth = 'introductory' | 'congregational' | 'theological';
export type OutlineFormat = 'points_and_subpoints' | 'decimal' | 'narrative_movement' | 'qa';

export interface HomileticParameters {
  topic: string;
  anchorPassage: string;
  occasion?: string;
  audience?: string;
  durationMinutes?: number;
  pointCount?: number;
  homileticForm?: HomileticForm;
  tone?: HomileticTone;
  depth?: HomileticDepth;
  bibleEmphasis?: 1 | 2 | 3 | 4 | 5;
  egwEmphasis?: 'none' | 'light' | 'moderate';
  outlineFormat?: OutlineFormat;
  locale?: 'en' | 'ko';
  preferredTranslation?: string;
}

export interface OutlinePoint {
  id: string;
  pointNumber: number;
  pointText: string;
  supportingPassage?: string;
  subPoints: string[];
  illustrationPlaceholder?: string;
}

export interface StructuredOutline {
  id: string;
  title: string;
  thesis: string;
  anchorPassage: string;
  introductionApproach: string;
  points: OutlinePoint[];
  closingAppeal: string;
  discussionQuestions: string[];
  citations: ChecklistCitation[];
  readyToPreach: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EvidenceLevel = 'E0' | 'E1' | 'E2' | 'E3' | 'E4';

export interface ChecklistCitation {
  id: string;
  reference: string;
  type: 'scripture' | 'egw';
  evidenceLevel: EvidenceLevel;
  markedForVerbatimQuotation: boolean;
  officialUrl?: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface ChecklistEvaluation {
  isReady: boolean;
  blockingCount: number;
  totalVerbatimCount: number;
  blockingCitations: ChecklistCitation[];
}

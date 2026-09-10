// packages/safety - Client-side risk lexicon screener
export interface SafetyScreenResult {
  flagged: boolean;
  severity?: 'critical' | 'warning' | 'info';
  category?: string;
  matchedTerm?: string;
}

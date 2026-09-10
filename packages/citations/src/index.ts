// packages/citations - Bible parser/validator, EGW normaliser/validator
export interface CitationValidationResult {
  raw: string;
  normalized?: string;
  valid: boolean;
  reason?: string;
}

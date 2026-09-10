// packages/compose - Prompt Composer + template renderer (Component Architecture §2.1)
export interface ComposeInput {
  templateVersionId: string;
  app: 'p2' | 'p3' | 'p4' | 'verify';
  parameters: Record<string, string | number | boolean | string[]>;
  userContent: string;
  sourceBlocks: Array<{
    id: string;
    kind: 'pasted_text' | 'bible_reference' | 'egw_citation' | 'url';
    label: string;
    body: string;
  }>;
  contentLocale: string;
}

export interface ComposeOutput {
  prompt: string;
  nonce: string;
  characterCount: number;
  templateVersionId: string;
}

// packages/providers - Provider registry and deep-link builder (browser-facing)
export interface ProviderConfig {
  id: 'chatgpt' | 'claude' | 'gemini';
  name: string;
  baseUrl: string;
  prefillUrlPattern?: string;
  prefillCapCharacters: number;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    baseUrl: 'https://chatgpt.com',
    prefillCapCharacters: 4000,
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    baseUrl: 'https://claude.ai',
    prefillCapCharacters: 4000,
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    baseUrl: 'https://gemini.google.com',
    prefillCapCharacters: 4000,
  },
};

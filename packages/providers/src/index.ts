/**
 * AI Provider Registry & Launcher (Component Architecture §2.7 / AI Provider Architecture).
 *
 * Invariants:
 * 1. Clipboard write ALWAYS happens first.
 * 2. If clipboard write fails, the tab is NOT opened (Exit Criterion 3).
 * 3. Prompts exceeding prefillCap fallback to copy-only mode (Exit Criterion 4).
 * 4. No iframe embedding, no browser automation.
 */

export interface ProviderConfig {
  id: 'chatgpt' | 'claude' | 'gemini';
  name: string;
  baseUrl: string;
  prefillTemplate?: string;
  prefillCapCharacters: number;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    baseUrl: 'https://chatgpt.com',
    prefillTemplate: 'https://chatgpt.com/?q={prompt}',
    prefillCapCharacters: 4000,
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    baseUrl: 'https://claude.ai',
    prefillTemplate: 'https://claude.ai/new?q={prompt}',
    prefillCapCharacters: 4000,
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    baseUrl: 'https://gemini.google.com',
    prefillTemplate: 'https://gemini.google.com/app?prompt={prompt}',
    prefillCapCharacters: 4000,
  },
};

export interface LaunchParams {
  providerId: 'chatgpt' | 'claude' | 'gemini';
  prompt: string;
  writeClipboard: (text: string) => Promise<boolean>;
  openTab: (url: string) => void;
}

export interface LaunchOutcome {
  success: boolean;
  mode: 'prefill' | 'copy_only';
  targetUrl: string;
  error?: string;
}

/**
 * Executes a clipboard-first provider launch.
 */
export async function launchProvider(params: LaunchParams): Promise<LaunchOutcome> {
  const provider = PROVIDERS[params.providerId];
  if (!provider) {
    throw new Error(`Unknown provider ID: ${params.providerId}`);
  }

  // 1. Clipboard write ALWAYS happens first (Exit Criterion 3)
  let clipboardOk = false;
  try {
    clipboardOk = await params.writeClipboard(params.prompt);
  } catch (err) {
    clipboardOk = false;
  }

  if (!clipboardOk) {
    // If clipboard write fails, the tab MUST NOT be opened!
    return {
      success: false,
      mode: 'copy_only',
      targetUrl: provider.baseUrl,
      error: 'CLIPBOARD_WRITE_FAILED',
    };
  }

  // 2. Evaluate prefill cap (Exit Criterion 4)
  const exceedsCap = params.prompt.length > provider.prefillCapCharacters;
  let targetUrl: string;
  let mode: 'prefill' | 'copy_only';

  if (!exceedsCap && provider.prefillTemplate) {
    mode = 'prefill';
    const encodedPrompt = encodeURIComponent(params.prompt);
    targetUrl = provider.prefillTemplate.replace('{prompt}', encodedPrompt);
  } else {
    // Fallback to copy-only: open base URL without prompt query
    mode = 'copy_only';
    targetUrl = provider.baseUrl;
  }

  // 3. Open the tab
  params.openTab(targetUrl);

  return {
    success: true,
    mode,
    targetUrl,
  };
}

import { describe, it, expect, vi } from 'vitest';
import { launchProvider } from '../../packages/providers/src/index.js';

describe('AI Provider Launcher (Phase 3 Exit Criteria 3 & 4)', () => {
  it('EXIT CRITERION 3: Clipboard write failure PREVENTS tab from opening', async () => {
    const mockWriteClipboard = vi.fn().mockResolvedValue(false); // Clipboard write fails
    const mockOpenTab = vi.fn();

    const result = await launchProvider({
      providerId: 'chatgpt',
      prompt: 'Test prompt that failed to copy to clipboard',
      writeClipboard: mockWriteClipboard,
      openTab: mockOpenTab,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('CLIPBOARD_WRITE_FAILED');
    expect(mockWriteClipboard).toHaveBeenCalledTimes(1);
    // Tab must NOT have been opened
    expect(mockOpenTab).not.toHaveBeenCalled();
  });

  it('EXIT CRITERION 4: Prompt exceeding 4,000 character prefill cap falls back to copy-only', async () => {
    const mockWriteClipboard = vi.fn().mockResolvedValue(true);
    const mockOpenTab = vi.fn();

    // Generate a long prompt exceeding 4,000 characters
    const longPrompt = 'A'.repeat(4500);

    const result = await launchProvider({
      providerId: 'chatgpt',
      prompt: longPrompt,
      writeClipboard: mockWriteClipboard,
      openTab: mockOpenTab,
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('copy_only');
    // Opens plain base URL without ?q={prompt} query
    expect(result.targetUrl).toBe('https://chatgpt.com');
    expect(mockOpenTab).toHaveBeenCalledWith('https://chatgpt.com');
  });

  it('successful normal prompt opens prefill URL when under cap', async () => {
    const mockWriteClipboard = vi.fn().mockResolvedValue(true);
    const mockOpenTab = vi.fn();

    const shortPrompt = 'Help explain Daniel 9:24-27 seventy weeks.';

    const result = await launchProvider({
      providerId: 'claude',
      prompt: shortPrompt,
      writeClipboard: mockWriteClipboard,
      openTab: mockOpenTab,
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('prefill');
    expect(result.targetUrl).toContain('https://claude.ai/new?q=');
    expect(mockOpenTab).toHaveBeenCalledTimes(1);
  });
});

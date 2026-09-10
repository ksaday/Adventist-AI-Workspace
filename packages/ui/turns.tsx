import React from 'react';

export interface BaseTurnProps {
  seq: number;
  content: string;
}

export interface ExternalAiTurnProps extends BaseTurnProps {
  provider: 'chatgpt' | 'claude' | 'gemini';
  isVerified?: boolean;
}

/**
 * 1. You (The member): Right-aligned, accent-tinted, plain (UX Spec §1).
 */
export function TurnUser({ seq, content }: BaseTurnProps) {
  return (
    <div
      role="article"
      aria-label={`User message turn ${seq}`}
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        margin: '1rem 0',
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          backgroundColor: 'var(--turn-user-bg)',
          padding: '0.75rem 1rem',
          borderRadius: '12px 12px 2px 12px',
        }}
      >
        <p style={{ margin: 0 }}>{content}</p>
      </div>
    </div>
  );
}

/**
 * 2. Workspace (Our deterministic engine): Left-aligned, bordered card, "Workspace" label (UX Spec §1).
 */
export function TurnWorkspace({ seq, content }: BaseTurnProps) {
  return (
    <div
      role="article"
      aria-label={`Workspace engine turn ${seq}`}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        margin: '1rem 0',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          backgroundColor: 'var(--turn-workspace-bg)',
          border: '1px solid var(--turn-workspace-border)',
          borderRadius: '8px',
          padding: '1rem',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
          }}
        >
          Workspace
        </span>
        <div style={{ marginTop: '0.5rem' }}>{content}</div>
      </div>
    </div>
  );
}

/**
 * 3. External AI (Pasted from user's provider):
 * Left-aligned, distinct background, provider badge, thin left rule (UX Spec §1).
 */
export function TurnAssistantExternal({
  seq,
  content,
  provider,
  isVerified = false,
}: ExternalAiTurnProps) {
  const providerNames = {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    gemini: 'Gemini',
  };

  return (
    <div
      role="article"
      aria-label={`External AI response turn ${seq} from ${providerNames[provider]}`}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        margin: '1rem 0',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          backgroundColor: 'var(--turn-external-ai-bg)',
          borderLeft: '3px solid var(--turn-external-ai-rule)',
          borderRadius: '0 8px 8px 0',
          padding: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            fontSize: '0.75rem',
          }}
        >
          <span
            style={{
              fontWeight: 600,
              padding: '2px 6px',
              backgroundColor: 'var(--border-color)',
              borderRadius: '4px',
            }}
          >
            {providerNames[provider]}
          </span>
          <span style={{ color: isVerified ? 'var(--evidence-e4-green)' : 'var(--text-secondary)' }}>
            {isVerified ? '● Official Verified (E4)' : '○ Unverified'}
          </span>
        </div>
        <div>{content}</div>
      </div>
    </div>
  );
}

/**
 * 4. System Note (Events, safety alerts): Centred, small, muted (UX Spec §1).
 */
export function TurnSystemNote({ seq, content }: BaseTurnProps) {
  return (
    <div
      role="status"
      aria-label={`System event note turn ${seq}`}
      style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '0.75rem 0',
      }}
    >
      <div
        style={{
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          padding: '0.25rem 0.75rem',
          textAlign: 'center',
        }}
      >
        {content}
      </div>
    </div>
  );
}

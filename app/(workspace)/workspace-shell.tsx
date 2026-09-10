'use client';

import React, { useState } from 'react';
import { t, type SupportedLocale } from '../../packages/i18n/src/index.js';
import { TurnUser, TurnWorkspace, TurnAssistantExternal, TurnSystemNote } from '../../packages/ui/turns.js';
import { PrayerNote } from './prayer-note.js';
import { SpiritualGuidanceWorkspace } from './spiritual-guidance.js';
import { PastorsAidsWorkspace } from './pastors-aids.js';
import { VerificationWorkbench } from './verification-workbench.js';
import { AdminConsole } from './admin-console.js';

export interface MessageItem {
  seq: number;
  role: 'user' | 'workspace' | 'assistant_external' | 'system_note';
  content: string;
  provider?: 'chatgpt' | 'claude' | 'gemini';
  isVerified?: boolean;
}

export function WorkspaceShell({
  initialMessages = [],
  locale = 'en',
  isEphemeral = false,
  initialTool = 'guidance',
}: {
  initialMessages?: MessageItem[];
  locale?: SupportedLocale;
  isEphemeral?: boolean;
  initialTool?: 'prayer' | 'guidance' | 'pastor' | 'verify';
}) {
  const [messages] = useState<MessageItem[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [activeTool, setActiveTool] = useState<'prayer' | 'guidance' | 'pastor' | 'verify'>(initialTool);
  const [ephemeralMode, setEphemeralMode] = useState(isEphemeral);
  const [showAdminConsole, setShowAdminConsole] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {/* Sidebar (Desktop) / Drawer (Mobile) */}
      <aside
        role="navigation"
        aria-label="Workspace navigation"
        style={{
          width: '260px',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
          {t('app_title', {}, { locale })}
        </div>

        <button
          type="button"
          style={{
            padding: '0.6rem 1rem',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            marginBottom: '1.5rem',
          }}
        >
          {t('new_chat', {}, { locale })}
        </button>

        <nav style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {t('tools_header', {}, { locale })}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0' }}>
            <li style={{ padding: '0.4rem 0' }}>
              <button
                type="button"
                onClick={() => setActiveTool('prayer')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTool === 'prayer' ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontWeight: activeTool === 'prayer' ? 700 : 400,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  textAlign: 'left',
                }}
              >
                {activeTool === 'prayer' ? '●' : '○'} {t('tool_prayer_note', {}, { locale })}
              </button>
            </li>
            <li style={{ padding: '0.4rem 0' }}>
              <button
                type="button"
                onClick={() => setActiveTool('guidance')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTool === 'guidance' ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontWeight: activeTool === 'guidance' ? 700 : 400,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  textAlign: 'left',
                }}
              >
                {activeTool === 'guidance' ? '●' : '○'} {t('tool_spiritual_guidance', {}, { locale })}
              </button>
            </li>
            <li style={{ padding: '0.4rem 0' }}>
              <button
                type="button"
                onClick={() => setActiveTool('pastor')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTool === 'pastor' ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontWeight: activeTool === 'pastor' ? 700 : 400,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  textAlign: 'left',
                }}
              >
                {activeTool === 'pastor' ? '●' : '○'} {t('tool_pastor_aids', {}, { locale })} <span title="Pastor tier">ᴾ</span>
              </button>
            </li>
            <li style={{ padding: '0.4rem 0' }}>
              <button
                type="button"
                onClick={() => setActiveTool('verify')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTool === 'verify' ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontWeight: activeTool === 'verify' ? 700 : 400,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  textAlign: 'left',
                }}
              >
                {activeTool === 'verify' ? '●' : '○'} {t('tool_verification', {}, { locale })}
              </button>
            </li>
          </ul>

          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {t('recent_header', {}, { locale })}
          </div>
          <input
            type="search"
            aria-label="Search conversation history"
            placeholder={t('search_placeholder', {}, { locale })}
            style={{
              width: '100%',
              padding: '0.4rem 0.6rem',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              boxSizing: 'border-box',
              marginBottom: '1rem',
            }}
          />
        </nav>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setShowAdminConsole(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            🛡️ {t('tool_admin_console', {}, { locale })}
          </button>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            ⚙ {t('settings', {}, { locale })}
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '900px',
          margin: '0 auto',
          padding: '1.5rem',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {activeTool === 'prayer' ? (
          <PrayerNote locale={locale} />
        ) : activeTool === 'guidance' ? (
          <SpiritualGuidanceWorkspace locale={locale} />
        ) : activeTool === 'pastor' ? (
          <PastorsAidsWorkspace locale={locale} />
        ) : activeTool === 'verify' ? (
          <VerificationWorkbench
            locale={locale}
            claims={[]}
            currentUserId="user_default"
            onBackToOrigin={() => setActiveTool('guidance')}
          />
        ) : (
          <>
            {/* Timeline Header */}
            <header
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
                {t('tool_spiritual_guidance', {}, { locale })}
              </h2>
              <span
                style={{
                  fontSize: '0.8rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: ephemeralMode ? 'var(--evidence-e3-bg)' : 'var(--border-color)',
                  color: ephemeralMode ? 'var(--evidence-e3-blue)' : 'var(--text-secondary)',
                }}
              >
                {ephemeralMode ? t('mode_ephemeral', {}, { locale }) : t('mode_standard', {}, { locale })}
              </span>
            </header>

            {/* Conversation Timeline */}
            <section aria-label="Conversation timeline" style={{ flex: 1, overflowY: 'auto' }}>
              {messages.map(msg => {
                if (msg.role === 'user') {
                  return <TurnUser key={msg.seq} seq={msg.seq} content={msg.content} />;
                }
                if (msg.role === 'workspace') {
                  return <TurnWorkspace key={msg.seq} seq={msg.seq} content={msg.content} />;
                }
                if (msg.role === 'assistant_external') {
                  return (
                    <TurnAssistantExternal
                      key={msg.seq}
                      seq={msg.seq}
                      content={msg.content}
                      provider={msg.provider ?? 'chatgpt'}
                      isVerified={msg.isVerified}
                    />
                  );
                }
                return <TurnSystemNote key={msg.seq} seq={msg.seq} content={msg.content} />;
              })}
            </section>

            {/* Composer Footer */}
            <footer style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <textarea
                  aria-label="Ask about anything"
                  rows={3}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={t('ask_placeholder', {}, { locale })}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="button"
                  style={{
                    alignSelf: 'flex-end',
                    padding: '0.75rem 1.25rem',
                    backgroundColor: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {t('compose_button', {}, { locale })}
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.5rem',
                }}
              >
                <span>🌐 {t('language_indicator', { locale: locale.toUpperCase() }, { locale })}</span>
                <button
                  type="button"
                  onClick={() => setEphemeralMode(!ephemeralMode)}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                >
                  ⚑ {ephemeralMode ? t('mode_ephemeral', {}, { locale }) : t('make_ephemeral', {}, { locale })}
                </button>
              </div>
            </footer>
          </>
        )}
      </main>

      {showAdminConsole && (
        <AdminConsole
          actor={{ userId: 'usr-admin', role: 'admin', tier: 'pastor', totpEnabled: true }}
          locale={locale}
          onClose={() => setShowAdminConsole(false)}
        />
      )}
    </div>
  );
}

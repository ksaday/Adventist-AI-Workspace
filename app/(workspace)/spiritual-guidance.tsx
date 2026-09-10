'use client';

/**
 * P3 Spiritual Guidance Workspace Component (PRD §4 / UX §6.2 / Template Library §5).
 *
 * Implements:
 * 1. Question intake with live character count & language switch.
 * 2. Pre-transmission safety screening (PR-P3-08).
 * 3. Denominational sensitivity detection & pastoral referral (PR-P3-06).
 * 4. Collapsible source-attachment panel with 4 kinds (PR-P3-03).
 * 5. Paste target disclaimer verbatim from UX §6.2.
 * 6. Live Bible canon & EGW catalogue validation on reference inputs.
 * 7. Enforced source block (8,000) and conversation (40,000) caps (SR-D2).
 * 8. Automatic switch to source-bounded mode with visible badge (PR-P3-04).
 * 9. Persistent non-professional disclaimer (PR-P3-07).
 * 10. Five-band answer viewer with Band 5 never minimised (PR-P3-05).
 */

import React, { useState, useMemo } from 'react';
import { t, type SupportedLocale } from '../../packages/i18n/src/index.js';
import { screenSafety, getEmergencyResources, type EmergencyResource } from '../../packages/safety/src/index.js';
import { detectBibleRefs } from '../../packages/citations/src/bible.js';
import { detectEgwCitations } from '../../packages/citations/src/egw.js';
import {
  type ClientSourceBlock,
  type SourceBlockKind,
  type FiveBandAnswer,
  createClientSourceBlock,
  validateBlockCap,
  validateConversationCap,
  MAX_BLOCK_CHAR_COUNT,
  MAX_CONVERSATION_CHAR_COUNT,
  detectDenominationalTopics,
  composeGuidancePrompt,
  parseFiveBandAnswer,
} from '../../packages/guidance/src/index.js';

export function SpiritualGuidanceWorkspace({
  locale = 'en',
}: {
  locale?: SupportedLocale;
}) {
  // State
  const [question, setQuestion] = useState('');
  const [sources, setSources] = useState<ClientSourceBlock[]>([]);
  const [isSourcePanelOpen, setIsSourcePanelOpen] = useState(false);
  const [activeSourceKind, setActiveSourceKind] = useState<SourceBlockKind>('pasted_text');

  // New source draft inputs
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [sourceError, setSourceError] = useState<string | null>(null);

  // Result & inspection state
  const [composedPrompt, setComposedPrompt] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [rawAnswerInput, setRawAnswerInput] = useState('');
  const [parsedAnswer, setParsedAnswer] = useState<FiveBandAnswer | null>(null);

  // 1. Safety check
  const riskMatches = useMemo(() => {
    if (!question.trim()) return [];
    return screenSafety(question, [locale === 'ko' ? 'ko' : 'en']);
  }, [question, locale]);

  const isSafe = riskMatches.length === 0;

  const emergencyResources = useMemo<EmergencyResource[]>(() => {
    if (isSafe) return [];
    return getEmergencyResources(riskMatches[0]?.category);
  }, [isSafe, riskMatches]);

  // 2. Denominational sensitivity detection
  const detectedTopics = useMemo(() => {
    const combined = `${question} ${sources.map(s => s.text).join(' ')}`;
    return detectDenominationalTopics(combined);
  }, [question, sources]);

  // 3. Live validation for Bible/EGW sources
  const liveBibleValidation = useMemo(() => {
    if (activeSourceKind !== 'bible_reference' || !sourceText.trim()) return null;
    const detected = detectBibleRefs(sourceText.trim());
    return detected.length > 0 ? detected[0] : null;
  }, [activeSourceKind, sourceText]);

  const liveEgwValidation = useMemo(() => {
    if (activeSourceKind !== 'egw_citation' || !sourceText.trim()) return null;
    const detected = detectEgwCitations(sourceText.trim());
    return detected.length > 0 ? detected[0] : null;
  }, [activeSourceKind, sourceText]);

  // Source caps
  const totalChars = sources.reduce((sum, s) => sum + s.charCount, 0);
  const isSourceBounded = sources.length > 0;

  // Add source block handler
  const handleAddSource = () => {
    setSourceError(null);
    if (!sourceText.trim()) {
      setSourceError('Please provide content for this source.');
      return;
    }

    const blockCheck = validateBlockCap(sourceText);
    if (!blockCheck.valid) {
      setSourceError(blockCheck.error ?? 'Block exceeds 8,000 characters.');
      return;
    }

    const convCheck = validateConversationCap(sources, sourceText.length);
    if (!convCheck.valid) {
      setSourceError(convCheck.error ?? 'Total conversation source text exceeds 40,000 characters.');
      return;
    }

    try {
      const defaultLabel =
        sourceLabel.trim() ||
        (activeSourceKind === 'bible_reference'
          ? `Scripture: ${sourceText.trim()}`
          : activeSourceKind === 'egw_citation'
          ? `EGW: ${sourceText.trim()}`
          : activeSourceKind === 'url'
          ? `URL: ${sourceText.trim()}`
          : `Source ${sources.length + 1}`);

      const newBlock = createClientSourceBlock({
        kind: activeSourceKind,
        label: defaultLabel,
        text: sourceText.trim(),
        attributedWorkId: liveEgwValidation?.workId,
        existingBlocks: sources,
      });

      setSources(prev => [...prev, newBlock]);
      setSourceLabel('');
      setSourceText('');
    } catch (err: unknown) {
      setSourceError((err as Error).message);
    }
  };

  const handleRemoveSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };

  // Prepare prompt handler
  const handlePreparePrompt = () => {
    if (!question.trim()) return;

    const out = composeGuidancePrompt({
      question: question.trim(),
      sources,
      locale: locale === 'ko' ? 'ko' : 'en',
      isCrisisFlagged: !isSafe,
    });

    setComposedPrompt(out.prompt);
    navigator.clipboard?.writeText(out.prompt).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 4000);
      },
      () => setCopySuccess(false)
    );
  };

  // Inspect / Parse answer handler
  const handleParseAnswer = () => {
    if (!rawAnswerInput.trim()) return;
    const parsed = parseFiveBandAnswer(rawAnswerInput);
    setParsedAnswer(parsed);
    setShowAnswerModal(false);
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header & Persistent Non-Professional Disclaimer (PR-P3-07) */}
      <header style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h1 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>
            {t('tool_spiritual_guidance', {}, { locale })}
          </h1>
          {isSourceBounded ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '0.3rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {t('p3_source_bounded_badge', {}, { locale })}
            </span>
          ) : (
            <span
              style={{
                backgroundColor: '#f8fafc',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                padding: '0.3rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
              }}
            >
              Standard Guidance Mode
            </span>
          )}
        </div>

        <p
          style={{
            margin: '0.75rem 0 0 0',
            fontSize: '0.825rem',
            color: '#64748b',
            lineHeight: 1.4,
            backgroundColor: '#f8fafc',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          {t('p3_disclaimer', {}, { locale })}
        </p>
      </header>

      {/* Safety Alert (PR-P3-08 / PR-SAF-01/02) */}
      {!isSafe && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#991b1b',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
            Personal Crisis Screening Alert
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            We noticed language indicating potential acute distress. If you or someone you know is struggling or in crisis, please connect with trained compassionate help immediately:
          </p>
          {emergencyResources.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              <strong>Available 24/7 Hotlines: </strong>
              {emergencyResources.map((h: EmergencyResource) => `${h.name}: ${h.contact}`).join(' | ')}
            </div>
          )}
        </div>
      )}

      {/* Denominational Sensitivity Notice (PR-P3-06) */}
      {detectedTopics.length > 0 && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            color: '#92400e',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️ {t('p3_denominational_clause_badge', {}, { locale })}:</span>
            <span>
              {detectedTopics
                .map(d => (locale === 'ko' ? d.nameKo : d.nameEn))
                .join(', ')}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: '#b45309' }}>
            {t('p3_pastor_referral', {}, { locale })}
          </p>
        </div>
      )}

      {/* Question Intake Box */}
      <section style={{ marginBottom: '1.5rem' }}>
        <label
          htmlFor="p3-question-input"
          style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}
        >
          {t('p3_question_label', {}, { locale })}
        </label>
        <textarea
          id="p3-question-input"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder={t('p3_question_placeholder', {}, { locale })}
          rows={5}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
          {question.length} characters
        </div>
      </section>

      {/* Expandable Source Attachment Panel (PR-P3-03 / UX §6.2) */}
      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          overflow: 'hidden',
          backgroundColor: '#fff',
        }}
      >
        <button
          type="button"
          onClick={() => setIsSourcePanelOpen(!isSourcePanelOpen)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            color: '#1e293b',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📎 {t('p3_add_sources', {}, { locale })}</span>
            {sources.length > 0 && (
              <span style={{ backgroundColor: '#2563eb', color: '#fff', borderRadius: '9999px', padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                {sources.length}
              </span>
            )}
          </span>
          <span>{isSourcePanelOpen ? '▲ Collapse' : '▼ Expand'}</span>
        </button>

        {isSourcePanelOpen && (
          <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0' }}>
            {/* Verbatim Paste Target Disclaimer Notice (UX §6.2) */}
            <div
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                fontSize: '0.8rem',
                color: '#334155',
                lineHeight: 1.45,
                whiteSpace: 'pre-line',
                marginBottom: '1rem',
              }}
            >
              {t('p3_source_paste_notice', {}, { locale })}
            </div>

            {/* Source Kind Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'pasted_text', label: 'Pasted passage' },
                  { id: 'bible_reference', label: 'Bible reference' },
                  { id: 'egw_citation', label: 'EGW citation' },
                  { id: 'url', label: 'URL' },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveSourceKind(tab.id);
                    setSourceError(null);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: activeSourceKind === tab.id ? 600 : 400,
                    border: '1px solid',
                    borderColor: activeSourceKind === tab.id ? '#2563eb' : '#cbd5e1',
                    backgroundColor: activeSourceKind === tab.id ? '#eff6ff' : '#fff',
                    color: activeSourceKind === tab.id ? '#1d4ed8' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Source Input Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                value={sourceLabel}
                onChange={e => setSourceLabel(e.target.value)}
                placeholder="Optional custom label (e.g. 'Desire of Ages chapter 25', 'Romans 8 passage')"
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                }}
              />

              <textarea
                value={sourceText}
                onChange={e => setSourceText(e.target.value)}
                placeholder={
                  activeSourceKind === 'bible_reference'
                    ? 'Enter Bible reference (e.g. John 3:16, Romans 8:26-28)'
                    : activeSourceKind === 'egw_citation'
                    ? 'Enter EGW citation (e.g. DA 123, Steps to Christ p. 45)'
                    : activeSourceKind === 'url'
                    ? 'Enter source URL (e.g. https://whiteestate.org/...)'
                    : 'Paste the source passage here (max 8,000 characters)...'
                }
                rows={activeSourceKind === 'pasted_text' ? 4 : 2}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />

              {/* Live Bible Validation feedback */}
              {liveBibleValidation && (
                <div style={{ fontSize: '0.8rem', color: liveBibleValidation.status === 'VALID' ? '#15803d' : '#b91c1c' }}>
                  {liveBibleValidation.status === 'VALID'
                    ? `✓ Valid Scripture reference: ${locale === 'ko' ? liveBibleValidation.canonicalLocalised : liveBibleValidation.canonicalEn}`
                    : `✗ Invalid Scripture reference: ${liveBibleValidation.status}`}
                </div>
              )}

              {/* Live EGW Validation feedback */}
              {liveEgwValidation && (
                <div style={{ fontSize: '0.8rem', color: liveEgwValidation.status !== 'TITLE_NOT_IN_CATALOGUE' ? '#15803d' : '#b91c1c' }}>
                  {liveEgwValidation.status !== 'TITLE_NOT_IN_CATALOGUE'
                    ? `✓ Valid catalogue work: ${liveEgwValidation.canonicalTitle} (${liveEgwValidation.status})`
                    : `✗ Title not found in catalogue. Suggestion: ${liveEgwValidation.suggestion ?? 'none'}`}
                </div>
              )}

              {sourceError && (
                <div style={{ color: '#b91c1c', fontSize: '0.8rem' }}>{sourceError}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Block length: {sourceText.length} / {MAX_BLOCK_CHAR_COUNT} chars | Total:{' '}
                  {totalChars + sourceText.length} / {MAX_CONVERSATION_CHAR_COUNT} chars
                </span>
                <button
                  type="button"
                  onClick={handleAddSource}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    padding: '0.4rem 0.85rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Add Source Block
                </button>
              </div>
            </div>

            {/* Attached Sources List */}
            {sources.length > 0 && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                  Attached Source Blocks ({sources.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {sources.map((s, idx) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div>
                        <strong>
                          [{idx + 1}] {s.label}
                        </strong>{' '}
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          ({s.kind}, {s.charCount} chars)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSource(s.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Action Buttons */}
      <section style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={handlePreparePrompt}
          disabled={!question.trim() || !isSafe}
          style={{
            flex: 1,
            minWidth: '200px',
            backgroundColor: question.trim() && isSafe ? '#2563eb' : '#94a3b8',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.25rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: question.trim() && isSafe ? 'pointer' : 'not-allowed',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>{t('compose_button', {}, { locale })}</span>
          {copySuccess && <span style={{ fontSize: '0.8rem', color: '#bbf7d0' }}>(Copied to clipboard!)</span>}
        </button>

        <button
          type="button"
          onClick={() => setShowAnswerModal(true)}
          style={{
            backgroundColor: '#fff',
            color: '#1e293b',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.75rem 1.25rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('paste_answer', {}, { locale })}
        </button>
      </section>

      {/* Answer Input Modal */}
      {showAnswerModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              maxWidth: '640px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Inspect External AI Answer</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              Paste the external AI response below. It will be segmented into the five structured bands.
            </p>
            <textarea
              value={rawAnswerInput}
              onChange={e => setRawAnswerInput(e.target.value)}
              placeholder="Paste the full reply from your AI session here..."
              rows={10}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowAnswerModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParseAnswer}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Segment into 5 Bands
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Composed Prompt Preview */}
      {composedPrompt && (
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Composed Prompt Preview</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {composedPrompt.length} characters
            </span>
          </div>
          <pre
            style={{
              fontSize: '0.8rem',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '0.75rem',
              overflowX: 'auto',
              maxHeight: '260px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {composedPrompt}
          </pre>
        </section>
      )}

      {/* Five-Band Answer Display (PR-P3-02 / PR-P3-05) */}
      {parsedAnswer && (
        <section
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            backgroundColor: '#fff',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#f1f5f9',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <strong style={{ fontSize: '0.95rem' }}>Structured Five-Band Answer</strong>
            <button
              type="button"
              onClick={() => setParsedAnswer(null)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Clear
            </button>
          </div>

          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Band 1: What You Have Told Me */}
            <div style={{ borderLeft: '4px solid #64748b', paddingLeft: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                1. {t('p3_band1_title', {}, { locale })}
              </div>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {parsedAnswer.band1UserSituation || '—'}
              </p>
            </div>

            {/* Band 2: Scripture */}
            <div style={{ borderLeft: '4px solid #0284c7', paddingLeft: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                2. {t('p3_band2_title', {}, { locale })}
              </div>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {parsedAnswer.band2Scripture || '—'}
              </p>
            </div>

            {/* Band 3: Ellen G. White */}
            <div style={{ borderLeft: '4px solid #d97706', paddingLeft: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
                3. {t('p3_band3_title', {}, { locale })}
              </div>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {parsedAnswer.band3Egw || '—'}
              </p>
            </div>

            {/* Band 4: Reflection */}
            <div style={{ borderLeft: '4px solid #4f46e5', paddingLeft: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>
                4. {t('p3_band4_title', {}, { locale })}
              </div>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {parsedAnswer.band4Reflection || '—'}
              </p>
            </div>

            {/* Band 5: What Remains Uncertain (PR-P3-05: NEVER visually minimised or collapsed) */}
            <div
              style={{
                borderLeft: '4px solid #9333ea',
                paddingLeft: '0.75rem',
                backgroundColor: '#faf5ff',
                padding: '0.75rem',
                borderRadius: '0 6px 6px 0',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#9333ea', textTransform: 'uppercase' }}>
                5. {t('p3_band5_title', {}, { locale })}
              </div>
              {parsedAnswer.missingBand5 ? (
                <div style={{ color: '#b91c1c', fontSize: '0.85rem', marginTop: '0.35rem', fontWeight: 500 }}>
                  ⚠️ {t('p3_band5_required_warning', {}, { locale })}
                </div>
              ) : (
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                  {parsedAnswer.band5Uncertain}
                </p>
              )}
            </div>

            {/* Parsed Claims Block */}
            {parsedAnswer.parsedClaims && parsedAnswer.parsedClaims.length > 0 && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>
                  Extracted Claims (SDAWS-CLAIMS-V1):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {parsedAnswer.parsedClaims.map(c => (
                    <div
                      key={c.id}
                      style={{
                        fontSize: '0.8rem',
                        backgroundColor: '#f8fafc',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '4px',
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'baseline',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#2563eb' }}>{c.id}</span>
                      <span style={{ color: '#64748b' }}>[{c.type}]</span>
                      <span style={{ flex: 1 }}>{c.text}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Source: {c.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

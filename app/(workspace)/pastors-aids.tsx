'use client';

/**
 * P4 Pastor's Aids Workspace Component (PRD §5 / UX §6.3 / Template Library §6).
 *
 * Implements:
 * 1. Parameters panel with live anchor-passage validation (PR-P4-03, PR-P4-04).
 * 2. 12 ministry and homiletic task types (PR-P4-02).
 * 3. EGW leads only directive — never text (PR-P4-05).
 * 4. Structured, editable outline workspace (PR-P4-06).
 * 5. Pre-pulpit Citation Checklist blocking verbatim quotations below E4 (PR-P4-09).
 * 6. Multi-format export: Markdown, plain text, print-friendly HTML (PR-P4-07).
 * 7. Zero file upload capability (PR-P4-01).
 */

import React, { useState, useMemo } from 'react';
import { t, type SupportedLocale } from '../../packages/i18n/src/index.js';
import { detectBibleRefs } from '../../packages/citations/src/bible.js';
import {
  type HomileticParameters,
  type PastorTaskType,
  type StructuredOutline,
  type ChecklistCitation,
  composePastorPrompt,
  parseStructuredOutline,
  evaluateChecklist,
  attestCitation,
  paraphraseCitation,
  toggleVerbatimQuotation,
  exportToMarkdown,
  exportToPlainText,
  exportToPrintHtml,
} from '../../packages/pastor/src/index.js';

export function PastorsAidsWorkspace({
  locale = 'en',
  userPlan = 'pastor', // 'free' | 'member' | 'pastor'
  userName = 'Pastor John',
}: {
  locale?: SupportedLocale;
  userPlan?: 'free' | 'member' | 'pastor';
  userName?: string;
}) {
  const isKo = locale === 'ko';

  // Task & Parameters state
  const [task, setTask] = useState<PastorTaskType>('sermon_outline');
  const [topic, setTopic] = useState('Trusting God through loss');
  const [anchorPassage, setAnchorPassage] = useState('Romans 5:1-5');
  const [occasion, setOccasion] = useState('Sabbath worship');
  const [audience, setAudience] = useState('Mixed congregation');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [pointCount, setPointCount] = useState(3);
  const [homileticForm, setHomileticForm] = useState<'expository' | 'textual' | 'topical' | 'narrative'>('expository');
  const [tone, setTone] = useState<'pastoral' | 'evangelistic' | 'pedagogical' | 'encouraging' | 'prophetic'>('pastoral');
  const [depth, setDepth] = useState<'introductory' | 'congregational' | 'theological'>('congregational');
  const [bibleEmphasis, setBibleEmphasis] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [egwEmphasis, setEgwEmphasis] = useState<'none' | 'light' | 'moderate'>('light');
  const [outlineFormat, setOutlineFormat] = useState<'points_and_subpoints' | 'decimal' | 'narrative_movement' | 'qa'>('points_and_subpoints');
  const [preferredTranslation, setPreferredTranslation] = useState(isKo ? '개역개정' : 'NKJV');
  const [userNotes, setUserNotes] = useState('');

  // Outline & Checklist state
  const [outline, setOutline] = useState<StructuredOutline | null>(null);
  const [rawPasteInput, setRawPasteInput] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [composedPrompt, setComposedPrompt] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Export modal state
  const [exportModalFormat, setExportModalFormat] = useState<'markdown' | 'text' | 'html' | null>(null);

  // 1. Live Bible canon validation for anchor passage
  const anchorValidation = useMemo(() => {
    if (!anchorPassage.trim()) return null;
    const detected = detectBibleRefs(anchorPassage.trim());
    return detected.length > 0 ? detected[0] : null;
  }, [anchorPassage]);

  // Checklist evaluation
  const checklistEvaluation = useMemo(() => {
    if (!outline) return null;
    return evaluateChecklist(outline.citations);
  }, [outline]);

  // Parameters object
  const currentParams: HomileticParameters = {
    topic,
    anchorPassage,
    occasion,
    audience,
    durationMinutes,
    pointCount,
    homileticForm,
    tone,
    depth,
    bibleEmphasis,
    egwEmphasis,
    outlineFormat,
    preferredTranslation,
    locale: isKo ? 'ko' : 'en',
  };

  // Compose Prompt
  const handleComposePrompt = () => {
    const out = composePastorPrompt({
      task,
      parameters: currentParams,
      userNotes,
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

  // Parse Pasted Outline
  const handleParseOutline = () => {
    if (!rawPasteInput.trim()) return;
    const parsed = parseStructuredOutline(rawPasteInput, topic);
    setOutline(parsed);
    setShowPasteModal(false);
  };

  // Checklist Handlers
  const handleAttestCitation = (citationId: string) => {
    if (!outline) return;
    const updated = attestCitation(outline.citations, citationId, userName);
    setOutline({ ...outline, citations: updated });
  };

  const handleParaphraseCitation = (citationId: string) => {
    if (!outline) return;
    const updated = paraphraseCitation(outline.citations, citationId);
    setOutline({ ...outline, citations: updated });
  };

  const handleToggleVerbatim = (citationId: string) => {
    if (!outline) return;
    const updated = toggleVerbatimQuotation(outline.citations, citationId);
    setOutline({ ...outline, citations: updated });
  };

  const handleMarkReady = () => {
    if (!outline || !checklistEvaluation?.isReady) return;
    setOutline({ ...outline, readyToPreach: true });
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header & PR-P4-04 Theological Disclaimer */}
      <header style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h1 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>
            {t('p4_title', {}, { locale })}
          </h1>
          <span
            style={{
              backgroundColor: '#f1f5f9',
              color: '#334155',
              padding: '0.3rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Pastor & Ministry Suite ᴾ
          </span>
        </div>

        <p
          style={{
            margin: '0.75rem 0 0 0',
            fontSize: '0.825rem',
            color: '#475569',
            backgroundColor: '#f8fafc',
            padding: '0.65rem 0.85rem',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            lineHeight: 1.4,
          }}
        >
          ⓘ {t('p4_disclaimer', {}, { locale })}
        </p>
      </header>

      {/* Parameter Panel (PR-P4-03 / UX §6.3) */}
      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '1.25rem',
          backgroundColor: '#fff',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <h2 style={{ fontSize: '1.05rem', margin: '0 0 1rem 0', fontWeight: 600, color: '#1e293b' }}>
          Homiletic & Study Parameters
        </h2>

        {/* Task Type Selector */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            {t('p4_task_label', {}, { locale })}
          </label>
          <select
            value={task}
            onChange={e => setTask(e.target.value as PastorTaskType)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              backgroundColor: '#fff',
            }}
          >
            <option value="sermon_outline">1. Sermon Outline Preparation (Structured outline, thesis, points)</option>
            <option value="sermon_topic_explore">2. Sermon Topic Exploration (Angles, tensions, motifs)</option>
            <option value="bible_passage_discover">3. Scripture Passage Discovery (Passage candidates for topic)</option>
            <option value="egw_reference_discovery">4. EGW Reference Discovery (Leads only to study, never text)</option>
            <option value="sermon_points">5. Sermon Points & Sub-Points Generation</option>
            <option value="biblestudy_outline">6. Bible Study Outline (Observation, Interpretation, Application)</option>
            <option value="devotional_outline">7. Short-Form Devotional Outline</option>
            <option value="discussion_questions">8. Small-Group Discussion Questions</option>
            <option value="thematic_comparison">9. Thematic Comparison Across Scripture</option>
            <option value="application_ideas">10. Practical Application for Target Audience</option>
            <option value="sermon_refinement">11. Sermon Refinement & Tightening</option>
            <option value="source_verification">12. Pre-Pulpit Source Verification</option>
          </select>
        </div>

        {/* Topic & Anchor Passage Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              {t('p4_topic_label', {}, { locale })}
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Trusting God through loss, The Investigative Judgment"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              {t('p4_anchor_label', {}, { locale })}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={anchorPassage}
                onChange={e => setAnchorPassage(e.target.value)}
                placeholder="e.g. Romans 5:1-5, Daniel 8:14"
                style={{
                  width: '100%',
                  padding: '0.5rem 2rem 0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: anchorValidation?.status === 'VALID' ? '#22c55e' : '#cbd5e1',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
              {anchorValidation?.status === 'VALID' && (
                <span
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#15803d',
                    fontWeight: 'bold',
                  }}
                  title="Canonical passage validated"
                >
                  ✓
                </span>
              )}
            </div>
            {anchorValidation && (
              <span style={{ fontSize: '0.75rem', color: anchorValidation.status === 'VALID' ? '#15803d' : '#b91c1c' }}>
                {anchorValidation.status === 'VALID'
                  ? `Validated: ${isKo ? anchorValidation.canonicalLocalised : anchorValidation.canonicalEn}`
                  : `Invalid reference: ${anchorValidation.status}`}
              </span>
            )}
          </div>
        </div>

        {/* Detailed Parameters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Occasion</label>
            <select
              value={occasion}
              onChange={e => setOccasion(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="Sabbath worship">Sabbath worship</option>
              <option value="Evangelistic series">Evangelistic series</option>
              <option value="Midweek prayer">Midweek prayer</option>
              <option value="Communion service">Communion service</option>
              <option value="Youth Sabbath">Youth Sabbath</option>
              <option value="Funeral">Funeral</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Audience</label>
            <select
              value={audience}
              onChange={e => setAudience(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="Mixed congregation">Mixed congregation</option>
              <option value="Seekers / visitors">Seekers / visitors</option>
              <option value="Youth / Young adults">Youth / Young adults</option>
              <option value="Seasoned believers">Seasoned believers</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Duration</label>
            <select
              value={durationMinutes}
              onChange={e => setDurationMinutes(Number(e.target.value))}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value={15}>15 min (Devotional)</option>
              <option value={20}>20 min</option>
              <option value={30}>30 min (Standard)</option>
              <option value={45}>45 min</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Main Points</label>
            <select
              value={pointCount}
              onChange={e => setPointCount(Number(e.target.value))}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value={1}>1 Point</option>
              <option value={2}>2 Points</option>
              <option value={3}>3 Points</option>
              <option value={4}>4 Points</option>
              <option value={5}>5 Points</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Homiletic Form</label>
            <select
              value={homileticForm}
              onChange={e => setHomileticForm(e.target.value as any)}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="expository">Expository</option>
              <option value="textual">Textual</option>
              <option value="topical">Topical</option>
              <option value="narrative">Narrative</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>EGW Emphasis (Leads only)</label>
            <select
              value={egwEmphasis}
              onChange={e => setEgwEmphasis(e.target.value as any)}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="none">None</option>
              <option value="light">Light (1-2 leads)</option>
              <option value="moderate">Moderate (Leads only)</option>
            </select>
          </div>
        </div>

        {/* EGW Leads Notice */}
        {egwEmphasis !== 'none' && (
          <div style={{ fontSize: '0.78rem', color: '#0369a1', backgroundColor: '#f0f9ff', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
            ℹ {t('p4_egw_leads_note', {}, { locale })}
          </div>
        )}

        {/* Actions Grid */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleComposePrompt}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>Prepare a prompt →</span>
            {copySuccess && <span style={{ fontSize: '0.8rem', color: '#bbf7d0' }}>(Copied!)</span>}
          </button>

          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            style={{
              backgroundColor: '#fff',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Paste AI Outline ▾
          </button>
        </div>
      </section>

      {/* Composed Prompt Preview */}
      {composedPrompt && (
        <section style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Prepared External AI Prompt</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{composedPrompt.length} chars</span>
          </div>
          <pre style={{ fontSize: '0.8rem', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
            {composedPrompt}
          </pre>
        </section>
      )}

      {/* Structured Outline Workspace (PR-P4-06) */}
      {outline && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
          <section
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              backgroundColor: '#fff',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <div>
                <input
                  type="text"
                  value={outline.title}
                  onChange={e => setOutline({ ...outline, title: e.target.value })}
                  style={{ fontSize: '1.4rem', fontWeight: 700, border: 'none', borderBottom: '1px dashed #cbd5e1', width: '100%', marginBottom: '0.35rem', padding: '0.2rem 0' }}
                />
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  <strong>Anchor Passage: </strong>
                  <input
                    type="text"
                    value={outline.anchorPassage}
                    onChange={e => setOutline({ ...outline, anchorPassage: e.target.value })}
                    style={{ border: 'none', borderBottom: '1px dashed #cbd5e1', fontSize: '0.85rem', color: '#2563eb', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setExportModalFormat('markdown')}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Export Outline ▾
                </button>
              </div>
            </div>

            {/* Thesis */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Thesis Statement (One Sentence)
              </label>
              <textarea
                value={outline.thesis}
                onChange={e => setOutline({ ...outline, thesis: e.target.value })}
                rows={2}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            {/* Introduction Approach */}
            {outline.introductionApproach && (
              <div style={{ marginBottom: '1.25rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Introduction Approach
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e293b' }}>{outline.introductionApproach}</p>
              </div>
            )}

            {/* Points List */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Main Outline Points ({outline.points.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {outline.points.map((pt, idx) => (
                  <div
                    key={pt.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1rem',
                      backgroundColor: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.95rem' }}>
                        Point {idx + 1}: {pt.pointText}
                      </strong>
                      {pt.supportingPassage && (
                        <span style={{ fontSize: '0.8rem', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                          {pt.supportingPassage}
                        </span>
                      )}
                    </div>

                    {pt.subPoints.length > 0 && (
                      <ul style={{ margin: '0 0 0.5rem 0', paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#334155' }}>
                        {pt.subPoints.map((sp, sIdx) => (
                          <li key={sIdx} style={{ marginBottom: '0.25rem' }}>{sp}</li>
                        ))}
                      </ul>
                    )}

                    {pt.illustrationPlaceholder && (
                      <div style={{ backgroundColor: '#fffbeb', borderLeft: '3px solid #f59e0b', padding: '0.4rem 0.65rem', fontSize: '0.8rem', color: '#92400e' }}>
                        <strong>Illustration Guide: </strong>{pt.illustrationPlaceholder}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Closing Appeal */}
            {outline.closingAppeal && (
              <div style={{ marginBottom: '1rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Closing Appeal Approach
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e293b' }}>{outline.closingAppeal}</p>
              </div>
            )}
          </section>

          {/* Pre-Pulpit Citation Checklist (PR-P4-09 / UX §6.3) */}
          <section
            style={{
              border: '1px solid',
              borderColor: checklistEvaluation?.isReady ? '#86efac' : '#fca5a5',
              borderRadius: '10px',
              backgroundColor: '#fff',
              padding: '1.25rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {t('p4_checklist_title', {}, { locale })}
              </h3>
              {outline.readyToPreach ? (
                <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 700 }}>
                  {t('p4_ready_badge', {}, { locale })}
                </span>
              ) : checklistEvaluation?.isReady ? (
                <button
                  type="button"
                  onClick={handleMarkReady}
                  style={{ backgroundColor: '#15803d', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.85rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {t('p4_mark_ready', {}, { locale })}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  style={{ backgroundColor: '#94a3b8', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.85rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'not-allowed' }}
                >
                  {t('p4_mark_ready', {}, { locale })} (Blocked ✗)
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem 0' }}>
              Before preaching: Any citation marked for verbatim quotation must be personally confirmed at an official source (E4).
            </p>

            {/* Blocking Warning Banner */}
            {!checklistEvaluation?.isReady && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.65rem 0.85rem', fontSize: '0.85rem', color: '#991b1b', marginBottom: '1rem' }}>
                ⚠ <strong>{checklistEvaluation?.blockingCount}</strong> {t('p4_checklist_blocking_warning', {}, { locale })}
              </div>
            )}

            {/* Citations Checklist Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {outline.citations.map(c => {
                const isBlocked = c.markedForVerbatimQuotation && c.evidenceLevel !== 'E4';
                return (
                  <div
                    key={c.id}
                    style={{
                      border: '1px solid',
                      borderColor: isBlocked ? '#fca5a5' : '#e2e8f0',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      backgroundColor: isBlocked ? '#fff5f5' : '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>● {c.reference}</span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: c.evidenceLevel === 'E4' ? '#dcfce7' : '#e2e8f0',
                            color: c.evidenceLevel === 'E4' ? '#15803d' : '#334155',
                          }}
                        >
                          {c.evidenceLevel}
                        </span>
                        {c.evidenceLevel === 'E4' && c.confirmedBy && (
                          <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                            (confirmed by {c.confirmedBy})
                          </span>
                        )}
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={c.markedForVerbatimQuotation}
                          onChange={() => handleToggleVerbatim(c.id)}
                        />
                        Mark for direct verbatim quotation
                      </label>
                    </div>

                    {/* Blocker Action Bar */}
                    {isBlocked && (
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#b91c1c' }}>
                          ⚠ Consistency is not confirmation. Open source to finish confirmation or paraphrase.
                        </span>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {c.officialUrl && (
                            <a
                              href={c.officialUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', color: '#0369a1', textDecoration: 'none' }}
                            >
                              Open Source
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAttestCitation(c.id)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: '#15803d', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                          >
                            I&apos;ve checked it (Attest E4)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleParaphraseCitation(c.id)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', cursor: 'pointer' }}
                          >
                            Paraphrase
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Paste External AI Outline Modal */}
      {showPasteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', maxWidth: '640px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Paste AI Sermon Outline</h2>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>
              Paste the outline reply from your AI session. It will be parsed into editable objects.
            </p>
            <textarea
              value={rawPasteInput}
              onChange={e => setRawPasteInput(e.target.value)}
              placeholder="Paste the sermon outline here..."
              rows={12}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParseOutline}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Assemble Structured Outline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModalFormat && outline && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', maxWidth: '720px', width: '100%', padding: '1.5rem', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Export Sermon Outline</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setExportModalFormat('markdown')}
                  style={{ padding: '0.35rem 0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: exportModalFormat === 'markdown' ? '#eff6ff' : '#fff', fontWeight: exportModalFormat === 'markdown' ? 700 : 400, cursor: 'pointer' }}
                >
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={() => setExportModalFormat('text')}
                  style={{ padding: '0.35rem 0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: exportModalFormat === 'text' ? '#eff6ff' : '#fff', fontWeight: exportModalFormat === 'text' ? 700 : 400, cursor: 'pointer' }}
                >
                  Plain Text
                </button>
                <button
                  type="button"
                  onClick={() => setExportModalFormat('html')}
                  style={{ padding: '0.35rem 0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: exportModalFormat === 'html' ? '#eff6ff' : '#fff', fontWeight: exportModalFormat === 'html' ? 700 : 400, cursor: 'pointer' }}
                >
                  Printable HTML
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
              <textarea
                readOnly
                value={
                  exportModalFormat === 'markdown'
                    ? exportToMarkdown(outline)
                    : exportModalFormat === 'text'
                    ? exportToPlainText(outline)
                    : exportToPrintHtml(outline)
                }
                rows={15}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.8rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setExportModalFormat(null)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const content =
                    exportModalFormat === 'markdown'
                      ? exportToMarkdown(outline)
                      : exportModalFormat === 'text'
                      ? exportToPlainText(outline)
                      : exportToPrintHtml(outline);
                  navigator.clipboard?.writeText(content);
                }}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

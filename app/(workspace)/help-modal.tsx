'use client';

import React, { useState } from 'react';
import type { SupportedLocale } from '../../packages/i18n/src/index.js';

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: SupportedLocale;
}

export function HelpModal({ isOpen, onClose, locale = 'en' }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'levels' | 'sources' | 'faq' | 'legal'>('levels');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          width: '100%',
          maxWidth: '750px',
          maxHeight: '85vh',
          borderRadius: '8px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-color, #e2e8f0)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 id="help-dialog-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            📖 Help & Documentation
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help modal"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            padding: '0 1rem',
            gap: '0.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('levels')}
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'levels' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'levels' ? '#2563eb' : 'inherit',
              fontWeight: activeTab === 'levels' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Evidence Levels
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'sources' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'sources' ? '#2563eb' : 'inherit',
              fontWeight: activeTab === 'sources' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Finding Sources
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'faq' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'faq' ? '#2563eb' : 'inherit',
              fontWeight: activeTab === 'faq' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            FAQ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('legal')}
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'legal' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'legal' ? '#2563eb' : 'inherit',
              fontWeight: activeTab === 'legal' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Legal & Disclosures
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, fontSize: '0.925rem', lineHeight: '1.6' }}>
          {activeTab === 'levels' && (
            <div>
              <h3 style={{ marginTop: 0 }}>The Five Evidence Levels (E0–E4)</h3>
              <p>
                In SDA AI Workspace, assertions made by AI models are never automatically considered verified.
                Claims sit on a strict five-level ladder:
              </p>
              <ul style={{ paddingLeft: '1.25rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>E0 (UNTESTED):</strong> Extracted proposition not yet checked against catalog indexes.
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>E1 (UNVERIFIED_RECALL):</strong> Direct recall from an external AI model. Stored as NOT_VERIFIED.
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>E2 (MODEL_CONCORDANCE):</strong> Multiple AI models agree. Note: Agreement is not proof of truth.
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>E3 (TEXT_CONSISTENT):</strong> The proposition is consistent with source material you supplied in this browser session. Displayed in <em>blue</em> and never in green.
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>E4 (VERIFIED):</strong> Personally confirmed by you against an active, official primary reader (e.g. egwwritings.org). Displayed in <strong>green</strong> with the badge <em>Confirmed by you</em>.
                </li>
              </ul>
              <div style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6', padding: '0.75rem', marginTop: '1rem' }}>
                <strong>Important Rule (Invariant 3):</strong> Only E4 may ever be shown as verified or in green. E3 represents consistency with unestablished text, not official verification.
              </div>
            </div>
          )}

          {activeTab === 'sources' && (
            <div>
              <h3 style={{ marginTop: 0 }}>How to Verify Sources</h3>
              <p>
                We connect you directly to official primary readers. We do not collect, ingest, host, index, or hold Ellen G. White text as a source on our server.
              </p>
              <h4>Supported Official Platforms:</h4>
              <ul>
                <li><strong>Ellen G. White Writings:</strong> <code>https://egwwritings.org/read/...</code></li>
                <li><strong>General Conference Archives:</strong> <code>https://documents.adventistarchives.org/Periodicals/...</code></li>
              </ul>
              <h4>Why bare homepages are rejected:</h4>
              <p>
                Submitting a homepage (e.g. <code>egwwritings.org</code>) or search query URL will be rejected. An attestation requires the deep URL of the actual paragraph you inspected in context.
              </p>
            </div>
          )}

          {activeTab === 'faq' && (
            <div>
              <h3 style={{ marginTop: 0 }}>Frequently Asked Questions</h3>
              <p><strong>Why is there a $0.00 AI invoice?</strong></p>
              <p>Our server never calls a model. Inference happens in your own external AI subscriptions (ChatGPT, Claude, Gemini) or via local browser drafting.</p>

              <p><strong>Does our server store my source text?</strong></p>
              <p>No. Member-supplied source text never reaches our server. It remains exclusively in your browser memory.</p>

              <p><strong>What is Ephemeral Mode?</strong></p>
              <p>In Ephemeral Mode, message bodies and burdens are never written to database storage, ensuring absolute confidentiality for sensitive prayer requests.</p>
            </div>
          )}

          {activeTab === 'legal' && (
            <div>
              <h3 style={{ marginTop: 0 }}>Legal Policies & Disclosures</h3>
              <ul>
                <li><strong>Independence Disclaimer:</strong> SDA AI Workspace is an independent project and is not officially affiliated with, sponsored by, or endorsed by the General Conference of Seventh-day Adventists or the Ellen G. White Estate, Inc.</li>
                <li><strong>AI Disclosure:</strong> AI models are non-spiritual statistical tools prone to fabrication. Pastoral leaders remain strictly responsible for all material preached.</li>
                <li><strong>Privacy Architecture:</strong> Built on per-user envelope encryption with ordered cryptographic erasure upon account deletion.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--accent-primary, #2563eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

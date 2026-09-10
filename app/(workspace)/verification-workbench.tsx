/**
 * Source Verification Workbench (SR-6 / SR-7 / Verification Architecture §3, §5, §8, §11).
 *
 * Invariants:
 * 1. ONLY E4 is rendered as VERIFIED or in green (mayAssertOfficialVerification).
 * 2. Mandatory pairing: Status badge and Evidence level chip always rendered together.
 * 3. E4 always shows adjacent confirming person and date ("confirmed by you, <date>").
 * 4. Deterministic validator findings render before any AI action.
 * 5. Three-column honesty contract accessible directly.
 * 6. Zero server-side source text.
 */

'use client';

import React, { useState } from 'react';
import {
  mayAssertOfficialVerification,
  canonicalizeAndValidateAttestedUrl,
  defaultSourceDirectory,
  type EvidenceLevel,
  type ClaimStatus,
  type ClaimRecord,
  type AttestationOutcome,
  type SourceDirectoryEntryRevision,
} from '../../packages/evidence/src/index.js';
import { detectBibleRefs } from '../../packages/citations/src/bible.js';
import { detectEgwCitations } from '../../packages/citations/src/egw.js';
import { t, type Locale } from '../../packages/i18n/src/index.js';

export interface VerificationWorkbenchProps {
  locale?: Locale;
  claims: ClaimRecord[];
  originConversationId?: string | null;
  originConversationTitle?: string;
  originTombstone?: { title?: string; app?: string; deletedAt: string } | null;
  currentUserId: string;
  onAttestClaim?: (claimId: string, outcome: AttestationOutcome, rawUrl: string, note?: string) => Promise<void>;
  onCopyVerificationPrompt?: () => void;
  onOpenVerificationAi?: (provider: string) => void;
  onBackToOrigin?: () => void;
}

export function VerificationWorkbench({
  locale = 'en',
  claims: initialClaims,
  originConversationId,
  originConversationTitle,
  originTombstone,
  currentUserId,
  onAttestClaim,
  onCopyVerificationPrompt,
  onOpenVerificationAi,
  onBackToOrigin,
}: VerificationWorkbenchProps) {
  const [claims, setClaims] = useState<ClaimRecord[]>(initialClaims);
  const [selectedProvider, setSelectedProvider] = useState('ChatGPT');
  const [showHonestyContract, setShowHonestyContract] = useState(false);
  const [attestingClaim, setAttestingClaim] = useState<ClaimRecord | null>(null);

  // Attestation modal state
  const [attestOutcome, setAttestOutcome] = useState<AttestationOutcome>('found_correct');
  const [attestUrl, setAttestUrl] = useState('');
  const [attestNote, setAttestNote] = useState('');
  const [attestError, setAttestError] = useState<string | null>(null);

  // Deterministic checks run immediately (Verification Architecture §5)
  const evaluatedClaims = claims.map(claim => {
    let deterministicResult: { valid: boolean; message: string; suggestion?: string } | null = null;
    if (claim.claimType === 'scripture' && claim.assertedSource) {
      const refs = detectBibleRefs(claim.assertedSource);
      const res = refs[0];
      if (res && res.status === 'VALID') {
        deterministicResult = { valid: true, message: t('verify_deterministic_valid', {}, { locale }) };
      } else if (res && res.status === 'BOOK_UNKNOWN') {
        deterministicResult = { valid: false, message: t('verify_deterministic_unknown_book', {}, { locale }) };
      } else if (res) {
        deterministicResult = { valid: false, message: t('verify_deterministic_verse_out_of_range', {}, { locale }) };
      }
    } else if (claim.claimType === 'egw' && claim.assertedSource) {
      const hits = detectEgwCitations(claim.assertedSource);
      const res = hits[0];
      if (res && (res.status === 'TITLE_MATCHED' || res.status === 'ABBREVIATION_MATCHED')) {
        deterministicResult = { valid: true, message: t('verify_deterministic_valid', {}, { locale }) };
      } else if (res && res.status === 'TITLE_NOT_IN_CATALOGUE') {
        deterministicResult = {
          valid: false,
          message: t('verify_deterministic_not_in_catalogue', {}, { locale }),
          suggestion: res.suggestion,
        };
      } else if (res && res.status === 'PAGE_IMPLAUSIBLE') {
        deterministicResult = { valid: false, message: t('verify_deterministic_page_implausible', {}, { locale }) };
      }
    }
    return { claim, deterministicResult };
  });

  const activeEgwRevision = defaultSourceDirectory.getCurrentRevision('egw_library_read');

  // Handle attestation submission
  const handleRecordAttestation = async () => {
    if (!attestingClaim) return;
    setAttestError(null);

    if (!activeEgwRevision) {
      setAttestError('No active source directory revision available.');
      return;
    }

    // Validate URL live
    const urlValidation = canonicalizeAndValidateAttestedUrl(attestUrl.trim(), activeEgwRevision);
    if (!urlValidation.ok) {
      setAttestError(`${urlValidation.error} (${urlValidation.reasonCode})`);
      return;
    }

    try {
      if (onAttestClaim) {
        await onAttestClaim(attestingClaim.id, attestOutcome, attestUrl.trim(), attestNote.trim() || undefined);
      }

      // Update local state
      let newStatus: ClaimStatus = 'VERIFIED';
      if (attestOutcome === 'found_details_differ') newStatus = 'PARTIALLY_VERIFIED';
      if (attestOutcome === 'not_found') newStatus = 'INSUFFICIENT_EVIDENCE';
      if (attestOutcome === 'contradicted') newStatus = 'CONTRADICTED';

      setClaims(prev =>
        prev.map(c =>
          c.id === attestingClaim.id
            ? {
                ...c,
                status: newStatus,
                evidenceLevel: 'E4' as EvidenceLevel,
                confirmingPerson: 'you',
                attestedAt: new Date().toISOString().split('T')[0],
              }
            : c
        )
      );

      // Close modal
      setAttestingClaim(null);
      setAttestUrl('');
      setAttestNote('');
    } catch (err) {
      setAttestError((err as Error).message);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 font-sans">
      {/* Origin link or tombstone */}
      <div className="flex justify-between items-center text-sm border-b pb-3">
        {originTombstone ? (
          <div className="text-amber-800 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
            {t('verify_origin_tombstone', { date: originTombstone.deletedAt.split('T')[0] }, { locale })}
          </div>
        ) : originConversationId ? (
          <button
            onClick={onBackToOrigin}
            className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            {t('verify_back_to_origin', {}, { locale })}
            {originConversationTitle && <span className="text-gray-500">({originConversationTitle})</span>}
          </button>
        ) : (
          <span />
        )}

        <button
          onClick={() => setShowHonestyContract(true)}
          className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full border border-slate-300 font-medium"
        >
          ⚖ {t('verify_honesty_contract_btn', {}, { locale })}
        </button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('verify_title', {}, { locale })}</h1>
        <p className="text-sm text-gray-600 mt-1">{t('verify_description', {}, { locale })}</p>
      </div>

      {/* Verification controls */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Verification AI:</label>
          <select
            value={selectedProvider}
            onChange={e => setSelectedProvider(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
          >
            <option value="ChatGPT">ChatGPT</option>
            <option value="Claude">Claude</option>
            <option value="Gemini">Gemini</option>
          </select>
          <span className="text-xs text-gray-500 italic">
            ⓘ Best practice: use a DIFFERENT AI than the one that wrote the answer.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCopyVerificationPrompt}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded font-medium text-gray-700"
          >
            {t('verify_copy_prompt', {}, { locale })}
          </button>
          <button
            onClick={() => onOpenVerificationAi?.(selectedProvider)}
            className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium"
          >
            {t('verify_open_ai', {}, { locale })}
          </button>
        </div>
      </div>

      {/* Claims Ledger */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">
          {t('verify_claims_found', { count: claims.length }, { locale })}
        </h2>

        <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
          {evaluatedClaims.map(({ claim, deterministicResult }) => {
            const isE4 = mayAssertOfficialVerification(claim.evidenceLevel);
            const isE3 = claim.evidenceLevel === 'E3';

            return (
              <div key={claim.id} className="p-4 bg-white hover:bg-slate-50/50 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-500">C{claim.ordinal}</span>
                      <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                        {claim.claimType}
                      </span>
                      {claim.assertedSource && (
                        <span className="text-xs font-semibold text-gray-800">{claim.assertedSource}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900">{claim.text}</p>
                  </div>

                  {/* Mandatory Pairing: Status Badge + Evidence Level Chip */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {/* Evidence Level Chip */}
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                          isE4
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isE3
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : claim.evidenceLevel === 'E2'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                      >
                        {claim.evidenceLevel}
                      </span>

                      {/* Status Badge (ONLY E4 in green / verified) */}
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          isE4 && claim.status === 'VERIFIED'
                            ? 'bg-emerald-600 text-white font-bold'
                            : isE4 && claim.status === 'PARTIALLY_VERIFIED'
                            ? 'bg-emerald-500 text-white'
                            : claim.status === 'TEXT_CONSISTENT'
                            ? 'bg-blue-600 text-white'
                            : claim.status === 'CONTRADICTED'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {claim.status}
                      </span>
                    </div>

                    {/* Scope / Confirmation details */}
                    {isE4 && claim.attestedAt && (
                      <span className="text-[11px] text-emerald-700 font-medium">
                        confirmed by you, {claim.attestedAt}
                      </span>
                    )}
                    {isE3 && (
                      <span className="text-[11px] text-blue-700 italic max-w-xs text-right">
                        consistent with text you supplied in this session (unverified)
                      </span>
                    )}
                  </div>
                </div>

                {/* Deterministic Validation Finding (rendered first) */}
                {deterministicResult && (
                  <div
                    className={`text-xs px-2.5 py-1 rounded flex items-center gap-1.5 ${
                      deterministicResult.valid
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <span>{deterministicResult.valid ? '✓' : '⚠'}</span>
                    <span>{deterministicResult.message}</span>
                    {deterministicResult.suggestion && (
                      <span className="font-semibold underline">
                        Did you mean: {deterministicResult.suggestion}?
                      </span>
                    )}
                  </div>
                )}

                {/* Action links */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-3">
                    {claim.claimType === 'egw' && (
                      <a
                        href={`https://egwwritings.org/search?query=${encodeURIComponent(claim.assertedSource || claim.text)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        ↗ {t('verify_source_check_egw', {}, { locale })}
                      </a>
                    )}
                    {claim.claimType === 'scripture' && (
                      <a
                        href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(claim.assertedSource || '')}&version=KJV`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        ↗ {t('verify_source_check_bible', {}, { locale })}
                      </a>
                    )}
                  </div>

                  {!isE4 && (
                    <button
                      onClick={() => {
                        setAttestingClaim(claim);
                        setAttestUrl('');
                        setAttestError(null);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium border border-slate-300"
                    >
                      {t('attest_modal_title', {}, { locale })} →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attestation Modal */}
      {attestingClaim && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">{t('attest_modal_title', {}, { locale })}</h3>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-gray-700 space-y-1">
              <span className="font-semibold text-gray-900">C{attestingClaim.ordinal} · {attestingClaim.assertedSource}</span>
              <p className="italic">&ldquo;{attestingClaim.text}&rdquo;</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 block">{t('attest_step1', {}, { locale })}</label>
              {activeEgwRevision && (
                <a
                  href={`https://${activeEgwRevision.host}${activeEgwRevision.attestationPathPrefix || '/'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline inline-block font-medium"
                >
                  ↗ Open official {activeEgwRevision.name} ({activeEgwRevision.host})
                </a>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 block">{t('attest_step2', {}, { locale })}</label>
              <div className="space-y-1.5 text-xs text-gray-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="outcome"
                    value="found_correct"
                    checked={attestOutcome === 'found_correct'}
                    onChange={() => setAttestOutcome('found_correct')}
                  />
                  {t('attest_opt_found_correct', {}, { locale })}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="outcome"
                    value="found_details_differ"
                    checked={attestOutcome === 'found_details_differ'}
                    onChange={() => setAttestOutcome('found_details_differ')}
                  />
                  {t('attest_opt_found_differ', {}, { locale })}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="outcome"
                    value="not_found"
                    checked={attestOutcome === 'not_found'}
                    onChange={() => setAttestOutcome('not_found')}
                  />
                  {t('attest_opt_not_found', {}, { locale })}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="outcome"
                    value="contradicted"
                    checked={attestOutcome === 'contradicted'}
                    onChange={() => setAttestOutcome('contradicted')}
                  />
                  {t('attest_opt_contradicted', {}, { locale })}
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">{t('attest_url_label', {}, { locale })}</label>
              <input
                type="text"
                placeholder="https://egwwritings.org/read/..."
                value={attestUrl}
                onChange={e => {
                  setAttestUrl(e.target.value);
                  setAttestError(null);
                }}
                className="w-full text-xs font-mono border border-gray-300 rounded px-2.5 py-1.5"
              />
              <span className="text-[10px] text-gray-500 block">
                Must be an active page under {activeEgwRevision?.host}{activeEgwRevision?.attestationPathPrefix}
              </span>
            </div>

            {attestError && (
              <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs">
                ⚠ {attestError}
              </div>
            )}

            <p className="text-[11px] text-gray-500 border-t pt-2">{t('attest_notice', {}, { locale })}</p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAttestingClaim(null)}
                className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordAttestation}
                className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
              >
                {t('attest_submit_btn', {}, { locale })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The Three-Column Honesty Contract Modal / Panel (Verification Architecture §3) */}
      {showHonestyContract && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-4 border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">{t('verify_honesty_contract_btn', {}, { locale })}</h3>
              <button
                onClick={() => setShowHonestyContract(false)}
                className="text-gray-500 hover:text-gray-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left divide-y divide-gray-200">
                <thead className="bg-slate-100 text-gray-800 font-semibold">
                  <tr>
                    <th className="p-3">{t('honesty_col1_header', {}, { locale })}</th>
                    <th className="p-3">{t('honesty_col2_header', {}, { locale })}</th>
                    <th className="p-3">{t('honesty_col3_header', {}, { locale })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  <tr>
                    <td className="p-3 font-medium text-gray-900">{t('honesty_row1_col1', {}, { locale })}</td>
                    <td className="p-3">{t('honesty_row1_col2', {}, { locale })}</td>
                    <td className="p-3 text-slate-600 italic">{t('honesty_row1_col3', {}, { locale })}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900">{t('honesty_row2_col1', {}, { locale })}</td>
                    <td className="p-3">{t('honesty_row2_col2', {}, { locale })}</td>
                    <td className="p-3 text-slate-600 italic">{t('honesty_row2_col3', {}, { locale })}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900">{t('honesty_row3_col1', {}, { locale })}</td>
                    <td className="p-3">{t('honesty_row3_col2', {}, { locale })}</td>
                    <td className="p-3 text-slate-600 italic">{t('honesty_row3_col3', {}, { locale })}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900">{t('honesty_row4_col1', {}, { locale })}</td>
                    <td className="p-3">{t('honesty_row4_col2', {}, { locale })}</td>
                    <td className="p-3 text-slate-600 italic">{t('honesty_row4_col3', {}, { locale })}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900">{t('honesty_row5_col1', {}, { locale })}</td>
                    <td className="p-3">{t('honesty_row5_col2', {}, { locale })}</td>
                    <td className="p-3 text-slate-600 italic">{t('honesty_row5_col3', {}, { locale })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHonestyContract(false)}
                className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-900 text-white rounded font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

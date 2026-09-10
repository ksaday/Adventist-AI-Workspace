/**
 * Multi-Format Outline Exporter (PR-P4-07 / Exit Criterion 2).
 *
 * Implements export to:
 * 1. Markdown
 * 2. Plain Text
 * 3. Print-friendly HTML
 *
 * Invariant: Every exported citation carries its evidence level and,
 * where E4, the confirming person and date — or it carries no status at all.
 */

import type { StructuredOutline, ChecklistCitation } from './types';

function formatCitationMetadata(c: ChecklistCitation): string {
  if (c.evidenceLevel === 'E4') {
    const who = c.confirmedBy ? `confirmed by ${c.confirmedBy}` : 'confirmed by member';
    const when = c.confirmedAt ? ` on ${c.confirmedAt.split('T')[0]}` : '';
    return `E4 (${who}${when})`;
  }
  return c.evidenceLevel;
}

/**
 * Exports outline to GitHub-flavored Markdown.
 */
export function exportToMarkdown(outline: StructuredOutline): string {
  const lines: string[] = [];

  lines.push(`# ${outline.title}`);
  lines.push('');
  lines.push(`**Thesis:** ${outline.thesis}`);
  lines.push(`**Anchor Passage:** ${outline.anchorPassage}`);
  lines.push('');

  if (outline.introductionApproach) {
    lines.push(`### Introduction`);
    lines.push(outline.introductionApproach);
    lines.push('');
  }

  lines.push(`### Main Points`);
  for (const p of outline.points) {
    const passage = p.supportingPassage ? ` *(${p.supportingPassage})*` : '';
    lines.push(`#### ${p.pointNumber}. ${p.pointText}${passage}`);
    for (const sub of p.subPoints) {
      lines.push(`- ${sub}`);
    }
    if (p.illustrationPlaceholder) {
      lines.push(`  > *Illustration guide:* ${p.illustrationPlaceholder}`);
    }
    lines.push('');
  }

  if (outline.closingAppeal) {
    lines.push(`### Closing Appeal`);
    lines.push(outline.closingAppeal);
    lines.push('');
  }

  if (outline.discussionQuestions && outline.discussionQuestions.length > 0) {
    lines.push(`### Discussion Questions`);
    for (let i = 0; i < outline.discussionQuestions.length; i++) {
      lines.push(`${i + 1}. ${outline.discussionQuestions[i]}`);
    }
    lines.push('');
  }

  if (outline.citations && outline.citations.length > 0) {
    lines.push(`---`);
    lines.push(`### Citations & Evidence Levels`);
    lines.push(`| Reference | Type | Evidence Level | Verbatim Quoting |`);
    lines.push(`|---|---|---|---|`);
    for (const c of outline.citations) {
      const verbatim = c.markedForVerbatimQuotation ? 'Yes (Public)' : 'Paraphrase';
      lines.push(`| ${c.reference} | ${c.type.toUpperCase()} | ${formatCitationMetadata(c)} | ${verbatim} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Exports outline to clean indented plain text for pulpit notes or cards.
 */
export function exportToPlainText(outline: StructuredOutline): string {
  const lines: string[] = [];

  lines.push(outline.title.toUpperCase());
  lines.push('='.repeat(outline.title.length));
  lines.push(`Thesis: ${outline.thesis}`);
  lines.push(`Anchor Passage: ${outline.anchorPassage}`);
  lines.push('');

  if (outline.introductionApproach) {
    lines.push('INTRODUCTION');
    lines.push('------------');
    lines.push(outline.introductionApproach);
    lines.push('');
  }

  lines.push('MAIN POINTS');
  lines.push('-----------');
  for (const p of outline.points) {
    const passage = p.supportingPassage ? ` (${p.supportingPassage})` : '';
    lines.push(`${p.pointNumber}. ${p.pointText}${passage}`);
    for (const sub of p.subPoints) {
      lines.push(`   * ${sub}`);
    }
    if (p.illustrationPlaceholder) {
      lines.push(`   [Illustration: ${p.illustrationPlaceholder}]`);
    }
    lines.push('');
  }

  if (outline.closingAppeal) {
    lines.push('CLOSING APPEAL');
    lines.push('--------------');
    lines.push(outline.closingAppeal);
    lines.push('');
  }

  if (outline.discussionQuestions && outline.discussionQuestions.length > 0) {
    lines.push('DISCUSSION QUESTIONS');
    lines.push('--------------------');
    for (let i = 0; i < outline.discussionQuestions.length; i++) {
      lines.push(`${i + 1}. ${outline.discussionQuestions[i]}`);
    }
    lines.push('');
  }

  if (outline.citations && outline.citations.length > 0) {
    lines.push('CITATIONS & EVIDENCE');
    lines.push('--------------------');
    for (const c of outline.citations) {
      const verbatim = c.markedForVerbatimQuotation ? ' [Verbatim]' : '';
      lines.push(`- ${c.reference} (${c.type}): ${formatCitationMetadata(c)}${verbatim}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Exports outline to standalone, print-friendly HTML with print stylesheet.
 */
export function exportToPrintHtml(outline: StructuredOutline): string {
  const pointsHtml = outline.points
    .map(
      p => `
      <div class="point-item">
        <h3>${p.pointNumber}. ${escapeHtml(p.pointText)} ${
          p.supportingPassage ? `<span class="passage">(${escapeHtml(p.supportingPassage)})</span>` : ''
        }</h3>
        <ul>
          ${p.subPoints.map(sp => `<li>${escapeHtml(sp)}</li>`).join('')}
        </ul>
        ${
          p.illustrationPlaceholder
            ? `<div class="illustration"><strong>Illustration:</strong> ${escapeHtml(p.illustrationPlaceholder)}</div>`
            : ''
        }
      </div>`
    )
    .join('');

  const questionsHtml = outline.discussionQuestions && outline.discussionQuestions.length > 0
    ? `
      <section class="section">
        <h2>Discussion Questions</h2>
        <ol>
          ${outline.discussionQuestions.map(q => `<li>${escapeHtml(q)}</li>`).join('')}
        </ol>
      </section>`
    : '';

  const citationsHtml = outline.citations && outline.citations.length > 0
    ? `
      <section class="section citations-section">
        <h2>Citation Checklist & Evidence Levels</h2>
        <table class="citations-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Type</th>
              <th>Status</th>
              <th>Quotation Mode</th>
            </tr>
          </thead>
          <tbody>
            ${outline.citations
              .map(
                c => `
              <tr>
                <td><strong>${escapeHtml(c.reference)}</strong></td>
                <td>${c.type.toUpperCase()}</td>
                <td><span class="badge ${c.evidenceLevel === 'E4' ? 'e4-badge' : 'badge-default'}">${escapeHtml(
                  formatCitationMetadata(c)
                )}</span></td>
                <td>${c.markedForVerbatimQuotation ? 'Verbatim' : 'Paraphrase'}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(outline.title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #111827;
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1.5rem;
    }
    h1 { font-size: 1.8rem; margin-bottom: 0.5rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    .meta { color: #4b5563; font-size: 0.95rem; margin-bottom: 1.5rem; }
    .meta strong { color: #111827; }
    .section { margin-bottom: 1.5rem; }
    h2 { font-size: 1.2rem; color: #1f2937; margin-bottom: 0.5rem; }
    h3 { font-size: 1.05rem; margin-bottom: 0.35rem; }
    .passage { color: #2563eb; font-weight: normal; }
    .point-item { margin-bottom: 1.25rem; }
    .illustration { background: #f3f4f6; padding: 0.5rem 0.75rem; border-left: 3px solid #6b7280; font-size: 0.875rem; margin-top: 0.5rem; }
    .citations-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 0.5rem; }
    .citations-table th, .citations-table td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; }
    .citations-table th { background: #f9fafb; font-weight: 600; }
    .badge { padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 0.75rem; }
    .e4-badge { background: #dcfce7; color: #15803d; }
    .badge-default { background: #f3f4f6; color: #374151; }
    @media print {
      body { margin: 0; padding: 0; max-width: 100%; }
      .citations-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(outline.title)}</h1>
  <div class="meta">
    <div><strong>Thesis:</strong> ${escapeHtml(outline.thesis)}</div>
    <div><strong>Anchor Passage:</strong> ${escapeHtml(outline.anchorPassage)}</div>
  </div>

  ${
    outline.introductionApproach
      ? `<section class="section">
          <h2>Introduction Approach</h2>
          <p>${escapeHtml(outline.introductionApproach)}</p>
        </section>`
      : ''
  }

  <section class="section">
    <h2>Outline Points</h2>
    ${pointsHtml}
  </section>

  ${
    outline.closingAppeal
      ? `<section class="section">
          <h2>Closing Appeal</h2>
          <p>${escapeHtml(outline.closingAppeal)}</p>
        </section>`
      : ''
  }

  ${questionsHtml}
  ${citationsHtml}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

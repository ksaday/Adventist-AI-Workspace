import { describe, it, expect } from 'vitest';
import { exportToMarkdown, exportToPlainText, exportToPrintHtml } from '../../packages/pastor/src/export';
import type { StructuredOutline } from '../../packages/pastor/src/types';

describe('Multi-Format Outline Exporter (Phase 6 / PR-P4-07 / Exit Criterion 2)', () => {
  const sampleOutline: StructuredOutline = {
    id: 'test-outline-1',
    title: 'Peace in the Midst of the Storm',
    thesis: 'God anchors our faith when earthly securities fail.',
    anchorPassage: 'Romans 5:1-5',
    introductionApproach: 'Acknowledge the universal experience of disappointment and trial.',
    points: [
      {
        id: 'pt-1',
        pointNumber: 1,
        pointText: 'Justified by Faith, We Have Peace with God',
        supportingPassage: 'Romans 5:1',
        subPoints: [
          'Faith shifts our foundation from human works to divine grace.',
          'Reconciliation with God brings internal stillness regardless of circumstance.',
        ],
        illustrationPlaceholder: 'Describe an anchor holding a vessel steady in gale-force winds.',
      },
      {
        id: 'pt-2',
        pointNumber: 2,
        pointText: 'Suffering Produces Endurance and Hope',
        supportingPassage: 'Romans 5:3-4',
        subPoints: [
          'Endurance is formed in the crucible of trial.',
          'Character development prepares believers for eternal fellowship.',
        ],
      },
    ],
    closingAppeal: 'Surrender every anxious tomorrow into the hands of a faithful Creator.',
    discussionQuestions: [
      'In what ways has personal affliction deepened your reliance on Christ?',
      'How does biblical hope differ from mere human optimism?',
    ],
    citations: [
      {
        id: 'c-1',
        reference: 'Romans 5:1-5',
        type: 'scripture',
        evidenceLevel: 'E4',
        markedForVerbatimQuotation: true,
        confirmedBy: 'Pastor John',
        confirmedAt: '2026-09-10T12:00:00Z',
      },
      {
        id: 'c-2',
        reference: 'The Desire of Ages, p. 330',
        type: 'egw',
        evidenceLevel: 'E1',
        markedForVerbatimQuotation: false,
      },
    ],
    readyToPreach: true,
    createdAt: '2026-09-10T12:00:00Z',
    updatedAt: '2026-09-10T12:00:00Z',
  };

  it('exports to valid Markdown with evidence levels and E4 confirming metadata (PR-P4-07)', () => {
    const md = exportToMarkdown(sampleOutline);

    expect(md).toContain('# Peace in the Midst of the Storm');
    expect(md).toContain('**Thesis:** God anchors our faith');
    expect(md).toContain('#### 1. Justified by Faith, We Have Peace with God *(Romans 5:1)*');
    expect(md).toContain('- Faith shifts our foundation');
    expect(md).toContain('> *Illustration guide:* Describe an anchor');
    expect(md).toContain('### Citations & Evidence Levels');
    // Verifies PR-P4-07: Every exported citation carries its evidence level and, where E4, the confirming person and date
    expect(md).toContain('E4 (confirmed by Pastor John on 2026-09-10)');
    expect(md).toContain('The Desire of Ages, p. 330 | EGW | E1 | Paraphrase');
  });

  it('exports to clean plain text format for pulpit notes', () => {
    const text = exportToPlainText(sampleOutline);

    expect(text).toContain('PEACE IN THE MIDST OF THE STORM');
    expect(text).toContain('Thesis: God anchors our faith');
    expect(text).toContain('1. Justified by Faith, We Have Peace with God (Romans 5:1)');
    expect(text).toContain('* Faith shifts our foundation');
    expect(text).toContain('[Illustration: Describe an anchor');
    expect(text).toContain('Romans 5:1-5 (scripture): E4 (confirmed by Pastor John on 2026-09-10) [Verbatim]');
  });

  it('exports to print-friendly standalone HTML with print styling', () => {
    const html = exportToPrintHtml(sampleOutline);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<h1>Peace in the Midst of the Storm</h1>');
    expect(html).toContain('@media print');
    expect(html).toContain('<h3>1. Justified by Faith, We Have Peace with God');
    expect(html).toContain('<table class="citations-table">');
    expect(html).toContain('E4 (confirmed by Pastor John on 2026-09-10)');
  });
});

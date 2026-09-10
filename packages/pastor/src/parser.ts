/**
 * Sermon Outline Parser (PR-P4-06).
 *
 * Assembles a pasted AI sermon outline into structured, editable objects:
 * title, thesis, anchor passage, points (point text, passage, subpoints, illustrations),
 * appeal, and detected citations for the checklist.
 */

import { detectBibleRefs } from '../../citations/src/bible';
import { detectEgwCitations } from '../../citations/src/egw';
import type { ChecklistCitation, OutlinePoint, StructuredOutline } from './types';

export function parseStructuredOutline(rawText: string, defaultTopic?: string): StructuredOutline {
  const lines = rawText.split('\n');

  let title = defaultTopic ? `Sermon on ${defaultTopic}` : 'Untitled Sermon';
  let thesis = '';
  let anchorPassage = '';
  let intro = '';
  let appeal = '';
  const points: OutlinePoint[] = [];
  const questions: string[] = [];

  let currentSection: 'header' | 'intro' | 'points' | 'appeal' | 'questions' | 'other' = 'header';
  let currentPoint: OutlinePoint | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Section triggers
    if (/^(?:#{1,4}\s*)?(?:Introduction(?:\s*Approach)?):?/i.test(line)) {
      currentSection = 'intro';
      continue;
    }
    if (/^(?:#{1,4}\s*)?(?:Closing Appeal|Appeal|Conclusion):?/i.test(line)) {
      currentSection = 'appeal';
      continue;
    }
    if (/^(?:#{1,4}\s*)?(?:Discussion Questions|Study Questions):?/i.test(line)) {
      currentSection = 'questions';
      continue;
    }

    // Detect Title (in header section only)
    if (currentSection === 'header') {
      const titleMatch = /^(?:#\s+|Title:\s*|Working Title:\s*)(.+)$/i.exec(line);
      if (titleMatch && !titleMatch[1].toLowerCase().includes('sermon outline')) {
        title = titleMatch[1].trim();
        continue;
      }
    }

    // Detect Thesis
    const thesisMatch = /^(?:Thesis(?:\s*Statement)?:\s*)(.+)$/i.exec(line);
    if (thesisMatch) {
      thesis = thesisMatch[1].trim();
      continue;
    }

    // Detect Anchor Passage
    const anchorMatch = /^(?:Anchor Passage:\s*|Scripture Text:\s*)(.+)$/i.exec(line);
    if (anchorMatch) {
      anchorPassage = anchorMatch[1].trim();
      continue;
    }

    // Main Point triggers (e.g. "Point 1:", "1. ", "I. ", "### 1.")
    const pointMatch = /^(?:#{1,4}\s*)?(?:Point\s*)?(\d+|[IVX]+)[\.:]\s*(.+)$/i.exec(line);
    if (pointMatch && currentSection !== 'questions' && currentSection !== 'appeal') {
      currentSection = 'points';
      if (currentPoint) {
        points.push(currentPoint);
      }

      let pointText = pointMatch[2].trim();
      let supportingPassage: string | undefined;

      // Extract supporting passage if enclosed in parens, e.g. "Faith in trial (Romans 5:1-5)"
      const passageInParens = /\(([^)]+)\)$/.exec(pointText);
      if (passageInParens) {
        supportingPassage = passageInParens[1].trim();
        pointText = pointText.replace(/\([^)]+\)$/, '').trim();
      }

      currentPoint = {
        id: `pt-${points.length + 1}`,
        pointNumber: points.length + 1,
        pointText,
        supportingPassage,
        subPoints: [],
      };
      continue;
    }

    // Process lines inside active section
    if (currentSection === 'intro') {
      intro = intro ? `${intro} ${line}` : line;
    } else if (currentSection === 'appeal') {
      appeal = appeal ? `${appeal} ${line}` : line;
    } else if (currentSection === 'questions') {
      const qClean = line.replace(/^[-*•\d\.]+\s*/, '').trim();
      if (qClean) questions.push(qClean);
    } else if (currentSection === 'points' && currentPoint) {
      // Sub-points or illustration guide
      if (/^(?:Illustration(?:\s*guide)?|Example):\s*/i.test(line)) {
        currentPoint.illustrationPlaceholder = line.replace(/^(?:Illustration(?:\s*guide)?|Example):\s*/i, '').trim();
      } else if (/^[-*•]\s*/.test(line)) {
        currentPoint.subPoints.push(line.replace(/^[-*•]\s*/, '').trim());
      } else if (/^[a-d]\.\s*/i.test(line)) {
        currentPoint.subPoints.push(line.replace(/^[a-d]\.\s*/i, '').trim());
      } else {
        currentPoint.subPoints.push(line);
      }
    }
  }

  if (currentPoint) {
    points.push(currentPoint);
  }

  // Fallback: If no structured points were extracted, create at least 1 point from raw text
  if (points.length === 0) {
    points.push({
      id: 'pt-1',
      pointNumber: 1,
      pointText: 'Core Sermon Discourse',
      subPoints: [rawText.slice(0, 300) + '...'],
    });
  }

  // Automatically detect citations in the outline for the Pre-pulpit Citation Checklist
  const citations: ChecklistCitation[] = [];
  const bibleRefs = detectBibleRefs(rawText);
  const egwRefs = detectEgwCitations(rawText);

  let citIndex = 1;
  for (const b of bibleRefs) {
    if (b.status === 'VALID') {
      // Avoid duplicate references
      if (!citations.some(c => c.reference === b.canonicalEn)) {
        citations.push({
          id: `cit-${citIndex++}`,
          reference: b.canonicalEn,
          type: 'scripture',
          evidenceLevel: 'E1', // Default model recall until confirmed by pastor
          markedForVerbatimQuotation: false,
        });
      }
    }
  }

  for (const e of egwRefs) {
    if (e.canonicalTitle) {
      const refStr = e.page ? `${e.canonicalTitle}, p. ${e.page}` : e.canonicalTitle;
      if (!citations.some(c => c.reference === refStr)) {
        citations.push({
          id: `cit-${citIndex++}`,
          reference: refStr,
          type: 'egw',
          evidenceLevel: 'E1', // Default model recall
          markedForVerbatimQuotation: false,
          officialUrl: e.officialUrl,
        });
      }
    }
  }

  const now = new Date().toISOString();

  return {
    id: `outline-${Date.now()}`,
    title: title || 'Sermon Outline',
    thesis: thesis || 'A biblical call to faith and obedience.',
    anchorPassage: anchorPassage || (points[0]?.supportingPassage ?? 'Scripture'),
    introductionApproach: intro,
    points,
    closingAppeal: appeal,
    discussionQuestions: questions,
    citations,
    readyToPreach: false,
    createdAt: now,
    updatedAt: now,
  };
}

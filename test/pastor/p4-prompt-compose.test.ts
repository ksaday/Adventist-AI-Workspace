import { describe, it, expect } from 'vitest';
import { composePastorPrompt, getTemplateIdForTask } from '../../packages/pastor/src/composer';
import type { HomileticParameters, PastorTaskType } from '../../packages/pastor/src/types';

describe('P4 Pastor’s Aids Prompt Composer (Phase 6 / Template Library §6)', () => {
  const baseParams: HomileticParameters = {
    topic: 'Justification by Faith',
    anchorPassage: 'Romans 3:21-28',
    occasion: 'Sabbath worship',
    audience: 'Mixed congregation',
    durationMinutes: 30,
    pointCount: 3,
    homileticForm: 'expository',
    tone: 'pastoral',
    depth: 'congregational',
    bibleEmphasis: 4,
    egwEmphasis: 'light',
    outlineFormat: 'points_and_subpoints',
    locale: 'en',
  };

  it('maps all 12 task types to their corresponding template IDs', () => {
    const tasks: PastorTaskType[] = [
      'sermon_outline',
      'sermon_topic_explore',
      'bible_passage_discover',
      'egw_reference_discovery',
      'sermon_points',
      'biblestudy_outline',
      'devotional_outline',
      'discussion_questions',
      'thematic_comparison',
      'application_ideas',
      'sermon_refinement',
      'source_verification',
    ];

    for (const task of tasks) {
      const templateId = getTemplateIdForTask(task);
      expect(templateId.startsWith('p4.')).toBe(true);

      const out = composePastorPrompt({
        task,
        parameters: baseParams,
        seed: `seed-${task}`,
      });
      expect(out.templateVersionId).toBe(templateId);
      expect(out.prompt).toContain('These parameters shape FORM and INTENT only');
      expect(out.prompt).toContain('```SDAWS-CLAIMS-V1');
    }
  });

  it('enforces PR-P4-04 disclaimer: parameters shape form/intent only, never sources of truth', () => {
    const out = composePastorPrompt({
      task: 'sermon_outline',
      parameters: baseParams,
    });

    expect(out.prompt).toContain(
      'These parameters shape FORM and INTENT only. They are not sources of truth and must not influence what you claim Scripture or Ellen G. White says.'
    );
  });

  it('enforces PR-P4-05 EGW leads mode: returns leads to study, never purported text', () => {
    const out = composePastorPrompt({
      task: 'sermon_outline',
      parameters: { ...baseParams, egwEmphasis: 'moderate' },
    });

    expect(out.prompt).toContain('ELLEN G. WHITE LEADS DIRECTIVE (PR-P4-05):');
    expect(out.prompt).toContain('For Ellen G. White material, give LEADS, not text');
    expect(out.prompt).toContain('Do not reproduce passages');
    expect(out.prompt).toContain('Mark every such lead as unverified recall');
  });

  it('requests the kind of illustration needed rather than inventing fictional pastoral anecdotes', () => {
    const out = composePastorPrompt({
      task: 'sermon_outline',
      parameters: baseParams,
    });

    expect(out.prompt).toContain(
      'an illustration guide describing the KIND of illustration needed (do not invent fictional anecdotes)'
    );
  });
});

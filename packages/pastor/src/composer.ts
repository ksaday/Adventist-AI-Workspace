/**
 * P4 Pastor's Aids Prompt Composer (PRD §5 / Template Library §6).
 *
 * Implements:
 * 1. All 12 homiletic and study task types.
 * 2. PR-P4-04: Parameters shape form and intent only, never sources of truth.
 * 3. PR-P4-05: EGW reference discovery returns LEADS ONLY, never text.
 * 4. Anti-fabrication of pastoral anecdotes: requests the KIND of illustration needed.
 * 5. Nonce delimiter protection and SDAWS-CLAIMS-V1 output contract.
 */

import { compose, type ComposeOutput, type SourceBlock } from '../../compose/src/index';
import type { HomileticParameters, PastorTaskType } from './types';

export interface ComposePastorPromptInput {
  task: PastorTaskType;
  parameters: HomileticParameters;
  userNotes?: string;
  sourceBlocks?: SourceBlock[];
  seed?: string;
}

export function getTemplateIdForTask(task: PastorTaskType): string {
  switch (task) {
    case 'sermon_outline':
      return 'p4.sermon.outline';
    case 'sermon_topic_explore':
      return 'p4.topic.explore';
    case 'bible_passage_discover':
      return 'p4.passage.discover';
    case 'egw_reference_discovery':
      return 'p4.egw.leads';
    case 'sermon_points':
      return 'p4.sermon.points';
    case 'biblestudy_outline':
      return 'p4.biblestudy.outline';
    case 'devotional_outline':
      return 'p4.devotional.outline';
    case 'discussion_questions':
      return 'p4.questions.generate';
    case 'thematic_comparison':
      return 'p4.thematic.compare';
    case 'application_ideas':
      return 'p4.application.ideas';
    case 'sermon_refinement':
      return 'p4.sermon.refine';
    case 'source_verification':
      return 'p4.source.verify';
  }
}

export function composePastorPrompt(input: ComposePastorPromptInput): ComposeOutput {
  const params = input.parameters;
  const isKo = params.locale === 'ko';
  const templateId = getTemplateIdForTask(input.task);

  const taskParts: string[] = [];

  // Parameter statement
  taskParts.push(
    `TASK\n` +
    `Help this pastor prepare homiletic material for: ${input.task.replace(/_/g, ' ').toUpperCase()}.\n\n` +
    `PARAMETERS:\n` +
    `  Topic:              ${params.topic || 'Unspecified'}\n` +
    `  Anchor passage:     ${params.anchorPassage || 'Unspecified'}\n` +
    `  Occasion:           ${params.occasion || 'Sabbath worship'}\n` +
    `  Audience:           ${params.audience || 'General congregation'}\n` +
    `  Length:             ${params.durationMinutes ?? 30} minutes\n` +
    `  Main points:        ${params.pointCount ?? 3}\n` +
    `  Homiletic form:     ${params.homileticForm ?? 'expository'}\n` +
    `  Tone:               ${params.tone ?? 'pastoral'}\n` +
    `  Depth:              ${params.depth ?? 'congregational'}\n` +
    `  Bible emphasis:     ${params.bibleEmphasis ?? 3} / 5\n` +
    `  EGW emphasis:       ${params.egwEmphasis ?? 'light'} (Leads only)\n` +
    `  Outline format:     ${params.outlineFormat ?? 'points_and_subpoints'}\n` +
    `  Preferred version:  ${params.preferredTranslation ?? (isKo ? '개역개정' : 'NKJV')}\n\n` +
    `These parameters shape FORM and INTENT only. They are not sources of truth and must not influence what you claim Scripture or Ellen G. White says.`
  );

  // EGW Leads Rule (PR-P4-05)
  if (params.egwEmphasis !== 'none') {
    taskParts.push(
      `ELLEN G. WHITE LEADS DIRECTIVE (PR-P4-05):\n` +
      `For Ellen G. White material, give LEADS, not text: name the work and the chapter or theme where the pastor should look, and say what they are likely to find there.\n` +
      `Do not reproduce passages. If you are not confident a work addresses this theme, say so rather than guessing a title.\n` +
      `Mark every such lead as unverified recall.`
    );
  }

  // Task-specific output structure
  switch (input.task) {
    case 'sermon_outline':
      taskParts.push(
        `PRODUCE A STRUCTURED SERMON OUTLINE:\n` +
        `1. A clear working title\n` +
        `2. A one-sentence theological thesis statement\n` +
        `3. Exactly ${params.pointCount ?? 3} main points, each with: the supporting passage, 2 or 3 concise sub-points, and an illustration guide describing the KIND of illustration needed (do not invent fictional anecdotes)\n` +
        `4. An introduction approach (not full script)\n` +
        `5. A closing appeal approach\n` +
        `6. Three discussion questions for follow-up study`
      );
      break;

    case 'egw_reference_discovery':
      taskParts.push(
        `PRODUCE EGW REFERENCE LEADS ONLY:\n` +
        `List recommended Ellen G. White works, specific chapters, and topical themes for further personal study in the official EGW Estate Library.\n` +
        `Never generate purported quotation text.`
      );
      break;

    case 'bible_passage_discover':
      taskParts.push(
        `PRODUCE SCRIPTURE PASSAGE DISCOVERY:\n` +
        `Provide 3 to 5 candidate Scripture passages that address this theme, stating for each: the canonical reference (book, chapter, verse), the central motif, and homiletic suitability.`
      );
      break;

    case 'biblestudy_outline':
      taskParts.push(
        `PRODUCE A BIBLE STUDY OUTLINE:\n` +
        `Structure in four clear phases: 1. Observation (what the text says), 2. Interpretation (doctrinal meaning), 3. Application (personal obedience), 4. Discovery Questions.`
      );
      break;

    default:
      taskParts.push(
        `PRODUCE HOMILETIC STUDY CONTENT:\n` +
        `Tailor the analysis directly to the stated topic and parameters, maintaining strict biblical accuracy and distinguishing synthesis from source citations.`
      );
      break;
  }

  return compose({
    templateVersionId: templateId,
    app: 'p4',
    parameters: {
      task: input.task,
      ...params,
    },
    userContent: input.userNotes || `Prepare ${input.task.replace(/_/g, ' ')} for ${params.topic}`,
    sourceBlocks: input.sourceBlocks ?? [],
    contentLocale: params.locale ?? 'en',
    seed: input.seed,
    taskBody: taskParts.join('\n\n'),
  });
}

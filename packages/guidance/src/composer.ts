/**
 * P3 Spiritual Guidance Prompt Composer (Template Library §5 / PRD §4 / UX §6.2).
 *
 * Implements:
 * - `p3.guidance.standard` (default)
 * - `p3.guidance.source_bounded` (activated when sources attached or explicit)
 * - Denominational sensitivity detection & clauses
 * - Crisis safety acknowledgment
 * - Five-band task instructions
 * - Output contract (SDAWS-CLAIMS-V1)
 */

import { compose, type ComposeOutput, type SourceBlock } from '../../compose/src/index';
import { detectDenominationalTopics, buildDenominationalClause } from './sensitivity';
import type { ClientSourceBlock, DenominationalTopicId } from './types';

export interface ComposeGuidancePromptInput {
  question: string;
  sources: ClientSourceBlock[];
  locale: 'en' | 'ko';
  forceSourceBounded?: boolean;
  manualTopicOverride?: DenominationalTopicId;
  isCrisisFlagged?: boolean;
  seed?: string;
}

export function composeGuidancePrompt(input: ComposeGuidancePromptInput): ComposeOutput {
  const isKo = input.locale.toLowerCase().startsWith('ko');
  const isSourceBounded = input.forceSourceBounded || input.sources.length > 0;
  const templateVersionId = isSourceBounded ? 'p3.guidance.source_bounded' : 'p3.guidance.standard';

  // 1. Detect denominational sensitivity
  const combinedText = `${input.question} ${input.sources.map(s => s.text).join(' ')}`;
  const detectedTopics = detectDenominationalTopics(combinedText);
  const denominationalClause = buildDenominationalClause(detectedTopics, input.locale);

  // 2. Build task body with the 5 bands
  const taskParts: string[] = [];

  if (isSourceBounded) {
    if (isKo) {
      taskParts.push(
        `출처 제한 모드 (SOURCE-BOUNDED MODE):\n` +
        `오직 제공된 구분자 사이의 자료에만 근거하여 추론하십시오. 기억에 의존하여 임의로 성경 구절이나 엘렌 G. 화잇 자료를 덧붙이지 마십시오.\n` +
        `제공된 자료가 질문을 다루기에 불충분하다면, 이를 솔직하게 명시하고 멈추십시오. 임의로 공백을 메우지 마십시오.\n` +
        `제공된 자료를 분석하고 종합하여 적용할 수 있으나, 해당 추론은 반드시 4번 영역(성찰 및 묵상)에서 본인의 분석임을 명확히 밝히십시오.`
      );
    } else {
      taskParts.push(
        `SOURCE-BOUNDED MODE:\n` +
        `Reason ONLY from the material supplied between the delimiters. Do not add Scripture or Ellen G. White material from memory.\n` +
        `If the supplied material does not address the question, say so plainly and stop — do not fill the gap.\n` +
        `You may reason about the supplied material, connect its parts, and apply it to their situation, as long as you mark that reasoning as yours in band 4.`
      );
    }
  }

  if (isKo) {
    taskParts.push(
      `과업:\n` +
      `이 성도가 신앙적이고 성경적인 고민을 깊이 묵상할 수 있도록 돕되, 답변을 반드시 아래의 5개 명시된 영역(Band)으로 구분하여 작성하십시오:\n\n` +
      `  1. 말씀해 주신 내용 — 질문자의 상황을 간략히 요약하여 질문자가 확인/교정할 수 있게 하십시오.\n` +
      `  2. 성경 말씀 — 관련된 핵심 성경 구절과 출처를 제시하고, 그 말씀이 무엇을 말하는지 설명하십시오.\n` +
      `  3. 엘렌 G. 화잇 저작 — 제공된 자료가 있거나 기억에 의존하는 경우에만 작성하십시오. 기억에 의존할 경우 반드시 '다음 내용은 기억에 의한 것이며 공식 도서관을 통해 검증되지 않았습니다.'로 시작하십시오. 신뢰할 만한 자료가 없다면 '확인된 자료가 없습니다.'라고 적으십시오.\n` +
      `  4. 성찰 및 묵상 — 귀하의 신학적 고찰과 추론을 기록하되, 이것이 AI 모델의 사견임을 명확히 밝히십시오.\n` +
      `  5. 여전히 확실하지 않은 것 — 이 질문을 통해 완전히 해결되지 않는 의문점, 신실한 재림성도들 사이에서도 견해 차이가 존재하는 쟁점, 그리고 불확실한 요소들을 솔직하게 기록하십시오.\n\n` +
      `5번 영역은 필수입니다. 불확실한 점이 전혀 없다고 여겨진다면 충분히 깊이 고찰하지 않은 것입니다.`
    );
  } else {
    taskParts.push(
      `TASK:\n` +
      `Help this person think through their spiritual question.\n` +
      `Structure your answer in these five labelled bands, and use the labels:\n\n` +
      `  1. WHAT YOU HAVE TOLD ME — restate their situation briefly, so they can correct you\n` +
      `  2. SCRIPTURE — relevant passages with references, and what they say\n` +
      `  3. ELLEN G. WHITE — only if you have material here or are drawing on recall.\n` +
      `     If it is recall, begin this band with: "The following is from memory and has not been verified against the official library."\n` +
      `     If you have nothing reliable, write: "No verified material is available here."\n` +
      `  4. REFLECTION — your own synthesis, clearly marked as your reasoning\n` +
      `  5. WHAT REMAINS UNCERTAIN — questions this cannot settle, points where faithful Adventists differ, and anything you are unsure of\n\n` +
      `Band 5 is required. If you believe nothing is uncertain, you have not looked hard enough.`
    );
  }

  if (denominationalClause) {
    taskParts.push(denominationalClause);
  }

  if (input.isCrisisFlagged) {
    taskParts.push(
      `CRISIS PASTORAL NOTICE:\n` +
      `This person may be describing a crisis. Begin by acknowledging what they are carrying. ` +
      `Encourage them to reach appropriate professional or emergency help, and say plainly that spiritual reflection is not a substitute for it. ` +
      `Do not attempt counselling or diagnosis.`
    );
  }

  // 3. Map client sources to SourceBlock interface for composer
  const sourceBlocks: SourceBlock[] = input.sources.map(s => ({
    id: s.id.slice(0, 8),
    kind: s.kind,
    label: s.label,
    body: s.text,
  }));

  // 4. Invoke base deterministic composer
  return compose({
    templateVersionId,
    app: 'p3',
    parameters: {
      isSourceBounded,
      detectedTopics: detectedTopics.map(t => t.id),
      locale: input.locale,
    },
    userContent: input.question,
    sourceBlocks,
    contentLocale: input.locale,
    seed: input.seed,
    taskBody: taskParts.join('\n\n'),
  });
}

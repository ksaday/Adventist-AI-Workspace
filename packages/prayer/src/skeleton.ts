/**
 * The Deterministic Prayer Skeleton Assembler.
 *
 * Implements:
 * - PR-P2-06: Ready-to-pray draft skeleton assembled deterministically
 *   from the user's own words and selected Scripture anchors with ZERO AI.
 * - UX §6.1 / Critical Review C-03: Local drafting path needs no external AI.
 * - Anonymous drafting path (Q-12, C-04).
 */

import { findScriptureAnchors } from "./anchors.js";
import {
  DeterministicPrayerDraft,
  PrayerComponentId,
  PrayerIntake,
  ScriptureAnchor,
} from "./types.js";

const COMPONENT_SNIPPETS_EN: Record<PrayerComponentId, (burden: string, intake: PrayerIntake) => string> = {
  address: () =>
    "Our Heavenly Father, gracious and sovereign Lord,",
  praise: () =>
    "You alone are worthy of all honor, praise, and adoration. Your faithfulness extends to all generations, and Your compassions never fail.",
  thanksgiving: () =>
    "We thank You for the gift of life, for Your sustaining peace, and for the promise that You hear every humble cry of our hearts.",
  confession: () =>
    "We acknowledge our human weakness and how easily we become anxious. Forgive us where our faith has faltered, and cleanse our hearts anew by Your grace.",
  petition: (burden: string) =>
    `Lord, we lay before You this heavy burden that weighs upon us: "${burden.trim()}". Grant us wisdom, quiet patience, and the strength to walk through this day.`,
  intercession: (burden: string, intake: PrayerIntake) => {
    if (intake.recipientName) {
      return `We especially lift up ${intake.recipientName} into Your loving hands. Surround them with Your protection, soften their heart, and draw them close to Your side.`;
    }
    return `We lift up those connected to this situation, asking that Your Holy Spirit bring comfort, healing, and reconciliation according to Your divine care.`;
  },
  submission: () =>
    "Not our will, our timing, or our wisdom, but Yours be done. We surrender this outcome into Your hands, trusting completely in Your unfailing goodness.",
  closing: () =>
    "In the precious and holy name of Jesus Christ our Savior, Amen.",
};

const COMPONENT_SNIPPETS_KO: Record<PrayerComponentId, (burden: string, intake: PrayerIntake) => string> = {
  address: () =>
    "하늘에 계신 자비로우시고 은혜로우신 아버지 하나님,",
  praise: () =>
    "홀로 영광과 찬양을 받으시기에 합당하신 주님을 경배합니다. 주님의 성실하심은 아침마다 새롭고 주님의 자비는 끝이 없으십니다.",
  thanksgiving: () =>
    "오늘도 저희의 생명을 붙들어 주시고, 작은 신음에도 귀 기울여 주시며 언제나 함께해 주시는 은혜에 진심으로 감사드립니다.",
  confession: () =>
    "저희의 연약함과 쉽게 흔들리는 마음을 고백합니다. 염려하느라 주님을 온전히 신뢰하지 못했던 허물을 용서하시고 십자가의 보혈로 정결케 하옵소서.",
  petition: (burden: string) =>
    `주님, 오늘 마음에 무겁게 짊어진 이 기도의 제목을 주님 앞에 내려놓습니다: "${burden.trim()}". 주님의 지혜와 참된 평강을 허락하여 주시고, 걸음을 인도하여 주옵소서.`,
  intercession: (burden: string, intake: PrayerIntake) => {
    if (intake.recipientName) {
      return `특별히 주님의 자비하신 손길 앞에 ${intake.recipientName}을(를) 올려드립니다. 성령께서 그 마음을 어루만져 주시고 주님의 참된 평안과 빛으로 인도하여 주옵소서.`;
    }
    return `이 일로 인해 아파하고 지친 이들의 마음에 주님의 위로를 더하여 주시고, 상한 심령을 회복시켜 주옵소서.`;
  },
  submission: () =>
    "우리의 뜻이나 조급함이 아니라 오직 아버지의 선하신 뜻이 이루어지기를 간구합니다. 가장 선한 길로 인도하실 주님만을 온전히 신뢰합니다.",
  closing: () =>
    "우리의 구주 되신 예수 그리스도의 귀하신 이름으로 기도드립니다. 아멘.",
};

/**
 * Assembles a complete, ready-to-pray draft deterministically without any external AI model.
 */
export function assembleDeterministicPrayer(intake: PrayerIntake): DeterministicPrayerDraft {
  const isKo = intake.language === "ko" || /[가-힣]/.test(intake.burden);
  const locale = isKo ? "ko" : "en";

  // Match curated Scripture anchors
  const anchors = findScriptureAnchors(intake.burden, intake.prayerType, locale);

  let prayerText = "";

  if (intake.freeForm) {
    // Free-form mode: respectful, unstructured, centered around member's words (Romans 8:26)
    if (isKo) {
      prayerText = [
        "사랑하는 주님,",
        `마음에 담긴 간절한 마음을 있는 그대로 주님 앞에 쏟아놓습니다.`,
        `"${intake.burden.trim()}"`,
        "때로 어떻게 기도해야 할지 알지 못할 때에도 성령께서 말할 수 없는 탄식으로 우리를 위해 간구하심을 믿습니다.",
        "오직 주님의 선하신 은혜와 뜻에 모든 것을 맡겨드립니다.",
        "예수 그리스도의 이름으로 기도드립니다. 아멘.",
      ].join("\n\n");
    } else {
      prayerText = [
        "Dear Lord,",
        "I come before You just as I am, bringing the honest weight of my heart into Your presence:",
        `"${intake.burden.trim()}"`,
        "Even when words feel small and solutions seem unclear, I trust that Your Spirit intercedes for us with groanings too deep for words.",
        "I place this entirely into Your loving hands and rest in Your peace.",
        "In Jesus' name, Amen.",
      ].join("\n\n");
    }
  } else {
    // Structured mode: follows selected components in exact specified order
    const snippets = isKo ? COMPONENT_SNIPPETS_KO : COMPONENT_SNIPPETS_EN;
    const paragraphs: string[] = [];

    for (const compId of intake.components) {
      const generator = snippets[compId];
      if (generator) {
        paragraphs.push(generator(intake.burden, intake));
      }
    }

    prayerText = paragraphs.join("\n\n");
  }

  // Append curated Scripture anchors section
  if (anchors.length > 0) {
    const anchorHeader = isKo ? "묵상을 위한 말씀 앵커:" : "Scripture Anchors for Meditation:";
    const anchorLines = anchors.map(a =>
      isKo ? `• ${a.reference} — ${a.relevanceKo}` : `• ${a.reference} — ${a.relevanceEn}`
    );
    prayerText += `\n\n---\n${anchorHeader}\n${anchorLines.join("\n")}`;
  }

  const notice = isKo
    ? "회원님의 고백과 성경 앵커 구절을 바탕으로 브라우저에서 결정론적으로 작성된 초안입니다. 외부 AI 모델을 전혀 사용하지 않았습니다. (로컬 작성 모드)"
    : "Assembled deterministically in your browser from your own words and Scripture anchors. Zero external AI was used. (Local Drafting Mode)";

  return {
    prayerText,
    prayerType: intake.prayerType,
    freeForm: intake.freeForm,
    componentsUsed: intake.freeForm ? [] : intake.components,
    anchorsUsed: anchors,
    isAnonymous: !!intake.isAnonymous,
    isEphemeral: intake.isEphemeral !== false, // Default is true for P2
    method: "DETERMINISTIC_LOCAL",
    notice,
  };
}

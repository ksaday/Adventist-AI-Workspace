/**
 * Prayer Note Prompt Composer.
 *
 * Implements:
 * - Template Library §4.2 (p2.prayer.compose)
 * - Integration with pure deterministic prompt composer (packages/compose)
 */

import { compose, ComposeOutput } from "../../compose/src/index.js";
import { findScriptureAnchors } from "./anchors.js";
import { DEFAULT_PRAYER_COMPONENTS } from "./frame.js";
import { PrayerIntake } from "./types.js";

/**
 * Composes the external AI prompt for template p2.prayer.compose.
 */
export function composePrayerPrompt(
  intake: PrayerIntake,
  seed?: string
): ComposeOutput {
  const isKo = intake.language === "ko" || /[가-힣]/.test(intake.burden);
  const locale = isKo ? "ko" : "en";
  const contentLanguageName = isKo ? "Korean (한국어)" : "English";

  // Build structure instruction
  let structureText = "";
  if (intake.freeForm) {
    structureText = "They have chosen free-form. Do not impose a structure.";
  } else {
    const componentNames = intake.components.map(id => {
      const comp = DEFAULT_PRAYER_COMPONENTS.find(c => c.id === id);
      return comp ? (isKo ? comp.nameKo : comp.nameEn) : id;
    });
    structureText = componentNames.join(" -> ");
  }

  // Pre-fetch curated Scripture anchors to suggest as candidate anchor leads
  const anchors = findScriptureAnchors(intake.burden, intake.prayerType, locale);
  const suggestedAnchorsText = anchors.length > 0
    ? `Curated Scripture candidates to consider: ${anchors.map(a => a.reference).join(", ")}`
    : "";

  const taskBody = [
    "Help this person shape a prayer about the burden they have described.",
    "",
    `Prayer type: ${intake.prayerType}`,
    `Structure they have chosen: ${structureText}`,
    suggestedAnchorsText,
    "",
    "Write in the first person, as words they could genuinely pray — natural and personal,",
    "not formal or ornate. Use their own words and situation wherever you can.",
    "",
    "For each Scripture you suggest, give the reference and explain in one sentence why it",
    "fits their situation. Only cite verses you are confident of. If a passage would fit but",
    "you are unsure of the reference, describe it and say the reference is uncertain.",
    "",
    "Do not tell them their prayer will be answered in any particular way. Do not diagnose",
    "their situation. Do not present this structure as required — say once, briefly, that it",
    "is one helpful pattern and that God hears simple, honest words (Matthew 6:7).",
  ].filter(Boolean).join("\n");

  return compose({
    templateVersionId: "p2.prayer.compose.v1",
    app: "p2",
    taskBody,
    parameters: {
      prayerType: intake.prayerType,
      selectedComponents: structureText,
      freeForm: intake.freeForm,
      suggestedAnchors: suggestedAnchorsText,
      contentLanguageName,
      recipientName: intake.recipientName ?? "",
    },
    userContent: intake.burden,
    sourceBlocks: [],
    contentLocale: locale,
    seed,
  });
}

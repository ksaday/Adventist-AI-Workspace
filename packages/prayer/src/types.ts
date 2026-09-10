/**
 * Prayer Note (P2) Domain Types.
 *
 * Implements:
 * - PR-P2-01..10
 * - UX §6.1
 * - Template Library §4.1, §4.2
 */

export type PrayerType =
  | "personal"
  | "family"
  | "intercessory"
  | "corporate"
  | "confession"
  | "thanksgiving";

export type PrayerComponentId =
  | "address"
  | "praise"
  | "thanksgiving"
  | "confession"
  | "petition"
  | "intercession"
  | "submission"
  | "closing";

export interface PrayerComponent {
  id: PrayerComponentId;
  nameEn: string;
  nameKo: string;
  scriptureBasis: string;
  promptGuideEn: string;
  promptGuideKo: string;
  enabled: boolean;
}

export interface ScriptureAnchor {
  reference: string;
  topicId: string;
  topicTitleEn: string;
  topicTitleKo: string;
  relevanceEn: string;
  relevanceKo: string;
}

export interface PrayerIntake {
  burden: string;
  prayerType: PrayerType;
  freeForm: boolean;
  components: PrayerComponentId[];
  selectedAnchorReferences?: string[];
  recipientName?: string;
  useInitials?: boolean;
  language?: "en" | "ko";
  isAnonymous?: boolean;
  isEphemeral?: boolean;
}

export interface DeterministicPrayerDraft {
  prayerText: string;
  prayerType: PrayerType;
  freeForm: boolean;
  componentsUsed: PrayerComponentId[];
  anchorsUsed: ScriptureAnchor[];
  isAnonymous: boolean;
  isEphemeral: boolean;
  method: "DETERMINISTIC_LOCAL";
  notice: string;
}

export interface ThirdPartyPrivacyCheck {
  containsThirdPartyName: boolean;
  detectedName?: string;
  initialsSuggestion?: string;
  warningEn: string;
  warningKo: string;
}

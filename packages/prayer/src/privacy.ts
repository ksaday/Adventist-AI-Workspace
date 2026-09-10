/**
 * Prayer Note Privacy & Safety Checks.
 *
 * Implements:
 * - PR-P2-08 (Ephemeral default)
 * - PR-P2-10 (Third-party intercessory privacy warning & initials-only entry)
 * - PR-P3-08 / PR-SAF-01 (Crisis screening before intake)
 */

import {
  screenSafety,
  RiskMatch,
  getEmergencyResources,
  EmergencyResource,
} from "../../safety/src/index.js";
import { PrayerType, ThirdPartyPrivacyCheck } from "./types.js";

export interface PrayerSafetyScreenResult {
  flagged: boolean;
  matches: RiskMatch[];
  emergencyResources: EmergencyResource[];
  noticeEn: string;
  noticeKo: string;
}

/**
 * Checks for third-party personal details in intercessory prayers (PR-P2-10).
 * Warns before storing another person's identifiable details and suggests initials.
 */
export function checkThirdPartyPrivacy(
  burden: string,
  prayerType: PrayerType
): ThirdPartyPrivacyCheck {
  const enPattern = /(?:pray\s+for\s+|for\s+my\s+(?:son|daughter|husband|wife|friend|mother|father|brother|sister|colleague)\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const koPattern = /([가-힣]{2,4})(?:\s*(?:집사님|성도님|목사님|장로님|권사님)|을\s*위해|를\s*위해|의\s*건강|의\s*회복)/;

  let detectedName: string | undefined;

  const enMatch = burden.match(enPattern);
  if (enMatch && enMatch[1]) {
    detectedName = enMatch[1].trim();
  } else {
    const koMatch = burden.match(koPattern);
    if (koMatch && koMatch[1]) {
      detectedName = koMatch[1].trim();
    }
  }

  const isIntercessory = prayerType === "intercessory" || detectedName !== undefined;

  if (isIntercessory && detectedName) {
    const initialsSuggestion = toInitials(detectedName);
    return {
      containsThirdPartyName: true,
      detectedName,
      initialsSuggestion,
      warningEn: `Intercessory prayer contains a third-party name ("${detectedName}"). To protect their privacy, we recommend using initials ("${initialsSuggestion}") instead.`,
      warningKo: `중보 기도에 타인의 이름("${detectedName}")이 포함되어 있습니다. 개인정보 보호를 위해 성명 대신 이니셜("${initialsSuggestion}") 사용을 권장합니다.`,
    };
  }

  return {
    containsThirdPartyName: false,
    warningEn: "",
    warningKo: "",
  };
}

/**
 * Converts a name to initials (e.g. "John Doe" -> "J.D.", "영수" -> "Y.S.").
 */
export function toInitials(name: string): string {
  if (/[a-zA-Z]/.test(name)) {
    return name
      .split(/\s+/)
      .map(part => part.charAt(0).toUpperCase() + ".")
      .join("");
  }
  return name.charAt(0) + " OO";
}

/**
 * Redacts a detected name in a burden with initials.
 */
export function redactWithInitials(burden: string, name: string, initials: string): string {
  return burden.replaceAll(name, initials);
}

/**
 * Pre-intake safety screening.
 * Blocks prompt generation on crisis burdens and displays emergency directory info.
 */
export function screenPrayerSafety(burden: string): PrayerSafetyScreenResult {
  const matches = screenSafety(burden, ["en", "ko"]);
  const flagged = matches.length > 0;
  const emergencyResources = flagged ? getEmergencyResources() : [];

  return {
    flagged,
    matches,
    emergencyResources,
    noticeEn: flagged
      ? "This prayer note touches on urgent personal safety or distress. Spiritual reflection is not a substitute for crisis support. Please consider reaching out to these 24/7 confidential resources:"
      : "",
    noticeKo: flagged
      ? "이 기도 제목은 긴급한 신변 안전 또는 위기 상황과 관련이 있습니다. 기도는 전문적인 위기 지원을 대신할 수 없습니다. 24시간 비밀 보장 상담 리소스를 이용해 주세요:"
      : "",
  };
}

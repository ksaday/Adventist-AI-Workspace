import { describe, it, expect } from "vitest";
import {
  assembleDeterministicPrayer,
  findScriptureAnchors,
  checkThirdPartyPrivacy,
  redactWithInitials,
  screenPrayerSafety,
  getDefaultComponentIds,
  reorderComponents,
  toggleComponent,
  PRAYER_FRAME_DISCLAIMER_EN,
  PRAYER_FRAME_DISCLAIMER_KO,
} from "../../packages/prayer/src/index.js";

describe("Phase 4: P2 Prayer Note — Deterministic Skeleton & Safety", () => {
  describe("Exit Criterion 1: A member reaches a usable prayer draft with NO external AI", () => {
    it("assembles a full, heartfelt prayer draft deterministically in English", () => {
      const burden = "My son has stopped coming to church and won't talk to me about it.";
      const draft = assembleDeterministicPrayer({
        burden,
        prayerType: "family",
        freeForm: false,
        components: getDefaultComponentIds(),
        language: "en",
      });

      expect(draft.method).toBe("DETERMINISTIC_LOCAL");
      expect(draft.prayerText).toContain("Our Heavenly Father");
      expect(draft.prayerText).toContain(burden);
      expect(draft.prayerText).toContain("In the precious and holy name of Jesus Christ");
      expect(draft.notice).toContain("Zero external AI was used");
      expect(draft.anchorsUsed.length).toBeGreaterThanOrEqual(1);
    });

    it("assembles a full, heartfelt prayer draft deterministically in Korean", () => {
      const burden = "아들이 교회를 떠나고 대화를 피해서 마음이 너무 아픕니다.";
      const draft = assembleDeterministicPrayer({
        burden,
        prayerType: "family",
        freeForm: false,
        components: getDefaultComponentIds(),
        language: "ko",
      });

      expect(draft.method).toBe("DETERMINISTIC_LOCAL");
      expect(draft.prayerText).toContain("하늘에 계신");
      expect(draft.prayerText).toContain(burden);
      expect(draft.prayerText).toContain("예수 그리스도의 귀하신 이름으로 기도드립니다");
      expect(draft.notice).toContain("외부 AI 모델을 전혀 사용하지 않았습니다");
      expect(draft.anchorsUsed.length).toBeGreaterThanOrEqual(1);
    });

    it("supports free-form mode without imposing structural frame (Romans 8:26)", () => {
      const burden = "I am exhausted and overwhelmed, I do not even have words to pray.";
      const draft = assembleDeterministicPrayer({
        burden,
        prayerType: "personal",
        freeForm: true,
        components: [],
        language: "en",
      });

      expect(draft.freeForm).toBe(true);
      expect(draft.componentsUsed).toHaveLength(0);
      expect(draft.prayerText).toContain(burden);
      expect(draft.prayerText).toContain("groanings too deep for words");
    });
  });

  describe("Structural Frame & Reordering (PR-P2-02, PR-P2-03, PR-P2-09)", () => {
    it("allows reordering and toggling structural components", () => {
      const defaultIds = getDefaultComponentIds();
      expect(defaultIds).toContain("address");
      expect(defaultIds).toContain("thanksgiving");

      // Reorder address to end
      const reordered = reorderComponents(defaultIds, 0, defaultIds.length - 1);
      expect(reordered[reordered.length - 1]).toBe("address");

      // Toggle off confession
      const toggled = toggleComponent(defaultIds, "confession");
      expect(toggled).not.toContain("confession");
    });

    it("contains clear disclaimer warning against formula or vain repetition (Matthew 6:7)", () => {
      expect(PRAYER_FRAME_DISCLAIMER_EN).toContain("not a required formula");
      expect(PRAYER_FRAME_DISCLAIMER_EN).toContain("Matthew 6:7");
      expect(PRAYER_FRAME_DISCLAIMER_KO).toContain("결코 정해진 공식이나 율법이 아닙니다");
      expect(PRAYER_FRAME_DISCLAIMER_KO).toContain("마태복음 6:7");
    });
  });

  describe("Curated Scripture Anchors (PR-P2-07, Invariant 5, ADR-0021)", () => {
    it("matches relevant scripture anchors by keyword without bundling verse text", () => {
      const anchors = findScriptureAnchors("anxious and fearful about surgery", "personal", "en");
      expect(anchors.length).toBeGreaterThanOrEqual(1);

      for (const a of anchors) {
        expect(a.reference).toBeDefined();
        expect(a.relevanceEn).toBeDefined();
        // Zero verse body is bundled in ScriptureAnchor
        expect((a as unknown as Record<string, unknown>).text).toBeUndefined();
        expect((a as unknown as Record<string, unknown>).body).toBeUndefined();
      }
    });
  });

  describe("Third-Party Privacy Check (PR-P2-10)", () => {
    it("detects named individuals in intercessory prayers and suggests initials", () => {
      const burden = "Please pray for John Doe who is in the hospital.";
      const check = checkThirdPartyPrivacy(burden, "intercessory");

      expect(check.containsThirdPartyName).toBe(true);
      expect(check.detectedName).toBe("John Doe");
      expect(check.initialsSuggestion).toBe("J.D.");
      expect(check.warningEn).toContain("recommend using initials");

      const redacted = redactWithInitials(burden, check.detectedName!, check.initialsSuggestion!);
      expect(redacted).toBe("Please pray for J.D. who is in the hospital.");
    });

    it("detects Korean names in intercessory prayer context", () => {
      const burden = "김철수 집사님을 위해 기도해 주세요.";
      const check = checkThirdPartyPrivacy(burden, "intercessory");

      expect(check.containsThirdPartyName).toBe(true);
      expect(check.detectedName).toContain("김철수");
      expect(check.warningKo).toContain("성명 대신 이니셜");
    });
  });

  describe("Exit Criterion 3: Ephemeral is default and explained (PR-P2-08)", () => {
    it("defaults to ephemeral mode for prayer drafts", () => {
      const draft = assembleDeterministicPrayer({
        burden: "Silent burden",
        prayerType: "personal",
        freeForm: false,
        components: getDefaultComponentIds(),
      });

      expect(draft.isEphemeral).toBe(true);
    });
  });

  describe("Safety Screening Pre-Intake (PR-P3-08, PR-SAF-01)", () => {
    it("flags acute personal crisis burdens and surfaces crisis hotlines", () => {
      const crisisBurden = "I feel like ending it all tonight, cannot bear the pain.";
      const result = screenPrayerSafety(crisisBurden);

      expect(result.flagged).toBe(true);
      expect(result.emergencyResources.length).toBeGreaterThanOrEqual(1);
      expect(result.emergencyResources.some(r => r.contact.includes("988"))).toBe(true);
    });

    it("passes through ordinary devotional prayer burdens cleanly", () => {
      const normalBurden = "Lord, grant me wisdom for my upcoming job interview tomorrow.";
      const result = screenPrayerSafety(normalBurden);

      expect(result.flagged).toBe(false);
      expect(result.emergencyResources).toHaveLength(0);
    });
  });

  describe("Anonymous Drafting Path (Q-12, C-04)", () => {
    it("allows anonymous drafting with zero user session or persistent storage", () => {
      const draft = assembleDeterministicPrayer({
        burden: "Praying anonymously as a new visitor",
        prayerType: "personal",
        freeForm: false,
        components: getDefaultComponentIds(),
        isAnonymous: true,
      });

      expect(draft.isAnonymous).toBe(true);
      expect(draft.method).toBe("DETERMINISTIC_LOCAL");
    });
  });
});

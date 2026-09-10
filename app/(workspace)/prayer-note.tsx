'use client';

import React, { useState } from "react";
import { t, type SupportedLocale } from "../../packages/i18n/src/index.js";
import {
  DEFAULT_PRAYER_COMPONENTS,
  PrayerComponentId,
  PrayerType,
  assembleDeterministicPrayer,
  composePrayerPrompt,
  checkThirdPartyPrivacy,
  redactWithInitials,
  screenPrayerSafety,
  DeterministicPrayerDraft,
  getDefaultComponentIds,
  PRAYER_FRAME_DISCLAIMER_EN,
  PRAYER_FRAME_DISCLAIMER_KO,
} from "../../packages/prayer/src/index.js";

export function PrayerNote({
  locale = "en",
  isAnonymous = false,
}: {
  locale?: SupportedLocale;
  isAnonymous?: boolean;
}) {
  const isKo = locale === "ko";
  const [burden, setBurden] = useState("");
  const [prayerType, setPrayerType] = useState<PrayerType>("personal");
  const [freeForm, setFreeForm] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<PrayerComponentId[]>(getDefaultComponentIds());
  const [isEphemeral, setIsEphemeral] = useState(true); // Ephemeral is default for P2 (PR-P2-08)
  const [draft, setDraft] = useState<DeterministicPrayerDraft | null>(null);
  const [composedPrompt, setComposedPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Safety screening
  const safetyCheck = screenPrayerSafety(burden);

  // Third-party privacy check (PR-P2-10)
  const privacyCheck = checkThirdPartyPrivacy(burden, prayerType);

  const handleComponentToggle = (id: PrayerComponentId) => {
    if (selectedComponents.includes(id)) {
      setSelectedComponents(selectedComponents.filter(c => c !== id));
    } else {
      setSelectedComponents([...selectedComponents, id]);
    }
  };

  const handleUseInitials = () => {
    if (privacyCheck.detectedName && privacyCheck.initialsSuggestion) {
      setBurden(redactWithInitials(burden, privacyCheck.detectedName, privacyCheck.initialsSuggestion));
    }
  };

  const handleDraftLocally = () => {
    if (!burden.trim()) return;
    const result = assembleDeterministicPrayer({
      burden,
      prayerType,
      freeForm,
      components: selectedComponents,
      language: isKo ? "ko" : "en",
      isAnonymous,
      isEphemeral,
    });
    setDraft(result);
    setComposedPrompt(null);
  };

  const handlePreparePrompt = () => {
    if (!burden.trim()) return;
    const output = composePrayerPrompt({
      burden,
      prayerType,
      freeForm,
      components: selectedComponents,
      language: isKo ? "ko" : "en",
      isAnonymous,
      isEphemeral,
    });
    setComposedPrompt(output.prompt);
    setDraft(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "1.5rem",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        boxSizing: "border-box",
      }}
    >
      {/* Title & Ephemeral Notice */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h1 style={{ fontSize: "1.4rem", margin: 0, fontWeight: 700 }}>
            {t("tool_prayer_note", {}, { locale })}
          </h1>
          <span
            style={{
              fontSize: "0.8rem",
              padding: "2px 8px",
              borderRadius: "4px",
              backgroundColor: isEphemeral ? "var(--evidence-e3-bg)" : "var(--border-color)",
              color: isEphemeral ? "var(--evidence-e3-blue)" : "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            {isEphemeral ? t("mode_ephemeral", {}, { locale }) : t("mode_standard", {}, { locale })}
          </span>
        </div>

        {isAnonymous && (
          <div
            style={{
              fontSize: "0.85rem",
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              backgroundColor: "rgba(99, 102, 241, 0.08)",
              color: "var(--accent-primary)",
              marginBottom: "0.75rem",
              fontWeight: 500,
            }}
          >
            ✧ {t("p2_anonymous_draft_badge", {}, { locale })}
          </div>
        )}

        <div
          style={{
            fontSize: "0.85rem",
            padding: "0.6rem 0.8rem",
            borderRadius: "6px",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            color: "var(--text-secondary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>⚑ {t("p2_ephemeral_notice", {}, { locale })}</span>
          <button
            type="button"
            onClick={() => setIsEphemeral(!isEphemeral)}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent-primary)",
              cursor: "pointer",
              fontWeight: 600,
              padding: "0 4px",
            }}
          >
            [{isEphemeral ? "keep" : "change"}]
          </button>
        </div>
      </div>

      {/* Safety Screening Crisis Alert Banner */}
      {safetyCheck.flagged && (
        <div
          role="alert"
          style={{
            padding: "1rem",
            borderRadius: "8px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid var(--accent-red)",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--accent-red)", marginBottom: "0.5rem" }}>
            ⚠ {isKo ? safetyCheck.noticeKo : safetyCheck.noticeEn}
          </div>
          <ul style={{ margin: "0.5rem 0 0 1.25rem", padding: 0, fontSize: "0.9rem" }}>
            {safetyCheck.emergencyResources.map(r => (
              <li key={r.name} style={{ marginBottom: "0.25rem" }}>
                <strong>{r.name} ({r.region}):</strong> {r.contact} ({r.available})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Third-Party Privacy Warning (PR-P2-10) */}
      {privacyCheck.containsThirdPartyName && (
        <div
          role="region"
          aria-label="Third-party privacy warning"
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            border: "1px solid var(--evidence-e2-amber)",
            marginBottom: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
            ℹ {isKo ? privacyCheck.warningKo : privacyCheck.warningEn}
          </span>
          <button
            type="button"
            onClick={handleUseInitials}
            style={{
              marginLeft: "1rem",
              padding: "0.3rem 0.6rem",
              borderRadius: "4px",
              border: "1px solid var(--evidence-e2-amber)",
              backgroundColor: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.8rem",
            }}
          >
            {t("p2_privacy_initials_btn", {}, { locale })}
          </button>
        </div>
      )}

      {/* Burden Intake Box */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label htmlFor="p2-burden-input" style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem" }}>
          {t("p2_burden_label", {}, { locale })}
        </label>
        <textarea
          id="p2-burden-input"
          rows={4}
          value={burden}
          onChange={e => setBurden(e.target.value)}
          placeholder={t("p2_burden_placeholder", {}, { locale })}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            boxSizing: "border-box",
            fontFamily: "inherit",
            fontSize: "0.95rem",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Kind of Prayer Selector */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label htmlFor="p2-kind-select" style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem" }}>
          {t("p2_prayer_kind_label", {}, { locale })}
        </label>
        <select
          id="p2-kind-select"
          value={prayerType}
          onChange={e => setPrayerType(e.target.value as PrayerType)}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-primary)",
            fontSize: "0.9rem",
          }}
        >
          <option value="personal">{isKo ? "개인 기도 (Personal)" : "Personal"}</option>
          <option value="family">{isKo ? "가정 기도 (Family)" : "Family"}</option>
          <option value="intercessory">{isKo ? "중보 기도 (Intercessory)" : "Intercessory"}</option>
          <option value="corporate">{isKo ? "공동체/대표 기도 (Corporate)" : "Corporate / Public"}</option>
          <option value="confession">{isKo ? "회개와 고백 (Confession)" : "Confession"}</option>
          <option value="thanksgiving">{isKo ? "감사 기도 (Thanksgiving)" : "Thanksgiving"}</option>
        </select>
      </div>

      {/* Shape / Structure Selector */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ fontWeight: 600 }}>{t("p2_shape_label", {}, { locale })}</span>
          <button
            type="button"
            onClick={() => setFreeForm(!freeForm)}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent-primary)",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            {freeForm ? t("p2_structured_toggle", {}, { locale }) : t("p2_freeform_toggle", {}, { locale })}
          </button>
        </div>

        {!freeForm ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.5rem",
              padding: "0.75rem",
              backgroundColor: "var(--bg-sidebar)",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
            }}
          >
            {DEFAULT_PRAYER_COMPONENTS.map(comp => {
              const checked = selectedComponents.includes(comp.id);
              return (
                <label
                  key={comp.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleComponentToggle(comp.id)}
                  />
                  <span>{isKo ? comp.nameKo : comp.nameEn}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "var(--bg-sidebar)",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
            }}
          >
            {isKo
              ? "자유 형식 모드: 정해진 순서 없이 마음속의 고백과 성경 앵커를 중심으로 자유롭게 작성됩니다 (로마서 8:26)."
              : "Free-form mode: No fixed structure imposed. Pray naturally from the heart with Scripture anchors (Romans 8:26)."}
          </div>
        )}

        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>
          {isKo ? PRAYER_FRAME_DISCLAIMER_KO : PRAYER_FRAME_DISCLAIMER_EN}
        </div>
      </div>

      {/* Two Exits with Equal Visual Weight */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: "2rem",
        }}
      >
        <button
          type="button"
          onClick={handleDraftLocally}
          disabled={!burden.trim() || safetyCheck.flagged}
          style={{
            flex: "1 1 200px",
            padding: "0.8rem 1.25rem",
            backgroundColor: "var(--bg-card)",
            color: "var(--accent-primary)",
            border: "2px solid var(--accent-primary)",
            borderRadius: "8px",
            cursor: !burden.trim() || safetyCheck.flagged ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: "1rem",
            opacity: !burden.trim() || safetyCheck.flagged ? 0.6 : 1,
            transition: "all 0.15s ease-in-out",
          }}
        >
          {t("p2_draft_locally", {}, { locale })}
        </button>

        <button
          type="button"
          onClick={handlePreparePrompt}
          disabled={!burden.trim() || safetyCheck.flagged}
          style={{
            flex: "1 1 200px",
            padding: "0.8rem 1.25rem",
            backgroundColor: "var(--accent-primary)",
            color: "#fff",
            border: "2px solid var(--accent-primary)",
            borderRadius: "8px",
            cursor: !burden.trim() || safetyCheck.flagged ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: "1rem",
            opacity: !burden.trim() || safetyCheck.flagged ? 0.6 : 1,
            transition: "all 0.15s ease-in-out",
          }}
        >
          {t("p2_prepare_prompt", {}, { locale })}
        </button>
      </div>

      {/* Local Draft Display Card */}
      {draft && (
        <section
          aria-label="Generated prayer draft"
          style={{
            padding: "1.25rem",
            borderRadius: "8px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 700 }}>
              {isKo ? "기도 초안" : "Prayer Draft"}
            </h2>
            <button
              type="button"
              onClick={() => handleCopy(draft.prayerText)}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-primary)",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {copied ? "✓ Copied!" : "Copy Prayer"}
            </button>
          </div>

          <div
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              fontSize: "0.95rem",
              fontFamily: "inherit",
              marginBottom: "1rem",
            }}
          >
            {draft.prayerText}
          </div>

          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              borderTop: "1px solid var(--border-color)",
              paddingTop: "0.5rem",
            }}
          >
            {draft.notice}
          </div>
        </section>
      )}

      {/* Composed Prompt Preview Card */}
      {composedPrompt && (
        <section
          aria-label="Composed external AI prompt"
          style={{
            padding: "1.25rem",
            borderRadius: "8px",
            backgroundColor: "var(--bg-sidebar)",
            border: "1px solid var(--border-color)",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 700 }}>
              {isKo ? "외부 AI용 구성된 프롬프트" : "Composed AI Prompt"}
            </h2>
            <button
              type="button"
              onClick={() => handleCopy(composedPrompt)}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-primary)",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {copied ? "✓ Copied!" : "Copy Prompt"}
            </button>
          </div>

          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              backgroundColor: "var(--bg-primary)",
              padding: "0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              fontSize: "0.85rem",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {composedPrompt}
          </pre>
        </section>
      )}
    </div>
  );
}

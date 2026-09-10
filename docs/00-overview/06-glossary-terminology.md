# Glossary & Product Terminology

**Supporting document (§52)** · v1.1

This document is normative. Product copy, UI strings, documentation, and support material
must use these terms. Where a term is forbidden, the replacement is given.

---

## 1. Product names

| Canonical | Use | Never |
|---|---|---|
| **SDA AI Workspace** | The whole platform | "SDA GPT", "Adventist AI", "the app" in formal copy |
| **Prayer Note** | P2 | "Prayer Generator", "Prayer Builder" |
| **Spiritual Guidance** | P3 | "Counselling", "Counsellor", "Advisor", "Pastoral Care" — all imply a professional relationship we explicitly disclaim |
| **Pastor's Aids** | P4 | "Sermon Writer", "Sermon Generator" — the product assists preparation, it does not write sermons |

Internal codes P0/P2/P3/P4 appear in engineering documents only, never in the UI.

---

## 2. Core product vocabulary

| Term | Definition | Notes |
|---|---|---|
| **Workspace** | Our application surface: the left navigation, conversations, composer, ledger | Always distinguished from the External AI |
| **External AI** | The user's own ChatGPT / Claude / Gemini session, running outside our product | Never "our AI", never "the assistant" |
| **AI Assistant** | Forbidden as a name for our product's behaviour. Reserved for the user's external provider | Our deterministic responses are **Workspace guidance**, not an assistant |
| **Composed Prompt** | The deterministic text our Composer produces from a template version plus the user's input | Not "the prompt we generated with AI" |
| **Answer Intake** | The act of pasting an external AI's response back into a conversation | |
| **Claim** | One atomic assertion extracted from an answer | |
| **Claim Ledger** | The table of claims with status and evidence level | |
| **Status** | VERIFIED · PARTIALLY VERIFIED · TEXT CONSISTENT · NOT VERIFIED · CONTRADICTED · INSUFFICIENT EVIDENCE | Never shown without an Evidence Level. VERIFIED is E4-only |
| **Evidence Level** | E0–E4. What *kind* of evidence stands behind the status | Normative definitions in [43](../40-ai/43-source-verification-architecture.md) |
| **Source Check** | The action of opening the authoritative source for a citation | |
| **Verify Sources** | The action that opens a linked verification conversation | Title case in UI |
| **Source Directory** | The admin-managed table of external destinations and URL templates | |
| **EGW Catalogue** | Our bibliographic metadata for Ellen G. White works. Titles, not text | Never "EGW database", which implies content |
| **Canon Index** | The bundled Bible structural dataset | |
| **My Conversations** | The user's saved conversation list | |
| **Ephemeral** | Privacy mode where bodies are never persisted | |
| **Attestation** | A member's recorded statement that **they personally** confirmed a claim at an allowlisted official source (E4). Bound to a pinned Source Directory revision; only the claim's owner may make one | Not a check *we* performed — the word "you" is always present |

---

## 3. Terms that are forbidden in product copy

| Forbidden | Why | Say instead |
|---|---|---|
| "Verified against the EGW Library" (below E4) | False. See [SR-6.5](03-srs.md) | "Not yet verified against the official library" |
| "Verified" for a claim at E3 | E3 is consistency with text of unknown provenance, not verification | "Consistent with text you supplied in this session" |
| "We never store EGW text" | Overclaims. Message bodies may hold purported quotations | "We do not collect, ingest, host, index, or hold EGW text as a source" |
| "Proof"/"evidence" for the client commitment | Our server cannot verify it | "A marker your browser made" |
| "Guaranteed accurate" / "zero hallucination" | Cannot be guaranteed for an external model | "We check every reference we can check mechanically, and we tell you what we could not check" |
| "Our AI says" | We have no AI | "Your external AI returned" |
| "Search the EGW writings" (implying we search them) | We do not hold them | "Search the official EGW Library" (opens their site) |
| "Ellen White wrote" (for an unverified claim) | Fabrication risk | "This answer attributes the following to Ellen G. White. It has not been verified." |
| "Counselling", "therapy", "diagnosis", "treatment" | Regulated professional claims | "Spiritual reflection", "study support" |
| "Pastoral care" | Implies a ministerial relationship | "Preparation support" |

---

## 4. Korean terminology (normative)

Per the owner's requirement, and configurable per locale in the terminology table
(PR-I18N-09).

| Context | Korean | Notes |
|---|---|---|
| Normal prose reference to Ellen G. White | **화잇 선지자** | The configured default for `ko`. Used in generated prompts, product copy, and UI |
| Bibliographic metadata | `Ellen G. White` | Author field of a catalogue record retains the official English form |
| Work titles in citations | Official English title, optionally followed by a commonly used Korean title in parentheses | e.g. *The Desire of Ages* (시대의 소망) — the Korean title is displayed only where the catalogue record carries a verified Korean title; otherwise English only |
| Bible references | Standard Korean convention | 요한복음 3:16 · 로마서 5:3–5 · abbreviations 요 3:16, 롬 5:3–5 |
| The Bible | 성경 | |
| Official EGW Library | 화잇 선지자 저작물 공식 도서관 | Links to the official site |
| Prayer Note | 기도 노트 | |
| Spiritual Guidance | 영적 안내 | |
| Pastor's Aids | 목회자 도우미 | |
| Verify Sources | 출처 확인 | |
| Source Check | 원문 확인 | |

**Design note, offered neutrally:** some Korean Adventist readers expect 엘렌 화잇 or 화잇 부인,
and 선지자 carries a specific theological weight that not every reader will apply the same way.
Because this is a terminology *choice* rather than a technical constraint, it lives in a
configurable per-locale terminology table with **화잇 선지자 as the shipped default**, so the
owner or a future pastoral reviewer can change it in one place without a code change.
Bibliographic metadata is unaffected either way.

---

## 5. Bible citation conventions

Standard conventions only. No proprietary scheme (§9).

| Locale | Full | Abbreviated | Range | Multiple |
|---|---|---|---|---|
| `en` | John 3:16 | Jn 3:16 | Romans 5:3–5 | John 3:16; Rom 5:3–5 |
| `ko` | 요한복음 3:16 | 요 3:16 | 로마서 5:3–5 | 요한복음 3:16; 로마서 5:3–5 |
| `ja` | ヨハネ 3:16 | ヨハ 3:16 | ローマ 5:3–5 | — |
| `es` | Juan 3:16 | Jn 3:16 | Romanos 5:3–5 | — |

Rules:
- En-dash (–) is the canonical range separator on output; hyphen and em-dash are accepted on input.
- Chapter-only references are written `John 3`.
- Translation, when relevant, follows in parentheses: `John 3:16 (KJV)`.
- The canon index carries the full name-and-abbreviation table per locale; nothing is inferred at runtime.

---

## 6. EGW citation format

```
<Work Title>, p. <page>            — when page is verified
<Work Title>, ch. <chapter>        — when only chapter is known
<Work Title>                       — when neither is verified
```

Followed always by an evidence chip. Never followed by an invented page number. When page
information is unavailable, the UI renders:

> Page information not verified.

Korean prose form:

```
화잇 선지자, 《The Desire of Ages》, p. 331 — 확인되지 않음
```

The work title stays in its official English form inside the citation, with the Korean
title alongside only when the catalogue record carries one.

---

## 7. Evidence-level labels (user-facing)

| Level | English label | Korean label | Meaning |
|---|---|---|---|
| E0 | No source | 출처 없음 | Nothing was offered |
| E1 | Model recall — unverified | AI 기억 — 미확인 | The AI asserted it from memory |
| E2 | Model corroboration only | AI 상호 확인만 | A second AI agreed. Not source verification |
| E3 | Consistent with text you supplied | 제공된 원문과 일치 (세션 한정) | Matches text the member supplied this session. Provenance unknown. **Not verification, never green** |
| E4 | Confirmed by you at the official source | 공식 출처에서 회원이 직접 확인 | The claim's owner opened the source and confirmed. **The only rung that may be VERIFIED or green** |

The label must always be adjacent to the status. A status badge rendered alone is a defect.

# MVP Scope — SDA AI Workspace

**Document 32 of 37** · v1.1

---

## 1. The MVP thesis

The MVP must prove one thing:

> **Members will accept a copy-paste round trip in exchange for citation integrity.**

Everything in scope serves that proof. Everything that does not serve it is deferred, even
where it is easy. In particular, BYOK Direct Connect is deliberately *out* of the MVP —
because if the round trip is acceptable, BYOK is a large upgrade, and if it is not
acceptable, BYOK is a rewrite of the product's premise and should be decided with data.

---

## 2. In scope

### 2.1 Platform (P0)

- Email + password registration, verification, login, logout, password reset, password change.
- Session management with "sign out everywhere".
- Profile: display name, locale, timezone, self-declared role.
- Account deletion (7-day grace, then crypto-erase) and full data export.
- Three membership tiers with server-enforced entitlements and quotas.
- `BILLING_MODE=off` operation, so the platform is complete and usable before a payment
  provider is connected.
- Conversation CRUD: create, rename, archive, soft-delete, duplicate, client-side search.
- Two privacy modes per conversation: **Standard** (encrypted at rest) and **Ephemeral**
  (bodies never persisted).
- Consent record for external-AI disclosure.
- Admin console: users, memberships, roles, source directory, prompt templates, feature
  flags, emergency directory, announcements, audit log viewer.

### 2.2 The round trip

- Prompt Composer producing deterministic, source-bounded prompts from versioned templates.
- **Copy Prompt** with confirmation.
- **Open in <Provider>** for ChatGPT, Claude, Gemini — clipboard copy first, then new tab,
  with best-effort prefill where a template exists and the prompt is under the cap.
- **Paste Answer** intake with provider and optional model attribution.
- Clear, permanent visual separation between "our workspace" and "your external AI".

### 2.3 Citation integrity

- Bundled Bible canon index (66 books, chapter and verse counts, English + Korean names).
- Bible reference detection and validation in every message, with inline indicators.
- Bundled EGW bibliographic catalogue (~200 works: titles, abbreviations, publisher, year,
  page count of the reference edition, official URL template). **The catalogue holds no EGW
  text** — it is bibliographic metadata only.
- EGW citation normalisation and catalogue validation, with page-plausibility flag.
- Bundled KJV text module for verbatim verse comparison — **conditional on the
  [copyright determination](../60-risk/65-copyright-risk-analysis.md#5-kjv-and-the-crown-patent)**;
  if that determination is negative, MVP ships reference validation only and the verse-text
  comparison moves to Post-MVP behind a licensed source.
- Source Directory driving every external link; nothing hard-coded.

### 2.4 Verification

- **Verify Sources** action on any external answer.
- Linked verification conversation with return navigation.
- Deterministic claim extraction from the `SDAWS-CLAIMS-V1` block, with manual segmentation
  fallback.
- Claim Ledger with the six statuses and the five evidence levels, always displayed together.
- Verification prompt generation for the user's chosen verifier AI.
- Per-claim user attestation flow to reach E4.
- The rendering guard that makes it impossible for the UI to assert official-source
  verification below **E4**, plus the two database CHECK constraints and the `MATCH FULL`
  binding behind it.

### 2.5 Applications

- **P2 Prayer Note** — burden intake, optional structural frame, prayer-type selection,
  curated Scripture anchors, composed prompt, deterministic prayer skeleton, Ephemeral mode
  offered at start. Pastoral advisory review completed before release.
- **P3 Spiritual Guidance** — question intake, optional source attachment, five-band answer
  contract, denominational-sensitivity clause, non-professional disclaimer.
- **P4 Pastor's Aids** — no file upload; the twelve task types; the full parameter set;
  structured editable outlines; EGW *lead* discovery (never text); outline export; the
  pre-pulpit Citation Checklist.

### 2.6 Safety, privacy, security

- Client-side multilingual risk lexicon with a non-blocking resource panel.
- Configurable emergency resource directory with review dates.
- Per-user envelope encryption of message bodies.
- Log scrubbing with a canary test.
- Full authorisation module, IDOR sweep, CSRF, CSP, rate limits.
- The four-layer Cost Firewall.

### 2.7 Internationalisation

- English UI, fully externalised strings.
- Content-language detection per conversation and per turn; manual override in Settings.
- Prompts instruct the AI to answer in the user's content language.
- Korean terminology data with **화잇 선지자** as the configured default.
- Korean and English Bible citation conventions.

---

## 3. Out of scope for MVP (deferred, not rejected)

| Deferred item | Why | Target |
|---|---|---|
| BYOK Direct Connect | **Conditional, not scheduled.** Blocked on published provider sanction ([ADR-0020](../90-decisions/adr/0020-byok-conditional-on-official-support.md)) | — |
| Private (E2EE) conversation mode | Significant key-management and recovery UX; Ephemeral covers the urgent need | Phase 12 |
| Server-side full-text search | Conflicts with encryption-at-rest; client-side search suffices below ~2,000 conversations | Phase 13 |
| Google sign-in | Email/password is sufficient; adds a provider dependency | Phase 12 |
| Sermon Series grouping | Valuable but not needed to test the thesis | Phase 11 |
| UI translations (ko/ja/es/pt) | Externalisation is done in MVP; translation is a content task | Phase 11 |
| Organisation / church accounts | Different buyer, different billing model | Phase 14 |
| Mobile native apps | Responsive web covers it | Phase 15 |
| Additional Bible translations | Licensing work per translation | Phase 13 |
| Official EGW Estate API integration | Requires written permission we do not have | Conditional |
| Browser extension for answer capture | Provider ToS review required | Conditional, Phase 14 |

---

## 4. MVP feature gating by tier

| Capability | Free | Member | Pastor |
|---|---|---|---|
| P2 Prayer Note | ✓ | ✓ | ✓ |
| P3 Spiritual Guidance | ✓ | ✓ | ✓ |
| P4 Pastor's Aids | — | — | ✓ |
| Prompt generations / month | 20 | unlimited* | unlimited* |
| Verification runs / month | 3 | unlimited* | unlimited* |
| Conversation retention | 30 days | unlimited | unlimited |
| Ephemeral mode | ✓ | ✓ | ✓ |
| Export | — | ✓ | ✓ |
| Outline export (P4) | — | — | ✓ |
| Citation Checklist | — | — | ✓ |

\* "Unlimited" is subject to a fair-use ceiling enforced as a rate limit, not a quota, and
documented in the terms. Because the operator pays nothing per generation, these ceilings
exist only to bound storage and abuse — see [Membership Design §5](../30-identity/32-membership-design.md).

---

## 5. Definition of done for the MVP

The MVP ships when all of the following are true:

1. Every **M**-priority requirement in the [PRD](02-prd.md) passes its acceptance criterion
   in [73-acceptance-criteria.md](../70-quality/73-acceptance-criteria.md).
2. The Cost Firewall suite is green and a full month has elapsed with a $0.00 AI invoice.
3. The IDOR sweep covers 100% of id-accepting routes and is green.
4. The log-canary test is green across application logs, error reports, and metrics.
5. The false-verification red-team set (30 cases) produces zero UI strings asserting
   official-source verification below E4.
6. The citation-validator evaluation set reaches ≥98% recall on fabricated Bible references
   and ≥95% recall on fabricated EGW work titles ([Evaluation Strategy](../70-quality/72-evaluation-strategy.md)).
7. Pastoral advisory review of P2 and P3 templates is signed off and recorded.
8. Legal review of the [copyright](../60-risk/65-copyright-risk-analysis.md) and
   [privacy](../60-risk/61-privacy-architecture.md) postures is complete, with the KJV
   bundling question closed by [ADR-0021](../90-decisions/adr/0021-no-bundled-verse-text.md) — no verse text ships.
9. Terms of Service, Privacy Policy, and the external-AI disclosure are published.
10. Backup restore has been rehearsed end-to-end at least once with a documented time.
11. WCAG 2.2 AA verified on: registration, login, new chat, compose, copy/launch, paste,
    verify, claim ledger, settings, delete account.

---

## 6. Negative scope and how each exclusion is enforced

Every item in the mandated exclusion list (§67) is restated here with the mechanism that
prevents it from appearing by accident.

| Excluded | Enforcement |
|---|---|
| EGW corpus hosting | Schema has no corpus table; SR-D2 caps; SR-D3 accretion tripwire; code review checklist item |
| EGW PDF ingestion | No file upload exists anywhere in the product; no PDF library in dependencies |
| EGW OCR | No OCR dependency permitted; CI denylist includes `tesseract*`, `pdf-parse`, `pdfjs-dist` on the server |
| EGW scraping | No server-side fetch of user or external URLs (SR-7.4, SR-10.4); egress allowlist excludes egwwritings.org |
| EGW mirroring | Same as above; reachability probe is `HEAD` only and stores a status code |
| EGW embeddings | No embedding library, no vector column, no `pgvector` extension enabled |
| EGW vector database | Not provisioned; architecture review gate |
| EGW RAG database | Not provisioned |
| EGW MCP server | Not built; no MCP server in the deployment manifest |
| Unofficial AI website automation | No headless browser dependency (`puppeteer`, `playwright` permitted in dev/test only, blocked in production dependency tree) |
| ChatGPT/Claude/Gemini credential collection | No field, form, column, or endpoint accepts a provider credential; secret-scan patterns for provider key formats fail CI |
| Application-owned LLM inference | Four-layer Cost Firewall (SR-10.1–10.4) |
| Hidden AI API calls | Egress allowlist + runtime security event on any denied connection |
| Automatic third-party scraping | No crawler, no scheduler task that fetches content |
| Bulk EGW reproduction | Per-block and per-conversation source caps; no bulk export of source text; no cross-user source aggregation view |
| Full-book reproduction | Same caps; catalogue holds page counts, never pages |
| File uploads in P4 | No upload component, no multipart route, no object storage bucket for user content at MVP |
| AI-generated fabricated citations | Cannot be fully prevented in the external model; mitigated by deterministic validation, evidence levels, the **E4 floor** for verification claims, and the pre-pulpit checklist. **This is stated as mitigation, not elimination.** |

---

## 7. What could still go wrong even if the MVP ships perfectly

- Members may find the round trip too tedious and churn. (R-02)
- The verification workflow may be used once and abandoned as ceremony. (Success metric in
  [Product Vision §8](01-product-vision.md#8-success-defined) is the tripwire.)
- Provider deep links may break, degrading the launch step to plain copy.
- Willingness to pay may be low because the AI is not included. (R-01)

None of these are engineering failures. All of them are why the MVP is scoped to be small
enough to learn from.

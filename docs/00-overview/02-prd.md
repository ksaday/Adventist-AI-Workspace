# Product Requirements Document — SDA AI Workspace

**Document 3 of 37** · v1.1

Requirement IDs are stable and referenced from the
[Traceability Matrix](../70-quality/74-traceability-matrix.md) and
[Acceptance Criteria](../70-quality/73-acceptance-criteria.md).

Priority: **M** = MVP (must ship) · **S** = should, MVP if cheap · **P** = Post-MVP · **C** = conditional, blocked on an external gate that may never open · **X** = explicitly excluded

---

## 1. Personas and jobs-to-be-done

| Persona | Primary app | Job |
|---|---|---|
| Member (lay) | P2, P3 | "Help me pray about this / understand this, without being lied to about what the sources say" |
| Pastor | P4, P3 | "Help me prepare, and make sure I never quote something that doesn't exist" |
| Teacher / elder | P4, P3 | "Help me build a lesson with discussion questions" |
| Administrator | Admin console | "Operate the service without reading anyone's private conversations" |

---

## 2. Platform requirements (P0)

### 2.1 Accounts and identity

| ID | Requirement | Pri |
|---|---|---|
| PR-ACC-01 | A visitor can register with email + password. Registration is mandatory before any tool use. | M |
| PR-ACC-02 | Email address must be verified before the account can generate prompts. Unverified accounts may browse the product tour only. | M |
| PR-ACC-03 | A user can log in, log out, and log out of all other sessions. | M |
| PR-ACC-04 | A user can reset a forgotten password via a single-use, time-limited email link. | M |
| PR-ACC-05 | A user can change their password; doing so revokes all other sessions. | M |
| PR-ACC-06 | A user can enable TOTP two-factor authentication. | S |
| PR-ACC-07 | A user can sign in with Google. | P |
| PR-ACC-08 | A user can edit a profile: display name, locale, timezone, role self-declaration (member / pastor / teacher). | M |
| PR-ACC-09 | A user can permanently delete their account. Deletion removes or cryptographically erases all personal content within 30 days and is irreversible after a 7-day grace period. | M |
| PR-ACC-10 | A user can export all their data as a single JSON + Markdown archive. | M |
| PR-ACC-11 | Role self-declaration as "pastor" grants no entitlement by itself; P4 access is governed by membership tier, not self-declaration. | M |

### 2.2 Membership

| ID | Requirement | Pri |
|---|---|---|
| PR-MEM-01 | Three tiers at launch: **Free**, **Member**, **Pastor**. Definitions in [Membership Design](../30-identity/32-membership-design.md). | M |
| PR-MEM-02 | Entitlements are enforced server-side on every request. Client-side gating is presentation only. | M |
| PR-MEM-03 | Free tier: P2 and P3 access, 20 prompt generations/month, 30-day conversation retention, 3 verification runs/month. | M |
| PR-MEM-04 | Member tier: unlimited P2/P3, unlimited retention, unlimited verification, export. | M |
| PR-MEM-05 | Pastor tier: everything in Member plus P4, sermon series organisation, and outline export. | M |
| PR-MEM-06 | A user can view current tier, renewal date, and usage against quota. | M |
| PR-MEM-07 | A user can upgrade, downgrade, and cancel. Cancellation is effective at period end; access continues until then. | M |
| PR-MEM-08 | On downgrade or expiry, content over the new retention limit becomes read-only and export-only for 60 days before deletion, never silently destroyed. | M |
| PR-MEM-09 | The platform must run end-to-end with billing disabled (`BILLING_MODE=off`), granting all users a configurable default tier, so development and pilot operation need no payment provider. | M |
| PR-MEM-10 | Quota counters reset monthly on the anniversary of subscription start, not calendar month. | S |

### 2.3 Conversations

| ID | Requirement | Pri |
|---|---|---|
| PR-CONV-01 | New Chat, per application (P2/P3/P4). | M |
| PR-CONV-02 | Conversations persist with: id, title, owner, app type, language, privacy mode, created/updated timestamps, archived flag. | M |
| PR-CONV-03 | Auto-generated title from the first user turn (deterministic: first ~48 characters, sentence-boundary aware, no AI). User can rename. | M |
| PR-CONV-04 | Delete (soft, 30-day recoverable, then hard), Archive, Duplicate. | M |
| PR-CONV-05 | Client-side search across the user's conversation list by title and tag. | M |
| PR-CONV-06 | Continue an existing conversation with additional turns. | M |
| PR-CONV-07 | Export one conversation or all conversations to Markdown and JSON. | M |
| PR-CONV-08 | Per-conversation privacy mode: **Standard** (stored, encrypted at rest with per-user key) or **Ephemeral** (metadata only; bodies never written to the database). | M |
| PR-CONV-09 | **Private** mode: end-to-end encrypted with a user passphrase, undecryptable by the operator. | P |
| PR-CONV-10 | Server-side full-text search across conversations. | P |
| PR-CONV-11 | Verification conversations are linked to, and navigable back from, their origin conversation. | M |

### 2.4 The AI round trip

| ID | Requirement | Pri |
|---|---|---|
| PR-AI-01 | The application never calls a third-party LLM API from server code. Enforced by CI. | M |
| PR-AI-02 | For any composed prompt, the user can **Copy Prompt** to clipboard in one action, with visible confirmation. | M |
| PR-AI-03 | The user can **Open <Provider>** — a new tab to their chosen provider, with best-effort prompt prefill where the provider supports a query parameter, always preceded by a clipboard copy so prefill failure is harmless. | M |
| PR-AI-04 | Provider list, deep-link templates, prefill length caps, and enable/disable flags are runtime configuration, changeable without a deploy. | M |
| PR-AI-05 | The user can paste the AI's answer back into the conversation via a prominent **Paste Answer** affordance. | M |
| PR-AI-06 | Pasted answers are stored as `assistant_external` messages with recorded provider, model (if the user states it), and timestamp. | M |
| PR-AI-07 | The UI must at all times make clear which surface is *our application* and which is *the user's external AI*. Distinct visual treatment is mandatory, not decorative. | M |
| PR-AI-08 | Before a user first sends content to an external provider, an explicit consent disclosure is shown and the acceptance recorded. | M |
| PR-AI-09 | **BYOK Direct Connect**: conditional, opt-in, browser-only. The user's API key is stored in browser storage, never transmitted to our servers, and used for direct browser→provider calls yielding in-app streaming. **Blocked until a provider's published documentation sanctions browser-origin calls with an end-user key** ([ADR-0020](../90-decisions/adr/0020-byok-conditional-on-official-support.md)); vendor silence is not consent. The per-call cost to the member is disclosed before the first call. | C |
| PR-AI-10 | The application must never store third-party AI passwords, cookies, session tokens, or server-side API keys. | M |
| PR-AI-11 | No iframe embedding of any AI provider. No automation, scraping, or private-API use. | X |

### 2.5 Source discipline and verification

| ID | Requirement | Pri |
|---|---|---|
| PR-SRC-01 | Every Bible reference detected in any message is validated against a bundled canon index (book exists, chapter exists, verse range valid) and rendered with a validity indicator. | M |
| PR-SRC-02 | Every Ellen G. White work title or abbreviation detected is normalised and validated against a bundled bibliographic catalogue (title, abbreviation, author, publisher, year, canonical URL). **The catalogue holds no EGW text** — it is bibliographic metadata only. | M |
| PR-SRC-03 | A page number cited for a catalogued work is checked for plausibility against the recorded page count of the reference edition, and flagged — never silently accepted, never invented. | S |
| PR-SRC-04 | A user can open the official EGW Library, pre-filtered to the cited work where a URL template exists. | M |
| PR-SRC-05 | A user can open a KJV reader at a cited verse. | M |
| PR-SRC-06 | **Verify Sources** creates a linked verification conversation containing the original question, the original answer, extracted claims, and a generated verification prompt. | M |
| PR-SRC-07 | Claims are extracted deterministically from a machine-readable block the composed prompt instructs the external AI to emit; if the block is absent or malformed, the user splits claims manually with an assisted UI. | M |
| PR-SRC-08 | Each claim carries a **status** (VERIFIED / PARTIALLY_VERIFIED / TEXT_CONSISTENT / NOT_VERIFIED / CONTRADICTED / INSUFFICIENT_EVIDENCE) **and** an **evidence level** (E0–E4). Status may never be displayed without its evidence level. VERIFIED and PARTIALLY_VERIFIED are permitted at **E4 only**; TEXT_CONSISTENT at **E3 only**. | M |
| PR-SRC-09 | The product must never render text claiming that a source was checked at the official EGW Library unless an **E4** evidence record exists for that claim. An E3 record permits only the phrasing *"consistent with text you supplied"* — never a verification verb, in any language. | M |
| PR-SRC-10 | A user can attest, per claim, that **they personally** confirmed it at the official source, recording URL and timestamp (evidence level E4). The attestation is bound to a pinned revision of an attestation-eligible, active Source Directory entry whose host matches and beneath whose canonical path prefix the URL sits; one that fails is rejected with an explanation, never silently downgraded. Only the claim's own owner may attest. | M |
| PR-SRC-11 | User-supplied source text is **never transmitted to or stored by our server** ([ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md)). It lives in the member's browser for the working session. The product states at the paste target that the text — and the E3 determination made from it — will not survive the session, and that re-checking means re-pasting. | M |
| PR-SRC-12 | Source-first workflow: the user may supply sources *before* asking, producing a prompt bounded to those sources. | M |
| PR-SRC-13 | Answer-first workflow: ask normally, then verify. This is the default path. | M |

### 2.6 Safety

| ID | Requirement | Pri |
|---|---|---|
| PR-SAF-01 | A deterministic multilingual risk lexicon screens user input for crisis indicators (suicide, self-harm, abuse, violence, medical emergency) before prompt generation. | M |
| PR-SAF-02 | On a match, a non-blocking, dismissible resource panel is shown with locale-appropriate emergency contacts from a configurable directory. The user is never prevented from continuing. | M |
| PR-SAF-03 | Generated prompts in P2/P3 include a standing instruction that the AI is not a substitute for professional or emergency care and must surface local emergency resources when a crisis is indicated. | M |
| PR-SAF-04 | The product never claims to be, and its prompts instruct the external AI never to role-play as, a physician, therapist, licensed counsellor, lawyer, or ordained pastor. | M |
| PR-SAF-05 | Safety triggers are logged as an event type and locale only — never the triggering text, never a persistent per-user risk label. | M |
| PR-SAF-06 | The emergency resource directory is admin-editable with a per-entry `last_reviewed` date; entries older than 12 months surface an admin warning. | M |

### 2.7 Internationalisation

| ID | Requirement | Pri |
|---|---|---|
| PR-I18N-01 | UI default language is **English**. All chrome, labels, buttons, settings and help text are English at MVP. | M |
| PR-I18N-02 | All UI strings are externalised into message catalogues from day one; no hard-coded user-facing strings. | M |
| PR-I18N-03 | User content may be entered in any language. Content language is detected per conversation and per turn. | M |
| PR-I18N-04 | Generated prompts instruct the external AI to answer in the detected content language. | M |
| PR-I18N-05 | Settings offer a manual content-language override that takes precedence over detection. | M |
| PR-I18N-06 | Korean prompts and Korean product prose refer to Ellen G. White as **화잇 선지자**; bibliographic metadata retains official English titles and author name. | M |
| PR-I18N-07 | Bible citations follow standard conventions in the user's language (John 3:16 / 요한복음 3:16). No proprietary citation scheme. | M |
| PR-I18N-08 | UI translations for Korean, Japanese, Spanish, Portuguese. | P |
| PR-I18N-09 | The terminology used for Ellen G. White per locale is configurable data, not a hard-coded string. | M |

### 2.8 Administration

| ID | Requirement | Pri |
|---|---|---|
| PR-ADM-01 | Admin console for users, memberships, roles, account status. | M |
| PR-ADM-02 | Admins see conversation **metadata** (count, app, timestamps, language) — never bodies — by default. | M |
| PR-ADM-03 | Any access to conversation content requires an explicit break-glass action with a stated reason, is written to a tamper-evident audit log, and notifies the affected user by email within 24 hours. | M |
| PR-ADM-04 | Admin management of the Source Directory (name, URL template, language, purpose, status, last reviewed). | M |
| PR-ADM-05 | Admin management of versioned prompt templates with publish/rollback and change notes. | M |
| PR-ADM-06 | Admin management of feature flags, provider deep links, announcements, and the emergency resource directory. | M |
| PR-ADM-07 | Audit log viewer, filterable, append-only, exportable. | M |
| PR-ADM-08 | Admin actions require re-authentication within the last 15 minutes. | M |

---

## 3. P2 — Prayer Note

| ID | Requirement | Pri |
|---|---|---|
| PR-P2-01 | The user enters a prayer burden in free text, in any language. | M |
| PR-P2-02 | The workspace offers a structural frame with all components optional and reorderable: address to God, praise, thanksgiving, confession, petition, intercession, submission to God's will, closing. | M |
| PR-P2-03 | The default frame is anchored in the Lord's Prayer (Matthew 6:9–13) and compatible with the widely used Adoration–Confession–Thanksgiving–Supplication pattern. It is presented as **one helpful pattern, not a required formula.** | M |
| PR-P2-04 | The frame, its scriptural anchors, and its accompanying copy must pass a documented pastoral advisory review before first release. | M |
| PR-P2-05 | The user can choose: personal prayer, family prayer, intercessory prayer for another, corporate/public prayer, prayer of confession, prayer of thanksgiving. | M |
| PR-P2-06 | Output is a composed prompt the user takes to their AI, plus a ready-to-pray draft skeleton assembled deterministically from the user's own words and their selected Scripture anchors. | M |
| PR-P2-07 | Scripture suggestions come from a curated, human-authored topical index of Bible **references only** — no verse text is bundled ([ADR-0021](../90-decisions/adr/0021-no-bundled-verse-text.md)), and the topical index holds no EGW text. | M |
| PR-P2-08 | Prayer content is treated as maximally sensitive: Ephemeral privacy mode is offered prominently at conversation start. | M |
| PR-P2-09 | The product must not assert that any particular prayer structure is doctrinally mandated. Help text must state that Scripture presents prayer as relationship, not formula. | M |
| PR-P2-10 | Intercessory prayer for a named third party warns the user before storing another person's identifiable details and offers initials-only entry. | S |

---

## 4. P3 — Spiritual Guidance

| ID | Requirement | Pri |
|---|---|---|
| PR-P3-01 | Free-text spiritual, biblical, or personal-situation question in any language. | M |
| PR-P3-02 | The composed prompt requires the external AI to segment its answer into five labelled bands: (1) what the user stated, (2) Scripture, (3) Ellen G. White material — only if supplied or explicitly marked as unverified recall, (4) AI synthesis, (5) uncertain or unsupported. | M |
| PR-P3-03 | The intake offers, but does not require, attaching source material: pasted passage, Bible reference, EGW citation, or URL. | M |
| PR-P3-04 | With sources attached, the prompt switches to **source-bounded mode**: the AI is instructed to reason only from supplied material and to state plainly when the material is insufficient. | M |
| PR-P3-05 | The answer view renders each band with distinct visual weight; band 5 is never visually minimised. | M |
| PR-P3-06 | Denominationally sensitive topics (Sabbath, sanctuary, state of the dead, spirit of prophecy, health message, last-day events, standards) trigger a prompt clause requiring the AI to represent the Seventh-day Adventist position accurately, to distinguish denominational teaching from personal opinion, and to defer to the user's local pastor for pastoral rulings. | M |
| PR-P3-07 | The product must not present itself as a pastor, counsellor, therapist, physician, or lawyer, and must include a persistent, unobtrusive statement to that effect. | M |
| PR-P3-08 | Personal-crisis content triggers PR-SAF-01/02 before prompt generation. | M |

---

## 5. P4 — Pastor's Aids

| ID | Requirement | Pri |
|---|---|---|
| PR-P4-01 | **No file upload of any kind.** Input is prompt, text fields, and conversation only. | M |
| PR-P4-02 | Task types: sermon topic exploration · Bible passage discovery · EGW reference discovery (leads to look up, never text) · sermon outline · sermon points · Bible-study outline · devotional outline · discussion questions · thematic comparison · application ideas · sermon refinement · source verification. | M |
| PR-P4-03 | Controllable parameters: topic · anchor passage · audience · occasion · duration · number of points · homiletic form (expository / textual / topical / narrative) · tone · depth · Bible emphasis · EGW emphasis (none / light / moderate) · outline format · output language · preferred translation. | M |
| PR-P4-04 | The UI must state that these parameters shape form and intent only and are never sources of truth. | M |
| PR-P4-05 | "EGW reference discovery" returns *leads* — work title, chapter or theme, and a link to search the official library — and must never return purported EGW text. Any purported quotation appearing in a pasted answer is marked E1 (unverified model recall) until the user supplies or confirms the source. | M |
| PR-P4-06 | Sermon outlines are assembled in the app as structured, editable objects (title, thesis, points, sub-points, illustrations placeholder, appeal), not as an opaque blob of text. | M |
| PR-P4-07 | Export a completed outline to Markdown, plain text, and print-friendly HTML. **Every exported citation carries its evidence level and, where E4, the confirming person and date** — or it carries no status at all. An outline is read by people who did not do the confirming. | M |
| PR-P4-08 | Group conversations into a **Series** (e.g. a four-part evangelistic series) with shared parameters. | S |
| PR-P4-09 | A pre-pulpit **Citation Checklist** listing every Bible reference and EGW citation in the outline with its evidence level, and blocking "mark ready" while any citation the pastor has marked for verbatim public quotation sits below **E4**. This applies to Scripture as well as EGW: no verse text is bundled ([ADR-0021](../90-decisions/adr/0021-no-bundled-verse-text.md)), so a verbatim Scripture quotation has exactly as little machine backing as an EGW one. | M |
| PR-P4-10 | Document upload, audio, and slide generation. | X (MVP) / P |

---

## 6. Cross-cutting non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| PR-NFR-01 | Median server response time for interactive routes | < 300 ms p50, < 800 ms p95 |
| PR-NFR-02 | Prompt composition (client-side) | < 100 ms for a 4,000-character prompt |
| PR-NFR-03 | Availability | 99.5% monthly, excluding announced maintenance |
| PR-NFR-04 | Recovery Point Objective / Recovery Time Objective | RPO 24 h (MVP), RTO 8 h |
| PR-NFR-05 | Supported browsers | Last 2 major versions of Chrome, Edge, Safari, Firefox; iOS Safari 16+ |
| PR-NFR-06 | Responsive | Desktop-first; fully usable at 375 px width |
| PR-NFR-07 | Accessibility | WCAG 2.2 AA for all core flows |
| PR-NFR-08 | Owner-paid AI inference cost | **$0.00 per conversation, structurally** |
| PR-NFR-09 | Fixed monthly infrastructure at ≤1,000 members | ≤ US$60 |
| PR-NFR-10 | All personal content encrypted in transit (TLS 1.2+) and at rest (per-user envelope encryption for message bodies) | Mandatory |
| PR-NFR-11 | No raw user prompt text in application logs, error reports, or metrics | Mandatory, enforced by log scrubber + test |

---

## 7. Out of scope for MVP

Mobile native apps · organisation/church accounts and seat management · real-time
collaboration · voice input · sermon audio · slide deck generation · file upload anywhere ·
server-side full-text search · public sharing of conversations · a community or forum ·
in-app payments outside the chosen provider's hosted flow · any EGW content storage in any
form · any application-owned model inference.

---

## 8. Dependencies and assumptions

| Assumption | If false |
|---|---|
| The official EGW Library remains publicly accessible without login for reading | Deep links degrade to a search-page link; product still functions |
| Provider deep-link prefill (`?q=`) continues to work for at least one major provider | Copy-to-clipboard fallback covers 100% of cases; UX degrades, function does not |
| KJV text may be redistributed by the operator in its target markets | Ship reference-validation only, drop bundled verse text; see [Copyright Risk Analysis §5](../60-risk/65-copyright-risk-analysis.md) |
| Members will accept a copy-paste round trip | This is the single largest product risk; see [Risk Register R-02](../60-risk/67-risk-register.md) |

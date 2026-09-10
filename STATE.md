# STATE.md — where the work actually is

**Updated:** 2026-09-10 · **Package version:** 1.1

For a session starting with no history. Read [`AGENTS.md`](AGENTS.md) for the rules;
this file is the situation.

---

## Status in one line

**Phase 7 (Source Verification & Attestation) implemented and verified.** Verification conversations with bidirectional links and origin tombstones (SR-6.7); claim block parser with total-failure semantics and manual segmentation; claim ledger with mandatory pairing of status and evidence level chip; normative evidence state machine (`mayAssertOfficialVerification` using strict equality, `permittedStatuses`, `assertLegalStatusLevel`, `raise`); verifier output parser (`SDAWS-VERIFY-V1`) and merge engine with basis cross-checking against supplied source presence; attestation binding to pinned Source Directory revisions, WHATWG-canonicalized URL, strict host match, and directory path prefix (`starts_with` and `length > prefix.length`, bare prefix/search/sibling rejected, dot/%2e/backslash/empty escapes rejected); actor ownership invariant (`actor_id = user_id`); database migration `0004_phase7_evidence.sql` with CHECK constraints and `MATCH FULL` composite foreign key; Three-Column Honesty Contract in-product; and full 10-vector false-verification red-team suite. All Phase 7 exit criteria pass (158/158 tests green, `check-docs.sh` clean). Next is Phase 8 (Security hardening and administration).

---

## What just happened

### Phase 7 Source Verification & Attestation completed
- **Source Directory Dataset & Service** (`data/source-directory/source-directory.v1.json`, `packages/evidence/src/directory.ts`, `server/domain/source-directory.ts`):
  - Append-only revision series with pinned entries (SR-7.1, SR-7.2): `egw_library_read` (host `egwwritings.org`, prefix `/read/`, attestation-eligible: true, active), `egw_search_landing` (attestation-eligible: false), `adventist_archives` (GC Archives), `bri_research` (Biblical Research Institute).
- **Domain Models & State Machine** (`packages/evidence/src/types.ts`, `packages/evidence/src/state-machine.ts`):
  - Levels: `E0` (no source), `E1` (model recall), `E2` (corroboration), `E3` (supplied-text consistency), `E4` (confirmed by you at official source).
  - Permitted statuses matrix: E0/E1 (`NOT_VERIFIED`, `INSUFFICIENT_EVIDENCE`), E2 (`NOT_VERIFIED`, `INSUFFICIENT_EVIDENCE`, `CONTRADICTED`), E3 (includes `TEXT_CONSISTENT`), E4 (includes `VERIFIED`, `PARTIALLY_VERIFIED`).
  - Strict equality rendering guard: `mayAssertOfficialVerification(level === 'E4')`. Ordinal comparisons strictly forbidden.
  - `raise(current, next)` allows automated progression E0→E1→E2 only; requires recorded `source_block_ref_id` for E3 and owner-matched attestation (`actor_id = user_id`) for E4.
- **Attestation Guard & URL Canonicalizer** (`packages/evidence/src/attestation.ts`):
  - WHATWG URL parse: forces HTTPS scheme, rejects credentials/userinfo, rejects explicit ports (including 443), rejects raw IP and localhost addresses.
  - Path escape detection: rejects dot segments (`..`, `.`), encoded dot segments (`%2e`), backslashes (`\`), and empty segments (`//`).
  - Exact host match: rejects lookalike domains (`egwwritings.org.attacker.com`, `evangelicalegwwritings.org`).
  - Directory path prefix: requires `starts_with(path, prefix)` and `length(path) > length(prefix)`. Bare prefix (`/read/`), homepage (`/`), search page, and sibling prefixes (`/reading/`) strictly rejected.
  - Rejection with explanation: returns actionable reason codes, never silently downgrading.
- **Verifier Block Parser & Merge Engine** (`packages/evidence/src/verifier-parser.ts`, `packages/compose/src/templates/verify.ts`):
  - Parses `SDAWS-VERIFY-V1` code fence with fail-closed total failure semantics.
  - Basis cross-checking: verifier claiming `compared-to-supplied-text` without source blocks in conversation is downgraded to E2 with an explanatory ledger note.
  - Disagreement produces `CONTRADICTED` at E2; agreement leaves status `NOT_VERIFIED` at E2.
- **Database Schema Migration** (`server/data/migrations/0004_phase7_evidence.sql`):
  - DDL for `source_directory_entry`, `source_directory_entry_revision`, cross-table deferred FK `current_revision_exists`, `verification` (with `origin_tombstone`), `claim`, and `evidence_record`.
  - Enforces `verified_requires_member_confirmation`: `status NOT IN ('VERIFIED','PARTIALLY_VERIFIED') OR evidence_level = 'E4'`.
  - Enforces `text_consistent_is_e3_only`: `status <> 'TEXT_CONSISTENT' OR evidence_level = 'E3'`.
  - Enforces `e4_requires_bound_attestation`: complete non-null composite fields, `actor_id = user_id`, path prefix length check, escape regexes.
  - Enforces `e4_binds_to_directory_revision`: composite FK to directory revision with `MATCH FULL`.
- **Claim Ledger & Verification Service** (`server/domain/evidence.ts`):
  - Bidirectional origin conversation links with automatic tombstoning upon origin deletion (SR-6.7).
  - Claims persistence at E1 model recall initially.
  - Strict owner check along the whole chain: claim → evidence → attester (`actor_id = user_id`).
- **Interactive UI & Honesty Contract** (`app/(workspace)/verification-workbench.tsx`, `app/(workspace)/workspace-shell.tsx`):
  - Three-column honesty contract modal displaying the exact table from Verification Architecture §3.
  - Mandatory pairing of status badge and evidence level chip; E4 green, E3 blue, E2 amber, contradicted red.
  - Deterministic findings (Bible canon check, EGW catalogue check, page plausibility) render first before AI options (Exit Criterion 4).
  - Attestation modal with live URL canonicalization and source directory validation.
  - Full English and Korean translation parity in `packages/i18n/src/catalogues.ts`.
- **All Phase 7 Exit Criteria verified via test suite** (`npm test` — 158/158 tests passing):
  1. The false-verification red-team suite passes with zero failures across all 10 adversarial vectors.
  2. Database constraints reject VERIFIED below E4, TEXT_CONSISTENT outside E3, and partially-NULL rows via MATCH FULL.
  3. Catalogue lint finds no verification-claiming string without the E4 guard.
  4. Deterministic findings render before any AI action.
- **Integrated CI pipeline green**: `npm run ci` passes (`typecheck` + `lint` + `check:firewall` + `test` + `./scripts/check-docs.sh`).

### Phase 6 P4 Pastor's Aids completed (Prior)
- **Parameter Panel & Live Validation** (`packages/pastor/src/types.ts`, `app/(workspace)/pastors-aids.tsx`):
  - 13 controllable homiletic parameters: topic, anchor passage, occasion, audience, duration (15-60 min), point count (1-5), homiletic form (expository/textual/topical/narrative), tone, depth, Bible emphasis (1-5), EGW emphasis (none/light/moderate), outline format, and preferred translation (PR-P4-03).
  - Live Protestant 66-book canon validation on the anchor-passage field before any AI prompt is generated (UX §6.3).
  - Explicit theological disclaimer (PR-P4-04): parameters shape form and intent only and never change what Scripture or Ellen G. White actually says.
- **12 Homiletic & Study Task Types** (`packages/pastor/src/composer.ts`):
  - Implements templates for all 12 tasks per PR-P4-02 & Template Library §6: `sermon_outline` (`p4.sermon.outline`), `sermon_topic_explore`, `bible_passage_discover`, `egw_reference_discovery` (`p4.egw.leads`), `sermon_points`, `biblestudy_outline`, `devotional_outline`, `discussion_questions`, `thematic_comparison`, `application_ideas`, `sermon_refinement`, `source_verification`.
  - **PR-P4-05 EGW leads mode enforced**: provides work and chapter/theme leads to search in the official library; never reproduces text. Leads marked as unverified recall.
  - Anti-fabrication instruction for pastoral anecdotes: requests the *kind* of illustration needed rather than inventing fictional anecdotes (Template Library §6.1 point 6).
- **Structured Outline Workspace & Parser** (`packages/pastor/src/parser.ts`):
  - Parses external AI output into structured, editable objects: title, thesis, points, sub-points, illustration placeholders, closing appeal, and discussion questions (PR-P4-06).
  - Auto-detects Scripture references and EGW citations from outline points to populate the Pre-pulpit Citation Checklist.
- **Pre-Pulpit Citation Checklist Engine** (`packages/pastor/src/checklist.ts`):
  - Evaluates readiness to preach based on citation evidence levels (PR-P4-09).
  - **Strict blocking rule (Exit Criterion 1)**: Any citation marked for verbatim pulpit quotation sitting below **E4** strictly blocks "Mark Ready to Preach".
  - Enforces Invariant 3 / ADR-0019: **E3 is TEXT_CONSISTENT and does NOT verify**; E3 citations marked for verbatim quotation also block.
  - Supports two resolution paths:
    1. Personal attestation at an official source (`attestCitation`), raising evidence level to E4 with confirming person and timestamp.
    2. Paraphrase (`paraphraseCitation`), unmarking the citation from verbatim quotation.
- **Multi-Format Outline Exporter** (`packages/pastor/src/export.ts`):
  - Exports completed outlines to three distinct formats (Exit Criterion 2):
    1. GitHub-flavored Markdown.
    2. Clean indented Plain Text.
    3. Standalone print-friendly HTML with `@media print` styling.
  - **Invariant compliance (PR-P4-07)**: Every exported citation carries its evidence level and, where E4, the confirming person and date.
- **Audited No File Upload Invariant** (`test/pastor/no-file-upload-audit.test.ts`):
  - Validates Exit Criterion 3 & PR-P4-01: zero file upload endpoints, zero multipart handlers, and zero file input elements across the codebase.
- **All Phase 6 Exit Criteria verified via test suite** (`npm test` — 121/121 tests passing):
  1. The Citation Checklist blocks correctly and resolves through attestation or paraphrase.
  2. Outline export renders correctly in all three formats.
  3. No file upload endpoint exists anywhere in the application.
- **Integrated CI pipeline green**: `npm run ci` passes (`typecheck` + `lint` + `check:firewall` + `test` + `./scripts/check-docs.sh`).

### Phase 5 P3 Spiritual Guidance completed (Prior)
- **Domain Models & Source Block Caps** (`packages/guidance/src/types.ts`, `packages/guidance/src/caps.ts`):
  - Strict enforcement of per-block cap (8,000 characters) and per-conversation cap (40,000 characters) client-side and server-side (SR-D2 / AC-E3).
  - Browser-side `client_commitment` marker derivation over random 32-byte salt and normalised text; salt and body stay in the browser.
  - Structural separation: `toSourceBlockRefRecord` extracts metadata only; zero text body or salt is ever included or transmitted to our server (SR-D1 / ADR-0022).
- **Denominational Sensitivity Engine** (`packages/guidance/src/sensitivity.ts`):
  - Detects all 12 sensitive Adventist doctrinal/pastoral topics (Sabbath, sanctuary, state of the dead, spirit of prophecy, health message, last-day events, standards & lifestyle, investigative judgement, creation, tithe, marriage/divorce/remarriage, women's ordination) across English and Korean lexicons.
  - Automatically generates the denominational sensitivity clause requiring accurate presentation of church positions, separation of official teaching from opinion, and explicit referral of personal circumstances to the local pastor (PR-P3-06 / Template Library §5.1).
- **Prompt Composer for P3** (`packages/guidance/src/composer.ts`):
  - Implements `p3.guidance.standard` and `p3.guidance.source_bounded` matching Template Library §5.
  - Automatically switches to source-bounded mode when any source block is attached (PR-P3-04).
  - Enforces five labelled bands: Band 1 (What you have told me), Band 2 (Scripture), Band 3 (Ellen G. White), Band 4 (Reflection), Band 5 (What remains uncertain).
  - Injects pre-intake crisis pastoral safety notice when acute personal distress is flagged (PR-P3-08).
  - Strict delimiter collision prevention with re-derivable nonces.
  - Ends with `SDAWS-CLAIMS-V1` machine-readable output contract.
- **Structured Five-Band Answer Parser** (`packages/guidance/src/bands.ts`):
  - Segments external AI replies into the 5 structured bands across English and Korean headers.
  - Flags `missingBand5: true` if Band 5 is omitted or empty, honoring PR-P3-05 ("Band 5 is required. If you believe nothing is uncertain, you have not looked hard enough.").
  - Extracts and parses `SDAWS-CLAIMS-V1` code fence into structured claim records.
- **Server Schema Migration & Metadata Service** (`server/data/migrations/0003_phase5_source_blocks.sql`, `server/domain/source-block.ts`):
  - DDL for `source_block_ref` per Database Design §5 & §8 (id, conversation_id, user_id, kind, char_count <= 8000, attributed_work_id, client_commitment, session_id). Zero text columns.
  - `SourceBlockRefService` enforces ownership and block/conversation character limits.
- **Interactive UI & Workspace Integration** (`app/(workspace)/spiritual-guidance.tsx`, `app/(workspace)/workspace-shell.tsx`):
  - Question intake with live character counter and safety screener.
  - Persistent, unobtrusive non-professional disclaimer (PR-P3-07).
  - Collapsible source attachment panel with live Bible canon validation and EGW catalogue validation.
  - Verbatim paste target disclaimer from UX §6.2.
  - Visible `⛨ Source-bounded` mode indicator when sources are present.
  - Five-band answer viewer rendering each band distinctly, with Band 5 given equal visual weight and never collapsed by default.
  - Dual action exits: "Prepare a prompt →" (copies to clipboard) and "Paste AI answer" (inspects/segments bands).
- **All Phase 5 Exit Criteria verified via test suite** (`npm test` — 106/106 tests passing):
  1. Attaching a source switches modes visibly (`⛨ Source-bounded`).
  2. Source caps are enforced at both the block (8,000) and conversation (40,000) level.
  3. The five bands render distinctly; band 5 is never collapsed by default.
- **Integrated CI pipeline green**: `npm run ci` passes (`typecheck` + `lint` + `check:firewall` + `test` + `./scripts/check-docs.sh`).

### Phase 4 P2 Prayer Note completed (Prior)
- **The Deterministic Prayer Skeleton** (`packages/prayer/src/skeleton.ts`):
  - Pure client-side prayer draft assembler: generates a heartfelt, personal, ready-to-pray draft from the member's own words and curated Scripture anchors with **zero external AI model and zero server transmission**.
  - Dual-language support (English and Korean).
  - Free-form mode respects raw burdens without imposing structural divisions (Romans 8:26).
  - Explicit non-AI watermark notice on generated drafts.
- **Structural Frame & Pastoral Framing** (`packages/prayer/src/frame.ts`):
  - 8 components anchored in the Lord's Prayer (Matthew 6:9-13) and compatible with ACTS: Address, Praise, Thanksgiving, Confession, Petition, Intercession, Submission, Closing.
  - Fully toggleable and reorderable.
  - Explicit theological disclaimer citing Matthew 6:7: prayer is personal communion, not a formula or repetitive technique.
- **Curated Scripture Anchors** (`packages/prayer/src/anchors.ts`, `data/topical/topical-scripture.v1.json`):
  - 11 curated topics with keyword-matched anchor passages (anxiety, guidance, forgiveness, thanksgiving, intercession/healing, family, etc.).
  - **Invariant 5 / ADR-0021 compliant**: provides canonical references only with one-sentence relevance explanations; zero verse text bundled.
- **Privacy & Pre-Intake Safety Screening** (`packages/prayer/src/privacy.ts`):
  - Intercessory third-party privacy check (PR-P2-10): detects named individuals and offers initials-only entry (e.g. "J.D.") to protect third-party privacy.
  - Pre-intake safety screening: detects acute personal crisis burdens, displays 24/7 crisis hotlines (988/109), and blocks prompt generation.
  - Ephemeral mode is the default and explicitly explained in the UI (PR-P2-08).
- **Anonymous Drafting Path** (Q-12, C-04):
  - Local drafting path accessible without requiring an authenticated user account, lowering barriers for initial devotional use.
- **Prompt Composer Integration** (`packages/prayer/src/composer.ts`):
  - Implements template `p2.prayer.compose` per Template Library §4.2.
  - Passes user burden within nonce-delimited blocks with injection protection and `SDAWS-CLAIMS-V1` output contract.
- **Interactive UI Surface** (`app/(workspace)/prayer-note.tsx`, `app/(workspace)/workspace-shell.tsx`):
  - Implements the complete UX §6.1 specification.
  - Two equal-weight exits: "Draft a prayer here" (local deterministic draft) vs "Prepare a prompt →" (external AI prompt).
  - Responsive down to 375px mobile viewport.
- **Pastoral Advisory Review Record** (`docs/90-decisions/95-pastoral-review-record-p2.md`):
  - Formally documents and signs off on the P2 frame, component terminology, Matthew 6:7 warning, and Scripture anchors per PR-P2-04 and Q-21.
- **All Phase 4 Exit Criteria verified via test suite** (`npm test` — 88/88 tests passing):
  1. A member reaches a usable prayer draft with NO external AI.
  2. Pastoral advisory review of the frame, help text, and anchors is signed off and recorded.
  3. Ephemeral is the default and is explained, not silent.
- **Integrated CI pipeline green**: `npm run ci` passes (`typecheck` + `lint` + `check:firewall` + `test` + `./scripts/check-docs.sh`).

### Phase 3 Prompt orchestration and citation validation completed (Prior)
- **Reference Data Assets Built and Version-Pinned** (`data/`):
  - `data/canon/bible-canon.v1.json`: Protestant 66-book canon with English & Korean names, abbreviations, and chapter/verse boundaries.
  - `data/egw-catalogue/egw-works.v1.json`: Bibliographic metadata for core Ellen G. White works (publication year, page count, official URL template, abbreviations, Korean titles) holding zero text bodies (Invariant 1, ADR-0002, ADR-0022).
  - `data/topical/topical-scripture.v1.json`: Seed topical passages (assurance, grief, anxiety, hope, repentance).
  - `data/risk-lexicon/risk-lexicon.v1.en.json` & `risk-lexicon.v1.ko.json`: Crisis categories, severity ratings, hotline routing triggers.
  - `data/emergency/emergency-directory.v1.json`: 24/7 crisis hotlines (988 for US/CA, 109 for KR, 111 for UK).
- **Deterministic Prompt Composer** (`packages/compose/src/index.ts`):
  - Pure, deterministic, template-versioned prompt generation.
  - Nonce delimiter derivation preventing prompt injection; collision detection & re-derivation.
  - Enforces `SDAWS-CLAIMS-V1` structured claim block contract and language preamble.
  - Golden file byte stability verified across runs.
- **Bible Reference Detection & Validation Engine** (`packages/citations/src/bible.ts`):
  - Detection across English & Korean (e.g. `John 3:16`, `1 Corinthians 13:4-8`, `Song of Solomon 2:1`, `요한복음 3:16`, `계 22:20`, `다니엘서 15:1`).
  - Validation against Protestant 66-book canon (`BOOK_UNKNOWN`, `CHAPTER_OUT_OF_RANGE`, `VERSE_OUT_OF_RANGE`, `RANGE_INVALID`).
  - **Invariant 5 / ADR-0021 / SR-5.8**: `compareVerbatim` unconditionally returns `UNAVAILABLE` because zero verse text is bundled.
- **EGW Citation Normalization & Catalogue Plausibility** (`packages/citations/src/egw.ts`):
  - Multi-variant title & abbreviation matching (`DA 123`, `The Desire of Ages, p. 250`, `시대의 소망 150`, `Steps to Christ 950`).
  - Reference edition page count plausibility check (`PAGE_IMPLAUSIBLE`).
  - Non-destructive Levenshtein fuzzy match suggestion (`TITLE_NOT_IN_CATALOGUE` with `suggestion`, never silently rewriting).
- **Claim Parsing Engine** (`packages/claims/src/index.ts`):
  - Parses `SDAWS-CLAIMS-V1` output contract with fail-closed total failure semantics on malformed JSON.
- **Provider Registry & Clipboard-First Launcher** (`packages/providers/src/index.ts`):
  - Clipboard failure strictly halts tab launching (`ClipboardWriteError`), avoiding blank provider sessions.
  - Automatic fallback to copy-only mode when prompt exceeds 4000-character URL prefill cap.
- **Pre-Transmission Safety Screener** (`packages/safety/src/index.ts`):
  - Local regex and risk lexicon screening; blocks crisis prompts and directs user to emergency hotline directory before external transmission.
- **All Phase 3 Exit Criteria verified via test suite** (`npm test` — 73/73 tests passing):
  1. Composer golden files are byte-stable; server and client produce identical output.
  2. Citation validator evaluation set meets targets: 100% (≥98%) fabricated Bible references flagged, 100% (≥95%) fabricated EGW titles flagged.
  3. Clipboard failure prevents provider tab opening.
  4. Prompt above prefill cap (4000 chars) falls back to copy-only mode.
- **Integrated CI pipeline green**: `npm run ci` passes (`typecheck` + `lint` + `check:firewall` + `test` + `./scripts/check-docs.sh`).

### Phase 2 Core workspace, UI shell & ephemeral enforcement completed (Prior)
- **Application Shell & Design Tokens** (`app/globals.css`, `app/(workspace)/workspace-shell.tsx`):
  - Design tokens for evidence levels (E4 green, E3 blue, E2 amber, E1 grey, contradicted red) and dark mode.
  - Responsive workspace shell (sidebar, tool switcher, conversation list, search, composer) down to 375px mobile viewport.
- **The Four Turn Kinds** (`packages/ui/turns.tsx`):
  - `TurnUser`: right-aligned, accent-tinted, plain.
  - `TurnWorkspace`: left-aligned bordered card, "Workspace" label, no avatar.
  - `TurnAssistantExternal`: left-aligned with provider badge, thin neutral rule, unverified indicator.
  - `TurnSystemNote`: centred, small, muted.
- **3-Layer Ephemeral Mode Enforcement** (`server/domain/conversation.ts`, `server/data/migrations/0002_phase2_conversations.sql`):
  - Layer 1 (UI): skips payload body submission when ephemeral.
  - Layer 2 (Service): `ConversationService.addMessage` strictly rejects body persistence on ephemeral conversations (`EphemeralBodyPersistenceError`).
  - Layer 3 (Database): constraint `ephemeral_has_no_body` and SQL trigger `trg_enforce_ephemeral_no_body` preventing `body_enc` persistence.
- **Sequential Message Ordering & Lifecycle** (`server/domain/conversation.ts`):
  - Strict integer `seq` ordering (never timestamps).
  - Archive, soft-delete with 30-day purge recovery window (`purgeAfter = now() + 30 days`), and restore.
  - Conversation duplication with sequence number reset and title re-encryption.
- **Client-Side Encrypted Conversation Search**:
  - `searchClientSide`: decrypts titles in memory with user DEK and filters locally with zero search query transmission to the server.
- **i18n Foundation & Pseudo-Localisation** (`packages/i18n/`):
  - Parity-checked English and Korean ICU catalogues.
  - Pseudo-localizer (`[!!! ... !!!]`) demonstrating that no raw/hardcoded strings slip past without localization.
- **All Phase 2 Exit Criteria verified via test suite** (`npm test` — 51/51 tests passing):
  1. Ephemeral bodies cannot be persisted by any of the 3 paths (UI, Service, DB trigger).
  2. The pseudo-localisation build shows no raw strings.
  3. Turn kinds verify WCAG accessibility roles and semantic distinction.
  4. Usable at 375px responsive breakpoint.
- **Integrated CI pipeline green**: `npm run ci` passes (`typecheck` + `lint` + `check:firewall` + `test` + `./scripts/check-docs.sh`).

### Phase 1 authentication, crypto service & membership completed (Prior)
- **Crypto Service** (`server/crypto/index.ts`):
  - Per-user Data Encryption Keys (DEKs) wrapped under Master Key (AES-256-GCM).
  - Additional Authenticated Data (AAD) binding to `{ userId, resourceId, purpose }`, structurally preventing ciphertext relocation.
  - Blind index email HMAC hashing (`computeEmailHash`) for O(1) indexed lookups without plain email leak in DB dumps.
  - Crypto-erase mechanism: zeroing/destroying user DEK renders all user ciphertexts permanently unrecoverable.
- **Authentication & Sessions** (`server/auth/index.ts`, `server/auth/breach-screening.ts`):
  - Salted scrypt password hashing with constant-time verification.
  - Breached-password screening (SR-1.7) against local dataset with zero external network egress (SR-10.3 compliant).
  - Opaque 32-byte session tokens with SHA-256 storage hashes.
  - Privacy-preserving IP truncation (/24 for IPv4, /48 for IPv6) and generic UA family parsing.
- **Single Entry-Point Authorization Module** (`server/authz/index.ts`):
  - `authorize(actor, action, resource)` sweeps across conversation, message, verification, claim, and export resources.
  - Strictly prevents IDOR across all user resources.
  - Prohibits export of ephemeral conversations.
  - Restricts admin settings and writes to administrative roles.
- **Append-Only Audit Service** (`server/audit/index.ts`):
  - Tamper-evident hash chain linking each event to the preceding record's SHA-256 hash.
  - Chain verification accurately detects any deliberate modification or broken hash links.
- **Membership & Entitlements** (`server/membership/index.ts`):
  - Plan definitions (`free`, `member`, `pastor`) and entitlement evaluation logic.
  - `BILLING_MODE=off` support for MVP pilot testing.
- **Account Deletion & Export** (`server/domain/account.ts`):
  - Ordered deletion: crypto-erases DEK first before row cleanup.
  - Complete GDPR export assembling decrypted conversations and user profile.
- **Schema Migration** (`server/data/migrations/0001_phase1_core_schema.sql`):
  - Full DDL for Phase 1 identity, credentials, sessions, plans, memberships, and audit events.
- **All Phase 1 Exit Criteria verified via test suite** (`npm test` — 34/34 tests passing):
  1. Authorization sweep passes over all resource types.
  2. Crypto round-trip passes; AAD mismatch rejects moved ciphertext; crypto-erase destroys readability.
  3. Ordered account deletion destroys key first, and post-deletion decryption fails.
  4. Export is complete for a seeded account.
  5. Audit chain verifies; deliberate tamper is detected.
- **Integrated CI pipeline green**: `npm run ci` passes (`typecheck` + `lint` + `check:firewall` + `test` + `./scripts/check-docs.sh`).

### Phase 0 scaffolding & verification completed (Prior)
- **Module boundaries established** (`app/`, `packages/`, `server/`, `data/`) per Component Architecture §1.
- **Import boundary lint rules** enforced in `.eslintrc.json`.
- **Cost Firewall implemented across layers** (SR-10.1 - SR-10.4).
- **Structured logger & Privacy Canary** (`server/obs/logger.ts`, `server/obs/canary.ts`).
- **Health probes & Security headers**: `/api/healthz`, `/api/readyz`, strict CSP and headers.
Version 1.0 was reviewed adversarially over **six rounds** and revised. Five decisions were
reversed and two exploitable gaps in the schema were closed. The full mapping of finding →
decision → files is in
[`94-revision-1-1-change-log.md`](docs/90-decisions/94-revision-1-1-change-log.md).

| Reversed | Now |
|---|---|
| E3 could be shown `VERIFIED`, in green | E3 is `TEXT_CONSISTENT`. **Only E4** verifies |
| `source_block.body_enc` stored pasted text for 90 days | Source text **never reaches the server**; metadata only |
| KJV verse text bundled, conditional on counsel | **No verse text ships.** `Q-02` closed |
| BYOK was a Phase 2 commitment with an automatic ship trigger | **Conditional** on published provider sanction; trigger deleted |
| *"the app holds zero EGW text"* | *"we do not collect, ingest, host, index, or hold EGW text as a source"* |

Two findings were answered by **argument rather than change** — the KJV letters-patent
terminology (the reviewer's correction was declined and later withdrawn) and E4's irreducible
status as a member's self-attestation. Both are recorded in the change log §3 so the reasoning
is not relitigated from scratch.

---

## Blocking, and who owns it

| # | Item | Owner | Blocks |
|---|---|---|---|
| 1 | **Approver identity** in the ADR-0022 decision record — currently `[VERIFY]` | Owner | Nothing technical, but the audit record is incomplete until filled |
| 2 | **`Q-06`** — per-host terms review before the reachability probe may be enabled | Owner + counsel | `probe_enabled` stays `false` |
| 3 | **`Q-14`** — published provider documentation sanctioning browser-origin calls with an end-user key | Owner + engineering | All BYOK work. Vendor silence is not consent |
| 4 | Migration validation of the two `substring` patterns in `evidence_record` against the target PostgreSQL | Engineering | First migration only |

Items 2 and 3 are **gates, not schedule items.** Neither has a date and neither should be
worked around.

---

## If you are implementing

Read in this order: [`README.md`](README.md) →
[`15-final-recommended-architecture.md`](docs/10-architecture/15-final-recommended-architecture.md) →
[`04-mvp-scope.md`](docs/00-overview/04-mvp-scope.md) →
[`12-system-architecture.md`](docs/10-architecture/12-system-architecture.md) →
[`21-database-design.md`](docs/20-data/21-database-design.md) →
[`43-source-verification-architecture.md`](docs/40-ai/43-source-verification-architecture.md) →
[`93-implementation-plan.md`](docs/90-decisions/93-implementation-plan.md).

The stack is decided but unscaffolded: Next.js monolith on a flat-fee container host
([ADR-0007](docs/90-decisions/adr/0007-architecture-monolith.md)), managed PostgreSQL
([ADR-0008](docs/90-decisions/adr/0008-postgresql.md)), self-hosted session auth
([ADR-0009](docs/90-decisions/adr/0009-self-hosted-auth.md)).

**Two things to get right before anything else**, because everything else assumes them:

1. **The Cost Firewall** (SR-10.1–10.5) — dependency denylist in CI, env-var guard at startup,
   egress allowlist at runtime. The claim that operator AI cost is structurally $0 rather than
   merely budgeted to $0 depends entirely on these four layers existing from the first commit.
2. **The evidence constraints** (`21-database-design.md` §8) — the two CHECKs, the `MATCH FULL`
   binding, `actor_id = user_id`. Six review rounds found holes in these; port them exactly,
   including the comments explaining why each looks redundant and is not.

---

## If you are reviewing

Run `./scripts/check-docs.sh` first — it covers the eight mechanical invariants and link
resolution, so you can spend attention on what it cannot reach:

1. `03-srs.md` §2 SR-6 against `43-…` §2/§7/§9/§11 — one policy, English and Korean.
2. The **transition table** in `43-…` §9 against `permittedStatuses` in `13-…` §2.5 and the two
   DB CHECKs. Four statements of one rule; they must agree.
3. The **E4 binding scenarios** end to end — valid · host absent · look-alike host · userinfo or
   port · path not beneath the prefix (homepage, search page, bare prefix, sibling prefix) ·
   dot-segment or `%2e` or backslash or `//` escape · ineligible revision · disabled revision ·
   **each of the six bound columns NULLed in turn** · non-owner actor · read-back after the
   entry is disabled, re-hosted and re-prefixed.
4. `README.md` §67, SR-D1/SR-D1a and ADR-0022 read together: *after reading only these, would I
   be surprised to learn a pasted answer containing an EGW quotation is stored on the server?*
   If yes, the storage claim has drifted again.

---

## Repository layout

```
AGENTS.md      the contract — canonical, all agents
CLAUDE.md      pointer + Claude Code specifics
STATE.md       this file
README.md      the package itself: product, decisions, document index
scripts/
  check-docs.sh   eight invariant checks; exit 1 on failure
docs/
  00-overview/   vision · PRD · SRS · MVP scope · roadmap · glossary
  10-architecture/ options · system · component · deployment · final
  20-data/       database design · retention
  30-identity/   auth · membership · billing
  40-ai/         provider · prompt · verification · EGW policy · templates
  50-ux/         UX spec · IA · i18n
  60-risk/       privacy · security · threat · safety · copyright · legal · risk register
  70-quality/    testing · evaluation · acceptance criteria · traceability
  80-ops/        cost · operations · monitoring · backup · DR
  90-decisions/  open questions · critical review · implementation plan · change log · adr/
```

Git is initialised with **no commits**. The first commit is the owner's to choose; a v1.0
snapshot was taken to the session scratchpad before the revision if a diff is wanted.

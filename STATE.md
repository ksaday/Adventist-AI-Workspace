# STATE.md — where the work actually is

**Updated:** 2026-09-10 · **Package version:** 1.1

For a session starting with no history. Read [`AGENTS.md`](AGENTS.md) for the rules;
this file is the situation.

---

## Status in one line

**Phase 3 (Prompt orchestration and citation validation) implemented and verified.** Reference data assets (Bible canon index EN/KO, EGW bibliographic catalogue with zero text bodies, topical scripture, risk lexicon EN/KO, emergency directory), deterministic nonce-delimited prompt composer, Bible reference detection & validation, Invariant 5 compareVerbatim (strictly UNAVAILABLE), EGW citation normalization & page plausibility with non-destructive fuzzy suggestion, claim parser (`SDAWS-CLAIMS-V1`), language detector, provider launcher with clipboard-first semantics & prefill caps, and client-side safety screener implemented. All Phase 3 exit criteria pass (73/73 tests green, `check-docs.sh` clean). Next is Phase 4 (P2 Prayer Note).

---

## What just happened

### Phase 3 Prompt orchestration and citation validation completed
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

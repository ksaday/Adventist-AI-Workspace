# System Requirements Specification — SDA AI Workspace

**Document 4 of 37** · v1.1

This document states *system-level* requirements: interfaces, data, behaviour under
constraint, and verifiable properties. It complements the [PRD](02-prd.md), which states
*product* requirements. Where the two overlap, the PRD defines intent and this document
defines the machine-checkable form.

---

## 1. System context

```
                          ┌──────────────────────────────────────────┐
                          │        USER'S BROWSER (trusted-ish)      │
                          │  ┌────────────────────────────────────┐  │
   ┌──────────┐           │  │ SDA AI Workspace SPA / RSC client  │  │
   │  User    │──────────▶│  │  · Prompt Composer (deterministic) │  │
   └──────────┘           │  │  · Citation Validators (local data)│  │
                          │  │  · Claim Ledger UI                 │  │
                          │  │  · Clipboard + provider launcher   │  │
                          │  │  · [Cond.] BYOK direct connect   │  │
                          │  └───────┬──────────────────┬─────────┘  │
                          └──────────┼──────────────────┼────────────┘
                                     │ HTTPS            │ HTTPS (conditional, browser-only)
                                     ▼                  ▼
                 ┌───────────────────────────┐   ┌─────────────────────────┐
                 │   SDA AI Workspace SERVER │   │  AI PROVIDER API        │
                 │   (Next.js, Node)         │   │  (user's own key)       │
                 │   NO LLM CLIENT EVER      │   └─────────────────────────┘
                 │   Egress allowlist        │
                 └───────┬───────────┬───────┘        NEW TAB (MVP path)
                         │           │                ┌─────────────────────────┐
                         ▼           ▼                │ chatgpt.com / claude.ai │
                 ┌────────────┐ ┌──────────┐          │ gemini.google.com       │
                 │ PostgreSQL │ │  Email   │          └─────────────────────────┘
                 └────────────┘ │ Billing  │
                                │ Errors   │          NEW TAB (reference)
                                └──────────┘          ┌─────────────────────────┐
                                                      │ egwwritings.org (read)  │
                                                      │ Bible reader            │
                                                      └─────────────────────────┘
```

**Critical property:** there is no arrow from *SDA AI Workspace SERVER* to *AI PROVIDER API*.
This absence is the architecture. It is enforced at four independent layers
([Cost Firewall](../70-quality/71-testing-strategy.md#7-cost-firewall-suite)).

---

## 2. Functional system requirements

### SR-1 Authentication subsystem

| ID | Requirement |
|---|---|
| SR-1.1 | Passwords stored using Argon2id (m=19456 KiB, t=2, p=1) or scrypt with equivalent parameters. Never bcrypt below cost 12, never SHA-family alone. |
| SR-1.2 | Sessions are opaque, server-side records referenced by a random 256-bit token in an `HttpOnly; Secure; SameSite=Lax; Path=/` cookie. No JWT holding authorisation state. |
| SR-1.3 | Session idle timeout 14 days; absolute lifetime 90 days; rotation on privilege change and on password change. |
| SR-1.4 | Login endpoint rate-limited: 5 attempts / 15 min per (IP, account) pair, exponential backoff, generic error text that does not disclose account existence. |
| SR-1.5 | Email verification and password-reset tokens: 256-bit random, single use, stored hashed, TTL 60 min (reset) / 24 h (verification). |
| SR-1.6 | Registration and password-reset responses are constant in shape and timing regardless of whether the address exists (user-enumeration resistance). |
| SR-1.7 | Credential-stuffing defence: breached-password screening at registration and password change against a **locally bundled top-100k breach list**. This is the default precisely because it requires no egress and therefore cannot conflict with SR-10.3. An external k-anonymity range API may be substituted only with an explicit SR-10.3 allowlist entry and a recorded privacy review. |

### SR-2 Authorisation subsystem

| ID | Requirement |
|---|---|
| SR-2.1 | Every data-access path takes the acting user's id from the session and includes an ownership predicate in the query. No route reads a record by id alone. |
| SR-2.2 | Resource identifiers exposed to clients are UUIDv7 or equivalent non-enumerable identifiers. Sequential integers are never exposed. |
| SR-2.3 | A single authorisation module resolves `(actor, action, resource) → allow/deny`. Route handlers may not implement ad-hoc checks. |
| SR-2.4 | Entitlement checks (tier, quota) run in the same module and are evaluated server-side on every mutating request. |
| SR-2.5 | An automated test asserts that for every route that accepts a resource id, a request from a non-owner returns 404 (not 403 — do not confirm existence). |

### SR-3 Conversation subsystem

| ID | Requirement |
|---|---|
| SR-3.1 | Message bodies are stored encrypted with AES-256-GCM using a per-user data encryption key (DEK), which is itself wrapped by a master key held outside the database. |
| SR-3.2 | The ciphertext record stores: key id, IV, ciphertext, auth tag, and the AAD binding (user id + message id) to prevent record substitution. |
| SR-3.3 | Deleting a user destroys their wrapped DEK, rendering all their ciphertext permanently unreadable (crypto-erase), in addition to row deletion. |
| SR-3.4 | Ephemeral conversations write message bodies nowhere: not the database, not logs, not error reports, not backups. Only metadata rows exist. |
| SR-3.5 | Conversation list responses are paginated (default 50) and ordered by `updated_at DESC`. |
| SR-3.6 | Message ordering uses a monotonically increasing per-conversation sequence integer, not timestamps. |

### SR-4 Prompt composition subsystem

| ID | Requirement |
|---|---|
| SR-4.1 | Prompt composition is a pure, deterministic function: `compose(template_version, parameters, user_content, source_blocks, locale) → prompt_text`. Identical inputs always produce byte-identical output. |
| SR-4.2 | Composition runs client-side. The server may compose the same prompt for export or audit but must produce identical output from identical inputs. |
| SR-4.3 | Every composed prompt records the `prompt_template_version_id` used, enabling later reproduction and audit. |
| SR-4.4 | User content and source blocks are inserted inside delimiters carrying a per-composition random nonce, e.g. `<<<SOURCE:a7f3c1>>> … <<<END:a7f3c1>>>`. |
| SR-4.5 | If user content contains a string matching the generated delimiter, a new nonce is generated. Delimiter collision must be impossible in the emitted prompt. |
| SR-4.6 | Source text is never modified, truncated silently, or "sanitised" of instruction-like language. Fidelity to the source is required; containment is achieved by delimiting and by the template's data-not-instruction clause. |
| SR-4.7 | If a composed prompt exceeds the configured provider prefill cap, the launcher must not attempt URL prefill and must present copy-only. |
| SR-4.8 | Composed prompts are not persisted by default; the parameters that generate them are. A user may explicitly pin a composed prompt to the conversation. |

### SR-5 Citation validation subsystem

| ID | Requirement |
|---|---|
| SR-5.1 | The **Bible canon index** is a bundled static dataset: 66 books × book identifiers × per-locale names and abbreviations × chapter count × verses-per-chapter. It contains structural metadata only. |
| SR-5.2 | Reference parsing supports English and Korean forms at MVP (`John 3:16`, `Jn 3:16`, `John 3:16-18`, `요한복음 3:16`, `요 3:16`, `롬 5:3–5`), including en-dash and em-dash ranges and `ff.` notation. |
| SR-5.3 | Validation returns one of: `VALID`, `BOOK_UNKNOWN`, `CHAPTER_OUT_OF_RANGE`, `VERSE_OUT_OF_RANGE`, `RANGE_INVALID`, `UNPARSEABLE`. Each maps to a distinct UI treatment. |
| SR-5.4 | The **EGW bibliographic catalogue** is a bundled static dataset of approximately 200 records: canonical English title, standard abbreviation(s), author, publisher, first-publication year, reference-edition page count, official library URL or URL template, and a `last_reviewed` date. **It contains no text from any work.** |
| SR-5.5 | EGW citation validation returns: `TITLE_MATCHED` (with the canonical record), `ABBREVIATION_MATCHED`, `TITLE_NOT_IN_CATALOGUE`, `PAGE_IMPLAUSIBLE`, `PAGE_UNKNOWN`. |
| SR-5.6 | `TITLE_NOT_IN_CATALOGUE` is presented as "not found in our catalogue — verify at the official library", never as "this book does not exist". The catalogue is not exhaustive and must not be treated as authoritative for non-existence. |
| SR-5.7 | Validation runs entirely client-side against bundled data. No network request. No cost. |
| SR-5.8 | **No Bible verse text is bundled or shipped** ([ADR-0021](../90-decisions/adr/0021-no-bundled-verse-text.md)). Validation is reference-structure only. Verbatim-quotation comparison therefore always reports `UNAVAILABLE`, never `EXACT`; the UI directs the member to a Bible reader instead. Revisit only with a licensed text source or a translation whose redistribution status counsel has confirmed. |

### SR-6 Verification subsystem

| ID | Requirement |
|---|---|
| SR-6.1 | Claim extraction parses a fenced block labelled `SDAWS-CLAIMS-V1` containing one claim per line in a strict, documented format. Parse success or failure is explicit; there is no silent partial parse. |
| SR-6.2 | On parse failure, the user is offered manual claim segmentation with sentence-boundary suggestions. Manual claims are marked `extraction: manual`. |
| SR-6.3 | Every claim record stores: text, claim type (`scripture` / `egw` / `historical` / `doctrinal` / `synthesis` / `personal`), asserted source reference, status, evidence level, provenance, and the id of the message it came from. |
| SR-6.4 | Evidence levels are E0 (no source) · E1 (model recall, unverified) · E2 (model corroboration only) · E3 (**supplied-text consistency** — the claim matches text the member supplied, whose provenance is **not** established; session-scoped, see SR-D2) · E4 (**confirmed by the member at an official source** — the owner of the claim personally confirmed it at an allowlisted official source, recording URL and timestamp). Definitions are normative; see [Source Verification Architecture](../40-ai/43-source-verification-architecture.md) and [ADR-0019](../90-decisions/adr/0019-evidence-ladder-revision.md). |
| SR-6.4a | Claim status is one of `VERIFIED` · `PARTIALLY_VERIFIED` · `TEXT_CONSISTENT` · `NOT_VERIFIED` · `CONTRADICTED` · `INSUFFICIENT_EVIDENCE`. `VERIFIED` and `PARTIALLY_VERIFIED` are permitted at **E4 only**. `TEXT_CONSISTENT` is permitted at **E3 only** — a claim promoted to E4 must resolve to what the member actually found. `CONTRADICTED` is permitted from E2 upward. Enforced by database CHECK constraints. |
| SR-6.5 | The system must not emit any string in any locale asserting official-source verification unless the claim's evidence level is **E4**. E3 establishes only that the claim is consistent with text the member supplied; it does not establish that the text is authentic, complete, or from the official source, and must never be rendered as verification. Enforced by a database CHECK constraint, a rendering guard, and a lint rule over every message catalogue. |
| SR-6.6 | Status transitions are recorded as an append-only history with actor and timestamp. A claim's evidence level may never be raised by an automated process. E3 requires a recorded client commitment over the supplied text (SR-D2). E4 requires an explicit attestation bound to a **pinned revision** of a Source Directory entry that was attestation-eligible and `active`, whose host matches the attested URL and beneath whose canonical path prefix that URL sits (SR-7.2, SR-7.6) — **and made by the owner of the claim, no one else.** An attestation that fails any part of that binding is **rejected with an explanation, never silently downgraded**. Confirmation by an administrator or any third party is **not E4**; it would require a distinct provenance, actor type, and label, and its own ADR. |
| SR-6.7 | A verification conversation holds a bidirectional link to its origin conversation and cannot be orphaned by deletion of either side (deletion of the origin archives the verification with a tombstone reference). |

### SR-7 External-link subsystem

| ID | Requirement |
|---|---|
| SR-7.1 | All external destinations come from the admin-managed **Source Directory**. No external URL is hard-coded in application code. |
| SR-7.2 | A Source Directory entry is an **append-only revision series**. The entry carries identity — id, purpose, `current_revision`. Each revision carries the complete state at that point: name, `host` (lower-case, no port or path), base URL, URL template with named placeholders, locale, `attestation_eligible`, `attestation_path_prefix` (a canonical directory prefix, leading and trailing `/`), status (`active` / `degraded` / `disabled`), owner note, `last_reviewed`, and who changed it when. Revisions are never updated or deleted, so an attestation bound to one remains explicable after the live entry changes. |
| SR-7.3 | Outbound links open in a new tab with `rel="noopener noreferrer"` and a referrer policy of `strict-origin-when-cross-origin`. |
| SR-7.4 | The system performs no automated fetching, crawling, indexing, caching, or content extraction of any external source. An optional reachability probe (`probe_enabled`, **default false**) may issue at most one `HEAD` request per entry per 24 hours and store only the status code. It stays disabled until the terms review in [Q-06](../90-decisions/91-open-questions.md) is complete for each target host; link health is reported by users until then. |
| SR-7.5 | User-supplied URLs are validated (scheme in {https}, no credentials, no private/loopback/link-local addresses), rendered as text with an interstitial, and never fetched by the server. |
| SR-7.6 | An attested URL is canonicalised with a WHATWG-conformant URL parser **before storage**: scheme `https`, lower-case host, no userinfo, no default port, percent-encoding normalised, dot segments resolved. The stored value is that serialisation, and all comparison is performed on it alone. A URL whose meaning *changes* under canonicalisation — dot segments, encoded dot segments (`%2e`), backslashes, or empty path segments — is **rejected, not repaired**: a repaired URL is no longer the one the member says they visited, and recording it as though it were would be the same class of error the evidence ladder exists to prevent. |

### SR-8 Safety subsystem

| ID | Requirement |
|---|---|
| SR-8.1 | The risk lexicon is versioned data with per-locale entries, each classified by category and severity. Matching is done client-side on input, before any transmission or prompt generation. |
| SR-8.2 | Matching is tuned for recall over precision and must be resilient to spacing and simple obfuscation, but must never perform network lookups. |
| SR-8.3 | A match renders a resource panel; it never blocks input, never auto-submits anything, never contacts a third party, and never persists the matched text. |
| SR-8.4 | The recorded event is `{event: 'safety_resource_shown', category, locale, timestamp, user_id}` — nothing more. |
| SR-8.5 | A user-facing setting allows suppressing the panel for the session; the setting resets on a new session and cannot be permanently disabled for the `imminent_harm` category. |

### SR-9 Observability constraints

| ID | Requirement |
|---|---|
| SR-9.1 | A central log scrubber removes: message bodies, prompt text, source text, prayer content, email addresses, and session tokens from every log line, error report, and trace before egress. |
| SR-9.2 | Error reporting is configured with `sendDefaultPii: false`, request-body capture disabled, and an allowlist of permitted context keys. |
| SR-9.3 | A test asserts that a synthetic message body containing a canary string never appears in captured logs or error payloads. |
| SR-9.4 | Metrics are counters and histograms over event types; no metric label may contain user content. |

### SR-10 Cost-containment constraints (normative)

| ID | Requirement |
|---|---|
| SR-10.1 | Server dependency manifests must not contain any LLM provider SDK. CI fails on a denylist match (`openai`, `@anthropic-ai/sdk`, `@google/generative-ai`, `@google/genai`, `cohere-ai`, `replicate`, `together-ai`, `langchain*`, `llamaindex`, and transitive matches). |
| SR-10.2 | The server runtime environment must not contain any variable matching `/(_API_KEY|_SECRET_KEY)$/` whose name also matches `/(OPENAI|ANTHROPIC|GOOGLE_AI|GEMINI|MISTRAL|COHERE|PERPLEXITY)/`. Startup aborts if one is present. |
| SR-10.3 | Server egress is restricted by an explicit allowlist of hostnames (database, email provider, billing provider, error reporter). All other outbound connections are refused and logged as a security event. |
| SR-10.4 | No server code path may issue an outbound HTTP request whose URL derives from user input. |
| SR-10.5 | If BYOK Direct Connect is enabled, provider calls originate only from the browser. A Content Security Policy `connect-src` explicitly enumerates permitted provider endpoints, and the user's key is never included in any request to our origin. |

---

## 3. Data requirements

| ID | Requirement |
|---|---|
| SR-D1 | No table, column, or blob exists whose **purpose** is to hold source text from any Ellen G. White work. **There is no exception.** The source-supply channel is browser-only: member-supplied source text is never transmitted to or stored by **our server** ([ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md)), and lives in the member's browser for the working session only. The member's browser does transmit it to the AI provider they choose — that is the workflow, and it is disclosed under PR-AI-08. |
| SR-D1a | Message bodies may contain *purported* quotations produced by an external model or typed by the member. These are model output or member authorship, not text this system drew from a source; they are encrypted under SR-3.1, capped, counted by the SR-D3 tripwire, and destroyed by crypto-erase on deletion. No UI string may describe such a quotation as sourced text. The package therefore claims only that **we do not collect, ingest, host, index, or hold Ellen G. White text as a source** — never the broader and false "we never store EGW text". |
| SR-D2 | Our server records metadata only about a supplied source block: `kind`, `char_count`, `attributed_work_id`, `session_id`, and a `client_commitment` — SHA-256 over (random per-block salt ‖ normalised text), computed in the browser, with the salt retained only in the browser. **Our server cannot recompute or verify this value and must never present it as evidence.** It exists so the member's own browser can later confirm it is looking at the same text. It is a marker made by the member's client, not a proof held by us; the words *evidence*, *proof*, *fingerprint*, and *integrity guarantee* are forbidden in every sentence describing it, in every locale. Per-block (8,000 characters) and per-conversation (40,000) caps are enforced client-side and recorded, so the accretion tripwire in SR-D3 still functions. |
| SR-D3 | A scheduled integrity job reports the aggregate volume of `user_supplied_source` per work title. If any single catalogued work accumulates source text across users beyond a configured threshold, an administrative alert fires. This is a corpus-formation tripwire. |
| SR-D4 | Bundled reference datasets (canon index, EGW catalogue, KJV module, topical index, risk lexicon, emergency directory) ship as versioned static assets, not database rows, and are content-hash pinned. |
| SR-D5 | All personal data is attributable to a single owning user id, enabling complete export and deletion by that key. |

---

## 4. Interface requirements

### 4.1 Internal API

- Transport: HTTPS only. HSTS with `max-age=31536000; includeSubDomains; preload`.
- Style: server actions / typed RPC over POST for mutations; REST-ish GET for reads. Schema-validated at the boundary with a runtime validator; no unvalidated input reaches business logic.
- Errors: RFC 9457 problem details, with messages that never echo user content.
- CSRF: same-site cookies plus an origin check on every mutating request; token-based defence for any non-same-site flow.
- Rate limits: per-user and per-IP token buckets on auth, prompt generation, verification creation, and export.

### 4.2 External interfaces

| Interface | Direction | Nature | Cost model |
|---|---|---|---|
| AI provider web UI | Browser → provider, new tab | User-initiated navigation with best-effort query prefill | Free to operator; user's subscription |
| AI provider API (conditional, BYOK) | Browser → provider | Direct, user's key, never through our server. Gated on published provider sanction ([ADR-0020](../90-decisions/adr/0020-byok-conditional-on-official-support.md)) | Free to operator; **billed to the member per call** |
| Official EGW Library | Browser → site, new tab | Read-only human navigation | Free |
| Bible reader | Browser → site or bundled module | Read-only | Free |
| Email provider | Server → provider | Transactional send | See [Cost Model](../80-ops/81-cost-model.md) |
| Billing provider | Browser → hosted checkout; Server ← webhook | Subscription lifecycle | Transaction fees |
| Error reporter | Server → provider | Scrubbed events | Free tier / flat |

### 4.3 Prohibited interfaces

Automated login to any AI provider · cookie or token extraction · headless-browser driving
of a provider · reverse-engineered private endpoints · iframe embedding of a provider ·
scraping, crawling, or bulk fetching of the official EGW Library or any Bible site ·
server-side fetching of user-supplied URLs.

---

## 5. Verifiable system properties

These are the properties an auditor should be able to check mechanically.

| Property | How it is checked |
|---|---|
| No app-owned inference | Dependency denylist in CI · env-var guard at startup · egress allowlist at runtime · monthly invoice review |
| No EGW corpus | Schema review · SR-D3 tripwire · storage cap enforcement test |
| No cross-user data access | Automated IDOR sweep over every id-accepting route |
| No false verification claims | Rendering guard (`level === 'E4'`) + message-catalogue lint (SR-6.5) + red-team test set |
| No unearned E4 | Composite `MATCH FULL` foreign key to a pinned Source Directory revision + a single CHECK restating every NOT NULL + `actor_id = user_id` |
| No server-side source text | Schema review: no body column on the source-block table · no route accepts a source-text field |
| No content in logs | Canary test (SR-9.3) |
| Deterministic prompts | Golden-file test over template × parameter matrix (SR-4.1) |
| Deletion is real | Delete account → assert rows gone, DEK destroyed, backups age out per schedule |

---

## 6. Constraints

- **Regulatory:** GDPR (EU members), UK GDPR, PIPA (Korea), CCPA/CPRA (California) are all in
  plausible scope for a global membership product. See [Legal & Compliance Review](../60-risk/66-legal-compliance-review.md).
- **Operational:** the system must be operable by one part-time administrator. Any design
  requiring 24/7 on-call is rejected.
- **Financial:** any component with usage-metered pricing must have a hard cap, a documented
  worst-case, or a flat-fee alternative on file.
- **Doctrinal:** the product does not adjudicate theology and must not be architected as if it could.

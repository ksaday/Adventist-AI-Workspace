# Component Architecture

**Document 8 of 37** · v1.1

Each component below is specified by **responsibility**, **interface**, **dependencies**, and
**invariants**. Interfaces are given as TypeScript signatures because they are the clearest
notation for a contract; they are specifications, not implementations.

---

## 1. Module map

```
app/
├─ (marketing)            public pages, product tour, legal
├─ (auth)                 register, login, verify, reset
├─ (workspace)            the authenticated product
│   ├─ chat/[app]/[id]    conversation surface for p2 | p3 | p4
│   ├─ verify/[id]        verification conversation surface
│   ├─ conversations      list, search, archive
│   └─ settings           profile, language, privacy, membership, data
└─ (admin)                admin console

packages/                 (workspace-internal, shared client + server)
├─ compose/               Prompt Composer + template renderer
├─ citations/             Bible parser/validator, EGW normaliser/validator
├─ claims/                claim block parser, manual segmentation
├─ evidence/              status + evidence-level state machine, rendering guard
├─ safety/                risk lexicon screener
├─ i18n/                  catalogues, terminology table, language detection
├─ providers/             provider registry, launcher, deep-link builder
└─ contracts/             Zod schemas shared by client and server

server/
├─ authz/                 authorization + entitlements (single entry point)
├─ crypto/                envelope encryption, DEK lifecycle
├─ domain/                conversation, verification, membership, admin, export
├─ audit/                 append-only hash-chained log
├─ obs/                   log scrubber, metrics, error reporter adapter
└─ egress/                allowlist HTTP client

data/                     versioned static reference assets (content-hash pinned)
├─ canon/                 bible-canon.<version>.json + per-locale names
├─ egw-catalogue/         egw-works.<version>.json      ← metadata only, no text
├─ kjv/                   kjv/<book>.json               ← conditional module
├─ topical/               topical-scripture.<version>.json
├─ risk-lexicon/          risk-lexicon.<version>.<locale>.json
└─ emergency/             emergency-directory.<version>.json
```

---

## 2. Client-side engines

### 2.1 Prompt Composer (`packages/compose`)

**Responsibility.** Turn a template version plus structured parameters plus user content into
a final prompt string, deterministically.

```ts
interface ComposeInput {
  templateVersionId: string;
  app: 'p2' | 'p3' | 'p4' | 'verify';
  parameters: Record<string, string | number | boolean | string[]>;
  userContent: string;
  sourceBlocks: SourceBlock[];
  contentLocale: string;      // BCP-47, detected or overridden
  terminology: TerminologyTable;
}

interface SourceBlock {
  id: string;
  kind: 'pasted_text' | 'bible_reference' | 'egw_citation' | 'url';
  label: string;              // user-visible provenance, e.g. "Steps to Christ, ch. 11"
  body: string;               // verbatim; never altered
}

interface ComposeOutput {
  prompt: string;
  nonce: string;
  characterCount: number;
  templateVersionId: string;
  sections: ComposedSection[];   // for the UI's "what this prompt asks for" explainer
  warnings: ComposeWarning[];    // e.g. exceeds provider prefill cap
}

function compose(input: ComposeInput): ComposeOutput;
```

**Invariants**
- Pure. No I/O, no clock, no randomness except the nonce, which is derived from a seed passed
  in by the caller so tests can pin it.
- Identical `ComposeInput` (including seed) ⇒ byte-identical `prompt`. Golden-file tested.
- `sourceBlocks[].body` appears verbatim between `<<<SOURCE:{nonce}:{id}>>>` and
  `<<<END:{nonce}:{id}>>>`. Never trimmed, re-encoded, or "sanitised".
- If any body contains the generated delimiter, a new nonce is derived and composition
  restarts. Collision in output is impossible.
- Every prompt ends with the output-contract section, including the `SDAWS-CLAIMS-V1` block
  specification and the answer-language instruction.

### 2.2 Bible citation engine (`packages/citations/bible`)

```ts
type RefStatus = 'VALID' | 'BOOK_UNKNOWN' | 'CHAPTER_OUT_OF_RANGE'
               | 'VERSE_OUT_OF_RANGE' | 'RANGE_INVALID' | 'UNPARSEABLE';

interface BibleRef {
  raw: string; offset: number; length: number;
  bookId?: string; chapter?: number; verseStart?: number; verseEnd?: number;
  status: RefStatus; canonicalEn: string; canonicalLocalised: string;
}

function detectBibleRefs(text: string, locales: string[]): BibleRef[];
function validateBibleRef(ref: BibleRef, canon: CanonIndex): BibleRef;
function compareVerbatim(ref: BibleRef, quoted: string, kjv: KjvModule)
  : { result: 'EXACT' | 'NEAR' | 'MISMATCH' | 'UNAVAILABLE'; diff?: Diff[] };
```

**Dependencies.** `data/canon` always; `data/kjv` lazily, per book, only when a verbatim
comparison is requested.

**Invariants**
- Detection is locale-aware and must not produce false positives on ordinary prose. "John 3"
  in a sentence about a person named John is a real ambiguity: require a chapter:verse
  pattern, or a book name in a citation context (parentheses, list, after a quotation), to
  claim a reference. Precision matters more than recall for *detection*; recall matters more
  for *validation* of things already claimed to be references.
- **Always `UNAVAILABLE`.** No verse text is bundled or shipped
  ([ADR-0021](../90-decisions/adr/0021-no-bundled-verse-text.md)), so verbatim comparison has
  nothing to compare against and **never returns `EXACT`**. The UI directs the member to a
  Bible reader instead of implying a check occurred. The other result values remain in the type
  only so that a future licensed text source is a data change rather than a signature change.

### 2.3 EGW citation engine (`packages/citations/egw`)

```ts
type EgwStatus = 'TITLE_MATCHED' | 'ABBREVIATION_MATCHED'
               | 'TITLE_NOT_IN_CATALOGUE' | 'PAGE_IMPLAUSIBLE' | 'PAGE_UNKNOWN';

interface EgwCitation {
  raw: string; offset: number; length: number;
  workId?: string; canonicalTitle?: string; page?: number; chapter?: string;
  status: EgwStatus; officialUrl?: string;
}

function detectEgwCitations(text: string, locales: string[]): EgwCitation[];
function validateEgwCitation(c: EgwCitation, catalogue: EgwCatalogue): EgwCitation;
```

**The catalogue record** — this is the complete shape, and its completeness is the point:

```json
{
  "workId": "DA",
  "canonicalTitle": "The Desire of Ages",
  "abbreviations": ["DA", "DofA"],
  "author": "Ellen G. White",
  "publisher": "Pacific Press Publishing Association",
  "firstPublished": 1898,
  "referenceEdition": { "year": 1940, "pageCount": 835 },
  "officialUrlTemplate": "https://.../{workId}",
  "localisedTitles": { "ko": "시대의 소망" },
  "lastReviewed": "2026-08-01"
}
```

There is no `text`, `content`, `excerpt`, `summary`, or `body` field, and adding one is a
schema-review blocking change ([ADR-0002](../90-decisions/adr/0002-no-egw-corpus.md)).

**Invariants**
- `TITLE_NOT_IN_CATALOGUE` renders as *"not found in our catalogue — check the official
  library"*, never as *"this work does not exist"*. The catalogue is a convenience, not an
  authority on non-existence.
- Page plausibility uses the reference edition's page count and always carries the caveat
  that pagination varies by edition. A page beyond the count is `PAGE_IMPLAUSIBLE`, not
  `INVALID`.
- Fuzzy title matching (edit distance ≤ 2 plus a token-overlap check) is used to *suggest*
  a correction — "did you mean *Steps to Christ*?" — and never to silently rewrite a citation.

### 2.4 Claim engine (`packages/claims`)

```ts
type ClaimType = 'scripture' | 'egw' | 'historical' | 'doctrinal' | 'synthesis' | 'personal';

interface ParsedClaim {
  index: number; text: string; type: ClaimType;
  assertedSource?: string; modelConfidence?: 'high' | 'medium' | 'low';
}

type ParseResult =
  | { ok: true; claims: ParsedClaim[]; blockVersion: 'SDAWS-CLAIMS-V1' }
  | { ok: false; reason: 'BLOCK_ABSENT' | 'BLOCK_MALFORMED' | 'BLOCK_EMPTY'; detail: string };

function parseClaimBlock(answerText: string): ParseResult;
function suggestManualSegments(answerText: string, locale: string): string[];
```

**Invariants**
- No partial success. A malformed block yields `ok: false` and the manual path; it never
  yields a half-parsed ledger, because a silently truncated ledger is a false assurance that
  everything was examined.
- The manual path marks every claim `extraction: 'manual'`, which is displayed.

### 2.5 Evidence engine (`packages/evidence`)

```ts
type EvidenceLevel = 'E0' | 'E1' | 'E2' | 'E3' | 'E4';
type ClaimStatus = 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'TEXT_CONSISTENT'
                 | 'NOT_VERIFIED' | 'CONTRADICTED' | 'INSUFFICIENT_EVIDENCE';

interface EvidenceRecord {
  level: EvidenceLevel;
  provenance: 'model_assertion' | 'second_model' | 'user_supplied_text'
            | 'user_attestation' | 'deterministic_validator';
  ownerId: string;                     // the claim's owner
  sourceBlockRefId?: string;           // E3
  attestation?: {                      // E4 — every field required together
    actorId: string;                   // MUST equal ownerId
    entryId: string; entryRevision: number;
    officialUrl: string;               // WHATWG-canonical (SR-7.6)
    attestedAt: string;
  };
}

/** The rendering guard. No UI string asserting official-source verification may be
 *  produced unless this returns true. E4 only: E3 establishes consistency with
 *  member-supplied text of unestablished provenance, which is not verification.
 *  Ordinal comparison over EvidenceLevel is forbidden — this function is why. */
function mayAssertOfficialVerification(r: EvidenceRecord): boolean {
  return r.level === 'E4';
}

function permittedStatuses(level: EvidenceLevel): ClaimStatus[];
function raise(current: EvidenceRecord, next: EvidenceRecord): EvidenceRecord; // never auto-raises past E2
```

**Invariants** (the integrity core of the whole product)
- `permittedStatuses('E0') = ['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE']`
- `permittedStatuses('E1') = ['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE']`
- `permittedStatuses('E2') = ['NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE', 'CONTRADICTED']`
  — **a second model's agreement never produces VERIFIED.** It can produce CONTRADICTED,
  because disagreement is genuine evidence of a problem while agreement is not evidence of truth.
- `permittedStatuses('E3') = [...E2, 'TEXT_CONSISTENT']` — **not** `VERIFIED`. Supplied text has
  no established provenance ([ADR-0019](../90-decisions/adr/0019-evidence-ladder-revision.md)).
- `permittedStatuses('E4') = [...E2, 'VERIFIED', 'PARTIALLY_VERIFIED']` — **not**
  `TEXT_CONSISTENT`. Promotion means a person went and looked, so the claim must resolve to what
  they found rather than sit in a consistency state.
- `raise()` may move E0→E1→E2 automatically. Reaching E3 requires a `sourceBlockRefId`; reaching
  E4 requires an attestation whose `actorId === ownerId`, bound to a pinned Source Directory
  revision. No code path reaches either level without the corresponding artefact.
- E3 is written by the browser and is **never re-derivable** after the session, because the
  supplied text was never transmitted. The service records it and never reconstructs it.

### 2.6 Safety screener (`packages/safety`)

```ts
type RiskCategory = 'imminent_harm' | 'self_harm' | 'abuse' | 'violence' | 'medical_emergency';
interface RiskMatch { category: RiskCategory; severity: 1|2|3; locale: string; }

function screen(text: string, locales: string[], lexicon: RiskLexicon): RiskMatch[];
function resourcesFor(category: RiskCategory, locale: string, region?: string): EmergencyResource[];
```

**Invariants**
- Runs before transmission, always in the browser.
- Never returns or logs the matched span. The event carries category and locale only.
- Never blocks. Never auto-submits. Never contacts anything.

### 2.7 Provider launcher (`packages/providers`)

```ts
interface ProviderConfig {
  id: 'chatgpt' | 'claude' | 'gemini' | string;
  displayName: string;
  openUrl: string;                  // plain open
  prefillTemplate?: string;         // e.g. "https://…/?q={prompt}"
  prefillMaxChars?: number;
  enabled: boolean;
  supportLevel: 'official' | 'best_effort';
  notes?: string;
}

function launch(p: ProviderConfig, prompt: string): Promise<LaunchOutcome>;
```

**Invariants** (see [AI Provider Architecture](../40-ai/41-ai-provider-architecture.md))
- The clipboard write **always** happens first and its success is confirmed to the user
  before the tab opens. Prefill is a bonus, never a dependency.
- If `prompt.length > prefillMaxChars` or `prefillTemplate` is absent, open the plain URL.
- Config comes from the server at runtime. A broken provider is disabled by a flag, not a deploy.
- No iframe. No popup automation. No focus stealing. No message passing to the provider tab.

---

## 3. Server components

### 3.1 Authorization module (`server/authz`)

```ts
type Action = 'conversation.read' | 'conversation.write' | 'conversation.delete'
            | 'verification.create' | 'export.run' | 'admin.user.read'
            | 'admin.content.breakglass' | /* … */ string;

interface Decision { allow: boolean; reason: string; quotaRemaining?: number; }

function authorize(actor: Actor, action: Action, resource?: ResourceRef): Promise<Decision>;
```

**Invariants**
- The *only* place authorization is decided. A route handler containing an `if (row.userId
  !== session.userId)` check is a code-review rejection.
- Ownership is enforced in the query predicate as well as in the decision — defence in depth
  (SR-2.1).
- Denials for resources the actor cannot see return 404, not 403.
- Entitlement and quota checks share this entry point so a tier change can never be enforced
  in one place and forgotten in another.

### 3.2 Crypto service (`server/crypto`)

```ts
interface Envelope { keyId: string; iv: Uint8Array; ciphertext: Uint8Array; tag: Uint8Array; }

function encryptForUser(userId: string, plaintext: string, aad: string): Promise<Envelope>;
function decryptForUser(userId: string, e: Envelope, aad: string): Promise<string>;
function rotateUserKey(userId: string): Promise<void>;
function destroyUserKey(userId: string): Promise<void>;   // crypto-erase
```

**Invariants**
- AES-256-GCM. AAD binds `userId + recordId + fieldName`, so a ciphertext moved to another
  row or field fails to decrypt. This defeats record-substitution attacks by a database-level
  adversary.
- The master key lives in the platform secret store, never in the database, never in the repo.
- DEKs are cached in memory per request with a short TTL; never logged, never serialised into
  an error, never returned by any route.
- `destroyUserKey` is called during account deletion *before* row deletion, so an interrupted
  deletion still leaves content unreadable.

### 3.3 Domain services

| Service | Responsibility | Notable invariants |
|---|---|---|
| `ConversationService` | CRUD, ordering, archive, duplicate, privacy mode | Ephemeral conversations reject any attempt to persist a body — enforced at the service, not the route |
| `VerificationService` | Create linked verification conversations, manage the claim ledger, record attestations | Cannot raise evidence past E2 without an artefact; maintains the bidirectional link and tombstones |
| `MembershipService` | Tier resolution, quota accounting, lifecycle transitions | Entitlement is computed from our own rows; the billing provider is a *signal*, never the source of truth for access |
| `AdminService` | User/role/config administration | All content access routed through break-glass; every mutation audited |
| `ExportService` | Full-account and per-conversation export | Decrypts, renders, streams; export events are audited; rate-limited to prevent bulk exfiltration by a hijacked session |
| `ConfigService` | Feature flags, provider config, source directory, emergency directory | Short-TTL cache; every change audited with before/after |

### 3.4 Audit service (`server/audit`)

```ts
interface AuditEvent {
  id: string; at: string; actorId: string | null; actorRole: string;
  action: string; resourceType: string; resourceId: string | null;
  ip: string | null; userAgent: string | null;
  metadata: Record<string, string | number | boolean>;   // NEVER user content
  prevHash: string; hash: string;
}
```

**Invariants**
- Append-only. No update or delete grant on the table for the application role.
- `hash = SHA-256(prevHash ‖ canonical(event))`, giving a tamper-evident chain; a daily job
  verifies the chain and alerts on a break.
- `metadata` is schema-restricted to scalars from an allowlist of keys. A content string
  cannot be written here even by mistake, because the writer validates against the allowlist.

### 3.5 Egress guard (`server/egress`)

```ts
function fetchAllowlisted(url: string, init?: RequestInit): Promise<Response>;
```

**Invariants**
- The only outbound HTTP client in server code. A CI rule fails the build on any direct
  `fetch(`/`axios`/`undici.request` in `server/` outside this module.
- Hostname must match the allowlist exactly (no suffix matching, which is how allowlists get
  bypassed). Allowlist contains: the email provider, the billing provider, the error
  reporter, and nothing else.
- A denied attempt raises a `security.egress_denied` audit event and a monitoring alert. In a
  system with no legitimate reason to call an LLM host, an attempt to do so is a signal worth
  waking someone up for.
- No URL derived from user input is ever passed to it (SR-10.4), enforced by taint-style
  review and a test that attempts SSRF against every route.

---

## 4. Reference data assets

| Asset | Size (approx.) | Contains | Never contains |
|---|---|---|---|
| Bible canon index | ~120 KB | 66 books, per-locale names/abbreviations, chapter counts, verses-per-chapter | Any Bible text |
| EGW catalogue | ~80 KB | ~200 works: titles, abbreviations, publisher, year, page counts, URL templates | **Any EGW text, of any length** |

| Topical Scripture index | ~150 KB | Curated topic → Bible reference mappings, human-authored | Commentary from copyrighted sources |
| Risk lexicon | ~40 KB per locale | Crisis phrases and categories | — |
| Emergency directory | ~20 KB | Region → hotline name, number, URL, last-reviewed | — |

All assets are content-hash pinned, served from the CDN with long cache lifetimes, and
versioned so a claim ledger can record which asset version validated it.

---

## 5. Component dependency rules

```
packages/*      → may depend on: other packages, contracts.  MUST NOT depend on: server/*
server/*        → may depend on: packages/*, contracts.
app/(workspace) → may depend on: packages/*, server actions.
app/(admin)     → same, plus admin-only server actions.
data/*          → depended upon; depends on nothing.
```

Enforced by an import-boundary lint rule. The critical direction is that
`packages/*` cannot import `server/*`, which is what keeps the validators and composer
runnable in a browser with no network — the property that makes Ephemeral mode and
offline composition real rather than aspirational.

# Database Design

**Document 9 of 37** · v1.1 · PostgreSQL 16+

The DDL below is a **specification artefact**, not a migration. It defines the intended
shape, constraints, and invariants precisely enough that an implementer cannot
misunderstand them. Actual migrations are written during Phase 1.

---

## 1. Design rules

1. **Every personal row is reachable from exactly one `user_id`.** This is what makes
   complete export and complete deletion possible by a single key.
2. **Identifiers are UUIDv7** — time-ordered for index locality, non-enumerable externally.
3. **Sensitive text is never stored in plaintext.** Message bodies, conversation titles, and
   claim text are stored as envelope ciphertext (`bytea` columns plus key id, IV, and tag).
4. **No table exists whose purpose is to hold Ellen G. White text.** Member-supplied source
   text never reaches this database at all — the supply channel is browser-only
   ([ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md), SR-D1). Message bodies
   may contain *purported* quotations, which are model output or member authorship rather than
   text drawn from a source; they are encrypted, capped, and counted by the tripwire (SR-D1a).
5. **Soft delete for user-facing recovery, hard delete on schedule.** Nothing important is
   destroyed by a misclick; nothing lingers past its retention date.
6. **Audit is append-only and hash-chained.** The application role has `INSERT` and `SELECT`
   only.
7. **Reference data does not live in the database.** The canon index, EGW catalogue, KJV
   module, topical index, risk lexicon, and emergency directory are versioned static assets
   ([Component Architecture §4](../10-architecture/13-component-architecture.md#4-reference-data-assets)).
   Only the *admin-editable* configuration — source directory, provider config, prompt
   templates, feature flags, announcements — is in the database.

---

## 2. Entity-relationship overview

```
user ──1:1── profile
 │     1:1── user_key            (wrapped DEK; destroyed on deletion = crypto-erase)
 │     1:N── credential          (password, future OAuth, TOTP)
 │     1:N── session
 │     1:1── membership ──N:1── plan
 │     │        └─1:N── subscription_event      (billing provider signals)
 │     1:N── user_setting
 │     1:N── consent_record
 │     1:N── conversation
 │     │        ├─1:N── message
 │     │        │         └─1:N── citation_hit          (denormalised validator output)
 │     │        ├─1:N── source_block_ref                (METADATA ONLY — no text, ever)
 │     │        ├─1:N── prompt_run                      (which template version, params)
 │     │        └─1:1── verification  (when the conversation IS a verification)
 │     │                   ├─N:1── origin_conversation
 │     │                   └─1:N── claim
 │     │                              └─1:N── evidence_record
 │     1:N── usage_counter
 │     1:N── export_job
 └───  1:N── audit_event (as actor)

admin/config (not user-owned):
  plan · prompt_template ──1:N── prompt_template_version
  source_directory_entry · provider_config · feature_flag
  announcement · emergency_resource · safety_event (no content)
```

---

## 3. Core identity

```sql
CREATE TABLE app_user (
  id               uuid PRIMARY KEY,                       -- UUIDv7
  email_hash       bytea NOT NULL UNIQUE,                  -- HMAC(email) for lookup
  email_enc        bytea NOT NULL,                         -- envelope-encrypted address
  email_verified_at timestamptz,
  status           text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','suspended','pending_deletion','deleted')),
  deletion_requested_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz
);
```

**Why `email_hash` rather than a plaintext unique index.** A stolen database dump of a
spiritual-guidance product is a list of people and what they confided. Hashing the lookup key
with a server-side HMAC secret means a dump alone does not yield the membership roster.
Login and password reset perform an HMAC then an indexed lookup, which is O(1) and does not
degrade the enumeration-resistance requirement.

```sql
CREATE TABLE profile (
  user_id        uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  display_name_enc bytea,
  ui_locale      text NOT NULL DEFAULT 'en',
  content_locale_override text,                            -- NULL = auto-detect
  timezone       text NOT NULL DEFAULT 'UTC',
  declared_role  text NOT NULL DEFAULT 'member'
                 CHECK (declared_role IN ('member','pastor','teacher','other')),
  preferred_provider text,                                 -- 'chatgpt' | 'claude' | ...
  default_privacy_mode text NOT NULL DEFAULT 'standard'
                 CHECK (default_privacy_mode IN ('standard','ephemeral')),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- declared_role grants NO entitlement (PR-ACC-11). Access comes from membership.tier only.

CREATE TABLE user_key (
  user_id     uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  key_id      text NOT NULL,                 -- identifies the master key generation
  wrapped_dek bytea NOT NULL,                -- DEK encrypted under the master key
  created_at  timestamptz NOT NULL DEFAULT now(),
  rotated_at  timestamptz
);
-- Destroying this row renders every ciphertext owned by the user permanently unreadable.

CREATE TABLE credential (
  id           uuid PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('password','totp','oauth_google')),
  secret_hash  text,                          -- Argon2id encoded string, for kind='password'
  totp_secret_enc bytea,                      -- envelope-encrypted, for kind='totp'
  provider_subject text,                      -- for OAuth
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE (user_id, kind)
);

CREATE TABLE session (
  id            uuid PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash    bytea NOT NULL UNIQUE,        -- SHA-256 of the opaque cookie value
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  ip_prefix     inet,                          -- /24 or /48 only; never a full address
  user_agent_family text,                      -- 'Chrome on macOS'; never a full UA string
  revoked_at    timestamptz
);
CREATE INDEX ON session (user_id) WHERE revoked_at IS NULL;

CREATE TABLE verification_token (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  purpose     text NOT NULL CHECK (purpose IN ('email_verify','password_reset','email_change')),
  token_hash  bytea NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

`ip_prefix` and `user_agent_family` are truncated deliberately: enough to show a user
"a session from Chrome on macOS in your region", not enough to build a tracking profile or
to become interesting to an attacker who obtains the database.

---

## 4. Membership

```sql
CREATE TABLE plan (
  id           text PRIMARY KEY,                    -- 'free' | 'member' | 'pastor'
  display_name text NOT NULL,
  price_cents  integer NOT NULL DEFAULT 0,
  currency     text NOT NULL DEFAULT 'USD',
  interval     text CHECK (interval IN ('month','year')),
  entitlements jsonb NOT NULL,                      -- see §4.1
  is_public    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0
);

CREATE TABLE membership (
  user_id           uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  plan_id           text NOT NULL REFERENCES plan(id),
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','past_due','canceled','expired','trialing')),
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  grace_until       timestamptz,                    -- read-only/export window after downgrade
  external_customer_id text,                        -- billing provider reference
  external_subscription_id text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscription_event (
  id            uuid PRIMARY KEY,
  user_id       uuid REFERENCES app_user(id) ON DELETE SET NULL,
  provider      text NOT NULL,
  external_event_id text NOT NULL UNIQUE,           -- idempotency key for webhooks
  event_type    text NOT NULL,
  payload_digest bytea NOT NULL,                    -- hash only; never the raw payload
  processed_at  timestamptz,
  received_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE usage_counter (
  user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  metric      text NOT NULL,                        -- 'prompt_generation' | 'verification_run' | 'export'
  period_start date NOT NULL,                       -- anniversary-based, not calendar
  count       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, metric, period_start)
);
```

### 4.1 Entitlement document shape

```json
{
  "apps": ["p2", "p3"],
  "promptGenerationsPerPeriod": 20,
  "verificationRunsPerPeriod": 3,
  "conversationRetentionDays": 30,
  "exportEnabled": false,
  "outlineExportEnabled": false,
  "citationChecklistEnabled": false,
  "fairUseRatePerHour": 60
}
```

Entitlements are data, not code. A tier change is a row update plus a cache bust — no
deploy. `authorize()` is the only reader.

---

## 5. Conversations and messages

```sql
CREATE TABLE conversation (
  id            uuid PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  app           text NOT NULL CHECK (app IN ('p2','p3','p4','verify')),
  title_enc     bytea,                               -- encrypted; client-side search
  title_key_id  text,
  content_locale text,                               -- detected or overridden
  privacy_mode  text NOT NULL DEFAULT 'standard'
                CHECK (privacy_mode IN ('standard','ephemeral','private')),
  provider_hint text,                                -- last provider used, for convenience
  tags          text[] NOT NULL DEFAULT '{}',        -- user-authored, plaintext by design
  archived_at   timestamptz,
  deleted_at    timestamptz,                         -- soft delete, 30-day recovery
  purge_after   timestamptz,                         -- retention enforcement
  message_count integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON conversation (user_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX ON conversation (purge_after) WHERE purge_after IS NOT NULL;

CREATE TABLE message (
  id           uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,  -- denormalised for authz
  seq          integer NOT NULL,                     -- ordering; never timestamps
  role         text NOT NULL CHECK (role IN (
                 'user',                  -- what the member typed
                 'workspace',             -- our deterministic guidance / composed prompt
                 'assistant_external',    -- pasted back from the user's AI
                 'system_note')),         -- e.g. "safety resources shown"
  body_enc     bytea,                     -- NULL for ephemeral conversations
  body_key_id  text,
  body_iv      bytea,
  body_tag     bytea,
  char_count   integer,                   -- kept even for ephemeral, for quota/analytics
  provider_id  text,                      -- for assistant_external
  provider_model text,                    -- only if the user states it; never inferred
  prompt_run_id uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, seq)
);

-- Ephemeral invariant, enforced in the database as well as the service layer:
ALTER TABLE message ADD CONSTRAINT ephemeral_has_no_body CHECK (
  body_enc IS NULL OR body_key_id IS NOT NULL
);
```

The ephemeral rule is enforced at three levels — the UI does not send the body, the service
refuses to write it, and a database trigger raises an exception if a body is written to a
message whose conversation is ephemeral. Three levels because "we promised not to store it"
is the kind of promise that quietly breaks during a refactor.

```sql
CREATE TABLE citation_hit (
  id            uuid PRIMARY KEY,
  message_id    uuid NOT NULL REFERENCES message(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('bible','egw')),
  raw_enc       bytea,                    -- the citation as written, encrypted
  normalised    text,                     -- 'John 3:16' or 'DA' — structural, not content
  book_id       text, chapter integer, verse_start integer, verse_end integer,
  egw_work_id   text, page integer,
  status        text NOT NULL,            -- validator status enum
  validator_asset_version text NOT NULL,  -- which canon/catalogue version judged it
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

`normalised` is deliberately plaintext: `John 3:16` and `DA` are structural identifiers, not
content, and keeping them queryable enables the SR-D3 accretion tripwire and useful
non-invasive analytics ("which works do members cite most?") without decrypting anything.

---

## 6. Source references — the corpus-prevention design

Member-supplied source text **never reaches this database**
([ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md), SR-D1). It lives in the
member's browser for the working session. What we store is a metadata reference:

```sql
CREATE TABLE source_block_ref (
  id                 uuid PRIMARY KEY,
  conversation_id    uuid NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES app_user(id)     ON DELETE CASCADE,
  kind               text NOT NULL CHECK (kind IN ('pasted_text','bible_reference','egw_citation','url')),
  char_count         integer NOT NULL CHECK (char_count <= 8000),   -- SR-D2 per-block cap
  attributed_work_id text,                -- catalogue work id, if identified
  client_commitment  bytea NOT NULL,      -- SHA-256(random salt ‖ normalised text), computed
                                          -- in the browser; the salt stays in the browser
  session_id         uuid NOT NULL,       -- E3 is session-scoped and never re-derivable
  created_at         timestamptz NOT NULL DEFAULT now(),

  -- ownership is structural, so an E3 record cannot reference another member's block
  UNIQUE (id, user_id)
);
CREATE INDEX ON source_block_ref (attributed_work_id) WHERE attributed_work_id IS NOT NULL;
```

**What is deliberately absent:** there is no `body_enc`, no `body_key_id`, no `label_enc`, no
`retention_policy`, no `user_library`, and no `expires_at`. The expiry timer and its hourly
purge job are gone **because there is nothing left to expire** — not because retention was
weakened. A reader arriving from the v1.0 schema should read the absence as the point.

### The commitment is not evidence

`client_commitment` is computed in the browser over a random per-block salt and the normalised
text. The salt never leaves the browser, so **our server cannot recompute or verify this
value**. It exists for one purpose: the member's own browser can later confirm it is looking at
the same text. It is a marker made by the member's client, not a proof held by us, and the
words *evidence*, *proof*, *fingerprint*, and *integrity guarantee* are forbidden in every
sentence describing it, in every locale (SR-D2).

### Corpus prevention still works

| Mechanism | Rule |
|---|---|
| **Per-block cap** | 8,000 characters, enforced in the browser and recorded here, with a CHECK constraint as backstop |
| **Per-conversation cap** | 40,000 characters total, enforced by the client before the reference is created |
| **Non-storage** | The strongest mechanism, and new in v1.1: text we never receive cannot accrete, leak, or be subpoenaed from us |
| **Accretion tripwire (SR-D3)** | A weekly job aggregates `char_count` by `attributed_work_id` across all users. Crossing a configured threshold for any single work raises an administrative alert. |

The tripwire is the honest part of this design and it survives the change intact, because
`char_count` and `attributed_work_id` are exactly what it aggregates — it never needed the text.
Caps prevent one member from pasting a book. Nothing prevents a thousand members from each
pasting a different chapter, except noticing. The alert does not auto-delete; it tells a human
to look, because the right response depends on what is actually happening.

### What this rule does *not* cover

`message.body_enc` may contain *purported* quotations — text a member typed, or an answer they
pasted back from their own AI. That is model output or member authorship, not text this system
drew from a source. It stays encrypted, capped, counted by the tripwire, and crypto-erased on
deletion (SR-D1a). The package therefore claims only that **we do not collect, ingest, host,
index, or hold Ellen G. White text as a source** — never the broader and false "we never store
EGW text".

---

## 7. Prompt runs and templates

```sql
CREATE TABLE prompt_template (
  id          text PRIMARY KEY,                 -- 'p3.guidance.source_bounded'
  app         text NOT NULL CHECK (app IN ('p2','p3','p4','verify','shared')),
  purpose     text NOT NULL,
  owner       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE prompt_template_version (
  id            uuid PRIMARY KEY,
  template_id   text NOT NULL REFERENCES prompt_template(id),
  version       integer NOT NULL,
  locale        text NOT NULL DEFAULT 'en',      -- template language, not answer language
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','published','deprecated','withdrawn')),
  body          text NOT NULL,                   -- the template source with placeholders
  parameters_schema jsonb NOT NULL,              -- Zod-compatible description
  change_notes  text,
  author_id     uuid REFERENCES app_user(id),
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, version, locale)
);
CREATE UNIQUE INDEX one_published_per_template_locale
  ON prompt_template_version (template_id, locale) WHERE status = 'published';

CREATE TABLE prompt_run (
  id            uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  template_version_id uuid NOT NULL REFERENCES prompt_template_version(id),
  parameters    jsonb NOT NULL,                  -- structural choices only; no free text
  content_locale text NOT NULL,
  char_count    integer NOT NULL,
  composed_prompt_enc bytea,                     -- only if the user pins it
  launched_provider text,
  launched_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

`parameters` holds the pastor's structural choices (audience, duration, number of points) and
never the free-text burden or question — those live in `message`, encrypted. Keeping
parameters queryable in plaintext enables template evaluation ("do four-point outlines
produce more unverified citations?") with no privacy cost.

---

## 8. Verification and the claim ledger

```sql
CREATE TABLE verification (
  id                    uuid PRIMARY KEY,
  conversation_id       uuid NOT NULL UNIQUE REFERENCES conversation(id) ON DELETE CASCADE,
  origin_conversation_id uuid REFERENCES conversation(id) ON DELETE SET NULL,
  origin_message_id     uuid REFERENCES message(id) ON DELETE SET NULL,
  origin_tombstone      jsonb,                  -- survives origin deletion
  user_id               uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  verifier_provider     text,
  status                text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','in_progress','completed','abandoned')),
  claim_extraction      text NOT NULL DEFAULT 'pending'
                        CHECK (claim_extraction IN ('pending','block_parsed','manual','failed')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz
);

CREATE TABLE claim (
  id             uuid PRIMARY KEY,
  verification_id uuid NOT NULL REFERENCES verification(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  ordinal        integer NOT NULL,
  text_enc       bytea NOT NULL,
  text_key_id    text NOT NULL,
  claim_type     text NOT NULL CHECK (claim_type IN
                   ('scripture','egw','historical','doctrinal','synthesis','personal')),
  asserted_source_enc bytea,                     -- what the AI claimed as its source
  status         text NOT NULL DEFAULT 'NOT_VERIFIED' CHECK (status IN
                   ('VERIFIED','PARTIALLY_VERIFIED','TEXT_CONSISTENT','NOT_VERIFIED',
                    'CONTRADICTED','INSUFFICIENT_EVIDENCE')),
  evidence_level text NOT NULL DEFAULT 'E0'
                 CHECK (evidence_level IN ('E0','E1','E2','E3','E4')),
  extraction     text NOT NULL DEFAULT 'block' CHECK (extraction IN ('block','manual')),
  intended_for_public_quotation boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (verification_id, ordinal),
  UNIQUE (id, user_id),          -- so evidence cannot attach to another member's claim

  -- THE INTEGRITY CONSTRAINT. VERIFIED is structurally impossible below E4.
  -- This is the product's core promise, expressed where it cannot be forgotten.
  CONSTRAINT verified_requires_member_confirmation CHECK (
    status NOT IN ('VERIFIED','PARTIALLY_VERIFIED')
    OR evidence_level = 'E4'
  ),
  -- E3's own status, and only E3's. Promotion to E4 means a person went and looked,
  -- so the claim must resolve to what they found rather than sit in consistency.
  CONSTRAINT text_consistent_is_e3_only CHECK (
    status <> 'TEXT_CONSISTENT' OR evidence_level = 'E3'
  )
);

CREATE TABLE evidence_record (
  id           uuid PRIMARY KEY,
  claim_id     uuid NOT NULL,
  user_id      uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  level        text NOT NULL CHECK (level IN ('E0','E1','E2','E3','E4')),
  provenance   text NOT NULL CHECK (provenance IN
                 ('model_assertion','second_model','user_supplied_text',
                  'user_attestation','deterministic_validator')),
  note_enc     bytea,
  recorded_at  timestamptz NOT NULL DEFAULT now(),

  -- E3: the browser's marker over text we never received
  source_block_ref_id uuid,

  -- E4: the attestation, pinned to the directory revision that was in force
  source_directory_entry_id text,
  source_directory_revision integer,
  attested_path_prefix      text,       -- copy of that revision's prefix, bound by the FK
  attested_eligible         boolean,    -- likewise
  attested_entry_status     text,       -- likewise
  canonical_url             text,       -- the URL we offered, from the template
  official_url              text,       -- WHATWG-canonical form (SR-7.6)
  official_url_host text GENERATED ALWAYS AS
    (substring(official_url from '^https://([a-z0-9.-]+)([/?#]|$)')) STORED,
  official_url_path text GENERATED ALWAYS AS
    (substring(official_url from '^https://[^/?#]+(/[^?#]*)')) STORED,
  attested_at  timestamptz,
  actor_id     uuid REFERENCES app_user(id),

  CONSTRAINT e3_requires_commitment CHECK (
    level <> 'E3' OR source_block_ref_id IS NOT NULL),

  -- ONE constraint. Every NOT NULL is restated here, because a CHECK that evaluates
  -- to NULL PASSES, and a partially-NULL row would otherwise slip past both this and
  -- the MATCH FULL foreign key below.
  CONSTRAINT e4_requires_bound_attestation CHECK (
    level <> 'E4' OR (
          provenance = 'user_attestation'
      AND official_url              IS NOT NULL
      AND official_url_host         IS NOT NULL
      AND official_url_path         IS NOT NULL
      AND source_directory_entry_id IS NOT NULL
      AND source_directory_revision IS NOT NULL
      AND attested_path_prefix      IS NOT NULL
      AND attested_eligible         IS TRUE
      AND attested_entry_status     = 'active'
      AND attested_at               IS NOT NULL
      -- "Confirmed by you" must be true: the attester owns this record
      AND actor_id                  IS NOT NULL
      AND actor_id                  = user_id
      -- the attested URL sits UNDER the prefix, not merely at or beside it
      AND starts_with(official_url_path, attested_path_prefix)
      AND length(official_url_path) > length(attested_path_prefix)
      -- and the path cannot mean something other than it reads (SR-7.6)
      AND official_url_path !~  '(^|/)\.\.?(/|$)'   -- dot segments
      AND official_url_path !~* '%2e'                -- encoded dot segments
      AND official_url_path !~  '//'                 -- empty segments
      AND official_url_path !~  '[\\]'               -- backslashes
    )),

  -- the copies must be the snapshot's own values, not whatever the caller supplied
  CONSTRAINT e4_binds_to_directory_revision
    FOREIGN KEY (source_directory_entry_id, source_directory_revision, official_url_host,
                 attested_path_prefix, attested_eligible, attested_entry_status)
    REFERENCES source_directory_entry_revision (entry_id, revision, host,
                 attestation_path_prefix, attestation_eligible, status)
    MATCH FULL,

  -- one owner along the whole chain: claim -> evidence -> attester
  CONSTRAINT evidence_belongs_to_its_claims_owner
    FOREIGN KEY (claim_id, user_id) REFERENCES claim (id, user_id) ON DELETE CASCADE,
  CONSTRAINT e3_commitment_belongs_to_same_owner
    FOREIGN KEY (source_block_ref_id, user_id) REFERENCES source_block_ref (id, user_id)
);
```

**These constraints are the most important lines in this document.** The evidence ladder is
enforced by the database, not only by application code, because application code gets
refactored by people who did not read this file. A developer who tries to mark a
model-corroborated claim as VERIFIED gets a constraint violation, and that violation is the
design working correctly.

Four things here are subtle enough that a future editor will otherwise "clean them up" and
silently delete the enforcement:

- **A CHECK that evaluates to NULL passes.** PostgreSQL rejects a row only when a CHECK is
  FALSE. `attested_eligible = true` is NULL — not FALSE — when the column is NULL. An earlier
  draft split this rule across three CHECKs, and NULLing the copied columns made every one of
  them evaluate to NULL and wave the row through. Hence **one** constraint, every `IS NOT NULL`
  restated inside it, and `IS TRUE` rather than `= true`.
- **`MATCH FULL`, not the default.** Under `MATCH SIMPLE` a composite foreign key is skipped
  whenever *any* column is NULL — so the same NULLs that defeat a CHECK also defeat the FK.
  `MATCH FULL` admits only all-NULL or all-non-NULL. E0–E3 rows are all-NULL and stand aside;
  E4 rows are forced non-null by the CHECK and are checked in full. The partially-NULL middle,
  which is the actual attack, becomes an error.
- **The denormalised `attested_*` columns are not redundancy.** They are the snapshot of what
  the rule *was* at the moment of attestation. The foreign key proves they really are that
  revision's values; the same-row CHECK then reasons over them locally, which is what removes
  the need for a trigger. Normalising them away would delete the constraint.
- **`starts_with` and `substring` are `IMMUTABLE`**, which is what permits them in a generated
  column and in a CHECK. An editor reaching for a URL-parsing function here will find it
  rejected — and that is the reason parsing happens in the service (SR-7.6) and only its
  *result* is stored.

`evidence_record` is append-only in practice: raising a claim's level writes a new record and
updates `claim.evidence_level`. The history of how a claim came to be believed is preserved,
which is exactly what someone reviewing a sermon citation months later needs.

---

## 9. Configuration (admin-editable)

```sql
-- The Source Directory is an append-only REVISION SERIES. An E4 attestation binds to the
-- revision that was in force when it was made, so a later disable, re-host, or prefix
-- correction cannot rewrite what a past attestation rested on.
--
-- The two tables reference each other, so neither can carry its cross-table foreign key at
-- creation. Create both bare, then add the constraints — the order is part of the design.

-- 1 · both tables, no cross-table foreign keys yet
CREATE TABLE source_directory_entry (
  id                text PRIMARY KEY,          -- 'egw_library_read'
  purpose           text NOT NULL,             -- 'egw_official' | 'bible_reader' | 'reference'
  created_at        timestamptz NOT NULL DEFAULT now(),
  current_revision  integer NOT NULL,
  last_probe_status integer,                   -- SR-7.4; probe_enabled defaults false
  last_probe_at     timestamptz
);

-- INSERT only. No UPDATE, no DELETE — enforced by grant, like evidence_record.
CREATE TABLE source_directory_entry_revision (
  entry_id                text    NOT NULL,
  revision                integer NOT NULL,
  name                    text    NOT NULL,
  host                    text    NOT NULL,   -- 'egwwritings.org', lower-case, no port/path
  base_url                text    NOT NULL,
  url_template            text,               -- 'https://…/search?q={query}'
  locale                  text,
  attestation_eligible    boolean NOT NULL,   -- a search or landing entry is a link target,
                                              -- not a place a claim can be confirmed
  attestation_path_prefix text,               -- '/read/' — a canonical DIRECTORY prefix
  status                  text    NOT NULL CHECK (status IN ('active','degraded','disabled')),
  last_reviewed           date    NOT NULL,
  notes                   text,
  changed_at              timestamptz NOT NULL DEFAULT now(),
  changed_by              uuid REFERENCES app_user(id),
  PRIMARY KEY (entry_id, revision),

  -- leading '/', a real first segment, TRAILING '/', no dot segments, no escapes
  CONSTRAINT eligible_entry_has_directory_prefix CHECK (
    attestation_eligible = false
    OR (attestation_path_prefix ~ '^/[^/].*/$'
        AND attestation_path_prefix !~ '(^|/)\.\.?(/|$)'
        AND attestation_path_prefix !~ '//'
        AND attestation_path_prefix !~ '[\\%]')),

  UNIQUE (entry_id, revision, host, attestation_path_prefix,
          attestation_eligible, status)
);

-- 2 · now the two cross-table foreign keys
ALTER TABLE source_directory_entry_revision
  ADD CONSTRAINT revision_belongs_to_entry
  FOREIGN KEY (entry_id) REFERENCES source_directory_entry (id);

ALTER TABLE source_directory_entry
  ADD CONSTRAINT current_revision_exists
  FOREIGN KEY (id, current_revision)
  REFERENCES source_directory_entry_revision (entry_id, revision)
  DEFERRABLE INITIALLY DEFERRED;    -- only this side needs deferral
```

**The trailing slash is load-bearing.** With a prefix of `/read`, `starts_with('/reading/x',
'/read')` is true and the wrong page passes. With `/read/` it does not, and `/read/` itself is
still rejected by the length comparison in §8.

**Write sequence — both halves in one transaction.** This is what the deferred foreign key
exists for:

```
create:  BEGIN; INSERT entry (…, current_revision = 1);
                INSERT revision 1 (complete state);          COMMIT;
change:  BEGIN; INSERT revision N+1 (complete new state);
                UPDATE entry SET current_revision = N+1;     COMMIT;
```

All mutable state lives in the revision table and the entry row keeps only identity plus a
pointer, so there is no second copy that can drift out of agreement with the snapshot. The
current state is always present in the revision table — which is what `evidence_record` binds
to.

```sql

CREATE TABLE provider_config (
  id                text PRIMARY KEY,          -- 'chatgpt' | 'claude' | 'gemini'
  display_name      text NOT NULL,
  open_url          text NOT NULL,
  prefill_template  text,
  prefill_max_chars integer,
  support_level     text NOT NULL DEFAULT 'best_effort'
                    CHECK (support_level IN ('official','best_effort')),
  enabled           boolean NOT NULL DEFAULT true,
  sort_order        integer NOT NULL DEFAULT 0,
  notes             text,
  last_reviewed     date NOT NULL
);

CREATE TABLE feature_flag (
  key         text PRIMARY KEY,
  enabled     boolean NOT NULL DEFAULT false,
  rollout_pct integer NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES app_user(id)
);

CREATE TABLE emergency_resource (
  id            uuid PRIMARY KEY,
  region        text NOT NULL,                 -- ISO 3166-1 alpha-2, or 'GLOBAL'
  locale        text NOT NULL,
  category      text NOT NULL,                 -- risk category this serves
  name          text NOT NULL,
  phone         text,
  url           text,
  hours         text,
  last_reviewed date NOT NULL,
  active        boolean NOT NULL DEFAULT true
);

CREATE TABLE announcement (
  id          uuid PRIMARY KEY,
  locale      text NOT NULL DEFAULT 'en',
  title       text NOT NULL,
  body_md     text NOT NULL,
  severity    text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz,
  created_by  uuid REFERENCES app_user(id)
);
```

`emergency_resource.last_reviewed` drives an admin warning at 12 months. A stale hotline
number in a crisis panel is the worst defect this product could ship, and staleness is
invisible unless something watches the clock.

---

## 10. Audit, safety, consent

```sql
CREATE TABLE audit_event (
  id            uuid PRIMARY KEY,
  at            timestamptz NOT NULL DEFAULT now(),
  actor_id      uuid REFERENCES app_user(id) ON DELETE SET NULL,
  actor_role    text NOT NULL,
  action        text NOT NULL,
  resource_type text,
  resource_id   uuid,
  target_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  ip_prefix     inet,
  metadata      jsonb NOT NULL DEFAULT '{}',   -- allowlisted scalar keys only
  prev_hash     bytea,
  hash          bytea NOT NULL
);
-- Application role: INSERT, SELECT. No UPDATE, no DELETE.
CREATE INDEX ON audit_event (target_user_id, at DESC);
CREATE INDEX ON audit_event (action, at DESC);

CREATE TABLE safety_event (
  id        uuid PRIMARY KEY,
  user_id   uuid REFERENCES app_user(id) ON DELETE CASCADE,
  category  text NOT NULL,
  locale    text NOT NULL,
  app       text,
  at        timestamptz NOT NULL DEFAULT now()
);
-- Deliberately has no column that could hold the triggering text (SR-8.4).
-- Deliberately has no severity trend or risk score: this product does not
-- build risk profiles of people who confided in it.

CREATE TABLE consent_record (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN
                ('terms','privacy','external_ai_disclosure','byok_key_handling','marketing_email')),
  version     text NOT NULL,
  granted     boolean NOT NULL,
  at          timestamptz NOT NULL DEFAULT now(),
  ip_prefix   inet
);

CREATE TABLE export_job (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  scope       text NOT NULL CHECK (scope IN ('account','conversation')),
  conversation_id uuid REFERENCES conversation(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'queued',
  download_token_hash bytea,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
```

---

## 11. Indexing and performance

| Query | Index |
|---|---|
| Conversation list for a user | `(user_id, updated_at DESC) WHERE deleted_at IS NULL` |
| Messages of a conversation | `(conversation_id, seq)` — the primary access path |
| Retention purge sweep | `conversation(purge_after)` — source references carry no expiry; they die with the conversation |
| Accretion tripwire | `source_block_ref(attributed_work_id)` |
| Session lookup | `session(token_hash)` unique |
| Login | `app_user(email_hash)` unique |
| Audit by subject | `audit_event(target_user_id, at DESC)` |
| Claim ledger for a verification | `claim(verification_id, ordinal)` |

At 100,000 members with ~1 KB average encrypted body and 200 messages per active member per
year, `message` reaches roughly 20 GB per year. Partition `message` by month at that scale
and archive partitions older than the retention window to encrypted object storage. Nothing
in the schema needs to change to enable this.

---

## 12. What is deliberately absent

| Absent | Why |
|---|---|
| Any `egw_text`, `passage`, `corpus`, `excerpt`, or `embedding` table | [ADR-0002](../90-decisions/adr/0002-no-egw-corpus.md). Adding one is a blocking schema review |
| A **body column on `source_block_ref`** | [ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md). Source text never reaches the server; restoring a body column would reverse an accepted decision |
| Any route accepting a source-text field | The client-side counterpart of the same rule, asserted by test (AC-E5) |
| `attestation_url_pattern`, or any regex column | Replaced by the structured `attestation_path_prefix`. A regex here cannot be checked for permissiveness; a prefix can |
| `pgvector` extension | Not enabled; its presence would be a review finding |
| Plaintext `email` column | Enumeration and dump resistance |
| Full-text search index over message bodies | Bodies are ciphertext; search is client-side at MVP |
| A user "risk score" or crisis history | The product does not profile the vulnerable |
| Raw billing webhook payloads | Digest only; payloads may carry PII we do not need |
| Any AI provider credential column | There is no such column anywhere, by design |
| Sequential integer primary keys exposed to clients | IDOR resistance |

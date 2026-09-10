-- Phase 7 Source Verification & Attestation Schema Migration (Database Design §8, §9 / SR-6 / SR-7)
-- Invariants:
-- 1. VERIFIED and PARTIALLY_VERIFIED are strictly impossible below E4.
-- 2. TEXT_CONSISTENT is strictly impossible outside E3.
-- 3. E4 attestation binds to pinned Source Directory revision (MATCH FULL).
-- 4. Attester must be the claim's owner (actor_id = user_id).
-- 5. Zero EGW text corpus; source references only.

-- 1 · Source Directory: entry and revision tables
CREATE TABLE IF NOT EXISTS source_directory_entry (
  id                text PRIMARY KEY,          -- 'egw_library_read'
  purpose           text NOT NULL,             -- 'egw_official' | 'bible_reader' | 'reference'
  created_at        timestamptz NOT NULL DEFAULT now(),
  current_revision  integer NOT NULL,
  last_probe_status integer,                   -- SR-7.4; probe_enabled defaults false
  last_probe_at     timestamptz
);

CREATE TABLE IF NOT EXISTS source_directory_entry_revision (
  entry_id                text    NOT NULL,
  revision                integer NOT NULL,
  name                    text    NOT NULL,
  host                    text    NOT NULL,   -- 'egwwritings.org', lower-case, no port/path
  base_url                text    NOT NULL,
  url_template            text,               -- 'https://…/search?q={query}'
  locale                  text,
  attestation_eligible    boolean NOT NULL,   -- a search or landing entry is a link target, not a place a claim can be confirmed
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

-- Cross-table foreign keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'revision_belongs_to_entry') THEN
    ALTER TABLE source_directory_entry_revision
      ADD CONSTRAINT revision_belongs_to_entry
      FOREIGN KEY (entry_id) REFERENCES source_directory_entry (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'current_revision_exists') THEN
    ALTER TABLE source_directory_entry
      ADD CONSTRAINT current_revision_exists
      FOREIGN KEY (id, current_revision)
      REFERENCES source_directory_entry_revision (entry_id, revision)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- 2 · Verification conversation linking table
CREATE TABLE IF NOT EXISTS verification (
  id                    uuid PRIMARY KEY,
  conversation_id       uuid NOT NULL UNIQUE REFERENCES conversation(id) ON DELETE CASCADE,
  origin_conversation_id uuid REFERENCES conversation(id) ON DELETE SET NULL,
  origin_message_id     uuid REFERENCES message(id) ON DELETE SET NULL,
  origin_tombstone      jsonb,                  -- survives origin deletion (SR-6.7)
  user_id               uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  verifier_provider     text,
  status                text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','in_progress','completed','abandoned')),
  claim_extraction      text NOT NULL DEFAULT 'pending'
                        CHECK (claim_extraction IN ('pending','block_parsed','manual','failed')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz
);

-- 3 · Claim ledger table
CREATE TABLE IF NOT EXISTS claim (
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

-- 4 · Evidence record and bound attestation table
CREATE TABLE IF NOT EXISTS evidence_record (
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

-- Phase 5 Source Block References Schema Migration (Database Design §5 / SR-D2 / ADR-0022)
-- Invariant 1 & 4: METADATA ONLY — NO body column, NO key ID, NO source text stored.

CREATE TABLE IF NOT EXISTS source_block_ref (
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

CREATE INDEX IF NOT EXISTS idx_source_block_ref_work
  ON source_block_ref (attributed_work_id) WHERE attributed_work_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_source_block_ref_conv
  ON source_block_ref (conversation_id);

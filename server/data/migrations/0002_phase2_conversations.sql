-- Phase 2 Conversations & Messages Schema Migration (Database Design §5)
-- Enforces: Sequential ordering (seq), 4 turn kinds, 3-layer ephemeral mode.

CREATE TABLE IF NOT EXISTS conversation (
  id             uuid PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  app            text NOT NULL CHECK (app IN ('p2','p3','p4','verify')),
  title_enc      bytea,
  title_key_id   text,
  content_locale text,
  privacy_mode   text NOT NULL DEFAULT 'standard'
                 CHECK (privacy_mode IN ('standard','ephemeral','private')),
  provider_hint  text,
  tags           text[] NOT NULL DEFAULT '{}',
  archived_at    timestamptz,
  deleted_at     timestamptz,
  purge_after    timestamptz,
  message_count  integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_user_active
  ON conversation (user_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_purge
  ON conversation (purge_after) WHERE purge_after IS NOT NULL;

CREATE TABLE IF NOT EXISTS message (
  id              uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  seq             integer NOT NULL,
  role            text NOT NULL CHECK (role IN (
                    'user',
                    'workspace',
                    'assistant_external',
                    'system_note')),
  body_enc        bytea,
  body_key_id     text,
  body_iv         bytea,
  body_tag        bytea,
  char_count      integer,
  provider_id     text,
  provider_model  text,
  prompt_run_id   uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, seq),
  -- Ephemeral constraint backstop:
  CONSTRAINT ephemeral_has_no_body CHECK (
    body_enc IS NULL OR body_key_id IS NOT NULL
  )
);

-- Layer 3 Ephemeral Guard: Database trigger preventing body storage on ephemeral conversations
CREATE OR REPLACE FUNCTION check_ephemeral_no_body()
RETURNS TRIGGER AS $$
DECLARE
  conv_privacy text;
BEGIN
  SELECT privacy_mode INTO conv_privacy FROM conversation WHERE id = NEW.conversation_id;
  IF conv_privacy = 'ephemeral' AND NEW.body_enc IS NOT NULL THEN
    RAISE EXCEPTION 'SECURITY INVARIANT VIOLATION: Ephemeral conversation message cannot contain body_enc (SR-D1 / Database Design §5)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_ephemeral_no_body ON message;
CREATE TRIGGER trg_enforce_ephemeral_no_body
BEFORE INSERT OR UPDATE ON message
FOR EACH ROW
EXECUTE FUNCTION check_ephemeral_no_body();

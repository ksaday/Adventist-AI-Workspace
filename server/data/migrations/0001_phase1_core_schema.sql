-- Phase 1 Core Schema Migration (Database Design §3 - §9)
-- Invariant: No EGW corpus, no server-side source text, only E4 verifies.

-- 1. Identity & Credentials
CREATE TABLE IF NOT EXISTS app_user (
  id                    uuid PRIMARY KEY,
  email_hash            bytea NOT NULL UNIQUE,
  email_enc             bytea NOT NULL,
  email_verified_at     timestamptz,
  status                text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','suspended','pending_deletion','deleted')),
  deletion_requested_at timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  last_seen_at          timestamptz
);

CREATE TABLE IF NOT EXISTS profile (
  user_id                 uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  display_name_enc        bytea,
  ui_locale               text NOT NULL DEFAULT 'en',
  content_locale_override text,
  timezone                text NOT NULL DEFAULT 'UTC',
  declared_role           text NOT NULL DEFAULT 'member'
                          CHECK (declared_role IN ('member','pastor','teacher','other')),
  preferred_provider      text,
  default_privacy_mode    text NOT NULL DEFAULT 'standard'
                          CHECK (default_privacy_mode IN ('standard','ephemeral')),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_key (
  user_id     uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  key_id      text NOT NULL,
  wrapped_dek bytea NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  rotated_at  timestamptz
);

CREATE TABLE IF NOT EXISTS credential (
  id               uuid PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('password','totp','oauth_google')),
  secret_hash      text,
  totp_secret_enc  bytea,
  provider_subject text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_used_at     timestamptz,
  UNIQUE (user_id, kind)
);

CREATE TABLE IF NOT EXISTS session (
  id                  uuid PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash          bytea NOT NULL UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  last_active_at      timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  ip_prefix           inet,
  user_agent_family   text,
  revoked_at          timestamptz
);
CREATE INDEX IF NOT EXISTS idx_session_user_active ON session (user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS verification_token (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  purpose     text NOT NULL CHECK (purpose IN ('email_verify','password_reset','email_change')),
  token_hash  bytea NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Membership & Plans
CREATE TABLE IF NOT EXISTS plan (
  id           text PRIMARY KEY,
  display_name text NOT NULL,
  price_cents  integer NOT NULL DEFAULT 0,
  currency     text NOT NULL DEFAULT 'USD',
  interval     text CHECK (interval IN ('month','year')),
  entitlements jsonb NOT NULL,
  is_public    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS membership (
  user_id                  uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  plan_id                  text NOT NULL REFERENCES plan(id),
  status                   text NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','past_due','canceled','expired','trialing')),
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean NOT NULL DEFAULT false,
  grace_until              timestamptz,
  external_customer_id     text,
  external_subscription_id text,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- 3. Audit Log (Append-only & Hash chained)
CREATE TABLE IF NOT EXISTS audit_event (
  id             uuid PRIMARY KEY,
  timestamp      timestamptz NOT NULL DEFAULT now(),
  actor_id       uuid,
  action         text NOT NULL,
  resource_id    text NOT NULL,
  payload_digest text,
  prev_hash      text NOT NULL,
  entry_hash     text NOT NULL UNIQUE
);

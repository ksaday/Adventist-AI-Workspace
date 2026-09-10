# Deployment Architecture

**Document 26 of 37** · v1.1

---

## 1. Environments

| Environment | Purpose | Data | Cost |
|---|---|---|---|
| **local** | Development | Seeded synthetic data only. Never a production dump | $0 |
| **preview** | Per-pull-request ephemeral | Synthetic | $0 on free tiers; auto-destroyed |
| **staging** | Pre-release verification, restore rehearsals | Synthetic + anonymised structural fixtures | ~$13/mo (smallest tiers), can be torn down between releases |
| **production** | Live | Real | See [Cost Model](../80-ops/81-cost-model.md) |

**Rule:** production data is never copied to any other environment, in any form, for any
reason. Restore rehearsals restore *into staging* from a production backup and then run an
anonymisation pass — or, preferably, rehearse restores from a synthetic backup taken on
staging, and verify production restores only by checksum and a schema-level smoke test. The
second option is chosen here because it never places real conversation ciphertext outside
production, and the master key is not present in staging so the ciphertext would be inert
anyway. Both properties are stated so the operator understands why the drill looks the way it does.

---

## 2. Production topology (MVP)

```
                       ┌──────────────────────────────────┐
                       │ Cloudflare (free)                │
   Users ─────────────▶│  DNS · TLS edge · DDoS · WAF     │
                       │  Cache: /_next/static, /data/*   │
                       └──────────────┬───────────────────┘
                                      │ HTTPS (origin pull, authenticated)
                       ┌──────────────▼───────────────────┐
                       │ Render Web Service (Starter/Std) │
                       │  Next.js container, Node 22      │
                       │  1 instance · health check /healthz
                       │  Egress allowlist enforced in app│
                       └──────┬───────────────────┬───────┘
                              │ private network   │ allowlisted egress
                   ┌──────────▼─────────┐   ┌─────▼──────────────────────┐
                   │ Render PostgreSQL  │   │ Resend (email)             │
                   │  daily backup      │   │ Paddle (billing webhooks)  │
                   │  PITR on Pro tier  │   │ Sentry / GlitchTip (errors)│
                   └────────────────────┘   └────────────────────────────┘

   Secrets: platform secret store (MASTER_ENCRYPTION_KEY, DB URL, provider keys for
            email/billing only). No AI provider keys exist anywhere.
```

**Why Cloudflare in front even at MVP.** It is free, and it converts the two cheapest
attacks on this system — volumetric DDoS and bandwidth-burning crawls — from a cost event
into a non-event. For an architecture whose central promise is cost predictability, a free
layer that caps bandwidth risk is not optional.

---

## 3. Build and release pipeline

```
git push ──▶ CI
   │
   ├─ 1. Install (lockfile frozen, no post-install scripts for new deps without review)
   ├─ 2. Typecheck
   ├─ 3. Lint  ── includes: import-boundary rule, message-catalogue verification-claim lint,
   │              no-direct-fetch-in-server rule
   ├─ 4. COST FIREWALL ── dependency denylist · env-var guard · egress-allowlist test
   │                       (fails the build; never a warning)
   ├─ 5. Unit tests ── composer golden files, validators, evidence state machine
   ├─ 6. Integration tests ── auth, authz/IDOR sweep, entitlements, crypto round trip
   ├─ 7. Security tests ── CSRF, XSS render, SSRF sweep, log canary
   ├─ 8. Accessibility ── axe on the ten core flows
   ├─ 9. Build container ── SBOM generated and stored
   ├─ 10. Vulnerability scan ── fail on critical/high in the production dependency tree
   └─ 11. Deploy
          ├─ preview  → automatic on PR
          ├─ staging  → automatic on merge to main
          └─ production → manual promotion, requires green staging + migration review
```

**Migrations.** Expand/contract only. A release never contains both a destructive migration
and the code that depends on it: add the column, deploy code that writes both, backfill,
deploy code that reads the new column, then drop the old one in a later release. This is
slower and it is the only way a single-instance deployment survives a rollback.

**Rollback.** Container images are immutable and retained for 30 days. Rollback is a
redeploy of the previous image. Because migrations are expand/contract, the previous image
is always schema-compatible with the current database.

---

## 4. Configuration and secrets

| Class | Where | Rotation | Notes |
|---|---|---|---|
| `MASTER_ENCRYPTION_KEY` | Platform secret store | Annual, with re-wrap of all DEKs | Loss of this key destroys all message bodies. Escrow a sealed copy offline — see [Disaster Recovery](../80-ops/85-disaster-recovery-plan.md#5-the-master-key) |
| `DATABASE_URL` | Platform secret store | On incident | Least-privilege role, no superuser |
| `SESSION_SECRET` | Platform secret store | Quarterly | Rotation invalidates sessions; announce it |
| Email / billing / error-reporter keys | Platform secret store | Quarterly | Scoped to minimum permissions |
| **AI provider keys** | **Nowhere** | — | Startup aborts if any is present (SR-10.2) |
| Feature flags, provider deep links, source directory, emergency directory, prompt templates | **Database**, admin-editable | Continuous | Changed without a deploy; every change audited |

The split matters operationally: everything likely to need a fast change under pressure —
a broken provider link, a wrong hotline number, a prompt template that is producing bad
output — lives in the database and is editable by an administrator in minutes. Everything
security-critical lives in the secret store and requires a deploy.

---

## 5. Runtime hardening

- Container runs as a non-root user; read-only root filesystem except a tmpfs scratch.
- No shell utilities in the production image beyond what Node needs (distroless-style base).
- `NODE_OPTIONS` fixed; no dynamic module loading from user input; no `eval`.
- Security headers set at the edge and re-asserted at the origin:
  `Content-Security-Policy` (see [Security Architecture §6](../60-risk/62-security-architecture.md)),
  `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` denying camera, microphone, geolocation, and payment,
  `Cross-Origin-Opener-Policy: same-origin`, `X-Frame-Options: DENY`.
- Our own pages are never frameable, which also prevents an attacker from framing our
  workspace beside a fake "provider" pane.
- Health endpoints: `/healthz` (liveness, no DB), `/readyz` (readiness, DB ping). Neither
  discloses version or dependency detail publicly.

---

## 6. Scaling and capacity

| Trigger | Action |
|---|---|
| p95 latency > 800 ms for 15 min | Scale the container up one tier |
| Sustained CPU > 70% for 1 h | Scale up; investigate the hot path |
| DB connections > 70% of pool | Add PgBouncer or raise the plan; move sessions to Redis at ~10k concurrent |
| DB storage > 70% | Raise the plan; run the retention job; review the SR-D3 accretion report |
| Bandwidth trending toward the plan allowance | Verify Cloudflare cache hit ratio on `/data/*` first — reference assets should be ~100% edge-cached |

Capacity planning assumption: an active member generates roughly **8 requests per session**
(load, list, create, save turn, save answer, validate, verify, export) — well under a
thousand requests per member per month. A single 1 GB container handles this for several
thousand members. The system is not request-bound; it is storage-bound, and storage is
bounded by retention policy.

---

## 7. Backups

Summarised here; full detail in [Backup & Recovery](../80-ops/84-backup-recovery-plan.md).

- Managed daily database backups with 7-day retention on the base tier; PITR on the Pro tier.
- Weekly logical dump (`pg_dump`) encrypted with an independent key and pushed to Backblaze
  B2 (~$6/TB/month, flat and trivial at our volume). This exists so a compromise or
  mis-billing at the hosting provider cannot destroy every copy.
- Reference data assets are in git and require no backup.
- **The master encryption key is backed up separately and offline.** Backups without it are
  useless for message bodies, which is the intended property against a database-only breach
  and the primary risk against operator error.

---

## 8. The single-instance question

The MVP runs one application instance. This is a deliberate acceptance of a few minutes of
downtime during deploys and an hour or two during a host incident, in exchange for a simple,
cheap, comprehensible system with a 99.5% target rather than 99.95%.

Two properties make this acceptable:

1. **The browser degrades gracefully.** With the server down, the composer, the validators,
   and the clipboard still work. A user mid-sermon-prep is inconvenienced, not stopped.
2. **Zero-downtime deploys are available** on the chosen host via health-checked rolling
   restarts, so routine releases are invisible.

Moving to two instances is a configuration change plus a shared session store, scheduled at
the ~10,000-member mark, not a re-architecture.

# System Architecture

**Document 7 of 37** · v1.1

---

## 1. Architectural essence

The system is a **deterministic workflow engine with a chat-shaped interface**. It contains
no model, no corpus, and no inference. Its intelligence is entirely in three places:

1. **Prompt composition** — turning structured user intent into a rigorous, source-bounded
   instruction for someone else's model.
2. **Deterministic validation** — checking references against bundled structural data.
3. **The evidence ledger** — recording, honestly and permanently, what kind of evidence
   stands behind every claim.

Everything else is a well-built CRUD application with strong privacy properties.

Stating it this plainly matters, because it sets the right expectations for the
implementation team: **this is not an AI engineering project.** It is a security-and-workflow
engineering project whose subject matter happens to be AI output.

---

## 2. Layered view

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ PRESENTATION — browser                                                        │
│                                                                               │
│  Workspace shell · Conversation timeline · Composer · Claim Ledger · Settings │
│  Admin console                                                                │
│                                                                               │
│  ┌─────────────────────── CLIENT-ONLY ENGINES (no network) ────────────────┐  │
│  │  Prompt Composer        deterministic, pure, template-versioned         │  │
│  │  Bible Reference Parser + Canon Validator                               │  │
│  │  EGW Citation Normaliser + Catalogue Validator                          │  │
│  │  KJV Verse Comparator   (conditional module, lazy-loaded per book)      │  │
│  │  Risk Lexicon Screener  (safety, pre-transmission)                      │  │
│  │  Claim Block Parser     (SDAWS-CLAIMS-V1)                               │  │
│  │  Language Detector                                                      │  │
│  │  Clipboard + Provider Launcher                                          │  │
│  │  [Conditional] BYOK Direct Connect (browser → provider only)            │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬────────────────────────────────────────────┘
                                   │ HTTPS · session cookie · Zod-validated
┌──────────────────────────────────▼────────────────────────────────────────────┐
│ APPLICATION — Next.js server (long-running container)                         │
│                                                                               │
│  Route/action layer ── input validation, CSRF/origin check, rate limit        │
│  Authorization module ── (actor, action, resource) → allow/deny               │
│  Entitlement module ── tier, quota, feature flags                             │
│  Domain services ── Conversation · Verification · Membership · Admin · Export │
│  Crypto service ── per-user DEK, envelope encrypt/decrypt, crypto-erase       │
│  Audit service ── append-only, hash-chained                                   │
│  Log scrubber ── strips content before any log/metric/error egress            │
│  Egress guard ── hostname allowlist; deny = security event                    │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  ABSENT BY DESIGN: any LLM SDK, any model call, any provider API key │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└───────┬──────────────────────┬────────────────────┬───────────────────────────┘
        │                      │                    │
┌───────▼────────┐   ┌─────────▼────────┐  ┌────────▼──────────────────────────┐
│ PostgreSQL     │   │ Static reference │  │ Allowlisted external services     │
│ users, convos, │   │ assets (CDN)     │  │ email · billing · error reporter  │
│ messages(enc), │   │ canon index      │  └───────────────────────────────────┘
│ claims, audit  │   │ EGW catalogue    │
└────────────────┘   │ KJV module       │
                     │ risk lexicon     │
                     │ topical index    │
                     │ i18n catalogues  │
                     └──────────────────┘
```

---

## 3. Why so much logic lives in the browser

Placing the composer and validators client-side is a deliberate architectural choice with
four justifications:

1. **Privacy.** The risk-lexicon screener runs *before* anything is transmitted. Safety
   screening that requires sending the crisis text to a server is worse than no screening,
   for the user's sake.
2. **Cost.** Validation of every reference in every message, for every user, at zero server
   CPU and zero marginal cost. At 100,000 members this is the difference between a $30 box
   and a $300 one.
3. **Ephemeral mode is real.** For an Ephemeral conversation, composition and validation
   happen entirely in the browser; the server sees metadata only. This is only credible if
   the engines do not need the server.
4. **Offline-tolerance.** A pastor preparing a sermon on a poor connection can still compose,
   validate, and copy.

The same TypeScript modules run server-side for export rendering and audit reproduction
(SR-4.2), so composition is verifiably identical in both environments — enforced by a
shared golden-file test.

---

## 4. The core sequence — answer-first (the default path)

```
USER            WORKSPACE (browser)      SERVER            EXTERNAL AI      OFFICIAL SOURCE
 │                    │                    │                    │                 │
 │─ types question ──▶│                    │                    │                 │
 │                    │─ risk screen (local)                    │                 │
 │                    │─ detect language (local)                │                 │
 │                    │─ compose prompt from template vN (local)│                 │
 │                    │─ POST turn metadata ──▶│                │                 │
 │                    │◀── conversation id ────│                │                 │
 │◀ prompt shown ─────│                    │                    │                 │
 │─ Copy & Open ─────▶│─ clipboard write; open new tab ────────▶│                 │
 │                    │                    │                    │                 │
 │────────────── converses in their own AI session ────────────▶│                 │
 │◀───────────── answer (with SDAWS-CLAIMS block) ──────────────│                 │
 │                    │                    │                    │                 │
 │─ Paste Answer ────▶│                    │                    │                 │
 │                    │─ parse claim block (local)              │                 │
 │                    │─ validate every Bible ref (local)       │                 │
 │                    │─ validate every EGW citation (local)    │                 │
 │                    │─ POST encrypted body + claims ─▶│       │                 │
 │◀ answer + ledger ──│                    │                    │                 │
 │                    │                    │                    │                 │
 │─ Verify Sources ──▶│─ POST create verification ─────▶│       │                 │
 │                    │─ compose verification prompt (local)    │                 │
 │─ Copy & Open ─────▶│──────────────────────────────────────▶  │                 │
 │◀── verification result pasted back ──────────────────────────│                 │
 │                    │─ merge into ledger (E2 at best) │       │                 │
 │─ Source Check ────▶│─ open official library ──────────────────────────────────▶│
 │─ attest confirmed ▶│─ POST attestation ─────────────▶│  (claim → E4)           │
```

The four separate "arrival points" for evidence — the model's own claim (E1), a second model's
agreement (E2), consistency with text the member supplied (E3), and the member's own
confirmation at the source (E4) — never merge. Each writes a distinct record with a distinct
provenance, and only the last permits `VERIFIED`.

---

## 5. The source-first variant

When the user supplies sources before asking, the composer switches modes:

```
User supplies passage(s) ──▶ stays in the BROWSER (never sent to our server; ADR-0022)
                             server records metadata + a client commitment only
                             │
                             ▼
              Composer emits SOURCE-BOUNDED template:
              "Reason only from the material between the delimiters.
               If it is insufficient, say so explicitly and stop."
                             │
                             ▼
              Answer's scripture/EGW claims can reach E3 directly, because the
              supplied text is present for comparison. E3 is TEXT_CONSISTENT —
              not verification, not green. Only the member's own trip to the
              official source (E4) can produce VERIFIED.
```

This is the higher-integrity path and the product nudges toward it for P4 work intended for
public preaching. It is not the default path because it costs the user more effort up front,
and a product nobody finishes is not safer than one they do.
See [Critical Review §4](../90-decisions/92-critical-review.md).

---

## 6. Trust boundaries

| # | Boundary | Crossing | Controls |
|---|---|---|---|
| TB-1 | Internet → our server | HTTPS requests | TLS 1.2+, HSTS, WAF, rate limits, Zod validation, origin check, session auth |
| TB-2 | Browser JS → our server | Session cookie | HttpOnly/Secure/SameSite, CSRF origin check, per-request authorization |
| TB-3 | Our server → database | Connection string | Private network or TLS, least-privilege role, no superuser, parameterised queries only |
| TB-4 | **Pasted external content → our application** | User paste | **Treated as untrusted data.** No HTML rendering, sanitised Markdown, CSP, no auto-execution, no instruction interpretation (we have no model, so there is nothing to inject *into*) |
| TB-5 | Our composed prompt → the user's AI session | Clipboard / URL | Nonce delimiters, data-not-instruction clause, prefill length cap |
| TB-6 | Our server → external services | Outbound HTTPS | Hostname allowlist, no user-derived URLs, no LLM hosts present |
| TB-7 | Admin → user content | Break-glass | Reason required, re-auth, audit entry, user notified within 24 h |
| TB-8 | Browser → AI provider (conditional BYOK) | Direct API call | Not built. Gated on published provider sanction (ADR-0020). If ever built: key never touches our origin; CSP `connect-src` enumerates endpoints; explicit consent |

**TB-4 deserves emphasis.** In a conventional AI product, pasted content is dangerous because
it can hijack the application's own model. Here, there is no application model. The pasted
text is inert data flowing into a renderer and a parser. The residual risks are the ordinary
web ones — XSS, oversized payloads, malicious links — and they are handled with ordinary web
controls. **Removing the model from the server removed an entire vulnerability class.** This
is the strongest security argument for the architecture and it should be stated in any
security review.

---

## 7. Data flow classification

| Flow | Contains user content? | Encrypted at rest | Leaves our infrastructure |
|---|---|---|---|
| Conversation metadata (title, app, language, timestamps) | Title only | Yes (title encrypted) | No |
| Message bodies | Yes | Yes, per-user DEK | Only when the user copies to their AI |
| User-supplied source text | Yes | Yes, per-user DEK, capped and expiring | No |
| Claims and evidence records | Yes (claim text) | Yes | No |
| Composed prompts | Yes | Not stored by default | Yes, by explicit user action |
| Ephemeral conversation bodies | Yes | **Never written** | Only via the user's clipboard |
| Audit events | No content, actor + action + resource id only | n/a | No |
| Safety events | Category and locale only | n/a | No |
| Metrics | No content | n/a | To error reporter, scrubbed |
| Email | Address + non-content template data | In transit | Yes, to email provider |

---

## 8. Scaling path

| Members | Shape | Notes |
|---|---|---|
| ≤ 1,000 | One app container (512 MB–1 GB), one Postgres (1 GB) | The MVP shape. Costs $29–52/mo |
| ≤ 10,000 | One larger container (2 GB), Postgres 4 GB, Cloudflare in front | Still one instance; sessions in Postgres are fine |
| ≤ 50,000 | 2–3 containers behind the platform load balancer, Postgres 8–16 GB with a read replica for the conversation list | Move sessions to Redis if connection count pressures Postgres |
| ≤ 100,000+ | Horizontal app tier, Postgres with replicas, partition `messages` by month, archive cold conversations to object storage (still encrypted) | Reference asset serving already on CDN and free |

Nothing in the scaling path introduces a metered AI cost, because there is no AI. The cost
curve is bounded by storage and bandwidth, both of which are capped by retention policy and
by the source-text limits.

---

## 9. Failure modes and degradation

| Failure | Effect | Degradation strategy |
|---|---|---|
| Database unavailable | No persistence | Composer, validators, and clipboard still work fully in the browser. Show a clear "not saved" banner; offer download of the current conversation as Markdown. **The core value survives a database outage** — a direct consequence of client-side engines |
| Email provider down | No verification/reset mails | Queue with retry; show accurate status; never silently drop |
| Billing provider down | No upgrades | Existing entitlements unaffected (they are our rows, not theirs); queue webhooks and reconcile |
| Provider deep link broken | Prefill fails | Clipboard copy already happened; instruct the user to paste. Admin disables the deep link by flag without a deploy |
| Official EGW Library unreachable | Source Check links fail | Reachability probe marks the entry `degraded`; UI shows a notice with the plain search URL |
| Error reporter down | No error telemetry | Local structured logs retained; non-blocking |
| CDN down | Reference assets unavailable | Assets also served from the origin as a fallback path; validators degrade to "unable to validate", never to "valid" |

**The last row is a rule, not a note.** Every validator fails to `UNKNOWN`, never to `VALID`.
A validation system that fails open is worse than none, because it manufactures false
confidence in exactly the situation where the user most needs the truth.

---

## 10. Cross-cutting concerns

| Concern | Where it lives |
|---|---|
| Authentication | [31-authentication-design.md](../30-identity/31-authentication-design.md) |
| Authorization & entitlements | Single module; every route delegates. [62](../60-risk/62-security-architecture.md) |
| Encryption | Crypto service; [61-privacy-architecture.md](../60-risk/61-privacy-architecture.md) |
| Internationalisation | Message catalogues + terminology table; [53](../50-ux/53-internationalization-plan.md) |
| Feature flags & runtime config | Database-backed, admin-editable, cached with a short TTL |
| Prompt templates | Versioned rows + published snapshot; [42](../40-ai/42-prompt-architecture.md) |
| Audit | Append-only hash-chained table; [62](../60-risk/62-security-architecture.md) |
| Cost firewall | CI + startup guard + egress allowlist + invoice review; [71](../70-quality/71-testing-strategy.md) |

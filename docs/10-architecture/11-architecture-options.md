# Architecture Options & Selection

**Supporting document (§33, §58)** · v1.1

Four realistic architectures were evaluated against the constraints that actually bind this
product: **predictable flat cost**, **per-user encryption of sensitive content**, **no LLM in
the server**, **operable by one part-time administrator**, and **no vendor lock-in that would
survive a bad pricing change**.

All vendor prices are **as of 2026-09 and must be re-verified before commitment**. They are
marked `[VERIFY]` in the [Cost Model](../80-ops/81-cost-model.md).

---

## The constraint that eliminates the obvious answer

The obvious 2026 answer for a project like this is "Next.js on Vercel with a serverless
Postgres". It is rejected here, and the reason is worth stating first because it drives
everything else.

**Every serverless platform prices by request, invocation, function-GB-second, or edge
read.** That is exactly the cost shape §4.2 forbids. A single misbehaving client, a crawler,
or a modest viral moment converts directly into a bill the operator did not choose. A
$20/month plan with metered overage is not a predictable $20/month; it is an unbounded
liability with a $20 floor. For a ministry project run by one person, an unbounded liability
is a worse outcome than a slightly higher fixed floor.

So: **a long-running container with a fixed monthly price is preferred over serverless**, and
this preference is applied consistently to compute, database, and CDN.

---

## Option A — Managed BaaS + SPA

```
Browser (Vite + React SPA on a static host)
   │  supabase-js, RLS-enforced
   ▼
Supabase  ─ Postgres + Auth (GoTrue) + Storage + Edge Functions
   │
   └─ Postmark/Resend (email), Paddle (billing)
```

**Advantages**
- Fastest to a working product. Auth, database, row-level security, and email hooks arrive together.
- Auth is included at a flat $25/month for up to 100,000 monthly active users — the single
  most important cost fact in this whole comparison, because per-MAU auth pricing is the
  largest hidden variable cost in the alternatives.
- Row Level Security gives per-user isolation enforced by the database, which is a genuinely
  stronger guarantee than an application-layer check.
- Postgres underneath, so the data is portable.

**Disadvantages**
- **Conflicts with our encryption design.** With the browser talking to the database
  directly, envelope encryption with a server-held master key has nowhere to live. We would
  either drop to database-level encryption only (weaker than specified in SR-3.1) or push
  keys into the browser (which is E2EE, deferred to Phase 12). Adding Edge Functions to hold
  the crypto reintroduces a server tier and most of Option B's complexity while keeping
  Supabase's lock-in.
- Edge Functions are metered by invocation.
- Bandwidth overage beyond the included allowance is metered.
- Meaningful lock-in in the auth layer specifically: GoTrue users are migratable but the
  session model, hooks, and policies are not.

**Cost** MVP ≈ $25 (Supabase Pro) + $0–20 email + domain ≈ **$27–47/mo**
**Security** Good isolation, weaker content encryption · **Scalability** Excellent to ~50k users
**Legal risk** Low · **Dev complexity** Low · **Maintenance** Low

---

## Option B — Full-stack monolith + managed Postgres + self-hosted auth ★ SELECTED

```
Browser (Next.js client components; all validators, composer, clipboard)
   │  HTTPS, session cookie
   ▼
Next.js server (App Router, Node runtime) — long-running container, fixed price
   │  · Auth.js / Better Auth, server-side sessions
   │  · Authorization module, entitlements
   │  · Envelope encryption (per-user DEK, master key from env/KMS)
   │  · Egress allowlist — NO LLM CLIENT
   ▼
Managed PostgreSQL (flat tier, daily backups, PITR)
   │
   └─ Resend/SES (email) · Paddle (billing) · Sentry/GlitchTip (errors)
```

**Advantages**
- **Fits the encryption design exactly.** A server tier holds the master key; the browser
  never sees another user's key material; per-user DEKs are wrapped and rotatable.
- **Auth cost is $0 marginal, forever.** Self-hosted sessions mean 100,000 members cost the
  same in auth as 100 do. Against Clerk at $0.02/MAU beyond 10,000, this is a difference of
  roughly $1,800/month at the 100,000-member scenario — see [Cost Model §7](../80-ops/81-cost-model.md).
- Everything is one deployable, one log stream, one place to enforce the Cost Firewall.
- Portable by construction: Next.js + Postgres + a standard session table runs on Render,
  Fly, Railway, a Hetzner box, or a laptop. No component is irreplaceable.
- Server-rendered routes give good first paint for the conversation list without shipping
  the whole history to the client.

**Disadvantages**
- More to build than Option A: auth flows, session management, password reset, rate limiting
  are ours to write and to get right. Auth.js/Better Auth reduces but does not remove this.
- We own the security posture of authentication. A managed provider's security team is
  better than ours; this is a real trade and is mitigated by using a well-maintained library
  rather than hand-rolling, plus the controls in [Security Architecture](../60-risk/62-security-architecture.md).
- Vertical scaling first; horizontal scaling needs a shared session store (Postgres suffices
  to ~10k concurrent, then Redis).

**Cost** MVP ≈ $7–25 app + $6–19 Postgres + $0–20 email + $1.25 domain ≈ **$29–52/mo** (fixed)
**Security** Strongest fit to requirements · **Scalability** Good to ~50k members on one large instance, then scale out
**Legal risk** Low · **Dev complexity** Medium · **Maintenance** Medium

---

## Option C — Edge-first serverless

```
Browser → Cloudflare Workers → D1 / Hyperdrive→Postgres
                             → Clerk or Auth0 (auth)
```

**Advantages**
- Excellent global latency. Generous free tier at small scale. Near-zero idle cost.
- Very low operational burden.

**Disadvantages**
- **Priced per request.** Workers bills per million requests; D1 bills per row read and
  written; Clerk bills per MAU. Three metered dimensions, which is three unbounded
  liabilities. This is disqualifying against §4.2 as a *core* dependency.
- Node-API gaps complicate some crypto and library choices.
- Deep lock-in: D1 is not portable Postgres; Workers-specific APIs pervade the code.
- Auth0 in particular becomes expensive quickly for a B2C product; Clerk's per-MAU model
  turns member growth into a cost curve that grows faster than revenue at the free tier.

**Cost** MVP ≈ $0–10; at 100k members plausibly **$2,000+/mo, mostly in per-MAU auth**
**Security** Good · **Scalability** Excellent · **Legal risk** Low · **Dev complexity** Medium-high · **Maintenance** Low

---

## Option D — Self-managed VPS

```
Hetzner / DigitalOcean VPS
  Docker Compose: Caddy (TLS) → Next.js app → Postgres → GlitchTip
  Restic → Backblaze B2 (off-box backups)
```

**Advantages**
- **The true cost floor.** A 2 vCPU / 4 GB box is roughly €4–8/month and comfortably serves
  several thousand members. At 10,000 members this option is perhaps a fifth the cost of any
  managed alternative.
- Total control: egress firewall rules, encryption at rest, log retention, everything.
- Zero lock-in.

**Disadvantages**
- **Someone must patch the box, rotate certificates, monitor disk, and test restores.** The
  operating constraint says one part-time administrator; this option consumes most of that
  person's available attention.
- Database backups, PITR, and failover are hand-built. A restore that has never been
  rehearsed is not a backup, and rehearsal is exactly what a part-time operator skips.
- Single point of failure unless you build more, which defeats the cost advantage.

**Cost** MVP ≈ **$6–15/mo** · at 100k members ≈ $150–400/mo (still the cheapest)
**Security** Potentially excellent, realistically dependent on discipline · **Scalability** Manual
**Legal risk** Low · **Dev complexity** Medium · **Maintenance** High

---

## Comparison

| Criterion (weight) | A · BaaS | **B · Monolith** | C · Edge | D · VPS |
|---|---|---|---|---|
| Predictable cost (25%) | 4 | **5** | 1 | 5 |
| Fits encryption design (20%) | 2 | **5** | 3 | 5 |
| Security posture achievable by a small team (15%) | 5 | **4** | 4 | 2 |
| Operational burden (15%) | 5 | **4** | 5 | 1 |
| Portability / lock-in (10%) | 3 | **5** | 1 | 5 |
| Time to MVP (10%) | 5 | **3** | 3 | 3 |
| Scalability to 100k (5%) | 4 | **4** | 5 | 3 |
| **Weighted total** | 3.85 | **4.50** | 2.75 | 3.65 |

---

## Decision

**Option B is selected**, recorded as [ADR-0007](../90-decisions/adr/0007-architecture-monolith.md).

The deciding factors, in order:

1. **The encryption requirement is not negotiable and Option A cannot satisfy it** without
   becoming Option B with extra lock-in.
2. **Self-hosted auth removes the single largest variable cost** in the entire system. Auth
   priced per monthly active user is the one line item that grows without bound as the
   ministry succeeds, and success should not be punished.
3. **Portability is insurance.** Every component of Option B has at least two viable hosts.
   If Render triples its price, the same container runs on Fly or on a Hetzner box the same
   afternoon. Options A and C cannot make that claim.

**Option D is retained as the documented cost-floor migration path.** If infrastructure cost
ever becomes a real constraint, Option B migrates to Option D without an application rewrite
— it is the same container and the same Postgres. This is stated explicitly so that the
choice of a managed host is understood as buying operational time, not as a lock-in.

**Option A is retained as the documented fast-path alternative.** If the implementation team
is small and time-to-market dominates, starting on Supabase for Postgres + Auth while keeping
all business logic in Next.js server routes (i.e. using Supabase as infrastructure rather
than as a BaaS) is a legitimate variant of Option B and preserves most of its properties.

---

## Selected stack

| Layer | Choice | Alternative on file | Why |
|---|---|---|---|
| Language | TypeScript | — | One language across client validators and server; the citation validators must run in both |
| Framework | Next.js (App Router), Node runtime | Remix, SvelteKit | Ubiquitous, well-understood by coding agents, server + client in one deployable |
| UI | React + Tailwind + Radix primitives | — | Accessible primitives matter for the WCAG 2.2 AA requirement |
| Auth | Auth.js or Better Auth, server-side sessions in Postgres | Lucia (archived — do not select), Ory Kratos self-hosted | Flat cost, no per-MAU pricing, portable |
| DB access | Drizzle ORM | Prisma, Kysely | Lightweight, SQL-transparent, easy to audit for the ownership predicate |
| Database | PostgreSQL 16+, managed flat tier | Self-managed on VPS | Portable, mature, JSONB for flexible records |
| Validation | Zod at every boundary | Valibot | SR-4 / API contract enforcement |
| Hosting | Render (or Fly.io) container | Hetzner + Coolify | Flat monthly price, managed TLS, managed Postgres with backups |
| Email | Resend (free 3k/mo → $20 for 50k) | Amazon SES, Postmark | Predictable tiers, good deliverability |
| Billing | Paddle (Merchant of Record) | Stripe + Stripe Tax | MoR removes global VAT/sales-tax registration from a solo operator |
| Errors | Sentry free tier → self-hosted GlitchTip | — | Flat or free; GlitchTip removes the metered-error risk entirely |
| Uptime | Better Stack / UptimeRobot free | — | Free |
| CDN / WAF | Cloudflare free | — | Free tier includes DDoS protection, which caps a whole class of cost risk |

Full pricing analysis, including the fixed/variable classification each vendor requires, is
in the [Cost Model](../80-ops/81-cost-model.md).

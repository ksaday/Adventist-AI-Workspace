# Cost Model

**Document 25 of 37** · v1.1

> **All vendor prices are as of 2026-09 and marked `[VERIFY]`. They must be re-checked before
> any commitment. Prices change; the *classification* of each price as fixed or variable is
> the durable part of this document.**

---

## 1. The cost philosophy

Three rules govern every procurement decision:

1. **A predictable higher price beats an unpredictable lower one.** A $25 flat plan is
   preferred over a $5 plan with metered overage, because the second one has no ceiling and
   the ceiling is what the operator is actually buying.
2. **Any usage-metered component must have a hard cap, a documented worst case, or a
   flat-fee alternative on file.** No exceptions.
3. **AI inference is not a cost line.** It is structurally zero, not budgeted to zero (§9).

---

## 2. Cost decision matrix (§59)

| Component | Required | Pricing model | Fixed / Variable | MVP cost | Risk | Recommendation |
|---|:--:|---|---|---:|---|---|
| **Application hosting** | Yes | Flat monthly per instance | **Fixed** | $7–25 | Low | Render Starter/Standard, or Fly.io fixed machines. **Avoid serverless per-invocation pricing** |
| **PostgreSQL** | Yes | Flat monthly per tier | **Fixed** | $6–19 | Low | Managed flat tier. Avoid autoscaling compute billing |
| **Authentication** | Yes | Self-hosted | **Fixed at $0** | $0 | Low | Auth.js / Better Auth. **Never per-MAU** — see §7 |
| **Email (transactional)** | Yes | Free tier → flat tier | Fixed w/ soft cap | $0 | Low | Resend free (3k/mo) → $20 (50k/mo). SES as the cheap variable alternative |
| **Billing** | No at MVP | % + fixed per transaction | **Variable** | $0 (`BILLING_MODE=off`) | Medium | Paddle (MoR). Unavoidable if money is accepted; scales with revenue |
| **CDN / WAF / DNS** | Yes | Free tier | **Fixed at $0** | $0 | Low | Cloudflare free. Caps bandwidth and DDoS cost risk |
| **Error monitoring** | Yes | Free tier → per-event | Fixed w/ soft cap | $0 | Low | Sentry Developer free (5k events/mo) → self-hosted GlitchTip if it grows |
| **Uptime monitoring** | Yes | Free tier | **Fixed at $0** | $0 | Low | Better Stack / UptimeRobot free |
| **Object storage (backups)** | Yes | Per GB | Variable, trivial | ~$0.10 | Low | Backblaze B2 at ~$6/TB/mo |
| **Domain** | Yes | Annual | **Fixed** | ~$1.25/mo | Low | Any registrar with free WHOIS privacy |
| **TLS** | Yes | Free | **Fixed at $0** | $0 | Low | Platform-managed / Let's Encrypt |
| **AI API (application-owned)** | **No** | Per token | Variable, unbounded | **$0** | **Would be Critical** | **Do not build.** Four-layer firewall prevents it |
| **EGW corpus storage / vector DB** | **No** | Per GB + per query | Variable | **$0** | **Would be Critical** (legal + cost) | **Do not build** |
| **Web search API** | **No** | Per query | Variable | **$0** | Would be High | Not used. The user's own AI may browse, at their cost |
| **OCR / document processing** | **No** | Per page | Variable | **$0** | Would be High | No file upload exists |
| **Captcha** | No | Per verification or flat | Variable | $0 | Low | Held in reserve behind a flag |
| **Analytics** | **No** | Per event | Variable | **$0** | Would be Medium (privacy) | First-party counters only |

**Every "Yes" row is fixed or free. Every variable row is either zero or scales with revenue.**
That is the whole cost design in one sentence.

---

## 3. Development cost (§39)

Explicitly **outside** the infrastructure constraint per §4.1.

| Item | Cost | Notes |
|---|---|---|
| AI coding agent | Owner's existing subscription / usage | Excluded from the infrastructure budget by instruction. Do not distort the architecture to avoid it |
| Developer machine, editor, git host | $0 | Existing hardware; free tiers |
| Design tools | $0–15/mo | Optional |
| Staging environment | ~$13/mo | Smallest tiers; can be torn down between releases |
| Preview environments | $0 | Free tiers, auto-destroyed |
| **Total recurring development** | **$0–28/mo** | |

---

## 4. Email provider comparison (§37)

Email is required for verification, password reset, membership notifications, break-glass
notices, and downgrade warnings.

| Provider | Free tier | Paid entry | Model | Verdict |
|---|---|---|---|---|
| **Resend** | 3,000/mo (100/day) | $20/mo for 50,000 | Flat tiers | **Recommended.** Predictable, good deliverability, simple |
| Postmark | 100/mo | $15/mo for 10,000 | Flat tiers | Excellent transactional deliverability; smaller free tier |
| Amazon SES | 3,000/mo (first year) | $0.10 per 1,000 | **Per email** | Cheapest at scale by an order of magnitude, but variable. Worth adopting above ~100k/mo, where $10 beats any flat tier |
| Self-hosted SMTP | $0 | $0 | Fixed | **Rejected.** Deliverability for a small sender is poor, and reputation management is a full-time concern |

**Recommendation:** Resend at MVP (free), Resend Pro when volume requires it, and re-evaluate
SES above 100,000/month where its per-email pricing becomes an advantage rather than a risk —
at that volume $0.10/1,000 is genuinely trivial and the "variable" classification stops
mattering.

**Volume estimate:** roughly 4–6 transactional emails per member per year in steady state,
plus registration bursts. Even 100,000 members generates on the order of 40,000–60,000
emails/month.

---

## 5. Infrastructure cost — MVP

| Component | Choice | Monthly |
|---|---|---:|
| Application hosting | Render Starter (512 MB) | $7 |
| PostgreSQL | Render Basic 1 GB | $19 |
| Email | Resend free | $0 |
| CDN / WAF / DNS | Cloudflare free | $0 |
| Error monitoring | Sentry Developer free | $0 |
| Uptime monitoring | Better Stack free | $0 |
| Backup storage | Backblaze B2 | ~$0.10 |
| Domain | Amortised | $1.25 |
| TLS | Included | $0 |
| **Total** | | **≈ $27–28** |

With a larger application instance (Standard, 2 GB) for headroom: **≈ $46**.
Stated range in the [Final Architecture](../10-architecture/15-final-recommended-architecture.md): **$29–52**.

**Cost floor alternative** (Option D — Hetzner CX22 + self-managed Postgres + Coolify):
**≈ $6–10/month**, at the price of the operational burden documented in
[Architecture Options](../10-architecture/11-architecture-options.md).

---

## 6. AI cost (§39)

| Category | Who pays | Amount |
|---|---|---:|
| **Application-owned AI API** | — | **$0.00 — target and structural guarantee** |
| User's own AI subscription | The member | $0–20/mo, their existing choice |
| User's own API usage (Phase 2 BYOK) | The member | Typically $1–5/mo for light use, on their key |
| Verification AI | The member | Same account, same $0 to us |
| Evaluation sweeps (Layer B) | The evaluator's personal account | ~$0–5/mo of their own subscription |

---

## 7. Cost scenarios (§40)

Assumptions: ~30% of registered members are monthly-active; an active member creates ~4
conversations/month averaging 10 messages of ~1 KB encrypted; retention policy applied;
reference assets edge-cached at ~100% hit ratio.

### Scenario A — 100 members

| Line | Monthly |
|---|---:|
| App hosting (Starter) | $7 |
| PostgreSQL (1 GB) | $19 |
| Email (~50/mo) | $0 |
| CDN, monitoring, uptime | $0 |
| Storage, backups, domain | $1.35 |
| **Infrastructure total** | **$27** |
| **AI paid by the application** | **$0** |
| AI paid by users | Their own subscriptions |
| Billing (if 10 paying at $5) | ~$7.50 in fees |

### Scenario B — 1,000 members

| Line | Monthly |
|---|---:|
| App hosting (Standard 2 GB) | $25 |
| PostgreSQL (4 GB) | $30 |
| Email (~500/mo) | $0 |
| CDN, monitoring, uptime | $0 |
| Storage, backups, domain | $2 |
| **Infrastructure total** | **$57** |
| **AI paid by the application** | **$0** |
| Billing (if 100 paying at $6) | ~$80 in fees |

Database growth: ~300 active × 40 messages × 1 KB ≈ 12 MB/month. Trivial.

### Scenario C — 10,000 members

| Line | Monthly |
|---|---:|
| App hosting (2 instances × 2 GB) | $50 |
| PostgreSQL (8 GB + read replica) | $150 |
| Email (~5,000/mo) | $20 |
| CDN (Cloudflare Pro, optional) | $20 |
| Error monitoring (Sentry Team or self-hosted GlitchTip) | $0–26 |
| Uptime | $0 |
| Storage, backups, domain | $6 |
| **Infrastructure total** | **$246–272** |
| **AI paid by the application** | **$0** |
| Billing (if 1,000 paying at $6) | ~$800 in fees |

Database growth: ~3,000 active × 40 messages × 1 KB ≈ 120 MB/month, ~1.5 GB/year.

### Scenario D — 100,000 members

| Line | Monthly |
|---|---:|
| App hosting (4–6 instances) | $200–400 |
| PostgreSQL (32 GB + 2 replicas, PITR) | $500–700 |
| Redis (sessions) | $30 |
| Email (~50,000/mo — Resend Scale, or SES at ~$5) | $5–90 |
| CDN (Cloudflare Pro/Business) | $20–200 |
| Error monitoring (self-hosted GlitchTip on an existing box) | $0–80 |
| Storage, backups (archive partitions), domain | $30 |
| **Infrastructure total** | **$785–1,530** |
| **AI paid by the application** | **$0** |
| Billing (if 10,000 paying at $6) | ~$8,000 in fees |

Database growth: ~30,000 active × 40 messages × 1 KB ≈ 1.2 GB/month. Partition `messages` by
month and archive cold partitions to encrypted object storage.

### The comparison that justifies the architecture

| Scenario | This design | The same product with an application-owned AI API |
|---|---:|---|
| A · 100 | $27 | $27 + ~$60–300 in tokens |
| B · 1,000 | $57 | $57 + ~$600–3,000 |
| C · 10,000 | ~$260 | ~$260 + ~$6,000–30,000 |
| D · 100,000 | ~$1,100 | ~$1,100 + **$60,000–300,000** |

*(Rough token estimate: 30% active × 4 conversations × 2 turns × ~3k tokens, at commodity
per-token rates. The point is the order of magnitude, not the precision.)*

At 100,000 members, application-owned inference would cost **50–300× the entire rest of the
infrastructure**, and it would arrive as a bill after the usage, not before. A ministry
project cannot carry that shape of cost, and no membership price the target audience would
accept could fund it.

**This table is the single strongest justification for the entire architecture.**

---

## 8. Auth pricing — the hidden variable cost most projects miss

| Provider | 1,000 MAU | 10,000 MAU | 100,000 MAU |
|---|---:|---:|---:|
| **Self-hosted (selected)** | **$0** | **$0** | **$0** |
| Clerk | $25 | $25 | ~$1,825 |
| Auth0 (B2C) | varies | material | substantial |
| Supabase Auth | $25 flat (bundled) | $25 flat | $25 flat |

Self-hosted auth saves roughly **$1,800/month at Scenario D** against per-MAU pricing —
more than the entire rest of the infrastructure. Supabase's flat bundling is genuinely
competitive and is the reason it remains the documented alternative architecture.

---

## 9. The no-hidden-AI-cost guarantee (§41)

> **Question:** Can a normal user conversation cause the application owner to receive an
> unexpected AI API bill?
>
> **Answer: No.**

**Why, precisely:**

1. **There is no code path from our server to a model.** The server has no LLM client, and
   one cannot be added without defeating a CI denylist that includes transitive dependencies.
2. **There is no credential.** The process aborts at startup if any AI provider key is present
   in its environment. There is no configuration that supplies one, and no admin setting that
   accepts one.
3. **There is no route.** Server egress is allowlisted to the email provider, the billing
   provider, and the error reporter. Every other outbound connection is refused and raises a
   security event — and in a system with no legitimate reason to contact an LLM host, such an
   attempt is treated as an incident, not a warning.
4. **There is one door.** A single audited HTTP client is the only way out of the server,
   enforced by a lint rule over the source tree.
5. **Inference happens elsewhere.** In Tier B the member's browser navigates to a service they
   already have an account with. In Tier C the browser calls the provider with the member's own
   key. Our infrastructure is not in either path.
6. **It is verified empirically.** Monthly invoice review confirms $0.00.

**Components that could generate usage-based AI charges, and their disposition:**

| Component | Disposition |
|---|---|
| Application-owned LLM API | **Removed.** Never built |
| Embedding generation | **Removed.** No vector store exists |
| Web search API | **Removed.** No server-side search |
| OCR / document processing | **Removed.** No file upload exists |
| Moderation API | **Removed.** Safety screening is a local lexicon |
| Language detection API | **Removed.** Local heuristic |
| Translation API | **Removed.** Human translation only |
| Captcha | Held in reserve, flag-gated, flat-fee option available |

Every one of these was considered and eliminated at design time rather than discovered on an
invoice.

---

## 10. Legal costs (§39)

| Item | Required? | Estimate | Notes |
|---|---|---:|---|
| Trademark question — "SDA" in the product name | **Required** | $500–2,000 | Blocks public launch |
| Terms of Service + Privacy Policy review | **Required** | $1,000–3,000 | Special-category data, global audience |
| Copyright posture review (catalogue, KJV, user pastes) | **Required** | $1,000–2,500 | Blocks the KJV module decision |
| Liability and duty-of-care drafting | **Required** | Included above | |
| Mandatory-reporting question | **Required** | $300–800 | Jurisdiction-specific |
| Business entity formation | Required to accept money | $100–800 | Determines much of the above |
| Trademark registration for the product name | Recommended | $250–1,500 | After the §1 question resolves |
| Ongoing counsel retainer | Recommended | $0–200/mo | Only if activity warrants |

**Required total before launch: roughly $2,900–9,100 one-time.** This is the largest
single expense in the project and it is unavoidable for a product touching a protected
denominational mark, a stewarded body of writings, and special-category personal data.

---

## 11. Total cost of ownership, year one

| | Conservative | Lean |
|---|---:|---:|
| Infrastructure (12 months at Scenario A→B) | $500 | $150 (Option D) |
| Staging | $156 | $0 (torn down between releases) |
| Legal (required) | $6,000 | $2,900 |
| Domain | $15 | $15 |
| Design tools | $180 | $0 |
| **AI inference** | **$0** | **$0** |
| **Total year one** | **≈ $6,850** | **≈ $3,065** |

Development labour and AI coding-agent cost are excluded per §4.1.

**Break-even** at $6/month average revenue, conservative case: ~95 paying members for the
first year, then ~10 paying members per month to cover ongoing infrastructure. The
infrastructure itself is nearly free at ministry scale; **the legal work is the real cost of
entry**, and it is the one line that cannot be engineered away.

---

## 12. Cost controls in operation

| Control | Mechanism |
|---|---|
| Billing alerts on every vendor | Set at 150% of expected, before the first production deploy |
| Monthly invoice review | Confirms $0.00 AI and catches drift |
| Cloudflare in front | Caps bandwidth and DDoS cost risk at the edge |
| Rate limits and quotas | Bound storage growth and abuse |
| Retention jobs | Bound database growth, which is the only line that grows on its own |
| No autoscaling by default | Scaling is a deliberate decision, never an automatic bill |
| Vendor portability | Every component has at least two viable hosts; a bad pricing change is survivable |
| Accretion tripwire | Bounds storage growth from pasted source text specifically |

# Membership Design

**Document 11 of 37** · v1.1

---

## 1. The unusual economics of this product

In almost every AI product, membership tiers ration inference because inference is the cost.
Here, **inference costs the operator nothing**. That single fact changes the design of the
membership system, and it must be understood before reading the tiers:

- Quotas do **not** protect a compute budget. They protect **storage** and deter **abuse**.
- A member who generates 500 prompts costs the operator approximately the same as one who
  generates 5.
- Therefore aggressive metering would be **rent extraction, not cost recovery** — and for a
  ministry-adjacent product, that is both wrong and strategically foolish.

The honest positioning: **members pay for the workbench — the integrity layer, the workflow,
the record — not for AI access they already have.** Pricing and gating should reflect that,
and the copy should say it plainly rather than implying members are buying AI.

This also frames the product's central commercial risk ([R-01](../60-risk/67-risk-register.md)):
a member comparing "$6/month for a workbench" against "$20/month for ChatGPT which already
answers my question" will not see the fabricated citation they were protected from. Making
that protection *visible* is a product problem, and it is the reason the Citation Checklist
and the caught-error counter exist.

---

## 2. Tiers

| | **Free** | **Member** | **Pastor** |
|---|---|---|---|
| Suggested price | $0 | $5/month or $50/year | $12/month or $120/year |
| P2 Prayer Note | ✓ | ✓ | ✓ |
| P3 Spiritual Guidance | ✓ | ✓ | ✓ |
| P4 Pastor's Aids | — | — | ✓ |
| Prompt generations | 20 / month | Unlimited* | Unlimited* |
| Verification runs | 3 / month | Unlimited* | Unlimited* |
| Conversation retention | 30 days | Indefinite | Indefinite |
| Ephemeral mode | ✓ | ✓ | ✓ |
| Export | — | ✓ | ✓ |
| Sermon outline builder + export | — | — | ✓ |
| Pre-pulpit Citation Checklist | — | — | ✓ |
| Sermon Series (Phase 11) | — | — | ✓ |
| Support | Docs | Email | Priority email |

\* Subject to a fair-use rate limit (60 generations/hour), which is an abuse control, not a
quota. It is documented in the Terms and shown in the UI only if reached.

**Prices are a recommendation, not a decision.** The owner sets them. The rationale for these
numbers: $5 is below the psychological threshold at which a member re-evaluates a
subscription monthly; $12 for pastors reflects that P4 is a professional tool that replaces
hours of work, and pastors' study budgets routinely cover $12/month resources. Annual pricing
at ten months' cost is standard and materially improves cash flow and churn.

**Free tier generosity is deliberate.** A free tier that cannot complete a real task teaches
members that the product does not work. 20 generations and 3 verifications is enough to
prepare several prayers and verify a real answer — enough to experience the value.

---

## 3. Entitlement architecture

**Entitlements are our data.** The billing provider is a *signal source*, never the authority.

```
Billing provider webhook  ──▶  subscription_event (idempotent, digest only)
                                       │
                                       ▼
                            MembershipService.reconcile()
                                       │
                                       ▼
                             membership row (tier, status, period_end)
                                       │
                                       ▼
                    authorize(actor, action, resource) ──▶ Decision
```

Consequences of this arrangement, all of them deliberate:

1. **Billing can be switched off entirely.** With `BILLING_MODE=off`, every user receives the
   configured `DEFAULT_PLAN` and no payment provider is contacted. The whole product is
   developable, demonstrable, and pilotable before any payment integration exists (PR-MEM-09).
2. **A webhook outage never locks out a paying member**, because access is decided from our
   row, and our row does not change when the provider is unreachable.
3. **The provider can be replaced** — Paddle to Stripe or the reverse — by writing a new
   adapter that produces the same reconciliation calls. No access-control code changes.
4. **Manual grants are first-class.** An admin can set a membership directly, with a reason
   and an audit entry, which is how comps, scholarships, and conference sponsorships work.
   Any ministry product will need this on day one.

---

## 4. Lifecycle

```
   signup ──▶ FREE ──── upgrade ────▶ TRIALING (optional, 14 days, no card)
                ▲                          │
                │                          ▼
                │                       ACTIVE ◀──── renewal
                │                        │   │
                │             cancel ────┘   └──── payment failure
                │                │                        │
                │                ▼                        ▼
                │        CANCEL_AT_PERIOD_END          PAST_DUE
                │                │                     (dunning, 14 days)
                │                ▼                        │
                └───────────── EXPIRED ◀──────────────────┘
                                 │
                                 ▼
                    60-day grace: content read-only + exportable
                                 │
                                 ▼
                    Free-tier retention applies (30 days rolling)
```

### 4.1 Downgrade is never destructive by surprise

This is the most important behaviour in the lifecycle, and PR-MEM-08 exists because of it.
When a paying member lapses:

1. Access to paid features stops at period end. This is expected and fine.
2. Their conversations become **read-only and exportable for 60 days**. They are not deleted.
3. Three emails go out during that window: at day 0, day 30, and day 53, each containing a
   direct export link and a clear statement of what happens and when.
4. Only after 60 days does Free-tier retention (30-day rolling) begin to apply.

A pastor with two years of sermon research must never lose it because a card expired while
they were travelling. The cost of storing lapsed members' data for 60 extra days is a
rounding error; the cost of destroying a pastor's study is unrecoverable.

### 4.2 Dunning

Payment failure → `past_due`, access **continues** for 14 days. Emails at day 1, 4, 8, 13.
Access continuing during dunning is a deliberate choice: most failures are expired cards, and
cutting off a member mid-sermon-preparation over a card expiry produces a support burden and
a bad memory out of proportion to the two weeks of service given away.

---

## 5. Quota accounting

```sql
-- Anniversary-based periods, not calendar months (PR-MEM-10)
usage_counter(user_id, metric, period_start) → count
```

| Metric | Counted when | Not counted |
|---|---|---|
| `prompt_generation` | A composed prompt is copied or launched | Composing without copying; recomposing the same prompt within 60 seconds (debounced) |
| `verification_run` | A verification conversation is created | Adding claims or evidence to an existing one |
| `export` | An export job is created | Downloading an existing export |

Rules:
- Quota is checked and consumed in a single transaction with the action. No double-spend
  under concurrency.
- Approaching a limit (80%) shows a gentle notice. Reaching it shows what the limit is, when
  it resets, and what upgrading gives — never a dead end.
- Quota **never** blocks: reading existing conversations, exporting, deleting, or the safety
  resource panel. A person in crisis does not hit a paywall.
- Failed generations (e.g. a validation error before composition) are not counted.

---

## 6. Feature gating

Server-side, through the single `authorize()` entry point. Client-side gating is presentation
only and is never trusted (PR-MEM-02).

```ts
authorize(actor, 'p4.outline.create')
  → reads membership.plan_id → plan.entitlements.apps includes 'p4'?
  → Decision { allow, reason, quotaRemaining }
```

Every gate answers three questions for the UI: is it allowed, why not, and what would change
that. A gate that returns only `false` produces a confusing product and a support ticket.

---

## 7. Alternatives considered

| Model | Verdict |
|---|---|
| **Usage-based pricing** (pay per generation) | Rejected. The operator has no per-generation cost, so this would be arbitrary. It also punishes the members doing the most study |
| **One-time lifetime purchase** | Rejected as the primary model — infrastructure cost is recurring — but worth offering as a limited founding-member option to fund the first year |
| **Donation / pay-what-you-want** | Genuinely plausible for a ministry product and should be A/B tested against fixed pricing. Recommended as an explicit experiment in Horizon 1, and as the pricing model for the Free tier's "support this work" prompt |
| **Church / organisation seats** | Deferred to Horizon 3. Different buyer, invoicing, seat management, admin delegation — a materially different billing architecture |
| **Free for everyone, funded by an institution** | The most mission-aligned model if a conference or publishing house sponsors the work. The architecture already supports it: set `BILLING_MODE=off` and `DEFAULT_PLAN=member`. Keep this path open; it may become the right answer |
| **Ads** | Rejected without qualification. This product sees prayers and confessions. Nothing is sold to anyone, ever |

That last line is not rhetoric. It should be a written commitment in the Privacy Policy,
because the alternative — a future operator monetising the interest graph of people's
spiritual struggles — is the worst plausible outcome for this product and is worth
foreclosing in public while it costs nothing to do so.

---

## 8. Metrics

| Metric | Why | Where it comes from |
|---|---|---|
| Free → paid conversion | Is the value visible? | Membership transitions |
| Monthly churn by tier | Is it retaining? | Membership transitions |
| Quota-limit hits on Free | Is the free tier too tight or too loose? | Usage counters |
| P4 feature usage among Pastor tier | Is the premium tier earning its price? | Event counters |
| **% of answers with ≥1 verification run** | **Is the core thesis true?** | Verification creations ÷ external answers |
| Median time to first prompt generation after signup | Is onboarding working? | Event timestamps |

The fifth is the product's north star. If it stays below 10% at month 6, this is a workflow
product with a verification feature, not a verification product — and the roadmap, pricing,
and positioning should all change accordingly ([Post-MVP Roadmap](../00-overview/05-post-mvp-roadmap.md)).

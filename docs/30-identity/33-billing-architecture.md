# Billing Architecture

**Document 12 of 37** · v1.1

All fees stated are **as of 2026-09 and must be re-verified before commitment** (`[VERIFY]`).

---

## 1. The decision that matters most is tax, not fees

For a solo operator selling a subscription to members in Korea, the United States, Brazil,
Kenya, the Philippines, Germany, and Australia, the hard problem is not payment processing.
It is **consumption tax**: EU VAT on digital services, UK VAT, Korean VAT on foreign digital
services, Australian GST, and a patchwork of US state sales-tax rules for SaaS.

Two ways to handle it:

| Approach | Who is the seller of record | Operator's tax burden |
|---|---|---|
| **Payment Service Provider** (Stripe) | You | You register, collect, file, and remit in every jurisdiction where you cross a threshold. Stripe Tax calculates for +0.5% but does **not** file for you |
| **Merchant of Record** (Paddle) | Paddle | Paddle is the legal seller. They collect and remit consumption tax globally. You receive a payout and one income statement |

For this project, the MoR premium buys away a compliance obligation that a part-time
operator realistically cannot discharge, and whose failure mode is a foreign tax authority
rather than a support ticket.

**Recommendation: Paddle (Merchant of Record).** Recorded as
[ADR-0013](../90-decisions/adr/0013-billing-provider.md).

---

## 2. Provider comparison

| | **Paddle** ★ | Stripe | Lemon Squeezy | Manual / offline |
|---|---|---|---|---|
| Model | Merchant of Record | PSP | MoR (Stripe-owned) | — |
| Platform fee | $0 | $0 | $0 | $0 |
| Transaction fee | ~5% + $0.50 | 2.9% + $0.30 (US cards) | ~5% + $0.50 | 0 |
| Tax calculated | Yes | +0.5% (Stripe Tax) | Yes | — |
| **Tax remitted and filed** | **Yes** | **No** | Yes | — |
| Chargeback fee | ~$25 | $15 | ~$25 | — |
| Payout fee | Included, monthly threshold | ~0.25% + $0.25 for some rails | Included | — |
| Hosted checkout | Yes | Yes | Yes | — |
| Subscription management portal | Yes | Yes | Yes | — |
| Effective cost on $5/mo | ~$0.75 (15%) | ~$0.475 (9.5%) + your tax work | ~$0.75 | — |
| Effective cost on $50/yr | ~$3.00 (6%) | ~$1.95 (3.9%) + your tax work | ~$3.00 | — |

**The percentage on small monthly amounts is brutal for every provider** — a fixed $0.30–0.50
component is 6–10% of a $5 charge. This is a strong, concrete argument for **promoting annual
billing**, where the fixed component amortises: 6% instead of 15%. The pricing page should
default to annual with the monthly option clearly available.

---

## 3. Cost transparency (§36 requires this)

Nothing here is hidden. At a hypothetical 1,000 paying members averaging $6/month:

| Line | Monthly |
|---|---|
| Gross revenue | $6,000 |
| Paddle fees (~5% + $0.50 × 1,000) | −$800 |
| **Net revenue** | **$5,200** |
| Infrastructure ([Cost Model](../80-ops/81-cost-model.md)) | −$60 |
| **AI inference** | **−$0** |
| Chargebacks (~0.2% of transactions × $25) | −$50 |
| Refunds (assume 2%) | −$120 |
| **Net** | **≈ $4,970** |

If the same 1,000 members paid annually at $50:

| Line | Annualised |
|---|---|
| Gross | $50,000/yr |
| Paddle fees (~6%) | −$3,000 |
| Net | $47,000/yr = ~$3,917/month |

Lower gross but higher margin per dollar and far lower churn. The pricing decision should be
made on lifetime value, not on monthly headline.

**Costs that are unavoidable if money is accepted:** transaction percentage, fixed
per-transaction fee, chargeback fees, refund fee treatment, currency conversion spread. These
are business costs, not architecture costs, and they are the *only* usage-based fees in the
entire system.

---

## 4. Integration design

```
   Browser                     Our server                    Paddle
      │                            │                            │
      │─ "Upgrade to Pastor" ─────▶│                            │
      │                            │─ create checkout session ─▶│
      │◀── hosted checkout URL ────│◀── URL + transaction id ───│
      │                                                         │
      │──────────── redirect to Paddle hosted checkout ────────▶│
      │           (card details NEVER touch our origin)         │
      │                                                         │
      │◀───────────── redirect back to /billing/return ─────────│
      │                            │                            │
      │                            │◀─── webhook: subscription.created (signed)
      │                            │  verify signature
      │                            │  idempotent insert → subscription_event
      │                            │  MembershipService.reconcile()
      │                            │  membership row updated
      │                            │
      │─ poll /billing/status ────▶│  ("we're activating your membership…")
```

### Key properties

**Hosted checkout only.** No card data, no PCI scope, no payment form on our origin. This is
non-negotiable for a one-person operation.

**Webhooks are the source of truth for billing state; our `membership` row is the source of
truth for access.** These are different things and conflating them is the classic bug.

**Idempotency.** `subscription_event.external_event_id` is unique. A replayed webhook is a
no-op. Webhooks arrive out of order, twice, and late — the reconciler must be written for
that reality, comparing the event's own timestamp against `membership.updated_at` and
ignoring stale events.

**Signature verification** on every webhook, with the secret in the platform secret store,
and a rejection counter that alerts. An unsigned or badly signed webhook is an attack, not a glitch.

**Payload digest only.** We store `sha256(payload)` and the event type, never the raw payload,
because provider payloads carry addresses, partial card details, and tax identifiers we have
no reason to hold.

**The return page never grants access.** A user returning from checkout sees "activating your
membership", which polls. Granting entitlement from a redirect is a well-known way to give
away paid access to anyone who can construct the return URL.

**Reconciliation job.** Nightly, fetch active subscriptions from the provider and compare
with our membership rows. Log and alert on divergence rather than auto-correcting, because
the interesting cases are the ones a human should see.

---

## 5. `BILLING_MODE=off`

| Mode | Behaviour |
|---|---|
| `off` | No provider calls, no webhooks, no checkout UI. Every user receives `DEFAULT_PLAN`. Billing settings replaced by a "membership managed by the administrator" panel. **This is the development, pilot, and sponsored-operation mode** |
| `manual` | No provider. Admins grant memberships directly with a reason and an audit entry. Suitable for a conference-funded rollout |
| `live` | Full provider integration |

The mode is a server configuration value, and the whole application is built and tested in
`off` first. This is what makes it possible to complete Phases 0–9 with no payment provider,
no business entity decisions, and no tax questions blocking engineering.

---

## 6. Refunds, disputes, and grace

| Situation | Policy |
|---|---|
| Refund request within 14 days | Granted, no questions. The cost of arguing exceeds the revenue |
| Refund after 14 days | Prorated at the operator's discretion |
| Chargeback | Membership suspended pending resolution; data retained in full; a real person emailed. Chargebacks are usually confusion, not fraud, at these amounts |
| Failed renewal | 14-day dunning with access retained (§4.2 of [Membership Design](32-membership-design.md)) |
| Member cannot afford it | A documented, quiet, no-shame path to a comped membership. For a ministry product this is not charity policy, it is the point |

---

## 7. What is deliberately not built

- **In-app payment forms.** Hosted checkout only.
- **Storing any card data, token, or last-four.** The provider holds it; we hold an opaque customer id.
- **Our own invoicing, tax calculation, or dunning emails.** The provider does these better,
  and MoR means they must.
- **Usage-metered billing.** There is no per-use cost to recover; metering would be arbitrary.
- **Crypto payments.** Support burden, volatility, regulatory ambiguity.
- **Marketplace or revenue-sharing features.** Not the product.

---

## 8. Migration path if Paddle becomes unsuitable

1. All access decisions already read our `membership` row, so nothing in the product depends
   on the provider.
2. Write a second adapter producing the same `reconcile()` calls.
3. Run both in parallel: existing subscriptions on Paddle, new ones on Stripe.
4. Migrate existing subscribers by asking them to re-subscribe with an incentive (a free
   month), because subscription portability between an MoR and a PSP is generally not
   possible — the MoR is the legal counterparty to the customer, not you.

**Point 4 is the real cost of choosing an MoR, and it should be understood up front:**
you are not just outsourcing tax, you are placing the customer relationship one step away
from yourself. For this product, where the operator's alternative is personally filing VAT
returns in a dozen jurisdictions, that trade is still correct — but it is a trade, not a
free lunch.

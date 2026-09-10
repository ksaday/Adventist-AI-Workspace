# ADR-0013 · Merchant-of-Record billing (Paddle)

**Status:** Accepted · 2026-09-09

## Context

The product sells subscriptions to members in Korea, the United States, Brazil, Kenya, the
Philippines, Germany, Australia, and elsewhere. The hard problem is not payment processing —
it is **consumption tax**: EU VAT on digital services, UK VAT, Korean VAT on foreign digital
services, Australian GST, and a patchwork of US state sales-tax rules.

A payment service provider calculates tax for a fee. A **Merchant of Record** becomes the legal
seller and **remits and files** it.

## Decision

**Paddle, as Merchant of Record.** Hosted checkout only; no card data touches our origin.
Stripe + Stripe Tax remains the documented alternative if the operator elects to handle tax
registration and filing themselves.

## Consequences

**Positive**
- The operator does not register for VAT/GST/sales tax in any jurisdiction. For a part-time
  ministry operator, this removes an obligation they realistically cannot discharge, whose
  failure mode is a foreign tax authority rather than a support ticket.
- Hosted checkout means no PCI scope.
- Global payment methods, localised pricing, and dunning are handled.
- One income statement instead of dozens of filings.

**Negative**
- **Higher fees:** ~5% + $0.50 versus Stripe's 2.9% + $0.30. On a $5 monthly charge that is
  15% versus 9.5%.
- **The customer relationship sits one step away.** Paddle is the legal counterparty to the
  member, not the operator.
- **Migration away is expensive:** MoR subscriptions are generally not portable to a PSP.
  Moving means asking every subscriber to re-subscribe, with an incentive.

The last point is the real cost of this choice and is stated up front rather than discovered
later ([Billing §8](../../30-identity/33-billing-architecture.md#8-migration-path-if-paddle-becomes-unsuitable)).

## The fee arithmetic that shapes pricing

| Price | Paddle fee | Effective rate |
|---|---:|---:|
| $5 / month | ~$0.75 | **15%** |
| $50 / year | ~$3.00 | **6%** |

The fixed per-transaction component dominates small monthly charges. **This is a strong
argument for defaulting the pricing page to annual billing**, which also improves cash flow
and churn.

## Alternatives considered

| Alternative | Verdict |
|---|---|
| Stripe + Stripe Tax | Lower fees, but tax registration and filing remain the operator's obligation. Documented alternative |
| Lemon Squeezy | Equivalent MoR terms; Stripe-owned. Viable |
| Manual invoicing | Only workable for institutional sponsorship, which `BILLING_MODE=manual` supports |
| No billing at MVP | **This is the plan.** `BILLING_MODE=off` means the whole product is built and piloted before any provider is chosen (ADR-0018) |

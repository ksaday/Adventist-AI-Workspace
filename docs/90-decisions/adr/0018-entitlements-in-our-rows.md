# ADR-0018 · Entitlements are our rows, not the biller's

**Status:** Accepted · 2026-09-09

## Context

The product is membership-based, so something must decide whether a given member may use P4,
export, or generate another prompt. That decision could read the billing provider's
subscription state, or read our own database row that the provider's webhooks update.

The choice looks like an implementation detail. It is not.

## Decision

**A `membership` row in our database is the single source of truth for access.** The billing
provider's webhooks are a *signal* that updates it. Every authorization decision reads our row.

A `BILLING_MODE` setting governs the relationship:

| Mode | Behaviour |
|---|---|
| `off` | No provider at all. Every user receives `DEFAULT_PLAN`. **The development, pilot, and sponsored-operation mode** |
| `manual` | No provider. Admins grant memberships directly, with a reason and an audit entry |
| `live` | Full provider integration |

## Consequences

**Positive**
- **The entire product is buildable, demonstrable, and pilotable before any payment provider
  exists** — which means Phases 0–9 are not blocked on business-entity decisions, tax
  questions, or provider onboarding.
- A billing-provider outage never locks a paying member out, because access does not depend on
  reaching the provider.
- The provider can be replaced by writing a new adapter that produces the same
  `reconcile()` calls. No access-control code changes.
- **Manual grants are first-class**: comps, scholarships, and conference sponsorships are
  supported on day one, which any ministry product will need immediately.
- An institutionally funded deployment is a configuration change: `BILLING_MODE=off`,
  `DEFAULT_PLAN=member`.

**Negative**
- Our row can drift from the provider's state. Mitigated by a nightly reconciliation job that
  **logs and alerts on divergence rather than auto-correcting** — the interesting cases are the
  ones a human should see.
- Webhook handling must be genuinely robust: idempotent by `external_event_id`, tolerant of
  out-of-order delivery, and comparing event timestamps against `membership.updated_at` to
  ignore stale events.
- Two systems hold subscription state, which is inherently more to reason about.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Query the provider on each authorization | Latency, a hard runtime dependency on an external service, and rate limits |
| Cache the provider's state with a TTL | Same failure mode with staleness added, and no clean story for manual grants |
| Provider as the source of truth, with a local mirror | Semantically the same as the above; the mirror inevitably becomes the real source under outage anyway, so make that explicit |
| No membership system until billing exists | Would block Phases 1–9 on a business decision that has nothing to do with engineering |

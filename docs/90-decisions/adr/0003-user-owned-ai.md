# ADR-0003 · The user brings their own AI

**Status:** Accepted · 2026-09-09

## Context

The product needs a language model to generate answers. Someone must pay for it, hold the
credentials, and bear the terms-of-service relationship. There are three candidates: the
operator, the user through us, or the user directly.

Most of the product's target members already pay for ChatGPT, Claude, or Gemini.

## Decision

**The user uses their own AI account.** The application composes prompts, the user carries
them to their own provider session, and the user brings the answer back.

The application never holds the user's provider password, cookies, session tokens, or —
server-side — API keys.

## Consequences

**Positive**
- Owner AI cost is zero, permanently and structurally.
- No credential custody, so no credential breach is possible.
- No terms-of-service relationship with any provider, so no provider policy change can break
  the product.
- The user chooses their provider, including ones we have never heard of.
- The user's conversation stays in their own account, under their own controls and their own
  data-retention settings.
- We are not a sub-processor for AI content, which is legally significant.

**Negative**
- **The round trip.** Copy, switch, paste — two extra actions per turn, worse on mobile. This
  is the product's largest UX risk ([R-02](../../60-risk/67-risk-register.md)).
- No streaming in our UI.
- We cannot see the user's provider-side context, so each prompt must be self-contained.
- Members without any AI account get less value, though P2's local drafting still works.
- Members may perceive less value because "you don't even give me the AI".

**Accepted because** the alternative — the operator funding inference — has an unbounded cost
curve that would reach $60,000–300,000/month at 100,000 members
([Cost Model §7](../../80-ops/81-cost-model.md#7-cost-scenarios-40)), which no membership
price this audience would accept can fund.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Operator-funded API | Unbounded cost; the entire architecture exists to avoid it |
| Operator-funded with hard per-user caps | Still variable; caps produce a worse experience than a round trip and still cost real money |
| Resell provider access | Requires a commercial agreement, a margin, and support for someone else's model |
| Store the user's provider password and automate login | Prohibited by §5 and §32; breaches provider terms; endangers members' accounts |
| BYOK from day one | Only 5–15% of members have an API key. Deferred to Phase 2 (ADR-0006) |

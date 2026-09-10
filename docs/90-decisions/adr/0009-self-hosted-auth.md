# ADR-0009 · Self-hosted session authentication

**Status:** Accepted · 2026-09-09

## Context

Registration is mandatory (§21). Authentication can be delegated to a managed provider or
self-hosted with a well-maintained library. The decisive factor turned out not to be security
or developer experience, but **pricing shape**.

## Decision

**Self-hosted authentication** using Auth.js or Better Auth, with **opaque server-side
sessions** stored in PostgreSQL, Argon2id password hashing, breached-password screening,
enumeration-resistant flows, and optional TOTP (mandatory for admins).

## Consequences

**Positive**
- **Auth costs $0 marginally, forever.** 100,000 members cost the same as 100.
- Immediate revocation: "sign out everywhere" and post-password-change invalidation are a row
  delete, not a token expiry wait. For a product holding confessions, revocation is not optional.
- No third-party dependency in the critical login path.
- No user data shared with an identity provider.
- Fully portable.

**Negative**
- We own the security posture. A managed provider's security team is better than ours; this is
  a real trade, mitigated by using a maintained library rather than hand-rolling, plus the
  controls in [Security Architecture](../../60-risk/62-security-architecture.md).
- More to build: verification, reset, rate limiting, TOTP enrolment.
- We must keep up with authentication best practice ourselves.

## The number that decided it

| Provider | 1,000 MAU | 10,000 MAU | 100,000 MAU |
|---|---:|---:|---:|
| **Self-hosted** | **$0** | **$0** | **$0** |
| Clerk | $25 | $25 | ~$1,825 |
| Supabase Auth | $25 flat | $25 flat | $25 flat |

Per-MAU pricing at Scenario D exceeds the entire rest of the infrastructure. **A cost that
grows with ministry success, and buys nothing the product needs, is the wrong cost to accept.**

Supabase's flat bundling is genuinely competitive, and is precisely why the Supabase variant
remains the documented alternative architecture (ADR-0007).

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Clerk | Per-MAU pricing; excellent product, wrong shape |
| Auth0 | B2C pricing escalates steeply; enterprise features unused |
| Supabase Auth | Viable; rejected only as a consequence of ADR-0007 |
| JWT-in-cookie, stateless | Cannot revoke before expiry — disqualifying |
| Hand-rolled from scratch | How account-takeover incidents happen |
| Magic links as primary | Makes email compromise a total compromise; fails badly on delayed mail |

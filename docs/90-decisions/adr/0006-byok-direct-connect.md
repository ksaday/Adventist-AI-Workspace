# ADR-0006 · BYOK Direct Connect — browser-only, Phase 2

**Status:** **Superseded by [ADR-0020](0020-byok-conditional-on-official-support.md)** · 2026-09-09

> Superseded, not reversed. The binding constraints below still govern BYOK *if* it is ever
> built. What changed is the schedule and the gate: BYOK is `Conditional` on a provider's
> published sanction of browser-origin calls with an end-user key, it is not a Phase 2
> commitment, and the automatic "round-trip below 50% → ship immediately" trigger is gone.

## Context

The copy/launch round trip (ADR-0003) is the product's largest UX risk. There is a way to get
a genuinely ChatGPT-like in-app experience at zero operator cost: let the user supply **their
own API key**, store it **in their browser only**, and have the browser call the provider
directly.

This appears to conflict with §5, which says the application must not store AI API keys. The
distinction matters and is examined below.

## Decision

**Adopt BYOK Direct Connect as an opt-in Phase 2 feature**, with these binding constraints:

1. The key is stored in **browser storage only**, session-scoped by default.
2. The key **never reaches our servers** — not in a body, header, log, or error report. A CI
   test asserts that no route accepts a field that could carry one.
3. Calls go **browser → provider directly**. Our server is not in the path and cannot be.
4. A separate, versioned consent record (`byok_key_handling`) with an explicit risk explanation.
5. CSP `connect-src` enumerates exactly the permitted provider endpoints, so even injected
   script cannot exfiltrate the key elsewhere.
6. The key is never included in exports, backups, or telemetry.
7. A permanent indicator when Direct Connect is active, showing provider and key fingerprint.

**Deferred to Phase 2**, not shipped at MVP.

## Why this does not violate §5

§5 forbids **the application** from storing AI API keys. Here the key lives in the user's own
browser, under the user's control, never transmitted to us — exactly as it would if they used
the provider's own web console. The application stores nothing.

This is a real distinction, not a technicality. It is also why the feature is opt-in,
separately consented, and honestly documented rather than enabled by default.

## Why it is deferred rather than shipped at MVP

- The MVP exists to test whether members accept the round trip. Shipping the escape hatch
  first would prevent learning the answer.
- Only 5–15% of members are likely to have an API key. It is a power-user feature.
- It introduces the product's only browser-side secret, which deserves a dedicated security
  review rather than being bundled into a launch.

## Consequences

**Positive**
- Real streaming, real conversation continuity, ~95% of a ChatGPT-like feel.
- Owner cost remains exactly $0.
- Often cheaper for the member than a subscription, for light use.
- The composer, validators, and ledger work identically — only the transport changes.

**Negative**
- **An XSS flaw in our application could exfiltrate the key.** This is the strongest argument
  for the strict CSP and the allowlist renderer, and it is disclosed to the user.
- A shared computer retains the key unless cleared; session-only is therefore the default.
- The member is billed by their provider per call; we show an estimated token count and a
  running session total.
- Provider CORS policies must permit browser-origin calls. `[VERIFY]` at implementation time;
  any provider that does not permit it simply is not offered at Tier C, and Tier B still works.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Server-side key storage, encrypted | Violates §5 in substance; makes us a credential custodian; a breach would expose members' billing |
| Server-side proxy with the user's key | Same custody problem, plus we become a sub-processor for their AI content |
| Never offer BYOK | Forgoes the only honest path to a ChatGPT-like feel at $0 owner cost |
| Ship BYOK at MVP | Prevents learning whether the round trip is acceptable |

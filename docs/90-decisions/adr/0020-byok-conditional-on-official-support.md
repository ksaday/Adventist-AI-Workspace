# ADR-0020 · BYOK Direct Connect is conditional on published provider support

**Status:** Accepted · 2026-09-09 · **Supersedes [ADR-0006](0006-byok-direct-connect.md)**

## Context

[ADR-0006](0006-byok-direct-connect.md) adopted BYOK Direct Connect as an opt-in **Phase 2**
feature: the member's own API key held in browser storage, calls going browser → provider, our
server never in the path. It was the package's answer to `R-02`, the round-trip friction risk,
and the Evaluation Strategy carried an automatic trigger — *round-trip completion below 50% at
month 3 → accelerate BYOK immediately.*

Two problems surfaced on review.

**Provider sanction was assumed, not established.** ADR-0006 carried a `[VERIFY]` to be
resolved "at implementation time", and `Q-14` asked whether providers permit browser-origin
calls. But holding an end-user API key in browser storage sits in tension with the key-handling
guidance major providers publish, and an XSS flaw in our application would exfiltrate it. The
package cannot claim this is safe on the strength of nobody having said otherwise.

**The automatic trigger made it worse.** A metric threshold would have shipped the product's
only browser-side secret on a schedule set by UX disappointment, precisely when the pressure to
skip the security review would be highest.

There is also a member-cost point the package understated: BYOK bills the member **per call**.
For someone who already pays for a ChatGPT or Claude subscription, the copy/launch round trip
costs them nothing extra and BYOK costs them more.

## Decision

**BYOK Direct Connect is `Conditional`, not scheduled.** It is not in Horizon 1, it is not a
Phase 2 commitment, and it is not one of the decisions that define this architecture.

**The gate:** a provider's **published documentation** sanctions browser-origin API calls
carrying an end-user key. *Vendor silence is not consent.* The gate is per provider — Tier C
may be offered for one and withheld for another, and Tier B covers every provider regardless.

**The automatic trigger is deleted**, from the Evaluation Strategy, the Critical Review, and
the Risk Register. If the round trip fails, that is a product finding requiring a product
decision, not a switch that throws itself.

If the gate is ever satisfied, ADR-0006's binding constraints survive intact — browser-only
storage session-scoped by default, the key never reaching our origin, a CI test asserting no
route accepts a key-shaped field, a CSP `connect-src` enumerating exactly the permitted
endpoints, a separate versioned consent, and a permanent active-connection indicator — with two
additions: the published provider guidance is cited in the consent flow, and the member's
per-call cost is disclosed before the first call and totalled per session.

## Consequences

**Positive**
- The product's only browser-side secret cannot ship on a metric threshold.
- `Q-14` is promoted from an implementation-time `[VERIFY]` to a blocking gate with a
  falsifiable answer: either published documentation exists, or it does not.
- The member-cost tradeoff is stated where it belongs, rather than presented as strictly better.

**Negative**
- **`R-02` loses its answer.** Round-trip friction is the second-largest risk in the register
  and its mitigation is now clipboard and launch UX alone. The register says so plainly rather
  than substituting something weaker in the same column. This is the real cost of this ADR and
  it should not be smoothed over.
- Members who hold an API key and would have preferred in-app streaming do not get it, on a
  timeline nobody can commit to.
- The package's answer to *"can this feel like ChatGPT?"* stands at the copy/launch number —
  about 60–70% — with no scheduled path to improving it.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Keep ADR-0006 and add security caveats | Does not resolve the tension with provider guidance, and leaves the automatic trigger in place. |
| Remove BYOK entirely | Forecloses an option that may become clearly safe if a provider ships a sanctioned browser-side mechanism. `Conditional` costs nothing to hold open. |
| Server-side key custody instead | Makes us a credential custodian and a sub-processor for the member's AI content — rejected in ADR-0006 and still rejected. |

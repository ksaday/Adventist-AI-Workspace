# ADR-0010 · The evidence ladder (E0–E4)

**Status:** **Superseded by [ADR-0019](0019-evidence-ladder-revision.md)** · 2026-09-09
**This is the most important decision in the architecture.**

> Superseded in one specific and consequential respect: this record placed **E3** alongside
> E4 as a rung at which a claim may be shown `VERIFIED`, in green. Supplied text has no
> established provenance, so that was wrong. ADR-0019 demotes E3 to `TEXT_CONSISTENT` and
> reserves verification for E4 alone. Everything else here — E2 can never verify, levels
> rise on artefacts and never on assertion — stands unchanged and is restated there.

## Context

A user asks whether Ellen G. White said something. An AI says yes, with a page number. A
second AI is asked to check, and agrees.

**Nothing has been verified.** Two models with overlapping training data have agreed with each
other; neither opened the book. If the UI shows a green VERIFIED badge here, the product has
laundered a fabrication into an institutional-looking confirmation — and a pastor may repeat
it from a pulpit on our authority.

A single verified/unverified boolean cannot express the difference between "a model said so"
and "a person read it in the book". Yet the difference is the entire product.

## Decision

Every claim carries **two** attributes, always displayed together:

| Level | Meaning | May the status be VERIFIED? |
|---|---|---|
| **E0** | No source offered | No |
| **E1** | A model asserted it from memory | No |
| **E2** | A second model agreed | **No** |
| **E3** | Compared against source text present in the conversation | Yes |
| **E4** | A person confirmed it at the official source, with URL and timestamp | Yes |

Enforced at **three independent layers**:

1. A **database CHECK constraint** — `status IN ('VERIFIED','PARTIALLY_VERIFIED')` requires
   `evidence_level IN ('E3','E4')`.
2. A **rendering guard** — `mayAssertOfficialVerification(record)` gates any UI string
   asserting official-source verification.
3. A **message-catalogue lint** across every locale, so the claim cannot be smuggled in as
   translated copy.

**Evidence levels are raised only by artefacts, never by assertion.** E3 requires a referenced
source block; E4 requires a user attestation with a URL and an actor. No verifier's confidence
raises a level.

### The asymmetry at E2

Model agreement never produces VERIFIED, because models trained on overlapping corpora share
misconceptions and a verifier shown a confident assertion is biased toward agreeing with it.

Model **disagreement** may produce CONTRADICTED, because disagreement means at least one model
is wrong about something checkable, while agreement means only that two systems share an opinion.

## Consequences

**Positive**
- **The product's central promise is enforced mechanically, not by discipline.** A future
  developer who tries to mark a model-corroborated claim as verified gets a constraint
  violation — and that violation is the design working.
- Users can see exactly what stands behind each claim.
- The distinction between model agreement and source verification is preserved permanently,
  in the schema, where documentation cannot drift away from it.

**Negative**
- More complex than a boolean, and users must learn it. The five-level ladder is the product's
  main conceptual burden.
- Most claims will sit at E1, which may read as a product that never verifies anything. The UI
  must make E1 feel *unfinished* rather than *failed*.
- **Users may still misread E2 as verification** ([R-05](../../60-risk/67-risk-register.md)).
  No technical control prevents a misreading; this is a copy and visual-design problem, and it
  is tested in member interviews.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Verified / unverified boolean | Cannot express the distinction that is the entire product |
| A numeric confidence score | Implies a probability we have not computed. Users would read 0.8 as "probably true" |
| Three levels (none / model / source) | Loses the E1 vs E2 distinction, which is exactly where users are most likely to be misled |
| Trust the verifier model's own status | Would let a fluent model assert VERIFIED — the specific failure this exists to prevent |

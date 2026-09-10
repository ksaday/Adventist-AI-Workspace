# ADR-0021 · No Bible verse text is bundled or shipped

**Status:** Accepted · 2026-09-09 · **Supersedes [ADR-0012](0012-bundled-kjv-module.md)**

## Context

[ADR-0012](0012-bundled-kjv-module.md) proposed bundling the King James Version text as a
separately loadable module, conditional on counsel, so that a verse quoted verbatim could be
diffed character by character against the real text. It was recorded as **Provisional** — the
only ADR in the package that was.

The legal position is genuinely unsettled, and it is worth stating correctly because the
package previously stated it loosely. In the **United States** the KJV text is in the public
domain. In the **United Kingdom** it is held under the **royal prerogative, exercised through
perpetual letters patent** — the King's Printer (Cambridge University Press), with Oxford
University Press and, in Scotland, the Scottish Bible Board. This is a distinct regime from
**Crown copyright** under CDPA s.163, and conflating the two produces a legal question that
does not exist while obscuring the one that does. See the GOV.UK guidance on Crown copyright
and the Authorised Version.

Our members are global and the operator's place of establishment drives much of the analysis.
`Q-02` has been open on this since the package was written.

## Decision

**Ship reference-structure validation only. Bundle no verse text, in any translation.**

- The bundled canon index remains: 66 books, identifiers, per-locale names and abbreviations,
  chapter counts, verses per chapter. **Structural metadata, no text.**
- Verbatim-quotation comparison reports `UNAVAILABLE`. It never reports `EXACT`, and the UI
  directs the member to a Bible reader instead of implying a check occurred.
- This is `Option B` from the Copyright Risk Analysis, adopted as **the decision** rather than
  as a fallback if counsel objects.

Revisit only with a licensed text source, or a translation whose redistribution status counsel
has affirmatively confirmed — not merely one where no objection has been found.

## Consequences

**Positive**
- The highest-risk optional component in the design is removed rather than deferred, and `Q-02`
  closes.
- No licence audit, no per-jurisdiction analysis, no module-loading configuration, no risk that
  a build accidentally ships the text.
- The validators keep the great majority of their value. A reference that does not exist is
  still caught deterministically — and fabricated *references* are far more common in model
  output than subtly altered wording of real ones.

**Negative**
- **Misquotation of a real verse cannot be detected.** A model that renders John 3:16 with
  altered wording passes every check we run. This is a real gap and the product must not imply
  otherwise.
- Combined with [ADR-0019](0019-evidence-ladder-revision.md), it means **no Scripture claim can
  reach E4 by machine either**. This is why `PR-P4-09` raises the pre-pulpit block to E4 for
  Scripture as well as for Ellen G. White citations: with no bundled text, a verbatim public
  quotation of Scripture has exactly as little machine backing as an EGW quotation, and it
  would be incoherent to gate one and not the other.
- The `[VERIFY]` markers and cost lines that assumed a KJV module are removed.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Bundle the KJV, conditional on counsel (ADR-0012) | Leaves a legal question open across the whole build, for a feature that catches a narrower failure than the validators already catch. |
| A licensed Bible text API | Usually usage-metered, which conflicts with the flat-cost constraint in §4.2, and adds a runtime dependency to a component that is currently offline and free. |
| Bundle a different public-domain translation (ASV, WEB) | Clear status, and a reasonable future option — but not the translation this audience expects, and it would invite silent comparison against a translation the member did not quote. |

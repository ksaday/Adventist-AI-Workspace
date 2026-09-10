# ADR-0012 · Bundled KJV module — conditional on counsel

**Status:** **Superseded by [ADR-0021](0021-no-bundled-verse-text.md)** · 2026-09-09

> The legal determination this record was waiting for was resolved by declining the risk:
> no verse text is bundled, in any translation. Reference-structure validation ships alone.
> Retained for the reasoning, including the UK letters-patent analysis, which ADR-0021
> restates more precisely.

## Context

Deterministic reference validation (ADR-0011) catches references that do not exist. It cannot
catch a **misquotation of a verse that does exist** — an answer that presents altered wording
as a verbatim quotation of John 3:16. Catching that requires the actual text.

The King James Version is the translation this audience most often requests, and the text is
small: roughly 4.5 MB, splittable per book and lazily loaded.

**The complication:** the KJV is in the public domain in the United States, but in the United
Kingdom it is subject to **perpetual Crown letters patent**, with Cambridge University Press,
Oxford University Press, and Collins holding rights to print and publish it there. This is an
unusual arrangement, easy to overlook, and jurisdiction-specific. The product's members are
global and the operator's establishment determines much of the analysis.

## Decision

**Provisionally adopt** a bundled KJV verse-text module for verbatim comparison, implemented
as a **separately loadable, independently removable module**, and **conditional on a legal
determination** before launch.

The module reports `EXACT` (character-identical after whitespace normalisation), `NEAR`
(matching after normalising punctuation, capitalisation, and archaic spelling variants),
`MISMATCH` (with a character-level diff), or `UNAVAILABLE`. It never reports `EXACT` by default.

## The contingency, decided in advance

| Outcome | Action |
|---|---|
| Counsel says redistribution is fine for the operator's jurisdiction and audience | Ship the module |
| Counsel is uncomfortable, or the position is unclear | **Ship reference validation only.** Verse-text comparison moves to Post-MVP behind a licensed API or a clearly public-domain translation |

Because the module is separately loadable, this is a **configuration change, not a rewrite**.
That is the entire reason for the modular design.

## Consequences

**Positive**
- Catches misquotation of real verses — a distinct and damaging fabrication class.
- Zero marginal cost; served from the CDN, cached at the edge.
- Enables Scripture claims to reach E3 automatically when a verse is quoted verbatim, which is
  the only place in the product where the *system* rather than the user can produce E3 evidence.
- Works offline.

**Negative**
- The UK Crown-patent question is genuine and unresolved. `⚖`
- 4.5 MB of assets, mitigated by per-book lazy loading.
- KJV only; other translations are licensed works requiring permission.
- Archaic-spelling normalisation is fiddly and will produce occasional `NEAR` results that
  need human judgement.

## Alternatives considered

| Alternative | Verdict |
|---|---|
| Reference validation only | **The contingency.** Zero risk, most of the value |
| A licensed Bible API | Usually usage-metered — conflicts with §4.2 — and adds a runtime dependency. Worth revisiting in Horizon 2 |
| A different public-domain translation (ASV, WEB) | Clear status, no Crown-patent question, but not the translation this audience expects. A reasonable fallback |
| Ship it and hope | Rejected. The product's premise is honesty about uncertainty; acting otherwise about our own legal exposure would be incoherent |

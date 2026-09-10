# ADR-0002 · No EGW corpus — catalogue only

**Status:** Accepted · 2026-09-09 · Extends ADR-0001

## Context

ADR-0001 rejects a knowledge server. A subtler question remains: how much *about* the
writings may the system hold? Zero is one answer, but it means we cannot detect a fabricated
book title, which is one of the most common and most damaging hallucination modes in this
domain — a model confidently citing *The Path to Christ* when the work is *Steps to Christ*.

There is a real distinction between a library's card catalogue and the books on its shelves.

## Decision

The system holds a **bibliographic catalogue** of approximately 200 records containing:
canonical English title, standard abbreviations, author, publisher, first-publication year,
reference-edition page count, official URL template, optional verified localised title, and a
`last_reviewed` date.

The system holds **no text from any work**: no sentences, no paragraphs, no excerpts, no
passage summaries, no embeddings, no derived representations.

The catalogue record type has no `text`, `content`, `excerpt`, `summary`, `body`, `quote`, or
`embedding` field. **Adding one is a blocking schema review.**

## Consequences

**Positive**
- Fabricated work titles are caught deterministically, at zero cost, with no AI.
- Page numbers can be checked for plausibility against a real page count.
- Links to the official library are accurate.
- Facts about publications are not the expressive content that copyright protects.
- The catalogue is ~80 KB and needs no infrastructure.

**Negative**
- A compilation or database right may attach to a substantial selection or arrangement,
  particularly under the EU/UK sui generis regime. Mitigated by compiling from multiple
  public sources, structuring it for our own purpose, and recording provenance per record.
  `⚖ Requires counsel.`
- The catalogue will be incomplete, so "not in our catalogue" must never be presented as
  "does not exist".
- It requires periodic maintenance.

**The bright line is the point.** "No text, ever" needs no judgement call from a developer at
11pm adding a feature. "A little text, tastefully" would.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| No catalogue at all | Loses fabricated-title detection, which is high-value and near-zero-risk |
| Catalogue plus one-sentence summaries per work | Crosses from facts into expression; erodes the bright line for modest benefit |
| Catalogue plus chapter titles | Considered; chapter titles are arguably factual but the marginal value is low and the line-drawing cost is high. Deferred |
| Catalogue plus representative quotations | Directly contradicts ADR-0001 |

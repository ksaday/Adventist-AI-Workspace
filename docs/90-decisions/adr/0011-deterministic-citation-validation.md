# ADR-0011 · Deterministic citation validation with bundled data

**Status:** Accepted · 2026-09-09

## Context

The evidence ladder (ADR-0010) is honest about what is *unverified*, but by itself it is
passive: it labels claims and waits for the user to act. Meanwhile there is a large class of
fabrications that can be **falsified outright, mechanically, with no AI and no cost**:

- `John 3:99` — the verse does not exist.
- `Hezekiah 4:2` — the book does not exist.
- *The Path to Christ* — the work is *Steps to Christ*.
- *The Desire of Ages*, p. 1,200 — the reference edition has 835 pages.
- A verse quoted verbatim whose words do not match the KJV text.

Bible structure and bibliographic facts are small, static, and free.

## Decision

Ship **bundled, versioned reference datasets** and validate every citation **client-side**:

| Asset | Size | Contents |
|---|---|---|
| Bible canon index | ~120 KB | 66 books, per-locale names and abbreviations, chapter counts, verses-per-chapter |
| EGW catalogue | ~80 KB | ~200 works: titles, abbreviations, publisher, year, page counts, URL templates |
| KJV module (conditional) | ~4.5 MB, lazily loaded per book | Public-domain verse text for verbatim comparison (ADR-0012) |

Validation runs entirely in the browser. No network request. No marginal cost.

**Validators fail to `UNKNOWN`, never to `VALID`.** A validator that fails open manufactures
false confidence in exactly the situation where the user most needs the truth.

## Consequences

**Positive**
- **This is the only part of the anti-hallucination story that is a guarantee rather than a
  request.** Everything else asks an external model to behave; this simply knows.
- Zero marginal cost at any scale — 100,000 members validate for free.
- Instant: findings appear before any AI step, which is where most of the perceived value lands.
- Works offline and during a server outage.
- Builds trust immediately — a pastor sees the anchor-passage field catch a typo before any AI
  is involved.

**Negative**
- The EGW catalogue is incomplete, so `TITLE_NOT_IN_CATALOGUE` must be presented as "not found
  in our catalogue — check the official library", never as "this work does not exist".
- Page counts vary by edition, so page plausibility carries a caveat and can only flag, never
  invalidate.
- Reference detection risks false positives in ordinary prose ("John said", "Mark the date"),
  so detection requires a citation-shaped pattern; precision is favoured for detection, recall
  for validation of things already claimed as references.
- The datasets need periodic review.

## Evaluation targets

| Set | Target |
|---|---|
| Fabricated Bible references flagged | **≥98%** |
| Fabricated EGW titles flagged | **≥95%** |
| False detection in ordinary prose | ≤2% |

Regression on the first two blocks a release.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Server-side validation | Adds cost and latency, breaks offline use, and would send citation text to the server for Ephemeral conversations |
| A Bible API for reference validation | Usage-metered; a network dependency for something a 120 KB file answers perfectly |
| Ask an AI to validate references | Costs money, is probabilistic, and would be strictly worse than a lookup table |
| No EGW validation at all | Forgoes catching the most damaging fabrication class in this domain |

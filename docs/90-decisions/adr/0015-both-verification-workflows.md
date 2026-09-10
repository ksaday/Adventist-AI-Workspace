# ADR-0015 · Support both source-first and answer-first workflows

**Status:** Accepted · 2026-09-09

## Context

Two verification workflows are possible:

**Source First** — the user finds and supplies sources, then asks. The model reasons from
present text, so fabrication has less room to operate and evidence is available at generation
time. Claims can reach E3 immediately — which is `TEXT_CONSISTENT`, not verification.

**Answer First** — the user asks, gets an answer, then verifies. Lower effort, but claims
start at E1 and the ceiling without user action is E2.

Source-first is unambiguously safer. Answer-first is what people will actually do.

## Decision

**Support both. Default to answer-first. Escalate to source-first where the stakes are highest.**

- **P3** offers an optional "Add sources" panel; supplying any source switches the composer to
  source-bounded mode with a visible indicator.
- **P4** nudges toward source-first for anything intended for public teaching, and the
  **Citation Checklist blocks "mark ready to preach"** while any citation the pastor has marked
  for verbatim public quotation sits below E4. That block pushes the pastor to the source
  exactly when it matters.
- **P2** rarely needs it; Scripture anchors come from the curated topical index.

## Consequences

**Positive**
- The low-friction path exists, so people finish. A workflow nobody completes protects nobody.
- The high-integrity path exists, and the product routes people to it where the consequences
  are real rather than demanding it universally.
- Source-bounded mode makes the constraint visible while it is in effect.

**Negative**
- Two workflows means two prompt template families, two evaluation paths, and more surface to test.
- Users may not understand why one is safer; the ledger's evidence levels are the explanation,
  and they require reading.
- The P4 block will occasionally frustrate a pastor in a hurry — which is the intended
  trade-off, and it is scoped to marked verbatim quotations rather than every reference, so it
  is proportionate rather than paternalistic.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Source-first only | Too much friction; most users would abandon before their first answer |
| Answer-first only | Caps evidence at E2 unless the user attests manually; forgoes the safest path entirely |
| Automatically fetch sources | Would require holding or scraping the corpus — forbidden by ADR-0001 and ADR-0014 |
| Force source-first for all EGW claims | Considered seriously. Rejected because it would make the product unusable for exploration, which is how most study actually begins |

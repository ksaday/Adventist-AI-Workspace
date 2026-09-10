# ADR-0016 · Verification is a separate, linked conversation

**Status:** Accepted · 2026-09-09

## Context

When a user verifies an answer, the verification interaction could live inline in the original
conversation, or in its own conversation linked to the original.

Verification is substantively a different task with a different prompt, often a different AI,
a different output format, and its own working state (the claim ledger). Mixing it into the
original timeline would interleave two conversations with different purposes and make it hard
to answer "what did the original answer actually say?" later.

## Decision

**Verification is a separate conversation** (`app = 'verify'`) with a bidirectional link to
its origin, holding the original question, the original answer, the extracted claims, the
generated verification prompt, and the claim ledger.

Navigation is explicit in both directions. Verification conversations appear **nested under
their origin** in the sidebar, not as top-level items.

Deleting the origin does not orphan the verification: an `origin_tombstone` preserves enough
context for the verification to remain meaningful.

## Consequences

**Positive**
- The user can genuinely use a *different* AI for verification — the recommended practice —
  without confusing two provider contexts in one timeline.
- The original answer stays readable as it was received.
- The claim ledger has a natural home.
- A verification can be revisited months later, as a standalone artefact, which is what a
  pastor reviewing a citation actually needs.
- Multiple verification passes over the same answer are possible, each with its own record.

**Negative**
- More navigation. The user must move between two places.
- Nesting in the sidebar adds UI complexity; a flat list would be simpler but becomes confusing
  within a week of use.
- The bidirectional link and the tombstone add data-model complexity.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Inline verification in the original conversation | Interleaves two purposes; makes the original answer hard to read as received; no home for the ledger |
| A modal or side panel | No persistence, no history, cannot be revisited, and does not accommodate a full round trip with a second AI |
| A separate top-level "Verifications" section | Loses the connection to the origin, which is the most important relationship in the data model |

# ADR-0019 · E3 is supplied-text consistency, not verification

**Status:** Accepted · 2026-09-09 · **Supersedes [ADR-0010](0010-evidence-ladder.md)**

## Context

[ADR-0010](0010-evidence-ladder.md) placed E3 — "compared against source text present in the
conversation" — alongside E4 as a rung at which a claim may be shown `VERIFIED`, in green.

That was wrong, and the error is subtle enough to be worth stating precisely. Text a member
pastes into the workspace has **no established provenance**. We did not fetch it. We cannot
fetch it. We hold no copy of the work to compare it against. A member who asks a model for a
quotation, receives a fabrication, and pastes that fabrication in as "source" produces a
perfect E3 record from a hallucination — and under ADR-0010 the product would have rendered
that in green, with the word *verified*, on the same visual footing as someone who actually
opened the official library and read the page.

This is precisely the laundering failure the whole verification architecture exists to
prevent, reproduced one rung higher than where we thought we had stopped it.

## Decision

**E3 is renamed and demoted to a non-verification state.**

| Level | Name | Status ceiling |
|---|---|---|
| E0 | No source | `NOT_VERIFIED`, `INSUFFICIENT_EVIDENCE` |
| E1 | Model recall | same |
| E2 | Model corroboration | + `CONTRADICTED` |
| **E3** | **Supplied-text consistency** (session-scoped, client-side) | + **`TEXT_CONSISTENT`** |
| **E4** | **Confirmed by you at an official source** | + `VERIFIED`, `PARTIALLY_VERIFIED` |

1. A sixth claim status, **`TEXT_CONSISTENT`**, carries E3's positive outcome so that it never
   has to borrow the word `VERIFIED`.
2. **E4 alone** permits `VERIFIED` or `PARTIALLY_VERIFIED`, green, or any string in any locale
   asserting official-source verification.
3. `TEXT_CONSISTENT` is reachable at **E3 only**. Promotion to E4 means a person went and
   looked; the claim must then resolve to what they found.
4. The rendering guard becomes `r.level === 'E4'`. Ordinal comparison over `EvidenceLevel` is
   forbidden — the previous `>= 'E3'` was both the wrong threshold and a string comparison that
   would silently survive a future level identifier.
5. E3 is **session-scoped**. Because member-supplied text is never transmitted to our server
   ([ADR-0022](0022-no-server-side-source-text.md)), an E3 determination cannot be reproduced
   or audited after the session ends. The UI says so at the moment the member pastes.

## What E3 is still worth

This ADR demotes E3; it does not dismiss it, and the distinction matters for anyone tempted to
remove the rung entirely.

Against text the member is holding, comparison **does** defeat a real and common failure: the
model that invents wording, transposes a page number, or attributes a real passage to the wrong
work. Those are caught, deterministically, at the moment of generation. That is genuine value
and it is why the source-first workflow remains the higher-integrity path.

What it cannot do is establish **authenticity**. Consistency with an artefact of unknown
origin is consistency, not confirmation. E3 answers *"does the claim match the text in front of
you?"* and E4 answers *"is that text really what the source says?"* — and only the second is
verification.

Stating this here is deliberate. The next well-meaning refactor will look at a green badge
missing from a workflow the product actively recommends and try to restore it.

## Consequences

**Positive**
- The product's central integrity claim becomes true at the rung where it was previously false.
- `TEXT_CONSISTENT` lets the UI say something accurate and positive about source-first work
  rather than falling back to `NOT_VERIFIED`, which would have punished the better workflow.
- The guard is an equality test, so a future level cannot silently inherit verification rights.

**Negative**
- **Fewer claims will ever be green.** E4 requires a person to open a source, and most members
  will not. This is the honest number, and the monitoring split (E3 versus E4 rates) exists to
  show it rather than hide it.
- The pre-pulpit block in `PR-P4-09` rises from E3 to E4, which makes "ready to preach" harder
  to reach. That is the intended effect.
- Source-first loses its evidentiary payoff at session end, which must be disclosed at the
  paste target rather than in a help panel.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Keep E3 as a verifying rung, with a stronger disclaimer | The failure is structural, not informational. A green badge outweighs any adjacent sentence. |
| Remove E3 from the ladder entirely (E0/E1/E2/E4) | Discards the real value above, and leaves source-first — the workflow the product recommends for pulpit work — with no way to record that the comparison happened. |
| Keep E3 verifying, but only when the member declares the text's origin | A declaration is an assertion, and the ladder's governing rule is that levels rise on artefacts, never on assertions. |

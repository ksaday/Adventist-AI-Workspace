# Source Verification Architecture

**Document 15 of 37** · v1.1
**This is the most important document in the package. The product's integrity claim lives here.**

---

## 1. The problem with the word "verified"

A user asks: *"Did Ellen White say this?"* An AI answers: *"Yes — The Desire of Ages, p. 331."*
A second AI is asked to check, and answers: *"Verified. That is correct."*

**Nothing has been verified.** Two models that have read *about* the same book have agreed
with each other. Neither opened it. The page number may be invented, and the second model
may have simply deferred to a confident-sounding assertion.

If our UI renders a green "VERIFIED" badge at this point, we have done something worse than
nothing: we have laundered a fabrication into an institutional-looking confirmation, and a
pastor may repeat it from a pulpit on our authority.

**The entire verification architecture exists to make that outcome structurally impossible.**

---

## 2. The evidence ladder (normative)

Every claim carries **two** attributes that must always be displayed together.

| Level | Name | What actually happened | May status be VERIFIED? |
|---|---|---|---|
| **E0** | No source | Nothing was offered | No |
| **E1** | Model recall | An AI asserted it from training memory | No |
| **E2** | Model corroboration | A second AI agreed with the first | **No** |
| **E3** | Supplied-text consistency | The claim is consistent with text the member supplied in this session. The provenance of that text is **not** established, and our server never received it | **No** |
| **E4** | Confirmed by you at an official source | The owner of the claim opened an allowlisted official source and confirmed it, recording the URL and the time | **Yes** |

Only **E4** permits `VERIFIED`, and only E4 is green. E3 has its own status,
`TEXT_CONSISTENT`, so that it never has to borrow the word ([ADR-0019](../90-decisions/adr/0019-evidence-ladder-revision.md)).

### Why E2 can never be VERIFIED

This is the single most consequential rule in the product. Model agreement is correlated
error, not independent evidence: models trained on overlapping corpora share the same
misconceptions, and a verifier model shown a confident assertion is strongly biased toward
agreeing with it.

However, **E2 disagreement is genuinely informative**, and the design uses it asymmetrically:

- E2 agreement → status stays `NOT_VERIFIED`. The ledger notes "a second AI agreed", which is
  weak positive signal, and the UI says exactly that.
- E2 disagreement → status may become `CONTRADICTED`, which is a strong, actionable signal
  worth surfacing prominently.

Asymmetry is correct because a disagreement means at least one model is wrong about something
checkable, while an agreement means only that two systems share an opinion.

### Why E3 can never be VERIFIED

The same shape of argument, one rung higher, and it is the one this architecture got wrong
until Revision 1.1.

Text a member pastes has **no established provenance**. We did not fetch it, we cannot fetch
it, and we hold no copy of the work to compare it against. A member who asks a model for a
quotation, receives a fabrication, and pastes that fabrication in as "source" produces a
flawless E3 record from a hallucination — and if the product rendered that in green it would
have laundered the fabrication exactly as the opening scenario describes, merely with an extra
step and more of the member's effort invested in believing it.

So the two questions are kept apart:

- **E3 asks:** does the claim match the text in front of you?
- **E4 asks:** is that text really what the source says?

Only the second is verification. The first is still worth having — see below — but it is a
different thing and the UI must never let them merge.

### What E3 is still worth

Demoting E3 is not dismissing it. Against text the member is holding, comparison defeats a
real and frequent failure: the model that invents wording, transposes a page number, or
attributes a genuine passage to the wrong work. Those are caught deterministically, at the
moment of generation, before anything reaches a pulpit.

That is why source-first remains the higher-integrity workflow and why the product still nudges
toward it. What changed is only the claim made about its output.

### The independent axis: deterministic validation

Running alongside and beneath the ladder, the bundled validators can **falsify** a claim at
any level without any AI involvement:

- `John 3:99` does not exist in the canon. No amount of model agreement makes it exist.
- *The Path to Christ* is not in the catalogue; *Steps to Christ* is. This is a likely
  fabrication or a misremembering, flagged with a suggestion.
- *The Desire of Ages*, p. 1,200 exceeds the reference edition's page count. Implausible.
- A page number cited beyond the reference edition's extent is implausible, and is flagged.

What deterministic validation **cannot** do, since [ADR-0021](../90-decisions/adr/0021-no-bundled-verse-text.md):
detect misquotation of a *real* verse. No verse text is bundled, so verbatim comparison reports
`UNAVAILABLE` and never `EXACT`. A model that renders John 3:16 with altered wording passes
every check we run, and the product says so rather than implying a check occurred.

Deterministic validation is the only part of the anti-hallucination story that is a
**guarantee** rather than a request, and it is why it is prominent in the UI rather than
buried in a details pane.

---

## 3. The three-column honesty contract

This table appears in the product's own UI, verbatim, in the "How verification works" panel.
It is a mandatory requirement (§12).

| Guaranteed by our software | Requested of the external AI | Depends on your own verification |
|---|---|---|
| Every Bible reference is checked against a complete canon index | To refuse when the evidence is insufficient | Opening the official EGW Library and reading the passage |
| Every Ellen G. White work title is checked against a bibliographic catalogue | Not to invent quotations, page numbers, or titles | Pasting source text accurately and completely |
| Page numbers are checked for plausibility against the reference edition | To label memory-based recall as unverified | Judging whether an interpretation is sound |
| We never show "verified" unless **you** confirmed it at the official source | To prefer paraphrase over quotation | Not repeating an unverified claim as fact |
| Your source text never reaches our server at all — it stays in this browser, for this session | Never to claim it consulted a source it did not consult | Deciding what is fit to preach |

---

## 4. The two workflows

### Workflow A — Source First

```
User question
   │
   ├─ User searches the official EGW Library / a Bible reader themselves
   ├─ User pastes the passage(s) — stays in the BROWSER ──▶ source_block_ref
   ├─ Composer emits a SOURCE-BOUNDED prompt:
   │     "Reason only from the material between the delimiters.
   │      If it is insufficient, say so explicitly and stop."
   ├─ User runs it in their AI
   └─ Answer's source claims can reach E3 immediately, because the text is present
      (E3 = consistent with what you supplied. Not verification. Not green.)
```

**Higher integrity, higher effort.** Recommended, and nudged, for anything intended for
public teaching. P4 surfaces it prominently.

**And it is session-scoped.** The supplied text never reaches our server
([ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md)), so when the session ends
it is gone and the E3 determination cannot be reproduced or audited. Re-checking means
re-pasting. The UI states this **at the paste target**, not in a help panel: a member choosing
the higher-effort path deserves to know its evidence expires with the tab.

### Workflow B — Answer First (the default)

```
User question ──▶ standard prompt ──▶ AI answer (E1 claims)
                                        │
                                        ├─ deterministic validation runs immediately
                                        └─ [ Verify Sources ] ──▶ verification conversation
                                              │
                                              ├─ verifier AI pass         → E2 at best
                                              └─ user opens official source → E4 per claim
```

**Lower friction, honest labelling.** This is the default because a workflow nobody completes
protects nobody. The product's job is to make the E1 state *visibly unfinished* rather than
to prevent it.

### Which is safer, and the recommendation

Source-first is unambiguously safer: the model reasons from present text rather than memory,
so fabrication has less room to operate, and evidence is available at the moment of
generation rather than reconstructed afterward.

**The recommended product supports both, defaults to B, and escalates to A where the stakes
are highest** — specifically, P4 blocks "mark ready to preach" while any citation the pastor
has marked for verbatim public quotation sits below **E4**, which pushes them to open the
actual source exactly when it matters. Workflow A alone is no longer sufficient for that gate,
because supplied text does not establish authenticity. See
[Critical Review §4](../90-decisions/92-critical-review.md).

---

## 5. The Verify Sources experience

The user is in Conversation A, looking at an answer. They click **Verify Sources**.

```
┌─ SOURCE VERIFICATION ───────────────────────────────────────────────┐
│                                                                     │
│  Checking an AI-generated response against the sources it cited.    │
│                                                                     │
│  Verification AI:  [ ChatGPT ▾ ]                                    │
│                    ⓘ Best practice: use a DIFFERENT AI than the one │
│                      that wrote the answer.                         │
│                                                                     │
│  Sources to check against:                                          │
│    ☑ Bible (KJV)        ☑ EGW Library        ☐ Only text I supply   │
│                                                                     │
│  CLAIMS FOUND — 6                                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ C1  Scripture   John 3:16              ✓ reference valid    │    │
│  │ C2  EGW         The Desire of Ages, p.331   E1 · unverified │    │
│  │ C3  EGW         "The Path to Christ"   ⚠ not in catalogue   │    │
│  │                                          did you mean       │    │
│  │                                          Steps to Christ?   │    │
│  │ C4  Scripture   Romans 5:3–5           ✓ reference valid    │    │
│  │ C5  Scripture   John 3:99              ✗ verse out of range │    │
│  │ C6  Synthesis   (no source claimed)    — nothing to verify  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  [ Copy verification prompt ]   [ Open verification AI ]            │
│                                                                     │
│  ── or verify at the source yourself, which is stronger ──          │
│  [ Open EGW Library → The Desire of Ages ]  [ Open KJV → John 3 ]   │
│                                                                     │
│  ← Back to the original conversation                                │
└─────────────────────────────────────────────────────────────────────┘
```

Notice what has already happened before any AI is involved: **C3 and C5 are caught for free.**
The deterministic validators have found a probably-fabricated book title and an impossible
verse before the user has spent a single token. In practice this is where most of the value
is delivered, and the UI should show it that way.

---

## 6. Claim extraction

```
Pasted answer
   │
   ├─ parseClaimBlock() looks for the fenced SDAWS-CLAIMS-V1 block
   │     ├─ ok    → claims with types, asserted sources, confidences
   │     └─ fail  → BLOCK_ABSENT | BLOCK_MALFORMED | BLOCK_EMPTY
   │                     │
   │                     └─ manual segmentation UI, with sentence-boundary
   │                        suggestions the user accepts, edits, or splits;
   │                        every claim marked extraction: 'manual'
   ▼
Claims persisted, each with type, asserted source, status NOT_VERIFIED, evidence E1 (or E0)
```

**No partial parse.** A malformed block yields total failure and the manual path, because a
ledger that silently contains four of seven claims tells the user everything was examined
when it was not. Silent incompleteness in a verification tool is a lie with extra steps.

---

## 7. The verification prompt

Generated by the composer from the `verify.*` templates. It must instruct the verifier to:

1. Analyse the original answer, which is supplied as delimited data, not as instruction.
2. Identify every factual claim, distinguishing Scripture, Ellen G. White, historical,
   doctrinal, and synthesis claims.
3. For each claim, state **whether it can actually check it**, and how.
4. **Explicitly state when it cannot access a source.** The required phrasing is given:
   *"I could not independently verify this against the official EGW Library because the
   relevant source text was not available to me."*
5. **Never claim to have consulted a source it did not consult** (§16 — this is restated in
   the verification prompt because it is the specific failure this step exists to catch).
6. Identify fabricated-looking citations, internal contradictions, and unsupported statements.
7. Distinguish source content from its own interpretation.
8. Report uncertainty rather than resolving it with plausibility.
9. Emit a verification block in `SDAWS-VERIFY-V1` format for deterministic parsing.

The verifier's output is parsed and merged into the ledger — and the merge is where the
architecture's discipline is enforced:

```
Verifier says "VERIFIED"
   │
   ├─ Did the member supply source text for this claim in this session?
   │     ├─ YES → E3, status may become TEXT_CONSISTENT
   │     │        ledger note: "Consistent with text you supplied. We never saw that
   │     │        text and cannot confirm where it came from."
   │     │        NOT VERIFIED. NOT green.
   │     └─ NO  → E2, status stays NOT_VERIFIED,
   │              ledger note: "A second AI agreed, but no source text was present."
   │
Verifier says "CONTRADICTED"
   └─ status may become CONTRADICTED at E2 — disagreement is informative

No branch of this diagram reaches VERIFIED. Nothing an AI says, and nothing the member
pastes, can produce it. Only §8 can.
```

**The verifier's confidence does not raise the evidence level. Only artefacts do.** This is
enforced in the `evidence` package, in the domain service, and by the database CHECK
constraint on `claim` ([Database Design §8](../20-data/21-database-design.md)) — three
independent layers, because this is the rule most likely to be eroded by a future
well-meaning refactor.

---

## 8. Reaching E4 — user attestation

```
┌─ Confirm this claim at the source ──────────────────────────────┐
│                                                                 │
│  C2 · "Ellen G. White writes that trust in God brings peace     │
│        in trial." — The Desire of Ages, p. 331                  │
│                                                                 │
│  1. [ Open the official EGW Library → The Desire of Ages ]      │
│  2. Find the passage yourself.                                  │
│  3. Then tell us what you found:                                │
│                                                                 │
│     ○ I found it, and the citation is correct                   │
│     ○ I found it, but the citation details are wrong  [correct] │
│     ○ I could not find it                                       │
│     ○ I found something that contradicts this                   │
│                                                                 │
│     Source URL you used: [ https://…                          ] │
│                                                                 │
│  Your confirmation is recorded with today's date. It applies    │
│  only to what you personally checked.                           │
│                                       [ Record confirmation ]   │
└─────────────────────────────────────────────────────────────────┘
```

The attestation records actor, timestamp, URL, and outcome — and it is **bound**, not merely
recorded. The attested URL must resolve to a pinned revision of an allowlisted Source Directory
entry that was attestation-eligible and active, its host must match, and the URL must sit
*beneath* that entry's canonical path prefix. The official site's own homepage does not qualify;
neither does its search page, nor a sibling path. An attestation that fails any part of this is
**rejected with an explanation** — never quietly downgraded to E2, which would teach the member
that the button sometimes does nothing.

**And it must be the claim's own owner who attests.** `actor_id = user_id`, enforced in the
schema. Checking only that *an* actor exists would leave room for an authorisation slip or an
administrative path to write an attestation that then renders to a member as *"confirmed by
you"* — the product telling someone they personally verified something they never saw. If a
second person should ever be able to confirm a claim, that is a different provenance with a
different label — *"confirmed by <name>"*, never *"by you"* — and it needs its own ADR.

"I could not find it" is a **first-class, valuable outcome** that moves the claim toward `INSUFFICIENT_EVIDENCE` and is
displayed as usefully as a positive confirmation — because in this product, discovering that
a quotation does not exist is the most valuable thing that can happen.

---

## 9. Status semantics (§15 requires care here)

| Status | Means exactly | Does **not** mean |
|---|---|---|
| `VERIFIED` | **You** opened the identified source and found the claim there | Universally true, doctrinally correct, endorsed — **or that we checked it, or that anyone other than you did** |
| `PARTIALLY_VERIFIED` | You found some elements (the idea is present) but not others (the page number is unconfirmed) | Mostly true |
| `TEXT_CONSISTENT` | The claim matches text you supplied in this session | That the text was genuine, complete, or from the official source |
| `NOT_VERIFIED` | No adequate evidence was found either way | False |
| `CONTRADICTED` | The identified source says something incompatible | Definitively refuted everywhere |
| `INSUFFICIENT_EVIDENCE` | The claim is not the kind of thing the available sources can settle | The claim is meaningless |

The UI renders every status with its scope attached — *"Verified against The Desire of Ages,
p. 331 (confirmed by you on 9 Sep 2026)"* — never as a bare badge. A bare badge invites the
reading in the right-hand column, which is exactly the misunderstanding this product exists
to prevent.

### Permitted transitions

Four documents state this rule — this table, `permittedStatuses` in the evidence package, and
two database CHECK constraints. They must agree, and this table is the one to read first.

| From | To | Permitted when | Written by |
|---|---|---|---|
| any | `NOT_VERIFIED` | always — it is the resting state | any |
| any | `INSUFFICIENT_EVIDENCE` | always | member, or verifier merge |
| `NOT_VERIFIED` | `CONTRADICTED` | level ≥ E2 | verifier merge, supplied-text comparison, validator |
| `NOT_VERIFIED` | `TEXT_CONSISTENT` | level **= E3**, with a `source_block_ref` | supplied-text comparison |
| `TEXT_CONSISTENT` | `CONTRADICTED` | the member supplies text that disagrees | supplied-text comparison |
| `NOT_VERIFIED` · `TEXT_CONSISTENT` · `CONTRADICTED` | `VERIFIED` · `PARTIALLY_VERIFIED` | level **= E4**, bound attestation, `actor_id = user_id` | §8 attestation only |
| `VERIFIED` | `CONTRADICTED` · `NOT_VERIFIED` | a later attestation by the same owner overturns an earlier one | §8 attestation only |

**Forbidden, and why:**

| Never | Because |
|---|---|
| anything → `VERIFIED` below E4 | The product's central promise. Enforced by `verified_requires_member_confirmation`. |
| `TEXT_CONSISTENT` at E4 | Promotion means a person went and looked; the claim must resolve to what they found, not sit in a consistency state. Enforced by `text_consistent_is_e3_only`. |
| E2 agreement → any positive status | Correlated error is not evidence. |
| any automated raise above E2 | Levels rise on artefacts, never on assertion. |
| an attestation by anyone but the claim's owner | "Confirmed by you" would be false. Enforced by `actor_id = user_id`. |

---

## 10. Generator → Verifier → Source, and why direction matters (§62)

**Arrangement 1: Generator AI → Verifier AI → (EGW Library)**

The verifier cannot reach the library. It has no browsing, or browsing that returns a search
page rather than the passage. Its "verification" is memory checking memory. Ceiling: **E2**.

**Arrangement 2: Source → Generator AI → Verifier AI**

Source text is present from the start. The generator reasons from it; the verifier compares
claims against the same present text. Both operate on an artefact rather than on recall.
Ceiling: **E3** — consistency with an artefact of unknown provenance, which is genuinely better
than recall and is still not verification.

**Arrangement 2 is strictly safer**, and this is why the product invests in making Workflow A
(source-first) easy, and why P4 forces it for anything headed to a pulpit.

The fundamental limitation, stated for the documentation record:

> **A verifier AI cannot verify against material it cannot access.** Model-to-model agreement
> and source verification are different things, and this product must never present the first
> as the second.

The only path to genuine source verification is that **the member checks it themselves** at the
official source. Supplying text raises the quality of the reasoning and catches fabricated
wording, but it cannot establish where that text came from. Neither can be automated away
without a licensed content agreement — which is the conditional track in the
[roadmap](../00-overview/05-post-mvp-roadmap.md#conditional-track--official-source-integration).

---

## 11. UI rules (non-negotiable)

1. A status badge is **never** rendered without its evidence level chip.
2. **Green is reserved for E4 alone.** E3 has its own distinct, non-green treatment; E1 and E2
   use neutral colours. Never green, never a checkmark glyph, below E4.
3. The word "verified" never appears for a claim below **E4**, in any language. Enforced by a
   lint rule over message catalogues plus the `mayAssertOfficialVerification` guard, which
   tests `level === 'E4'`.
3a. `VERIFIED` and `PARTIALLY_VERIFIED` never render without **the confirming person and the
   date** adjacent — *"confirmed by you, 9 Sep 2026"*. A bare `VERIFIED` is a defect. This copy
   is safe to state absolutely only because `actor_id = user_id` is enforced in the schema
   (Database Design §8); UI rule and constraint are one decision and neither is loosened alone.
3b. **Exports carry the attribution too.** A P4 outline is read by people who did not do the
   confirming, and it is the one place an overstated E4 leaves the member's own screen. Every
   exported citation carries the confirming person and date, or it carries no status at all.
3c. E3 renders as *"consistent with text you supplied in this session"*, with the note that we
   never saw that text and cannot re-check it. Never a verification verb, in any locale.
4. `NOT_VERIFIED` is never visually minimised, greyed out, or collapsed by default.
5. Every EGW claim shows a **Source Check** link to the official library.
6. Deterministic validator findings appear **before** any AI-based result, because they are
   the only certain ones.
7. The three-column honesty contract (§3) is one click away from any claim.

---

## 12. What this architecture does not solve

Stated plainly:

- **We cannot verify EGW text we do not hold.** Only the member's own trip to the official
  library produces E4. This is by design and is the price of the copyright posture.
- **E4 is a member's word, not our check.** An allowlisted host and a conforming path prove
  where they say they looked, not that they looked, or that they read correctly. Nothing in the
  schema can close that gap, which is why the rendering carries it: the word *you* is always
  present, and the product never claims to have done the confirming itself.
- **E3 evidence does not survive the session.** The supplied text is gone and the determination
  cannot be reproduced or audited. Re-checking requires re-pasting.
- **Scripture misquotation is undetectable.** No verse text is bundled ([ADR-0021](../90-decisions/adr/0021-no-bundled-verse-text.md)),
  so a real verse with altered wording passes every check we run.
- **A user may ignore the evidence levels entirely.** The Citation Checklist in P4 is the
  main countermeasure, and it only covers the pulpit case.
- **A model may fabricate the claims block itself**, listing claims it did not make or
  omitting ones it did. Manual review remains available and the extraction method is displayed.
- **Doctrinal soundness is out of scope.** A correctly cited passage can still be badly
  applied. The product verifies citations, not theology, and says so.

# Revision 1.1 — Change Log

**Supporting document** · 2026-09-10

Version 1.0 of this package was reviewed adversarially over six rounds. This document maps
every finding to the decision taken and the files that carry it, so the next review can be
*checked* rather than re-derived — which was itself one of the findings.

Two findings were answered by **argument rather than change**, and both are recorded here so
that the reasoning survives: the KJV letters-patent terminology, and E4's irreducible status as
a member's self-attestation.

---

## 1. The five reversals

| # | v1.0 said | v1.1 says | Record |
|---|---|---|---|
| 1 | E3 (supplied-text comparison) may be shown `VERIFIED`, in green | E3 is `TEXT_CONSISTENT`. **Only E4** may be verified or green | [ADR-0019](adr/0019-evidence-ladder-revision.md) |
| 2 | `source_block.body_enc` holds pasted text, encrypted, for 90 days, optionally in a `user_library` | Source text **never reaches the server**. `source_block_ref` holds metadata only | [ADR-0022](adr/0022-no-server-side-source-text.md) |
| 3 | A bundled KJV module enables verbatim verse checking, conditional on counsel | **No verse text ships**, in any translation. `Q-02` closes | [ADR-0021](adr/0021-no-bundled-verse-text.md) |
| 4 | BYOK Direct Connect is a Phase 2 commitment; round-trip below 50% ships it automatically | BYOK is `Conditional` on published provider sanction. **The automatic trigger is deleted** | [ADR-0020](adr/0020-byok-conditional-on-official-support.md) |
| 5 | *"The app holds a catalogue but zero EGW text"* | *"We do not collect, ingest, host, index, or hold EGW text as a source"* — the narrower claim, which is true | SR-D1a, README §67 |

---

## 2. Finding → disposition → files

### Round 1 — the package contradicted its own SRS

| Finding | Disposition | Files |
|---|---|---|
| E3/E4 policy contradictory across the package | Adopted in full | `43-…` §2/§3/§4/§7/§9/§11/§12 · `15-…` §9 · `13-…` §2.5 · `12-…` · `02-prd` · `51-ux` · `06-glossary` · `21-db` §8 · `71`/`72`/`73`/`83` · `04`/`05` · `44`/`45` · `63`/`65`/`67` · `92`/`93` · ADR 0001/0015 · README |
| ADR-0022 link broken | Adopted, **wider** — ADR-0021 was broken too | Four new ADRs 0019–0022; supersession notices on 0006/0010/0012; `adr/README.md` |
| "HMAC fingerprint" not technically coherent | Adopted | SR-D2 · `21-db` §6 |
| DB models server-side EGW text | Adopted in full | `21-db` §1/§2/§6/§11/§12 · `22-retention` · `44-…` §5 · `65-…` §4 |
| P4 pre-pulpit block should require E4 | Adopted, **wider** — Scripture too, since no verse text is bundled | PR-P4-09 · `43-…` §4 · `44-…` §6 · `93-…` |
| BYOK unresolved | Adopted | ADR-0020 · `41-…` §4 · PR-AI-09 · `05-roadmap` · `72`/`92`/`67` |
| Source-first UX durability changes | Adopted — disclosed **at the paste target** | `51-ux` §6.2 · `43-…` §4 |
| KJV "Crown patent" is an error | **Partially declined** — see §3 | `65-…` §5 · `66-…` · `Q-02` |

### Round 2 — the narrowing needed owner approval

| Finding | Disposition | Files |
|---|---|---|
| SR-D1a narrows the storage policy | Adopted **with a recorded owner decision** | ADR-0022 decision record · SR-D1a · README §67 |
| E4 is self-attestation, not system verification | Adopted — and extended to **exports** | `43-…` §8/§9/§11/§12 · AC-V12 · PR-P4-07 |
| E4 lacks a Source Directory binding | Adopted | `21-db` §8/§9 · SR-6.6 |
| `TEXT_CONSISTENT` reachable at E4 | Adopted — `evidence_level = 'E3'` | `text_consistent_is_e3_only` |
| "we never received it" hides provider transmission | Adopted as a **package-wide wording rule** | SR-D1 · `43-…` §3 · `51-ux` · `15-…` §10 |
| Grep cannot verify transitions | Adopted — new **transition table** | `43-…` §9 |

### Rounds 3–6 — defects in the fixes themselves

Each of these was a hole in something the previous round had just approved. They are listed
separately because the pattern matters more than the individual bugs: **every one was in a
constraint that read correctly.**

| Round | Finding | Fix |
|---|---|---|
| 3 | Host binding alone admits the official homepage | `attestation_path_prefix` + `attestation_eligible` |
| 3 | `status='active'` in the service layer only; record must outlive entry changes | Immutable `source_directory_entry_revision`; evidence pins a revision |
| 3 | Owner approval needs role and an identifier | Structured decision record `SDAWS-DEC-2026-09-09-01` |
| 4 | Revision table stored *prior* state — the current revision could be absent from the table the FK targets | All mutable state **moves into** the revision table; entry keeps identity + `current_revision` |
| 4 | `CHECK (pattern ~ '^\^https://')` still admits `^https://host/.*` | Regex replaced by a structured prefix; containment becomes a same-row CHECK; **the trigger disappears** |
| 5 | **NULLing the bound copies evades everything** — `MATCH SIMPLE` skips partial NULLs, and a CHECK evaluating to NULL passes | One CHECK restating every `IS NOT NULL`, `IS TRUE` not `= true`, FK becomes `MATCH FULL` |
| 5 | Prefix containment defeated by `/read/../x`, `%2e`, `\`, `//` | **SR-7.6** — canonicalise before storage, **reject rather than repair**; four path predicates as backstop |
| 5 | `/read` admits `/reading/…` | Prefix must be a canonical directory prefix ending `/` |
| 5 | Circular FK cannot be created as written | Create both bare, then two `ALTER TABLE … ADD CONSTRAINT` |
| 6 | E4 checked only that *an* actor exists — another user's attestation could render as "confirmed by you" | `actor_id = user_id`, **plus** ownership FKs down claim → evidence → source |
| 6 | `(?:…)` is an avoidable dependency | Plain capture groups; `substring` returns the first |

---

## 3. Two findings answered by argument

### KJV: "Crown patent" was not the error it appeared to be

Round 1 called this a mistake and asked for "Crown copyright". **That correction was declined,
and the reviewer withdrew it in round 2.**

In the UK the Authorised Version is held under the **royal prerogative, exercised through
perpetual letters patent** — the King's Printer (Cambridge University Press), with Oxford
University Press and, in Scotland, the Scottish Bible Board. This is a **distinct regime** from
Crown copyright under CDPA s.163. Substituting one term for the other would have made the
document less accurate, not more, and would have sent counsel after a question that does not
exist.

What *was* wrong was the loose section heading, now "KJV and the Crown's perpetual right", and
the absence of the distinction itself, now stated explicitly with the GOV.UK guidance cited.

The reviewer's **operative** recommendation — ship reference validation only, bundle no verse
text — was adopted in full as [ADR-0021](adr/0021-no-bundled-verse-text.md).

### E4 remains a member's word, and no schema can fix that

An allowlisted host and a conforming path prove **where a member says they looked**. They
cannot prove that they looked, or that they read correctly. The binding constrains the claim's
shape, not its truth.

This is not solvable in the database, so it is solved in the rendering: the word *you* is
always present, `VERIFIED` never appears without the confirming person and date, and the rule
extends to exports because an outline is read by people who did not do the confirming. The
schema's contribution is `actor_id = user_id`, which is what makes the word *you* true.

Stated plainly in `43-…` §12 rather than left for a reader to discover.

---

## 4. What got worse, deliberately

A revision that only improves things is usually hiding something. Three costs:

1. **Far fewer green badges.** On the Critical Review's own estimate — 70% E1, 15% E2, 10% E3,
   5% E4 — the product now calls roughly **5%** of claims verified, down from 15%. The E3 and
   E4 metrics are reported separately so this stays visible.
2. **`R-02` lost its mitigation.** Round-trip friction is the second-largest risk in the
   register, and BYOK was its answer. It is now mitigated by clipboard and launch UX alone. The
   register says so rather than substituting something weaker in the same column.
3. **E3 evidence no longer survives the session.** Nothing can be re-audited after the fact,
   because the text is gone. Re-checking means re-pasting, and the UI says so at the paste
   target rather than in a help panel.

---

## 5. Still open

| Item | Where | Needed from |
|---|---|---|
| Stage 0 approver identity — the decision record carries `[VERIFY]` | [ADR-0022](adr/0022-no-server-side-source-text.md) | Owner |
| `Q-06` — per-host terms review before the reachability probe may be enabled | [91-open-questions](91-open-questions.md) | Owner + counsel |
| `Q-14` — published provider sanction for browser-origin calls with an end-user key | [91-open-questions](91-open-questions.md) | Owner + engineering |
| Migration validation of the two `substring` patterns against the target PostgreSQL | [Database §8](../20-data/21-database-design.md) | Engineering, at first migration |

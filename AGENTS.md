# AGENTS.md — the contract for any agent working in this repository

**This is the canonical instruction file.** Claude Code, Gemini CLI, Codex, Cursor and any
other agent read this one. `CLAUDE.md` is a thin pointer here plus tool-specific notes; if you
find guidance that contradicts this file, this file wins and the other is a defect.

> **Gemini CLI:** point it here rather than keeping a second copy —
> `~/.gemini/settings.json` → `{"contextFileName": "AGENTS.md"}`. A `GEMINI.md` duplicating
> this content would drift from it within a week, and drift is the exact failure mode this
> package keeps hitting.

---

## What this repository is

**Design and planning documents only.** No application source, no dependency manifest, no build
tooling, no prototype. 50 markdown files describing a product called SDA AI Workspace: a
citation-integrity workbench for Seventh-day Adventist members and pastors, built so that the
operator never pays for AI inference and never hosts Ellen G. White writings.

Illustrative SQL DDL, TypeScript signatures, and prompt text appear inside these documents
because they **are** the specification. Do not mistake them for a codebase, and do not "fix"
them to compile.

Start at [`README.md`](README.md), then [`STATE.md`](STATE.md) for where the work actually is.

---

## The normative order

**Where any document conflicts with [`docs/00-overview/03-srs.md`](docs/00-overview/03-srs.md),
the SRS governs and the other document is the defect.** Fix the other document. If you believe
the SRS itself is wrong, say so and stop — do not resolve it by editing the SRS to match
something else.

Decisions live in ADRs. **An accepted ADR is superseded, never edited.** To reverse one, write
a new record that supersedes it and add a notice at the head of the original saying what
changed and what still stands. Records `0006`, `0010` and `0012` are superseded and preserve
the old rule verbatim on purpose; do not "correct" their bodies.

---

## The six invariants

Breaking one of these is not a bug to be weighed against other concerns. It is the thing this
architecture exists to prevent.

| # | Invariant | Record | Enforced by |
|---|---|---|---|
| 1 | **No EGW corpus.** We do not collect, ingest, host, index, or hold Ellen G. White text as a source. The catalogue is bibliographic metadata only | [0002](docs/90-decisions/adr/0002-no-egw-corpus.md), [0022](docs/90-decisions/adr/0022-no-server-side-source-text.md) | Schema review · AC-E1 · SR-D3 tripwire |
| 2 | **No server-side LLM.** The server never calls a model. Inference happens in the member's own AI session or their browser | [0004](docs/90-decisions/adr/0004-no-app-owned-llm-inference.md) | SR-10.1–10.5 · dependency denylist · egress allowlist |
| 3 | **Only E4 may be shown as verified, or in green.** E3 is `TEXT_CONSISTENT` — consistency with text of unestablished provenance | [0019](docs/90-decisions/adr/0019-evidence-ladder-revision.md) | SR-6.4a/6.5 · two DB CHECKs · `mayAssertOfficialVerification` returns `level === 'E4'` |
| 4 | **Member-supplied source text never reaches our server.** The supply channel is browser-only | [0022](docs/90-decisions/adr/0022-no-server-side-source-text.md) | SR-D1 · `source_block_ref` has no body column · AC-E5 |
| 5 | **No Bible verse text is bundled**, in any translation | [0021](docs/90-decisions/adr/0021-no-bundled-verse-text.md) | SR-5.8 · verbatim comparison always returns `UNAVAILABLE` |
| 6 | **An accepted ADR is superseded, never edited** | [adr/README.md](docs/90-decisions/adr/README.md) | Review |

---

## Three wording rules

These exist because each was violated in v1.0 in a way that read perfectly well.

1. **Name the actor: *our server*.** Source text *is* transmitted — by the member's browser, to
   the AI provider they chose. That is the workflow. Write *"our server never receives or
   stores it"*, never *"it never leaves your machine"*.
2. **The client commitment is not evidence.** `client_commitment` is a marker the member's
   browser made over a salt we never see. Our server cannot recompute it. The words *evidence*,
   *proof*, *fingerprint*, *attests* and *integrity guarantee* are forbidden around it.
3. **Claim only the narrower, true thing about storage.** *"We do not collect, ingest, host,
   index, or hold EGW text as a source."* Never *"we never store EGW text"* — message bodies
   may contain purported quotations (SR-D1a). The false version is shorter and prouder and will
   tempt you; it was in `README.md` before Revision 1.1.

---

## What needs the owner, not your judgement

Anything that **narrows or reverses a stated promise to members**, changes what is stored,
changes what the product claims about verification, or commits to a vendor.

The worked example is in [ADR-0022](docs/90-decisions/adr/0022-no-server-side-source-text.md):
scoping SR-D1 to the supply channel was a real narrowing of "no EGW storage", so it carries a
structured decision record — decision ID, date, deciding role, the question as put, the options
offered, the one taken. Reproduce that shape. If you cannot honestly say the owner chose it,
mark the field `[VERIFY]` rather than filling it in; that is the package's convention
(`README.md`, final section) and an invented approver is worse than a blank one.

---

## Verify before reporting done

```bash
./scripts/check-docs.sh        # eight invariant checks + link resolution; exit 1 on failure
```

This is the only part of the contract that does not depend on a model having read and believed
a document. Run it. **If it fails, the work is not done** — do not report otherwise.

**And know what it cannot reach.** Greps do not catch a state-transition table that disagrees
with a CHECK constraint, an E4 binding that admits a URL it shouldn't, or a paragraph that
argues the opposite of the table above it. For anything touching the evidence ladder or the
attestation binding, read it adversarially:

> The question is not *does this express the rule*. It is **what value makes this predicate
> neither true nor false** — and *what does this admit that it should not*.

Six review rounds; rounds 4, 5 and 6 each found a hole in a constraint the previous round had
approved. Every one read correctly: a prefix missing a trailing slash, a CHECK returning NULL
instead of FALSE, an actor who existed but was the wrong person.

---

## Working conventions

- **Match the register.** These documents argue rather than assert, state costs plainly, and
  say what a design does *not* solve. A section that only lists benefits is off-key here.
- **State what got worse.** Revision 1.1 has a "what got worse, deliberately" section in the
  change log. Keep that habit: a change that only improves things is usually hiding something.
- **Cross-references are load-bearing.** Adding a requirement means updating the traceability
  matrix and the acceptance criteria. `check-docs.sh` verifies links resolve, not that you
  remembered.
- **Keep `[VERIFY]`.** It marks a factual claim not established at design time. Do not resolve
  one by guessing; each has an owner in
  [`91-open-questions.md`](docs/90-decisions/91-open-questions.md).
- **No commits unless asked.** Git is initialised with no commit history; the first commit is
  the owner's to choose.

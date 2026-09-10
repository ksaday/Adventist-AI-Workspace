# ADR-0017 · Paraphrase-first answer shape

**Status:** Accepted · 2026-09-09

## Context

When an answer draws on Ellen G. White's writings, it can present long verbatim quotations, or
paraphrase with attribution and a link to the source. Long quotations feel authoritative and
save the reader effort. They also maximise reproduction of copyrighted material and maximise
the damage when the quotation is fabricated.

## Decision

**The default answer shape is: paraphrase or synthesis + clear attribution + link to the
official source + evidence level.** Verbatim quotation is a deliberate, bounded, marked
exception.

Every template requests paraphrase over quotation and asks that any necessary quotation be
kept brief. P4's `EGW emphasis` parameter defaults to **"leads, not text"** — identify *where
to look*, do not reproduce what is there.

## Consequences

**Positive**
- **Minimises reproduction of copyrighted material**, which is the copyright posture's
  practical expression at the level of everyday use.
- Reduces the blast radius of a fabricated quotation: a paraphrase attributed to a work is a
  weaker and more visibly hedged claim than invented words in quotation marks.
- **Pushes the reader to the source**, which is better study practice. A pastor who reads the
  chapter prepares a better sermon than one who pastes a quotation.
- Fits the evidence ladder: a paraphrase at E1 is honest, whereas a verbatim quotation at E1 is
  dangerous, and the UI can treat them differently.

**Negative**
- Members who want the exact words must do more work.
- Paraphrases can misrepresent nuance — a real cost when the source is theologically precise.
- Some members will prefer a competitor that simply shows them the quotation.

**On the alignment worth noticing:** the copyright-minimising design and the pedagogically
better design turn out to be the same design. Where two independent pressures agree on a
choice, the choice is usually right.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Quotation-first | Maximises reproduction and maximises fabrication damage |
| Quotation only when verified | Attractive, but verification comes *after* generation in the default workflow, so the model would have to know the future |
| No quotation at all | Too restrictive; a pastor quoting from a pulpit genuinely needs exact words, and the Citation Checklist is the right control for that case |
| Let the user choose per answer | Offered as the `EGW emphasis` parameter in P4, with a safe default. Not offered in P2/P3, where the safe default should simply hold |

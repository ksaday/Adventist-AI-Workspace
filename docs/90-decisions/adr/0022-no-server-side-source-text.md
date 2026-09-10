# ADR-0022 · The source-supply channel is browser-only

**Status:** Accepted · 2026-09-09

## Owner decision record

This ADR narrows a policy the package previously stated more broadly. That narrowing was put
to the owner and approved; the record is reproduced here so it is auditable at its source
rather than inferred from its consequences.

```
Decision ID    SDAWS-DEC-2026-09-09-01
Date           2026-09-09
Decided by     Product owner  [VERIFY] — name/handle to be filled by the owner
Question put   SR-D1 says no EGW text reaches the server. A pasted AI answer stored in
               message.body_enc can contain a purported EGW quotation. How should the
               rule be scoped so it is actually true?
Options put    (a) scope to the source-supply channel  (b) absolute, with client-side
               redaction of flagged quotations  (c) absolute, Ephemeral-only for threads
               containing EGW citations
Decision       (a)
Carried by     ADR-0022, SR-D1, SR-D1a, README §67
```

## Context

[ADR-0002](0002-no-egw-corpus.md) established that the application holds a *catalogue* and no
corpus. `SR-D1` went further and said the database must never contain text from any Ellen G.
White work, *"there is no exception."*

The schema did not honour that. `source_block.body_enc` held member-pasted passages, encrypted,
for ninety days, with a `user_library` retention option that would have made them permanent.
Whatever the intent, a table whose purpose is to hold source text from a work is the beginning
of a corpus, and the ninety-day timer and the accretion tripwire were mitigations against a
risk the design need not have taken at all.

There was also a second, quieter problem: the absolute claim was **false in a way no schema
change could fix**. A member pastes an AI answer back into a conversation, that answer contains
a purported quotation, and the body is stored encrypted in `message.body_enc`. Removing
`source_block.body_enc` does not touch that path, and the only ways to close it were to redact
answers before storing them or to forbid conversation history entirely.

## Decision

**The source-supply channel becomes browser-only.** Member-supplied source text is never
transmitted to our server. It lives in the member's browser for the working session and is
gone when the session ends.

What our server records about a supplied block is metadata: `kind`, `char_count`,
`attributed_work_id`, `session_id`, and a `client_commitment` — SHA-256 over a random per-block
salt concatenated with the normalised text, computed in the browser, with the salt retained
only in the browser.

**The commitment is not evidence.** Our server cannot recompute it and therefore cannot verify
it. It exists so the member's own browser can later confirm it is looking at the same text. It
is a marker made by the member's client, and the words *evidence*, *proof*, *fingerprint*, and
*integrity guarantee* are forbidden in every sentence describing it, in every locale.

**And the scope is stated honestly.** Message bodies — the member's own words, and answers they
paste back from their AI — may contain purported quotations. They are model output or member
authorship, not text this system drew from a source. They remain encrypted, capped, counted by
the `SR-D3` accretion tripwire, and destroyed by crypto-erase on deletion.

So the package claims only the narrower, true thing:

> **We do not collect, ingest, host, index, or hold Ellen G. White text as a source.**

It does **not** claim "we never store EGW text." That sentence is shorter and prouder and
false, and it appeared in `README.md` before this revision. A future editor will be tempted by
it again; this paragraph exists to mark the trap.

## Consequences

**Positive**
- The strongest available copyright posture for the supply path: text we never receive cannot
  be stored, breached, subpoenaed, or accreted by us.
- The service-provider posture for source text — safe harbour, notice-and-takedown, repeat
  infringer handling — largely dissolves. It does **not** dissolve for message bodies.
- No retention timer, no purge job, no key management for source text. Nothing to expire.
- `user_library` is excluded architecturally rather than deferred behind a design gate.

**Negative**
- **E3 becomes session-scoped and unauditable.** A determination cannot be reproduced after the
  session, and re-checking requires re-pasting. See [ADR-0019](0019-evidence-ladder-revision.md).
- The member's browser still transmits the text to the AI provider they choose. That is the
  workflow, not a leak, and it is disclosed under `PR-AI-08` — but "our server never receives
  it" must never be shortened to "it never leaves your machine."
- The accretion tripwire now runs on metadata alone. It still functions, because `char_count`
  and `attributed_work_id` are what it aggregates.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Keep encrypted server-side storage with caps and expiry | Takes a copyright and breach risk the product does not need, in exchange for durability nothing in the design requires. |
| Absolute rule via client-side redaction of flagged quotations | A lossy redactor on the critical path. False negatives break the absolute rule anyway; false positives destroy the member's own content. |
| Absolute rule via Ephemeral-only EGW threads | Removes conversation history from exactly the multi-session sermon-preparation workflow the product exists for. |
| Server-side HMAC of the supplied text | Not achievable. A server that never receives the text cannot compute an HMAC over it, and a browser-computed value the server cannot recompute is a client assertion, not proof. This was the previous `SR-D2` and it did not survive review. |

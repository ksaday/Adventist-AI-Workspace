# EGW Interaction Policy

**Document 16 of 37** · v1.1
**This policy is binding on product, engineering, and operations. Changes require owner approval.**

---

## 1. The governing principle

> **The application does not own the Ellen G. White knowledge. The user accesses the
> authoritative source and uses their own AI to reason about the material.**

The official Ellen G. White Library is the authority. We are a workflow around it, never a
substitute for it, and never a competing copy of it.

---

## 2. The catalogue / corpus distinction

This distinction is the load-bearing element of the entire legal and architectural posture.
It must be understood precisely by everyone who touches the system.

| | **Catalogue** — what we hold | **Corpus** — what we never hold |
|---|---|---|
| Contents | Work titles, standard abbreviations, author, publisher, first-publication year, reference-edition page count, official URL template, `last_reviewed` date, and optionally a verified localised title | Any text from any work: sentences, paragraphs, chapters, excerpts, summaries of specific passages, or derived representations |
| Size | ~200 records, ~80 KB | — |
| Analogy | A library's card catalogue | The books on the shelves |
| Purpose | Build accurate links; catch fabricated titles; check page plausibility | — |
| Derived from | Publicly available bibliographic information, compiled by us | — |

A catalogue record has no `text`, `content`, `excerpt`, `summary`, `body`, `quote`, or
`embedding` field. **Adding any such field is a blocking schema review**, and the reviewer's
job is to say no.

**Why this line and not a more permissive one.** One could argue that a short summary of each
book, or a few representative quotations, would be more useful and still defensible. Perhaps.
But the value of a bright line is that it needs no judgement call at 11pm from a developer
adding a feature. "No text, ever" is enforceable by a schema review and a grep. "A little
text, tastefully" is not.

---

## 3. Prohibited activities (absolute)

The system must never:

1. Store a complete or substantial copy of any Ellen G. White work.
2. Ingest EGW writings from PDFs, ebooks, printed scans, or any file format.
3. Perform OCR on EGW material.
4. Scrape, crawl, spider, or bulk-fetch the official library or any mirror of it.
5. Mirror, cache, or proxy EGW content, including transiently on the server.
6. Compute or store embeddings of EGW text.
7. Operate a vector database, RAG index, or semantic search over EGW material.
8. Operate an MCP server or any API exposing EGW content.
9. Present itself as an authoritative source of EGW writings.
10. Provide bulk download, bulk export, or automated extraction of EGW text.
11. Reproduce full books, chapters, or long continuous passages.
12. Fabricate any EGW quotation, title, page, paragraph, or publication detail.

Items 1–8 are prevented by architecture ([MVP Scope §6](../00-overview/04-mvp-scope.md#6-negative-scope-and-how-each-exclusion-is-enforced)).
Items 9–11 are prevented by product design. Item 12 cannot be prevented in an external model
and is instead mitigated, labelled, and made visible — which is the whole
[verification architecture](43-source-verification-architecture.md).

---

## 4. Permitted user workflows

The application makes these convenient. It does not perform them on the user's behalf.

| # | Workflow | What we provide | What the user does |
|---|---|---|---|
| 1 | Open the official library | A link built from the Source Directory | Clicks, reads |
| 2 | Search the official library | A link with the query pre-filled where a template exists | Searches, reads |
| 3 | Copy a relevant passage | Nothing — this happens on the official site | Selects and copies |
| 4 | Bring the passage into their AI | A paste target and delimited insertion into the prompt | Pastes |
| 5 | Ask the AI to reason only from supplied material | The source-bounded template | Runs the prompt |
| 6 | Return to verify | The verification workflow and attestation flow | Confirms at the source |

**Our server never fetches, parses, or stores anything from the official library.** An optional
reachability probe exists — one `HEAD` request per Source Directory entry per 24 hours, storing
a status code — but it is **disabled by default** (`probe_enabled = false`, SR-7.4) and stays
disabled until the terms review in [Q-06](../90-decisions/91-open-questions.md) is complete for
each target host. Until then, link health is reported by members. Even when enabled it is a
courtesy check on our own links, not a content operation.

---

## 5. User-supplied source text

When a member pastes a passage, **it stays in their browser.** It is never transmitted to our
server ([ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md), SR-D1). What we
record is a `source_block_ref` — metadata only:

| Rule | Value | Enforcement |
|---|---|---|
| **Non-transmission** | The text never reaches our server | The supply channel is browser-only; no route accepts a source-text field (AC-E5) |
| **Per-block cap** | 8,000 characters | Enforced in the browser, recorded here, CHECK constraint as backstop |
| **Per-conversation cap** | 40,000 characters total | Enforced by the client before the reference is created |
| **What is stored** | kind, char count, attributed work, session id, and a client commitment our server cannot verify | `source_block_ref`; see SR-D2 |
| **Aggregate monitoring** | Weekly accretion report by attributed work | SR-D3 tripwire, admin alert |

There is no retention choice to make, because there is nothing retained. A personal source
library (`user_library`) is **not deferred — it is excluded**: it was the single most likely
mechanism by which a corpus forms accidentally, and ADR-0022 removes the storage path it would
have needed.

The trade is real and worth naming: an E3 determination cannot be reproduced or audited after
the session ends, because the text it rested on is gone. Re-checking means re-pasting, and the
UI says so at the paste target.

### The accretion tripwire, and why it is honest

Caps stop one user from pasting a book. Nothing stops a thousand users from each pasting a
different chapter of the same book over a year — nothing except noticing. The weekly report
aggregates `char_count` by `attributed_work_id` across all users and alerts an administrator
when any single work crosses a configured threshold.

It does not auto-delete. It tells a human to look, because the right response depends on what
is actually happening: a study group working through one book together is a different
situation from systematic extraction, and only a person can tell them apart.

Including this tripwire is an admission that the caps alone are not a complete answer. That
admission belongs in the design rather than in a post-incident review.

---

## 6. Content minimisation in the product's own behaviour

The default answer shape the product asks for, in every template:

```
1. A paraphrase or synthesis in the user's own language
2. Clear attribution: 화잇 선지자 / Ellen G. White, and the work if known
3. A link to the official source
4. An explicit evidence level
```

**Not** a long quotation followed by commentary.

Where a quotation is genuinely necessary — a pastor quoting from a pulpit needs the actual
words — the product:

- keeps it brief and asks the model to do the same;
- marks it unmistakably as a quotation, visually distinct from paraphrase;
- attributes it and links to the official source;
- **refuses to treat it as verified below E4**, so a pastor cannot mark a sermon ready to
  preach with a verbatim quotation they have not personally confirmed at the source (PR-P4-09).
  Pasting the passage in is not enough: consistency with supplied text does not establish where
  that text came from;
- and never fabricates or "reconstructs" wording.

P4's `EGW emphasis` parameter defaults to **"leads, not text"**: the AI is asked to identify
*where to look* — work, chapter, theme — rather than to reproduce what is there. The pastor
then goes and reads it. This is both the safest copyright posture and, for sermon preparation,
genuinely better practice.

---

## 7. Attribution format

```
Bible
  John 3:16                                    ✓ reference valid
  요한복음 3:16

Ellen G. White / 화잇 선지자
  The Desire of Ages, p. 331                   E4 · confirmed by you, 9 Sep 2026
  The Desire of Ages, p. 212                   E3 · consistent with text you supplied
  The Desire of Ages                           E1 · page information not verified
  "The Path to Christ"                         ⚠ not found in our catalogue
```

Rules:
- Never invent a page number. If unknown: **"Page information not verified."**
- Never manufacture publisher, year, or edition detail.
- Work titles keep their official English form; a verified localised title may appear alongside.
- Every EGW citation carries a **Source Check** link.
- Evidence level is always present.

---

## 8. Configuration, not hard-coding

Every EGW-related URL comes from `source_directory_entry`. The official library base URL,
search template, and per-work URL template are rows an administrator edits (§10, §42).

If the official site changes its URL structure, the fix is an admin edit, not a release. If
it becomes unreachable, the entry is marked `degraded` and the UI says so honestly rather
than sending users to a broken link.

`[VERIFY]` — the exact URL templates for the official library must be established at
implementation time by manual inspection, recorded with a `last_reviewed` date, and
re-checked quarterly. This design deliberately does not hard-code guesses about them.

---

## 9. If the Ellen G. White Estate makes contact

**If they ask us to change something:** do it, promptly, and thank them. Nothing in this
product is worth a dispute with the body that stewards these writings. The architecture is
specifically designed so that almost any request they could make — remove a link, change how
we describe a work, stop displaying page counts — is a configuration change rather than a
rewrite.

**If they offer licensed access:** that is the conditional track in the
[roadmap](../00-overview/05-post-mvp-roadmap.md#conditional-track--official-source-integration).
It would let the *system* produce E3 evidence rather than only the user, which is a
step-change in value. It requires a written agreement first, and **no engineering work on
ingestion begins before that agreement exists.**

**If they object to the product entirely:** the product functions without any EGW-specific
feature. Removing the catalogue degrades citation validation for EGW claims but leaves the
Bible validation, the evidence ladder, the workflow, and all three applications intact. That
this fallback exists is not an accident of the design; it is a reason for it.

---

## 10. Review and governance

| Item | Cadence | Owner |
|---|---|---|
| Source Directory entries reviewed | Quarterly | Administrator |
| EGW catalogue accuracy reviewed | Semi-annually | Administrator |
| Accretion report reviewed | Weekly (alert-driven) | Administrator |
| This policy reviewed | Annually, or on any change to the EGW Estate's terms | Owner |
| Any proposal to store EGW text | Blocking review | Owner + counsel |

The last row exists because the pressure to relax this policy will be real, and it will come
from good motives — a member asking why they must paste the passage themselves, a competitor
shipping a search feature, a developer noticing that caching would be faster. The answer to
all of them is that the absence of the corpus is the product's licence to exist.

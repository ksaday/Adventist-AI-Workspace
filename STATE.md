# STATE.md — where the work actually is

**Updated:** 2026-09-10 · **Package version:** 1.1

For a session starting with no history. Read [`AGENTS.md`](AGENTS.md) for the rules;
this file is the situation.

---

## Status in one line

**Design complete at v1.1, not implemented.** 50 design documents, 22 ADRs, zero lines of
application code. The next piece of work is either implementation Phase 0 or another review
round — not more document revision.

---

## What just happened

Version 1.0 was reviewed adversarially over **six rounds** and revised. Five decisions were
reversed and two exploitable gaps in the schema were closed. The full mapping of finding →
decision → files is in
[`94-revision-1-1-change-log.md`](docs/90-decisions/94-revision-1-1-change-log.md).

| Reversed | Now |
|---|---|
| E3 could be shown `VERIFIED`, in green | E3 is `TEXT_CONSISTENT`. **Only E4** verifies |
| `source_block.body_enc` stored pasted text for 90 days | Source text **never reaches the server**; metadata only |
| KJV verse text bundled, conditional on counsel | **No verse text ships.** `Q-02` closed |
| BYOK was a Phase 2 commitment with an automatic ship trigger | **Conditional** on published provider sanction; trigger deleted |
| *"the app holds zero EGW text"* | *"we do not collect, ingest, host, index, or hold EGW text as a source"* |

Two findings were answered by **argument rather than change** — the KJV letters-patent
terminology (the reviewer's correction was declined and later withdrawn) and E4's irreducible
status as a member's self-attestation. Both are recorded in the change log §3 so the reasoning
is not relitigated from scratch.

---

## Blocking, and who owns it

| # | Item | Owner | Blocks |
|---|---|---|---|
| 1 | **Approver identity** in the ADR-0022 decision record — currently `[VERIFY]` | Owner | Nothing technical, but the audit record is incomplete until filled |
| 2 | **`Q-06`** — per-host terms review before the reachability probe may be enabled | Owner + counsel | `probe_enabled` stays `false` |
| 3 | **`Q-14`** — published provider documentation sanctioning browser-origin calls with an end-user key | Owner + engineering | All BYOK work. Vendor silence is not consent |
| 4 | Migration validation of the two `substring` patterns in `evidence_record` against the target PostgreSQL | Engineering | First migration only |

Items 2 and 3 are **gates, not schedule items.** Neither has a date and neither should be
worked around.

---

## If you are implementing

Read in this order: [`README.md`](README.md) →
[`15-final-recommended-architecture.md`](docs/10-architecture/15-final-recommended-architecture.md) →
[`04-mvp-scope.md`](docs/00-overview/04-mvp-scope.md) →
[`12-system-architecture.md`](docs/10-architecture/12-system-architecture.md) →
[`21-database-design.md`](docs/20-data/21-database-design.md) →
[`43-source-verification-architecture.md`](docs/40-ai/43-source-verification-architecture.md) →
[`93-implementation-plan.md`](docs/90-decisions/93-implementation-plan.md).

The stack is decided but unscaffolded: Next.js monolith on a flat-fee container host
([ADR-0007](docs/90-decisions/adr/0007-architecture-monolith.md)), managed PostgreSQL
([ADR-0008](docs/90-decisions/adr/0008-postgresql.md)), self-hosted session auth
([ADR-0009](docs/90-decisions/adr/0009-self-hosted-auth.md)).

**Two things to get right before anything else**, because everything else assumes them:

1. **The Cost Firewall** (SR-10.1–10.5) — dependency denylist in CI, env-var guard at startup,
   egress allowlist at runtime. The claim that operator AI cost is structurally $0 rather than
   merely budgeted to $0 depends entirely on these four layers existing from the first commit.
2. **The evidence constraints** (`21-database-design.md` §8) — the two CHECKs, the `MATCH FULL`
   binding, `actor_id = user_id`. Six review rounds found holes in these; port them exactly,
   including the comments explaining why each looks redundant and is not.

---

## If you are reviewing

Run `./scripts/check-docs.sh` first — it covers the eight mechanical invariants and link
resolution, so you can spend attention on what it cannot reach:

1. `03-srs.md` §2 SR-6 against `43-…` §2/§7/§9/§11 — one policy, English and Korean.
2. The **transition table** in `43-…` §9 against `permittedStatuses` in `13-…` §2.5 and the two
   DB CHECKs. Four statements of one rule; they must agree.
3. The **E4 binding scenarios** end to end — valid · host absent · look-alike host · userinfo or
   port · path not beneath the prefix (homepage, search page, bare prefix, sibling prefix) ·
   dot-segment or `%2e` or backslash or `//` escape · ineligible revision · disabled revision ·
   **each of the six bound columns NULLed in turn** · non-owner actor · read-back after the
   entry is disabled, re-hosted and re-prefixed.
4. `README.md` §67, SR-D1/SR-D1a and ADR-0022 read together: *after reading only these, would I
   be surprised to learn a pasted answer containing an EGW quotation is stored on the server?*
   If yes, the storage claim has drifted again.

---

## Repository layout

```
AGENTS.md      the contract — canonical, all agents
CLAUDE.md      pointer + Claude Code specifics
STATE.md       this file
README.md      the package itself: product, decisions, document index
scripts/
  check-docs.sh   eight invariant checks; exit 1 on failure
docs/
  00-overview/   vision · PRD · SRS · MVP scope · roadmap · glossary
  10-architecture/ options · system · component · deployment · final
  20-data/       database design · retention
  30-identity/   auth · membership · billing
  40-ai/         provider · prompt · verification · EGW policy · templates
  50-ux/         UX spec · IA · i18n
  60-risk/       privacy · security · threat · safety · copyright · legal · risk register
  70-quality/    testing · evaluation · acceptance criteria · traceability
  80-ops/        cost · operations · monitoring · backup · DR
  90-decisions/  open questions · critical review · implementation plan · change log · adr/
```

Git is initialised with **no commits**. The first commit is the owner's to choose; a v1.0
snapshot was taken to the session scratchpad before the revision if a diff is wanted.

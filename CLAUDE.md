# CLAUDE.md

**Read [`AGENTS.md`](AGENTS.md) first — it is the canonical contract**: what this repository
is, the normative order, the six invariants, the three wording rules, and how to verify.
Everything below is Claude Code specifics only.

This file stays thin on purpose. Two documents of guidance is how drift starts, and drift is
the failure mode this package keeps hitting.

---

## Claude Code specifics

**Use plan mode for anything touching more than a couple of documents.** This package's
cross-references are dense: a single requirement change ripples into the SRS, the PRD, the
architecture documents, the acceptance criteria, and the traceability matrix. Plan the sweep
before editing, or you will finish with a package that contradicts itself — which is exactly
the state Revision 1.1 existed to repair.

**`/code-review` on constraint work.** The database CHECK constraints and the E4 binding in
[`docs/20-data/21-database-design.md`](docs/20-data/21-database-design.md) §8 are where six
rounds of review kept finding holes. They are SQL in a markdown file, so nothing compiles them
— a review pass is the only check they get.

**Scratchpad, not the repo.** Intermediate greps, extracted tables and diff output go in the
session scratchpad. The repository holds design documents; it should not accumulate working
files.

**Verify with the script, not by reading.**

```bash
./scripts/check-docs.sh
```

Reading back what you just wrote confirms your own intent, not the package's consistency. The
script checks the eight invariants across all 50 files.

---

## Where things are

| Looking for | Go to |
|---|---|
| What the product is | [`README.md`](README.md) |
| Where the work stands | [`STATE.md`](STATE.md) |
| The governing requirements | [`docs/00-overview/03-srs.md`](docs/00-overview/03-srs.md) |
| The evidence ladder, in full | [`docs/40-ai/43-source-verification-architecture.md`](docs/40-ai/43-source-verification-architecture.md) |
| Schema and constraints | [`docs/20-data/21-database-design.md`](docs/20-data/21-database-design.md) |
| Why a decision was made | [`docs/90-decisions/adr/`](docs/90-decisions/adr/) |
| What changed in v1.1 and why | [`docs/90-decisions/94-revision-1-1-change-log.md`](docs/90-decisions/94-revision-1-1-change-log.md) |

# ADR-0008 · PostgreSQL, managed, on a flat tier

**Status:** Accepted · 2026-09-09

## Context

A database is required for accounts, profiles, memberships, conversations, claims, evidence,
configuration, and audit. The domain is strongly relational and carries hard integrity
requirements — most importantly, the evidence-ladder constraint that must hold even if
application code is refactored badly.

## Decision

**PostgreSQL 16+, managed, on a flat-price tier.** Drizzle ORM. UUIDv7 identifiers. JSONB for
the genuinely variable parts (entitlement documents, template parameters, P4 outline
structure). No `pgvector`, no corpus tables.

## Consequences

**Positive**
- **CHECK constraints enforce the product's integrity rules in the database**, where a future
  refactor cannot quietly remove them. `claim.verified_requires_source_evidence` is the
  clearest example, and it is the single most important line in the schema.
- Mature, portable, universally understood by developers and coding agents.
- JSONB gives schema flexibility exactly where the domain is genuinely variable.
- Row-level partitioning and archiving handle the 100,000-member scenario without a redesign.
- Managed flat tiers include backups and PITR, which a part-time operator will not build well.

**Negative**
- Encrypted columns cannot be searched server-side; client-side search at MVP, blind index later.
- Vertical scaling first; replicas needed above ~10,000 members.
- Managed flat tiers cost more than a self-managed instance — accepted for the backups alone.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| MySQL/MariaDB | Weaker JSON, weaker CHECK-constraint history, no material advantage |
| SQLite / Turso | Attractive at small scale; concurrency and managed-backup story are weaker for a product holding irreplaceable member content |
| Cloudflare D1 | Not portable Postgres; per-row-read pricing |
| MongoDB | The domain is relational; losing referential integrity and CHECK constraints would remove the enforcement of the evidence ladder |
| Neon (serverless Postgres) | Good product; autoscaling compute billing conflicts with cost predictability. Its flat Scale tier is a viable alternative |
| Adding pgvector "for later" | Explicitly rejected — it would signal an intent this architecture forecloses (ADR-0002) |

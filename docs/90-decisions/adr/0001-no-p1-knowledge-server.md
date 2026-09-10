# ADR-0001 · No P1 EGW Knowledge Server

**Status:** Accepted · 2026-09-09

## Context

The original three-application concept implied a fourth component: a P1 knowledge server
holding the Ellen G. White writings, with search, retrieval, and an API for the other
applications. This is the conventional architecture for a "chat with a body of literature"
product, and it is what most builders in this space reach for first.

Building it would require obtaining the corpus, storing it, indexing it, embedding it,
serving it, and keeping it current — and would make the operator the custodian and de facto
authority for a stewarded body of religious writings.

## Decision

**No P1 EGW Knowledge Server will be built.** Not as a service, not as a library, not as an
internal module, not as an MCP server, not as a "temporary cache".

The official Ellen G. White Library remains the external authority. The user accesses it
directly; the application organises the workflow around it.

## Consequences

**Positive**
- Removes the entire copyright, licensing, and content-hosting risk surface.
- Removes the ingestion, OCR, indexing, and corpus-maintenance engineering burden entirely.
- Removes vector-database and embedding costs, which are usage-metered and therefore
  incompatible with the cost constraints.
- The operator never claims authority over the writings, which is both legally safer and
  more appropriate.
- The product survives a rights dispute as a feature reduction rather than an existential threat.

**Negative**
- **The system cannot verify EGW claims by itself.** Only the member can produce E4
  evidence for an EGW citation. This is a genuine capability loss and it is the central
  trade of the whole architecture.
- Semantic search over the writings is impossible.
- The user must do more work: search, read, copy, paste.
- A competitor with a licence could build a materially more capable product.

**Accepted because** the capability loss is real but bounded, while the risk avoided is
unbounded, and because the conditional track ([Roadmap](../../00-overview/05-post-mvp-roadmap.md))
keeps a licensed path open if permission is ever granted.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Full corpus with vector search | Copyright exposure; ingestion cost; usage-metered vector queries; the authority problem |
| Partial corpus (selected works) | Same problems at smaller scale, plus arbitrary selection |
| Cached search results | Still storage and reproduction, with staleness added |
| Licensed API from the Estate | **Not rejected** — deferred, conditional on written permission. No engineering begins before that exists |
| Link-out only, with no catalogue | Considered; rejected because a facts-only catalogue enables citation validation at near-zero risk (ADR-0002) |

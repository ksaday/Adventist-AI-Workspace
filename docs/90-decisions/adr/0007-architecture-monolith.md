# ADR-0007 · Next.js monolith on a flat-fee container host

**Status:** Accepted · 2026-09-09

## Context

Four architectures were evaluated in detail
([Architecture Options](../../10-architecture/11-architecture-options.md)): managed BaaS + SPA;
a full-stack monolith with managed Postgres and self-hosted auth; an edge/serverless stack;
and a self-managed VPS.

The binding constraints are predictable flat cost, a server tier capable of holding envelope
encryption keys, operability by one part-time administrator, and no lock-in that would survive
a bad pricing change.

## Decision

**A TypeScript Next.js (App Router, Node runtime) monolith**, deployed as a **long-running
container on a flat-fee host** (Render recommended; Fly.io equivalent; Hetzner + Coolify as
the documented cost-floor path), with **managed PostgreSQL** and **Cloudflare** in front.

Client-side engines — prompt composer, citation validators, safety screener — run in the
browser against bundled reference data and never import server modules.

## Consequences

**Positive**
- Fits the encryption design: a server tier holds the master key; the browser never sees
  another user's key material.
- Auth cost is $0 marginal at every scale (ADR-0009).
- One deployable, one log stream, one place to enforce the Cost Firewall.
- Portable by construction — the same container runs on four hosts and on a laptop.
- Client-side engines mean the core value survives a server outage.

**Negative**
- More to build than a BaaS: auth flows, sessions, rate limiting are ours to get right.
- We own the security posture of authentication.
- Vertical scaling first; horizontal scaling needs a shared session store at ~10k concurrent.
- Single instance at MVP means brief deploy downtime and a 99.5% rather than 99.95% target.

## Why serverless was rejected

Every serverless platform prices by request, invocation, function-GB-second, or edge read.
That is precisely the cost shape §4.2 forbids. **A $20 plan with metered overage is not a
predictable $20 plan; it is an unbounded liability with a $20 floor.** For a ministry project
run by one person, an unbounded liability is a worse outcome than a higher fixed floor.

## Alternatives considered

| Alternative | Verdict |
|---|---|
| Supabase BaaS + SPA | **Strong alternative, documented.** Rejected only because envelope encryption with a server-held master key has nowhere to live when the browser talks to the database directly |
| Cloudflare Workers + D1 + Clerk | Rejected: three metered dimensions (requests, rows, MAU) and deep lock-in |
| Self-managed VPS | **Retained as the cost-floor migration path.** Rejected at MVP because it consumes most of a part-time operator's attention, and the first thing they skip is restore rehearsals |
| Microservices | Rejected without hesitation: operational overhead with no benefit at this scale |

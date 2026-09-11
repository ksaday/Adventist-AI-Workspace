# ADR-0023 · Closed beta runs on a self-hosted Proxmox LXC behind a Cloudflare Tunnel

**Status:** Accepted · 2026-09-11

## Owner decision record

```
Decision ID    SDAWS-DEC-2026-09-11-01
Date           2026-09-11
Decided by     Product owner — ksaday
Question put   The closed beta (10–20 members, docs/80-ops/beta-launch-plan.md) needs a
               reachable deployment now. ADR-0007 specifies a flat-fee managed container
               host (Render/Fly/Hetzner+Coolify) with managed PostgreSQL for production.
               Should the beta wait for that, or run on infrastructure the owner already
               operates?
Options put    (a) stand up a flat-fee host now, ahead of schedule  (b) run the beta on the
               owner's existing Proxmox VE server, scoped explicitly to the beta and
               revisited before public launch  (c) delay the beta until (a) is resourced
Decision       (b)
Carried by     This record; docs/80-ops/cloudflare-dns-tls.md §1a
```

## Context

[ADR-0007](0007-architecture-monolith.md) chose a flat-fee managed container host for
**production**, and explicitly considered and rejected a self-managed VPS at MVP — not because
it doesn't work, but because "it consumes most of a part-time operator's attention, and the
first thing they skip is restore rehearsals." That reasoning is about *production*, where an
outage or a skipped backup affects paying members under a launched product.

The closed beta is a different situation: 10–20 known participants, `BILLING_MODE=off`, a
4-week bounded window, and exit gates that already assume things will need fixing
(`docs/80-ops/beta-launch-plan.md`). The owner already operates a Proxmox VE server on their
home network for other purposes, so the marginal operational cost of one more LXC container is
small — closer to ADR-0007's "self-managed VPS" alternative than to standing up a new billed
relationship with a hosting vendor before there is anything real to serve.

Waiting for a flat-fee host to be provisioned before the beta could start was rejected as pure
schedule cost with no corresponding benefit — nothing about the beta's own exit gates requires
a managed host, and the same Dockerfile and `docker-compose.prod.yml` that a flat-fee host
would run is what the LXC runs.

## Decision

**The closed beta runs on the owner's own hardware**: a Debian 12 LXC container (unprivileged,
`nesting=1`) on Proxmox VE, static LAN address `192.168.8.53`, exposed to the internet
exclusively through a **Cloudflare Tunnel** (`cloudflared` as a systemd service inside the
container) at `https://ai.sdachurches.org`. No port is forwarded on the home router; there is
no public IP for the origin at all.

Inside the container, the app runs exactly as designed: `docker compose -f
docker-compose.prod.yml up`, the same Dockerfile and compose file Phase 10 built for the flat-fee
host target, unmodified except for two real bugs this deployment surfaced and fixed (see
Consequences).

**This is scoped to the beta.** It does not reverse or supersede ADR-0007's production
recommendation. Whether the public launch stays on this hardware or migrates to a flat-fee host
is a decision for after the beta, informed by what the beta actually costs the owner in
attention — exactly the tradeoff ADR-0007 reasoned about in the abstract.

## Consequences

**Positive**
- Zero incremental hosting cost during the beta, and zero new vendor relationship before there
  is a product worth putting behind one.
- **A Cloudflare Tunnel is arguably a stronger security posture than the ADR-0007 production
  target for this phase**: no inbound port is open on the home network, no origin IP exists to
  scan, rate-limit-bypass, or DDoS directly. Every request passes Cloudflare's edge first.
- Deploying for real, rather than continuing to reason about the Dockerfile and compose file
  from the design package, found and fixed two defects nothing had exercised before:
  1. `Dockerfile`'s `COPY --from=builder /app/public ./public 2>/dev/null || true` is not valid
     Dockerfile syntax — `COPY` has no shell fallback, and the build failed outright the first
     time it was actually run. Fixed by adding a real (if currently empty) `public/` directory
     to the repo and a plain `COPY`.
  2. Confirmed the `next.config.mjs` webpack `extensionAlias` fix (see STATE.md, 2026-09-11
     PostgreSQL validation entry) also resolves the production Docker build, not just the local
     one — `npm run build` inside the `builder` stage now completes and all four routes
     prerender.

**Negative**
- **Single point of failure.** One physical machine, one location, one residential internet
  uplink, no managed-host SLA, no automatic failover. A power outage or a home ISP outage takes
  the beta down until the owner notices and intervenes. This is acceptable for a bounded,
  low-stakes pilot with known participants; it would not be acceptable framing for the public
  launch, and this record should not be read as arguing otherwise.
- No `keyctl` LXC feature: Proxmox API tokens (unlike an interactive `root@pam` session) are
  structurally barred from setting `keyctl` on a container, even with full ACL permissions.
  Docker was verified working with `nesting=1` alone (`docker run hello-world` succeeded), but
  if a future dependency specifically needs kernel-keyring access inside a container, that
  requires an interactive Proxmox root session to add, not the API token this deployment used.
- The `docker-compose.prod.yml` Postgres container is co-located on the same LXC, not a
  separately managed database service — a real divergence from ADR-0007's "managed PostgreSQL,"
  not just from its hosting-vendor choice. Backups, restore drills, and version upgrades for
  this Postgres instance are the owner's responsibility during the beta, same as everything
  else on the box.
- `docs/80-ops/cloudflare-dns-tls.md` §§2–4 (WAF, edge rate limiting, Transform-Rule security
  headers, origin health-check probing) describe the §1b production target and are **not**
  configured for this Tunnel. The beta currently relies on the app's own response headers
  (verified live) and Cloudflare's baseline TLS only.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Provision a flat-fee host now, ahead of the beta | Pure schedule cost — nothing in the beta's own exit gates needs it, and it would be provisioned before there is real usage to size it against |
| Delay the beta until a flat-fee host is resourced | Same schedule cost, with no compensating benefit for a 10–20 person, `BILLING_MODE=off`, bounded pilot |
| Expose the origin directly (port-forward + A/AAAA, matching §1b now) | Opens an inbound port on the owner's home network and a scannable origin IP for a beta that doesn't need either; the Tunnel gets a stronger posture for less operational work |

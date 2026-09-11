# Cloudflare, DNS & TLS Production Configuration

**Document 38 of 37** · Phase 10 Production Readiness

This document specifies the production edge infrastructure, Cloudflare reverse-proxy configuration, DNS records, TLS certificates, and edge security policies for SDA AI Workspace. The registered domain is `sdachurches.org`.

**Two topologies now coexist**, and this document describes both rather than picking one silently:

- **§1a — Closed beta (live now).** [ADR-0023](../90-decisions/adr/0023-beta-self-hosted-tunnel.md) runs the beta on a self-hosted Proxmox LXC behind a **Cloudflare Tunnel** — no A/AAAA record, no exposed origin IP or port at all.
- **§1b — Production target.** The A/AAAA/Full-Strict model below is what [ADR-0007](../90-decisions/adr/0007-architecture-monolith.md) specifies for the eventual flat-fee-hosted public launch. It is not live yet; it is retained here as the target to migrate to.

---

## 1a. Closed beta: Cloudflare Tunnel (current)

| Item | Value |
|---|---|
| Public hostname | `ai.sdachurches.org` |
| DNS record | `CNAME ai → <tunnel-id>.cfargotunnel.com`, proxied |
| Origin | Proxmox LXC `sdaws-beta` (VMID 100), static LAN IP `192.168.8.53`, no public IP, no port-forward |
| Connector | `cloudflared` running as a systemd service on the LXC itself, `tunnel run --token-file`, four outbound-only QUIC connections to the Cloudflare edge |
| TLS | Terminated at Cloudflare's edge; the tunnel connection back to origin is Cloudflare's private, authenticated channel — there is no separate origin certificate to provision or rotate |
| Ingress | `ai.sdachurches.org → http://localhost:3000` (the app's own `127.0.0.1:3000` binding in `docker-compose.prod.yml`); all other hostnames → `http_status:404` |
| Security headers | Applied by the Next.js app itself (`next.config.mjs`), not by a Cloudflare Transform Rule — verified live: HSTS, CSP, X-Frame-Options, etc. all present on responses through the tunnel |

This is a materially different security posture from §1b: the home network has zero inbound firewall rules opened for this, and there is no origin IP to scan, rate-limit-bypass, or DDoS directly — every request must first pass through Cloudflare's edge. The trade-off is availability: one physical machine, one location, one residential uplink, no managed-host SLA. See ADR-0023 for why that trade-off is acceptable for a time-boxed closed beta and not a decision about the public launch.

---

## 1b. Production target: A/AAAA + Full Strict TLS (not yet live)

| Record Type | Name | Content / Target | TTL | Proxy Status | Purpose |
|---|---|---|---|---|---|
| **A** | `sdachurches.org` | `<ORIGIN_IPV4_ADDRESS>` | 300 s (5 min) | Proxied (Orange Cloud) | Apex web application |
| **AAAA** | `sdachurches.org` | `<ORIGIN_IPV6_ADDRESS>` | 300 s (5 min) | Proxied (Orange Cloud) | IPv6 apex web application |
| **CNAME** | `www.sdachurches.org` | `sdachurches.org` | 300 s (5 min) | Proxied (Orange Cloud) | Canonical redirect to apex |
| **TXT** | `sdachurches.org` | `v=spf1 include:_spf.mx.cloudflare.net ~all` | 300 s | DNS only | SPF email deliverability |
| **TXT** | `_dmarc.sdachurches.org` | `v=DMARC1; p=reject; rua=mailto:dmarc-reports@sdachurches.org` | 300 s | DNS only | DMARC spoofing prevention |
| **CAA** | `sdachurches.org` | `0 issue "letsencrypt.org"` | 300 s | DNS only | Certificate Authority Authorization |

> **TTL Rationale (300 s):** A 5-minute TTL during the initial launch and pilot phases enables zero-downtime failover and rapid DNS repointing in the event of an infrastructure migration or disaster recovery operation (AC-O6, SR-12).
>
> Note this table describes the flat-fee-host model (an exposed origin IP behind Cloudflare's proxy), which is a different shape from §1a's Tunnel model. Migrating from beta to this target is a DNS cutover (delete the CNAME, add A/AAAA), not a code change — the app itself is identical either way.

---

## 2. SSL/TLS Edge Settings

*Sections 2–4 describe the §1b production target's edge configuration (Transform Rules, WAF, origin health checks). None of it is configured for the §1a beta Tunnel yet — the beta currently relies on the app's own security headers (`next.config.mjs`, verified live) and Cloudflare's baseline TLS termination only. WAF rules, edge rate limiting, and origin health-check probing should be added before public launch, not assumed to already be in place.*

1. **Encryption Mode:** **Full (Strict)**.
   - Requires a valid, trusted SSL/TLS certificate on the origin server. Self-signed certificates are rejected at the edge.
2. **Minimum TLS Version:** **TLS 1.3** (fallback TLS 1.2 with secure cipher suites only).
3. **HTTP Strict Transport Security (HSTS):**
   - Max-Age: `63072000` (2 years)
   - Include Subdomains: `true`
   - Preload: `true`
   - Automatic HTTPS Rewrites: `true`
4. **Opportunistic Encryption & Onion Routing:**
   - Enabled for enhanced privacy and latency reduction.

---

## 3. Edge Security Policies & WAF Rules

### 3.1 Web Application Firewall (WAF)
- **AI Crawlers & Scrapers:** Block all automated model ingestion crawlers (e.g., GPTBot, CCBot, ClaudeBot, Bytespider) from consuming origin resources.
- **Edge Rate Limiting:**
  - Burst limit: 120 requests per minute per IP address.
  - Auth routes (`/auth/*`): 10 requests per minute per IP address.
- **Bot Fight Mode:** Challenging automated headless browsers on registration and authentication endpoints.

### 3.2 Edge Security Headers
Cloudflare Transform Rules append the following HTTP response headers:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self';
```

> **CSP Invariant:** The edge `connect-src 'self'` policy strictly bars any browser or server component from connecting to external inference APIs (`api.openai.com`, `api.anthropic.com`, etc.) from within the origin application context, ensuring the Cost Firewall guarantee holds end-to-end.

---

## 4. Health Check Probing & Failover

Cloudflare health checks monitor the production origin:
- Path: `/healthz` (liveness probe)
- Interval: 60 seconds
- Regions: North America, Europe, Asia Pacific
- Notification: Immediate alert to the system owner upon 2 consecutive failures.

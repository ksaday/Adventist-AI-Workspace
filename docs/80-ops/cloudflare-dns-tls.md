# Cloudflare, DNS & TLS Production Configuration

**Document 38 of 37** · Phase 10 Production Readiness

This document specifies the production edge infrastructure, Cloudflare reverse-proxy configuration, DNS records, TLS certificates, and edge security policies for SDA AI Workspace.

---

## 1. Domain & DNS Configuration

| Record Type | Name | Content / Target | TTL | Proxy Status | Purpose |
|---|---|---|---|---|---|
| **A** | `sda-ai-workspace.org` | `<ORIGIN_IPV4_ADDRESS>` | 300 s (5 min) | Proxied (Orange Cloud) | Apex web application |
| **AAAA** | `sda-ai-workspace.org` | `<ORIGIN_IPV6_ADDRESS>` | 300 s (5 min) | Proxied (Orange Cloud) | IPv6 apex web application |
| **CNAME** | `www.sda-ai-workspace.org` | `sda-ai-workspace.org` | 300 s (5 min) | Proxied (Orange Cloud) | Canonical redirect to apex |
| **TXT** | `sda-ai-workspace.org` | `v=spf1 include:_spf.mx.cloudflare.net ~all` | 300 s | DNS only | SPF email deliverability |
| **TXT** | `_dmarc.sda-ai-workspace.org` | `v=DMARC1; p=reject; rua=mailto:dmarc-reports@sda-ai-workspace.org` | 300 s | DNS only | DMARC spoofing prevention |
| **CAA** | `sda-ai-workspace.org` | `0 issue "letsencrypt.org"` | 300 s | DNS only | Certificate Authority Authorization |

> **TTL Rationale (300 s):** A 5-minute TTL during the initial launch and pilot phases enables zero-downtime failover and rapid DNS repointing in the event of an infrastructure migration or disaster recovery operation (AC-O6, SR-12).

---

## 2. SSL/TLS Edge Settings

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

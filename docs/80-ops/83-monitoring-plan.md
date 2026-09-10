# Monitoring Plan

**Document 29 of 37** · v1.1

---

## 1. The constraint that shapes everything

**No user content may reach any monitoring system.** Not in a log line, not in an error
payload, not in a metric label, not in a trace attribute, not in a support screenshot.

This rules out: session-replay tools, most APM auto-instrumentation of request bodies,
third-party analytics, and any "just log the payload for debugging" reflex. It is not a
preference; it is what makes the privacy claims true
([Privacy Architecture §7](../60-risk/61-privacy-architecture.md)).

The compensating design is **rich structured events with no content**, plus error ids that
correlate a member's report to a scrubbed server-side record.

---

## 2. The four signals

| Signal | Tool | Cost model | Retention |
|---|---|---|---|
| **Uptime** | Better Stack / UptimeRobot free | **Fixed $0** | 90 days |
| **Errors** | Sentry Developer free (5k events/mo) → self-hosted GlitchTip | Fixed / free tier | 90 days |
| **Logs** | Platform-native structured logs | Included | 30 days |
| **Metrics** | First-party counters in Postgres, rendered on an admin dashboard | **Fixed $0** | 24 months (aggregated) |

Every one is fixed or free (§38 classification). The moment error volume threatens the free
tier, GlitchTip self-hosted on the existing box removes the metered dimension entirely, at the
cost of some operational work — a trade the operator can make deliberately rather than
discovering on an invoice.

---

## 3. The log scrubber

A single central function that every log, error, and metric passes through before egress.

```
Denied outright (never emitted):
  message bodies · prompt text · source block text · claim text ·
  prayer content · email addresses · session tokens · API keys ·
  password material · TOTP secrets · export download tokens

Redacted to a safe form:
  IP address        → /24 or /48 prefix
  User-Agent        → browser family only
  User id           → passed through (needed for correlation; not content)
  URLs              → path only, query string dropped
  Stack frames      → local variables stripped

Allowed:
  event type · route · status · duration · counts · error class ·
  template version id · asset version · feature flag state
```

**Proven, not promised.** The privacy canary suite
([Testing §6](../70-quality/71-testing-strategy.md#6-privacy-canary-suite)) writes a unique
string into a conversation body, triggers normal use, a 500, a validation failure, and a slow
query, then asserts that the string appears in no sink. It runs in CI and blocks release.

---

## 4. What is monitored

### 4.1 Availability

| Check | Interval | Alert |
|---|---|---|
| `GET /healthz` (liveness) | 60 s from 3 regions | 2 consecutive failures |
| `GET /readyz` (DB ping) | 60 s | 2 consecutive failures |
| Login flow synthetic | 15 min | 2 consecutive failures |
| TLS certificate expiry | Daily | 14 days before expiry |
| Domain expiry | Weekly | 30 days before expiry |

### 4.2 Errors

Grouped by class and route. Alert on: any new error class in production; error rate above
1% of requests for 10 minutes; any 5xx on authentication, billing webhooks, or export.

### 4.3 Performance

p50/p95/p99 by route. Alert when p95 exceeds 800 ms for 15 minutes. Database slow-query log
above 500 ms, reviewed weekly (query shapes only — parameters are scrubbed).

### 4.4 Security events

**These are the alerts that matter most in this architecture.**

| Event | Alert |
|---|---|
| **`security.egress_denied`** | **Immediate.** There is no legitimate reason for this to happen (RB-08) |
| Audit hash chain verification failed | Immediate |
| Admin break-glass invoked | Immediate, to the owner |
| Admin role granted | Immediate, to the owner |
| Failed-login spike (>100/5 min globally) | Within the hour |
| Rate-limit lockouts spiking | Within the hour |
| Webhook signature verification failures | Within the hour |
| Export volume anomaly for a single user | Within the hour |

### 4.5 Business and integrity metrics

Rendered on the admin dashboard from first-party counters — no content, no third party.

| Metric | Why |
|---|---|
| Registrations, activations, active members | Growth |
| Conversations by app | Which tools are used |
| **% of external answers with ≥1 verification run** | **The north-star metric** |
| **Deterministic catches per 100 answers** | The value delivered with certainty |
| Claims reaching **E4** | Does anyone finish the ladder? |
| Claims reaching E3 and stopping | Is consistency being mistaken for confirmation? |
| Round-trip completion rate (copied → pasted) | R-02, measured |
| Claim-block parse rate by provider | Field validation of the prompt format |
| Quota-limit hits by tier | Are the tiers calibrated? |
| Safety panel shown, by category | Lexicon calibration only |
| Free → paid conversion, churn | R-01 |

### 4.6 Cost and capacity

| Check | Cadence |
|---|---|
| Database size and growth rate | Daily |
| Vendor billing alerts at 150% of expected | Continuous |
| **Manual invoice review — confirm $0.00 AI** | Monthly |
| Bandwidth against plan allowance | Weekly |
| Cloudflare cache hit ratio on `/data/*` | Weekly |

---

## 5. Alert routing and noise discipline

| Severity | Channel | Hours |
|---|---|---|
| **Critical** (S1/S2 security, total outage) | Phone/SMS | 24/7 |
| **High** (elevated errors, degraded performance) | Email + chat | Business hours |
| **Medium** (capacity trends, stale config) | Daily digest | Business hours |
| **Low** (informational) | Weekly digest | — |

**Only four things wake the operator at night:** total outage, `egress_denied` to an LLM host,
audit chain failure, and a confirmed content breach. Everything else waits.

**Noise discipline.** An alert that fires and is ignored is worse than no alert, because it
trains the operator to ignore the channel. Every alert must be actionable, have a runbook, and
be reviewed monthly. Any alert that has fired more than twice without an action taken is
either re-tuned or deleted. This is enforced as a monthly agenda item, not a good intention.

---

## 6. Dashboards

**Operator dashboard** (daily, 5-minute glance): uptime, error rate, p95 latency, database
size, active members today, open security events.

**Integrity dashboard** (weekly): verification rate, deterministic catches, evidence-level
distribution, claim-block parse rate by provider, Citation Checklist blocks and how they
resolved.

**Business dashboard** (monthly): registrations, conversion, churn, tier distribution,
revenue and fees, infrastructure cost against forecast.

The integrity dashboard exists because it answers the only question that determines whether
the product is doing what it claims. It should be the one the operator looks at longest.

---

## 7. Audit trail as an observability tool

The `audit_event` table is not only a compliance artefact; it is the primary forensic record.
Queryable by actor, target, action, and time. Hash-chained and verified daily. It answers the
questions that matter after an incident: who accessed what, when, from where, and whether the
record has been altered — without containing any content itself.

---

## 8. What is deliberately not monitored

| Not monitored | Why |
|---|---|
| Individual user behaviour flows | Would require content-adjacent tracking |
| Session replay | Would capture confessions verbatim. Indefensible in this product |
| Per-user crisis or risk trends | Would create the profile the safety design refuses to build |
| Conversation content quality | We do not read conversations |
| Third-party model output quality | Not ours, not stable, and measuring it in production would require reading answers |
| Precise geolocation | Region is user-selected, not inferred |

Each of these would produce useful data. Each was declined because the cost is a privacy
property the product promises in public.

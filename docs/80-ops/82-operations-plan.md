# Operations Plan

**Document 27 of 37** · v1.1

Designed for **one part-time administrator**. Any procedure that cannot be completed by one
person in a reasonable time, or that requires 24/7 attention, is a design defect and should
be raised as such.

---

## 1. Operating model

| | |
|---|---|
| Availability target | 99.5% monthly (≈3.6 h/month of allowed downtime) |
| Support hours | Business hours, one timezone, 48-hour first response |
| On-call | **None.** No paging outside working hours. The system is designed so that an outage is an inconvenience, not an emergency |
| Escalation | S1 security incidents only, via a phone alert |
| Maintenance window | Announced, Sundays, low-traffic hour |

**Why no on-call is defensible here:** with the server down, the browser-side composer,
validators, and clipboard continue to work
([System Architecture §9](../10-architecture/12-system-architecture.md#9-failure-modes-and-degradation)).
A member mid-preparation is inconvenienced, not stopped, and nothing is lost. That property
was designed for; it is what buys the operator their evenings.

---

## 2. Routine operations calendar

| Cadence | Task | Time |
|---|---|---|
| **Daily** (automated) | Backups · retention sweeps · session expiry · source-directory probe · audit chain verification | 0 |
| **Daily** (human, 5 min) | Glance at the dashboard: errors, uptime, queue depth | 5 min |
| **Weekly** | Review the accretion report · review security events (egress denials, lockouts) · triage support · check dependency alerts | 30 min |
| **Monthly** | **Review every vendor invoice, confirm $0.00 AI** · review break-glass access · verify retention jobs ran · review product metrics · apply dependency updates | 90 min |
| **Quarterly** | Verify provider deep links · review Source Directory · rotate non-master secrets · risk register review · restore drill · member interviews | 4 h |
| **Annually** | **Verify every emergency resource number** · review risk lexicons · master key rotation · penetration test · policy review · pastoral advisory review | 2 days |

Total steady-state burden: roughly **4–6 hours per month**, plus support volume.

---

## 3. Runbooks

Every alert maps to a runbook. Each runbook states: symptom, likely cause, diagnostic steps,
remedy, escalation, and follow-up.

| # | Runbook |
|---|---|
| RB-01 | Application down / health check failing |
| RB-02 | Database unreachable or connection pool exhausted |
| RB-03 | Elevated error rate |
| RB-04 | Elevated latency |
| RB-05 | Disk or database storage above 70% |
| RB-06 | Email delivery failures or bounces spiking |
| RB-07 | Billing webhooks failing or reconciliation divergence |
| RB-08 | **Egress denial recorded** — treat as a security event |
| RB-09 | Audit hash chain verification failed |
| RB-10 | Suspected account compromise |
| RB-11 | **Suspected data breach (S1)** |
| RB-12 | Retention job failed or over-deleted |
| RB-13 | Provider deep link broken |
| RB-14 | Official EGW Library unreachable |
| RB-15 | Restore from backup |
| RB-16 | Master key rotation |
| RB-17 | **Master key loss** |
| RB-18 | Accretion threshold exceeded |
| RB-19 | Rights-holder or trademark contact received |
| RB-20 | Deploy rollback |
| RB-21 | Emergency directory entry found stale or wrong |
| RB-22 | Break-glass access request |
| RB-23 | Service wind-down |

Three of these deserve expansion here because they are unusual to this product.

### RB-08 · Egress denial recorded

**Symptom.** A `security.egress_denied` audit event and an alert.

**Why this is serious.** In this architecture there is no legitimate reason for the server to
contact a host outside the allowlist. A denial means either a dependency changed behaviour, a
code change slipped past review, or something is wrong.

**Steps.** Identify the destination host and the calling code path → if it is an LLM provider
host, treat as **S2 immediately**: freeze deploys, audit recent commits and dependency
changes, verify the Cost Firewall in CI, check every vendor invoice → if it is a new
legitimate dependency, review whether it belongs in the allowlist at all before adding it →
write a post-incident note regardless.

### RB-18 · Accretion threshold exceeded

**Symptom.** The weekly report shows a single catalogued work accumulating source text beyond
threshold across users.

**Steps.** Look at the shape, not just the number: how many distinct users, over what period,
what proportion of the work → a study group working through one book together is not the same
as systematic extraction → if benign, note it and consider raising the threshold with a
recorded rationale → if concerning, reduce the per-conversation cap, shorten expiry for that
work, and consider whether a feature is inadvertently encouraging accumulation → **never
auto-delete members' content on this signal**; the report exists to inform a person.

### RB-19 · Rights-holder or trademark contact received

**Steps.** Acknowledge within 48 hours, courteously → **comply first, discuss second**: disable
the disputed element, which is almost always a configuration change → preserve the record →
notify counsel → assess whether the product still functions (it will;
[EGW Policy §9](../40-ai/44-egw-interaction-policy.md)) → respond substantively once counsel
has advised → treat it as the beginning of a relationship rather than a dispute.

---

## 4. Incident management

| Severity | Definition | Response | Communication |
|---|---|---|---|
| **S1** | Confirmed unauthorised access to user content; master key compromise; total outage > 4 h | Immediate. Rotate secrets, revoke sessions, preserve evidence, engage counsel | Affected users within statutory windows; public status page; post-incident review published |
| **S2** | Vulnerability enabling S1; egress denial to an LLM host; sub-processor breach | Within 24 h | Users if content was reachable; internal review |
| **S3** | Single-account compromise; partial degradation | Within 1 business day | Affected user directly |
| **S4** | Minor defect | Scheduled | Release notes |

**Every incident produces a written post-incident review** — timeline, root cause,
contributing factors, actions, owners. S1 and S2 reviews are published in summary form. For a
product whose entire pitch is honesty about what it does and does not know, a quietly handled
incident would contradict the pitch.

**Breach notification:** counsel engaged immediately; GDPR's 72-hour supervisory-authority
window is the tightest of the regimes plausibly in scope and is the planning assumption.

---

## 5. Support

| Tier | Handling |
|---|---|
| Self-service | Help centre, evidence-levels explainer, finding-sources guide, FAQ |
| Email | 48-hour first response, business days |
| Priority (Pastor tier) | 24-hour first response |

**Support operates without access to conversation content by default.** This is deliberate,
and it will be felt weekly. The compensating investments:

- Self-service diagnostics the member can run and share ("copy diagnostic info" — versions,
  browser, feature flags, error id; **never content**).
- Error ids in every user-facing error, correlating to a scrubbed server-side record.
- The member can share a specific conversation with support **by their own explicit action**,
  which grants scoped, time-limited, audited access. This is a member-initiated grant, not a
  break-glass.

**The correct response to support friction is better diagnostics, never a quiet widening of
administrative access.** That is stated here so a future operator under pressure recognises
the trade they would be making.

**Common support topics, anticipated:** "the prompt didn't appear in ChatGPT" (clipboard
fallback) · "what does E2 mean" (a signal the ledger design needs work) · "I lost my ephemeral
conversation" (working as designed, explained gently) · "my card failed" · "how do I delete
everything".

---

## 6. Change management

| Change type | Process |
|---|---|
| Code | PR → CI (all release gates) → staging → manual promotion |
| Database migration | Expand/contract; reviewed; never destructive in the same release as the dependent code |
| **Prompt template** | Draft → evaluation sweep → second reviewer if source-discipline rules changed → publish → audited |
| Configuration (flags, providers, sources, emergency directory) | Admin edit → audited with before/after → no deploy |
| Dependency | Automated PR → CI → review of any new transitive additions |
| Secret rotation | Runbook; announced when it invalidates sessions |

---

## 7. Capacity and scaling triggers

| Signal | Action |
|---|---|
| p95 latency > 800 ms for 15 min | Scale the container up one tier |
| CPU > 70% sustained for 1 h | Scale up; investigate the hot path |
| DB connections > 70% of pool | Add PgBouncer; plan for Redis sessions |
| DB storage > 70% | Raise the tier; run retention; review accretion |
| Bandwidth approaching plan allowance | Check the Cloudflare cache hit ratio on `/data/*` first |
| Members > 10,000 | Plan the second instance and the shared session store |

---

## 8. Vendor management

| Vendor | Role | Alternative on file | Switching cost |
|---|---|---|---|
| Application host | Compute | Fly.io, Railway, Hetzner+Coolify | Low — it is a container |
| Database host | Postgres | Any managed Postgres, or self-managed | Low — dump and restore |
| Email | Transactional | Postmark, SES | Low — adapter |
| Billing | Subscriptions | Stripe | **Medium-high** — MoR subscriptions are not portable ([Billing §8](../30-identity/33-billing-architecture.md)) |
| Error reporter | Telemetry | Self-hosted GlitchTip | Low |
| CDN | Edge | Any | Low |

Reviewed annually: pricing, terms, incident history, and whether the alternative is still viable.

---

## 9. Service wind-down (RB-23)

Written now, while it costs nothing, because members will have years of study in this system
and deserve better than a sudden shutdown.

1. **90 days' notice** by email and in-product banner.
2. **Export enabled for every tier**, including Free, immediately and for the full period.
3. **No new charges**; pro-rata refunds for prepaid periods.
4. At the announced date: service disabled, data deleted per the retention schedule, keys
   destroyed, backups aged out.
5. A final notice confirming deletion is complete.
6. Consider open-sourcing the application code so a successor community can continue it —
   nothing in this architecture depends on a private corpus or a proprietary model, which
   makes that unusually feasible.

Point 6 is a genuine consequence of the design: a product with no corpus and no model is a
product that can be handed on.

# Disaster Recovery Plan

**Document 30 of 37** · v1.1

Backup and Recovery ([84](84-backup-recovery-plan.md)) handles data loss.
This document handles **loss of the ability to operate**.

---

## 1. Disaster classes

| Class | Example | Likelihood | Impact | Plan |
|---|---|---|---|---|
| **D1** Infrastructure loss | Hosting provider region failure, sustained outage | Low | High | §2 |
| **D2** Vendor loss | Provider terminates the account, goes out of business, or changes terms unacceptably | Low | High | §3 |
| **D3** Destructive compromise | Ransomware, malicious deletion, credential compromise with intent | Low | Critical | §4 |
| **D4** **Master key loss** | Secret store lost, escrow lost, key destroyed | **Very low** | **Critical, irreversible** | §5 |
| **D5** Operator loss | Illness, incapacity, departure | Medium | High | §6 |
| **D6** Legal cessation | Order to stop operating, unresolvable rights dispute | Low | High | §7 |

---

## 2. D1 · Infrastructure loss

**Detection.** Uptime monitors from three regions; provider status page.

**Response**
```
0–15 min   Confirm it is the provider, not us. Check status pages. Post to the status page
15–60 min  If the provider estimates < 4 h → wait; keep members informed
           If longer or unknown → begin migration
1–4 h      Provision on the alternative host (Fly.io or Hetzner, documented and pre-decided)
           Restore the database from the most recent backup
           Repoint DNS at Cloudflare — TTL is kept at 300 s precisely for this
4–8 h      Smoke-test; re-enable; communicate what was lost, if anything
```

**Why this is achievable in hours rather than days:** the application is one container and one
Postgres database. That simplicity is a disaster-recovery property, not just an aesthetic one.

**Preparation, maintained continuously:** an alternative host account exists and is tested
annually; deployment configuration is in the repository; DNS TTL stays at 300 seconds; the
off-site dump is at an unrelated vendor.

---

## 3. D2 · Vendor loss

| Vendor lost | Impact | Recovery | Time |
|---|---|---|---|
| Application host | Service down | Redeploy the container elsewhere | 2–4 h |
| Database host | Service down | Restore to another managed Postgres | 4–8 h |
| Email | No verification or reset mail | Switch the adapter; DNS records for the new sender | 2–4 h |
| Billing | No new subscriptions | **Existing access unaffected** — entitlements are our rows. Migrate subscribers with an incentive ([Billing §8](../30-identity/33-billing-architecture.md)) | Days–weeks |
| Error reporter | No telemetry | Switch or self-host GlitchTip | 1 h |
| CDN | Direct-to-origin | Repoint DNS | 1 h |

**Every row except billing is hours.** Billing is the one genuinely sticky vendor, and the
[Billing Architecture](../30-identity/33-billing-architecture.md) states that cost up front
rather than discovering it under pressure.

---

## 4. D3 · Destructive compromise

```
IMMEDIATE (0–1 h)
  · Isolate: take the application offline. Availability is not the priority here
  · Revoke every session; rotate every credential except the master key
  · Preserve evidence: snapshot disks and logs before changing anything
  · Engage counsel. Declare S1

ASSESS (1–8 h)
  · Determine the entry point, the window, and what was reachable
  · Was the master key in memory on a compromised host? If yes, assume content exposure
  · Was the database exfiltrated? If yes, ciphertext alone is inert — establish whether the
    key went with it

RECOVER (8–24 h)
  · Build NEW infrastructure. Do not clean and reuse compromised hosts
  · Restore from a backup predating the compromise
  · Rotate the master key and re-wrap every DEK
  · Force a password reset for all users if credentials were reachable
  · Patch the entry point before returning to service

COMMUNICATE
  · Regulators within statutory windows (72 h under GDPR — the planning assumption)
  · Affected users directly, with specifics: what was reachable, what was not, what to do
  · A public post-incident review once the facts are established

FOLLOW UP
  · Written post-incident review; remediation with owners and dates
  · Re-run the threat model against what actually happened
```

**On communication:** a product built on telling people what it does not know cannot handle an
incident by minimising it. The disclosure should state plainly whether the master key was
reachable, because that single fact determines whether ciphertext exposure means anything, and
members are entitled to know it.

---

## 5. The master key

**This is the single most concentrated risk in the system, and it deserves its own section.**

The master key wraps every user's DEK. Without it, every message body, conversation title,
claim, and source block is permanently unreadable. Not "hard to recover" — **mathematically
unrecoverable**.

### If the key is lost

There is no recovery. Members' accounts, memberships, conversation metadata, and audit history
survive; **the content does not**. The only honest response is to say so immediately, offer
full refunds, and help members rebuild what they can from their own exports.

### Therefore, the escrow

```
Generation      Generated once, offline, from a hardware RNG
Primary         Platform secret store (production runtime access only)
Escrow copy 1   Printed, sealed, in a fireproof safe at the operator's location
Escrow copy 2   Printed, sealed, held by a trusted second party or a bank safe-deposit box
Format          Base32 with a checksum, split into labelled lines, with a dated recovery
                procedure printed alongside it
Verification    Annually, witnessed: open, verify the checksum, confirm legibility, re-seal
Rotation        Annually: generate a new key, re-wrap every DEK, then update both escrows
                BEFORE destroying the old key
Access log      Physical: a paper record signed on every access
```

**Shamir secret sharing (2-of-3) is the better answer** once there is a second trusted party
and should be adopted at that point. Two sealed copies is the pragmatic solo-operator version,
and it is documented as such rather than presented as best practice.

### The rule that prevents the most likely failure

**Never destroy the old master key until the new one is escrowed, verified, and every DEK is
confirmed re-wrapped.** The realistic way this key is lost is not theft or fire — it is a
rotation performed under time pressure, half-completed, with the old key discarded. The
runbook (RB-16) makes the ordering explicit and requires the verification step to be recorded
before the destruction step is permitted.

---

## 6. D5 · Operator loss

**The scenario.** One person holds the design, the operations, the secrets, and the
relationships. If they are unavailable for a month, what happens to members' data and to the
service?

**Preparation**
- **This documentation package.** It exists partly for this reason and should be readable by a
  competent developer who has never met the author.
- Runbooks for every operational task, written to be followed rather than remembered.
- A sealed **continuity envelope** held with escrow copy 2, containing: the recovery
  procedure, vendor account list, where the secrets are, who to notify, and a written
  instruction for what to do — continue, hand over, or wind down.
- A designated second party who knows the envelope exists and what to do with it.
- Standard, portable technology throughout, so a successor can pick it up.
- **Members can export at any time**, so no member is ever trapped by the operator's absence.

**Response** — continue if a successor is available; otherwise execute the wind-down (§7 of
the [Operations Plan](82-operations-plan.md#9-service-wind-down-rb-23)) with 90 days' notice
and exports enabled for every tier.

---

## 7. D6 · Legal cessation

**Response**
1. Comply immediately with whatever is required. Take the disputed element offline first;
   almost everything is configuration.
2. Engage counsel.
3. Assess whether the product survives without it — in almost every case it does
   ([EGW Policy §9](../40-ai/44-egw-interaction-policy.md)). Removing the EGW catalogue
   degrades EGW citation validation and leaves Bible validation, the evidence ladder, the
   workflow, and all three applications intact.
4. If it does not survive, execute the wind-down with the notice period the order permits.
5. Members' exports remain available throughout.

**The architecture is the mitigation here.** A product built on a private corpus would face an
existential threat from a rights dispute. This one faces a feature reduction.

---

## 8. Drill calendar

| Drill | Cadence | Recorded |
|---|---|---|
| Restore from managed backup into an isolated environment | Quarterly | Duration, issues found |
| Restore from the off-site dump | Annually | Duration, issues found |
| Migrate to the alternative host | Annually | Duration, gaps in the runbook |
| Master key escrow verification | Annually, witnessed | Signed record |
| Master key rotation | Annually | Ordering verified, both escrows updated first |
| Incident tabletop (D3 walkthrough) | Annually | Decisions and gaps |
| Continuity envelope review | Annually | Contents current |

**A drill that is scheduled but never performed is worse than no drill**, because it produces
the belief that recovery is possible without the evidence. Each drill records its actual
duration, and those durations are what the RTO figures in
[84 §1](84-backup-recovery-plan.md#1-objectives) should be revised to match.

---

## 9. Communication templates

Prepared in advance, because writing clearly is hardest during an incident.

| Situation | Channel | Key content |
|---|---|---|
| Planned maintenance | Email + banner | When, how long, what is unavailable |
| Unplanned outage | Status page + banner | What is affected, what is not, next update time |
| Data loss | Email, individually | Exact window lost, what to check, what we are doing |
| Security incident | Email + public review | What was reachable, **whether the master key was**, what to do, what changed |
| Wind-down | Email + banner, 90 days | Timeline, export instructions, refunds |

Each template is drafted, reviewed, and stored with the runbooks before launch.

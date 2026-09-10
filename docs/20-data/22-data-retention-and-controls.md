# Data Retention & User Controls

**Supporting document** · v1.1

---

## 1. Retention schedule

| Data | Retained | Trigger for deletion | Mechanism |
|---|---|---|---|
| Account record | While active | User deletion request + 7-day grace | Crypto-erase, then row deletion |
| Conversations (Free tier) | 30 days from last update | Retention job | `purge_after` sweep |
| Conversations (paid tiers) | Indefinite while membership active | User deletion, or 60 days after membership lapses to Free | Soft delete → hard delete |
| Conversations (Ephemeral) | Bodies: never stored. Metadata: same as tier | — | Nothing to delete |
| Message bodies | With their conversation | Cascade | Cascade + crypto-erase |
| User-supplied source text | **Never stored.** Browser-only, for the working session ([ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md)) | n/a — nothing to retain | n/a |
| Source references (metadata: kind, char count, work id, client commitment) | With the conversation | `ON DELETE CASCADE` | Hard delete |
| Claims and evidence records | With their verification | Cascade | Cascade |
| Prompt runs (parameters) | 24 months | Age-based job | Hard delete |
| Sessions | 90 days absolute | Expiry sweep | Hard delete |
| Verification / reset tokens | 24 h | Expiry sweep | Hard delete |
| Audit events | 24 months (security), 7 years for billing-relevant actions | Age-based archive | Archive to encrypted cold storage, then delete |
| Safety events | 12 months | Age-based job | Hard delete |
| Consent records | Life of account + 24 months | Deletion + 24 months | Retained deliberately as proof of consent |
| Subscription events | 7 years | Regulatory | Digest only; no PII |
| Application logs | 30 days | Rotation | Scrubbed at write time |
| Error reports | 90 days | Provider retention setting | Scrubbed at write time |
| Database backups | 7 days (managed), 90 days (weekly off-site) | Rotation | Encrypted; see §5 |

---

## 2. The deletion flow

```
User clicks "Delete my account"
   │
   ├─ Re-authenticate (password, and TOTP if enabled)
   ├─ Show exactly what will be destroyed, with counts
   ├─ Offer export first, prominently — one click, no dark pattern
   ├─ Type the word DELETE to confirm
   ▼
status = 'pending_deletion', deletion_requested_at = now()
   │  · All sessions revoked immediately
   │  · Login still permitted, solely to cancel the deletion
   │  · Confirmation email sent, including how to cancel
   │
   ├─ Days 1–7: user may cancel; everything restored
   ▼
Day 7 — irreversible phase, in this order:
   1. DESTROY user_key row                    ← every ciphertext becomes unreadable here
   2. Delete conversations, messages, claims, evidence, source references (cascade)
   3. Delete profile, credentials, sessions, settings, usage counters
   4. Anonymise audit_event.actor_id / target_user_id → NULL, retaining the action record
   5. Retain consent_record and subscription_event with a pseudonymous key
   6. Delete app_user row
   7. Write a final audit event: account_deleted, with no identifying metadata
   │
   ▼
Backups: ciphertext may persist in backups until they age out (7 / 90 days).
Because step 1 destroyed the key, that ciphertext is not recoverable by anyone,
including us. This is stated plainly in the Privacy Policy.
```

**Why key destruction comes first.** If the deletion job fails halfway — a timeout, a
deploy, a database hiccup — the residue is unreadable ciphertext rather than readable
personal content. Ordering the destructive steps by *worst-case interruption* rather than by
convenience is a small discipline that turns a partial failure into a safe state.

---

## 3. Export

**Scope.** Everything attributable to the user: profile, settings, membership history,
every conversation with every message in plaintext, source references, claims with their full
evidence history, prompt runs with the template version used, consent records, and the audit
events where they were the subject.

**Format.** A single ZIP containing:
- `account.json` — machine-readable, complete
- `conversations/<date>-<title>.md` — human-readable, one file per conversation, with the
  claim ledger rendered as a table and evidence levels spelled out
- `README.md` — what each file is, and what the evidence levels mean

**Controls.** Rate-limited to 3 per day. Download link is single-use, expires in 24 hours,
and is bound to the session that requested it. Every export is audited. A sudden export of
an entire account is exactly what a hijacked session would do, so it is also a monitoring signal.

**Why Markdown as well as JSON.** A pastor who leaves the service should be able to open
their sermon research in any text editor, forever. Export that is technically complete but
practically unreadable is compliance theatre.

---

## 4. Privacy controls the user actually has

| Control | Where | Effect |
|---|---|---|
| Default privacy mode | Settings | New conversations default to Standard or Ephemeral |
| Per-conversation mode | New Chat dialog and conversation menu | Ephemeral can be chosen at creation; switching an existing Standard conversation to Ephemeral deletes existing bodies |
| Source retention | Not applicable | Source text is never transmitted to us. There is no retention setting because there is nothing retained, and no personal source library is planned ([ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md)) |
| Delete a single message | Message menu | Hard delete of that body; the conversation retains a tombstone so ordering is stable |
| Delete a conversation | List and conversation menu | 30-day recovery, then hard delete |
| Purge all conversations | Settings → Data | Immediate soft delete of everything, 30-day recovery |
| Revoke other sessions | Settings → Security | Immediate |
| Withdraw external-AI consent | Settings → Privacy | Disables copy/launch until re-consented; existing data untouched |
| Marketing email opt-out | Settings → Notifications | Transactional email cannot be disabled; this is stated |
| Export | Settings → Data | §3 |
| Delete account | Settings → Data | §2 |

**Not offered, deliberately:** "delete everything except what I might want later". Ambiguous
retention promises are worse than clear ones.

---

## 5. Backups and the deletion promise

There is a genuine tension between "deletion is immediate" and "we keep backups". This design
resolves it in the user's favour and says so explicitly:

- Backups contain **ciphertext only** for message bodies, titles, and claims. Source text is
  in no backup because it is in no database.
- Account deletion destroys the key **before** any row is removed.
- Therefore a backup taken before deletion, restored after deletion, yields unreadable data.
- Backups age out on the schedule in §1. No backup is retained indefinitely.
- Restoring a backup for disaster recovery **does not resurrect deleted accounts' content**,
  because their keys are gone from the current key store and the key store is backed up
  separately with its own deletions applied.

This is the operationally honest version of "we delete your data", and it is the version that
appears in the Privacy Policy.

---

## 6. Retention jobs

| Job | Schedule | Action | Safety |
|---|---|---|---|
| `purge_expired_conversations` | Hourly | Hard-delete conversations past `purge_after` | Dry-run mode logs counts before any destructive release |

| `finalise_account_deletions` | Hourly | Execute §2 for accounts past their grace period | Idempotent; resumable |
| `expire_sessions_and_tokens` | Every 15 min | Delete expired rows | — |
| `archive_audit_events` | Weekly | Move events older than 24 months to cold storage | Verify hash chain before archiving |
| `accretion_report` (SR-D3) | Weekly | Aggregate `source_block_ref.char_count` by work; alert on threshold | Report only; never auto-deletes |
| `stale_config_check` | Weekly | Flag source-directory and emergency-resource entries older than their review window | Admin notification |

Every destructive job logs counts to the audit trail and supports a dry run. A retention job
with a bug is one of the few ways this system can destroy something a user wanted, so the
jobs are treated with the same care as migrations.

---

## 7. Data minimisation choices, and what they cost

| We do not collect | Cost of not collecting |
|---|---|
| Full IP addresses (prefix only) | Coarser abuse investigation |
| Full user-agent strings | Less precise browser bug triage |
| Plaintext email addresses in the database | Slightly more complex lookup; no ability to bulk-mail from a dump — which is the point |
| Message content in logs or error reports | Harder debugging of content-specific bugs; mitigated by user-submitted reproductions |
| Any per-user risk or crisis profile | No trend analysis for safety features; accepted deliberately |
| Third-party analytics | No behavioural funnel data; replaced by first-party event counters with no content |
| Precise geolocation | Emergency resources are chosen by user-selected region rather than inferred location |

The last row is a deliberate trade: inferring location would give better crisis resources
automatically, but it would also mean the product knows where a person is when they type
something desperate. The user selects their region in Settings instead, defaulting from the
browser locale, and can change it at any time.

# Backup & Recovery Plan

**Document 28 of 37** · v1.1

---

## 1. Objectives

| | MVP | At 10,000+ members |
|---|---|---|
| **RPO** (maximum data loss) | 24 hours | 5 minutes (PITR) |
| **RTO** (maximum time to restore) | 8 hours | 2 hours |
| Backup retention | 7 days managed + 90 days off-site | Same |
| Restore rehearsal | Quarterly | Quarterly |

RPO of 24 hours at MVP is a deliberate cost trade. It is stated plainly rather than implied,
and it is revisited at the first paying-member milestone, because losing a day of a pastor's
sermon research is a materially worse outcome than losing a day of most SaaS data.

---

## 2. What is backed up

| Asset | Method | Frequency | Retention | Location |
|---|---|---|---|---|
| PostgreSQL | Managed automated backup | Daily | 7 days | Provider |
| PostgreSQL | PITR / WAL archiving | Continuous | 7 days | Provider (Pro tier) |
| PostgreSQL | Logical dump (`pg_dump`), independently encrypted | Weekly | 90 days | **Backblaze B2 — a different vendor** |
| **Master encryption key** | **Sealed offline escrow** | On change | Indefinite | **Physical, offline, two locations** |
| Application code | Git | Continuous | Indefinite | Git host + local clones |
| Reference data assets | Git | Continuous | Indefinite | Git host |
| Configuration (flags, sources, templates, emergency directory) | In the database | With the database | — | — |
| Secrets (non-master) | Platform secret store + a sealed offline record | On change | — | — |
| Container images | Registry | Per build | 30 days | Registry |

**The off-site weekly dump at a different vendor is the important row.** Managed backups
protect against data corruption. They do not protect against account termination, a billing
dispute, or a provider-side incident that takes the account and its backups together. One
independent copy at an unrelated vendor closes that gap for about ten cents a month.

---

## 3. What is *not* backed up, and why

| Not backed up | Reason |
|---|---|
| Ephemeral conversation bodies | They are never written anywhere. There is nothing to back up — by design |
| Application logs | 30-day rotation; not business-critical |
| Error reports | Provider-retained; not business-critical |
| Deleted users' content | Their key is destroyed; ciphertext in existing backups is inert and ages out |

---

## 4. Backup integrity

| Check | Cadence |
|---|---|
| Backup job completed and size is plausible | Daily, automated, alerts on failure or on an unexpected size change |
| Off-site dump checksum verified after upload | Weekly, automated |
| **Test restore into an isolated environment; schema smoke test; row-count comparison** | **Quarterly, manual, timed and recorded** |
| Master key escrow readable and correct | Annually, witnessed |

**A backup that has never been restored is not a backup.** The quarterly drill is the only
thing that converts a backup policy into a recovery capability, and it is the first task a
busy operator will skip — which is why it appears in the operations calendar with a recorded
duration rather than as a reminder.

---

## 5. Restore procedures

### RB-15 · Restore from backup

```
1. Declare the incident; enable maintenance mode
2. Choose the source:
     · corruption or bad migration → PITR to just before the event
     · provider incident          → most recent managed backup
     · provider account loss      → weekly off-site dump
3. Provision a new database instance (never restore over a live one)
4. Restore; verify: schema version, row counts, audit hash chain
5. Verify decryption: decrypt a sample of records with the production master key
   ← IF THIS FAILS, STOP. The key and the data are mismatched (§5 of DR)
6. Repoint the application; smoke-test the twelve E2E scenarios
7. Disable maintenance mode
8. Communicate: what was lost, what window, what members should check
9. Post-incident review
```

Step 5 is the one an inexperienced operator omits. Restoring ciphertext without confirming
the key matches produces a system that looks healthy and serves unreadable data.

### Restoring a single user's data

More common than a full restore, and it has a hard rule attached.

```
1. Verify the request came from the account owner (authenticated, or a verified
   support channel with re-authentication)
2. Restore the relevant backup into an isolated environment
3. Extract only that user's rows
4. Decrypt with the production master key and their DEK
   ← IF THE USER HAS DELETED THEIR ACCOUNT, THIS FAILS BY DESIGN AND MUST NOT BE
     WORKED AROUND. Their key was destroyed. Explain this honestly
5. Re-import into production, or provide as an export archive
6. Audit the whole operation; notify the user of what was restored
```

Step 4's rule protects the deletion promise. An operator who circumvents it — by restoring an
old key backup, for instance — has broken a commitment made in the Privacy Policy, and the
procedure says so explicitly so nobody does it helpfully.

---

## 6. Recovery scenarios

| Scenario | RPO | RTO | Procedure |
|---|---|---|---|
| Accidental deletion by a user | 0 | Minutes | Soft delete, 30-day recovery in-product |
| Bad migration | Minutes (PITR) | 1–2 h | PITR to just before |
| Database corruption | ≤24 h | 2–4 h | Latest managed backup |
| Database provider incident | ≤24 h | 4–8 h | Restore to a new instance or another provider |
| **Provider account loss** | ≤7 days | 8–24 h | Weekly off-site dump to a new provider |
| Application host failure | 0 | 1–2 h | Redeploy the container elsewhere; data unaffected |
| Region failure | ≤24 h | 8 h | Restore in another region |
| **Master key loss** | — | **Unrecoverable for bodies** | See [Disaster Recovery §5](85-disaster-recovery-plan.md#5-the-master-key) |
| Ransomware / destructive compromise | ≤7 days | 8–24 h | Off-site dump, new infrastructure, full rotation |

---

## 7. Backups and the deletion promise

Restated here because it is where the two policies meet:

- Backups hold **ciphertext** for every sensitive field.
- Account deletion destroys the user's DEK **before** any row deletion.
- A backup taken before deletion, restored after it, yields unreadable data for that user.
- Backups age out on schedule; none is retained indefinitely.
- Disaster recovery **does not resurrect deleted accounts' content**, because the key store is
  backed up separately with its own deletions applied.

This is the operationally honest version of "we delete your data", and it is the version that
appears in the Privacy Policy ([Data Retention §5](../20-data/22-data-retention-and-controls.md#5-backups-and-the-deletion-promise)).

---

## 8. Backup security

- Encrypted in transit and at rest, everywhere.
- The off-site dump is encrypted with an **independent key**, not the application master key,
  so a compromise of one does not compromise the other.
- Access to backup storage is limited to the operator and one break-glass credential held in
  the same sealed escrow as the master key.
- Every restore is an audited event.
- Backup credentials are rotated quarterly.
- **Restores into staging are performed with synthetic backups only.** Production ciphertext
  is not moved outside production — and since the master key is not present in staging, it
  would be inert there in any case. Both facts are stated so the drill's design is understood.

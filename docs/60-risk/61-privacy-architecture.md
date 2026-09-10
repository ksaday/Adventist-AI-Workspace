# Privacy Architecture

**Document 18 of 37** · v1.1

---

## 1. What is actually at stake

Members will type, into this product, things they have told no one:

> "My husband hits me and I've never told anyone at church."
> "I've been stealing from my employer for two years."
> "I don't believe any of it any more and I'm still preaching every Sabbath."
> "I want to die."

A breach here is not a list of email addresses. It is a list of people paired with the thing
that would most damage them. In some jurisdictions, religious affiliation alone is a special
category of personal data; in some places it is dangerous to be identified as a member of a
particular faith community at all.

**This is the threat model that justifies the extra complexity in this design.** Every
decision below — per-user encryption, hashed email lookup, Ephemeral mode, metadata-only
administration, truncated IP addresses — costs something. They are worth it because the
downside is not embarrassment, it is harm to a specific person who trusted a ministry tool.

---

## 2. Privacy by design

| Principle | Applied |
|---|---|
| **Data minimisation** | IP prefixes not full addresses · browser family not full UA · no third-party analytics · no location inference · no risk profiling |
| **Purpose limitation** | Content is used to render the member's own workspace. Nothing else. No training, no analysis, no aggregation of content |
| **Storage limitation** | Retention schedule enforced by jobs, not policy ([Data Retention](../20-data/22-data-retention-and-controls.md)) |
| **Integrity and confidentiality** | TLS in transit · per-user envelope encryption at rest · least privilege · audited access |
| **Accountability** | Append-only hash-chained audit · consent records · break-glass notification |
| **Transparency** | Public disclosure pages · plain-language policy · the honesty contract |
| **User control** | Ephemeral mode · per-message delete · export · real deletion · consent withdrawal |

---

## 3. Encryption design

### 3.1 Envelope encryption

```
MASTER KEY  (platform secret store, never in the database, never in the repo)
    │  wraps
    ▼
USER DEK    (one per user, stored wrapped in user_key)
    │  encrypts (AES-256-GCM)
    ▼
message.body · conversation.title · claim.text
profile.display_name · app_user.email · credential.totp_secret
```

Every ciphertext carries `keyId`, `iv`, `tag`, and **AAD binding `userId ‖ recordId ‖
fieldName`**. The AAD binding means a ciphertext copied into another row, another field, or
another user's record fails to decrypt — which defeats a database-level adversary who can
write but not read.

### 3.2 What this protects against, and what it does not

| Threat | Protected? |
|---|---|
| Stolen database backup | **Yes** — ciphertext without the master key is inert |
| Database-only compromise (SQL injection, exposed replica, provider incident) | **Yes** |
| Malicious or compromised DBA at the hosting provider | **Yes** |
| Compromised application server with the master key in memory | **No** — this is the residual risk |
| Malicious operator with production access | **No** — mitigated by audit and break-glass notification, not prevented |
| Legal compulsion | **No** — we can decrypt for Standard conversations, and the policy says so |

**Standard mode is not end-to-end encrypted, and the product must never imply that it is.**
The Privacy Policy states, in plain words, that a court order or a compromise of our
application servers could expose Standard conversations, and that Ephemeral and (later)
Private modes exist for content where that matters.

Overstating encryption is the most common privacy lie in software, and it is exactly the kind
of claim this product's entire premise forbids.

### 3.3 Key lifecycle

| Event | Action |
|---|---|
| Registration | Generate a 256-bit DEK, wrap under the current master key, store |
| Master key rotation (annual) | Re-wrap every DEK. Ciphertext is untouched — this is the operational payoff of envelope encryption |
| User key rotation (on request or incident) | Generate a new DEK, re-encrypt that user's records in batches, destroy the old wrapped key |
| Account deletion | **Destroy the wrapped DEK first**, then delete rows. An interrupted deletion leaves unreadable residue |
| Key loss | Catastrophic and unrecoverable for message bodies. Offline sealed escrow ([DR §5](../80-ops/85-disaster-recovery-plan.md#5-the-master-key)) |

---

## 4. The three privacy modes

| | **Standard** (default) | **Ephemeral** | **Private** (Horizon 2) |
|---|---|---|---|
| Body stored | Encrypted, per-user DEK | **Never written** | Encrypted with a key derived from the member's passphrase |
| Operator can decrypt | Yes, with the master key | Nothing to decrypt | **No** |
| Survives a page reload | Yes | No — held in browser memory only | Yes |
| Searchable | Client-side | No | No |
| Exportable | Yes | Only by copying before leaving | Yes, with the passphrase |
| Support can help | Yes | No | No |
| Recoverable if the member forgets | n/a | n/a | **No, ever** |
| Default for | P3, P4 | **P2 Prayer Note** | Member's choice |

Ephemeral is the default for Prayer Note because prayer content is the most sensitive
material in the product and the least likely to need retrieval later. A member who wants to
keep a prayer can switch modes in one click, and the switch is explained rather than silent.

Private mode is deferred because the failure mode — a pastor losing two years of sermon
research to a forgotten passphrase — is severe, and the recovery UX needs real design work
rather than a warning dialog.

---

## 5. Third-party AI disclosure

The product must never imply that content stays within our system when the member sends it
elsewhere. Required disclosures:

**At consent (once per version):** the dialog in
[UX §7.1](../50-ux/51-ux-ui-specification.md#71-external-ai-disclosure-first-launch-once-per-version).

**Persistently:** a small marker on every launch button — *"goes to ChatGPT"*.

**In the Privacy Policy:** a section stating that when a member copies a prompt to an external
AI, that content is governed by the provider's terms, that we cannot see or delete it there,
that we do not receive their conversation, and that the member should not send anything they
would not want an AI company to retain.

**What we deliberately do not do:** claim any privacy property about the provider. We do not
say "ChatGPT doesn't train on this" or "Claude deletes it after 30 days", because those are
their claims about their systems and they change. We link to the provider's policy and name
the date we last reviewed it.

---

## 6. Administrative access

**Default: administrators see metadata only.** Conversation counts, apps used, languages,
timestamps, membership state. Never titles, never bodies, never claims.

**Break-glass**, when content access is genuinely required (a lawful order, an abuse
investigation, an explicit user request for help):

```
1. Re-authenticate (password + TOTP, within 15 minutes)
2. Enter a written reason and select a category
3. Access is scoped to one conversation and expires in 60 minutes
4. An audit event records admin, reason, conversation, and timestamp
5. THE AFFECTED USER IS EMAILED WITHIN 24 HOURS — this cannot be suppressed
   from the console; only a documented legal-hold flag defers it, and setting
   that flag is itself audited
6. A monthly break-glass report is reviewed by the owner
```

The unsuppressable notification is what turns "we promise not to look" into something a
member can rely on. An access control that only the accessing party can see is not a control.

**Not available to administrators at all:** bulk content export, cross-user content search,
reading Ephemeral bodies (they do not exist), reading Private bodies (they cannot be
decrypted), and disabling the notification.

---

## 7. Logging and telemetry

| Rule | Enforcement |
|---|---|
| No message bodies, prompts, source text, or claim text in logs | Central scrubber + canary test (SR-9.3) |
| No email addresses in logs | Scrubber; user id only |
| No session tokens in logs | Scrubber |
| Error reports carry no request bodies and no PII | `sendDefaultPii: false`, allowlisted context keys |
| Metric labels contain no user content | Schema-restricted label keys |
| No third-party analytics or session-replay tools | Architectural decision; session replay in this product would be indefensible |
| Product analytics are first-party event counters only | `conversation_created`, `verification_run`, `claim_attested` — counts, never content |

The canary test writes a message containing a unique string and asserts it appears in no log
sink, no error payload, and no metric. It runs in CI and is a release gate.

---

## 8. Regulatory posture

A global membership product is plausibly in scope for GDPR, UK GDPR, Korea's PIPA,
CCPA/CPRA, and Brazil's LGPD. This design does not offer legal conclusions
([Legal Review](66-legal-compliance-review.md)); it implements the mechanisms these regimes
generally require:

| Mechanism | Implementation |
|---|---|
| Lawful basis and consent records | `consent_record`, versioned |
| Right of access | Export (§3 of Data Retention) |
| Right to erasure | Account deletion with crypto-erase |
| Right to rectification | Profile editing; message editing where meaningful |
| Right to portability | JSON + Markdown export |
| Right to object / withdraw consent | Consent withdrawal in Settings |
| Special-category data | Religious belief is inherent to the product; consent is explicit and the purpose is stated plainly |
| Data-processing records | Sub-processor list maintained and published |
| Breach notification | Procedure in the [Operations Plan](../80-ops/82-operations-plan.md) |
| Children's data | Terms set a minimum age; no deliberate collection below it |

**Sub-processors** (published and versioned): hosting provider, database provider, email
provider, billing provider, error reporter, CDN. **AI providers are not sub-processors** —
the member sends content to them directly, under their own account and their own agreement.
This distinction is legally significant and is one more benefit of Tier B.

---

## 9. Privacy decisions and what they cost

| Decision | Benefit | Cost accepted |
|---|---|---|
| Per-user envelope encryption | Backup and database compromise are survivable | No server-side search; more complexity; key management burden |
| Hashed email lookup | A dump is not a membership roster | Slightly more complex auth flows |
| Ephemeral default for P2 | The most sensitive content is never stored | Members lose prayers they might have wanted |
| No third-party analytics | No behavioural profile of the vulnerable exists anywhere | Weaker funnel insight; first-party counters only |
| IP prefixes only | Not a location-tracking dataset | Coarser abuse investigation |
| Metadata-only admin | Members can trust the operator structurally | Harder support; some issues are genuinely unresolvable without the member's cooperation |
| Unsuppressable break-glass notice | The promise is verifiable | Awkward conversations when access was legitimate |
| No content in logs | A log leak is not a content leak | Harder debugging of content-specific bugs |

Every row's cost is real, and each was accepted deliberately rather than by default. The
support cost of metadata-only administration in particular will be felt weekly, and the
correct response is better self-service diagnostics — never a quiet widening of admin access.

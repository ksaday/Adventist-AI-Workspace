# Information Architecture

**Document 6 of 37** · v1.1

---

## 1. Site map

```
/                                  marketing home
├─ /tour                           what it is, honestly framed
├─ /how-verification-works         the three-column honesty contract, public
├─ /pricing
├─ /terms  /privacy  /ai-disclosure  /sources
│
├─ /register  /login  /verify-email  /forgot  /reset
│
└─ /app                            (authenticated)
   ├─ /app                         → redirect to most recent conversation, or /app/new
   ├─ /app/new                     tool chooser
   ├─ /app/p2/:conversationId      Prayer Note
   ├─ /app/p3/:conversationId      Spiritual Guidance
   ├─ /app/p4/:conversationId      Pastor's Aids
   │   └─ /outline                 structured outline workspace
   ├─ /app/verify/:verificationId  verification conversation
   ├─ /app/conversations           list, search, archive, trash
   ├─ /app/settings
   │   ├─ /profile                 name, role, timezone
   │   ├─ /language                UI language, content language override
   │   ├─ /ai                      preferred provider, external-AI consent, [Phase 2] BYOK
   │   ├─ /privacy                 default privacy mode, source retention, consents
   │   ├─ /security                password, 2FA, active sessions
   │   ├─ /membership              tier, usage, billing portal
   │   └─ /data                    export, purge, delete account
   └─ /app/help
       ├─ /evidence-levels
       ├─ /finding-sources
       └─ /safety                  emergency resources, always reachable

/admin                             (admin role, re-auth required)
├─ /admin/users
├─ /admin/memberships
├─ /admin/sources                  Source Directory
├─ /admin/providers                provider deep links, flags
├─ /admin/templates                prompt templates + versions
├─ /admin/emergency                emergency resource directory
├─ /admin/flags
├─ /admin/announcements
└─ /admin/audit
```

---

## 2. Navigation model

**Primary (persistent sidebar):** New Chat · the three tools · recent conversations · search ·
Settings · account.

**Secondary (in-conversation):** rename · duplicate · archive · delete · export · privacy mode ·
linked verifications.

**Tertiary (contextual):** Verify Sources · Source Check · attest · adjust prompt · include
previous turn.

Rules:
- The three tools are always visible, including tools the member's tier does not include —
  gated tools show what they do and what they cost, never a bare lock.
- Verification conversations do **not** appear as top-level items in Recent. They appear
  nested under their origin, because a flat list mixing them is confusing within a week.
- Search is client-side over the loaded conversation index (titles and tags).
- `/app/help/safety` is reachable from every screen, including while a quota is exhausted.

---

## 3. Content hierarchy

```
User
└── Conversation (app, language, privacy mode, tags)
    ├── Message (seq, role)
    │   └── CitationHit (bible | egw, validator status)
    ├── SourceBlock (capped, expiring)
    ├── PromptRun (template version, parameters)
    └── Verification  ←→  origin Conversation
        └── Claim (type, status, evidence level)
            └── EvidenceRecord (level, provenance, artefact)
```

The **Conversation** is the unit of privacy, retention, sharing (none, at MVP), and export.
Choosing it rather than the message as that unit is what makes Ephemeral mode, retention
policy, and export comprehensible to a user in one sentence each.

---

## 4. Naming and labelling

| Concept | Label | Never |
|---|---|---|
| A conversation | "Chat" in UI chrome, "conversation" in prose | "Thread", "session" |
| Our turns | "Workspace" | "Assistant", "AI", "Bot" |
| Pasted turns | Provider name: "ChatGPT", "Claude" | "AI response", "the assistant" |
| The verification conversation | "Source check" in the timeline, "Verification" as a heading | "Fact check" — too broad a claim |
| A claim | "Claim" | "Fact", "Statement" |
| Evidence level | "Evidence" | "Confidence", "Score" |

"Confidence" is specifically avoided: it suggests a probability we have not computed and
cannot compute. "Evidence" describes what actually exists.

---

## 5. URL and identifier design

- Conversation URLs use UUIDv7: `/app/p3/019283a4-…`. Non-enumerable (SR-2.2).
- No conversation is reachable without an authenticated, authorised session. There is no
  public share link at MVP, and adding one would be a privacy-review change.
- Unauthorised access returns 404, not 403 — existence is not confirmed.
- Verification URLs are independent (`/app/verify/:id`) so they can be linked from a
  conversation without nesting the routes.

---

## 6. Search and findability

**MVP: client-side.** The conversation index (id, title, app, tags, updated_at) is fetched
and decrypted in the browser; search filters it. Fast, private, and requires no server-side
index over ciphertext.

Limit: comfortable to roughly 2,000 conversations, beyond which the index fetch becomes
noticeable. Mitigation: paginate the index, search only what is loaded, and offer a date
filter. Server-side blind-index search is Horizon 2.

**Findability aids:** deterministic auto-titles from the first turn; user-editable tags
(plaintext by design, with a note in the UI that tags are not encrypted); filters for app,
date, and "has unverified claims" — the last being genuinely useful for a pastor reviewing
what still needs checking.

---

## 7. State and progressive disclosure

Four states a member must always be able to identify:

| State | Signal |
|---|---|
| **Composing** | Composer focused; language and privacy chips visible |
| **Waiting for the external AI** | Waiting card in the timeline with explicit instructions |
| **Answer received, unverified** | Answer card with the validation summary banner |
| **Verified (in part)** | Ledger with evidence levels; the origin answer shows a compact summary |

Progressively disclosed, in this order: the answer → the validation summary → the ledger →
individual evidence records → the raw prompt that was sent. A member who wants none of it
sees a clean answer; a pastor who wants all of it can reach the exact bytes that were composed.

---

## 8. Responsive breakpoints

| Width | Layout |
|---|---|
| ≥ 1280px | Sidebar + conversation + optional right rail (ledger docked) |
| 1024–1279px | Sidebar + conversation; ledger as an overlay panel |
| 768–1023px | Collapsible sidebar; ledger full-width below the answer |
| < 768px | Drawer sidebar; single column; sticky composer; ledger as cards |

---

## 9. Public content

Deliberately public, before any sign-up:

- **`/how-verification-works`** — the three-column honesty contract, in full. Publishing the
  product's limitations publicly is both the right thing and the most credible marketing
  available to a product whose pitch is honesty.
- **`/sources`** — which external sources the product links to, and the statement that we
  host none of them.
- **`/ai-disclosure`** — what leaves the product, to whom, when.

These pages are indexed, linkable, and quotable. A conference evaluating the tool should be
able to read the whole posture without creating an account.

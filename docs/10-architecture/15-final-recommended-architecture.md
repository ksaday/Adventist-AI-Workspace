# Final Recommended Architecture

**Document 37 of 37** · v1.1 · **This document answers the fifteen mandated questions of §66.**

---

## The recommendation in one page

Build a **TypeScript Next.js monolith** on a **flat-fee container host** with **managed
PostgreSQL** and **self-hosted session authentication**, in which **no server code can call
an AI model** and **no Ellen G. White text is ever stored**. The product's differentiating
machinery — the prompt composer, the Bible and EGW citation validators, and the safety
screener — runs **in the browser against bundled reference data**, at zero marginal cost.
The user's own AI does the thinking, reached by **clipboard copy plus a new tab**. Every
factual claim the AI returns is recorded in a **claim ledger** carrying both a status and an
**evidence level**, and the software is structurally incapable of asserting that a source was
verified when it was not.

**Fixed monthly infrastructure at MVP: US$29–52. Owner-paid AI inference: $0.00, structurally.**

---

## 1. What should be built

**The platform (P0)** — registration, email verification, sessions, profile, three membership
tiers with server-enforced entitlements, conversations with per-user encrypted bodies, an
Ephemeral privacy mode, export, real deletion, an admin console that cannot read private
content without an audited break-glass, and a versioned prompt-template system.

**The round trip** — a deterministic Prompt Composer; Copy Prompt; Open in ChatGPT / Claude /
Gemini with best-effort prefill and an always-first clipboard write; Paste Answer intake with
provider attribution; and an unmistakable visual boundary between our workspace and the
user's external AI.

**The integrity layer — this is the product** — a bundled Bible canon index validating every
reference; a bundled EGW *bibliographic catalogue* validating every work title, abbreviation,
and page plausibility. No verse text is bundled, so verbatim quotation comparison
against the actual text; a claim ledger with five statuses and five evidence levels; a
**Verify Sources** workflow that opens a linked verification conversation; and per-claim user
attestation at the official source.

**The three applications** — Prayer Note (P2), Spiritual Guidance (P3), Pastor's Aids (P4,
text-only, no uploads, with a pre-pulpit Citation Checklist).

**The safety layer** — a client-side multilingual risk lexicon with a non-blocking,
locale-aware resource panel, and prompt clauses that keep the external AI from role-playing
as a clinician, counsellor, lawyer, or pastor.

---

## 2. What should NOT be built

No EGW corpus, database, index, search engine, embeddings, vector store, RAG pipeline, OCR,
PDF ingestion, scraper, mirror, or MCP knowledge server. No application-owned model
inference. No AI provider credential storage of any kind. No iframe embedding, automation,
scraping, or private-API use against any AI provider. No file upload in P4. No server-side
fetching of user-supplied URLs. No claim of guaranteed accuracy or zero hallucination.

Each exclusion carries a concrete enforcement mechanism in
[MVP Scope §6](../00-overview/04-mvp-scope.md#6-negative-scope-and-how-each-exclusion-is-enforced),
because an exclusion with no mechanism is a wish.

---

## 3. Technology stack

TypeScript · Next.js (App Router, Node runtime) · React + Tailwind + Radix primitives ·
Drizzle ORM · PostgreSQL 16+ · Auth.js or Better Auth with server-side sessions · Zod at
every boundary · Playwright + Vitest · Cloudflare in front.

Chosen because every element is portable, widely understood by both human developers and
coding agents, and free of per-request pricing. See
[Architecture Options](11-architecture-options.md).

---

## 4. Hosting architecture

A **single long-running container** on a flat-fee host (**Render** recommended; **Fly.io**
equivalent; **Hetzner + Coolify** as the documented cost-floor migration), with **Cloudflare**
free tier in front for TLS, DDoS protection, and edge caching of reference assets.

Serverless was rejected: request-metered pricing is precisely the unbounded cost shape this
project must avoid, and a $20 plan with metered overage is not a $20 plan.

---

## 5. Authentication

**Self-hosted, server-side opaque sessions** in PostgreSQL, using Auth.js or Better Auth,
with Argon2id password hashing, HttpOnly/Secure/SameSite cookies, breached-password
screening, rate limiting with user-enumeration resistance, and optional TOTP.

Chosen over Clerk/Auth0 for one dominant reason: **per-MAU auth pricing is the largest
variable cost in the entire system** and would reach roughly $1,800/month at 100,000
members — a cost that grows with ministry success and buys nothing the product needs.
See [ADR-0009](../90-decisions/adr/0009-self-hosted-auth.md).

---

## 6. Database

**PostgreSQL**, managed, on a flat-price tier. Relational because the domain is relational:
users own conversations own messages produce claims carrying evidence. JSONB for the
genuinely variable parts (P4 outline structure, template parameters). UUIDv7 identifiers.
No `pgvector`, no corpus tables, and a schema-review gate on any column that could hold
source text.

---

## 7. Membership architecture

**Entitlements are our rows, not the billing provider's.** A `membership` record holds tier,
status, and period end; the billing provider's webhooks are a *signal* that updates it.
This means billing can be switched off entirely (`BILLING_MODE=off`) for development and
pilot operation, the provider can be replaced without touching access control, and a webhook
outage never locks a paying member out.

Three tiers: **Free** (P2/P3, 20 generations and 3 verifications per month, 30-day
retention), **Member** (unlimited, export), **Pastor** (adds P4, outline export, Citation
Checklist). Because the operator pays nothing per generation, quotas exist to bound storage
and abuse — not to ration inference.

**Billing provider: Paddle**, as a Merchant of Record, so a solo operator selling globally
does not have to register for VAT and sales tax in dozens of jurisdictions. Stripe is the
alternative if the operator will handle tax themselves. See
[Billing Architecture](../30-identity/33-billing-architecture.md).

---

## 8. AI interaction model

**MVP: Tier B — user-controlled browser workflow.** Copy the composed prompt, open the
provider in a new tab (with best-effort prefill), converse there, paste the answer back.
Zero owner cost, zero provider-terms risk, works with every provider including ones that do
not exist yet.

**Conditional: Tier C — BYOK Direct Connect.** The member's own API key stored **in their
browser only**, never transmitted to our servers, used for direct browser→provider calls that
stream into our UI. It is **not scheduled**. It is gated on a provider's *published*
documentation sanctioning browser-origin calls with an end-user key
([ADR-0020](../90-decisions/adr/0020-byok-conditional-on-official-support.md)) — vendor silence
is not consent — and it bills the member per call, which the round trip does not.

This means the package has **no scheduled path** to closing the remaining 30–40% of the
ChatGPT-like feel. That is the honest position, and it is stated here rather than left implied
by a Phase 2 that may never arrive.

**Never: Tier A** as a default — an application-owned API key funding user conversations
would reintroduce exactly the unbounded per-token cost this architecture exists to eliminate.
It remains available as a future *enterprise* option where a customer supplies and funds
their own organisational key.

---

## 9. Verification model

**Answer-first by default, source-first when it matters**, with the **evidence ladder** as
the non-negotiable core:

| Level | Meaning | May a claim be shown as VERIFIED? |
|---|---|---|
| E0 | No source offered | No |
| E1 | The model asserted it from memory | No |
| E2 | A second model agreed | **No** — agreement is not evidence |
| E3 | Consistent with source text the member supplied, of unestablished provenance | **No** |
| E4 | **The member** confirmed it at an allowlisted official source | Yes |

Deterministic validators operate independently of all of this and can *falsify* a claim at
any level: a Bible reference that does not exist in the canon is wrong no matter how many
models agree it is right.

The rendering guard (`mayAssertOfficialVerification`, testing `level === 'E4'`) plus a
message-catalogue lint and two database CHECK constraints make it structurally impossible for
the UI to claim official-source verification below **E4**. E3 carries its own status,
`TEXT_CONSISTENT`, and is never green
([ADR-0019](../90-decisions/adr/0019-evidence-ladder-revision.md)).

This is the one anti-hallucination promise the software can actually keep, and it is kept
mechanically. Note what it is *not*: E4 records that **the member says** they confirmed it at an
allowlisted source. The binding proves where they say they looked; it cannot prove that they
looked, or read correctly. That is why the word *you* is always present in the rendering.

---

## 10. How the EGW Library is accessed

By the user, in their own browser, on the official site — reached through links built from
the admin-managed **Source Directory**, never hard-coded, never fetched by our server, never
cached, never indexed. Our system holds the *catalogue* (titles, abbreviations, publisher,
year, page counts, URL templates) and uses it to build accurate links and to catch fabricated
titles. It holds no text.

When a member pastes a passage into their conversation, **it never reaches our server at all**
([ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md)). It stays in their browser
for the working session. We record metadata — kind, character count, attributed work, and a
commitment the browser computed that we cannot verify — capped at 8,000 characters per block
and 40,000 per conversation, and watched by a corpus-formation tripwire that alerts if any
single work accumulates unusual volume across the platform. There is no retention timer because
there is nothing retained.

The member's browser does transmit the passage to the AI provider they choose. That is the
workflow, and it is disclosed — but "our server never receives it" is never shortened to "it
never leaves your machine".

---

## 11. How copyright exposure is minimised

Do not host the corpus. Do not ingest it. Do not index it. Do not cache it. Cap what a user
may paste, expire it, and watch the aggregate. Default the product's answer shape to
**paraphrase with attribution**, not quotation. Where quotation is necessary, keep it brief,
mark it as quotation, attribute it, link to the official source, and never fabricate the
wording. Build no feature whose purpose is bulk reproduction, and provide no bulk export of
source text. Keep the catalogue to facts — title, author, publisher, year, page count, URL.

Full analysis, including the areas that genuinely require counsel, is in
[Copyright Risk Analysis](../60-risk/65-copyright-risk-analysis.md).

---

## 12. Expected fixed monthly infrastructure cost

| Scenario | Fixed monthly | Notes |
|---|---|---|
| MVP / 100 members | **$29–52** | App $7–25 · Postgres $6–19 · email $0 (free tier) · domain $1.25 · Cloudflare $0 · errors $0 |
| 1,000 members | **$45–75** | Larger container, email likely still free tier |
| 10,000 members | **$180–320** | 2 GB container, Postgres 8 GB + replica, email ~$20, errors $26 |
| 100,000 members | **$900–1,600** | Horizontal app tier, Postgres 32 GB + replicas, email ~$90, CDN $20 |

**AI inference cost to the operator at every scenario: $0.00.**
Full derivation, with each vendor classified fixed/variable, in the
[Cost Model](../80-ops/81-cost-model.md).

---

## 13. Variable costs that remain

Four, and only four:

1. **Payment processing** — unavoidable if money is accepted. Paddle ≈ 5% + $0.50 per
   transaction as Merchant of Record; Stripe ≈ 2.9% + $0.30 plus tax handling. Scales with
   revenue, which is the acceptable kind of variable.
2. **Email volume** — free to 3,000/month, then flat tiers. Bounded because transactional
   email is tied to account events, not to usage.
3. **Bandwidth above the plan allowance** — heavily mitigated by Cloudflare caching of
   reference assets; realistically negligible.
4. **Error-event volume** — eliminated entirely by self-hosting GlitchTip if the metered
   tier ever becomes a concern.

None of these can be triggered by a user simply conversing more.

---

## 14. Can the system operate with no application-owned AI API usage?

**Yes — and not as a policy, as a structural property.**

There is no code path from our server to a model, because:

1. **No LLM SDK may exist in the server dependency tree.** CI fails the build on a denylist
   match, including transitive dependencies.
2. **No AI provider API key may exist in the server environment.** The process aborts at
   startup if one is found.
3. **Server egress is allowlisted** to the email provider, the billing provider, and the
   error reporter. Every other outbound connection is refused and raises a security event.
4. **A single audited HTTP client** is the only way out of the server, enforced by a lint rule.

Even a developer who deliberately tried to add a model call would have to defeat four
independent controls, each of which fails a build or a startup. And a monthly invoice review
confirms the property empirically.

The residual case — a user's own conversation — costs the *user*, on their own subscription
or their own key. That is the design.

---

## 15. The biggest remaining risks

| Rank | Risk | Why it is the risk | Mitigation |
|---|---|---|---|
| 1 | **Willingness to pay** for a product that does not include the AI | Members compare a $6/month workbench against a $20/month ChatGPT that "already does this" — and cannot see the fabricated citations they are being protected from | Make the integrity layer visible: show caught errors, show the checklist, show the ledger. Consider free core + paid Pastor tier + ministry funding. Decide with data at month 6 |
| 2 | **Round-trip friction** | Two extra actions per turn is a real tax; on mobile it is worse | Clipboard-first launch, prominent paste target, keyboard shortcuts. **BYOK is no longer the answer here** — it is conditional on published provider sanction ([ADR-0020](../90-decisions/adr/0020-byok-conditional-on-official-support.md)), so this risk is mitigated by UX alone |
| 3 | **The verification workflow becomes ceremony** | Users may click Verify, see model-agreement E2, and feel verified when nothing was verified | E2 can never render as VERIFIED. The UI must make E2 feel unfinished. This is a copy-and-design problem as much as an engineering one |
| 4 | **Fabricated EGW quotations still reach a pulpit** | We cannot check EGW text we do not hold; only the member's own trip to the official library can | The pre-pulpit Citation Checklist blocks "ready" while any citation marked for verbatim public quotation is below **E4**, and P4 defaults EGW emphasis to *leads, not text* |
| 5 | **Provider deep links break** or providers change terms | We depend on third parties we do not control | Config-driven, flag-disabled without a deploy, clipboard fallback always works, provider-neutral by construction |
| 6 | **Copyright judgement on the catalogue and on user-pasted text** | Reasonable people could see the caps and tripwires as insufficient | Counsel review before launch; caps are conservative; the tripwire is the honest admission that accretion is the real risk |
| 7 | **Operator key loss** | Losing the master key destroys every message body irrecoverably | Offline sealed escrow, documented and rehearsed |

---

## Closing statement

This architecture works because it declines to own two things that would otherwise dominate
it: **the corpus** and **the model**. Declining the corpus removes the legal risk, the
ingestion cost, and the authority problem. Declining the model removes the cost risk, the
server-side prompt-injection surface, and the provider lock-in.

What remains — workflow, discipline, and honest bookkeeping about evidence — is small enough
for one person to operate, cheap enough to run indefinitely on a fixed budget, and is
genuinely the part that the members and pastors this is built for are missing today.

# Post-MVP Roadmap — SDA AI Workspace

**Document 33 of 37** · v1.1

Sequencing is by *learning value*, not by build cost. Each horizon states the question it
answers and the evidence that would move it earlier or drop it.

---

## Horizon 1 — Reduce round-trip friction (months 4–7)

| Item | Question it answers | Notes |
|---|---|---|
| **BYOK Direct Connect** ([ADR-0006](../90-decisions/adr/0006-byok-direct-connect.md)) | "Will members pay for a real in-app chat if they bring their own key?" | Browser-only key storage. True streaming. Owner cost still $0. Requires a CSP `connect-src` change, a key-handling security review, and a very explicit consent flow. Expect only 5–15% of members to have an API key — this is a power-user feature, not the default. |
| **UI translations: Korean, then Japanese, Spanish, Portuguese** | "Is the non-English member base real?" | Externalisation is already done. Korean first — it is the primary requested locale and the 화잇 선지자 terminology work is already specified. |
| **Sermon Series (P4)** | "Do pastors organise work across sermons?" | Shared parameters, cross-sermon citation checklist, series-level export. |
| **Improved claim extraction** | "Is the machine block reliable enough in the wild?" | Instrument parse-success rate per provider from MVP telemetry; tune the template. If parse rate is <70% for a provider, redesign the block format for that provider. |
| **Prompt template A/B infrastructure** | "Which template wording actually reduces fabrication?" | Deterministic assignment by template version; measured through the evaluation harness, not through user outcomes. |

**Drop Horizon 1 items if:** verification usage is under 10% of answers at month 6 — in that
case the product's centre of gravity is prompts and workflow, and Horizon 2 becomes the
priority instead.

---

## Horizon 2 — Deepen the workbench (months 6–12)

| Item | Question it answers |
|---|---|
| **Private (E2EE) conversation mode** | "Is operator-undecryptable storage a purchase driver for pastoral use?" Passphrase-derived key, explicit unrecoverable-loss warning, excluded from server search and support access. |
| **Server-side search via per-user blind index** | "Do members outgrow client-side search?" HMAC token index with a per-user key; leaks token frequency, so document the tradeoff before shipping. |
| **Topical Scripture index expansion** | Curated, human-authored, multilingual. The one content asset we can legitimately own and grow. |
| **Additional Bible translations** | Each needs a licence. NKJV, NIV, and Korean 개역개정 are all licensed works — budget for permission or link out instead. |
| **Personal source library** | Let a member keep *their own* verified passages across conversations — with hard caps and the SR-D3 accretion tripwire watching. This is the most dangerous feature in the roadmap: it is how a corpus forms by accident. Requires an explicit design gate. |
| **Outline-to-manuscript assistance (P4)** | Structured expansion prompts, still round-tripped. |
| **Google sign-in, TOTP 2FA rollout** | Reduce credential-stuffing surface. |

---

## Horizon 3 — Beyond the individual (months 12–24)

| Item | Question it answers |
|---|---|
| **Church / organisation accounts** | "Will conferences or churches buy seats?" Different buyer, invoicing, seat management, admin delegation, shared template library. Materially changes billing architecture — plan a spike first. |
| **Shared prompt-template library** | Let pastors publish templates to their church or publicly. Moderation burden. |
| **Mobile applications** | Only if mobile web usage exceeds ~40% and the clipboard round trip proves painful on mobile — which it will. A native share-sheet integration is genuinely better on mobile than the web clipboard, so this may arrive earlier than expected. |
| **Browser extension for answer capture** | Reduces the round trip to one click. Requires a written ToS review per provider; a user-initiated "send selection to workspace" context action is far more defensible than any page-reading approach. Conditional on that review. |

---

## Conditional track — Official source integration

This track is gated entirely on permission, not on engineering.

| Stage | Trigger | Result |
|---|---|---|
| Approach the Ellen G. White Estate | Product has demonstrated traction and a clean copyright posture | Written request describing exactly what the product does and does not store |
| If a licensed API or content agreement is granted | Written agreement in hand | The system could compare against text of **established provenance** — which is a different thing from today's E3 and would justify a new rung, not a reuse of E3. A step-change in product value, and a new ADR |
| If permission is refused or unanswered | Default | Nothing changes. The architecture was designed for this outcome, which is why it is the default. |

**No engineering work on this track begins before written permission exists.** The
temptation to "prepare the ingestion pipeline in advance" is precisely the failure mode this
architecture exists to prevent.

Parallel, lower-risk version of the same idea: several Bible APIs offer free tiers with
clear terms. Integrating a *Bible* text API is uncontroversial and can raise Scripture
claims to a genuine provenance-backed comparison automatically — again, a new rung rather than
today's E3. This should be evaluated in Horizon 2.

---

## Explicitly not on the roadmap

- Hosting, indexing, or embedding Ellen G. White writings under any circumstances short of
  a written agreement.
- Application-owned model inference funded by the operator.
- Any automation of a third-party AI provider's web interface.
- Becoming a doctrinal authority, an answer engine, or a substitute for pastoral care.

---

## Roadmap decision calendar

| When | Decision | Input |
|---|---|---|
| Month 3 | Ship or hold BYOK | Round-trip abandonment rate; support volume about copy/paste |
| Month 6 | Verification-first or workflow-first product | % of answers with ≥1 verification run |
| Month 9 | Pursue organisation accounts | Inbound requests from churches/conferences |
| Month 12 | Approach the EGW Estate | Traction, clean compliance record |
| Month 12 | Mobile native | Mobile share of sessions, mobile abandonment delta |

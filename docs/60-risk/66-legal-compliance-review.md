# Legal & Compliance Review

**Supporting document (§53)** · v1.1

> **This document identifies areas of legal risk and describes architectural mitigations.
> It contains no legal conclusions and is not legal advice. Every item marked `⚖` requires
> qualified counsel in the operator's jurisdiction before launch.**

The document separates, as required by §53:

- **Architecture mitigation** — what the design does to reduce exposure. This is engineering.
- **Requires counsel** — what only a lawyer can answer. This is not engineering, and the
  design must not pretend otherwise.

---

## 1. Risk register, by area

### 1.1 Copyright

| Risk | Architecture mitigation | Requires counsel |
|---|---|---|
| Reproducing EGW writings | No corpus, no ingestion, no index, no serving. Nothing to reproduce | ⚖ Confirm the catalogue-only posture is sufficient |
| The bibliographic catalogue | Facts only; own compilation; provenance recorded; no expressive content | ⚖ Database/compilation rights, especially EU/UK sui generis |
| User-pasted excerpts | Caps, expiry, encryption, no redistribution, accretion tripwire, takedown process | ⚖ Safe-harbour framework and its requirements |
| KJV bundling | **Excluded** — no verse text ships ([ADR-0021](../90-decisions/adr/0021-no-bundled-verse-text.md)) | Closed. The UK question was the royal prerogative exercised through perpetual **letters patent** — distinct from Crown copyright under CDPA s.163 — and it is resolved by declining the risk |
| Prompting a model about protected works | Paraphrase-first templates; leads-not-text default; no bulk features | ⚖ Contributory exposure |
| Bible translations beyond KJV | Not shipped | ⚖ Per-translation licensing when the time comes |

Full analysis: [Copyright Risk Analysis](65-copyright-risk-analysis.md).

### 1.2 Trademark and branding

| Risk | Architecture mitigation | Requires counsel |
|---|---|---|
| **Use of "SDA" / "Seventh-day Adventist" in the product name** | Product name is configuration and message-catalogue content, not hard-coded — a rename is cheap | ⚖ **Highest-priority question.** May require permission or a name change |
| Implying denominational endorsement | Prominent independence disclaimer in the footer, Terms, and About page | ⚖ Adequacy of the disclaimer wording |
| Use of the Ellen G. White Estate's name or marks | Nominative reference to works by title only; no logos or site branding | ⚖ Nominative fair use limits |

### 1.3 Third-party terms of service

| Risk | Architecture mitigation | Requires counsel |
|---|---|---|
| AI provider terms | **No automation, scraping, credential handling, private APIs, or iframes.** Only ordinary navigation and clipboard — the same actions any user performs manually | ⚖ Confirm that deep-linking with a query parameter is acceptable under each provider's terms |
| Official EGW Library terms | No scraping, no caching, no mirroring; one `HEAD` probe per entry per day | ⚖ Confirm the probe is acceptable; disable if not |
| Bible site terms | Link only | ⚖ |
| A future browser extension | Not built. User-initiated selection copying only, if ever | ⚖ Per-provider review before any such work |

### 1.4 Privacy and data protection

| Risk | Architecture mitigation | Requires counsel |
|---|---|---|
| Special-category data (religious belief) | Inherent to the product; explicit consent; purpose stated plainly; encryption; minimisation | ⚖ Lawful basis; whether explicit consent suffices across GDPR, PIPA, LGPD |
| Global membership | Export, deletion, rectification, portability, consent records all implemented | ⚖ Which regimes apply given the operator's establishment; whether a representative is required |
| Cross-border transfers | Sub-processors published; hosting region selectable | ⚖ Transfer mechanisms (SCCs and equivalents) |
| Breach notification | Procedure and timelines in the [Operations Plan](../80-ops/82-operations-plan.md) | ⚖ Statutory windows per regime |
| Children | Minimum age in the Terms; no deliberate collection below it | ⚖ COPPA and equivalents; age-assurance expectations |
| Analytics and tracking | None. No third-party analytics, no session replay, no advertising | ⚖ Cookie-consent obligations (minimal, since only essential cookies are used) |

Full design: [Privacy Architecture](61-privacy-architecture.md).

### 1.5 Consumer, subscription, and tax

| Risk | Architecture mitigation | Requires counsel |
|---|---|---|
| Global VAT / GST / sales tax | **Merchant-of-Record billing provider is the seller of record and remits** | ⚖ Confirm the MoR arrangement covers the operator's situation |
| Auto-renewal disclosure rules | Clear renewal terms, pre-renewal notice, cancellation in two clicks, no cancellation dark patterns | ⚖ Jurisdiction-specific auto-renewal statutes |
| Refund and cooling-off rights | 14-day no-questions refund policy | ⚖ EU/UK distance-selling rights for digital content |
| Price and currency presentation | Handled by the provider's localised checkout | ⚖ |

### 1.6 Liability and duty of care

| Risk | Architecture mitigation | Requires counsel |
|---|---|---|
| A member acts on incorrect AI output | The product never asserts correctness; evidence levels are explicit; the honesty contract is published; the AI is the member's own | ⚖ Limitation-of-liability drafting |
| **Harm following a missed crisis signal** | Non-blocking resource panel; prompt-level safety clause; explicit "not a crisis service" statements; professional-role disclaimers | ⚖ **Duty of care and its limits — high priority** |
| Perceived unauthorised practice (counselling, medicine, law) | Named "Spiritual Guidance", not "Counselling"; explicit non-professional disclaimers in product, prompts, and Terms | ⚖ Adequacy of the disclaimers |
| Mandatory reporting after a disclosure seen through break-glass | Operator does not routinely see content; break-glass is exceptional, audited, and notified | ⚖ **Does receiving such a disclosure create an obligation? Jurisdiction-specific** |
| Defamation in user-generated content about a named person | No public sharing at MVP; content is private to its author | ⚖ Revisit before any sharing feature |

### 1.7 Doctrinal and reputational

| Risk | Architecture mitigation | Requires counsel |
|---|---|---|
| Product perceived as a doctrinal authority | Explicit disclaimers; "defer to your local pastor" clause; a required uncertainty band in every P3 answer | Not a legal question — an owner and pastoral-advisory question |
| Output that misrepresents Adventist teaching | Denominational-accuracy clause on sensitive topics; pastoral advisory review of templates | Not legal |
| A fabricated EGW quotation reaching a pulpit through our product | The entire verification architecture; the P4 Citation Checklist | Not legal, but reputationally the most serious risk in the product |

---

## 2. Required documents before launch

| Document | Notes |
|---|---|
| **Terms of Service** | Must cover: acceptable use, the external-AI relationship, no warranty of accuracy, not professional advice, subscription and auto-renewal terms, refunds, termination, governing law, minimum age, DMCA/takedown contact |
| **Privacy Policy** | Must cover: what is collected, encryption and its limits (**including that Standard mode is operator-decryptable**), retention schedule, the sub-processor list, user rights, third-party AI disclosure, deletion and its interaction with backups, the commitment never to sell or share content |
| **AI Disclosure page** | Public, no sign-up. What leaves the product, to whom, when, and under whose terms |
| **How Verification Works page** | Public. The three-column honesty contract in full |
| **Sources page** | Which external sources are linked and the statement that none are hosted |
| **Independence disclaimer** | Footer, Terms, About |
| **Takedown / rights contact** | Published address and an internal runbook |
| **Sub-processor list** | Versioned and dated |

Drafting from templates is acceptable for the first four; **counsel review is required for the
Terms and Privacy Policy** given the special-category data and the global audience.

---

## 3. Compliance posture summary

| Regime | Plausibly in scope | Principal mechanisms already implemented |
|---|---|---|
| GDPR / UK GDPR | Yes | Consent records, export, erasure with crypto-erase, minimisation, sub-processor list, breach procedure |
| PIPA (Korea) | Yes — Korean is a primary target locale | Consent, deletion, retention limits, encryption |
| CCPA / CPRA | Yes | Access, deletion, no sale or sharing of personal information |
| LGPD (Brazil) | Possible | Same mechanisms |
| PIPEDA (Canada) | Possible | Same |
| PCI DSS | **Out of scope** | Hosted checkout only; no card data touches our systems |
| HIPAA | **Out of scope** | Not a covered entity; no treatment relationship. Members may nonetheless disclose health information, which is why encryption and minimisation matter regardless |
| COPPA | Avoided by policy | Minimum age in the Terms |

---

## 4. Pre-launch legal checklist

- [ ] ⚖ Trademark question resolved — product name confirmed or changed
- [ ] ⚖ KJV bundling decision made and the module configured accordingly
- [ ] ⚖ EGW catalogue scope confirmed
- [ ] ⚖ User-pasted-excerpt posture and takedown process confirmed
- [ ] ⚖ Terms of Service reviewed
- [ ] ⚖ Privacy Policy reviewed
- [ ] ⚖ Liability and duty-of-care limitations drafted
- [ ] ⚖ Mandatory-reporting question answered for the operator's jurisdiction
- [ ] ⚖ Auto-renewal and refund terms confirmed for target markets
- [ ] ⚖ MoR arrangement confirmed as covering the operator's tax position
- [ ] Business entity and operator establishment decided (this determines most of the above)
- [ ] Sub-processor list published
- [ ] Takedown contact published and the runbook written
- [ ] Independence disclaimer live in all three locations
- [ ] Pastoral advisory review of P2 and P3 templates recorded

**The business-entity question is listed near the end but should be answered first**, because
the operator's country of establishment determines the applicable copyright analysis, the tax
posture, the data-protection regime, and the governing law of the Terms. Building the product
does not depend on it; launching does.

---

## 5. Ongoing obligations

| Obligation | Cadence | Owner |
|---|---|---|
| Sub-processor list accuracy | On every change | Operator |
| Provider terms re-review | Quarterly | Operator |
| Source Directory review | Quarterly | Administrator |
| Emergency resource verification | Annually | Administrator |
| Privacy Policy review | Annually or on change | Operator + counsel |
| Accretion report review | Weekly | Administrator |
| Break-glass access review | Monthly | Owner |
| Retention job verification | Monthly | Administrator |

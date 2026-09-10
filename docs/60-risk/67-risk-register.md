# Risk Register

**Document 35 of 37** · v1.1

Scoring: **P**robability 1–5 × **I**mpact 1–5 = **Score**. Reviewed quarterly, and on any
phase transition.

---

## 1. Top risks

| ID | Risk | P | I | Score | Owner | Response |
|---|---|--:|--:|--:|---|---|
| **R-01** | **Members will not pay for a product that does not include the AI** | 4 | 5 | **20** | Owner | Mitigate |
| **R-02** | **Copy-paste round-trip friction drives abandonment** | 4 | 4 | **16** | Product | Mitigate |
| **R-03** | Verification is used once and abandoned as ceremony | 4 | 4 | **16** | Product | Mitigate + measure |
| **R-04** | Trademark objection to "SDA" in the product name | 3 | 4 | **12** | Owner | Resolve pre-launch |
| **R-05** | Members misread E2 (model agreement) as verification | 3 | 4 | **12** | Design | Mitigate |
| **R-06** | A fabricated EGW quotation reaches a pulpit via our product | 3 | 4 | **12** | Product | Mitigate |
| **R-07** | Provider deep links break or providers change terms | 4 | 2 | **8** | Engineering | Absorb (fallback exists) |
| **R-08** | Rights-holder objection to the catalogue or pasted excerpts | 2 | 4 | **8** | Owner | Prepare response |
| **R-09** | Compromise of the application server exposes Standard content | 2 | 5 | **10** | Engineering | Mitigate |
| **R-10** | Master key loss destroys all message bodies | 1 | 5 | **5** | Operations | Mitigate |
| **R-11** | Solo-operator bus factor | 3 | 4 | **12** | Owner | Mitigate |
| **R-12** | Safety screening misses a crisis | 3 | 5 | **15** | Owner | Mitigate + accept residual |
| **R-13** | KJV bundling determined to be impermissible | 2 | 2 | **4** | Owner | Contingency ready |
| **R-14** | Claim-block parse rate too low with a major provider | 3 | 3 | **9** | Engineering | Measure + adapt |
| **R-15** | Infrastructure vendor raises prices or changes model | 2 | 3 | **6** | Operations | Portability is the mitigation |
| **R-16** | Accidental corpus formation through user pastes | 2 | 4 | **8** | Administrator | Tripwire + gate |
| **R-17** | Product perceived as a doctrinal authority | 3 | 3 | **9** | Owner | Mitigate |
| **R-18** | An AI provider ships an equivalent feature natively | 3 | 3 | **9** | Owner | Accept + differentiate |

---

## 2. The top five, in detail

### R-01 · Willingness to pay — score 20

**The risk.** A member compares "$5/month for a workbench" with "$20/month for ChatGPT, which
already answers my question", and cannot see the fabricated citation they were protected from.
Invisible value is unpaid-for value.

**Why it is the top risk.** Every technical risk in this register has a known mitigation. This
one determines whether the product has a business at all, and no amount of engineering
excellence addresses it.

**Mitigations**
- **Make the protection visible.** Show caught errors explicitly: "we found 2 problems in this
  answer". A running per-member count of caught fabrications is the single most persuasive
  artefact the product can produce.
- **Lead with the Pastor tier.** Pastors have a professional need, a study budget, and a
  concrete fear — misquoting from a pulpit. Willingness to pay is materially higher and the
  value is easier to see.
- **A genuinely generous free tier**, so the value is experienced before it is priced.
- **Test donation and pay-what-you-want pricing** against fixed pricing; for a ministry
  product this may outperform, and the architecture supports it trivially.
- **Keep the institutional path open.** `BILLING_MODE=off` with `DEFAULT_PLAN=member` means a
  conference or publishing house could fund the whole thing. This may be the right answer.

**Decision point.** Month 6: if free→paid conversion is below 3%, change the model rather than
the product.

### R-02 · Round-trip friction — score 16

**The risk.** Two extra actions per turn, worse on mobile. Members try it, find it tedious,
and return to ChatGPT alone.

**Mitigations**
- Clipboard-first launch so the prompt is never lost.
- One-click launch with best-effort prefill.
- Prominent paste target, auto-focused, with keyboard shortcuts.
- Explicit waiting state so the member always knows where they are.
- **P2's local drafting path**, which produces a real prayer with no round trip at all — the
  best onboarding surface for exactly this reason.
- ~~BYOK Direct Connect~~ — **no longer available as a mitigation.** It is conditional on
  published provider sanction ([ADR-0020](../90-decisions/adr/0020-byok-conditional-on-official-support.md))
  and cannot be scheduled. R-02 is now mitigated by clipboard and launch UX alone, which is a
  genuine reduction in this risk's treatment and is recorded here rather than papered over.
- Native share-sheet integration on mobile, where it is materially better than the clipboard.

**Accepted.** The round trip is inherent to the architecture. The product must be worth it, or
the architecture must change — and the honest place to make that call is with data at month 3.

### R-03 · Verification as ceremony — score 16

**The risk.** Members click Verify Sources once, see a wall of E1 and E2, learn nothing
actionable, and never click it again.

**Mitigations**
- **Deterministic findings appear first**, before any AI step. Catching "The Path to Christ"
  and "John 3:99" for free is immediate, concrete value that requires no second AI and no
  tokens.
- The Citation Checklist gives P4 a hard, valuable use.
- E2 and E3 are designed to *feel unfinished*, with a clear next action toward **E4**. E3 in
  particular must not read as an arrival — it is consistency with text of unknown provenance.
- Instrument the north-star metric — % of answers with ≥1 verification run — from day one.

**Decision point.** Month 6: below 10% means this is a workflow product with a verification
feature, and the roadmap, pricing, and positioning should all change accordingly.

### R-12 · Safety screening misses a crisis — score 15

**The risk.** A member in genuine danger writes something the lexicon does not match, receives
no resources, and is harmed.

**Mitigations**
- Recall-tuned, per-language lexicons authored by fluent speakers, not translated.
- The prompt-level safety clause, which reaches the member's own AI — a model that actually
  comprehends the whole message.
- Emergency resources permanently reachable at `/app/help/safety` from every screen.
- Annual review of lexicons and directory; review after any incident.

**Residual accepted, and stated.** A keyword system will miss disclosures. The product is not
a crisis service and must never be mistaken for one. If members begin using it as one, the
correct response is partnership with organisations that are, not more crisis features
([Safety Architecture §11](64-safety-architecture.md)).

### R-11 · Bus factor — score 12

**The risk.** One person holds the design, the operations, the secrets, and the relationships.
Illness or loss of interest ends the service, and members lose their study.

**Mitigations**
- **This documentation package.** It exists partly for this reason.
- Runbooks for every operational task ([Operations Plan](../80-ops/82-operations-plan.md)).
- Sealed offline escrow of the master key with documented recovery
  ([Disaster Recovery §5](../80-ops/85-disaster-recovery-plan.md#5-the-master-key)).
- Export available to every member at any time — **no member is ever trapped**.
- A documented wind-down procedure: 90 days' notice, exports enabled for all tiers, no new
  charges. Writing this before it is needed is a kindness to future members and to a future
  operator.
- Standard, portable technology throughout, so a successor can pick it up.

---

## 3. Risks explicitly accepted without further mitigation

| Risk | Why accepted |
|---|---|
| We cannot verify EGW text we do not hold | This is the design. The alternative is a corpus, which is rejected |
| An external model may fabricate despite our instructions | Not controllable. Mitigated downstream, never eliminated |
| A malicious browser extension can read anything the member sees | Outside the boundary. Documented honestly |
| Single instance means occasional downtime | 99.5% target accepted in exchange for simplicity and cost |
| Client-side search does not scale past ~2,000 conversations | Server-side blind index in Horizon 2 |
| Mobile round trip is worse than desktop | Acknowledged; native apps are the eventual answer |
| A member can deceive themselves by forging their own evidence | Not a meaningful threat |

---

## 4. Risk review cadence

| When | What |
|---|---|
| Quarterly | Full register review; re-score; retire and add |
| Phase transitions | Review risks specific to the phase entered |
| Post-incident | Add or re-score anything the incident revealed |
| Month 3 | R-02 review — round-trip data assessed as a product question. **No automatic BYOK trigger exists** |
| Month 6 | R-01 and R-03 decisions — pricing model, and product centre of gravity |
| Pre-launch | R-04 and R-13 must be closed |

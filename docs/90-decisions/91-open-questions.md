# Open Questions

**Document 34 of 37** · v1.1

Questions that must be answered before or during implementation. Each has an owner, a
blocking status, and a proposed default so that work can proceed if the answer is delayed.

**Blocking** = implementation or launch cannot proceed without it.
**Deferred** = a default is in place and can be revisited.

---

## Legal (⚖ — all require counsel)

| # | Question | Blocks | Owner | Default if unanswered |
|---|---|---|---|---|
| **Q-01** | May an independent product use "SDA" / "Seventh-day Adventist" in its name? What disclaimer is required? | **Public launch** | Owner + counsel | Prepare an alternative name. The name is message-catalogue content, so a rename is a content change |
| ~~**Q-02**~~ | **CLOSED.** May the operator redistribute KJV text, given the UK royal prerogative exercised through perpetual letters patent — distinct from Crown copyright under CDPA s.163 — and a global audience? | Resolved by [ADR-0021](adr/0021-no-bundled-verse-text.md) | Owner + counsel | **Answered by declining the risk: no verse text ships, in any translation.** Reference-structure validation only. Revisit only on counsel's initiative |
| **Q-03** | Does receiving a child-abuse disclosure through break-glass access create a mandatory-reporting obligation in the operator's jurisdiction? | **Launch** | Owner + counsel | Document the uncertainty in the runbook; minimise the operator's exposure to content |
| **Q-04** | What safe-harbour framework applies to storing user-pasted excerpts, and what does it require? | Takedown process | Owner + counsel | Publish a takedown contact and respond within 48 hours regardless |
| **Q-05** | Does a compilation or database right attach to the EGW bibliographic catalogue? | Catalogue scope | Owner + counsel | Compile from multiple public sources; record provenance per record; keep it facts-only |
| **Q-06** | Is a daily `HEAD` reachability probe acceptable under the target sites' terms? | The probe | Owner | Disable the probe; rely on user reports |

**Q-01 is the highest-priority open question in the package.** It is more likely to produce a
letter than any of the copyright questions, and it is cheapest to resolve before there is
traction and branding to unwind.

---

## Product and design

| # | Question | Blocks | Owner | Default |
|---|---|---|---|---|
| **Q-07** | Should prompt scaffolding be translated into the user's language, or stay English with an answer-language instruction? | Korean launch | Product | English scaffolding + explicit instruction. **A/B in the evaluation harness before the Korean launch** — this may materially affect output quality |
| **Q-08** | What are the right pricing points? Is fixed pricing correct at all for a ministry product, versus donation or institutional funding? | Billing go-live | Owner | $0 / $5 / $12, annual promoted. Test donation pricing in Horizon 1 |
| **Q-09** | Should the P2 structural frame default to expanded or collapsed? | P2 polish | Design + pastoral reviewer | Collapsed, with "one helpful pattern" copy visible. Expanding it foregrounds formula over relationship |
| **Q-10** | Should verification conversations be nested under their origin, or listed flat with a badge? | IA polish | Design | Nested. Revisit if usability testing shows nesting is missed |
| **Q-11** | How generous should the Free tier actually be, given zero marginal inference cost? | Launch | Owner | 20 generations / 3 verifications / 30-day retention. Raise it if conversion data suggests the limit is teaching people the product does not work |
| **Q-12** | Should the anonymous P2 drafting path (C-04 in the [Critical Review](92-critical-review.md)) ship at MVP? | MVP scope | Owner | **Recommended yes** — the engine is client-side already and it converts the product's weakest moment into its best demonstration |

---

## Technical (`[VERIFY]` at implementation time)

| # | Question | Blocks | Owner | Default |
|---|---|---|---|---|
| **Q-13** | What query parameter, if any, does each provider currently accept for composer prefill, and what is the safe length? | Launch polish | Engineering | Copy-only for any provider without a verified template. Cap 2,000 characters. Re-verify quarterly |
| **Q-14** | **Blocking gate, not an implementation detail.** Does each provider's *published documentation* sanction browser-origin API calls carrying an end-user key? Vendor silence is not consent, and CORS permitting a call is not the same as the provider sanctioning the practice | **Conditional BYOK** ([ADR-0020](adr/0020-byok-conditional-on-official-support.md)) | Owner + engineering | Tier C stays blocked, per provider, until published sanction exists. Tier B covers every provider meanwhile |
| **Q-15** | What are the official EGW Library's current URL templates for search and per-work navigation? | Source Directory seeding | Administrator | A plain search URL only, with `last_reviewed` recorded |
| **Q-16** | What is the real claim-block parse-success rate per provider in the wild? | Template tuning | Engineering | Instrument from day one; redesign the format for any provider below 70% |
| **Q-17** | Will client-side conversation search remain acceptable past ~2,000 conversations? | Horizon 2 | Engineering | Paginate the index; add a blind index when the data demands it |
| **Q-18** | Argon2id parameters tuned to the production instance for a ~250 ms verification | Launch | Engineering | OWASP baseline (m=19456, t=2, p=1), re-tuned on real hardware |
| **Q-19** | Is Sentry's free tier sufficient, or should GlitchTip be self-hosted from the start? | Launch | Engineering | Sentry free; switch when volume approaches the cap |
| **Q-20** | Where should the operator's infrastructure be located, given the member base and data-protection regimes? | Launch | Owner + counsel | Follows from the business-entity decision (Q-25) |

---

## Content and pastoral

| # | Question | Blocks | Owner | Default |
|---|---|---|---|---|
| **Q-21** | Who performs the pastoral advisory review of the P2 frame, the P3 denominational clause, and the terminology table? | **MVP release** | Owner | Must be identified before the templates are finalised. This is a release gate, not a nice-to-have |
| **Q-22** | Is **화잇 선지자** the right default for all Korean-speaking Adventist audiences, or should it vary? | Korean launch | Owner + pastoral reviewer | 화잇 선지자 as specified, in a configurable per-locale table ([C-11](92-critical-review.md)) |
| **Q-23** | Who authors the risk lexicons for Korean, Japanese, and Spanish? They must be written, not translated | Safety in those locales | Owner | English only until a qualified author is found for each language. **Do not ship a translated crisis lexicon** |
| **Q-24** | Which emergency resources are correct for each seed region, and who verifies them annually? | **MVP release** | Owner | Every number verified before launch. A stale hotline is the worst defect this product could ship |

---

## Business

| # | Question | Blocks | Owner | Default |
|---|---|---|---|---|
| **Q-25** | What business entity, in what jurisdiction? | Billing go-live, and most legal questions | Owner | **Answer this first.** It determines the copyright analysis, the tax posture, the data-protection regime, and the governing law |
| **Q-26** | Should the Ellen G. White Estate be approached proactively, and when? | Nothing — the product works either way | Owner | Month 12, after traction and with a clean compliance record ([Roadmap](../00-overview/05-post-mvp-roadmap.md)) |
| **Q-27** | Is institutional sponsorship (a conference or publishing house) a realistic funding path? | Nothing | Owner | Keep `BILLING_MODE=off` viable; it costs nothing to preserve the option |
| **Q-28** | What is the wind-down commitment, and should it be published? | Nothing | Owner | **Publish it.** 90 days' notice, exports for all tiers, no new charges. It costs nothing now and it is what members deserve |

---

## Resolution schedule

| When | Must be resolved |
|---|---|
| Before Phase 0 | Q-25 (entity) |
| Before Phase 4 (P2) | Q-21 (pastoral reviewer identified), Q-09 |
| Before Phase 7 (verification) | Q-15, Q-16 |
| Before Phase 10 (production readiness) | Q-01, Q-02, Q-03, Q-04, Q-05, Q-13, Q-18, Q-24 |
| Before the Korean launch | Q-07, Q-22, Q-23 |
| Before any BYOK work begins at all | Q-14 — it is the gate, not a prerequisite to schedule around |
| Month 3 | Q-11, Q-12 revisited with data |
| Month 6 | Q-08 revisited with conversion data |
| Month 12 | Q-26, Q-27 |

---

## Questions this design deliberately does not ask

| Not asked | Why |
|---|---|
| "Should we build an EGW corpus after all?" | Settled by [ADR-0001](adr/0001-no-p1-knowledge-server.md) and [ADR-0002](adr/0002-no-egw-corpus.md). Reopening it requires written permission from the rights holder, not a design discussion |
| "Should we fund AI inference to improve the experience?" | Settled by [ADR-0004](adr/0004-no-app-owned-llm-inference.md). The cost curve is disqualifying |
| "Could we automate the provider interaction just a little?" | Settled by [ADR-0014](adr/0014-no-unofficial-automation.md). It would put members' provider accounts at risk |
| "Can we show 'verified' if two models agree?" | Settled by [ADR-0010](adr/0010-evidence-ladder.md), and enforced by a database constraint so the question cannot be reopened by accident |

These are listed because each will be raised again, by someone reasonable, for a good reason.
The answer is in the ADR, and the ADR is where the discussion belongs.

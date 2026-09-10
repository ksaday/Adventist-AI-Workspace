# SDA AI Workspace — Design & Planning Package

**Status:** Design complete · Not implemented · Ready for implementation hand-off
**Version:** 1.1
**Date:** 2026-09-10
**Scope:** P0 Common Platform · P2 Prayer Note · P3 Spiritual Guidance · P4 Pastor's Aids
**Explicitly out of scope:** P1 EGW Knowledge Server (see [ADR-0002](docs/90-decisions/adr/0002-no-egw-corpus.md))

---

## What this repository is

This repository contains **design and planning documents only**. There is no application
source code, no dependency manifest, no build tooling, and no prototype. Every artifact
here is intended to be read by a professional development team or an AI coding agent that
will perform the implementation later.

Illustrative SQL DDL, JSON shapes, and prompt-template text appear inside the design
documents because they *are* the specification. They are design artifacts, not a codebase.

---

## The product in one paragraph

SDA AI Workspace is a membership web application that helps Seventh-day Adventist members
and pastors do source-disciplined spiritual work with **their own AI accounts**. The
application never hosts Ellen G. White writings and never pays for AI inference. Instead it
is a **citation-integrity workbench**: it composes rigorous, source-bounded prompts, hands
them to the user's own ChatGPT / Claude / Gemini session, accepts the answer back, breaks it
into individual claims, checks every Bible reference deterministically against a canon
index, checks every Ellen G. White citation against a bibliographic catalogue (titles and
abbreviations only — never text), and records exactly *what kind of evidence* supports each
claim, using an explicit evidence ladder that never overstates what was actually verified.

---

## The five decisions that define this architecture

| # | Decision | Why it matters | ADR |
|---|---|---|---|
| 1 | **No EGW corpus, ever.** The app holds a *catalogue* (≈200 work titles, abbreviations, canonical URLs). We do not collect, ingest, host, index, or hold EGW text as a source, and member-supplied source text never reaches our server at all. | Removes the entire copyright, ingestion, OCR, and hosting risk surface. Catalogue ≠ corpus. | [ADR-0002](docs/90-decisions/adr/0002-no-egw-corpus.md), [ADR-0022](docs/90-decisions/adr/0022-no-server-side-source-text.md) |
| 2 | **No LLM inside our trust boundary.** The server never calls a model. All inference happens in the user's own AI session or in the user's browser. | Owner AI cost is structurally $0, not merely budgeted to $0. It also removes server-side prompt injection entirely. | [ADR-0004](docs/90-decisions/adr/0004-no-app-owned-llm-inference.md) |
| 3 | **The evidence ladder, not a verified/unverified boolean.** Every claim carries both a *status* and the *kind of evidence* behind it (E0 none → E4 confirmed by the member at the official source). **Only E4 may be shown as verified, or in green.** | "Two models agreed" is not source verification — and neither is "it matches text I pasted in", because that text has no established provenance. | [ADR-0019](docs/90-decisions/adr/0019-evidence-ladder-revision.md) |
| 4 | **Deterministic validators do the real anti-hallucination work.** A bundled Bible canon index and EGW bibliographic catalogue catch fabricated references with zero AI and zero marginal cost. | This is the only part of the anti-hallucination story the software can actually *guarantee*. | [ADR-0011](docs/90-decisions/adr/0011-deterministic-citation-validation.md) |
| 5 | **Copy/launch workflow, and nothing else scheduled.** BYOK direct connect is *conditional* on a provider publishing documentation that sanctions browser-origin calls with an end-user key. | Copy/launch ships fast and is provider-safe. BYOK would be the honest route to a ChatGPT-like feel at $0 owner cost, but vendor silence is not consent, and it bills the member per call. | [ADR-0020](docs/90-decisions/adr/0020-byok-conditional-on-official-support.md) |

---

## Headline answers to the mandated questions

- **Can a normal user conversation produce an unexpected AI bill for the owner?** No — and this is enforced by CI, dependency denylist, secret-scan, and a runtime egress allowlist, not by policy alone. See [Cost Firewall](docs/70-quality/71-testing-strategy.md#7-cost-firewall-suite) and [§41 answer](docs/80-ops/81-cost-model.md#9-the-no-hidden-ai-cost-guarantee-41).
- **Expected fixed monthly infrastructure cost at MVP:** **US$29–52/month** all-in. See [Cost Model](docs/80-ops/81-cost-model.md).
- **Can this really feel like ChatGPT?** Partly, and the honest number is about 60–70% with copy/launch — **with no scheduled path to closing the rest**, since BYOK is now conditional. The full answer is in [Critical Review §2](docs/90-decisions/92-critical-review.md#2-special-question-can-this-really-feel-like-chatgpt-61).
- **Can two AI models verify each other?** They can *corroborate*. They cannot *verify* against a source neither of them can read. See [Critical Review §3](docs/90-decisions/92-critical-review.md#3-special-question-can-two-ai-models-verify-each-other-62).
- **Biggest risk:** not technical. It is willingness to pay for a product that does not supply the AI. See [Risk Register R-01](docs/60-risk/67-risk-register.md).

---

## Reading order

**If you have 15 minutes** — read this README, then
[Final Recommended Architecture](docs/10-architecture/15-final-recommended-architecture.md), then
[Critical Review](docs/90-decisions/92-critical-review.md).

**If you are about to implement** — read the 15-minute path, then
[MVP Scope](docs/00-overview/04-mvp-scope.md),
[System Architecture](docs/10-architecture/12-system-architecture.md),
[Database Design](docs/20-data/21-database-design.md),
[Prompt Architecture](docs/40-ai/42-prompt-architecture.md),
[Source Verification Architecture](docs/40-ai/43-source-verification-architecture.md),
and finally [Implementation Plan](docs/90-decisions/93-implementation-plan.md).

**If you are reviewing risk or legal exposure** — read
[EGW Interaction Policy](docs/40-ai/44-egw-interaction-policy.md),
[Copyright Risk Analysis](docs/60-risk/65-copyright-risk-analysis.md),
[Legal & Compliance Review](docs/60-risk/66-legal-compliance-review.md),
[Privacy Architecture](docs/60-risk/61-privacy-architecture.md),
[Threat Model](docs/60-risk/63-threat-model.md).

---

## Document index (mandated deliverables §56)

| # | Deliverable | Document |
|---:|---|---|
| 1 | README | this file |
| 2 | Product Vision | [00-overview/01-product-vision.md](docs/00-overview/01-product-vision.md) |
| 3 | Product Requirements Document | [00-overview/02-prd.md](docs/00-overview/02-prd.md) |
| 4 | System Requirements Specification | [00-overview/03-srs.md](docs/00-overview/03-srs.md) |
| 5 | UX/UI Specification | [50-ux/51-ux-ui-specification.md](docs/50-ux/51-ux-ui-specification.md) |
| 6 | Information Architecture | [50-ux/52-information-architecture.md](docs/50-ux/52-information-architecture.md) |
| 7 | System Architecture | [10-architecture/12-system-architecture.md](docs/10-architecture/12-system-architecture.md) |
| 8 | Component Architecture | [10-architecture/13-component-architecture.md](docs/10-architecture/13-component-architecture.md) |
| 9 | Database Design | [20-data/21-database-design.md](docs/20-data/21-database-design.md) |
| 10 | Authentication Design | [30-identity/31-authentication-design.md](docs/30-identity/31-authentication-design.md) |
| 11 | Membership Design | [30-identity/32-membership-design.md](docs/30-identity/32-membership-design.md) |
| 12 | Billing Architecture | [30-identity/33-billing-architecture.md](docs/30-identity/33-billing-architecture.md) |
| 13 | AI Provider Architecture | [40-ai/41-ai-provider-architecture.md](docs/40-ai/41-ai-provider-architecture.md) |
| 14 | Prompt Architecture | [40-ai/42-prompt-architecture.md](docs/40-ai/42-prompt-architecture.md) |
| 15 | Source Verification Architecture | [40-ai/43-source-verification-architecture.md](docs/40-ai/43-source-verification-architecture.md) |
| 16 | EGW Interaction Policy | [40-ai/44-egw-interaction-policy.md](docs/40-ai/44-egw-interaction-policy.md) |
| 17 | Copyright Risk Analysis | [60-risk/65-copyright-risk-analysis.md](docs/60-risk/65-copyright-risk-analysis.md) |
| 18 | Privacy Architecture | [60-risk/61-privacy-architecture.md](docs/60-risk/61-privacy-architecture.md) |
| 19 | Security Architecture | [60-risk/62-security-architecture.md](docs/60-risk/62-security-architecture.md) |
| 20 | Threat Model | [60-risk/63-threat-model.md](docs/60-risk/63-threat-model.md) |
| 21 | Safety Architecture | [60-risk/64-safety-architecture.md](docs/60-risk/64-safety-architecture.md) |
| 22 | Internationalization Plan | [50-ux/53-internationalization-plan.md](docs/50-ux/53-internationalization-plan.md) |
| 23 | Testing Strategy | [70-quality/71-testing-strategy.md](docs/70-quality/71-testing-strategy.md) |
| 24 | Evaluation Strategy | [70-quality/72-evaluation-strategy.md](docs/70-quality/72-evaluation-strategy.md) |
| 25 | Cost Model | [80-ops/81-cost-model.md](docs/80-ops/81-cost-model.md) |
| 26 | Deployment Architecture | [10-architecture/14-deployment-architecture.md](docs/10-architecture/14-deployment-architecture.md) |
| 27 | Operations Plan | [80-ops/82-operations-plan.md](docs/80-ops/82-operations-plan.md) |
| 28 | Backup / Recovery Plan | [80-ops/84-backup-recovery-plan.md](docs/80-ops/84-backup-recovery-plan.md) |
| 29 | Monitoring Plan | [80-ops/83-monitoring-plan.md](docs/80-ops/83-monitoring-plan.md) |
| 30 | Disaster Recovery Plan | [80-ops/85-disaster-recovery-plan.md](docs/80-ops/85-disaster-recovery-plan.md) |
| 31 | ADRs | [90-decisions/adr/](docs/90-decisions/adr/) (22 records) |
| 32 | MVP Scope | [00-overview/04-mvp-scope.md](docs/00-overview/04-mvp-scope.md) |
| 33 | Post-MVP Roadmap | [00-overview/05-post-mvp-roadmap.md](docs/00-overview/05-post-mvp-roadmap.md) |
| 34 | Open Questions | [90-decisions/91-open-questions.md](docs/90-decisions/91-open-questions.md) |
| 35 | Risk Register | [60-risk/67-risk-register.md](docs/60-risk/67-risk-register.md) |
| 36 | Traceability Matrix | [70-quality/74-traceability-matrix.md](docs/70-quality/74-traceability-matrix.md) |
| 37 | Final Recommended Architecture | [10-architecture/15-final-recommended-architecture.md](docs/10-architecture/15-final-recommended-architecture.md) |

**Supporting documents beyond the mandated list**

| Document | Purpose |
|---|---|
| [00-overview/06-glossary-terminology.md](docs/00-overview/06-glossary-terminology.md) | Canonical product vocabulary, English and Korean (§52) |
| [10-architecture/11-architecture-options.md](docs/10-architecture/11-architecture-options.md) | Four evaluated architectures with the selection rationale (§58) |
| [20-data/22-data-retention-and-controls.md](docs/20-data/22-data-retention-and-controls.md) | Retention schedule, deletion, export, crypto-erase |
| [40-ai/45-prompt-template-library.md](docs/40-ai/45-prompt-template-library.md) | Versioned template specifications for P2/P3/P4 and verification |
| [60-risk/66-legal-compliance-review.md](docs/60-risk/66-legal-compliance-review.md) | Risk identification for counsel — not legal advice (§53) |
| [70-quality/73-acceptance-criteria.md](docs/70-quality/73-acceptance-criteria.md) | Testable acceptance criteria for every major requirement (§55) |
| [90-decisions/92-critical-review.md](docs/90-decisions/92-critical-review.md) | Adversarial review of this design, including all §60–§64 special questions |
| [90-decisions/93-implementation-plan.md](docs/90-decisions/93-implementation-plan.md) | Phase 0–10 plan with deliverables, dependencies, and exit criteria (§65) |
| [90-decisions/94-revision-1-1-change-log.md](docs/90-decisions/94-revision-1-1-change-log.md) | Every review finding → decision → files, for Revision 1.1 |

---

## The non-negotiable exclusion list (§67)

The MVP does **not** include, and this design contains no plan for:
EGW corpus hosting · EGW PDF ingestion · EGW OCR · EGW scraping · EGW mirroring ·
EGW embeddings · EGW vector database · EGW RAG database · EGW MCP server ·
server-side storage of member-supplied source text · a personal source library ·
bundled Bible verse text in any translation ·
unofficial AI website automation · ChatGPT/Claude/Gemini credential collection ·
application-owned LLM inference · hidden AI API calls · automatic third-party website
scraping · bulk EGW reproduction · full-book reproduction · file uploads in P4 ·
AI-generated fabricated citations.

**Precisely what this does and does not claim.** We do not *collect, ingest, host, index, or
hold* Ellen G. White text as a source, and the member's source-supply channel is browser-only.
It is **not** a claim that no EGW text exists anywhere in the system: a member's own words, and
answers they paste back from their AI, are stored encrypted and may contain purported
quotations. Those are model output or member authorship, capped and watched by the accretion
tripwire (SR-D1a). The stronger sentence — *"we never store EGW text"* — is shorter, prouder,
and false; it appeared in this README before Revision 1.1 and should not return.

Each exclusion is restated with its enforcement mechanism in
[MVP Scope §6](docs/00-overview/04-mvp-scope.md#6-negative-scope-and-how-each-exclusion-is-enforced).

---

## Revision 1.1 — what changed, and why

Version 1.0 was reviewed adversarially over six rounds. The revision reverses five decisions
and closes two exploitable gaps in the schema. A full mapping of finding → decision → files is
in the [change log](docs/90-decisions/94-revision-1-1-change-log.md).

| Change | Records |
|---|---|
| **E3 is no longer verification.** It gains its own status, `TEXT_CONSISTENT`; only E4 may be shown as verified or green | [ADR-0019](docs/90-decisions/adr/0019-evidence-ladder-revision.md) |
| **Member-supplied source text never reaches the server.** The supply channel is browser-only; `source_block` becomes metadata-only `source_block_ref` | [ADR-0022](docs/90-decisions/adr/0022-no-server-side-source-text.md) |
| **No Bible verse text is bundled**, in any translation. `Q-02` closes | [ADR-0021](docs/90-decisions/adr/0021-no-bundled-verse-text.md) |
| **BYOK is conditional, not Phase 2**, and the automatic ship trigger is deleted | [ADR-0020](docs/90-decisions/adr/0020-byok-conditional-on-official-support.md) |
| **E4 is bound in the schema** — pinned Source Directory revision, host and path conformance, `MATCH FULL`, and `actor_id = user_id` so that "confirmed by you" is true | [Database §8](docs/20-data/21-database-design.md), SR-6.6, SR-7.6 |

**The SRS is the normative document.** Where any document in this package conflicts with
[03-srs.md](docs/00-overview/03-srs.md), the SRS governs and the other document is the defect.

---

## A note on this document set's own standards

This package applies its own zero-fabrication rule to itself. Where a factual claim about a
vendor's pricing, a provider's URL behaviour, a legal position, or an Ellen G. White text
could not be established with confidence at design time, it is marked
**`[VERIFY]`** and carries an owner in [Open Questions](docs/90-decisions/91-open-questions.md).
No Ellen G. White quotation appears anywhere in this package. Vendor prices are stated as of
2026-09 and must be re-checked before commitment.

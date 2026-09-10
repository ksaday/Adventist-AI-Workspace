# Traceability Matrix

**Document 36 of 37** · v1.1

Every numbered section of the originating design brief (§1–§68) traced to the document that
addresses it, the requirement that captures it, and the acceptance criterion or test that
proves it. `AC-*` refer to [Acceptance Criteria](73-acceptance-criteria.md); `PR-*` to the
[PRD](../00-overview/02-prd.md); `SR-*` to the [SRS](../00-overview/03-srs.md).

---

## Part 1 — Vision, scope, and architecture (§1–§12)

| § | Topic | Addressed in | Requirement | Proof |
|---|---|---|---|---|
| 1 | Product vision, three apps | [Product Vision](../00-overview/01-product-vision.md), [PRD §3–5](../00-overview/02-prd.md) | PR-P2/P3/P4-* | E2E 1, 2, 6 |
| 2 | No P1 EGW Knowledge Server | [ADR-0001](../90-decisions/adr/0001-no-p1-knowledge-server.md), [ADR-0002](../90-decisions/adr/0002-no-egw-corpus.md) | SR-D1 | AC-E1, AC-E9 |
| 3 | Core principle: user owns the knowledge access | [EGW Interaction Policy §1](../40-ai/44-egw-interaction-policy.md) | — | AC-E7 |
| 4 | Cost requirements; avoid per-use pricing | [Cost Model](../80-ops/81-cost-model.md), [Architecture Options](../10-architecture/11-architecture-options.md) | PR-NFR-08/09 | AC-C1, AC-C7, AC-C8 |
| 5 | User's own AI account; no credential storage | [AI Provider Architecture](../40-ai/41-ai-provider-architecture.md) | PR-AI-10 | AC-C2, AC-C3 |
| 6 | No iframe, no automation; distinguish official vs launch | [AI Provider §1, §2.4](../40-ai/41-ai-provider-architecture.md), [ADR-0014](../90-decisions/adr/0014-no-unofficial-automation.md) | PR-AI-11 | Route/dependency inventory |
| 7 | ChatGPT-like UX; distinguish our UI from theirs | [UX Spec §1](../50-ux/51-ux-ui-specification.md), [Critical Review §2](../90-decisions/92-critical-review.md) | PR-AI-07 | AC-U1 |
| 8 | Language: English UI, multilingual content | [i18n Plan](../50-ux/53-internationalization-plan.md) | PR-I18N-01..05 | AC-L1..L5 |
| 9 | SDA terminology; 화잇 선지자; standard Bible citations | [Glossary §4–5](../00-overview/06-glossary-terminology.md), [i18n §4–5](../50-ux/53-internationalization-plan.md) | PR-I18N-06/07/09 | AC-K1..K5 |
| 10 | Source philosophy; configurable library URL | [EGW Policy §8](../40-ai/44-egw-interaction-policy.md) | SR-7.1/7.2 | AC-E7 |
| 11 | Zero-hallucination policy | [Prompt Architecture §3.3](../40-ai/42-prompt-architecture.md), [Verification](../40-ai/43-source-verification-architecture.md) | PR-SRC-01..09 | AC-V1..V10 |
| 12 | Do not claim a hallucination guarantee; three columns | [Verification §3](../40-ai/43-source-verification-architecture.md), [Prompt §9](../40-ai/42-prompt-architecture.md) | — | AC-U8 |

---

## Part 2 — Verification (§13–§20)

| § | Topic | Addressed in | Requirement | Proof |
|---|---|---|---|---|
| 13 | Source-first vs answer-first | [Verification §4](../40-ai/43-source-verification-architecture.md), [ADR-0015](../90-decisions/adr/0015-both-verification-workflows.md) | PR-SRC-12/13 | E2E 2, 3 |
| 14 | Verify Sources experience | [Verification §5](../40-ai/43-source-verification-architecture.md), [UX §5.4](../50-ux/51-ux-ui-specification.md) | PR-SRC-06 | E2E 3 |
| 15 | Claim-level verification; status semantics | [Verification §9](../40-ai/43-source-verification-architecture.md) | PR-SRC-08 | AC-V2, AC-V6 |
| 16 | Verification must not be pretended | [Verification §2, §7, §9](../40-ai/43-source-verification-architecture.md), [ADR-0019](../90-decisions/adr/0019-evidence-ladder-revision.md) | PR-SRC-09, SR-6.4a, SR-6.5, SR-6.6 | **AC-V1**, AC-V2, AC-V11..V15 |
| 17 | EGW source workflows 1–6 | [EGW Policy §4](../40-ai/44-egw-interaction-policy.md) | PR-SRC-04/10 | E2E 4 |
| 18 | Copyright / content minimisation | [EGW Policy §6](../40-ai/44-egw-interaction-policy.md), [Copyright §9](../60-risk/65-copyright-risk-analysis.md) | PR-P4-05 | Template lint; Layer B rubric |
| 19 | Source attribution; no invented pages | [Glossary §6](../00-overview/06-glossary-terminology.md), [EGW Policy §7](../40-ai/44-egw-interaction-policy.md) | PR-SRC-03 | AC-V10 |
| 20 | No central EGW database; retention policy | [Database §6](../20-data/21-database-design.md), [Retention](../20-data/22-data-retention-and-controls.md), [ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md) | SR-D1, SR-D1a, SR-D2, SR-D3 | AC-E1..E6 |

---

## Part 3 — Platform (§21–§22)

| § | Topic | Addressed in | Requirement | Proof |
|---|---|---|---|---|
| 21 | Registration, auth, account lifecycle | [Authentication Design](../30-identity/31-authentication-design.md) | PR-ACC-01..11 | Integration suite |
| 22 | Membership tiers, entitlements, lifecycle | [Membership Design](../30-identity/32-membership-design.md) | PR-MEM-01..10 | AC-M1..M4 |

---

## Part 4 — The three applications (§23–§25)

| § | Topic | Addressed in | Requirement | Proof |
|---|---|---|---|---|
| 23 | P2 Prayer Note; structure must be justified | [Template Library §4.1](../40-ai/45-prompt-template-library.md), [UX §6.1](../50-ux/51-ux-ui-specification.md) | PR-P2-01..10 | Pastoral review record; E2E 1 |
| 24 | P3 Spiritual Guidance; five bands; no professional role | [Template Library §5](../40-ai/45-prompt-template-library.md), [Safety §8](../60-risk/64-safety-architecture.md) | PR-P3-01..08 | AC-S4; Layer B rubric |
| 25 | P4 Pastor's Aids; no file upload; parameters | [Template Library §6](../40-ai/45-prompt-template-library.md), [UX §6.3](../50-ux/51-ux-ui-specification.md) | PR-P4-01..10 | AC-E8; E2E 6 |

---

## Part 5 — Conversations, privacy, security (§26–§32)

| § | Topic | Addressed in | Requirement | Proof |
|---|---|---|---|---|
| 26 | Conversation architecture and operations | [Database §5](../20-data/21-database-design.md), [IA §3](../50-ux/52-information-architecture.md) | PR-CONV-01..11 | Integration suite |
| 27 | Privacy; encryption; no raw prompt logging | [Privacy Architecture](../60-risk/61-privacy-architecture.md) | PR-NFR-10/11, SR-9.1 | AC-P2..P6 |
| 28 | Third-party AI privacy disclosure | [Privacy §5](../60-risk/61-privacy-architecture.md), [UX §7.1](../50-ux/51-ux-ui-specification.md) | PR-AI-08 | Consent record test |
| 29 | Security threat modelling | [Threat Model](../60-risk/63-threat-model.md), [Security Architecture](../60-risk/62-security-architecture.md) | SR-1, SR-2 | Security suite |
| 30 | Prompt injection; source as data | [Prompt §4](../40-ai/42-prompt-architecture.md), [Threat T-14](../60-risk/63-threat-model.md) | SR-4.4..4.6 | Template lint; Layer B injection cases |
| 31 | AI provider abstraction | [AI Provider §5](../40-ai/41-ai-provider-architecture.md), [ADR-0005](../90-decisions/adr/0005-provider-neutral-architecture.md) | PR-AI-04 | Provider config test |
| 32 | No unofficial automation | [ADR-0014](../90-decisions/adr/0014-no-unofficial-automation.md) | PR-AI-11 | Dependency scan |

---

## Part 6 — Infrastructure (§33–§40)

| § | Topic | Addressed in | Requirement | Proof |
|---|---|---|---|---|
| 33 | Two+ architecture options compared | [Architecture Options](../10-architecture/11-architecture-options.md) (four evaluated) | — | ADR-0007 |
| 34 | Hosting comparison; flat fee preferred | [Architecture Options](../10-architecture/11-architecture-options.md), [Deployment](../10-architecture/14-deployment-architecture.md) | PR-NFR-09 | AC-C7 |
| 35 | Relational data model | [Database Design](../20-data/21-database-design.md) | SR-D1..D5 | Schema review |
| 36 | Billing; fee transparency | [Billing Architecture §3](../30-identity/33-billing-architecture.md) | PR-MEM-07/09 | AC-M1, AC-M7 |
| 37 | Email provider comparison | [Cost Model §4](../80-ops/81-cost-model.md) | — | Invoice review |
| 38 | Observability without sensitive text | [Monitoring Plan](../80-ops/83-monitoring-plan.md), SR-9 | PR-NFR-11 | AC-P6 |
| 39 | Detailed cost model, all categories | [Cost Model](../80-ops/81-cost-model.md) | — | Invoice review |
| 40 | Scenarios at 100 / 1k / 10k / 100k | [Cost Model §7](../80-ops/81-cost-model.md) | — | — |

---

## Part 7 — Cost integrity and sources (§41–§46)

| § | Topic | Addressed in | Requirement | Proof |
|---|---|---|---|---|
| 41 | **No hidden AI cost — explicit answer** | [Cost Model §9](../80-ops/81-cost-model.md), [Final Architecture §14](../10-architecture/15-final-recommended-architecture.md) | SR-10.1..10.5 | **AC-C1..C6** |
| 42 | External source access; configurable directory | [EGW Policy §8](../40-ai/44-egw-interaction-policy.md), SR-7 | PR-AI-04 | AC-E7 |
| 43 | Copyright-safe UX | [Copyright §9](../60-risk/65-copyright-risk-analysis.md), [EGW Policy §6](../40-ai/44-egw-interaction-policy.md) | PR-P4-05 | Layer B quotation restraint |
| 44 | Verification as a separate conversation | [Verification §5](../40-ai/43-source-verification-architecture.md), [Database §8](../20-data/21-database-design.md) | PR-CONV-11, SR-6.7 | E2E 3 |
| 45 | Verification prompt generation | [Template Library §7](../40-ai/45-prompt-template-library.md) | PR-SRC-06 | Template golden files |
| 46 | User-provided source material; **never transmitted to our server** | [Database §6](../20-data/21-database-design.md), [EGW Policy §5](../40-ai/44-egw-interaction-policy.md), [ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md) | PR-SRC-11, SR-D1, SR-D2 | AC-E3, AC-E5, AC-E6 |

---

## Part 8 — Safety, admin, prompts, i18n, UX (§47–§52)

| § | Topic | Addressed in | Requirement | Proof |
|---|---|---|---|---|
| 47 | Safety workflows for crisis content | [Safety Architecture](../60-risk/64-safety-architecture.md) | PR-SAF-01..06 | AC-S1..S6 |
| 48 | Administration; privacy-preserving | [Privacy §6](../60-risk/61-privacy-architecture.md), [Operations](../80-ops/82-operations-plan.md) | PR-ADM-01..08 | AC-P7, AC-P8 |
| 49 | Versioned prompt templates | [Prompt §5](../40-ai/42-prompt-architecture.md), [Template Library §8](../40-ai/45-prompt-template-library.md) | SR-4.3 | Template version tests |
| 50 | Internationalisation architecture | [i18n Plan](../50-ux/53-internationalization-plan.md) | PR-I18N-02/08 | AC-L1 |
| 51 | Minimal-friction UX; our AI vs your AI | [UX Spec](../50-ux/51-ux-ui-specification.md) | PR-AI-07 | AC-U1..U3 |
| 52 | Consistent product terminology | [Glossary](../00-overview/06-glossary-terminology.md) | — | Catalogue lint |

---

## Part 9 — Legal, testing, acceptance (§53–§55)

| § | Topic | Addressed in | Requirement | Proof |
|---|---|---|---|---|
| 53 | Legal risk identification, not legal advice | [Legal Review](../60-risk/66-legal-compliance-review.md), [Copyright](../60-risk/65-copyright-risk-analysis.md) | — | Pre-launch checklist |
| 54 | Comprehensive testing incl. cost tests | [Testing Strategy](71-testing-strategy.md) | — | Release gates |
| 55 | Acceptance criteria for every major requirement | [Acceptance Criteria](73-acceptance-criteria.md) | — | This matrix |

---

## Part 10 — Deliverables and decisions (§56–§59)

| § | Topic | Addressed in |
|---|---|---|
| 56 | 37 required deliverables | [README index](../../README.md#document-index-mandated-deliverables-56) — all present |
| 57 | ADRs for the listed decisions | [adr/](../90-decisions/adr/) — 22 records, three of them superseding; coverage table in [ADR index](../90-decisions/adr/README.md) |
| 58 | At least three architectures evaluated | [Architecture Options](../10-architecture/11-architecture-options.md) — four |
| 59 | Cost decision matrix | [Cost Model §2](../80-ops/81-cost-model.md) |

---

## Part 11 — Critical review and special questions (§60–§64)

| § | Topic | Addressed in |
|---|---|---|
| 60 | Critical review of the brief itself | [Critical Review §1](../90-decisions/92-critical-review.md) — 12 challenges |
| 61 | Can this really feel like ChatGPT? | [Critical Review §2](../90-decisions/92-critical-review.md#2-special-question-can-this-really-feel-like-chatgpt-61) |
| 62 | Can two AI models verify each other? | [Critical Review §3](../90-decisions/92-critical-review.md#3-special-question-can-two-ai-models-verify-each-other-62), [Verification §10](../40-ai/43-source-verification-architecture.md) |
| 63 | Legal content minimisation | [Critical Review §4](../90-decisions/92-critical-review.md), [Copyright §9](../60-risk/65-copyright-risk-analysis.md) |
| 64 | Future evolution and migration paths | [Critical Review §5](../90-decisions/92-critical-review.md), [Roadmap](../00-overview/05-post-mvp-roadmap.md) |

---

## Part 12 — Plan and final answers (§65–§68)

| § | Topic | Addressed in |
|---|---|---|
| 65 | Phased implementation plan (Phase 0–10) | [Implementation Plan](../90-decisions/93-implementation-plan.md) |
| 66 | Final recommendation — 15 questions | [Final Recommended Architecture](../10-architecture/15-final-recommended-architecture.md) — each numbered |
| 67 | Non-negotiable exclusions | [MVP Scope §6](../00-overview/04-mvp-scope.md#6-negative-scope-and-how-each-exclusion-is-enforced) — each with an enforcement mechanism |
| 68 | Final design principle | [Product Vision §1](../00-overview/01-product-vision.md), [Final Architecture](../10-architecture/15-final-recommended-architecture.md) |

---

## Coverage summary

| | Count |
|---|---|
| Brief sections (§1–§68) | 68 |
| Sections traced to a document | **68** |
| Sections with a stated requirement ID | 52 (the remainder are meta-instructions about the design process itself) |
| Sections with an acceptance criterion or automated proof | 47 |
| Mandated deliverables (§56) present | **37 of 37** |
| ADR topics required (§57) | **15 of 15**, across 22 records |
| Architectures evaluated (§58 requires ≥3) | **4** |

---

## Requirement → test index (selected critical paths)

| Requirement | Test |
|---|---|
| PR-AI-01 · no server LLM calls | Cost Firewall L1–L4 |
| PR-SRC-09 · never claim false verification | False-verification red-team, 30 cases + attestation-binding suite |
| PR-CONV-08 · Ephemeral bodies never persisted | Service test + direct-SQL test + canary |
| PR-ADM-03 · break-glass notification | Break-glass flow test + console inspection |
| PR-SAF-05 · no trigger text stored | Safety event schema assertion + canary |
| PR-MEM-02 · server-side entitlements | Entitlement bypass suite |
| PR-I18N-06 · 화잇 선지자 | Template golden files + catalogue review |
| PR-P4-01 · no file upload | Route inventory assertion |
| PR-P4-09 · Citation Checklist blocks below E4 | E2E 6 |
| SR-2.5 · IDOR | Authorization sweep, 100% route coverage |
| SR-6.5 · no false verification strings | Catalogue lint, every locale |
| SR-6.6 · E4 bound to a pinned directory revision, attested by the owner | AC-V13, AC-V14, AC-V15 |
| SR-7.6 · attested URL canonicalised, not repaired | AC-V13 path cases |
| SR-D1 · source text never reaches the server | AC-E1, AC-E5 |
| SR-D3 · accretion tripwire | Job test with seeded data |

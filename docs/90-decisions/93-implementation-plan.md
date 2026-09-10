# Implementation Plan

**Supporting document (§65)** · v1.1

Eleven phases, 0 through 10, plus the post-MVP phases referenced by the
[Roadmap](../00-overview/05-post-mvp-roadmap.md).

**Complexity** is rated 1–5 as engineering difficulty, not duration. Duration estimates assume
one experienced developer working with an AI coding agent; adjust for the actual team.

**Rule for every phase:** the phase is not complete until its exit criteria are demonstrated on
staging. "Mostly working" is not an exit criterion.

---

## Phase 0 — Architecture and environment

**Complexity 2 · ~1 week · Depends on: Q-25 (business entity, for hosting region only)**

**Deliverables**
- Repository, branch policy, commit conventions.
- Next.js + TypeScript skeleton with the module boundaries from
  [Component Architecture §1](../10-architecture/13-component-architecture.md): `app/`,
  `packages/`, `server/`, `data/`. Import-boundary lint rule enforcing that `packages/*` may
  not import `server/*`.
- PostgreSQL provisioned (local, preview, staging).
- CI pipeline with every stage from
  [Deployment §3](../10-architecture/14-deployment-architecture.md).
- **The Cost Firewall, all four layers, working and failing correctly on a deliberate violation.**
- Secret management, environment configuration, the startup env-guard.
- Structured logging with the scrubber, and the privacy canary test.
- Health endpoints, error boundaries, base security headers, nonce CSP.
- Staging deployed, reachable, and monitored.

**Exit criteria**
- A deliberate `import OpenAI from 'openai'` fails CI at Layer 1.
- A deliberate `OPENAI_API_KEY` in the environment prevents startup at Layer 2.
- A deliberate `fetch('https://api.openai.com')` from server code is refused at Layer 3 and
  raises a security event.
- The canary test passes.
- Staging deploys automatically from `main`.

**Risks** — none material. **Do this phase properly.** The Cost Firewall is far harder to
retrofit than to establish, and every later phase depends on it being real rather than
intended.

---

## Phase 1 — Authentication and membership

**Complexity 3 · ~2 weeks · Depends on: Phase 0**

**Deliverables**
- Full schema from [Database Design](../20-data/21-database-design.md) §3 and §4, with
  expand/contract migrations.
- **The crypto service** — envelope encryption, per-user DEK, AAD binding, rotation, destroy.
- Registration, email verification, login, logout, password reset, password change, sessions.
- Enumeration-resistant flows with constant-shape responses.
- Breached-password screening.
- Rate limiting.
- Profile and settings shell.
- Membership with plans and entitlements; `BILLING_MODE=off`.
- **The authorization module** — the single entry point.
- Audit service with the hash chain.
- Account deletion (ordered: key first) and export.

**Exit criteria**
- The authorization sweep passes over every route that accepts a resource id.
- Crypto round-trip tests pass, including AAD rejection of a moved ciphertext.
- Account deletion destroys the key before rows, and post-deletion decryption fails.
- Export is complete for a seeded account.
- Audit chain verifies; a deliberate tamper is detected.

**Risks** — authentication is the most security-sensitive code in the product. Use a maintained
library. Do not hand-roll session or token handling. Budget time for the enumeration-resistance
and timing work, which is fiddly and easy to get subtly wrong.

---

## Phase 2 — Core chat-like workspace

**Complexity 3 · ~2 weeks · Depends on: Phase 1**

**Deliverables**
- Application shell: sidebar, tool switcher, conversation list, settings, account menu.
- Conversation CRUD with encrypted titles and bodies; sequence-based message ordering.
- The four turn kinds, visually distinct.
- **Ephemeral mode, enforced at three layers** — UI, service, and a database trigger.
- Client-side conversation search.
- Archive, duplicate, soft delete with 30-day recovery.
- Responsive layout at all four breakpoints; dark mode.
- i18n foundation: ICU catalogues, no hard-coded strings, pseudo-localisation build.
- Design tokens and the accessible component set.

**Exit criteria**
- Ephemeral bodies cannot be persisted by any of the three paths, including direct SQL.
- The pseudo-localisation build shows no raw strings.
- axe passes on every implemented flow.
- Usable at 375 px.

**Risks** — the encrypted-title-plus-client-side-search combination needs care to stay fast.
Fetch and decrypt the index once, then filter locally.

---

## Phase 3 — Prompt orchestration and citation validation

**Complexity 4 · ~2.5 weeks · Depends on: Phase 2**

**Deliverables**
- **Reference data assets built and version-pinned**: Bible canon index (en + ko), EGW
  bibliographic catalogue (~200 records), topical Scripture index (initial), risk lexicon (en),
  emergency directory (seed regions).
- **The prompt composer** — pure, deterministic, template-versioned, nonce-delimited, with
  golden-file tests.
- Prompt template tables, admin editing, versioning, publish and rollback.
- The core preamble and the first P3 templates.
- **Bible reference detection and validation.**
- **EGW citation normalisation and catalogue validation**, with fuzzy suggestion that never
  rewrites silently.
- Language detection with the correctable chip.
- Provider registry, launcher, clipboard-first launch, prefill caps.
- Answer intake with provider attribution.
- Inline citation chips and the validation summary banner.

**Exit criteria**
- Composer golden files are byte-stable; server and client produce identical output.
- The citation validator evaluation set meets its targets (≥98% fabricated Bible references
  flagged, ≥95% fabricated EGW titles).
- Clipboard failure prevents the tab from opening.
- A prompt above the prefill cap falls back to copy-only.

**Risks** — **building the reference datasets is the most under-estimated task in the plan.**
The canon index must be verified against two independent sources. The EGW catalogue requires
careful, provenance-recorded compilation. Budget real time; this is data work, not code work,
and it is where the product's credibility comes from.

---

## Phase 4 — P2 Prayer Note

**Complexity 2 · ~1 week · Depends on: Phase 3, Q-21 (pastoral reviewer identified)**

**Deliverables**
- Burden intake, prayer-type selection, the optional reorderable structural frame, free-form mode.
- **The deterministic prayer skeleton** — a real prayer draft assembled with no AI.
- Curated Scripture anchors from the topical index.
- Ephemeral default with clear explanation.
- P2 templates.
- **The anonymous drafting path** (Q-12), if adopted.
- Safety screening wired into the intake.

**Exit criteria**
- A member reaches a usable prayer draft with no external AI.
- Pastoral advisory review of the frame, help text, and anchors is signed off and recorded.
- Ephemeral is the default and is explained, not silent.

**Risks** — the framing risk from [C-03](92-critical-review.md), not the engineering. The
pastoral review is a genuine gate, not a formality.

---

## Phase 5 — P3 Spiritual Guidance

**Complexity 3 · ~1.5 weeks · Depends on: Phase 3**

**Deliverables**
- Question intake with the optional source-attachment panel.
- Source blocks with caps, expiry, encryption, and the attribution field.
- Source-bounded mode with a visible indicator.
- The five-band answer contract and its rendering, with band 5 never minimised.
- Denominational-sensitivity detection and clause.
- Non-professional disclaimers.
- P3 templates, standard and source-bounded.

**Exit criteria**
- Attaching a source switches modes visibly.
- Source caps are enforced at both the block and conversation level.
- The five bands render distinctly; band 5 is never collapsed by default.

---

## Phase 6 — P4 Pastor's Aids

**Complexity 4 · ~2.5 weeks · Depends on: Phase 5**

**Deliverables**
- The parameter panel with live anchor-passage validation.
- All twelve task types with their templates.
- **EGW leads mode** — never text.
- **The structured outline workspace** — editable objects, not a text blob.
- Outline export to Markdown, plain text, and print-friendly HTML.
- Entitlement gating for the Pastor tier.
- **The pre-pulpit Citation Checklist**, blocking on marked verbatim quotations below **E4**.

**Exit criteria**
- The Citation Checklist blocks correctly and resolves through attestation or paraphrase.
- Outline export renders correctly in all three formats.
- No file upload endpoint exists anywhere in the application.

**Risks** — parsing a pasted answer into structured outline objects is the hardest UI work in
the plan. Design for a graceful degradation to plain text when parsing fails, and make manual
structuring pleasant rather than punitive.

---

## Phase 7 — Source verification

**Complexity 4 · ~2.5 weeks · Depends on: Phase 6**

**Deliverables**
- Verification conversations with bidirectional links and origin tombstones.
- **Claim block parser** with total-failure semantics and the manual segmentation UI.
- **The claim ledger** with statuses, evidence levels, and the mandatory pairing.
- **Evidence state machine** with `mayAssertOfficialVerification` and the database constraints.
- Verification prompt generation and result merge, including the basis cross-check against our
  own records.
- Attestation flow reaching E4, **bound**: pinned Source Directory revision, host match,
  path-prefix conformance, `actor_id = user_id`, and rejection with an explanation on failure.
- Source Check links from the Source Directory.
- The three-column honesty contract, in-product and public.

**Exit criteria**
- **The false-verification red-team suite passes with zero failures across all locales.**
- Database constraints reject a VERIFIED status below **E4**, and `TEXT_CONSISTENT` anywhere
  but E3, including by direct SQL. The `MATCH FULL` binding rejects a partially-NULL E4 row.
- The catalogue lint finds no verification-claiming string without a guard.
- Deterministic findings render before any AI option.

**Risks** — this is the product's core. Do not compress it. If schedule pressure arrives, cut
scope elsewhere.

---

## Phase 8 — Security hardening and administration

**Complexity 3 · ~2 weeks · Depends on: Phase 7**

**Deliverables**
- Admin console: users, memberships, roles, source directory, providers, templates, flags,
  emergency directory, announcements, audit viewer.
- **Break-glass** with re-auth, reason, scope, expiry, audit, and the unsuppressable
  notification email.
- TOTP, mandatory for admins.
- Full security header set; CSP tightened to nonce-only.
- Complete rate limiting.
- Retention jobs with dry-run mode.
- The accretion tripwire and its report.
- SSRF, XSS, CSRF, and IDOR suites at full coverage.
- Egress-denial alerting.

**Exit criteria**
- All security suites pass.
- Break-glass sends the notification and offers no suppression control.
- Retention jobs pass their clock-fixture tests.

---

## Phase 9 — Testing, evaluation, and content completion

**Complexity 3 · ~2 weeks · Depends on: Phase 8**

**Deliverables**
- Complete E2E suite (the twelve scenarios).
- Citation validator evaluation corpus assembled and passing.
- **First full Layer B prompt evaluation sweep** across three providers.
- Accessibility review: automated, keyboard, and screen reader.
- Performance and load testing.
- **Emergency directory verified, every entry.**
- Help content: evidence levels, finding sources, FAQ.
- Legal pages drafted.
- Runbooks written.
- Restore drill performed and timed.

**Exit criteria**
- Every release gate in [Testing §14](../70-quality/71-testing-strategy.md) is green.
- The restore drill is documented with an actual duration.
- Every emergency number is verified with a recorded date.

---

## Phase 10 — Production readiness and launch

**Complexity 2 · ~1.5 weeks · Depends on: Phase 9, and Q-01 through Q-05 resolved**

**Deliverables**
- Production infrastructure, Cloudflare, DNS, TLS.
- Master key generated offline and **escrowed in two sealed locations, verified**.
- Backups configured; off-site weekly dump to an independent vendor.
- Monitoring, alerting, and the status page.
- Billing configured, or `BILLING_MODE=off` for a pilot.
- **Terms, Privacy Policy, AI Disclosure, How Verification Works, Sources — all published.**
- Independence disclaimer live in all three locations.
- External penetration test completed and findings addressed.
- Closed beta with 10–20 members, including at least three pastors.
- Public launch.

**Exit criteria**
- Every acceptance criterion in [73](../70-quality/73-acceptance-criteria.md) passes.
- All eleven MVP definition-of-done conditions are met.
- A full month has elapsed with a **$0.00 AI invoice**.
- Legal questions Q-01 through Q-05 are resolved.

---

## Summary

| Phase | Deliverable | Complexity | Est. |
|---|---|:--:|---|
| 0 | Architecture and environment | 2 | 1 wk |
| 1 | Authentication and membership | 3 | 2 wk |
| 2 | Core workspace | 3 | 2 wk |
| 3 | Prompt orchestration and validation | 4 | 2.5 wk |
| 4 | P2 Prayer Note | 2 | 1 wk |
| 5 | P3 Spiritual Guidance | 3 | 1.5 wk |
| 6 | P4 Pastor's Aids | 4 | 2.5 wk |
| 7 | Source verification | 4 | 2.5 wk |
| 8 | Security and administration | 3 | 2 wk |
| 9 | Testing and evaluation | 3 | 2 wk |
| 10 | Production readiness | 2 | 1.5 wk |
| | **Total** | | **~20.5 weeks** |

Roughly **five months** for one developer with an AI coding agent. Add 25–30% for the usual
surprises, and note that Q-21 (pastoral reviewer) and Q-01 through Q-05 (counsel) run in
parallel and are **more likely to delay launch than the engineering is**.

---

## Critical path and parallelisation

```
Phase 0 ─▶ 1 ─▶ 2 ─▶ 3 ─┬─▶ 4 ─┐
                        ├─▶ 5 ─┼─▶ 6 ─▶ 7 ─▶ 8 ─▶ 9 ─▶ 10
                        └──────┘
Parallel from day one:
  Reference data compilation ──────────────────▶ needed by Phase 3
  Pastoral reviewer engagement ────────────────▶ needed by Phase 4
  Legal questions Q-01…Q-05 ───────────────────▶ needed by Phase 10
  Emergency directory verification ────────────▶ needed by Phase 9
  Business entity (Q-25) ──────────────────────▶ needed before Phase 10
```

**Start the reference data, the pastoral engagement, and the legal questions on day one.** They
have long lead times, they do not depend on any code, and each of them can block a phase that
is otherwise ready.

---

## Sequencing principles

1. **Phase 0 is not optional and not abbreviated.** The Cost Firewall must exist before the
   first feature, because retrofitting it means auditing everything already written.
2. **Security is built in, not bolted on.** Phase 8 hardens and completes; it does not
   introduce security for the first time. Authorization exists from Phase 1.
3. **Phase 7 is the product.** If the schedule slips, cut scope in Phase 6 before Phase 7.
4. **Ship internally at every phase.** Each phase ends with something demonstrable on staging.
5. **P2 before P3 before P4** — increasing complexity, and P2 validates the shell with the
   simplest surface.
6. **`BILLING_MODE=off` throughout.** Billing is a Phase 10 configuration, never a blocker.

# Architecture Decision Records

**Document 31 of 37** · v1.1

Format: Context · Decision · Consequences · Alternatives considered. Status is `Accepted`
unless noted. **An ADR is superseded, never edited, once accepted** — a superseding record is
added and the original keeps its reasoning, with a notice at its head saying what changed and
what still stands. Records 0019–0022 were added in Revision 1.1 and three of them supersede
earlier decisions; see [the change log](../94-revision-1-1-change-log.md).

| # | Decision | Status |
|---|---|---|
| [0001](0001-no-p1-knowledge-server.md) | No P1 EGW Knowledge Server | Accepted |
| [0002](0002-no-egw-corpus.md) | No EGW corpus — catalogue only | Accepted |
| [0003](0003-user-owned-ai.md) | The user brings their own AI | Accepted |
| [0004](0004-no-app-owned-llm-inference.md) | No application-owned LLM inference | Accepted |
| [0005](0005-provider-neutral-architecture.md) | Provider-neutral, abstracted over interaction mode | Accepted |
| [0006](0006-byok-direct-connect.md) | BYOK Direct Connect, browser-only, Phase 2 | **Superseded by 0020** |
| [0007](0007-architecture-monolith.md) | Next.js monolith on a flat-fee container host | Accepted |
| [0008](0008-postgresql.md) | PostgreSQL, managed, flat tier | Accepted |
| [0009](0009-self-hosted-auth.md) | Self-hosted session authentication | Accepted |
| [0010](0010-evidence-ladder.md) | The evidence ladder (E0–E4) | **Superseded by 0019** |
| [0011](0011-deterministic-citation-validation.md) | Deterministic citation validation with bundled data | Accepted |
| [0012](0012-bundled-kjv-module.md) | Bundled KJV module, conditional on counsel | **Superseded by 0021** |
| [0013](0013-billing-provider.md) | Merchant-of-Record billing (Paddle) | Accepted |
| [0014](0014-no-unofficial-automation.md) | No unofficial automation, scraping, or iframes | Accepted |
| [0015](0015-both-verification-workflows.md) | Support both source-first and answer-first | Accepted |
| [0016](0016-separate-verification-conversation.md) | Verification is a separate, linked conversation | Accepted |
| [0017](0017-paraphrase-first-ux.md) | Paraphrase-first answer shape | Accepted |
| [0018](0018-entitlements-in-our-rows.md) | Entitlements are our rows, not the biller's | Accepted |
| [0019](0019-evidence-ladder-revision.md) | E3 is supplied-text consistency, not verification | Accepted · supersedes 0010 |
| [0020](0020-byok-conditional-on-official-support.md) | BYOK conditional on published provider support | Accepted · supersedes 0006 |
| [0021](0021-no-bundled-verse-text.md) | No Bible verse text is bundled or shipped | Accepted · supersedes 0012 |
| [0022](0022-no-server-side-source-text.md) | The source-supply channel is browser-only | Accepted |
| [0023](0023-beta-self-hosted-tunnel.md) | Closed beta runs self-hosted, behind a Cloudflare Tunnel | Accepted |

## Coverage of the mandated ADR topics (§57)

| Required topic | ADR |
|---|---|
| Why no P1? | 0001 |
| Why no EGW corpus? | 0002, 0022 |
| Why user-owned AI? | 0003 |
| Why no AI API in MVP? | 0004, 0006, 0020 |
| Why a membership database? | 0018 |
| Why the chosen hosting architecture? | 0007 |
| Why the chosen database? | 0008 |
| Why the chosen authentication? | 0009 |
| Why the chosen billing provider? | 0013 |
| Why a separate verification workflow? | 0016 |
| Why source-first and answer-first? | 0015 |
| Why paraphrase-first UX? | 0017 |
| Why no scraping? | 0014 |
| Why no iframe-based AI embedding? | 0014 |
| Why provider-neutral architecture? | 0005 |

## Records added in Revision 1.1

| Topic | ADR |
|---|---|
| Why is E3 not verification? | 0019 |
| Why is BYOK not scheduled? | 0020 |
| Why is no verse text bundled? | 0021 |
| Why does source text never reach the server? | 0022 |


# Critical Review of This Design

**Supporting document (§60–§64)** · v1.1

The brief asks not to be agreed with. This document challenges it — and challenges the design
that resulted — then answers the four special questions. Where a challenge changed the design,
the change is named. Where it did not, the reason is given.

---

## 1. Challenges to the brief and to this design (§60)

### C-01 · "Zero-hallucination policy" is a name the product cannot live up to

**The problem.** §11 is titled "Zero-Hallucination Policy" and §12 immediately, correctly,
forbids claiming a mathematical guarantee. Those two sections are consistent with each other,
but the *name* will leak into marketing, support copy, and a member's memory of what they were
promised. The first time a member is burned by a fabrication that slipped through, "you said
zero hallucination" is what they will say — and they will be right to.

**Why it matters.** The product's only durable asset is being believed. A claim it cannot keep
destroys that faster than any competitor could.

**Alternatives.** (a) Keep the name internally, forbid it externally. (b) Rename the principle.
(c) Drop the ambition.

**Recommendation — adopted.** The internal principle is renamed **"source-bounded generation
with explicit uncertainty"**. The words "zero hallucination" and "guaranteed accurate" are
added to the forbidden-terminology list
([Glossary §3](../00-overview/06-glossary-terminology.md#3-terms-that-are-forbidden-in-product-copy)),
enforced by a message-catalogue lint. The public claim is narrower and true: *we check every
reference we can check mechanically, and we tell you what we could not check.*

### C-02 · Most claims will sit at E1 forever, and the design must be valuable anyway

**The problem.** The evidence ladder is sound, but its upper rungs require the member to open
the official library and read. Most members, most of the time, will not. Realistically, the
steady-state distribution is something like 70% E1, 15% E2, 10% E3, 5% E4.

**Revision 1.1 makes this worse, deliberately.** E3 no longer produces a green badge, so on
these numbers only about **5%** of claims ever reach a state the product will call verified.
That is the honest number and the reason the E3/E4 metrics are now reported separately.

If the product's value depends on reaching E4, it delivers *that* value 5% of the time.

**Why it matters.** This is the difference between a product that works and one that only
works for the conscientious.

**Recommendation — adopted, and it reshaped the design.** The **deterministic validators
became the primary value proposition rather than a supporting feature**
([ADR-0011](adr/0011-deterministic-citation-validation.md)). They operate on 100% of answers,
instantly, at zero cost, with no user effort — catching non-existent verses, fabricated work
titles, and implausible page numbers before any AI is involved. The Verify Sources screen
shows those findings *first*, above any AI option. E4 remains the gold standard for the
pastor about to preach; the everyday value arrives without the member doing anything.

### C-03 · Prayer Note risks being received as offensive rather than helpful

**The problem.** "AI-generated prayer" is a phrase that will trouble a meaningful fraction of
this audience, and reasonably so. Prayer is relationship, not composition. A product that
appears to outsource it to a machine invites a reaction the brief does not anticipate.

**Why it matters.** P2 is the most accessible application and therefore the most likely first
impression. A bad first impression here damages the whole product's reception in the community
it needs.

**Alternatives.** (a) Drop P2. (b) Reframe it. (c) Ship it as designed and hope.

**Recommendation — adopted (b).** P2 is framed throughout as helping a member **articulate**
what they are already carrying — never as producing prayer on their behalf. Three consequences
in the design: the tool is named "Prayer Note", never "Prayer Generator"; the help text states
plainly that Scripture presents prayer as relationship rather than formula, citing Matthew 6:7's
warning against vain repetition; and **the primary path is the local deterministic draft
assembled from the member's own words** — no AI, nothing transmitted. The AI path is the
secondary option. Pastoral advisory review of this framing is a release gate (PR-P2-04).

### C-04 · Mandatory registration puts the wall before the value

**The problem.** §21 requires registration before use. Standard practice, and it means a
visitor must create an account before experiencing anything. For a product whose value is
subtle and whose pitch is unfamiliar, that is a steep ask.

**Recommendation — adopted as a modification to the brief.** Registration remains mandatory
for anything persistent, and additionally: **the P2 local drafting path is available without
an account**, because it stores nothing, transmits nothing, and needs no server. A visitor can
type a burden, choose a shape, and receive a real prayer draft in their browser — then be
invited to register to keep it. This costs almost nothing to build (the engine is client-side
already) and converts the product's weakest moment into its best demonstration.

### C-05 · The claims block is a single point of failure for the entire verification workflow

**The problem.** Deterministic claim extraction depends on the external model appending a
correctly formatted `SDAWS-CLAIMS-V1` block. Models are inconsistent about format compliance,
especially in long answers, in non-English output, and across provider updates we do not
control. If the block fails, the ledger is empty and the workflow stalls.

**Recommendation — adopted.** Three mitigations, all in the design: (1) the manual segmentation
path is a **first-class, fully designed UI**, not an error state; (2) parse failure is total
and explicit — never a silent partial ledger, because a ledger showing four of seven claims
tells the member everything was examined when it was not; (3) **parse-success rate is measured
per provider in production and in evaluation**, with a documented threshold — below 70% for any
major provider, the block format is redesigned for that provider
([Evaluation §6](../70-quality/72-evaluation-strategy.md#6-decision-thresholds)).

### C-06 · The brief's cost constraint and its billing requirement contradict each other

**The problem.** §4.2 says avoid per-use charges. §36 requires subscription billing, which is
inherently per-transaction.

**Assessment.** The brief acknowledges this and calls it an unavoidable business cost. That is
correct, and the design's response is to be explicit about it: transaction fees are the only
usage-based cost in the entire system, they scale with revenue rather than with usage, and they
are shown in full in the [Cost Model](../80-ops/81-cost-model.md#2-cost-decision-matrix-59).
A cost that grows only when income grows is the acceptable kind.

**One concrete consequence worth acting on:** the fixed per-transaction component makes a
$5/month charge cost ~15% in fees and a $50/year charge ~6%. The pricing page should default
to annual.

### C-07 · Free-tier quotas ration something that costs nothing

**The problem.** The brief assumes tiering. But with zero marginal inference cost, a free
member generating 500 prompts costs the operator approximately the same as one generating 5.
Metering that is rent extraction, not cost recovery — and for a ministry-adjacent product,
that is both wrong and strategically foolish.

**Recommendation — partially adopted.** Quotas are retained but reframed and re-scoped: they
bound **storage and abuse**, not inference, and the documentation says so plainly
([Membership §1](../30-identity/32-membership-design.md#1-the-unusual-economics-of-this-product)).
The Free tier is deliberately generous enough to complete real work — 20 generations and 3
verifications per month. The main gate between Free and Member is **retention and export**,
which do have real costs, rather than usage.

### C-08 · No file upload in P4 is more limiting than the brief acknowledges

**The problem.** §25 forbids file upload. Pastors keep sermon notes, outlines, and manuscripts
in documents. "Paste your outline" works for 500 words and is painful for 3,000.

**Assessment.** The prohibition is nonetheless right for MVP, for reasons beyond the brief's:
upload introduces file parsing (a security surface), storage (a cost), document text (a
copyright surface if members upload published material), and an obvious ingestion path that
would erode ADR-0002's bright line. **The prohibition protects the architecture, not just the
scope.**

**Recommendation.** Keep it, and reduce the pain deliberately: a large, well-behaved paste
target with a character counter, structured field-by-field entry for outline refinement, and
the ability to build an outline incrementally across turns rather than in one paste. Revisit
only with an explicit design gate.

### C-09 · Planning for 100,000 members may distort decisions for a product that will have 500

**The problem.** §40 requires a cost scenario at 100,000 members. Realistically, a
denominational study tool might reach a few thousand. Designing for 100,000 risks
over-engineering.

**Assessment.** The scenario is worth computing, and it did not distort the design — every
choice made for cost predictability (flat hosting, self-hosted auth, no metered AI) is also the
right choice at 500 members. The one place it mattered is **self-hosted auth**, where the
per-MAU comparison only becomes dramatic at scale; but self-hosted auth is also free and
portable at 500, so the conclusion holds either way.

**Recommendation.** Keep the scenario as a stress test of the cost *shape*, and do not build
for it. The MVP explicitly runs on one container and one database.

### C-10 · Support without content access will hurt more than the design admits

**The problem.** Metadata-only administration is right, and it means the operator often cannot
reproduce a member's problem. Every week there will be a ticket that could be resolved in
thirty seconds with a look, and cannot be.

**Recommendation — adopted.** Three compensations are in the design: self-service diagnostics
the member can copy and send (versions, flags, error id — never content); error ids in every
user-facing error correlating to a scrubbed server record; and a **member-initiated share**
that grants scoped, time-limited, audited access to one conversation. The Operations Plan
states explicitly that the correct response to support friction is better diagnostics, **never
a quiet widening of administrative access** — written down so a future operator under pressure
recognises the trade they would be making.

### C-11 · The Korean terminology requirement is a preference presented as a constraint

**The problem.** §9 mandates 화잇 선지자 in Korean prose. Usage varies across Korean Adventist
communities — 엘렌 화잇 and 화잇 부인 also appear — and 선지자 carries a theological weight not
every reader applies identically.

**Recommendation — adopted neutrally.** The owner's requirement is implemented as specified and
**화잇 선지자 is the shipped default**. It lives in a per-locale terminology table rather than
hard-coded strings, so a future pastoral or editorial review can change it in one place with no
code change. Bibliographic metadata retains official English forms regardless. This satisfies
the requirement while leaving the door open, at zero cost.

### C-12 · The product may be strategically obsoleted by the providers themselves

**The problem.** If ChatGPT or Claude ships reliable citation grounding for religious texts, or
if the Ellen G. White Estate licenses an official assistant, this product's core differentiator
weakens considerably.

**Assessment.** Partly true, and worth naming rather than ignoring. But three things survive:
(a) the workflow — sermon preparation is a structured task a general chat interface serves
poorly; (b) the record — a durable, exportable ledger of what was checked and by whom; (c) the
posture — a product whose *purpose* is doubt is culturally different from a feature inside a
product whose purpose is answers.

**Recommendation.** Accept the risk ([R-18](../60-risk/67-risk-register.md)). Invest in the
workflow and the record, which are defensible, rather than in citation checking alone, which
may not be. And if the Estate ever does license an official assistant, the correct response is
to integrate with it, not to compete.

---

## 2. Special question: Can this really feel like ChatGPT? (§61)

**The honest answer: not fully, and the gap is measurable rather than mysterious.**

### What a ChatGPT-like experience actually consists of

| Element | Tier B (copy/launch) | Tier C (BYOK) | Tier A (our API) |
|---|---|---|---|
| Familiar chat layout, history, titles | ✅ Fully | ✅ | ✅ |
| Type a question and press enter | ✅ | ✅ | ✅ |
| **An answer appears in place** | ❌ **You leave and come back** | ✅ | ✅ |
| **Streaming tokens** | ❌ | ✅ | ✅ |
| Multi-turn continuity without re-explaining | ⚠️ Manual — you choose what to carry | ✅ | ✅ |
| Follow-up in one action | ❌ Another round trip | ✅ | ✅ |
| Regenerate / edit and retry | ❌ | ✅ | ✅ |
| Mobile fluency | ⚠️ App switching + clipboard | ✅ | ✅ |
| **Cost to the operator** | **$0** | **$0** | **$0.01–0.50 per conversation** |
| Works with any provider, including future ones | ✅ | ❌ | ❌ |
| Setup friction for the member | None | High — needs an API key | None |
| Realistic adoption | 100% | 5–15% | 100% |

**Tier B delivers roughly 60–70% of the feel.** The shell, the history, the composer, and the
sense of a persistent workspace are genuinely there. What is missing is the moment that
defines the experience: the answer arriving in front of you.

**Tier C delivers roughly 95%** — and it costs the operator exactly nothing. It is the honest
answer to the question. Its limitation is not technical but demographic: most members do not
have an API key and will not obtain one.

### The design's response

1. **Do not pretend.** Present our surface as a **workbench with a chat-shaped timeline**, not
   as a chat with a hidden AI. Four visually distinct turn kinds make the boundary permanent
   ([UX §1](../50-ux/51-ux-ui-specification.md#1-the-central-ux-problem)).
2. **Make the gap a step, not an error.** An explicit waiting card with clear instructions is
   better than an inert screen that feels broken.
3. **Deliver value on our side of the gap.** Deterministic validation, the ledger, the outline
   builder, and P2's local drafting all happen in our UI, instantly. The more the workspace
   does without the round trip, the less the round trip defines the experience.
4. **Ship Tier C in Phase 2** for the members who will notice.

### The recommendation

**Build B, design for C, never build A as a default.** And be candid in the marketing: *"You
bring your own AI. We make sure it isn't making things up."* A product that is honest about
what it is will disappoint fewer people than one that implies it is ChatGPT and is not.

**The strongest argument against worrying about this:** the members who need this product most
— pastors checking a citation before preaching — are not looking for a chat experience. They
are looking for a checklist that says it is safe to say this out loud. That is a different
product, and it does not need to feel like ChatGPT at all.

---

## 3. Special question: Can two AI models verify each other? (§62)

**They can corroborate. They cannot verify. The two are not the same and must never be
presented as such.**

### The two arrangements

**Arrangement 1 — Generator AI → Verifier AI → (EGW Library)**

```
Question → Generator (recall) → Answer with citations
                                     ↓
                              Verifier (recall) → "Verified"
                                     ↓
                              EGW Library ← never actually reached
```

The verifier has no access to the library. It has browsing that returns a search page, or no
browsing at all. Its "verification" is memory checking memory. **Ceiling: E2.**

Worse, it is *biased* memory: a model shown a confident assertion is more likely to agree with
it than to evaluate it independently. Sycophancy is a well-documented behaviour, and it points
in exactly the wrong direction here.

**Arrangement 2 — Source → Generator AI → Verifier AI**

```
User supplies source text
        ↓
   Generator reasons FROM the text → Answer
        ↓
   Verifier compares claims AGAINST the same present text → per-claim result
```

Both models operate on an artefact rather than on recall. The verifier can perform a real
comparison, and a disagreement is meaningful. **Ceiling: E3** — consistency with an artefact of
unknown provenance, which is better than recall and is still not verification.

### Which is safer

**Arrangement 2, decisively.** Not marginally — categorically, because it is the only one in
which any actual checking occurs. It is why the product invests in making source-first easy
(ADR-0015) and why P4 forces it for anything headed to a pulpit.

### The fundamental limitation, stated for the record

> **A verifier AI cannot verify against material it cannot access.**
>
> **Model-to-model agreement is not source verification.**

Two independent models agreeing tells you they share a belief. Given overlapping training
corpora, shared beliefs include shared errors. Agreement is weak positive signal at best, and
under sycophancy it may be no signal at all.

### How the design enforces the distinction

- **E2 can never produce VERIFIED**, at the database, the rendering guard, and the message
  catalogue — three independent layers.
- **Disagreement is used asymmetrically**: E2 agreement leaves the status at NOT_VERIFIED, while
  E2 disagreement may produce CONTRADICTED. Disagreement means at least one model is wrong
  about something checkable; agreement means nothing comparable.
- **The verifier's own claimed basis is checked against our records.** If it says
  `compared-to-supplied-text` and no source block exists in the conversation, it is downgraded
  to E2 with a ledger note. We do not take the model's word for how it knows what it knows.
- The verification prompt requires the exact phrasing *"I could not independently verify this
  against the official EGW Library because the relevant source text was not available to me"* —
  making the limitation something the verifier must articulate rather than something the user
  must infer.

### What two models genuinely add

Not verification, but three real things: **catching internal contradictions**, **flagging
citations that look reconstructed**, and **surfacing disagreement that prompts a human to
look**. All three are worth having. None is verification, and the ledger says so.

---

## 4. Special question: Legal content minimisation (§63)

### The options compared

| Approach | Usefulness | Exposure | Verdict |
|---|---|---|---|
| Long verbatim quotation as the default | High | **High** | Rejected |
| Short quotation with attribution | High | Low–Medium | Permitted, marked and bounded |
| **Paraphrase with attribution** | Medium–High | **Low** | **Default** |
| Summary with attribution | Medium | Low | For orientation |
| Citation only | Low alone | **None** | Combined with the next |
| **Link to the official source** | High in combination | **None** | **Always present** |
| User-supplied quotation | High | **None to us** — never transmitted to our server | The path to E3 consistency, not to verification |
| Verification against supplied text | High | Low | The core workflow |

### The recommendation

**Paraphrase + attribution + link, with short marked quotation only where the member's purpose
genuinely requires the exact words, and verification against user-supplied text as the route to
confidence.**

Concretely, in the design: templates request paraphrase over quotation; P4's EGW emphasis
defaults to *leads, not text*; a "Source Check" link accompanies every EGW citation; per-block
and per-conversation caps bound what can accumulate; a 90-day expiry runs by default; and a
weekly accretion tripwire watches the aggregate across all users.

### The observation worth stating

**The copyright-minimising design and the pedagogically better design are the same design.** A
pastor who reads the chapter prepares a better sermon than one who pastes a quotation. A member
who looks up the passage remembers it. Pushing people to the source is not a legal compromise
imposed on a better product — it is the better product.

Where two independent pressures agree on a choice, that choice is usually right, and this is
one of those cases.

### Where counsel is genuinely required

Content minimisation is architecture and can be decided here. These cannot:
the **trademark question** on "SDA" in the product name; the **KJV letters-patent question**
(now closed by declining the risk — ADR-0021); the
**database-right status of the catalogue**; the **safe-harbour framework** for user-pasted
excerpts; and **contributory exposure** from generating prompts about protected works. All five
are listed with owners in [Copyright §10](../60-risk/65-copyright-risk-analysis.md#10-questions-for-counsel-in-priority-order).

---

## 5. Special question: Future evolution (§64)

The MVP must not foreclose any of these. Each is checked below against the actual design.

| Future | Enabled by | Blocked by anything? |
|---|---|---|
| **Official AI API integration** | Tier A already exists in the provider abstraction as a defined-but-unbuilt adapter. The domain layer is indifferent to which tier produced an answer | **No.** The Cost Firewall would need an explicit, audited exception — which is correct: enabling it should be difficult and deliberate |
| **Enterprise AI (customer-supplied organisational key)** | Same adapter; the key belongs to the customer, and the billing relationship is theirs | **No** |
| **Additional Bible translations** | The canon index is translation-independent; the KJV module is separately loadable, so a second translation is a second module | **No.** Licensing is the constraint, not architecture |
| **Additional UI languages** | Every string is externalised from day one; ICU MessageFormat; terminology is a per-locale table; layout tested at 1.4× expansion; logical CSS properties throughout | **No.** This is the single highest-value "do it now, benefit later" decision in the design |
| **Official source integration (licensed EGW access)** | The catalogue already holds work identifiers and URL templates; licensed text would permit comparison against material of *established* provenance — a new rung, not a reuse of E3 | **No.** Gated entirely on written permission, and **no ingestion engineering begins before it exists** |
| **Pastor organisation features** | `membership` already separates entitlement from billing; manual grants are first-class; roles exist | Partially — multi-tenant authorization is a genuinely different problem and needs a re-modelled threat analysis. Plan a spike |
| **Mobile applications** | The client engines (composer, validators, safety) are pure TypeScript with no server dependency and would port directly to React Native | **No.** And a native share sheet is materially better than the web clipboard, so mobile may improve the round trip rather than worsen it |
| **Private (E2EE) conversations** | The envelope-encryption design already separates key management from storage; Private mode changes where the key comes from | **No.** Recovery UX is the hard part, not cryptography |
| **Server-side search** | Blind-index tokens with a per-user HMAC key can be added without changing the encryption of the content itself | **No.** The tradeoff (token-frequency leakage) must be documented before shipping |
| **Browser extension** | Would reduce the round trip to one click | Conditional on a written per-provider terms review. A user-initiated selection action is defensible; page reading is not (ADR-0014) |

### The one thing this architecture would make genuinely hard

**Becoming a content platform.** If the owner one day wants to host study materials, devotional
series, or commentary, the schema, the caps, the accretion tripwire, and the entire legal
posture point the other way.

That is intentional, and it is worth naming as a deliberate foreclosure rather than an
oversight. **This design is optimised for a product that verifies content it does not own.**
A product that owns content is a different product, and it should be built as one — with its
own architecture, its own licensing, and its own risk analysis — rather than grown accidentally
out of this one.

---

## 6. What would change my recommendation

Stated in advance, so the decision is made by evidence rather than by attachment:

| If this turns out to be true | Then |
|---|---|
| Verification rate < 10% at month 6 | This is a workflow product, not a verification product. Re-position; lead with P4 preparation tooling |
| Round-trip completion < 50% at month 3 | The round-trip hypothesis has failed. **This is a product decision, not an automatic trigger** — BYOK is blocked on published provider sanction ([ADR-0020](adr/0020-byok-conditional-on-official-support.md)) and cannot be shipped by a metric crossing a line |
| Deterministic catches < 2 per 100 answers | Models are better than assumed; the premise weakens. Say so publicly and shift emphasis to workflow |
| Free → paid conversion < 3% at month 6 | Change the model: donation, pastor-only, or institutional funding |
| The trademark question resolves against the name | Rename. It is a message-catalogue change, and it was designed that way for this reason |
| The Estate offers licensed access | Take it. Comparison against text of established provenance is a different and stronger thing than today's E3, and would change the product's value fundamentally |
| A provider ships equivalent citation grounding | Compete on workflow and the record, not on checking. Integrate rather than fight |

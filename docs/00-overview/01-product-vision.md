# Product Vision — SDA AI Workspace

**Document 2 of 37** · Status: Approved for implementation planning · v1.1

---

## 1. The vision statement

> Build the best possible Seventh-day Adventist AI research and conversation workspace
> **without owning or redistributing the Ellen G. White writings**, and without the operator
> ever paying for AI inference.

A member should be able to move fluidly through this loop:

```
Ask → Think → Consult Scripture → Consult the official EGW Library
    → Use their own AI → Verify → Save → Continue
```

while cost stays predictable, infrastructure stays maintainable, privacy stays strong,
provider dependence stays low, EGW content stays outside our database, attribution stays
clear, and hallucination risk is aggressively controlled.

---

## 2. The problem

Adventist members and pastors already use ChatGPT, Claude, and Gemini for spiritual study.
Three things go wrong, consistently:

**Fabricated citations.** General-purpose models invent Ellen G. White quotations, book
titles, and page numbers with high fluency and high confidence. A model that has read
*about* *The Desire of Ages* will happily produce a sentence that sounds exactly like it, and
attach a page number. To a reader who trusts the output, an invented quotation from a
source they revere is not a minor error — it is a false witness placed in their mouth when
they repeat it from a pulpit.

**No discipline about sources.** Nothing in a general chat interface distinguishes "this is
what Scripture says", "this is what a verified Ellen G. White passage says", "this is what
the model believes she said", and "this is the model's own synthesis". All four arrive in
the same typeface.

**No workflow.** Sermon preparation, prayer formulation, and pastoral study are structured
tasks. A blank chat box is a poor tool for a structured task, and the resulting work is
scattered across dozens of unnamed conversations in a provider's history.

Meanwhile, the obvious technical fix — build an EGW retrieval system — is closed. It would
require copying a copyrighted corpus, would create meaningful legal exposure, and would put
the operator in the position of presenting a private copy of the writings as authoritative.
That path is rejected in this design and will not be reconsidered without written permission
from the rights holder.

---

## 3. The insight

The value is not in owning the knowledge. It is in **disciplining the workflow around
knowledge the user already has legitimate access to.**

The official EGW Library is free, online, searchable, and authoritative. The Bible is
freely available. The user already has an AI subscription. What is missing is the connective
tissue: a place that composes the right prompt, receives the answer, takes it apart claim by
claim, checks what can be checked mechanically, marks honestly what cannot, and keeps the
record.

That connective tissue can be built with **no model, no corpus, and no per-use cost.**

---

## 4. What we are building

**A citation-integrity workbench with a chat-shaped surface.**

Three specialised applications share one platform:

| App | For | Core job |
|---|---|---|
| **P2 — Prayer Note** | Any member | Turn a burden into a structured, scripturally-grounded prayer prompt the member can pray with or take to their AI |
| **P3 — Spiritual Guidance** | Any member | Explore a spiritual question with strict separation between Scripture, verified EGW material, and AI synthesis |
| **P4 — Pastor's Aids** | Pastors, elders, teachers | Sermon and Bible-study preparation with controllable homiletic parameters and full source discipline |

All three feed the same shared machinery: the **Prompt Composer**, the **Answer Intake**,
the **Claim Ledger**, the **Verify Sources** workflow, and **My Conversations**.

---

## 5. What we are explicitly not building

- Not an EGW library, database, index, search engine, or mirror.
- Not an AI model, and not a reseller of anyone else's model.
- Not a substitute for a pastor, counsellor, physician, therapist, lawyer, or emergency service.
- Not a doctrinal authority. The product organises study; it does not adjudicate theology.
- Not a scraper, automator, or credential broker for any third-party AI service.

---

## 6. Positioning

| | ChatGPT alone | An EGW RAG product | **SDA AI Workspace** |
|---|---|---|---|
| Has the EGW corpus | No | Yes | No — by design |
| Copyright exposure | User's | High | Minimal |
| Fabricated citations caught | No | Some | Mechanically, for Bible refs and EGW titles |
| Owner AI cost | n/a | High and variable | **$0, structurally** |
| Workflow for sermon prep | No | Maybe | Yes |
| Honest about what was verified | No | Often not | **This is the product** |
| Feels like a chat app | Yes | Yes | Mostly (see [Critical Review §2](../90-decisions/92-critical-review.md#2-special-question-can-this-really-feel-like-chatgpt-61)) |

The competitive claim is narrow and defensible: **we are the only one that tells you when it
doesn't know.**

---

## 7. Principles

1. **Honesty over helpfulness.** "I cannot verify this from the available sources" is a
   successful outcome, not a failure. The UI must make it feel that way.
2. **The catalogue is not the corpus.** We may know that *The Desire of Ages* exists, who
   published it, and where to read it. We may not know what is on page 331.
3. **No model in our trust boundary.** Every architectural benefit in this design —
   zero AI cost, no server-side prompt injection, provider neutrality, legal simplicity —
   descends from this one constraint.
4. **Deterministic beats probabilistic wherever a determinstic check exists.** A verse-range
   table catches "John 3:99" perfectly, forever, for free.
5. **The user owns their AI relationship.** We never hold their keys, cookies, passwords, or
   session. We hand them a prompt and a link.
6. **Minimise reproduction.** Paraphrase with attribution is the default answer shape.
   Verbatim quotation is a deliberate, bounded, marked exception.
7. **Privacy is structural, not promised.** Message bodies are encrypted with per-user keys.
   Administrators see metadata. Deletion is real.
8. **Predictable cost is a feature.** Any component whose bill scales with a stranger's
   enthusiasm is a design defect.

---

## 8. Success, defined

**Year 1 — is it trustworthy?**
- ≥95% of Bible references surfaced in the product are validated or flagged, never silently accepted.
- Zero incidents in which the product's own UI asserts that a source was verified when it was not.
- Median time from question to a saved, claim-ledgered answer under 4 minutes.

**Year 1 — is it used?**
- 500 registered members; 150 monthly active; 40 paying.
- ≥30% of saved answers have had **Verify Sources** run at least once. (If this number is low,
  the product's central premise is not landing and the roadmap must change.)

**Year 1 — is it sustainable?**
- Infrastructure under US$60/month at 500 members.
- Owner-paid AI inference cost: **$0.00**, verified by invoice.

The metric that would falsify the whole thesis: **if members run Verify Sources on fewer
than 10% of answers, they do not want a verification product, and this should become a
prompt-and-workflow product instead.** That decision point is scheduled at month 6.

---

## 9. Who this is for

- **Sister Kim, 58, Seoul.** Writes in Korean. Uses ChatGPT casually. Wants help praying for
  a son who has left the church. Needs P2, in Korean, with 화잇 선지자 referenced properly and
  never invented.
- **Pastor Mensah, 41, district pastor, three churches.** Prepares 4–6 sermons a month.
  Needs P4: outlines, Scripture discovery, EGW leads he can look up himself, and confidence
  that nothing he quotes from the pulpit was hallucinated.
- **Brother Silva, 33, Sabbath School teacher.** Prepares lesson discussion questions. Needs
  P4 lite and P3.
- **A conference communication director** evaluating whether to recommend the tool. Needs
  the copyright posture and the privacy posture to survive scrutiny.

---

## 10. The honest limitations, stated up front

This product **cannot guarantee** that an external AI will not hallucinate. It is not
technically possible to make that guarantee about a model we do not run.

What it can guarantee is narrower and still valuable:

| We guarantee | We request | We depend on the user for |
|---|---|---|
| We never assert a source was verified unless evidence of a specific kind was recorded | We instruct the external AI to refuse when evidence is insufficient | Actually opening the official library and confirming a passage |
| Every Bible reference is checked against a canon index | We instruct it to prefer paraphrase over quotation | Pasting source text accurately |
| Every EGW work title is checked against a catalogue | We instruct it to mark uncertainty explicitly | Judgement about theological soundness |
| We store no EGW corpus | We instruct it to treat pasted text as data, not instruction | Their own AI provider's behaviour |

This three-column distinction is mandatory throughout the product and appears verbatim in
the UI. See [Source Verification Architecture §3](../40-ai/43-source-verification-architecture.md).

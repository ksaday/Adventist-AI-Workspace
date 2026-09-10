# Copyright Risk Analysis

**Document 17 of 37** · v1.1

> **This document identifies risks and describes architectural mitigations. It is not legal
> advice and must not be relied on as such. Items marked `⚖` require qualified counsel before
> launch. See [Legal & Compliance Review](66-legal-compliance-review.md).**

---

## 1. The risk surface, and how the architecture collapses it

A conventional "AI for Ellen G. White writings" product would face substantial copyright
exposure across ingestion, storage, indexing, reproduction, and distribution. This
architecture eliminates most of that surface by declining to hold the corpus at all.

| Activity | Conventional product | **This design** | Residual risk |
|---|---|---|---|
| Copying works into a database | Yes | **No** | **None** |
| OCR / PDF ingestion | Yes | **No** | **None** |
| Scraping the official library | Often | **No** | **None** |
| Embeddings / vector index | Yes | **No** | **None** |
| Serving passages to users | Yes | **No** | **None** |
| Bibliographic catalogue (titles, page counts) | Incidental | **Yes** | **Low** ⚖ |
| Temporary storage of user-pasted passages | Sometimes | **Yes, capped and expiring** | **Low–Medium** ⚖ |
| Prompting a third-party model about the works | Yes | **Yes** | **Low** ⚖ |
| Deep-linking to the official library | Sometimes | **Yes** | **Low** ⚖ |
| Bundling KJV text | Sometimes | **Conditional** | **Medium** ⚖ — see §5 |

Everything above the catalogue row is *not a risk we mitigate*; it is a risk that **does not
arise**, because the activity does not occur. That distinction matters in a legal review: the
question is not "how well is the ingestion pipeline defended" but "there is no ingestion
pipeline".

---

## 2. Copyright status of the Ellen G. White writings

`[VERIFY]` **⚖ This is the first question for counsel.**

The situation is genuinely complex and this design does not assume an answer:

- Ellen G. White died in 1915. Works published in her lifetime are, in most jurisdictions,
  long out of copyright on an author's-life-plus-term basis.
- However: **compilations, edited editions, translations, annotations, prefaces, indexes, and
  new typesettings can carry their own copyright**, and much of what a modern reader
  encounters is exactly that.
- The Ellen G. White Estate actively stewards the writings and asserts rights over its
  editions, compilations, and digital presentations.
- Terms of service on the official site govern how its content may be used, **independently of
  copyright**. A work in the public domain can still be accessed under contractual terms that
  restrict scraping, bulk downloading, and redistribution.
- Different jurisdictions reach different answers, and this product's members are global.

**The architecture's response is to not depend on the answer.** Whether a given work is in the
public domain or not, this product does not copy it, store it, index it, or serve it. That
posture is correct under every possible answer, which is why it was chosen rather than the
faster path of resolving the question and building accordingly.

**Note the asymmetry that makes this important:** if counsel concludes the works are broadly
public domain, this design loses nothing — it simply had a stricter posture than required. If
counsel concludes rights are substantially asserted, this design is already compliant. A
corpus-based design has the opposite risk profile.

---

## 3. The bibliographic catalogue ⚖

**What it holds:** ~200 records of work title, standard abbreviation, author, publisher,
first-publication year, reference-edition page count, official URL template, `last_reviewed`.

**Why it is low risk:**
- Facts — a book's title, author, publisher, year, and page count — are generally not
  copyrightable subject matter in themselves.
- The compilation is our own: assembled, structured, and maintained by us for our own purpose.
- It contains no expressive content from any work.
- It serves a purpose favourable in most analyses: enabling accurate attribution and
  **detecting misattribution**.

**Where the risk actually lies:**
- **A database or compilation right may attach to a substantial selection or arrangement**,
  particularly in the EU/UK sui generis database regime. If our catalogue were assembled by
  copying the official library's catalogue wholesale, that could raise a question distinct
  from copyright in the works.
- Mitigation: compile from multiple public bibliographic sources; structure it for our own
  purpose; record provenance for each record; do not replicate another catalogue's selection
  or arrangement. `⚖ Confirm this approach with counsel.`
- Do not include a Korean or other localised title unless its accuracy is verified, and
  record how it was verified.

**If challenged:** the catalogue can be reduced to titles and abbreviations, or removed
entirely, degrading EGW citation validation while leaving the rest of the product intact
([EGW Interaction Policy §9](../40-ai/44-egw-interaction-policy.md)).

---

## 4. User-pasted source text

**This section shrank considerably in Revision 1.1**, because the risk it analysed was largely
removed rather than mitigated.

A member copies a passage from the official library into their own conversation. **It stays in
their browser.** It is never transmitted to our server
([ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md)). We record metadata —
kind, character count, attributed work, and a commitment the browser computed that we cannot
verify.

**What this removes outright:**
- We are no longer a service provider *storing* this content. The safe-harbour question, the
  notice-and-takedown obligation for source text, and the repeat-infringer analysis largely
  fall away with the storage.
- There is no corpus to breach, subpoena, or accidentally back up. Text we never receive cannot
  leak from us.
- A personal source library is not deferred behind a design gate — it is architecturally
  excluded, because the storage path it would have needed no longer exists.

**What remains:**
1. **Accretion, on metadata.** A thousand members each pasting a different chapter still tells
   us something in aggregate, and the tripwire still runs — it only ever needed `char_count`
   and `attributed_work_id`. It does not auto-delete; it tells a human to look.
2. **Message bodies still hold purported quotations.** ⚖ A member's own words and the answers
   they paste back from their AI *are* stored, encrypted, and may contain quoted material. The
   service-provider posture applies **here**, not to the supply channel, and the package says
   so plainly rather than claiming an absolutism the schema cannot deliver (SR-D1a).
3. **The browser still transmits the passage to the member's AI provider.** That is the
   workflow and it is disclosed. It is the member's own act with their own account, but it is
   not nothing, and "our server never receives it" is never shortened to "it never leaves your
   machine."

**Required before launch:** a takedown contact and procedure published in the Terms; an
internal runbook for responding; and the accretion report actually being read.

---

## 5. KJV and the Crown's perpetual right

**Decided: no verse text ships** ([ADR-0021](../90-decisions/adr/0021-no-bundled-verse-text.md)).
This section is retained because the reasoning matters and because a future licensed source
would reopen it.

The bundled KJV verse-text module was the **highest-risk optional component in the design**,
which is why it is now excluded rather than merely conditional.

- In the **United States**, the King James Version text is in the public domain.
- In the **United Kingdom**, the KJV is held under the **royal prerogative, exercised through
  perpetual letters patent** — the King's Printer (Cambridge University Press), with Oxford
  University Press and, in Scotland, the Scottish Bible Board. `⚖`
- **This is not Crown copyright.** Crown copyright under CDPA s.163 is a different regime with
  a different basis and a different duration. Conflating the two produces a legal question that
  does not exist while obscuring the one that does, and the distinction should survive any
  future editing of this section. See the GOV.UK guidance on Crown copyright and the
  Authorised Version.
- The arrangement is unusual, often overlooked, and jurisdiction-specific.
- Our members are global, and the operator's establishment determines much of the analysis.

**Options:**

| Option | Benefit | Risk |
|---|---|---|
| **A** Bundle the KJV text | Deterministic verbatim verse checking — the highest-value anti-hallucination feature available at zero cost | UK position ⚖ |
| **B** Ship reference validation only (no verse text) | Zero risk; still catches non-existent references, which is most of the value | Cannot detect misquotation of a real verse |
| **C** Use a licensed Bible API | Full text, clear terms | Usually usage-metered — conflicts with §4.2 — and adds a runtime dependency |
| **D** Bundle a different public-domain translation (e.g. ASV, WEB) | Clear status, no Crown-patent question | Not the translation the product's audience expects |

**Decision: B**, adopted in [ADR-0021](../90-decisions/adr/0021-no-bundled-verse-text.md) as
the decision rather than as a fallback. `Q-02` closes.

The cost is real and is stated rather than minimised: **misquotation of a real verse cannot be
detected.** A model that renders John 3:16 with altered wording passes every check we run. What
survives is the larger share of the value — a reference that does not exist is still caught
deterministically, and fabricated *references* are considerably more common in model output
than subtly altered wording of real ones.

Options A, C and D remain revisitable, but only on counsel's initiative, not on ours.

---

## 6. Prompting a third-party model about copyrighted works ⚖

We generate prompts asking a member's AI to discuss, paraphrase, and occasionally quote from
copyrighted works.

- The prompt itself contains no copyrighted content unless the member supplied it.
- Any reproduction happens in **the member's own session with their own provider**, under
  their agreement with that provider.
- We are not the reproducer; we are, at most, a tool that facilitated a user's request.

**Our mitigations, which are also good product design:**
- Templates explicitly request **paraphrase with attribution over quotation** and ask that any
  necessary quotation be kept brief.
- P4's EGW emphasis defaults to **leads, not text**.
- No feature exists whose purpose is bulk reproduction, and no bulk export of source text is offered.
- We explicitly instruct against fabricating quotations, which is a related but distinct harm.

`⚖ Confirm that generating such prompts creates no contributory exposure in the operator's
jurisdiction.` The mitigations above are what a reasonable analysis would look for.

---

## 7. Deep-linking to the official library ⚖

Linking to publicly accessible pages is generally permitted. Risks are narrow and manageable:

- **Framing** — we never frame external content. New tab only.
- **Deep-linking past a paywall or login** — not applicable; the library is publicly readable.
  `⚖ Confirm this remains true.`
- **Terms of service on the target site** may address automated access. Our reachability probe
  is one `HEAD` request per entry per 24 hours, storing only a status code. `⚖ Confirm this is
  acceptable, or disable the probe and rely on user reports.`
- **Trademark** — we must not use the Ellen G. White Estate's name or marks in a way implying
  endorsement or affiliation. See §8.

All external URLs are configuration, so any of these can be adjusted without a release.

---

## 8. Trademark and branding ⚖

- **"Seventh-day Adventist" and "SDA" are protected marks** of the General Conference of
  Seventh-day Adventists, and their use by unaffiliated entities is actively policed. A
  product named **"SDA AI Workspace"** uses the mark in its name.
  **`⚖ This is the second question for counsel, and it may require either permission or a
  name change.`** The design should anticipate that outcome: the product name appears in the
  message catalogue and the configuration, not hard-coded, so a rename is a content change.
- The product must not imply official denominational endorsement. A clear, prominent
  disclaimer — *"an independent tool, not affiliated with or endorsed by the General
  Conference of Seventh-day Adventists or the Ellen G. White Estate"* — belongs in the footer,
  the Terms, and the About page.
- Do not use the Estate's logo, wordmark, or site branding.
- Nominative reference to the works by their titles, for identification, is ordinary and
  necessary.

**This risk is under-weighted by most builders in this space and is more likely to produce a
letter than the copyright questions are.** It should be resolved before any public launch, not
after traction.

---

## 9. Content minimisation compared (§63)

| Approach | Usefulness | Copyright exposure | Verdict |
|---|---|---|---|
| Long verbatim quotation as the default answer | High | **High** | Rejected |
| Short quotation with attribution | High | Low–Medium | Permitted where necessary, marked and bounded |
| Paraphrase with attribution | Medium–High | **Low** | **Default** |
| Summary with attribution | Medium | Low | Used for orientation |
| Citation only (no content) | Low alone | **None** | Combined with the next row |
| Link to the official source | High **in combination** | **None** | **Always present** |
| User-supplied quotation | High | **None to us** — never transmitted to our server | The path to E3 consistency, which is not verification |
| Verification window against supplied text | High | Low | The product's core workflow |

**The recommended UX is: paraphrase + attribution + link, with short marked quotation only
when the member's purpose genuinely requires the exact words, and verification against
user-supplied text as the route to confidence.** This is simultaneously the safest posture and
— because it forces the member to engage with the actual source — the better study practice.

That alignment is worth stating: the copyright-minimising design and the pedagogically
superior design are the same design. Where those two pressures agree, the resulting product is
usually right.

---

## 10. Questions for counsel, in priority order

| # | Question | Blocks |
|---|---|---|
| 1 | Trademark: may an independent product use "SDA" / "Seventh-day Adventist" in its name? What disclaimer is required? | Public launch and naming |
| 2 | KJV: may the operator redistribute KJV text in their jurisdiction and to a global audience? | The KJV module (§5) |
| 3 | Copyright status of specific EGW editions relevant to the catalogue; is a facts-only catalogue safe? | Catalogue scope |
| 4 | Storing user-pasted excerpts: what safe-harbour framework applies, and what does it require? | Takedown process |
| 5 | Does generating prompts about copyrighted works create contributory exposure? | Template design (mitigations already in place) |
| 6 | Is the daily `HEAD` reachability probe acceptable under the target sites' terms? | Probe (disable if not) |
| 7 | Terms of Service and Privacy Policy review, including the global-membership posture | Launch |

---

## 11. If a rights holder objects

1. **Respond within 48 hours**, courteously, from a published contact address.
2. **Comply first, discuss second.** Remove or disable the disputed element immediately —
   almost every element they could name is configuration.
3. **Preserve the record** of what was changed and when.
4. **Reassess the design.** Removing the EGW catalogue degrades citation validation for EGW
   claims and leaves the Bible validation, the evidence ladder, the workflow, and all three
   applications working.
5. **Treat it as an opportunity.** An organisation that stewards these writings and a product
   built to stop people fabricating quotations from them have a genuine shared interest. That
   conversation is worth having, and this architecture is what makes it possible to have it in
   good faith.

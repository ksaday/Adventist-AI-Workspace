# Safety Architecture

**Document 21 of 37** · v1.1

---

## 1. The premise

A product that invites people to bring spiritual questions will receive, sooner than its
builders expect:

> "I don't want to be here any more."
> "He says if I tell anyone at church he'll take the children."
> "I keep thinking about hurting myself and I can't tell my pastor."
> "My daughter told me something about her uncle and I don't know what to do."

The product's job in those moments is small, specific, and achievable: **notice, offer real
help, do not pretend to be that help, and do not get in the way.** It is not a crisis service,
and every design decision below follows from refusing to act like one.

---

## 2. Design principles

1. **Never block.** A person in distress who is prevented from continuing has been abandoned
   by the tool at the moment they reached for it. The panel is dismissible, always.
2. **Never report.** No automated contact with any third party, ever. Automated crisis
   reporting endangers people — it can trigger a police response the person did not want and
   is not safe for them.
3. **Never store the trigger.** The event records category and locale. Not the text, not a
   severity score, not a per-person history. **This product does not build risk profiles of
   the people who confided in it.**
4. **Never diagnose.** No "you may be experiencing depression". We are not qualified and the
   product must not appear to be.
5. **Screen before transmission.** Matching happens in the browser, before anything is sent
   anywhere. Safety screening that requires sending the crisis text to a server is worse than
   none.
6. **Two layers.** Our panel, and a clause in the composed prompt so the member's own AI also
   responds appropriately. Neither layer is sufficient alone.
7. **Be locally correct.** A US number shown to a member in Seoul is worse than useless.

---

## 3. Detection

**Deterministic, client-side, lexicon-based.** No model, no network, no cost.

```
User types → screen(text, locales, lexicon) → RiskMatch[]
```

| Category | Examples of what it catches | Severity |
|---|---|---|
| `imminent_harm` | Explicit statements of intent to die, plan, or means | 3 |
| `self_harm` | Ideation, hopelessness, self-injury | 2–3 |
| `abuse` | Domestic violence, child abuse, coercive control | 2–3 |
| `violence` | Threats toward others | 3 |
| `medical_emergency` | Descriptions of acute medical crisis | 2–3 |

Design of the lexicon:

- **Authored per language, never translated.** Idiom is everything here. Korean expressions of
  suicidal ideation are not translations of English ones, and a translated lexicon will miss
  the phrases people actually use. Each language's lexicon must be written by a fluent speaker
  with relevant experience.
- **Tuned for recall over precision.** A false positive costs a dismissible panel. A false
  negative costs the only chance the product had.
- **Resilient to spacing and simple obfuscation** — normalise whitespace, repeated characters,
  and common substitutions — without becoming a keyword-guessing game.
- **Versioned data**, reviewed annually and after any incident.
- **Context-aware where cheap.** "I want to die to self" in a P2 prayer context is a
  devotional idiom, not ideation. A small negation-and-idiom exclusion list reduces the
  noisiest false positives; where the exclusion is uncertain, **show the panel**.

**Acknowledged limitation:** a lexicon misses paraphrase, understatement, and the quiet ways
people actually disclose. It will produce both false positives and false negatives. An LLM
classifier would be better and is unavailable here at zero cost and zero transmission — and
transmitting the text to classify it would violate principle 5. The prompt-level safety clause
(§5) is the compensating layer, because the member's own AI *does* read the whole message.

---

## 4. The response panel

Non-blocking, appearing above the composer before the prompt is generated:

```
┌─────────────────────────────────────────────────────────────────┐
│  Before you continue                                            │
│                                                                 │
│  What you've written suggests you may be going through          │
│  something very hard. If you are in danger, or thinking about   │
│  harming yourself, please reach someone who can help right now: │
│                                                                 │
│    자살예방 상담전화   109       24 hours                        │
│    응급               119                                        │
│    Find help near you  →                                        │
│                                                                 │
│  You can keep using this tool. It isn't a substitute for        │
│  talking to a person who can help.                              │
│                                            [ Dismiss ]          │
└─────────────────────────────────────────────────────────────────┘
```

Behaviour: shown once per triggering input; dismissible; does not clear the composer; does not
prevent generation; never re-shown for the same text. For `imminent_harm` the panel cannot be
permanently disabled in Settings, though it remains dismissible per occurrence — the one place
where the design accepts a small amount of friction.

Copy rules: no diagnosis, no promises, no "everything will be fine", no scripture quoted at
someone in crisis unless they asked, no guilt. Short sentences. The resources come first.

---

## 5. The prompt-level safety clause

When a match occurs, the composed prompt gains:

```
This person may be describing a crisis. Begin by acknowledging what they are carrying.
Encourage them to reach appropriate professional or emergency help, and say plainly
that spiritual reflection is not a substitute for it. Do not attempt counselling or
diagnosis. Do not minimise what they have described. If they have indicated immediate
danger, put the emergency guidance first, before anything else.
```

And in **every** P2 and P3 prompt, regardless of any match (PR-SAF-03):

```
You are not a physician, therapist, licensed counsellor, lawyer, or ordained minister,
and you must not present yourself as one. Where a situation calls for professional or
emergency help, say so plainly.
```

This second layer catches what the lexicon misses, because the member's own AI reads the whole
message with genuine comprehension. Neither layer is sufficient alone; together they are a
reasonable answer within the constraints.

---

## 6. Emergency resource directory

Admin-managed, region-scoped, with review dates.

| Field | |
|---|---|
| `region` | ISO 3166-1 alpha-2, or `GLOBAL` |
| `locale` | Display language |
| `category` | Which risk category it serves |
| `name`, `phone`, `url`, `hours` | The resource |
| `last_reviewed` | Drives a staleness warning at 12 months |

**Region is user-selected**, defaulting from the browser locale, never inferred from IP
address ([Data Retention §7](../20-data/22-data-retention-and-controls.md)). Inferring
location would give better resources automatically at the cost of the product knowing where
someone is when they type something desperate. The member sets it in Settings; a "wrong
country?" link appears on the panel itself.

`[VERIFY]` — **every number in the seed directory must be confirmed before launch and
reviewed annually.** A stale hotline number in a crisis panel is the worst defect this product
could ship. Seed regions: KR, US, JP, GB, AU, CA, BR, PH, plus a GLOBAL fallback pointing to
an international directory of crisis lines.

---

## 7. What is recorded

```json
{ "event": "safety_resource_shown", "category": "self_harm",
  "locale": "ko", "app": "p3", "at": "2026-09-09T12:00:00Z", "user_id": "…" }
```

That is all. No text, no severity trend, no per-user history surfaced anywhere, no admin view
of who triggered what. The aggregate count exists only to answer one operational question:
*is the panel firing far more or far less than expected, suggesting the lexicon needs work?*

Retention: 12 months, then deleted.

`user_id` is included so a member's own data export is complete and their deletion is
complete. It is not queryable by category in any administrative interface, and that
restriction is a code-review item, not a convention.

---

## 8. Professional-role boundaries

The product must never present itself as, and must instruct the external AI never to
role-play as: a physician · therapist or psychologist · licensed counsellor · lawyer ·
ordained minister giving a pastoral ruling · financial adviser.

Enforced through: the core preamble in every template; a persistent unobtrusive line in P3;
the Terms; and copy review. Product naming follows the same rule — "Spiritual Guidance", never
"Counselling"; "Pastor's Aids", never "Pastor" ([Glossary §1](../00-overview/06-glossary-terminology.md)).

**Mandatory-reporting question.** In some jurisdictions, certain professionals must report
disclosed child abuse. We are not those professionals and this product does not create such a
relationship — but the question of whether an operator receiving such a disclosure through
break-glass acquires an obligation is genuinely unclear and jurisdiction-specific.
`[VERIFY]` — **this must go to counsel before launch**
([Open Questions Q-03](../90-decisions/91-open-questions.md)). The architecture reduces
exposure by ensuring the operator does not routinely see content at all.

---

## 9. Content the product will not help with

| Request | Response |
|---|---|
| Instructions for self-harm | The prompt instructs refusal; our composer does not generate such a prompt |
| Spiritual justification for harming another | Same |
| "Prove my spouse is possessed / an apostate" | Prompts steer toward the member's own situation and their local pastor |
| Doctrinal weaponry against a named individual | The denominational clause directs toward the local pastor, not adjudication |
| Medical or legal decisions | Explicit refusal plus a referral to a professional |

These are prompt-level and copy-level controls, not filters. We do not police what a member
writes — we shape what we ask their AI to do with it.

---

## 10. Testing and review

| Item | Cadence |
|---|---|
| Lexicon recall against a curated case set per language | Every release |
| Panel renders and is dismissible in every locale and at every breakpoint | Every release |
| No trigger text reaches any log, metric, or error report | Every CI run (canary) |
| Prompt safety clause present in every P2/P3 template version | Every CI run |
| Emergency numbers verified | Before launch, then annually |
| Lexicon reviewed by a qualified reviewer | Annually, and after any incident |
| Panel copy reviewed by someone with crisis-response experience | Before launch |

---

## 11. Honest limitations

- **Keyword matching misses most real disclosures.** People rarely say the words a lexicon
  contains. The prompt-level layer is the compensation, and it is imperfect too.
- **We cannot know if anyone was helped.** No follow-up, no tracking, no outcome measurement —
  deliberately, because measuring it would require exactly the surveillance the design refuses.
- **The panel may be dismissed reflexively**, like a cookie banner. Restraint elsewhere in the
  product — no other interstitials, no upsell modals, no notifications — is what preserves the
  chance that this one is read.
- **We are not a crisis service and must never be mistaken for one.** If members begin using
  the product as one, that is a signal to invest in partnerships with organisations that
  actually are, not to build crisis features.

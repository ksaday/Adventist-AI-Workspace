# UX / UI Specification

**Document 5 of 37** · v1.1

---

## 1. The central UX problem

The product must feel like a modern conversational AI application while being honest that
**it is not the AI**. Those two goals pull against each other, and every screen in this
specification is a negotiation between them.

The resolution adopted here: **our surface is a workbench with a chat-shaped timeline.** The
timeline is familiar — turns, bubbles, a composer at the bottom, history on the left. But
the turns are of four visibly different kinds, and the difference is never cosmetic:

| Turn kind | Who produced it | Visual treatment |
|---|---|---|
| **You** | The member | Right-aligned, accent-tinted, plain |
| **Workspace** | Our deterministic engine | Left-aligned, bordered card, small "Workspace" label, no avatar that could read as an AI persona |
| **External AI** | Pasted from the user's own provider | Left-aligned, **distinct background**, provider badge (ChatGPT / Claude / Gemini), a thin left rule in the provider's neutral colour, and always an "unverified" state until the ledger says otherwise |
| **Note** | System events (safety resources shown, source added) | Centred, small, muted |

A member must be able to tell at a glance which words came from a machine we do not control.
If that distinction ever becomes subtle, the product has failed at its main job.

---

## 2. Design principles

1. **Honest affordances.** Nothing looks like it is thinking when it is not. No fake typing
   indicators for Workspace turns — they are instant, and they should feel instant.
2. **The gap is a step, not an error.** The copy/launch/paste round trip is presented as a
   deliberate part of the workflow, with clear state, not as an apology.
3. **Evidence is always visible, never modal.** Status and evidence level ride with the claim.
4. **Uncertainty is not visually punished.** "Not verified" is neutral, not red. Red is for
   contradiction and for validator failures — things that are actually wrong.
5. **Green is earned.** Only **E4** gets green — a claim the member personally confirmed at an
   official source. Nothing else, ever. E3 has its own distinct, non-green treatment.
6. **Calm.** This product handles grief, illness, and confession. No confetti, no streaks,
   no gamification, no "you're on fire!" Restraint is a feature.
7. **Desktop-first, genuinely mobile-capable.** Pastors work at desks; members pray on phones.

---

## 3. Visual language

| Token | Value | Note |
|---|---|---|
| Type | System UI stack with a serif option for reading long answers | Korean, Japanese, and Latin must all set well; test with 화잇 선지자 in every component |
| Base size | 16px, 1.6 line height; 17–18px in the answer reader | Long-form reading matters here |
| Palette | Warm neutral ground; a single restrained accent (deep indigo or slate blue); semantic colours used sparingly | Avoid the "AI product" purple-gradient idiom — it implies we have a model |
| Evidence colours | **E4 green** · E3 blue (consistency, not confirmation) · E2 amber-neutral · E1 grey · E0 grey · Contradicted red · Validator failure red | Never colour-only: every state carries an icon and a text label (WCAG 1.4.1). E3's blue must not read as a success colour beside E4's green |
| Density | Comfortable. Generous whitespace | |
| Motion | 120–180 ms, ease-out, respects `prefers-reduced-motion` | |
| Dark mode | Full support; the evidence palette is re-derived, not merely inverted | |

---

## 4. Application shell

```
┌────────────┬─────────────────────────────────────────────────────────────┐
│ SDA AI     │  Spiritual Guidance · "Trusting God in hardship"      ⋯     │
│ Workspace  ├─────────────────────────────────────────────────────────────┤
│            │                                                             │
│ + New Chat │   [conversation timeline]                                   │
│            │                                                             │
│ TOOLS      │                                                             │
│ ○ Prayer   │                                                             │
│   Note     │                                                             │
│ ● Spiritual│                                                             │
│   Guidance │                                                             │
│ ○ Pastor's │                                                             │
│   Aids  ᴾ  │                                                             │
│            │                                                             │
│ RECENT     ├─────────────────────────────────────────────────────────────┤
│ Trusting…  │  ┌───────────────────────────────────────────────────────┐  │
│ Prayer fo… │  │ Ask about anything…                                   │  │
│ Sabbath q… │  │                                          [Compose →]  │  │
│ ⌕ Search   │  └───────────────────────────────────────────────────────┘  │
│            │  🌐 Korean detected · change    ⚑ Standard · make ephemeral │
│ ──────────│                                                             │
│ ⚙ Settings │                                                             │
│ 👤 Member  │                                                             │
└────────────┴─────────────────────────────────────────────────────────────┘
```

- `ᴾ` marks a Pastor-tier tool for members who do not have it. Clicking shows what it does
  and what it costs — never a bare lock icon.
- Language and privacy indicators sit under the composer where they are visible at the moment
  of writing, not buried in settings.
- Mobile: the sidebar becomes a drawer; the composer is sticky; the tool switcher moves to a
  segmented control at the top.

---

## 5. The core loop, screen by screen

### 5.1 Compose

The member types; **Compose** produces a Workspace turn:

```
┌─ Workspace ─────────────────────────────────────────────────────┐
│ I've prepared a prompt for your AI. It asks for Scripture and   │
│ any Ellen G. White material to be kept separate, and for        │
│ anything uncertain to be said plainly.                          │
│                                                                 │
│ ┌─ Prompt · 1,847 characters ─────────────────────── [expand] ┐ │
│ │ You are assisting a Seventh-day Adventist member with…      │ │
│ │ …                                                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Take it to:                                                     │
│ [ Copy & open ChatGPT ] [ Claude ] [ Gemini ] [ Copy only ]     │
│                                                                 │
│ ⓘ What this prompt asks for  ·  ⚙ Adjust                        │
└─────────────────────────────────────────────────────────────────┘
```

"What this prompt asks for" expands into a plain-language summary of the source-discipline
rules. Members should be able to understand what is being requested on their behalf without
reading a 2,000-character prompt — and pastors, in particular, will want to.

### 5.2 Launch

On click: clipboard write → toast **"Prompt copied"** → new tab opens → the timeline shows a
waiting card:

```
┌─ Waiting for your answer ───────────────────────────────────────┐
│ ↗ Opened ChatGPT in a new tab. The prompt is on your clipboard. │
│   If it didn't appear in the message box, press ⌘V.             │
│                                                                 │
│ When ChatGPT has answered, copy the whole reply and bring it     │
│ back here.                                                      │
│                                    [ Paste the answer ▾ ]       │
└─────────────────────────────────────────────────────────────────┘
```

Explicit state for the gap. The member always knows where they are in the loop, and returning
to the tab shows them what to do next rather than an inert screen.

### 5.3 Paste and validate

On paste, the answer renders with inline citation chips and a summary banner:

```
┌─ ChatGPT ────────────────────────────── pasted 2 minutes ago ───┐
│                                                                 │
│ Scripture speaks directly to this. In [John 3:16 ✓] we see…     │
│ …                                                               │
│ Ellen G. White addresses this in [The Desire of Ages, p.331 ⚪]  │
│ …and in ["The Path to Christ" ⚠]…                               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ ✓ 2 Bible references valid   ⚠ 1 title not in our catalogue     │
│ ⚪ 2 claims unverified                                           │
│                    [ Verify Sources ]   [ Check citations ]     │
└─────────────────────────────────────────────────────────────────┘
```

Chips: `✓` valid reference · `⚪` unverified claim · `⚠` validator concern · `✗` invalid
reference · `◈` consistent with supplied text (blue, E3) · `●` confirmed by you at the source
(green, **E4 only**).

The banner is not a nag. It is the product's whole reason for existing, presented once, at
the moment it is useful.

### 5.4 Verify Sources

Full layout in [Source Verification Architecture §5](../40-ai/43-source-verification-architecture.md).
Two things matter for UX:

1. **Deterministic findings appear before any AI option.** The user sees what we already know
   for certain before being invited to ask another model.
2. **"Check it yourself" is presented as the stronger path**, not the fallback. The copy says
   so: *"or verify at the source yourself, which is stronger."*

### 5.5 The Claim Ledger

```
┌─ Claims in this answer ─────────────────────────────────────────┐
│  #   Claim                          Source           Evidence   │
│ ─────────────────────────────────────────────────────────────── │
│  C1  God's love is the basis…       John 3:16        ● E4       │
│      Confirmed by you · 9 Sep 2026                   VERIFIED   │
│ ─────────────────────────────────────────────────────────────── │
│  C1b Trial produces patience…       DA, p.212        ◈ E3       │
│      Consistent with text you supplied this session.            │
│      We never saw that text and cannot re-check it.             │
│      Re-checking means pasting it again.       TEXT CONSISTENT  │
│ ─────────────────────────────────────────────────────────────── │
│  C2  Trust in God brings peace…     DA, p.331        ⚪ E1       │
│      From the AI's memory. Not verified.          NOT VERIFIED  │
│      [ Open EGW Library → The Desire of Ages ]  [ I checked it ]│
│ ─────────────────────────────────────────────────────────────── │
│  C3  (attributed to a work we…)     "The Path to…"   ⚠          │
│      Not found in our catalogue. Did you mean                   │
│      Steps to Christ?                             NOT VERIFIED  │
│ ─────────────────────────────────────────────────────────────── │
│  C4  Therefore this burden may…     —                 — E0      │
│      The AI's own reasoning. Nothing to verify.                 │
└─────────────────────────────────────────────────────────────────┘
                                        ⓘ How verification works
```

Note C4: **synthesis claims are marked as having nothing to verify, not as failures.** A
ledger that flags every piece of reasoning as unverified teaches users to ignore the ledger.

"How verification works" opens the three-column honesty contract verbatim.

---

## 6. Application-specific surfaces

### 6.1 P2 — Prayer Note

```
┌─────────────────────────────────────────────────────────────────┐
│  What would you like to pray about?                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ My son has stopped coming to church and won't talk to me  │  │
│  │ about it.                                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Kind of prayer   [ Intercessory ▾ ]                            │
│                                                                 │
│  Shape (all optional — drag to reorder)                         │
│   ☑ Address to God     ☑ Thanksgiving     ☑ Petition            │
│   ☐ Praise             ☑ Confession       ☑ Intercession        │
│   ☑ Submission to God's will              ☑ Closing             │
│   ⟲ Free-form instead                                           │
│   ⓘ This is one helpful pattern, not a required formula.        │
│                                                                 │
│  ⚑ This conversation is Ephemeral — nothing you write here is   │
│    stored on our servers.                        [ change ]     │
│                                                                 │
│            [ Draft a prayer here ]   [ Prepare a prompt → ]     │
└─────────────────────────────────────────────────────────────────┘
```

Two exits, deliberately equal in weight. **"Draft a prayer here"** runs the deterministic
skeleton and needs no external AI at all — the fastest path to real value in the product, and
the best onboarding.

Ephemeral is offered prominently and, for P2, is the default (PR-P2-08).

### 6.2 P3 — Spiritual Guidance

Question box, plus a collapsed **"Add sources (optional)"** panel that expands to paste text,
add a Bible reference, add an EGW citation, or note a URL. Adding any source switches the
composer to source-bounded mode with a visible indicator:

```
  ⛨ Source-bounded — the AI is instructed to reason only from what you supplied.
```

**At the paste target, before the member types anything**, the panel states what happens to
the text — not in a help panel, and not afterwards:

```
  ┌──────────────────────────────────────────────────────────────┐
  │  Paste the passage you want the AI to reason from.           │
  │                                                              │
  │  This text stays in this browser. It is never sent to our    │
  │  servers, so we cannot store it, read it, or check it        │
  │  against anything.                                           │
  │                                                              │
  │  When this session ends it is gone, and the "consistent      │
  │  with supplied text" marks made from it can't be redone      │
  │  without pasting it again.                                   │
  │                                                              │
  │  Your browser does send it to the AI you choose. That's      │
  │  the point — but it does leave this device that way.         │
  └──────────────────────────────────────────────────────────────┘
```

A member choosing the higher-effort workflow deserves to know its evidence expires with the
tab, and deserves not to be told the text "never leaves your machine" when their own browser
is about to hand it to a third party.

The answer renders in its five bands, with band 5 (*What remains uncertain*) given the same
visual weight as the others. It is never collapsed by default.

### 6.3 P4 — Pastor's Aids

```
┌─ Sermon outline ────────────────────────────────────────────────┐
│  Topic          [ Trusting God through loss                   ] │
│  Anchor passage [ Romans 5:1-5                            ✓   ] │
│  Occasion       [ Sabbath worship ▾ ]  Audience [ Mixed ▾ ]     │
│  Length         [ 30 min ▾ ]           Points   [ 3 ▾ ]         │
│  Form           [ Expository ▾ ]       Tone     [ Pastoral ▾ ]  │
│  Depth          [ Congregational ▾ ]                            │
│  Bible emphasis [ ●●●○○ ]   EGW emphasis [ Leads only ▾ ]       │
│  Format         [ Points + sub-points ▾ ]  Language [ English ▾]│
│                                                                 │
│  ⓘ These shape the form of the outline. They never change what  │
│    Scripture or Ellen G. White actually says.                   │
│                                       [ Prepare a prompt → ]    │
└─────────────────────────────────────────────────────────────────┘
```

The anchor-passage field validates live against the canon index — a small thing that builds
trust immediately, because the pastor sees the product catch a typo before any AI is involved.

**The outline workspace** renders the pasted answer as structured, editable objects — title,
thesis, points, sub-points, illustration placeholders, appeal — not as a text blob. Each
point shows its citations with evidence chips.

**The Citation Checklist**, before "mark ready to preach":

```
┌─ Before you preach ─────────────────────────────────────────────┐
│  Every citation in this outline:                                │
│                                                                 │
│  ● John 3:16              E4  confirmed by you                  │
│  ● Romans 5:1–5           E4  confirmed by you                  │
│  ◈ DA, p.331              E3  consistent with text you supplied │
│     ⚠ You marked this for direct quotation. Consistency is not  │
│       confirmation — open the source to finish this one.        │
│       [ Open EGW Library ]  [ I've checked it ]  [ Paraphrase ] │
│                                                                 │
│  1 citation needs your confirmation before this can be marked   │
│  ready.                                    [ Mark ready ] ✗     │
└─────────────────────────────────────────────────────────────────┘
```

**The block only applies to citations the pastor has marked for verbatim public quotation.**
Blocking on every reference would be paternalistic and would train pastors to route around
the feature. Blocking on the specific thing that damages a pulpit — quoting words that may
not exist — is proportionate and defensible.

---

## 7. Consent, safety, and disclosure

### 7.1 External-AI disclosure (first launch, once per version)

```
┌─────────────────────────────────────────────────────────────────┐
│  Before you send this to ChatGPT                                │
│                                                                 │
│  What you copy goes to ChatGPT, not to us. It is handled under  │
│  OpenAI's terms and privacy policy, not ours, and we cannot see │
│  it, control it, or delete it there.                            │
│                                                                 │
│  If you have written something you would not want stored by an  │
│  AI company, do not send it. You can use Prayer Note's local    │
│  drafting instead, which never leaves your browser.             │
│                                                                 │
│  ☐ I understand                                                 │
│                                          [ Cancel ]  [ Continue ]│
└─────────────────────────────────────────────────────────────────┘
```

No dark patterns. Cancel is a real button, not a grey word. The alternative is offered
concretely rather than as a vague caution.

### 7.2 Safety resource panel

```
┌─────────────────────────────────────────────────────────────────┐
│  Before you continue                                            │
│                                                                 │
│  What you've written suggests you may be going through          │
│  something very hard. If you are in danger, or thinking about   │
│  harming yourself, please reach someone who can help right now: │
│                                                                 │
│    자살예방 상담전화  109        24 hours                        │
│    응급               119                                        │
│    Find help near you  →                                        │
│                                                                 │
│  You can keep using this tool. It isn't a substitute for talking│
│  to a person who can help.                                      │
│                                            [ Dismiss ]          │
└─────────────────────────────────────────────────────────────────┘
```

Non-blocking. Dismissible. Never re-shown for the same input. Never stores what triggered it.
Resource numbers come from the configurable directory and are region-appropriate.
`[VERIFY]` — all hotline numbers must be confirmed and reviewed before launch and annually.

---

## 8. Empty and error states

| State | Treatment |
|---|---|
| No conversations | The three tools, each with one sentence and a single example question |
| Clipboard blocked | Prompt shown in a selectable field with manual-copy instructions; the tab does **not** open |
| Claims block missing | *"Your AI didn't include the claims summary. You can mark the claims yourself — we'll suggest where they are."* + manual segmentation |
| Nothing to verify | *"This answer doesn't make source claims we can check."* Not an error |
| Server unreachable | Banner: *"You're offline. You can keep composing and copying — nothing is being saved right now."* + a download button |
| Quota reached | What the limit is, when it resets, what upgrading gives. Never a dead end |
| Validation unavailable | *"We couldn't check references right now"* — **never** an implied pass |

---

## 9. Accessibility (WCAG 2.2 AA)

- Every evidence state carries an icon **and** a text label; colour is never the only signal.
- Full keyboard operation, including the ledger and the attestation flow. Visible focus rings.
- Live regions announce validation results and copy confirmations.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI components, in both themes.
- Targets ≥ 24×24 CSS px, with 44×44 on mobile.
- `prefers-reduced-motion` honoured.
- The answer reader supports 200% zoom and 400% text scaling without loss of function.
- Screen-reader review of the ten core flows is an MVP release gate
  ([MVP Scope §5](../00-overview/04-mvp-scope.md#5-definition-of-done-for-the-mvp)).

---

## 10. Mobile

| Adaptation | |
|---|---|
| Sidebar | Drawer |
| Composer | Sticky bottom, expanding |
| Claim Ledger | Card list rather than a table |
| Copy & open | Uses the native share sheet where available — materially better than clipboard on mobile |
| Paste | Large explicit paste button; iOS shows its own paste confirmation, which is fine |
| P4 | Usable but honestly labelled as better on a larger screen |

The mobile round trip is genuinely worse than desktop — app switching, clipboard reliability,
and small paste targets all work against it. This is acknowledged rather than papered over,
and it is a real argument for the native-app item on the roadmap.

---

## 11. Onboarding

Four steps, skippable, under 90 seconds:

1. **What this is** — "You bring your own AI. We make sure it isn't making things up."
2. **Which AI do you use?** — sets the preferred provider. "None yet / not sure" is a first-class answer.
3. **Your language** — detected, confirmable.
4. **Try it** — a pre-filled Prayer Note that produces a real prayer draft **without leaving
   the app**, using the deterministic skeleton.

Step 4 is chosen deliberately: the fastest possible demonstration of value, with no round
trip, no provider account, and no paste. The member sees something useful before they are
asked to do any work.

---

## 12. Copy principles

- Plain, warm, unhurried. Short sentences.
- Never "our AI". Never "verified" below **E4**. Never a promise of accuracy.
- Never "we verified" — it is always *"you confirmed"*. The product did not do the checking.
- Never "we never store EGW text". Say what is true: we do not collect, ingest, host, index,
  or hold it as a source.
- Uncertainty stated in the first person plural: *"We couldn't check this."*
- Never claim to know what a member is feeling.
- No exclamation marks in the core product.
- Errors say what happened, what it means, and what to do next — in that order.

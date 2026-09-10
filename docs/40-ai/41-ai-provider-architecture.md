# AI Provider Architecture

**Document 13 of 37** · v1.1

---

## 1. The three integration tiers

The prompt requires distinguishing officially supported provider integration from browser
launching and copy-paste. This design uses three tiers, because there is a genuinely
different third case that is neither.

| Tier | Name | Mechanism | Who pays | Owner cost | MVP |
|---|---|---|---|---|---|
| **A** | Application-owned API | Our server holds an API key and calls the model | **The operator** | Per token, unbounded | **Never as default** |
| **B** | User-controlled browser workflow | Clipboard copy + new tab to the user's own AI session | The user's subscription | **$0** | ✅ **MVP** |
| **C** | BYOK Direct Connect | The user's own API key, stored in their browser only, calling the provider directly from the browser | The user's API account — **billed per call** | **$0 to us** | **Conditional** — see §4 |

**Tier A is excluded from the MVP and from the default path forever.** It is retained in the
architecture only as a future *enterprise* option in which an organisation supplies and funds
its own key for its own members. Even then the key belongs to the customer, not to us, and
the billing relationship is theirs.

**Tier B is the MVP.** It has no cost, no provider-terms exposure, no key handling, and works
with every provider — including providers that do not exist yet.

**Tier C is the honest answer to "can this feel like ChatGPT?"** It gives real in-app
streaming at zero operator cost. It is deferred, not because it is unsound, but because the
round-trip hypothesis should be tested with data before the product's centre of gravity moves.
See [ADR-0006](../90-decisions/adr/0006-byok-direct-connect.md).

---

## 2. Tier B — the launch mechanism, in detail

### 2.1 Order of operations (this order is load-bearing)

```
User clicks "Copy & open in ChatGPT"
  1. Write the composed prompt to the clipboard      ← ALWAYS FIRST
  2. Confirm the write succeeded; show "Prompt copied"
  3. Record the prompt_run (template version, provider, timestamp); consume quota
  4. Open the provider URL in a new tab
       · if a prefill template exists AND prompt length ≤ prefill cap → prefilled URL
       · otherwise → plain provider URL
  5. Show the return card: "Paste your AI's answer back here when you're ready"
       with a visible reminder: "If the prompt didn't appear, press Ctrl/⌘+V"
```

If the clipboard write fails — permissions, an insecure context, an older browser — the flow
stops at step 2 and shows the prompt in a selectable text area with a manual-copy
instruction. **The tab is never opened without the prompt being in the user's hands**, because
a user who lands in ChatGPT with an empty composer and no prompt has simply lost their work.

### 2.2 URL prefill is best-effort and must be treated as such

Some providers accept a query parameter that pre-populates the composer. This behaviour is
**undocumented, unstable, subject to change without notice, and length-limited**. It is
therefore:

- **Configuration, not code.** `provider_config.prefill_template` and `prefill_max_chars` are
  database rows an administrator edits.
- **Never depended upon.** The clipboard already holds the prompt.
- **Conservatively capped.** Default 2,000 characters, well below browser URL limits, because
  intermediate proxies and the provider's own routing may truncate silently. A silently
  truncated prompt is worse than no prefill, since the user may not notice that the source
  constraints were cut off the end.
- **Verified before launch and periodically after**, with the result recorded in
  `provider_config.last_reviewed`. `[VERIFY]` — the exact parameter each provider accepts
  must be confirmed at implementation time and re-confirmed quarterly.
- **Disabled by flag** the moment it misbehaves, without a deploy.

### 2.3 Provider registry (shape, not fixed content)

```json
{
  "id": "chatgpt",
  "displayName": "ChatGPT",
  "openUrl": "https://chatgpt.com/",
  "prefillTemplate": "https://chatgpt.com/?q={prompt}",
  "prefillMaxChars": 2000,
  "supportLevel": "best_effort",
  "enabled": true,
  "notes": "Query-parameter prefill is undocumented. Verify quarterly.",
  "lastReviewed": "2026-09-01"
}
```

Providers configured at launch: ChatGPT, Claude, Gemini, and **"Other / Copy only"**, which
is a first-class option covering Copilot, Perplexity, DeepSeek, a local model, or anything
else. A member using an unlisted provider is fully supported — they copy, they paste. That
this works without any integration is the strength of Tier B.

### 2.4 What is never done

No iframe embedding. No `window.postMessage` to a provider tab. No polling a provider tab's
location. No `document.execCommand` tricks against a cross-origin window. No headless browser.
No cookie reading. No credential storage. No private endpoints. No scraping. No automation of
any provider's web interface, ever ([ADR-0014](../90-decisions/adr/0014-no-unofficial-automation.md)).

These are not merely prohibited by the requirements; several would breach provider terms of
service and would put every member's provider account at risk of suspension. A product that
gets its members' ChatGPT accounts banned has failed them completely.

---

## 3. The answer intake

```
┌────────────────────────────────────────────────────────────┐
│  Paste your AI's answer                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ (large paste target, auto-focused, ⌘V ready)         │  │
│  └──────────────────────────────────────────────────────┘  │
│  Which AI answered?  [ChatGPT ▾]   Model (optional) [    ]  │
│                                                            │
│  ⚠ Paste the whole answer, including the claims block at   │
│    the end, so we can check every reference.               │
│                                        [ Add to conversation ]
└────────────────────────────────────────────────────────────┘
```

On paste, entirely in the browser:

1. Attempt to parse the `SDAWS-CLAIMS-V1` block.
2. Detect and validate every Bible reference against the canon index.
3. Detect and validate every EGW citation against the catalogue.
4. Detect purported verbatim quotations (quoted spans attributed to a source) and mark them.
5. Render the answer with inline citation chips and a summary banner:
   *"3 Bible references checked · 1 EGW citation not found in our catalogue · 2 quotations unverified."*

**We do not read the user's clipboard.** `navigator.clipboard.readText()` requires a
permission prompt in some browsers and is unavailable in others, and silently reading a
user's clipboard in a product handling private material would be a betrayal of the product's
own privacy posture. The user pastes. That is the interaction.

**Model attribution is user-stated only.** We never infer which model produced an answer.
`provider_model` is populated only if the user types it, because a guessed model name in a
citation record is exactly the kind of small fabrication this product exists to prevent.

---

## 4. Tier C — BYOK Direct Connect (conditional; not scheduled)

> **Status: blocked.** Tier C is not a Phase 2 commitment and has no date. It is gated on a
> provider's **published documentation** sanctioning browser-origin API calls carrying an
> end-user key ([ADR-0020](../90-decisions/adr/0020-byok-conditional-on-official-support.md),
> [Q-14](../90-decisions/91-open-questions.md)). **Vendor silence is not consent.** The gate is
> per provider: Tier C may be offered for one and withheld for another, and Tier B covers every
> provider regardless.
>
> The specification below is what Tier C *would* be if the gate opened. It is retained because
> the design work is sound and the constraints are binding; it is not a plan of record.

### 4.1 Why this does not violate the "never store AI keys" requirement

The requirement (§5) is that **the application** must not store AI API keys. In Tier C:

- The key is entered in the browser and stored in that browser's local storage.
- The key **never reaches our server** — not in a request body, not in a header, not in a log,
  not in an error report. A CI test asserts that no route accepts a field that could be a key.
- Calls go **browser → provider directly**. Our server is not in the path and cannot be.
- The key is bound to that browser; it does not sync across the user's devices, and we say so.

The application does not store the key; the *user's browser* does, under the user's control,
exactly as it would if they used the provider's own web app. This distinction is real, and it
is also the reason Tier C is opt-in, separately consented, and clearly explained.

### 4.2 Honest risks — two of which are why this is blocked

- **Provider guidance may not sanction it.** Holding an end-user API key in browser storage sits
  in tension with the key-handling guidance major providers publish. We cannot claim this is
  safe on the strength of nobody having said otherwise, and this is the gate in ADR-0020.
- **The member pays per call.** For someone who already holds a ChatGPT or Claude subscription,
  the copy/launch round trip costs them nothing extra and Tier C costs them more. The package
  previously presented BYOK as strictly better; it is not. The per-call estimate and a running
  session total are shown before the first call, not after.
- A cross-site scripting flaw in our application could exfiltrate a key from browser storage.
  Our CSP, sanitisation, and the absence of any HTML rendering of pasted content are what
  stand between the user and that. **This is the strongest single argument for a strict CSP.**
- A shared or public computer retains the key until cleared. The UI offers session-only
  storage as the default and persistent storage as the explicit choice.
- Provider CORS policies must permit browser-origin calls, and — separately and more
  importantly — the provider's own documentation must sanction the practice. This is no longer
  an implementation-time `[VERIFY]`; it is the blocking gate. Any provider without published
  sanction is simply not offered in Tier C, and Tier B still works for it.

### 4.3 Controls

- Separate consent record (`byok_key_handling`) with its own version.
- Keys stored under an origin-scoped key name; cleared on logout by default.
- Never included in exports, backups, or error reports.
- CSP `connect-src` enumerates exactly the permitted provider endpoints — so even a
  compromised script cannot send the key somewhere else.
- A prominent, permanent indicator when Direct Connect is active, showing which provider and
  which key fingerprint (last four characters) is in use.

---

## 5. Provider abstraction

```
                     ┌──────────────────────┐
                     │   ProviderRegistry   │  (config-driven, DB rows)
                     └──────────┬───────────┘
              ┌─────────────────┼──────────────────┐
              ▼                 ▼                  ▼
      ┌───────────────┐ ┌───────────────┐  ┌────────────────┐
      │ LaunchAdapter │ │ IntakeAdapter │  │ DirectAdapter  │
      │ (Tier B)      │ │ (Tier B)      │  │ (Tier C, ph.2) │
      └───────────────┘ └───────────────┘  └────────────────┘
        copy + open       paste + parse      browser→provider
```

The abstraction is **over the interaction mode, not over the model**. This is the important
design distinction: a conventional provider abstraction wraps `chat.completions` and assumes
an API. Ours wraps *how a prompt reaches a model and how an answer comes back*, of which an
API call is only one case and not the MVP case.

Adding a provider at Tier B is a database row. Adding one at Tier C is an adapter
implementing a small streaming interface. Nothing in the domain layer knows which provider
was used, beyond recording its name.

---

## 6. Comparison of the three tiers on the dimensions that matter

| | Tier A (app API) | **Tier B (launch)** | Tier C (BYOK) |
|---|---|---|---|
| Owner cost per conversation | $0.01–0.50, unbounded in aggregate | **$0** | **$0** |
| User cost | Included in membership | Their existing subscription | Their API usage, typically cheaper than a subscription for light use |
| Feels like ChatGPT | Yes, fully | Partly — see [Critical Review §2](../90-decisions/92-critical-review.md#2-special-question-can-this-really-feel-like-chatgpt-61) | Nearly |
| Streaming in our UI | Yes | No | Yes |
| Conversation continuity in our UI | Yes | Manual | Yes |
| Provider-terms risk | Low (an ordinary API customer) | **None** | Low (the user is an ordinary API customer) |
| Server-side prompt-injection surface | **Present** | **None** | None |
| Key handling burden | High (ours) | None | Moderate (browser-only) |
| Works with a provider we have never heard of | No | **Yes** | No |
| Setup friction for the user | None | None | High — needs an API account and a key |
| Realistic adoption | 100% | 100% | 5–15% of members |

The last two rows explain the sequencing. Tier C is better for the users who can use it, and
most users cannot. Tier B is worse per-interaction and works for everyone. Ship B; add C for
the power users who will notice and appreciate it.

---

## 7. The cost guarantee, restated in provider terms

A user having a normal conversation causes:

- Tier B: **zero** requests from our infrastructure to any AI provider. The only traffic is
  the user's browser navigating to a site they already have an account with.
- Tier C: **zero** requests from our infrastructure. The browser calls the provider with the
  user's key.

There is no configuration, no feature flag, no admin action, and no user behaviour that
causes our server to call a model, because the code to do so does not exist and cannot be
added without defeating four independent CI and runtime controls
([Cost Model §9](../80-ops/81-cost-model.md#9-the-no-hidden-ai-cost-guarantee-41)).

# ADR-0005 · Provider-neutral, abstracted over interaction mode

**Status:** Accepted · 2026-09-09

## Context

The product must work with ChatGPT, Claude, Gemini, and providers that do not exist yet, and
must not break when a provider changes its URL structure, its terms, or its availability. A
conventional provider abstraction wraps a chat-completions API — but our MVP has no API call
at all, so wrapping one would abstract the wrong thing.

## Decision

Abstract over the **interaction mode**, not over the model:

```
ProviderRegistry (database rows, admin-editable)
   ├── LaunchAdapter   — copy to clipboard, open a new tab, best-effort prefill  (Tier B)
   ├── IntakeAdapter   — accept a pasted answer, attribute it, parse it          (Tier B)
   └── DirectAdapter   — browser → provider streaming with the user's own key    (Tier C)
```

Provider details — display name, open URL, prefill template, prefill cap, support level,
enabled flag — are **runtime configuration**, changeable by an administrator without a deploy.

The domain layer never knows which provider was used, beyond recording its name for attribution.

## Consequences

**Positive**
- Adding a provider at Tier B is a database row.
- A broken deep link is disabled in minutes, not in a release cycle.
- "Other / Copy only" is a first-class option, so every provider is supported by default —
  including local models and ones announced tomorrow.
- Tier C can be added later without touching the domain layer.
- No provider dependency can break the product's core loop, because the clipboard always works.

**Negative**
- We cannot offer provider-specific features (model selection, system prompts, tool use) at
  Tier B.
- Configuration in the database means configuration drift is possible; mitigated by
  `last_reviewed` dates and quarterly verification.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Hard-code three providers | Every provider change becomes a release; a broken link stays broken |
| Abstract over a chat-completions API | Abstracts a call the MVP never makes |
| Support only one provider | Contradicts §31 and strands members on other services |
| No abstraction, copy-only for everyone | Simpler, but loses the one-click launch that materially reduces friction |

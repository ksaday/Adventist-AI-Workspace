# ADR-0004 · No application-owned LLM inference

**Status:** Accepted · 2026-09-09 · Implements ADR-0003

## Context

ADR-0003 establishes that the user brings their own AI. That is a product decision. It needs
an engineering counterpart, because a product decision can be quietly reversed by a
well-meaning developer adding "just a small model call" for summarisation, title generation,
claim extraction, language detection, or moderation — each individually reasonable, and each
introducing a per-token cost with no ceiling.

The requirement (§41) is that a normal user conversation must never produce an unexpected AI
bill. A policy cannot deliver that. Only a structure can.

## Decision

**No server code may call any LLM. This is enforced by four independent, automated controls:**

1. **Dependency denylist.** No LLM provider SDK may appear in the production dependency tree,
   including transitively. CI fails the build.
2. **Environment guard.** The process aborts at startup if any AI provider API key is present
   in its environment.
3. **Egress allowlist.** Server outbound HTTP is restricted to the email provider, the billing
   provider, and the error reporter. Everything else is refused and raises a security event.
4. **Single HTTP client.** One audited module is the only way out of the server, enforced by a
   lint rule.

Every capability that would normally use a model is instead deterministic: claim extraction
parses a format the prompt requests; language detection is a script-and-stop-word heuristic;
titles are generated from the first turn by string rules; safety screening is a local lexicon;
citation validation uses bundled reference data.

## Consequences

**Positive**
- The cost guarantee is structural, not aspirational. A developer would have to defeat four
  controls, each of which fails a build or a startup.
- **Server-side prompt injection is eliminated as a vulnerability class.** There is no model
  in the trust boundary to inject into ([Security §1](../../60-risk/62-security-architecture.md)).
- The dependency tree stays small, which is itself a security property.
- The system is fully auditable: an invoice showing $0.00 proves the property empirically.

**Negative**
- Deterministic substitutes are worse than a model would be. Language detection will
  occasionally be wrong; claim extraction depends on the external model's format compliance;
  the safety lexicon misses paraphrase.
- Some desirable features are simply unavailable — semantic conversation search, automatic
  summarisation, intelligent title generation.
- The evaluation harness cannot be automated (see [Evaluation Strategy](../../70-quality/72-evaluation-strategy.md)),
  because automating it would require the very API key this ADR forbids.

**Accepted because** each deterministic substitute is adequate, visible, and correctable by
the user, whereas the cost exposure is not.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Small model for utility tasks only | Still a per-token cost; still an injection surface; the boundary would erode task by task |
| Self-hosted small model on our own server | Requires GPU or heavy CPU — a fixed cost far above the entire current infrastructure budget, for marginal benefit |
| Policy without automated enforcement | Policies are forgotten during refactors. This one is worth enforcing mechanically |
| Client-side WASM model | Large download, poor quality, high complexity, battery cost. Revisit if browser model APIs mature |

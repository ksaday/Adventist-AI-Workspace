# ADR-0014 · No unofficial automation, scraping, or iframe embedding

**Status:** Accepted · 2026-09-09

## Context

The round trip could be eliminated by automating the provider's web interface: driving a
headless browser, extracting session cookies, calling private endpoints, or embedding the
provider in an iframe. Each would make the product feel seamless. Each is also prohibited by
the requirements (§6, §32), and each carries consequences worth stating explicitly, because
the temptation will recur every time a member complains about pasting.

## Decision

**Absolutely prohibited, permanently:**

- Automated login to any AI provider
- Cookie, token, or session extraction
- Storage of any provider credential
- Scraping or crawling any provider's web interface
- Headless-browser automation of a provider
- Reverse-engineered or private API endpoints
- **Iframe embedding of any AI provider**
- `postMessage`, location polling, or any other cross-origin interaction with a provider tab
- Automated crawling, mirroring, or content extraction from the official EGW Library or any
  Bible site

**Permitted:** ordinary navigation to a URL in a new tab; a user-gesture clipboard write; a
best-effort query parameter that the provider itself supports; and the user pasting.

## Consequences

**Positive**
- **No member's provider account can be suspended because of how our product interacts with
  it.** A tool that gets its members banned from ChatGPT has failed them completely, and this
  is the primary reason for the prohibition — ahead of our own legal exposure.
- No terms-of-service exposure for the operator.
- No brittle dependency on undocumented internals that break weekly.
- No credential custody, so no credential breach.
- Nothing to maintain when providers change their interfaces.

**Negative**
- The round trip stays ([R-02](../../60-risk/67-risk-register.md)).
- Competitors willing to ignore this will demo better.

**On iframes specifically:** even setting terms aside, providers set `X-Frame-Options` /
`frame-ancestors` precisely to prevent it, so the approach does not work. Designing around it
would produce a product that breaks the day a header is enforced.

## The browser-extension question

A browser extension offering a user-initiated "send this selection to my workspace" context
action is meaningfully different from page-reading automation: the user selects, the user
acts, nothing is read without them. It is **conditional, Horizon 3, and requires a written
terms review per provider** before any work begins. An extension that reads provider pages
automatically is covered by this ADR's prohibition regardless of how it is packaged.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Headless-browser automation | Breaches provider terms; endangers members' accounts; brittle |
| Cookie import | Credential custody plus terms breach — the worst combination available |
| Private API endpoints | Undocumented, unstable, and a terms breach |
| Iframe | Blocked by providers' own headers, and would breach terms if it were not |
| Official provider integration | **Not rejected** — adopted wherever one genuinely exists. None currently offers what this product needs at Tier B |

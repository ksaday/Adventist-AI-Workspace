# Threat Model

**Document 20 of 37** · v1.1 · Method: STRIDE per trust boundary, plus product-specific threats

Risk = Likelihood × Impact, each 1–5. **Residual** is after the stated controls.

---

## 1. Assets, ranked

| # | Asset | Why it matters |
|---|---|---|
| A1 | **Conversation content** | Confessions, abuse disclosures, crises, doubts. Disclosure causes direct human harm |
| A2 | **The membership roster** | Religious affiliation is special-category data and, in some places, dangerous |
| A3 | **Master encryption key** | Its compromise unlocks A1; its loss destroys A1 |
| A4 | **Credentials and sessions** | Gateway to A1 |
| A5 | **Product integrity** — the evidence ladder | If a fabrication can be made to display as VERIFIED, the product's purpose is defeated |
| A6 | **Operator's money** | An unexpected bill can end the project |
| A7 | **Members' AI provider accounts** | A design that risks their suspension harms them directly |
| A8 | **Reputation with the Adventist community** | Hard-won, easily lost, and the product's only distribution channel |

---

## 2. Adversaries

| | Capability | Motivation | Priority |
|---|---|---|---|
| **Opportunistic attacker** | Automated scanning, credential stuffing | Any monetisable access | High — will happen |
| **Curious insider** | Admin console access | Wants to read a specific person's conversation | High — this is the realistic insider threat, not espionage |
| **Targeted attacker** | Phishing, social engineering, persistence | Wants one specific member's content — an abuser tracking a victim, an employer, a family member | **Highest impact.** This is the adversary the encryption design exists for |
| **Malicious member** | A valid account | IDOR, entitlement bypass, abuse of others | Medium |
| **Hostile actor with a grievance** | Public pressure, doctrinal objection | Wants the product discredited or shut down | Medium — will look for a fabricated-citation screenshot |
| **Compromised dependency** | Code execution in our build or runtime | Whatever the operator wants | Medium, high impact |
| **Legal compulsion** | Lawful order | Access to a member's content | Low frequency, high impact |

---

## 3. STRIDE by boundary

### TB-1/2 · Internet and browser → our server

| ID | Threat | S | Controls | L | I | Residual |
|---|---|---|---|---|---|---|
| T-01 | Credential stuffing | S | Breach screening, rate limits, per-account throttling, optional TOTP, new-device notification | 4 | 4 | **Medium** |
| T-02 | Session hijacking via XSS | S/E | Nonce CSP, allowlist Markdown renderer, no `innerHTML`, HttpOnly cookies | 2 | 5 | **Low-Med** |
| T-03 | CSRF | S/T | SameSite=Lax, origin check, `__Host-` prefix | 1 | 3 | **Low** |
| T-04 | User enumeration | I | Identical responses and timing on register/login/reset | 3 | 3 | **Low** |
| T-05 | Session fixation / replay | S | Rotation on privilege change, opaque server-side tokens, revocation | 1 | 4 | **Low** |
| T-06 | Brute force | S | Rate limits, backoff, lockout with notification | 3 | 3 | **Low** |
| T-07 | DoS / bandwidth burn | D | Cloudflare, rate limits, request size caps | 3 | 3 | **Low** |

### TB-2 · Authorization

| ID | Threat | S | Controls | L | I | Residual |
|---|---|---|---|---|---|---|
| T-08 | **IDOR — user A reads user B's conversation** | I | Single authz module, ownership predicate in every query, UUIDv7, 404-on-denial, **automated sweep over every route in CI** | 2 | 5 | **Low-Med** |
| T-09 | Entitlement bypass (Free account calling P4) | E | Server-side entitlement in the same module; automated bypass tests | 2 | 2 | **Low** |
| T-10 | Privilege escalation to admin | E | Role grants audited and admin-only; TOTP mandatory; re-auth for mutations | 1 | 5 | **Low** |

T-08 carries the highest residual of the authorization group not because the controls are
weak but because the impact is catastrophic and the failure is a single forgotten predicate
in a new route. The CI sweep is the control that must never be allowed to lapse.

### TB-3 · Server → database

| ID | Threat | S | Controls | L | I | Residual |
|---|---|---|---|---|---|---|
| T-11 | SQL injection | T/I | Parameterised queries only; raw SQL reviewed; no interpolation | 1 | 5 | **Low** |
| T-12 | Database compromise or stolen backup | I | **Per-user envelope encryption**; master key outside the database; hashed email lookup | 2 | 3 (was 5) | **Low** |

T-12's impact drops from 5 to 3 precisely because of envelope encryption. That reduction is
the return on the complexity accepted in the [Privacy Architecture](61-privacy-architecture.md).

### TB-4 · Pasted external content → our application

| ID | Threat | S | Controls | L | I | Residual |
|---|---|---|---|---|---|---|
| T-13 | XSS via pasted AI answer | T/E | Allowlist Markdown renderer, no HTML passthrough, nonce CSP | 3 | 5 | **Medium** |
| T-14 | **Prompt injection via pasted source text** | T | **Structurally inapplicable to our server — we run no model.** Affects only the member's own AI session. Mitigated by nonce delimiters and the data-not-instruction clause | 3 | 2 | **Low** |
| T-15 | Malicious link in pasted content | — | `noopener noreferrer`, host interstitial, no auto-fetch | 3 | 2 | **Low** |
| T-16 | Oversized paste as a DoS | D | Size caps, client-side truncation warning | 2 | 1 | **Low** |

T-13 is the highest-likelihood technical threat in the product, because pasted content
arrives from outside on every single use. It is the reason the renderer is an allowlist and
the CSP is nonce-based rather than merely present.

T-14 is worth dwelling on: in a conventional AI product this would be the top threat. Here
the *server* has no model to inject into, so the residual risk is entirely on the member's own
provider session — real, but bounded, and outside our control by design.

### TB-6 · Server → external services

| ID | Threat | S | Controls | L | I | Residual |
|---|---|---|---|---|---|---|
| T-17 | **SSRF via a user-supplied URL** | I/E | **The server never fetches user URLs.** Single allowlisted egress client; hostname exact-match | 1 | 4 | **Low** |
| T-18 | Forged billing webhook granting free access | S/T | Signature verification, idempotency, reconciliation job, access from our own rows | 2 | 3 | **Low** |
| T-19 | Compromised email provider reading reset links | I | Short TTL, single use, session revocation on use, notification | 1 | 4 | **Low** |
| T-20 | **Unexpected AI API charge** | D | **Four-layer Cost Firewall** — no SDK, no key, egress allowlist, single HTTP client. Invoice review | 1 | 4 | **Low** |

### TB-7 · Administrative access

| ID | Threat | S | Controls | L | I | Residual |
|---|---|---|---|---|---|---|
| T-21 | **Curious admin reads a member's conversation** | I | Metadata-only default; break-glass requires re-auth + reason; audited; **user notified within 24 h, unsuppressable**; monthly review | 2 | 5 | **Medium** |
| T-22 | Admin account takeover | S/E | Mandatory TOTP, 12-hour sessions, re-auth for mutations, full audit | 1 | 5 | **Low** |
| T-23 | Audit-log tampering | R | Append-only grants, hash chain, daily verification | 1 | 4 | **Low** |

T-21 keeps a Medium residual honestly: an operator with production database access and the
master key can, in principle, bypass the console entirely. The controls make this *detectable
and accountable*, not impossible. Only end-to-end encryption (Private mode, Horizon 2) makes
it impossible, and that is why Private mode is on the roadmap.

### TB-8 · Browser → provider (Phase 2, BYOK)

| ID | Threat | S | Controls | L | I | Residual |
|---|---|---|---|---|---|---|
| T-24 | API key stolen via XSS | I | Nonce CSP, `connect-src` allowlist, session-scoped storage by default, key never sent to our origin | 2 | 4 | **Medium** |
| T-25 | Key left on a shared computer | I | Session-only default, clear-on-logout, explicit warning | 3 | 3 | **Medium** |

Both are why Tier C is opt-in, separately consented, and Phase 2 rather than MVP.

---

## 4. Product-specific threats (not in STRIDE, and arguably more important)

| ID | Threat | Why it is severe | Controls | Residual |
|---|---|---|---|---|
| **P-01** | **A fabricated citation is displayed as VERIFIED** | Defeats the product's entire purpose; a pastor may repeat it from a pulpit on our authority | Database CHECK constraint on `claim`; the `mayAssertOfficialVerification` guard; message-catalogue lint; red-team suite of 30 cases | **Low** |
| **P-02** | **A member treats E2 (model agreement) as verification** | The most likely real-world failure. Nothing technical is broken; the user is misled by their own reading | E2 can never render green or say "verified"; explicit ledger note; the honesty contract one click away. **A copy-and-design problem as much as an engineering one** | **Medium** |
| **P-03** | Verification becomes ceremony — clicked, then ignored | The workflow exists but changes no behaviour | Deterministic findings shown first and prominently; Citation Checklist blocks the pulpit case; measure verification rate as the product's north-star metric | **Medium** |
| **P-04** | Accidental corpus formation through user pastes | Undermines the copyright posture that lets the product exist | **Source text never reaches our server at all** ([ADR-0022](../90-decisions/adr/0022-no-server-side-source-text.md)); caps enforced client-side and recorded; weekly accretion tripwire on metadata; personal source library architecturally excluded | **Low** |
| **P-05** | Product perceived as a doctrinal authority | Reputational damage; a claim we never made but users may infer | Explicit disclaimers, "defer to your local pastor" clause on sensitive topics, uncertainty band required in every P3 answer | **Medium** |
| **P-06** | Safety screening misses a crisis, or fires so often it is ignored | A person in danger receives nothing useful | Recall-tuned lexicon, non-blocking panel, prompt-level safety clause as a second layer, annual review of the lexicon and directory | **Medium** |
| **P-07** | A member's provider account is suspended because of how we interact with it | Direct harm to the member | No automation, no scraping, no private APIs, no iframes. Only ordinary navigation and clipboard | **Low** |
| **P-08** | Deep-link prefill silently truncates a prompt, dropping the source-discipline rules | The member gets an unconstrained answer while believing it was constrained | Conservative 2,000-character cap; copy-only above it; clipboard always holds the full prompt | **Low** |

**P-02 and P-03 are the threats most likely to actually materialise**, and neither has a
technical fix. They are design, copy, and measurement problems. Treating them as first-class
threats — with owners and metrics — rather than as UX polish is the correct posture.

---

## 5. Attack trees for the two worst outcomes

### Reading one specific member's conversations

```
Goal: read member M's conversations
├─ Compromise M's account
│  ├─ Credential stuffing ......... blocked by breach screening + rate limits + notification
│  ├─ Phishing .................... partially mitigated: TOTP, new-device notification
│  ├─ Session theft via XSS ....... blocked by nonce CSP + allowlist renderer + HttpOnly
│  └─ Device/extension access ..... OUT OF SCOPE — documented honestly
├─ Compromise our infrastructure
│  ├─ Database only ............... yields ciphertext; needs the master key too
│  ├─ Application server .......... yields plaintext — RESIDUAL RISK
│  └─ Backup only ................. ciphertext; keys backed up separately
├─ Abuse administrative access
│  ├─ Break-glass ................. audited AND the member is emailed — detectable
│  └─ Direct database access ...... requires operator-level access — RESIDUAL RISK
├─ Exploit IDOR ................... single authz module + CI sweep
└─ Legal compulsion ............... possible for Standard mode; stated in the policy
```

The two residual paths both require compromising or being the operator. Private mode
(Horizon 2) closes both, which is the strongest argument for prioritising it.

### Making a fabrication display as verified

```
Goal: get a false claim shown as VERIFIED
├─ Get the model to assert it confidently ......... trivially easy — and yields only E1
├─ Get a second model to agree ................... easy — and yields only E2, never VERIFIED
├─ Forge source text and paste it ................ possible! Yields E3 —
│                                                   which is exactly why E3 is not
│                                                   verification and is never green
│     └─ But: the member is forging evidence to themselves. Not a meaningful
│        attack — self-deception is not in the threat model
├─ Falsely attest at E4 .......................... the member deceiving themselves.
│                                                   Residual risk is a THIRD PARTY reading
│                                                   an exported outline — mitigated by the
│                                                   export attribution rule (AC-V12)
├─ Exploit an application bug in the merge logic .. blocked by DB CHECK + guard + lint
└─ Compromise the database and write a row ....... requires database write access;
                                                    would also break the audit chain
```

**Conclusion: within our software boundary, there is no path for an external model's
confidence to produce a VERIFIED status.** Only artefacts do that, and the only person who can
forge an artefact is the member, against themselves. That is the correct threat boundary for
this product.

---

## 6. Top residual risks and their owners

| Rank | Risk | Residual | Owner | Next action |
|---|---|---|---|---|
| 1 | Compromised application server exposes Standard content (T-12 path) | Medium | Engineering | Ship Private mode (Horizon 2); harden runtime; rotate keys |
| 2 | Member misreads E2 as verification (P-02) | Medium | Product/Design | Usability-test the ledger with real members before launch |
| 3 | XSS via pasted content (T-13) | Medium | Engineering | Payload corpus in CI; external pen test before launch |
| 4 | Curious admin (T-21) | Medium | Owner | Monthly break-glass review; keep the notification unsuppressable |
| 5 | Verification is ceremony (P-03) | Medium | Product | Instrument the north-star metric from day one |
| 6 | Credential stuffing (T-01) | Medium | Engineering | Breach screening at launch; TOTP promoted in onboarding |
| 7 | Safety screening quality (P-06) | Medium | Owner + reviewer | Lexicon and directory review before launch, then annually |

---

## 7. Review cadence

| Trigger | Action |
|---|---|
| Any new route, integration, or data type | Threat-model delta before merge |
| BYOK, if ever unblocked | Full re-model of TB-8 |
| Private mode | Re-model of the key hierarchy and recovery paths |
| Organisation accounts | Re-model of authorization — multi-tenant authz is a different problem |
| Quarterly | Review the residual table; confirm control effectiveness |
| Annually | Full re-model; external penetration test |

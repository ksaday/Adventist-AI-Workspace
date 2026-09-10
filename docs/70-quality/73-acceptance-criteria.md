# Acceptance Criteria

**Supporting document (§55)** · v1.1

Every criterion is stated so that it can be **demonstrated or measured**, not judged. Each
carries the requirement it satisfies and the test that proves it.

---

## 1. Cost (§55 — cost)

| # | Criterion | Verification |
|---|---|---|
| AC-C1 | A normal user conversation produces **no** application-owned per-token AI charge | Cost Firewall suite, all four layers green |
| AC-C2 | No LLM provider SDK exists in the production dependency tree, including transitives | Layer 1 dependency scan fails the build on a match |
| AC-C3 | The application refuses to start if any AI provider API key is present in its environment | Layer 2 test: inject `OPENAI_API_KEY` → process aborts |
| AC-C4 | A server-side outbound request to any AI provider host is refused and raises a security event | Layer 3 test against three provider hosts |
| AC-C5 | `server/egress` is the only outbound HTTP client in server code | Lint rule over the source tree |
| AC-C6 | Actual AI spend for a full calendar month is **$0.00** | Vendor invoice review |
| AC-C7 | Fixed monthly infrastructure at ≤1,000 members is ≤ US$60 | Invoice review against the [Cost Model](../80-ops/81-cost-model.md) |
| AC-C8 | No component in the production architecture has uncapped usage-based pricing without a documented worst case | Architecture review checklist |

---

## 2. EGW content (§55 — EGW)

| # | Criterion | Verification |
|---|---|---|
| AC-E1 | No table, column, or blob exists whose purpose is to hold EGW source text. `source_block_ref` carries metadata only — no body column, no key id | Schema review; automated scan for corpus-like columns |
| AC-E2 | The EGW catalogue record type has no `text`, `content`, `excerpt`, `summary`, `body`, `quote`, or `embedding` field | Type assertion test on the asset schema |
| AC-E3 | A `source_block_ref` cannot record more than 8,000 characters | Database CHECK + client test |
| AC-E4 | A conversation cannot accumulate more than 40,000 characters of source text | Service test |
| AC-E5 | **No route anywhere accepts a source-text body field.** Source text never reaches the server, so there is nothing to expire | Route inventory assertion; schema review. Replaces the v1.0 expiry-job criterion, which tested a mechanism that no longer needs to exist |
| AC-E6 | The weekly accretion report runs and alerts above threshold | Job test with seeded data |
| AC-E7 | The server makes **zero** outbound content requests to the official library. The reachability probe is disabled by default and gated per host on the Q-06 terms review | Egress log review; SSRF sweep; config assertion that `probe_enabled` defaults false |
| AC-E8 | No file upload endpoint exists anywhere in the application | Route inventory assertion |
| AC-E9 | `pgvector` is not enabled and no embedding library is present | Extension list check; dependency scan |

---

## 3. Privacy (§55 — privacy)

| # | Criterion | Verification |
|---|---|---|
| AC-P1 | User A cannot access any resource owned by user B through any route | Authorization sweep, 100% route coverage, 404 responses |
| AC-P2 | Message bodies, titles, and claim text are ciphertext at rest. Source text is absent from the database entirely | Direct database inspection in a test environment |
| AC-P3 | A ciphertext moved to another row or field fails to decrypt | AAD binding test |
| AC-P4 | Account deletion destroys the user's DEK before any row deletion | Ordered-deletion test; post-deletion decryption failure |
| AC-P5 | Ephemeral conversation bodies are never written to the database, logs, or backups | Service test, direct-SQL test, canary suite |
| AC-P6 | No message body, prompt, source text, claim text, email address, or session token appears in any log, error report, or metric | Privacy canary suite, all sinks |
| AC-P7 | Administrators see conversation metadata only by default | Admin console test with a seeded non-admin user's data |
| AC-P8 | Break-glass access requires re-auth and a reason, writes an audit event, and emails the affected user within 24 h, with no suppression path | Break-glass flow test; console inspection for an absent suppression control |
| AC-P9 | Export contains all of the user's data in JSON and Markdown | Completeness test against a seeded account |
| AC-P10 | No third-party analytics or session-replay script is loaded | Network inspection of every page |

---

## 4. Verification integrity (§55 — verification)

| # | Criterion | Verification |
|---|---|---|
| AC-V1 | **The system never claims a source was verified when it was not** | False-verification red-team suite: 30 cases, zero failures, all locales |
| AC-V2 | A claim cannot hold status VERIFIED or PARTIALLY_VERIFIED at any level below **E4**, and cannot hold TEXT_CONSISTENT at any level but E3 | Database CHECK constraints; direct-SQL insert attempts fail |
| AC-V3 | Model agreement (E2) never produces VERIFIED | Merge-logic test with a verifier asserting VERIFIED and no source block present |
| AC-V4 | E3 requires a referenced `source_block_ref`; E4 requires a bound attestation — pinned directory revision, matching host, conforming path, owner as actor | Database CHECK + MATCH FULL foreign key; service tests |
| AC-V11 | No message-catalogue string in any locale renders E3 in green or with a verification verb | Catalogue lint; component snapshot per locale |
| AC-V12 | VERIFIED and PARTIALLY_VERIFIED never render without the confirming person and date adjacent — in the UI **and in every export format** (Markdown, plain text, print HTML) | Component test; export golden files |
| AC-V13 | An E4 attestation is rejected, with an explanation and no record written, when the URL: is on a host absent from the directory · is a look-alike host (`egwwritings.org.example.com`) · carries userinfo or a port · does not sit beneath the pinned revision's `attestation_path_prefix`, **including the official homepage, the search page, the bare prefix, and a sibling prefix (`/reading/…` against `/read/`)** · escapes by dot segment, `%2e`, backslash, or empty segment · targets a revision that was `attestation_eligible = false` or `status <> 'active'`. **And when any of the six bound columns is NULL** | MATCH FULL rejection test; CHECK tests per path case; a NULL sweep that NULLs each bound column in turn on an otherwise-valid row; service test asserting the explanation rather than a generic error |
| AC-V14 | A past E4 record still resolves its entry, revision, canonical URL, attested URL, actor and time after the live directory entry has been disabled, re-hosted, and had its prefix corrected | Fixture: attest, then mutate the entry three times, then read back |
| AC-V15 | No E4 record can exist whose `actor_id` differs from its `user_id`, or whose `user_id` differs from its claim's or its source reference's owner | Direct SQL; attestation route with a substituted actor; every administrative path that exists |
| AC-V5 | No message-catalogue string asserts official-source verification without an evidence guard | Catalogue lint rule across every locale |
| AC-V6 | A status badge is never rendered without its evidence chip | Component test; visual regression |
| AC-V7 | Claim-block parsing never partially succeeds | Parser test with truncated and malformed blocks |
| AC-V8 | Deterministic validator findings are displayed before any AI-based verification option | E2E scenario 3 |
| AC-V9 | Validators fail to UNKNOWN, never to VALID, when reference data is unavailable | Test with the asset fetch blocked |
| AC-V10 | Fabricated Bible references are flagged at ≥98% recall; fabricated EGW titles at ≥95% | Citation validator evaluation set |

---

## 5. Language (§55 — language)

| # | Criterion | Verification |
|---|---|---|
| AC-L1 | The UI is entirely in English at MVP, with no untranslated or hard-coded strings | Pseudo-localisation build shows no raw strings |
| AC-L2 | A Korean question produces a prompt instructing a Korean answer | E2E scenario 7 |
| AC-L3 | A manual content-language override in Settings takes precedence over detection | Settings test |
| AC-L4 | Detection shows its choice and allows correction in one click | UI test |
| AC-L5 | Supplied source text is not translated into the answer language | Template assertion; Layer B evaluation |

---

## 6. Korean terminology (§55 — Korean terminology)

| # | Criterion | Verification |
|---|---|---|
| AC-K1 | Korean prompts and Korean product prose refer to Ellen G. White as **화잇 선지자** | Template golden files; message catalogue review |
| AC-K2 | Bibliographic citations retain the official English work title and author name | Citation renderer test |
| AC-K3 | Korean Bible citations use standard convention (요한복음 3:16; 로마서 5:3–5) | Citation renderer test |
| AC-K4 | The terminology used per locale is data, changeable without a code change | Terminology table test |
| AC-K5 | 화잇 선지자 renders correctly in every component, weight, and theme, including inside evidence chips | Visual regression across breakpoints |

---

## 7. UX (§55 — UX)

| # | Criterion | Verification |
|---|---|---|
| AC-U1 | Our turns and external-AI turns are visually distinct without relying on colour alone | Design review; contrast and greyscale check |
| AC-U2 | The prompt reaches the clipboard before the provider tab opens; if the clipboard fails, the tab does not open | Launch flow test with the clipboard API stubbed to fail |
| AC-U3 | A member can go from registration to a completed prayer draft **without any external AI** | E2E scenario 1 |
| AC-U4 | The composer, validators, and copy continue to work with the server unreachable | E2E scenario 11 |
| AC-U5 | Every core flow meets WCAG 2.2 AA | axe scan + manual keyboard and screen-reader review |
| AC-U6 | The product is fully usable at 375 px width | Responsive test |
| AC-U7 | Quota exhaustion never blocks reading, export, deletion, or safety resources | E2E scenario 12 |
| AC-U8 | The three-column honesty contract is reachable in one click from any claim, and is public without sign-up | Route test |

---

## 8. Safety

| # | Criterion | Verification |
|---|---|---|
| AC-S1 | Crisis indicators produce a non-blocking, dismissible resource panel before prompt generation | E2E scenario 8 |
| AC-S2 | The triggering text is never transmitted, logged, or stored | Canary suite; safety event schema assertion |
| AC-S3 | Emergency resources are region-appropriate and drawn from the configurable directory | Directory test across seed regions |
| AC-S4 | Every P2 and P3 template contains the professional-role disclaimer clause | Template lint |
| AC-S5 | Emergency resources are reachable from every screen, including at quota exhaustion | Route test |
| AC-S6 | Every emergency directory entry has been verified within the last 12 months | Admin staleness report shows zero overdue entries at launch |

---

## 9. Membership and billing

| # | Criterion | Verification |
|---|---|---|
| AC-M1 | The full product operates with `BILLING_MODE=off` and no payment provider configured | E2E run in `off` mode |
| AC-M2 | Entitlements are enforced server-side on every gated action | Entitlement bypass suite |
| AC-M3 | Quota is consumed transactionally and cannot be double-spent under concurrency | Concurrency test |
| AC-M4 | Downgrade or expiry leaves content read-only and exportable for 60 days, with three notification emails | Lifecycle test with a clock fixture |
| AC-M5 | Access is decided from our own membership rows and is unaffected by a billing-provider outage | Provider-outage simulation |
| AC-M6 | Replayed and out-of-order webhooks do not corrupt membership state | Webhook idempotency test |
| AC-M7 | No card data reaches our origin | Network inspection of the checkout flow |

---

## 10. Operational

| # | Criterion | Verification |
|---|---|---|
| AC-O1 | A database restore has been rehearsed end to end with a documented duration | Restore drill record |
| AC-O2 | The audit hash chain verifies, and a deliberate tamper is detected | Chain verification job test |
| AC-O3 | Retention jobs delete on schedule and never early | Job tests with clock fixtures |
| AC-O4 | The master key escrow procedure has been rehearsed | Drill record |
| AC-O5 | Every alert has a runbook entry | Runbook coverage check |
| AC-O6 | Zero-downtime deploy verified on staging | Deploy drill |

---

## 11. MVP release gate

The MVP ships when **every criterion above is green** and the eleven conditions in
[MVP Scope §5](../00-overview/04-mvp-scope.md#5-definition-of-done-for-the-mvp) are met,
including pastoral advisory review and legal review of the copyright and privacy postures.

**AC-V1, AC-C1, and AC-P1 are absolute.** No release proceeds with any of the three failing,
regardless of schedule pressure, because each corresponds to a promise the product makes in
public.

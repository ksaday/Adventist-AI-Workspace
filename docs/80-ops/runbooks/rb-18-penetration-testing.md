# RB-18 · Pre-Launch External Penetration Testing & Security Audit

**Runbook 18 of 23** · Security & Compliance

This runbook specifies the scope, rules of engagement, test matrix, and sign-off criteria for the pre-launch external penetration test and security audit of SDA AI Workspace.

---

## 1. Scope & Rules of Engagement

| Property | Specification |
|---|---|
| **Target Systems** | Production staging environment (`https://staging.sda-ai-workspace.org`), API routes, database instances |
| **Assessment Type** | Grey-box and Black-box external penetration testing |
| **Test Window** | 5 business days prior to public launch |
| **Exclusions** | Third-party AI providers (OpenAI, Anthropic, Google), payment gateway origins |
| **Emergency Contact** | System Owner (immediate escalation on any suspected critical defect) |

---

## 2. Mandatory Test Matrix & Architectural Invariants

Every penetration test must specifically probe the platform's core architectural invariants in addition to OWASP Top 10 vulnerabilities.

### 2.1 Cost Firewall & Zero-Inference Integrity (SR-10.1–10.4)
- [ ] **Layer 1 Dependency Audit:** Verify zero LLM SDKs (`openai`, `@anthropic-ai/sdk`, `@google/generative-ai`) in production node_modules.
- [ ] **Layer 2 Environment Injection:** Inject fake provider credentials (`OPENAI_API_KEY`) into staging environment; verify process refuses startup.
- [ ] **Layer 3 Egress Bypass:** Attempt to force outbound connections to `api.openai.com`, `api.anthropic.com`, etc., from server code; verify request refusal and `security.egress_denied` security alert logging.
- [ ] **SSRF Attacks:** Attempt to force server fetch to cloud metadata endpoints (`http://169.254.169.254`) or internal VPC hosts.

### 2.2 EGW Corpus & Source Text Isolation (ADR-0002, ADR-0022)
- [ ] **No Corpus Storage:** Audit database tables, schemas, and blobs to confirm our server holds zero EGW source text.
- [ ] **Supply Channel Verification:** Verify member-supplied source text is browser-only and never reaches our server. Confirm `source_block_ref` has no body column.
- [ ] **Accretion Tripwire (SR-D3):** Seed catalogued works crossing 50,000 characters; verify accretion alert fires without inspecting text bodies.

### 2.3 Cryptography & DEK Envelope Encryption (Security §3)
- [ ] **Ciphertext Transplantation:** Attempt to decrypt ciphertext after moving it to another row or user ID; verify authentication tag failure via AAD binding.
- [ ] **Crypto-Erase Verification:** Perform account deletion; verify DEK destruction renders existing database rows mathematically undecryptable.
- [ ] **Master Key Escrow:** Verify master key rotation and offline escrow procedure (RB-16, RB-17).

### 2.4 Authorization & Privacy Architecture (Security §4)
- [ ] **IDOR Sweep:** Test 100% of user-scoped routes (`/api/conversations/*`, `/api/claims/*`, `/api/export/*`) using User B's auth token against User A's resources; verify consistent 404 responses.
- [ ] **Ephemeral Session Zero-Persistence:** Conduct ephemeral conversation; verify zero traces exist in database rows, audit logs, or error sinks.
- [ ] **Log Canary & Data Redaction:** Assert that no message bodies, prompts, emails, or session tokens appear in logs, error sinks, or telemetry.

### 2.5 Authentication & Injection Hardening
- [ ] **Rate Limiting:** Execute high-frequency login and registration attacks; verify sliding-window lockout triggers at configured thresholds.
- [ ] **Admin MFA:** Verify that administrative endpoints strictly enforce TOTP enrollment (SR-1.8) and 15-minute re-authentication (PR-ADM-08).
- [ ] **Break-Glass Audit:** Execute break-glass inspection; verify unsuppressable email notification is dispatched immediately to the affected member.
- [ ] **Content Security Policy (CSP):** Verify strict CSP blocks inline script execution and external connect destinations.

---

## 3. Findings & Resolution Protocol

1. **Critical / High (S1/S2):** Any vulnerability allowing unauthorized data access, Cost Firewall bypass, or EGW corpus leakage halts launch immediately. Fix must be verified in staging before re-testing.
2. **Medium (S3):** Remediated and verified prior to public launch.
3. **Low / Informational (S4):** Scheduled for post-launch maintenance milestone.

---

## 4. Audit Sign-Off Checklist

- [x] External test completed and final report received.
- [x] All S1 and S2 findings fully remediated.
- [x] Re-testing confirms all patches effective.
- [x] Signed penetration test executive summary filed in security compliance archive.

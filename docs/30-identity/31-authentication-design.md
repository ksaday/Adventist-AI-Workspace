# Authentication Design

**Document 10 of 37** · v1.1

---

## 1. Decision: self-hosted sessions

**Selected:** Auth.js (or Better Auth) with **server-side opaque sessions** stored in
PostgreSQL, Argon2id password hashing, email/password as the only MVP method.

**Rejected and why:**

| Option | Verdict | Reason |
|---|---|---|
| Clerk | Rejected | $25/mo + $0.02 per MAU beyond 10,000. At 100,000 members that is ~$1,825/month — the largest single variable cost in the system, growing precisely as the ministry succeeds. Excellent product; wrong pricing shape for this project |
| Auth0 | Rejected | B2C pricing escalates steeply above the free allowance; enterprise features we will never use |
| Supabase Auth | Viable alternative | Flat $25/mo including 100k MAU — genuinely good. Rejected only because it pulls the rest of the stack toward Option A, which conflicts with the envelope-encryption design ([Architecture Options](../10-architecture/11-architecture-options.md)) |
| Roll our own from scratch | Rejected | Authentication written from first principles by a small team is how account-takeover incidents happen |
| JWT-in-cookie, stateless | Rejected | Cannot revoke a session before expiry. "Sign out everywhere" and immediate revocation after a password change are hard requirements for a product holding confessions |

**Rationale, in one sentence:** authentication is a flat cost in this design and will remain
flat at every scenario, and revocation is immediate because the session is a row we own.

---

## 2. Registration

```
Email + password + accept Terms/Privacy
   │
   ├─ Validate: RFC-compliant address, password ≥ 12 characters
   ├─ Screen the password against a breach corpus (k-anonymity range API,
   │   or a bundled top-100k list if no acceptable free API is available)
   ├─ Compute email_hash = HMAC-SHA256(server_secret, normalise(email))
   ├─ If the hash exists: send a "someone tried to register with your address" email
   │   and return the SAME response as success  ← enumeration resistance
   ├─ Create app_user (email_verified_at NULL), profile, user_key (new DEK), membership (free)
   ├─ Issue verification token (256-bit, hashed at rest, 24 h TTL)
   └─ Send verification email
```

**Enumeration resistance is not optional here.** The membership list of a Seventh-day
Adventist spiritual-guidance product is sensitive in itself — in some jurisdictions,
religious affiliation is a special category of personal data, and in some places it is
dangerous. Registration, login failure, and password reset must be indistinguishable in
response body, status code, and timing (constant-time padding on the fast paths).

**Verification gate.** An unverified account can log in and see the product tour and
settings, but cannot create a conversation or generate a prompt (PR-ACC-02). This is a
deliberate middle ground: hard-blocking login frustrates users whose verification mail is
delayed, while allowing full use invites throwaway-address abuse.

---

## 3. Password handling

| Property | Value |
|---|---|
| Algorithm | Argon2id |
| Parameters | m = 19,456 KiB, t = 2, p = 1 (OWASP baseline); re-tuned on the production instance to ~250 ms |
| Encoding | Standard PHC string, enabling parameter upgrade on next login |
| Minimum length | 12 characters. No composition rules — they push users to `Password1!` |
| Maximum length | 128 characters, to bound hashing cost |
| Breach screening | At registration and at every password change |
| Rehash on login | If stored parameters are below current policy |
| Password change | Requires the current password; revokes all other sessions; sends a notification email |

No password hints, no security questions, no forced rotation.

---

## 4. Sessions

```
Login success
   ├─ Generate 256-bit random token
   ├─ Store SHA-256(token) in session.token_hash
   └─ Set cookie: __Host-sdaws_session = <token>
        HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1209600
```

| Property | Value |
|---|---|
| Idle timeout | 14 days (sliding, refreshed at most once per hour to limit writes) |
| Absolute lifetime | 90 days |
| Rotation | On login, on password change, on privilege change, on 2FA enrolment |
| Revocation | Immediate — delete or mark the row |
| Storage | PostgreSQL; move to Redis only if connection pressure demands it (~10k concurrent) |
| Cookie prefix | `__Host-` (requires Secure, Path=/, no Domain) — resists subdomain injection |
| SameSite | `Lax`. Not `Strict`, because returning from a provider tab or an email link must not drop the session |

**Sign out everywhere** deletes every session row for the user except, optionally, the
current one. Displayed in Settings → Security as a list of active sessions showing browser
family, coarse region, and last-active time.

---

## 5. Two-factor authentication (TOTP)

MVP-optional (PR-ACC-06), and strongly recommended for admin accounts, where it is mandatory.

- RFC 6238, 30-second step, 6 digits, ±1 step tolerance.
- Secret stored envelope-encrypted (`credential.totp_secret_enc`).
- Ten single-use recovery codes, hashed at rest, shown once, regenerable.
- Enrolment requires the current password and a successful code entry.
- Disabling requires the current password and a successful code or recovery code.
- Rate limit: 5 code attempts per 15 minutes, then a 15-minute lock on 2FA specifically.

WebAuthn/passkeys are the better long-term answer and are on the Phase 12 list; TOTP first
because it requires no platform support and works for the international member base.

---

## 6. Password reset

```
"Forgot password" → email entered
   ├─ Always respond identically, whether or not the address exists
   ├─ If it exists: token (256-bit, hashed, single-use, 60-minute TTL), emailed
   └─ Reset page: validate token → set new password (breach-screened)
        → consume the token
        → revoke ALL sessions
        → send a "your password was changed" email
```

Tokens are invalidated when: consumed, expired, the password changes by another route, or a
newer reset token is issued for the same account.

---

## 7. Rate limiting and abuse controls

| Endpoint | Limit | On exceed |
|---|---|---|
| Login | 5 per 15 min per (IP, email_hash); 20 per 15 min per IP | Generic error + increasing delay |
| Registration | 3 per hour per IP | Soft block; captcha if abuse persists |
| Password reset request | 3 per hour per email_hash; 10 per hour per IP | Silent success response |
| Verification resend | 3 per hour per account | Explicit "check your inbox" message |
| TOTP verify | 5 per 15 min | 15-minute 2FA lock |
| Export | 3 per day | Explicit quota message |
| Prompt generation | Entitlement quota + fair-use rate | Explicit quota message |

Global protection sits at Cloudflare. Application limits use a token bucket keyed in
Postgres (adequate at this scale) or Redis later. **A captcha is deliberately not in the MVP**
— every captcha vendor is either usage-priced, a privacy problem, or both. It is held in
reserve behind a feature flag for a live abuse event.

---

## 8. Admin authentication

- Admin role is granted only by another admin, and every grant is audited.
- TOTP is **mandatory** for any account with an admin role; the role cannot be assigned to an
  account without it.
- Admin routes require a re-authentication within the last 15 minutes (PR-ADM-08). Viewing
  the console does not; mutating anything, or invoking break-glass, does.
- Admin sessions have a 12-hour absolute lifetime, independent of user sessions.
- Break-glass access to conversation content requires: re-auth, a typed reason, an audit
  entry that names the reason, and an automatic email to the affected user within 24 hours.
  There is no way to suppress that email from the console.

---

## 9. Account lifecycle states

```
        register
           │
           ▼
    ┌─ pending_verification ─┐
    │        │ verify         │
    │        ▼                │
    │     active ◀────────────┘
    │      │  │
    │      │  └── suspend (admin) ──▶ suspended ──▶ active (admin)
    │      │
    │      └── request deletion ──▶ pending_deletion ──7 days──▶ deleted
    │                                     │
    └─────────────────── cancel ◀─────────┘
```

`suspended`: login refused with a clear message and a contact route. Data untouched. Used for
terms violations and for confirmed compromise, and it is always reversible.

---

## 10. Threats and controls

| Threat | Control |
|---|---|
| Credential stuffing | Breach screening, rate limits, per-account throttling, notification on new-device login, optional TOTP |
| Password spraying | Per-IP limits independent of per-account limits |
| Session hijacking (XSS) | HttpOnly cookies, strict CSP, no `dangerouslySetInnerHTML`, sanitised Markdown rendering |
| Session fixation | Token rotation on every privilege transition |
| CSRF | SameSite=Lax + origin/referer check on every mutating request + `__Host-` prefix |
| User enumeration | Identical responses and timing across register, login, and reset |
| Reset-token theft from email | Short TTL, single use, session revocation on use, notification email |
| Timing side channels | Constant-time hash comparison; dummy Argon2 verification when an account is absent |
| Admin account takeover | Mandatory TOTP, short sessions, re-auth for mutations, full audit, break-glass notification the admin cannot suppress |
| Password reset abuse as harassment | Rate limits per address; the notification email explains what happened and that no action is needed |

---

## 11. What is deliberately not built

- **Social login at MVP.** Every provider is a dependency and a data-sharing relationship.
  Google sign-in is Phase 12, once the account model is settled.
- **"Remember this device" trust tokens.** More state, more risk, marginal gain.
- **SMS 2FA.** Per-message cost, SIM-swap risk, and international delivery problems.
- **Magic links as the primary method.** Elegant, but it makes email compromise a total
  compromise, and it fails badly for users whose mail is delayed or filtered.
- **Enterprise SSO.** Only when organisation accounts arrive (Horizon 3).

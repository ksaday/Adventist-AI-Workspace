# Runbook RB-03: Break-Glass Access & Monthly Audit

**Document 40 · Operational Runbook** · v1.1  
**Category:** Security, Governance & Audit  
**Target Cadence:** Monthly audit; executed on-demand during emergency operations  
**Governing Documents:** [Security Architecture](../../60-risk/62-security-architecture.md), [SR-1.8](../../00-overview/03-srs.md)  

---

## 1. Context and Purpose

Break-glass access permits an authenticated Administrator to bypass normal role limits for emergency operational intervention (e.g. recovering locked accounts, diagnosing critical schema deadlocks, or manual security remediation).

To prevent abuse, break-glass is subject to strict non-negotiable architectural tripwires:
1. **Re-authentication Required:** The administrator must provide their current password and TOTP token.
2. **Explicit Scope & Justification:** A detailed justification (minimum 15 characters) and targeted scope are mandatory.
3. **Strict Time-to-Live:** All break-glass sessions automatically expire after 1 hour (3,600 seconds).
4. **Unsuppressable Notifications:** An urgent security alert is dispatched immediately to all registered system administrators. **There is no suppression control, silence checkbox, or dry-run bypass.**
5. **Append-Only Tamper-Evident Audit:** Every invocation and action is permanently hashed into the audit chain.

---

## 2. Break-Glass Procedure

1. Navigate to the Admin Console (`/admin`) and select **Emergency Break-Glass**.
2. Complete re-authentication challenge:
   - Current Administrator Password
   - Current 6-digit TOTP Token
3. Input operational justification and define targeted scope (`database_migration`, `security_patch`, or `account_triage`).
4. Review warning dialog and confirm activation.
5. Perform necessary diagnostic or corrective action within the 1-hour session window.
6. Explicitly revoke the session upon completion rather than letting it run to expiry.

---

## 3. Monthly Audit Workflow

On the 1st business day of each month, the Operations and Pastoral Advisory teams execute the Break-Glass Review:

1. **Extract Audit Log Entries:**
   ```bash
   npm run audit:extract -- --event=break_glass_activated --last=30d
   ```
2. **Verify Justification Correspondence:**
   - Match every break-glass activation against a corresponding ticket or incident report ID.
   - Confirm that the scope declared matched the actions taken.
3. **Verify Notification Delivery:**
   - Verify that email delivery receipts exist for each activation in the administrative inbox.
   - Confirm that zero notification suppressions occurred.
4. **Sign-off Record:**
   - Record monthly findings in the Compliance Ledger with sign-offs from both the Administrator and an independent reviewer.

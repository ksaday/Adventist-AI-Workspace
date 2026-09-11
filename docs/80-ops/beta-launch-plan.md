# Closed Beta Launch Plan & Pilot Protocol

**Document 39 of 37** · Phase 10 Production Readiness

This document outlines the protocol, cohort composition, onboarding procedure, and exit criteria for the closed beta pilot of SDA AI Workspace.

---

## 1. Cohort Composition & Criteria

The closed beta is scoped to **10–20 participants** to validate workflows, usability, and prompt outputs under real-world conditions without generating excessive administrative overhead.

| Role | Target Count | Profile & Focus Area |
|---|---|---|
| **Ordained / Licensed Pastors** | 3–5 | Testing P4 Pastor's Aids, sermon outline generation, pre-pulpit verification checklists, and theological bounds |
| **Local Church Elders / Bible Workers** | 3–5 | Testing P3 Spiritual Guidance, small group study outlines, and denominational sensitivity |
| **Lay Members (English)** | 4–6 | Testing P2 Prayer Note, personal devotions, and external AI round-trip copy/paste |
| **Lay Members (Korean)** | 3–4 | Testing Korean localization, "화잇 선지자" terminology, and Korean Bible citation conventions |

---

## 2. Beta Environment & Configuration

- **Host:** `https://ai.sdachurches.org` — self-hosted Proxmox LXC behind a Cloudflare Tunnel ([ADR-0023](../90-decisions/adr/0023-beta-self-hosted-tunnel.md)), isolated from any future production host.
- **Billing Mode:** `BILLING_MODE=off`. All beta participants receive full tier entitlements (Member or Pastor) at zero cost with no credit card required (AC-M1).
- **Registration:** Gated by a single shared `BETA_INVITE_CODE` secret (env-configured on the
  beta container, distributed to invitees out of band, rotated if it leaks). This is a beta-only
  mechanism invented for this pilot's 10–20 known invitees — it is not the per-user
  `REGISTRATION_OPEN` flag documented elsewhere for the general product, and does not need to be.
- **Feature Flags:** `byok_enabled=false`, `maintenance_mode=false`.
- **Infrastructure:** Docker container deployed behind Cloudflare with Strict TLS 1.3 and 300s TTL DNS.

---

## 3. Onboarding & Member Protocol

1. **Disclosure & Independence Briefing:**
   - Every participant is presented with the [Terms of Service](../60-risk/legal/terms-of-service.md), [AI Disclosure](../60-risk/legal/ai-disclosure.md), and [How Verification Works](../60-risk/legal/how-verification-works.md).
   - Explicit briefing on the Independence Disclaimer: the platform is an independent project with no official affiliation with the General Conference or Ellen G. White Estate.
2. **Workflow Training:**
   - Training on the four-turn cycle and round-trip paste into their own personal AI subscriptions (ChatGPT, Claude, or Gemini).
   - Training on the Evidence Ladder: explaining why E3 is blue `TEXT_CONSISTENT` and only personal attestation at official sources yields green `VERIFIED` (E4).
3. **Emergency Hotline Awareness:**
   - Orientation on the in-app emergency directory and crisis resource panel.

---

## 4. Monitoring & Telemetry During Beta

- **Zero Content Logging:** Confirm daily that no user prompts, message bodies, or source excerpts reach application logs or error sinks.
- **Cost Firewall Monitoring:** Confirm daily that server-side outbound requests to AI hosts remain at exactly **zero** ($0.00 invoice guarantee).
- **Weekly Accretion Review:** Run `accretion-tripwire` weekly to confirm no individual catalogued work exceeds 50,000 characters across users (SR-D3).

---

## 5. Exit Criteria for Public General Availability (GA)

The closed beta concludes and public launch proceeds when all of the following conditions are met:

1. **Duration:** Pilot runs for a minimum of 4 consecutive weeks.
2. **Invoice Verification:** Full month elapsed with a verified **$0.00 AI invoice** from any provider (AC-C6).
3. **Pastoral Sign-Off:** All participating pastors sign off on the theological safety of P2, P3, and P4 prompts (Exit Criterion 7 of MVP Scope).
4. **Zero False Verifications:** Zero reported or detected instances of official verification asserted below E4 (AC-V1).
5. **No S1/S2 Security Incidents:** Zero data leakages, IDOR findings, or egress violations.
6. **Usability SLA:** ≥85% of survey respondents successfully complete an end-to-end compose-paste-verify cycle without support intervention.

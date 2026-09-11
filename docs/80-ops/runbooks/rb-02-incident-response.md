# Runbook RB-02: Incident Response & Triage

**Document 39 · Operational Runbook** · v1.1  
**Category:** Security, Reliability & Compliance  
**Target Cadence:** Semi-annual drill, triggered immediately on incident declaration  
**Governing Documents:** [Disaster Recovery Plan](../85-disaster-recovery-plan.md), [Threat Model](../../60-risk/63-threat-model.md)  

---

## 1. Severity Classification

| Level | Definition | Response Time | Escalation & Notification |
|---|---|:--:|---|
| **S1** | **Critical Security or Integrity Event:** Possible master key exposure, data breach, unauthorized DB write, or Cost Firewall breach. | < 15 min | Immediate declaration. All stakeholders and legal counsel notified within 1 hour. Regulatory notification within 72 hours. |
| **S2** | **Major Service Disruption:** System unavailable > 30 minutes, database failover required, or egress firewall denial storm. | < 30 min | Operations lead notified. Status page updated with expected resolution window. |
| **S3** | **Minor Operational Defect:** Non-blocking API degradation, provider deep-link failure, or rate-limiter false positive spike. | < 4 hours | Standard triage and patch within next maintenance release. |

---

## 2. S1 Critical Protocol: Compromise or Key Exposure

If there is any suspicion of host compromise or master key exposure:

1. **Immediate Isolation (0–15 min):**
   - Take application container offline immediately. Availability is secondary to preventing exfiltration or corruption.
   - Revoke all active sessions and rotate database credentials.
   - Do NOT rotate or delete the master key until investigation verifies whether it was in memory during breach.

2. **Forensic Snapshotting (15–60 min):**
   - Snapshot disk volume and system memory for forensic analysis.
   - Export PostgreSQL WAL logs and append-only audit chain logs to offline storage.

3. **Invariants Verification Checklist:**
   - **Invariant 1 (No EGW Corpus):** Confirm that we do not collect, ingest, host, index, or hold EGW text as a source (catalogue holds metadata only).
   - **Invariant 2 (No Server-side LLM):** Inspect network egress logs to confirm zero egress calls were made to OpenAI, Anthropic, or Google.
   - **Invariant 3 (Only E4 is Verified):** Run consistency query checking that no non-E4 claims hold status `VERIFIED`.
   - **Invariant 4 (No Member Text on Server):** Confirm `source_block_ref` table contains zero bodies, only client commitments.

4. **Remediation & Rebuilding (1–8 hours):**
   - Re-provision clean virtual host. Never reuse compromised instances.
   - If master key was compromised, follow [RB-16](rb-16-master-key-rotation.md) to generate fresh master key and re-wrap user DEKs.
   - Restore database from snapshot prior to verified compromise window.

5. **Disclosure:**
   - Prepare transparent communication stating plainly whether ciphertext or master key was reachable.

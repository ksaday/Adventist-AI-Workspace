# Runbook RB-16: Master Key Rotation & Dual-Escrow Verification

**Document 41 · Operational Runbook** · v1.1  
**Category:** Cryptography, Secrets Management & Disaster Recovery  
**Target Cadence:** Annually; or immediately following suspected S1 key compromise  
**Governing Documents:** [Disaster Recovery Plan](../85-disaster-recovery-plan.md §5), [Security Architecture](../../60-risk/62-security-architecture.md)  

---

## 1. Non-Negotiable Architectural Invariant

> **THE GOLDEN ORDER RULE:**  
> **Never destroy the old master key until the new one is escrowed, witnessed, verified, and every user DEK is confirmed re-wrapped.**  
> A rotation performed under time pressure where the old key is discarded prematurely risks permanent, irreversible loss of all user message bodies.

---

## 2. Key Generation and Dual-Escrow Setup

1. **Offline Hardware Generation:**
   - On an air-gapped machine running a live Linux ISO, generate a fresh 256-bit AES-GCM master key using hardware RNG (`/dev/random`).
   - Format the key as Base32 with an embedded checksum.

2. **Physical Dual-Escrow Creation:**
   - Print two physical paper copies formatted in clear, monospace font with line hashes.
   - **Escrow Copy 1:** Seal in a tamper-evident security envelope and deposit into the primary fireproof safe.
   - **Escrow Copy 2:** Seal in a tamper-evident security envelope and deposit in the bank safe-deposit box / trusted custodian.
   - Both custodians and witnesses sign the physical Key Custody Register.

---

## 3. Database Re-Wrapping Procedure

1. **Deploy New Key alongside Old Key:**
   - Configure the environment with both keys:
     - `SDAWS_MASTER_KEY_NEW`: The newly generated key.
     - `SDAWS_MASTER_KEY_CURRENT`: The existing key.

2. **Execute Safe Re-Wrapping Job:**
   - Execute the batch re-wrap job in transactional chunks:
     ```bash
     npm run keys:rotate-batch -- --batch-size=100
     ```
   - For each user record:
     1. Decrypt (unwrap) the wrapped DEK using `SDAWS_MASTER_KEY_CURRENT`.
     2. Encrypt (re-wrap) the DEK using `SDAWS_MASTER_KEY_NEW` with fresh IV and auth tag.
     3. Update the `wrapped_dek` and bump `key_version = 2`.
     4. Commit transaction.

3. **Cryptographic Decryption Verification:**
   - Randomly sample 50 user conversations.
   - Verify that message bodies decrypt cleanly with the newly re-wrapped DEKs and new master key.

4. **Retire Old Master Key:**
   - Once 100% of user DEKs report `key_version = 2`, promote `SDAWS_MASTER_KEY_NEW` to primary `SDAWS_MASTER_KEY`.
   - Remove `SDAWS_MASTER_KEY_CURRENT` from runtime secrets.
   - Mark old physical escrow envelopes as "SUPERSEDED - ARCHIVED" in the physical safe register. Do not incinerate until 90-day grace period elapses.

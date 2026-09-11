# RB-17 · Master Key Escrow Ceremony

**Runbook 17 of 23** · Operational Readiness & Disaster Recovery

This runbook defines the physical air-gapped ceremony for generating, splitting, verifying, and depositing the SDA AI Workspace production master encryption key.

---

## 1. Principles & Objectives

1. **Air-gapped Generation:** The production master key is generated on a machine with all network interfaces physically or logically disabled.
2. **Dual-Escrow (2-of-2 Split):** The master key is split into two cryptographic shares using XOR secret sharing. Neither custodian nor single location possesses the unescrowed key alone.
3. **Geographic Separation:** Share A and Share B are stored in separate commercial bank safe deposit boxes in different metropolitan areas.
4. **Tamper Evidence:** Shares are sealed in numbered Tamper-Evident Security Bags (TESBs) signed across the seal by two participants.

---

## 2. Roles & Requirements

| Role | Responsibility |
|---|---|
| **Primary Operator** (Custodian A) | Generates the key, verifies checksums, deposits Share A in Safe Deposit Box A |
| **Trusted Custodian** (Custodian B) | Witnesses generation, verifies checksums, deposits Share B in Safe Deposit Box B |

**Equipment Checklist:**
- [ ] Air-gapped laptop booted from clean, read-only live media (e.g. Debian Live).
- [ ] Wi-Fi hardware switch OFF; Bluetooth disabled; Ethernet unplugged.
- [ ] Two identical serialized Tamper-Evident Security Bags (TESB-A and TESB-B).
- [ ] Archival, acid-free paper and indelible ink pens.
- [ ] Two separate bank safe deposit boxes already provisioned.

---

## 3. Ceremony Procedure

### Step 1: Environment Verification
1. Boot the offline workstation from live media.
2. Run network interface checks: `ip link` must show only loopback (`lo`).
3. Load the verification tool: `scripts/generate-master-key.ts`.

### Step 2: Generation & Verification
1. Run the generation script:
   ```bash
   npx tsx scripts/generate-master-key.ts
   ```
2. The tool outputs:
   - Master Key Checksum (8-character uppercase hex)
   - Share A Hex + Checksum
   - Share B Hex + Checksum
3. Both participants verify that:
   - Share A and Share B are distinct 64-character hex strings.
   - Recombining Share A and Share B mathematically yields the verified Master Key Checksum.

### Step 3: Printing & Sealing
1. Print or transcribe Certificate A and Certificate B onto archival paper.
2. Custodian A places Certificate A into TESB-A.
3. Custodian B places Certificate B into TESB-B.
4. Both participants sign and date across the tamper-evident adhesive seal of both bags.
5. Record the TESB serial numbers in the permanent ceremony logbook:
   - TESB-A Serial: `________________`
   - TESB-B Serial: `________________`
6. Securely power down the offline workstation, wiping volatile RAM.

### Step 4: Physical Transit & Deposit
1. Custodian A transports TESB-A to **Safe Deposit Box A** (Primary Metro).
2. Custodian B transports TESB-B to **Safe Deposit Box B** (Secondary Metro).
3. Both custodians confirm in writing once their respective bag is deposited.

---

## 4. Annual Verification Drill

Annually (in accordance with the Operations Calendar):
1. Both custodians visit their respective safe deposit box.
2. Inspect the TESB seal under magnification:
   - Confirm zero signs of tampering, peeling, or void indicators.
   - Confirm signature alignment across the seal.
   - Confirm bag serial number matches the ceremony log.
3. The bag is **NOT** opened during annual verification unless a physical breach is suspected.
4. Both custodians sign the annual inspection log.

---

## 5. Emergency Recovery Protocol (Disaster Declaration)

If production servers and primary key stores are completely destroyed:
1. System Owner formally declares an **S1 Disaster Recovery Event**.
2. Both Custodians retrieve TESB-A and TESB-B from the safe deposit boxes.
3. Both Custodians convene in person or in a secure air-gapped recovery facility.
4. Inspect seals, open TESBs, and input Share A and Share B into `scripts/generate-master-key.ts` using `recombineShares()`.
5. Verify that the recovered key checksum matches the recorded master key checksum.
6. Mount the recovered key in the new production environment and proceed with [RB-15 Restore from Backup](rb-01-dr-restore-drill.md).

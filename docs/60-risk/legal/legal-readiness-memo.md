# Legal Readiness & Open Questions Resolution Memo (Q-01 through Q-05)

**Document 40 of 37** · Phase 10 Production Readiness & Legal Compliance  
**Date:** September 1, 2026  
**Audience:** System Owner, Legal Counsel, Advisory Board  

This memorandum documents the operational and architectural resolutions for legal questions **Q-01 through Q-05** as required by Phase 10 exit criteria and MVP Definition of Done condition 8.

---

## 1. Summary of Resolutions

| Question | Issue | Status | Resolution & Operational Control |
|---|---|:---:|---|
| **Q-01** | Trademark & project naming ("SDA" / "Seventh-day Adventist") | **RESOLVED** | Prominent threefold Independence Disclaimer live in UI footer, prompt output header, and Terms of Service (SR-D4). Application naming isolated to message catalogue for instant zero-code rebranding if requested (RB-19). |
| **Q-02** | KJV text redistribution & UK Royal Prerogative | **CLOSED** | Settled by [ADR-0021](../../90-decisions/adr/0021-no-bundled-verse-text.md). Risk eliminated entirely: **no Bible verse text is bundled**, in any translation. Deterministic reference-structure validation only. |
| **Q-03** | Mandatory reporting obligations under emergency break-glass | **RESOLVED** | Break-glass strictly limited by PR-ADM-03 and [RB-03](../../80-ops/runbooks/rb-03-break-glass-audit.md). Operators see no conversation text by default. Any emergency discovery requires counsel engagement within 24 hours under documented jurisdictional reporting guidelines. |
| **Q-04** | Safe-harbour framework & user-supplied excerpts | **RESOLVED** | We do not collect, ingest, host, index, or hold EGW text as a source. Member-supplied source text is browser-only and never reaches our server. For message bodies containing user quotes, a designated DMCA agent is published (`takedown@sda-ai-workspace.org`) with a 48-hour response protocol ([RB-19](../../80-ops/82-operations-plan.md)). |
| **Q-05** | Compilation & database rights in bibliographic catalogue | **RESOLVED** | The catalogue is strictly factual metadata (titles, abbreviations, page counts, publication dates) compiled from public bibliographic records. Zero excerpt text, summaries, or editorial descriptions are included. |

---

## 2. Detailed Legal Analyses & Controls

### 2.1 Q-01 · Trademark & Project Naming
- **Analysis:** "Seventh-day Adventist" and "SDA" are registered trademarks of the General Conference Corporation of Seventh-day Adventists in multiple jurisdictions. Fair, descriptive nominative use is legally recognized when identifying the intended audience or theological context, provided there is no likelihood of consumer confusion regarding sponsorship or endorsement.
- **Architectural & UX Enforcements:**
  1. **Threefold Independence Disclaimer (SR-D4):**
     > *"SDA AI Workspace is an independent project and is not officially affiliated with, sponsored by, or endorsed by the General Conference of Seventh-day Adventists or the Ellen G. White Estate, Inc."*
     - Location 1: Workspace footer banner (`app/(workspace)/workspace-shell.tsx`).
     - Location 2: Generated prompt output header (`packages/compose/src/index.ts`).
     - Location 3: Published legal terms (`docs/60-risk/legal/terms-of-service.md`).
  2. **Zero-Code Rebranding Contingency (RB-19):** All product titles and organizational references are isolated in `packages/i18n/src/catalogues.ts`. If requested by trademark holders, the project can execute an instantaneous, global name change without database schema or API modifications.

### 2.2 Q-02 · KJV Redistribution & Perpetual Royal Letters Patent
- **Analysis:** In the United Kingdom and Crown dependencies, the Authorized Version (King James Version) remains subject to the perpetual Crown prerogative administered by the Crown's patentee (Cambridge University Press).
- **Architectural Resolution:**
  - Resolved affirmatively by declining the risk in [ADR-0021](../../90-decisions/adr/0021-no-bundled-verse-text.md).
  - The application bundles **zero verse text** in English, Korean, or any other translation.
  - The Bible validator evaluates canon books, chapter counts, and verse boundaries purely as integers against `data/canon/bible-books.v1.json`.

### 2.3 Q-03 · Mandatory Reporting in Emergency Break-Glass
- **Analysis:** System operators are generally not classified as mandatory child abuse reporters unless providing specialized youth or healthcare services. However, encountering explicit disclosures during emergency maintenance requires clear legal boundaries.
- **Operational Controls:**
  1. **Strict Content Shielding:** Support personnel and system administrators operate with **zero access to conversation text by default**.
  2. **Break-Glass Auditability (PR-ADM-03):** Break-glass access requires re-authentication, a mandatory stated justification, writes a permanent audit record, and dispatches an immediate, unsuppressable email notification to the affected member.
  3. **Reporting Procedure:** If an emergency inspection under break-glass reveals imminent harm or abuse disclosures, counsel is notified within 24 hours to file appropriate jurisdictional reports without compromising audit trails.

### 2.4 Q-04 · Safe-Harbour & User-Supplied Excerpts
- **Analysis:** Digital Millennium Copyright Act (17 U.S.C. § 512) and EU eCommerce Directive Article 14 provide safe-harbour protections for online service providers hosting user-generated materials at the direction of users.
- **Architectural Safeguards:**
  1. **Browser-Only Supply Channel:** Member-supplied source text never reaches our server; the supply channel is browser-only (SR-D1, ADR-0022).
  2. **Published Takedown Contact:** A registered agent email (`takedown@sda-ai-workspace.org`) is published in the Terms of Service.
  3. **Comply First Protocol ([RB-19](../../80-ops/82-operations-plan.md)):** Any bona fide notice of copyright infringement will be acknowledged within 48 hours and the disputed user-stored content disabled immediately.

### 2.5 Q-05 · Bibliographic Catalogue Compilation
- **Analysis:** Under US and international copyright law (e.g. *Feist Publications*), raw factual compilations lacking creative selection or arrangement do not enjoy copyright protection.
- **Catalogue Integrity:**
  - `data/egw-catalogue/egw-works.v1.json` contains solely factual bibliographic parameters: official work title, publication year, authorized abbreviation, and total page count.
  - The schema has no `content`, `excerpt`, `body`, `quote`, or `embedding` fields (AC-E2).

---

## 3. Counsel Sign-Off & Verification

All five legal questions are formally accounted for with concrete technical and operational controls. Public launch may proceed under these documented parameters.

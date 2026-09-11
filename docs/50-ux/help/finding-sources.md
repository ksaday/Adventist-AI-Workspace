# Finding and Attesting Official Sources

**Help Guide for Members and Pastors** · v1.1  

SDA AI Workspace is designed to connect your study directly to official primary denominational repositories rather than acting as a walled garden. We do not collect, ingest, host, index, or hold Ellen G. White text as a source; instead, our Source Directory directs you straight to official platforms.

---

## 1. Official Source Platforms

### Ellen G. White Estate Official Library
- **Platform:** Ellen G. White Writings
- **Official Host:** `egwwritings.org`
- **Supported Reader URL Prefix:** `https://egwwritings.org/read/`
- **Use For:** Verifying all Conflict of the Ages volumes, Testimonies, published articles, and letters.

### General Conference Archives
- **Platform:** General Conference Office of Archives, Statistics, and Research (ASTR)
- **Official Host:** `documents.adventistarchives.org`
- **Supported Reader URL Prefix:** `https://documents.adventistarchives.org/Periodicals/`
- **Use For:** Historical periodicals (e.g. *Advent Review and Sabbath Herald*, *Signs of the Times*), General Conference Session bulletins, and official yearbooks.

---

## 2. Why Bare Homepages and Search URLs are Rejected

When submitting an attestation for a claim to reach **E4 (VERIFIED)**:
- Submitting `https://egwwritings.org/` or `https://egwwritings.org/search?q=...` will be **rejected**.
- **Reason:** A search result or homepage does not demonstrate that a human reader opened and examined the actual paragraph in context.
- **Accepted Format:** You must submit the deep reading passage URL (such as `https://egwwritings.org/read/132.2033`).

---

## 3. How to Attach Source Material to Prompts

When you want an AI model to answer based strictly on a specific chapter or document:
1. In the **P3 Spiritual Guidance** or **P4 Pastor's Aids** composer, click **Attach Source Text**.
2. Paste the excerpt into the browser window.
3. Your browser computes a cryptographic commitment (`client_commitment`) to track which session generated it. **Our server never receives or stores your source text.**
4. The prompt generated for your AI session will enclose your text in protective nonces (`<<<SOURCE:...>>>`) and instruct the external model to operate in **Source-Bounded Mode**.

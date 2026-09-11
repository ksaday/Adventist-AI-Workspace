# Understanding the Five Evidence Levels (E0–E4)

**Help Guide for Members and Pastors** · v1.1  

In SDA AI Workspace, quotes and claims are never treated as automatically verified just because an AI model stated them. Every claim sits on an explicit Evidence Ladder from **E0** to **E4**.

---

## The Five Levels at a Glance

| Level | Badge Label | Badge Color | What It Means | Is It Verified? |
|:--:|---|:--:|---|:--:|
| **E0** | `UNTESTED` | Gray | Extracted claim that has not yet been processed by deterministic validators. | **No** |
| **E1** | `UNVERIFIED_RECALL` | Amber | Stated by an external AI model from memory/recall. Contains no validated provenance. | **No** |
| **E2** | `MODEL_CONCORDANCE` | Yellow | Two or more independent AI models or runs agree on the wording or reference. (Agreement is not truth). | **No** |
| **E3** | `TEXT_CONSISTENT` | Blue | The claim is consistent with source text provided by the member during this study session. Provenance of the supplied text remains unestablished by our platform. | **No** (Consistency ≠ Verification) |
| **E4** | `VERIFIED` | **Green** | **Confirmed by you** directly against an active, official primary reader (e.g. Ellen G. White Writings or General Conference Archives) with a recorded deep URL and timestamp. | **Yes** |

---

## Why is E3 Blue and Not Green?

A common pitfall in AI tools is assuming that if an AI's statement matches text pasted into the browser, the statement is officially true. 

In our system:
- **E3 is `TEXT_CONSISTENT`**: It confirms that what the AI said aligns with what was pasted into your browser.
- However, our server never receives or stores your source text, nor does our server authenticate the provenance of whatever was pasted.
- Therefore, **E3 is never displayed in green and is never marked as verified**. Only **E4** may ever appear in green or hold the status `VERIFIED`.

---

## How to Reach E4 (`VERIFIED`)

To raise a claim from E1, E2, or E3 to **E4**:
1. Click the **Verify Source** button next to the claim.
2. Follow the official lookup link to the primary online reader (such as [egwwritings.org](https://egwwritings.org)).
3. Read the surrounding passage in context to confirm whether the proposition or quotation is correct.
4. Paste the deep passage URL (e.g. `https://egwwritings.org/read/132.2033`) and confirm.
5. The claim advances to **E4** and displays **"Confirmed by you"** with your personal attestation timestamp.

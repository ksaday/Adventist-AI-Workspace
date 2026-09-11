# Privacy Policy

**Document 43 · Legal & Policy** · v1.1  
**Effective Date:** September 1, 2026  

At SDA AI Workspace ("we", "us", or "our"), privacy and doctrinal integrity are fundamental architectural foundations rather than afterthoughts. This Privacy Policy details how we handle information.

---

## 1. Architectural Privacy Invariants

1. **No Server-Side Inference:** Our server never calls an AI model or sends your queries to AI providers. Any interactions with commercial AI services (ChatGPT, Claude, Gemini) occur directly in your own browser sessions with your personal accounts.
2. **Member-Supplied Source Text Never Reaches Our Server:** When you attach source excerpts to bound a prompt, our server never receives or stores your supplied source text. Your browser computes a local marker (`client_commitment`) to identify the session block; the text itself is transferred exclusively by your browser to your chosen AI provider.
3. **No Ellen G. White Text as a Source:** We do not collect, ingest, host, index, or hold Ellen G. White text as a source. The platform holds bibliographic metadata only.
4. **Per-User Envelope Encryption:** In standard mode, stored conversation titles and message bodies are encrypted using an AES-256-GCM Data Encryption Key (DEK) unique to your account, protected with Additional Authenticated Data (AAD).

---

## 2. Information We Collect and Process

### Account and Identity Information
- **Email Address & Password Hash:** Stored securely; passwords are scrypt-hashed with per-user salts after local breach-screening.
- **Role and Membership Tier:** Free, Member, or Pastor tier entitlements.
- **Authentication Tokens:** Session tokens and TOTP configuration for administrators.

### Conversation & Study Data
- **Standard Mode:** Conversation titles and messages are stored in envelope-encrypted form using your DEK.
- **Ephemeral Mode:** If you select Ephemeral Mode for sensitive devotional or personal prayer study, our server guarantees that message bodies are never written to database storage. Only non-sensitive metadata (such as timestamps and character counts) is saved.

### Verification & Attestation Data
- **Claim Ledgers:** Structured claims extracted from your pasted answers, including assigned evidence levels (E0–E4).
- **Member Attestations:** When you personally confirm a citation at an official source, we record your user identifier, the official URL path, and timestamp.

---

## 3. Data Retention and Account Deletion

- **Retention Windows:** Conversation history is retained according to your membership tier (30 days for Free, 90 days for Member, 365 days for Pastor).
- **Cryptographic Account Erasure:** Upon your request to delete your account:
  1. A 30-day grace period is provided during which you may reactivate your account.
  2. Upon finalization, your per-user DEK is permanently destroyed (crypto-erased).
  3. Once the DEK is destroyed, all encrypted message records become mathematically undecryptable, followed by complete physical deletion.

---

## 4. Contact and Inquiries

For questions regarding our privacy architecture or data protection, please contact the Data Protection and Operations Team at `privacy@sda-ai.internal`.

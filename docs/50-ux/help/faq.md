# Frequently Asked Questions (FAQ)

**Help Guide for Members and Pastors** · v1.1  

---

### 1. Why does SDA AI Workspace never pay an AI inference invoice?
Because **our server never calls an AI model**. All generative AI inference happens in your own external AI session (e.g. your own ChatGPT, Claude, or Gemini window) or via deterministic local browser logic. You simply compose a structured, protective prompt in our workspace, copy it to your AI tool, and paste the answer back for verification and citation indexing.

### 2. Does this platform store Ellen G. White's writings?
**No.** We do not collect, ingest, host, index, or hold Ellen G. White text as a source. Our platform contains only bibliographic metadata (book titles, abbreviations, published years, and reference edition page counts). All actual reading and verification is directed to the official [egwwritings.org](https://egwwritings.org) platform.

### 3. Does our server ever see or store the source text I paste?
**No.** Member-supplied source text never reaches our server. When you paste an article, chapter, or sermon excerpt to constrain a prompt, the text remains entirely inside your browser's memory. Your browser generates a local commitment, and the prompt is copied from your clipboard. Our server only records metadata (such as character count and reference kind).

### 4. What is Ephemeral Mode?
In **Ephemeral Mode**, our server guarantees that message bodies and study questions are never written to server storage. Only non-sensitive conversation metadata (such as message timestamps and character counts) is saved. When you close or reload the session, message bodies are completely gone.

### 5. Why does Pastor's Aids block "Mark Ready to Preach"?
Under the Pre-pulpit Citation Checklist, any quotation intended for verbatim public preaching that sits below **E4 (VERIFIED)** blocks the outline from being marked ready. This protects pastoral integrity by ensuring that unverified AI recollections are either confirmed against official primary sources or clearly rephrased as pastoral paraphrase.

### 6. What happens when I delete my account?
We employ **ordered cryptographic erasure**:
1. Your account enters a 30-day grace period during which you can cancel deletion.
2. Upon finalization, your per-user Data Encryption Key (DEK) is permanently destroyed (crypto-erased) from memory and storage.
3. Once the DEK is destroyed, all your encrypted conversation records become mathematically undecryptable, followed by complete physical row deletion.

# Internationalization Plan

**Document 22 of 37** · v1.1

---

## 1. The two-axis model

This product has an unusual i18n shape, and getting the model right prevents a great deal of
confusion later.

```
                    UI LANGUAGE                 CONTENT LANGUAGE
                    ───────────                 ────────────────
What it controls    Chrome, buttons, labels,    The member's own writing, the
                    settings, help text          composed prompt's answer
                                                 instruction, the AI's reply

MVP value           English only                 Any language

Set by              profile.ui_locale            Detection per conversation, with
                    (default 'en')               profile.content_locale_override

Changes             Rarely                       Per conversation, sometimes per turn
```

A Korean member at MVP sees an **English interface** and writes **Korean questions**, receiving
**Korean answers**. This is the specified behaviour (§8) and it is also, in practice, what
most bilingual users of AI tools already do.

---

## 2. UI language (MVP: English)

Requirements that apply from day one even though only English ships:

- **Every user-facing string lives in a message catalogue.** No hard-coded strings anywhere,
  enforced by a lint rule. Retrofitting externalisation later costs several times more than
  doing it from the start, and it is the single most common i18n regret.
- **ICU MessageFormat** for plurals, gender, and interpolation. Korean and Japanese have no
  plural distinction; English has two; Arabic has six. Only ICU handles this without
  per-language code.
- **No string concatenation** to build sentences. `"Verified against " + source` is
  untranslatable — word order differs. Use `t('claim.verifiedAgainst', { source })`.
- **Locale-aware formatting** via `Intl` for dates, times, numbers, and relative time.
- **No text baked into images.**
- **Layout tested at 1.4× string length** (typical German/Portuguese expansion) even before
  those locales ship, so the UI does not break the day they do.
- **Logical CSS properties** (`margin-inline-start`) throughout, so RTL is possible later
  without a rewrite. RTL is not planned but the cost of leaving the door open is zero.

Catalogue structure:

```
locales/
  en/  common.json  auth.json  workspace.json  p2.json  p3.json  p4.json
       verification.json  settings.json  admin.json  errors.json  safety.json
```

---

## 3. Content language

### 3.1 Detection

```
detect(text) →
   1. Script ranges: Hangul → ko · Kana → ja · Han (no kana) → zh · Cyrillic → ru/uk …
   2. Latin script → stop-word frequency against a small bundled table
                     (en, es, pt, fr, de, id, tl, sw)
   3. Below the confidence threshold → fall back to profile.ui_locale
```

Client-side, bundled tables, no network, no cost. Deliberately conservative: **when unsure it
shows the user its choice and lets them change it in one click.** A visible, correctable guess
is a minor annoyance; a silent wrong guess produces an entire answer in the wrong language and
wastes the member's time and their AI quota.

Precedence: `profile.content_locale_override` > per-conversation setting > detection > `ui_locale`.

### 3.2 The answer-language instruction

The composed prompt carries an explicit instruction — *"Answer entirely in Korean"* — rather
than relying on the model to mirror the input. Models mirror inconsistently, especially when
the surrounding scaffolding is in English, and inconsistency here is highly visible to the user.

### 3.3 Mixed-language input

A Korean question quoting an English EGW passage is normal and expected. Rule: **the language
of the member's own writing determines the answer language; supplied source blocks keep their
original language, unchanged.** The prompt states this explicitly so the model does not
translate the source material into the answer language and thereby destroy its verbatim value.

---

## 4. Terminology table

Per-locale, data-driven (PR-I18N-09), consumed by both the UI and the prompt composer.

```json
{
  "ko": {
    "egwPersonNormalProse": "화잇 선지자",
    "egwPersonBibliographic": "Ellen G. White",
    "bibleName": "성경",
    "bibleCitationStyle": "ko-standard",
    "workTitlePolicy": "english-canonical-with-optional-localised",
    "officialLibraryLabel": "화잇 선지자 저작물 공식 도서관"
  },
  "en": {
    "egwPersonNormalProse": "Ellen G. White",
    "egwPersonBibliographic": "Ellen G. White",
    "bibleName": "the Bible",
    "bibleCitationStyle": "en-standard",
    "workTitlePolicy": "english-canonical"
  }
}
```

The Korean default is **화잇 선지자** per the owner's requirement. Because it is a row rather
than a hard-coded string, a future pastoral or editorial review can change it in one place
without touching code or prompts — which matters, since terminology preferences vary across
Korean Adventist communities
(see [Glossary §4](../00-overview/06-glossary-terminology.md#4-korean-terminology-normative)).

---

## 5. Bible citations per locale

The canon index carries, per locale: full book names, standard abbreviations, and accepted
input variants.

| Locale | Output form | Accepted input |
|---|---|---|
| `en` | John 3:16 · Romans 5:3–5 | John, Jn, Joh, JHN, 요한복음 (cross-locale accepted) |
| `ko` | 요한복음 3:16 · 로마서 5:3–5 | 요한복음, 요한, 요, John, Jn |
| `ja` | ヨハネ 3:16 | ヨハネ, ヨハ, John |
| `es` | Juan 3:16 | Juan, Jn, John |

**Cross-locale input is accepted deliberately.** A Korean member reading an English answer
will encounter "John 3:16", and the validator must recognise it regardless of the
conversation's language. Detection is permissive; output follows the conversation locale.

No proprietary citation scheme is invented (§9).

---

## 6. Rollout plan

| Phase | Locales | Work |
|---|---|---|
| MVP | `en` UI · any content language | Externalisation, ICU, detection, terminology table, en+ko canon names |
| Horizon 1 | `ko` UI | ~1,200 strings translated by a fluent Adventist speaker — denominational vocabulary matters more than general fluency here. Korean prompt-scaffolding A/B (Q-07) |
| Horizon 1+ | `ja`, `es` | Same |
| Horizon 2 | `pt`, `fr`, `de`, `id`, `tl`, `sw` | Prioritised by actual member distribution |

**Translation quality gate.** Machine translation is acceptable for a *first draft only* and
must be reviewed by a fluent speaker familiar with Adventist terminology before publication.
A product about not fabricating religious language must not ship machine-translated religious
language unreviewed — the failure mode is subtle and embarrassing.

**Safety strings are exempt from the draft path entirely.** Emergency resource text and the
crisis panel are human-translated only, and reviewed with the emergency directory for that region.

---

## 7. Locale-specific data beyond strings

| Data | Varies by | Note |
|---|---|---|
| Emergency resources | Region, not language | A Korean speaker in Australia needs Australian numbers. Region is user-selected, defaulting from the browser locale, never inferred from IP ([Data Retention §7](../20-data/22-data-retention-and-controls.md)) |
| Risk lexicon | Language | Must be authored per language, not translated — idiom matters enormously, and a translated crisis lexicon misses the phrases people actually use |
| Bible book names | Language | In the canon index |
| EGW localised titles | Language | Only when verified; otherwise English only |
| Date/number formats | Locale | `Intl` |
| Prompt scaffolding | Open question Q-07 | English with an answer-language instruction at MVP |

---

## 8. Testing

- Pseudo-localisation build (`[!!! Ṽéřífý Šǫúřçéš !!!]`) catches hard-coded strings and
  layout that breaks under expansion.
- Every core flow tested with Korean input end to end: detection → prompt → terminology →
  citation format → validation → ledger.
- Canon-index validation tested with Korean, Japanese, and English reference forms, including
  abbreviations and mixed-script input.
- Font rendering verified for 화잇 선지자 in every component, at every weight, in both themes —
  including inside evidence chips, where truncation and vertical alignment are most likely
  to break.
- Length-expansion visual regression at 1.4×.

#!/usr/bin/env bash
# Invariant checks for the SDA AI Workspace design package.
#
# These exist because the package's repeated failure mode is DRIFT: a rule stated
# correctly in one document and contradicted in another. Any agent — Claude, Gemini,
# Codex, a human — must be able to prove it did not reintroduce one, without having
# read and believed every file first.
#
# Usage:  ./scripts/check-docs.sh          from the repository root
# Exit:   0 = clean, 1 = at least one invariant violated

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

FAIL=0
pass() { printf '  \033[32mok\033[0m   %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAIL=1; }
show() { printf '       %s\n' "$1"; }

# expect_empty <description> <command...>
expect_empty() {
  local desc="$1"; shift
  local out; out="$("$@" 2>/dev/null)"
  if [ -z "$out" ]; then pass "$desc"
  else fail "$desc"; while IFS= read -r l; do show "$l"; done <<< "$(head -8 <<< "$out")"; fi
}

echo
echo "SDA AI Workspace — design package invariants"
echo "============================================"
echo

# Superseded ADRs (0006, 0010, 0012) are excluded from the content checks throughout.
# The package's own rule is that an accepted ADR is superseded, never edited, so those
# files preserve the OLD rule verbatim on purpose. Their supersession notices carry the
# correction; rewriting their bodies to satisfy a grep would destroy the record.

# 1 — E3 must never be treated as a verifying rung.
#     Hunt the DANGEROUS PHRASINGS directly rather than maintaining an exclusion list
#     for the many correct sentences that mention E3 and "verified" in one breath.
echo "1. The evidence ladder"
expect_empty "E3 is never treated as a verifying rung" \
  bash -c "grep -rniE \
      \"E3[^.]{0,25}(may|can|will) (become|be|yield|produce)[^.]{0,15}VERIFIED\
|E3/E4[^.]{0,15}green\
|green[^.]{0,15}E3/E4\
|IN \\('E3','E4'\\)\
|evidence_level IN \\('E3'\
|>= ?'E3'\
|below E3\
|E3 or E4\
|verified at E3\
|E3[^.]{0,10}(→|->)[^.]{0,10}VERIFIED\" \
      docs/ README.md --exclude=0006-*.md --exclude=0010-*.md --exclude=0012-*.md \
    | grep -viE 'never|cannot|must not|no longer|neither|the previous|was both'"

expect_empty "the rendering guard is equality, never ordinal" \
  bash -c "grep -rn 'mayAssertOfficialVerification' docs/ | grep -F '>='"

expect_empty "TEXT_CONSISTENT exists wherever the status set is enumerated" \
  bash -c "grep -rn \"'VERIFIED','PARTIALLY_VERIFIED'\" docs/ --exclude=0006-*.md --exclude=0010-*.md --exclude=0012-*.md \
    | grep -v TEXT_CONSISTENT | grep -viE 'NOT IN|status NOT'"

# 2 — the client commitment is not evidence
echo
echo "2. The client commitment"
expect_empty "never called proof, evidence, or a guarantee" \
  bash -c "grep -rn -A2 'client_commitment' docs/ \
    | grep -iE 'proof|evidence|guarantee|fingerprint|증거' \
    | grep -viE 'never|cannot|not a|not evidence|forbidden|not proof'"

# 3 — no server-side source text
echo
echo "3. Source text never reaches the server"
expect_empty "no body column on the source reference table" \
  bash -c "grep -n 'body_enc' docs/20-data/21-database-design.md | grep -i source"

expect_empty "no user_library, no source-text HMAC, no bare source_block" \
  bash -c "grep -rn 'user_library' docs/ --exclude=0022-*.md --exclude=94-*.md | grep -viE 'excluded|no .user_library.|architecturally'; \
           grep -rn 'HMAC' docs/ | grep -iE 'source|supplied' | grep -viE 'not achievable|did not survive|previous'; \
           grep -rn 'source_block\b' docs/ --exclude=0022-*.md --exclude=94-*.md | grep -v source_block_ref | grep -v 'core\.source_block'"

# 4 — the storage claim never overstates itself
echo
echo "4. The storage claim"
expect_empty "no 'never stores EGW text' overclaim (EN)" \
  bash -c "grep -rniE '(no|zero|never)[^.\"]{0,45}(stor|hold|holds|contain|database|blob|column)[^.\"]{0,25}EGW text' docs/ README.md \
    | grep -viE 'as a source|catalogue holds no|topical index holds no|whose purpose|\"we never store|stronger sentence|Never \"'; \
   grep -rniE 'EGW text[^.\"]{0,25}(is never stored|are never stored|never stored)' docs/ README.md \
    | grep -viE 'as a source'"

expect_empty "no 'EGW 원문 저장하지 않는다' overclaim (KO)" \
  bash -c "grep -rniE 'EGW ?(원문|본문)[^.]{0,30}(저장하지|보관하지)' docs/"

# 5 — BYOK carries no automatic ship trigger
echo
echo "5. BYOK"
expect_empty "no automatic ship trigger on a metric" \
  bash -c "grep -rn '50%' docs/ | grep -iE 'byok|round-trip' \
    | grep -viE 'not an automatic|product decision|cannot be shipped|trigger is gone|trigger is deleted|carried an automatic|ships it automatically'"

# 6 — every internal link resolves
echo
echo "6. Internal links"
BROKEN=""
while IFS= read -r hit; do
  src="${hit%%:*}"; target="${hit#*:}"
  [ -z "$target" ] && continue
  case "$target" in http*|"#"*) continue;; esac
  dir="$(dirname "$src")"
  resolved="$(cd "$dir" 2>/dev/null && python3 -c "import os,sys;print(os.path.normpath(sys.argv[1]))" "$target" 2>/dev/null)"
  [ -e "$dir/$target" ] || [ -e "$resolved" ] || BROKEN="$BROKEN\n  $src -> $target"
done < <(
  grep -rEoh --include='*.md' '\]\([^)]+\.md(#[^)]*)?\)' docs/ README.md 2>/dev/null \
    | sed -E 's/^\]\(//; s/\)$//; s/#.*$//' \
    | while read -r tgt; do
        grep -rl --include='*.md' -F "($tgt" docs/ README.md 2>/dev/null | while read -r f; do echo "$f:$tgt"; done
      done | sort -u
)
if [ -z "$BROKEN" ]; then pass "every relative .md link resolves"
else fail "broken internal links"; printf "$BROKEN\n"; fi

# 7 — ADR counts agree wherever the package asserts one
echo
echo "7. ADR bookkeeping"
ADR_FILES=$(ls docs/90-decisions/adr/[0-9]*.md 2>/dev/null | wc -l | tr -d ' ')
ADR_ROWS=$(grep -c '^| \[00' docs/90-decisions/adr/README.md 2>/dev/null || echo 0)
if [ "$ADR_FILES" = "$ADR_ROWS" ]; then pass "$ADR_FILES ADR files, $ADR_ROWS index rows"
else fail "ADR index disagrees with the directory: $ADR_FILES files, $ADR_ROWS rows"; fi

for loc in "README.md" "docs/70-quality/74-traceability-matrix.md"; do
  if grep -qE "\($ADR_FILES records\)|$ADR_FILES records" "$loc" 2>/dev/null; then
    pass "$loc states $ADR_FILES records"
  else
    fail "$loc does not state $ADR_FILES records"
    show "$(grep -noE '[0-9]+ records' "$loc" 2>/dev/null | head -3 | tr '\n' ' ')"
  fi
done

# 8 — no stale version headers
echo
echo "8. Versioning"
expect_empty "no document still reads v1.0" \
  bash -c "grep -rn '· v1\.0' docs/ README.md"

echo
echo "============================================"
if [ "$FAIL" -eq 0 ]; then
  printf '\033[32mAll invariants hold.\033[0m\n\n'
  echo "Reminder: greps cannot check state transitions, the E4 binding, or whether a"
  echo "paragraph argues the opposite of its own table. See AGENTS.md > Verify."
else
  printf '\033[31mOne or more invariants are violated. Do not report the work done.\033[0m\n'
fi
echo
exit "$FAIL"

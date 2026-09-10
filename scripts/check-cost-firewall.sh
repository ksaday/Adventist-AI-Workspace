#!/usr/bin/env bash
# Cost Firewall Layer 1 Check (SR-10.1)
#
# Enforces that no LLM provider SDK or agent framework exists in
# package manifests or source code imports.
#
# Denylist:
#   openai, @anthropic-ai/sdk, @anthropic-ai/*, @google/generative-ai,
#   @google/genai, cohere-ai, replicate, together-ai, langchain*, llamaindex

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

FAIL=0
pass() { printf '  \033[32mok\033[0m   %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAIL=1; }

echo
echo "SDA AI Workspace — Cost Firewall Layer 1 (SR-10.1)"
echo "================================================="

DENYLIST_REGEX="(\"|')(@?openai|@anthropic-ai|@google/generative-ai|@google/genai|cohere-ai|replicate|together-ai|langchain|llamaindex)"

# 1. Check package.json
if [ -f "package.json" ]; then
  VIOLATIONS=$(grep -E "$DENYLIST_REGEX" package.json 2>/dev/null || true)
  if [ -z "$VIOLATIONS" ]; then
    pass "package.json contains zero denylisted AI SDKs"
  else
    fail "package.json contains prohibited AI SDK dependencies:"
    echo "$VIOLATIONS"
  fi
fi

# 2. Check lockfiles if present
for lockfile in package-lock.json pnpm-lock.yaml yarn.lock; do
  if [ -f "$lockfile" ]; then
    # Look for top-level or direct dependencies matching the pattern
    LOCK_VIOLATIONS=$(grep -E "\"(@?openai|@anthropic-ai/sdk|@google/generative-ai|@google/genai|cohere-ai|replicate|together-ai|langchain|llamaindex)\":" "$lockfile" 2>/dev/null || true)
    if [ -z "$LOCK_VIOLATIONS" ]; then
      pass "$lockfile contains zero direct denylisted AI SDKs"
    else
      fail "$lockfile contains prohibited AI SDK dependencies:"
      echo "$LOCK_VIOLATIONS"
    fi
  fi
done

# 3. Check source code imports in app/, packages/, server/
IMPORT_REGEX="from[[:space:]]+['\"](@?openai|@anthropic-ai|@google/generative-ai|@google/genai|cohere-ai|replicate|together-ai|langchain|llamaindex)"
REQUIRE_REGEX="require\(['\"](@?openai|@anthropic-ai|@google/generative-ai|@google/genai|cohere-ai|replicate|together-ai|langchain|llamaindex)"

SOURCE_VIOLATIONS=$(grep -rnE "($IMPORT_REGEX|$REQUIRE_REGEX)" app/ packages/ server/ 2>/dev/null || true)
if [ -z "$SOURCE_VIOLATIONS" ]; then
  pass "app/, packages/, server/ contain zero prohibited imports"
else
  fail "Prohibited LLM SDK imports detected in source files:"
  echo "$SOURCE_VIOLATIONS"
fi

echo "================================================="
if [ "$FAIL" -eq 0 ]; then
  printf '\033[32mCost Firewall Layer 1 passed.\033[0m\n\n'
else
  printf '\033[31mCost Firewall Layer 1 VIOLATION. Build failed.\033[0m\n\n'
fi

exit "$FAIL"

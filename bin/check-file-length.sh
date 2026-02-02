#!/bin/bash
# Check file length limits
# Code files: 500 lines max
# Test files: 800 lines max

set -e

MAX_CODE_LINES=500
MAX_TEST_LINES=800
EXIT_CODE=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

check_file() {
  local file="$1"

  [[ ! -f "$file" ]] && return 0

  # Skip excluded patterns
  case "$file" in
    *.md|*.json|*.yml|*.yaml|*.css|*.html|*.lock|*.svg|*.sql)
      return 0
      ;;
    *node_modules/*|*dist/*|*build/*|*.git/*|*.svelte-kit/*)
      return 0
      ;;
  esac

  local line_count=$(wc -l < "$file" | tr -d ' ')

  local max_lines=$MAX_CODE_LINES
  if [[ "$file" == *.test.ts ]] || [[ "$file" == *.spec.ts ]]; then
    max_lines=$MAX_TEST_LINES
  fi

  if [[ $line_count -gt $max_lines ]]; then
    echo -e "${RED}❌ $file: $line_count lines (max: $max_lines)${NC}"
    EXIT_CODE=1
  fi
}

if [[ $# -gt 0 ]]; then
  for file in "$@"; do
    check_file "$file"
  done
else
  while IFS= read -r -d '' file; do
    check_file "$file"
  done < <(find src -type f \( -name "*.ts" -o -name "*.svelte" \) -print0 2>/dev/null || true)
fi

if [[ $EXIT_CODE -eq 0 ]]; then
  echo -e "${GREEN}✅ All files within length limits${NC}"
fi

exit $EXIT_CODE

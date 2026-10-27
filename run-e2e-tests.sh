#!/bin/bash

# E2E Test Runner Script
# This script compiles TypeScript tests, fixes module imports, and runs the E2E tests
set -euo pipefail

echo "🔧 Compiling TypeScript tests..."
npm run e2e:compile

echo "📝 Renaming .js files to .cjs..."
find dist/e2e -name '*.js' -print0 | while IFS= read -r -d '' file; do
  mv "$file" "${file%.js}.cjs"
done

echo "🔗 Fixing module imports..."
find dist/e2e -name '*.cjs' -print0 | while IFS= read -r -d '' file; do
  perl -pi -e 's/require\("\.\/([^"]*)\.actions"\)/require(".\/$1.actions.cjs")/g' "$file"
  perl -pi -e 's/require\("\.\/([^"]*)\.actions\.js"\)/require(".\/$1.actions.cjs")/g' "$file"
  perl -pi -e 's/require\("\.\.\/support\/testIndicator\.utils"\)/require("..\/support\/testIndicator.utils.cjs")/g' "$file"
done

echo "🧪 Running E2E tests..."
# If no positional path argument is given, default to all feature files.
# Without this, cucumber-js finds no features under the repo root and reports
# "0 scenarios" while still exiting 0.
if [[ $# -eq 0 ]] || [[ "$1" == --* ]]; then
  # Whole-suite runs are sharded across parallel processes by default (override with E2E_SHARDS=1)
  export E2E_SHARDS="${E2E_SHARDS:-4}"
  shopt -s nullglob
  features=(tests/e2e/features/*.feature)
  shopt -u nullglob
  node run-cucumber.cjs "${features[@]}" "$@" --tags 'not @wip and not @bug'
else
  node run-cucumber.cjs "$@" --tags 'not @wip and not @bug'
fi

echo "✅ E2E test run completed" 

#!/usr/bin/env bash
# Adds the Concept E preview to the Pages artifact as a SEPARATE subdirectory (/concept-e/).
# The production build in <dist> (built from main) is never modified, only extended.
#   usage: assemble-pages.sh <preview-source-dir> <dist-dir>
set -euo pipefail
PREVIEW="${1:?preview source dir}"
DIST="${2:?dist dir}"
SRC="$PREVIEW/cog-refinements"
OUT="$DIST/concept-e"

for f in concept-e/index.html shared/cog-base.css shared/cog-core.js shared/cog-ui.js; do
  [ -f "$SRC/$f" ] || { echo "::error::missing Concept E file: $f"; exit 1; }
done
[ -f "$DIST/index.html" ] || { echo "::error::production build missing: $DIST/index.html"; exit 1; }
[ -e "$OUT" ] && { echo "::error::$OUT already exists in the production build"; exit 1; }

mkdir -p "$OUT/shared"
cp "$SRC/concept-e/index.html" "$OUT/index.html"
cp "$SRC/shared/cog-base.css" "$SRC/shared/cog-core.js" "$SRC/shared/cog-ui.js" "$OUT/shared/"
# The page lives at /concept-e/ with its own shared/ folder, so only the asset prefix changes (no UI/logic edits).
sed -i 's#\.\./shared/#shared/#g' "$OUT/index.html"
grep -q 'shared/cog-core.js' "$OUT/index.html" && ! grep -q '\.\./shared/' "$OUT/index.html" || { echo "::error::asset path rewrite failed"; exit 1; }
echo "Concept E preview assembled at $OUT"

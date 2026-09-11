#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/validate.mjs
VERSION="$(node -p "JSON.parse(require('fs').readFileSync('system.json','utf8')).version")"
OUT="dist/altered-carbon-rpg-v${VERSION}.zip"
rm -rf dist
mkdir -p dist
zip -qr "$OUT" system.json altered-carbon-rpg.mjs module data lang styles templates
cp system.json dist/system.json
node scripts/write-checksums.mjs
printf 'Built release assets: %s, dist/system.json, dist/SHA256SUMS.txt\n' "$OUT"

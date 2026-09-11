#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('system.json','utf8')).version)")"
OUT="dist/altered-carbon-rpg-v${VERSION}.zip"
rm -rf dist
mkdir -p dist
zip -qr "$OUT" system.json altered-carbon-rpg.mjs module data lang styles templates
printf 'Built %s\n' "$OUT"

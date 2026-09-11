#!/usr/bin/env bash
# Run only by an authorised repository maintainer. Publishes only tested dist assets.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${GITHUB_REPOSITORY:?Run from the publishing workflow or set OWNER/REPO explicitly}"
: "${GITHUB_SHA:?A full target commit SHA is required}"
node scripts/verify-release.mjs
VERSION="$(node -p "JSON.parse(require('fs').readFileSync('system.json','utf8')).version")"
TAG="v${VERSION}"
if [[ "${GITHUB_REF_TYPE:-}" == tag && "${GITHUB_REF_NAME:-}" != "$TAG" ]]; then
  echo "Tag and manifest do not match: ${GITHUB_REF_NAME:-} versus $TAG" >&2; exit 1
fi
VISIBILITY="$(gh repo view "$GITHUB_REPOSITORY" --json visibility --jq .visibility)"
if [[ "$VISIBILITY" != PUBLIC ]]; then
  echo 'Foundry cannot install private GitHub assets anonymously. Use public release hosting; nothing was published.' >&2; exit 1
fi
# Never move a pre-existing version tag onto a different commit.
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  TAG_COMMIT="$(git rev-parse "$TAG^{commit}")"
  if [[ "$TAG_COMMIT" != "$GITHUB_SHA" ]]; then echo "Existing $TAG belongs to another commit. Use a new version." >&2; exit 1; fi
fi
# Fail on API/auth errors; do not treat them as an empty release history.
gh api --paginate "repos/$GITHUB_REPOSITORY/releases?per_page=100" --jq '.[] | [.tag_name,.draft,.prerelease] | @tsv' > dist/release-history.tsv
VERSION="$VERSION" node --input-type=module <<'JS'
import fs from 'node:fs';
import {compareStableVersions} from './scripts/release-config.mjs';
for (const line of fs.readFileSync('dist/release-history.tsv','utf8').split(/\r?\n/).filter(Boolean)) {
  const [tag_name,draft,prerelease]=line.split('\t');
  const release={tag_name};
  if (draft==='true' || prerelease==='true') continue;
  const version=String(release.tag_name).replace(/^v/,'');
  if (/^\d+\.\d+\.\d+$/.test(version) && compareStableVersions(version,process.env.VERSION)>0) throw new Error(`Refusing to mark an older build latest: published ${version}, requested ${process.env.VERSION}`);
  if (release.tag_name===`v${process.env.VERSION}`) throw new Error('This version is already published. Do not overwrite it; verify it or bump the patch version.');
}
JS
if ! gh release view "$TAG" --repo "$GITHUB_REPOSITORY" --json isDraft >/dev/null 2>&1; then
  gh release create "$TAG" --repo "$GITHUB_REPOSITORY" --target "$GITHUB_SHA" --draft --title "Altered Carbon RPG $TAG" --notes-file RELEASE-NOTES.md
fi
DRAFT="$(gh release view "$TAG" --repo "$GITHUB_REPOSITORY" --json isDraft --jq .isDraft)"
if [[ "$DRAFT" != true ]]; then echo 'Refusing to overwrite a published release.' >&2; exit 1; fi
# All assets are uploaded while hidden. Latest is changed only after successful upload.
gh release upload "$TAG" "dist/system.json" "dist/altered-carbon-rpg-$TAG.zip" "dist/SHA256SUMS.txt" --repo "$GITHUB_REPOSITORY" --clobber
gh release edit "$TAG" --repo "$GITHUB_REPOSITORY" --draft=false --prerelease=false --latest
node scripts/verify-published.mjs

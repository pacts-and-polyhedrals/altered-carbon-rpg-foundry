# Altered Carbon - Original release route audit

## Evidence actually inspected

The saved `altered-carbon-ui-v1.1.2-bundle(1).zip` and
`altered-carbon-ui-v1.3.0-bundle(1).zip`, plus the later v1.4.0-v1.4.2 source/runtime
packages and v1.4.2 direct-import variant. The original full conversation page
could not be retrieved; this audit uses actual saved files, not invented chat
contents or a claim that an older version passed live testing.

Both original bundles explicitly name:

- Repository: `pacts-and-polyhedrals/altered-carbon-rpg-foundry`
- Source branch: `main`
- System ID: `altered-carbon-rpg`
- Manifest: `https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`
- Download convention: `https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/vVERSION/altered-carbon-rpg-vVERSION.zip`

Their source/install ZIPs contain `system.json` at ZIP root. The outer bundle uses
`00-GITHUB-REPOSITORY-...zip`, `01-FOUNDRY-INSTALL-...zip`, the exactly named release
ZIP, standalone `system.json`, `03-START-HERE.md` and `04-CHANGELOG.md`.

## Manifest history

| Saved package | Update URL | Download | Ammunition / Drug declared |
| --- | --- | --- | --- |
| v1.1.2 | Original raw main/system.json | Pinned v1.1.2 ZIP | No |
| v1.3.0 | Original raw main/system.json | Pinned v1.3.0 ZIP | Yes |
| v1.4.0 | Original raw main/system.json | Pinned v1.4.0 ZIP | Yes |
| v1.4.1 | Original raw main/system.json | Pinned v1.4.1 ZIP | Yes |
| v1.4.2 | Changed to releases/latest/download/system.json | Pinned v1.4.2 ZIP | Yes |
| v1.4.2 direct-import variant | Removed | Removed | Yes |
| v1.4.3 repair | ORIGINAL raw main/system.json restored | Pinned v1.4.3 ZIP | Yes |

## The confirmed local regressions

**1. The original manual publishing process was misdiagnosed.**
The v1.1.2 and v1.3.0 CI workflows validate/build but do not publish. This is
consistent with their instructions to create a GitHub release manually and
attach the named ZIP. The absence of a publisher did not itself make them broken.

**2. The v1.4.2 repair changed the update URL unnecessarily.**
It introduced a requirement for an attached Latest-release `system.json`, rather
than preserving the known raw-main route. Existing raw-main installations still
needed the root file updated. Merely adding a release asset could not update that
root file. This is a verified difference in the packages, not proof of which
remote URL Forge actually requested in the failed installation.

**3. The direct-import workaround intentionally removed automatic updates.**
It retained the gameplay code but removed `manifest` and `download`. That may be a
manual installation variant, but it is not a repair of the established updater.

**4. v1.4.2 CI prepared files before validating them.**
`npm run prepare:release` changed the runner's local manifests/version labels and
could mask incorrectly committed release metadata. It did not commit those
changes back to public main. The new CI validates files as committed and checks
that validation did not rewrite them. Release preparation remains an explicit
maintainer command, not an automatic validation step.

## What v1.4.3 changes

The original raw-main update URL and numbered bundle presentation are restored.
The system ID and flat runtime file layout are retained. Source and release
manifests are identical and point to the exact v1.4.3 archive. The name changes
only to identify this corrected package distinctly from earlier v1.4.2 variants.

Attach the same `system.json` to the new release as a compatibility bridge for
installations already diverted to the v1.4.2 Latest-release route. Its `manifest`
field points back to original raw-main. New/old raw-main installations do not
need to adopt the Latest route. A no-update direct import requires an explicit
manifest install once.

The public checker starts from raw-main, not from the new release alone. It checks
both bridge URLs and the entire downloaded ZIP hash. It explicitly fails on stale
main, changed schemas, missing assets or wrong bytes. Canonical-only mode supports
the original route when a v1.4.2 bridge is unnecessary. No public pass is claimed.

The optional publisher is manual-only, operates on main, does not rewrite source,
and refuses publication while the original publicly served manifest is stale.
No GitHub Actions run is required for the normal manual release workflow.

## What this cannot prove from the supplied console trace

The task-status GET returned HTTP 500 on Forge. The trace shows the client polling
an install task, not the reason that task failed. It does not show the selected
manifest URL, the response body, downloaded archive, public release state or
server-side package registry. No package edit can honestly be labelled a verified
fix of that server response without testing the hosted installation.

The ammunition/drug errors establish rejection by the running Item type registry.
The original v1.1.2 manifest does not declare those types; v1.3.0 and later do.
An old server manifest with newer code is consistent with that failure, but the
live host has not been inspected. The complete typed manifest is preserved; there
is no conversion of ammunition/drug records into generic equipment.

## Verification record

See QA-REPORT.md and `qa-release/` for the checks actually executed. The release
contains 68 runtime files: 62 unchanged, five version-label-only changes, and the
three changed fields of system.json. All 31 game data files remain identical.

## Official references

- Foundry stable manifest/update and download fields: https://foundryvtt.com/article/system-development/
- Foundry package update process: https://foundryvtt.com/article/package-management/
- Forge custom package/manifest installation: https://forums.forge-vtt.com/t/how-to-upload-a-modified-version-of-a-module-system/10510
- GitHub release and asset management: https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository

# v1.4.2 - Release and update-link repair

- Update manifest follows the published latest release's `system.json` asset.
- Each manifest pins its ZIP to that exact version, not to an independently moving latest ZIP.
- Build outputs both the install ZIP and standalone `system.json`, plus SHA-256 checksums.
- New maintainer-triggered release workflow binds URLs to the actual GitHub repository, tests, uploads both assets to a draft, publishes it as Latest, then checks public downloads without authentication.
- The publisher refuses to overwrite published versions or promote a numerically older version.
- All v1.4.1 game features, adventure text and equipment catalogs are retained. This patch changes release wiring and displayed build numbers, not character or journal data.

A local build is not a published release. Foundry/Forge installation and live play are not tested by these build checks.

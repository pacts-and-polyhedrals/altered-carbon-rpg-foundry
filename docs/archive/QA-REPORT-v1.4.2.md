# Altered Carbon v1.4.2 - Release repair QA

## What was inspected

The attached v1.4.1 source ZIP, runtime ZIP and complete bundle were read directly. Their system manifests already agreed on version 1.4.1 and referred to the same configured repository. The earlier build emitted only the runtime ZIP. The earlier CI ran validation/build checks, but had no release publisher. No remote branch or live release was verified; this is not evidence of the current contents of the user's host.

## Completed local checks

- **185 Node tests passed**, zero failures. This includes the existing 155 rules/UI/data tests and 30 release configuration, preparation and public-verifier tests. The public-verifier tests use injected HTTP responses, not live GitHub.
- **6 offline publisher smoke tests passed** using fake `gh` and HTTP implementations: successful draft/upload/publish ordering, rejection of private repositories, prevention of promoting an older stable version, prevention of overwriting a published version, no publication after an upload failure, and rejection of a mismatched pushed tag. No real account was contacted by the smoke test.
- JSON/data/model validation passed. All document types including ammunition and drug remain declared and registered.
- Both shell scripts passed `bash -n` syntax checking; CI and release workflow files parsed as YAML.
- The runtime ZIP includes system.json at its root and all required system files. Its manifest, the source manifest and the standalone release manifest agree.
- SHA-256 checksums were generated and checked for the standalone manifest and versioned runtime ZIP.
- **All 31 game data files are byte-for-byte unchanged from v1.4.1**, including the adventure and equipment catalogs.
- Existing runtime source changes are build-number labels only, from 1.4.1 to 1.4.2. No roll, Actor, Item, advancement or journal-import behaviour was rewritten for this fix.

Run `npm run release:check` for the Node/build checks. After that, `python3 qa-release/publisher-smoke.py` runs the offline publisher smoke test. The smoke test uses only standard Python/Node libraries and a temporary local git repository. It must not be confused with the real `scripts/publish-release.sh` maintainer workflow.

## Publication checks supplied but NOT executed against the live account

`npm run verify:published` makes actual unauthenticated HTTP requests AFTER publication. It rejects missing assets, stale manifest versions, wrong repository/download paths, changed manifest contents and ZIP hashes that do not match the tested local build.

The release workflow prepares URLs from the actual `GITHUB_REPOSITORY`, tests/builds, uploads both assets while the release is still a draft, publishes as Latest, and runs that real public-download verification. A successful workflow summary prints the verified URL. Its real GitHub permission/hosting behaviour was not exercised in this delivery.

## Remaining limitations

No repository write, release publication, live GitHub latest-link verification, Foundry installation, Forge deployment, browser rendering or live multiplayer test was performed. GitHub access for the requested repository action was not completed. The previous browser-harness results are historical and have NOT been rerun or counted here. Compatibility is still minimum Foundry 14, with no live-verified compatibility claim.

This delivery repairs the local release wiring and supplies a publisher; it does not by itself update the hosted manifest or install anything in the user's world.

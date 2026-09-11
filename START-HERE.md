# START HERE - v1.4.2 release/update repair

## What was wrong with the earlier delivery

The supplied v1.4.1 system/source/ready-folder manifests all said 1.4.1. However, their update URL referred to `main/system.json` on GitHub and their download URL referred to a separate GitHub release asset. The local build neither published those URLs nor checked their live contents. The supplied CI workflow only tested and built files; it had no publication step.

This proves a gap in the delivery process, not the exact contents of your live host. A stale root manifest, an absent or differently named release ZIP, a different installation URL, or an older GitHub Latest release could each matter. Remote access was not completed, so this package does not claim which one is present on your account.

## Files in the repair bundle

- `01-GITHUB-REPOSITORY/` is the complete repository source. Put its CONTENTS at the existing repository root, not inside another parent folder.
- `02-GITHUB-RELEASE-ASSETS/` contains the standalone `system.json`, `altered-carbon-rpg-v1.4.2.zip` and checksum file.
- `03-MANUAL-INSTALL/systems/altered-carbon-rpg/` is the extracted runtime for hosts that support manual system installation.
- `04-QA/` contains the test report and logs. The tests are not proof of public hosting or a live Foundry installation.

Do not upload the whole repair bundle as the Foundry system ZIP. Do not use GitHub's automatically generated source-code ZIP as the system download. Do not rename the versioned runtime asset without updating its manifest and rebuilding.

## Recommended GitHub publication

1. Update the repository with the CONTENTS of `01-GITHUB-REPOSITORY`. `system.json`, `package.json`, `altered-carbon-rpg.mjs`, `module/`, and `.github/` must be at its root. Retain `.github/workflows/release.yml` even if your file explorer hides dot-folders.
2. In GitHub, open **Actions -> Publish Foundry Release -> Run workflow**, selecting the branch with the new source. The workflow binds URLs to the actual repository, validates/tests the build, uploads both assets to a draft, then publishes that release as Latest.
3. Use the manifest URL printed in the successful run summary. It has the form `https://github.com/OWNER/REPO/releases/latest/download/system.json`. A successful publication check means that URL serves the expected JSON and the referenced ZIP matches the tested archive's SHA-256.

The workflow needs repository Contents write permission from its GITHUB_TOKEN and permission to run GitHub Actions. No personal token belongs in source code. It refuses private repositories because unauthenticated Foundry downloads must work. A red workflow is not a verified published update. A partially failed upload stays in draft; a failure in verification after publication must be investigated before telling players to update.

A run refuses to overwrite an already published version or move an existing version tag to another commit. Use a new patch version for changes to a published build. For a release that is already correct, use `npm run verify:published` instead of trying to publish it again.

## Manual GitHub publication instead

For the repository already configured in the supplied archives, update `main` with the source at the root, create a normal release with tag **v1.4.2**, and attach BOTH of these files from `02-GITHUB-RELEASE-ASSETS`:

```
system.json
altered-carbon-rpg-v1.4.2.zip
```

Attach `SHA256SUMS.txt` too, and explicitly set the release as **Latest**. Publish it, not Draft or Pre-release. Open the stable manifest link in a logged-out browser and check its version and download field, then open the ZIP URL. Local preparation is not a substitute for these checks.

The default configured URLs are:

```
https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/latest/download/system.json
https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/v1.4.2/altered-carbon-rpg-v1.4.2.zip
```

These are configuration targets, NOT a statement that they are live. For a different repository, use the workflow above, or run `npm run prepare:release -- --repository OWNER/REPO` and rebuild BEFORE attaching the assets. Do not manually attach this default-repository manifest to a different repository unchanged.

## Existing installations using the old manifest URL

The old raw `main/system.json` URL is not inherently invalid. Existing installs will continue consulting whatever URL is saved locally until their package metadata is updated. Keeping the repository-root manifest current is therefore important during this migration. Publishing only a new release leaves an old `main/system.json` untouched.

Once that root manifest and its matching release are deployed, the old URL can deliver v1.4.2 and the new package switches future checks to the published-latest release manifest. Alternatively, use the new verified manifest URL via your host's supported system-install/update process. Do not delete worlds to change a system URL. A different old repository or branch cannot be repaired by editing an unrelated repository.

## Manual system installation

Back up the existing world, stop the game/server, and replace the existing `systems/altered-carbon-rpg/` with the provided runtime folder through the host's supported installation method. Restart the server and reload all clients. Open **GM Control -> System Check**: loaded and running versions should both read **1.4.2**.

Manual replacement installs the local files but does NOT publish an online update. GitHub/Forge must still have a correctly hosted manifest and ZIP for subsequent automatic updates.

No character recreation, resleeving, world reset, Cold Storage Full Import or equipment reimport is needed for this release-pointer patch. The adventure and equipment JSON are unchanged. The existing v1.4.1 feature instructions are retained in `docs/archive/START-HERE-v1.4.1.md`.

## How the URLs are meant to work

The manifest uses a stable Latest-release asset URL. That manifest's download points to a fixed versioned ZIP, so it cannot describe one version while an independently moving Latest ZIP serves another. The publisher puts both files into a draft before changing Latest. The verifier then checks the public manifest contents and the complete ZIP hash, not just the version label.

References:
- Foundry package update process: https://foundryvtt.com/article/package-management/
- Foundry manifest/download fields: https://foundryvtt.com/article/system-development/
- GitHub latest release asset links: https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases
- GitHub release draft publication: https://cli.github.com/manual/gh_release_edit

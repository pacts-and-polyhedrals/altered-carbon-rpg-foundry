# Altered Carbon RPG - Unofficial Foundry system

## v1.4.2 - Release/update pointer repair

This release preserves the v1.4.1 game features and data. It fixes the distribution process: the stable update URL follows a published `system.json` release asset; the ZIP URL is pinned to the version described by that manifest.

**Prepared locally does not mean published.** These files have not been uploaded to a repository or installed in Foundry/Forge by this delivery. The repository configured in the supplied archives is `pacts-and-polyhedrals/altered-carbon-rpg-foundry`; ownership and its current live releases have not been verified. The publisher uses the actual `GITHUB_REPOSITORY` rather than trusting that default when run elsewhere.

Read **START-HERE.md** for the two deployment choices. For GitHub/Foundry updates, publishing the runtime ZIP alone is not sufficient. The root source manifest and the release assets must be correctly deployed.

## Maintainer release

Upload this source tree at the repository root, including `.github/workflows/release.yml`. Then run **Actions -> Publish Foundry Release -> Run workflow** on the intended source branch. It creates a normal Latest release, with both `system.json` and the tested versioned runtime ZIP attached. It also publishes SHA-256 checksums and verifies both public downloads without authentication. The successful run summary prints the real install/update URL.

The workflow is explicit (manual or a pushed `v*` tag); an ordinary source push only validates/builds and does not silently publish. Existing published versions are not overwritten, and older versions are not promoted over newer stable releases. Public GitHub hosting is required for this workflow. It refuses private repositories before publishing anything.

## Local development

```
npm run prepare:release -- --repository OWNER/REPO --version 1.4.2
npm run release:check
```

The build outputs `dist/system.json`, `dist/altered-carbon-rpg-v1.4.2.zip`, and `dist/SHA256SUMS.txt`. `npm run verify:published` is a separate, real-network check intended to run after publication; local unit tests do not establish that a remote release exists.

The runtime has no additional dependency. Node 22+, bash and zip/unzip are needed for the maintainer tooling. Live Foundry/Forge and live GitHub publishing still require verification; see QA-REPORT.md.

Detailed v1.4.1 feature instructions are preserved in `docs/archive/START-HERE-v1.4.1.md`. The integrated adventure, GM Bonus Dice, editable preset TR, direct Skill Roll controls, Actor-sidebar Character Creator, Level Up and typed ammunition/drugs are retained.

# START HERE — GitHub + Foundry Setup

Repository name: **altered-carbon-rpg-foundry**

Expected repository URL:
`https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry`

Foundry system ID: **altered-carbon-rpg**

Version: **1.0.0**

## 1. Create the GitHub repository

Create a new repository under the `pacts-and-polyhedrals` account named exactly:

`altered-carbon-rpg-foundry`

Do not initialize it with a README, .gitignore, or license if you are uploading this prepared repository tree.

The manifest URL used by Foundry is deliberately the stable raw-main URL:

`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`

This avoids GitHub `releases/latest` prerelease/draft behaviour entirely.

## 2. Upload the repository files

Extract the repository ZIP supplied with this build. Upload the CONTENTS of the extracted folder to the root of the GitHub repository.

The GitHub root must show `system.json` directly. It must NOT show another wrapper folder first.

Expected root:

- system.json
- altered-carbon-rpg.mjs
- module/
- data/
- lang/
- styles/
- templates/
- tests/
- scripts/
- docs/
- .github/
- package.json
- README.md

Commit to the `main` branch.

## 3. Create release v1.0.0

On GitHub open **Releases** -> **Draft a new release**.

Tag: `v1.0.0`

Title: `Altered Carbon RPG — Unofficial v1.0.0`

This must be a NORMAL release. Do not mark it Draft or Pre-release.

Upload the release asset:

`altered-carbon-rpg-v1.0.0.zip`

You may also attach `system.json` and `SHA256SUMS.txt` for convenience, but Foundry will use the raw-main manifest URL above.

Publish the release.

## 4. Test the public URLs before Forge

Open these in a private/incognito browser window where you are not logged into GitHub:

Manifest:
`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`

Release ZIP:
`https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/v1.0.0/altered-carbon-rpg-v1.0.0.zip`

The first must show/download JSON. The second must download a ZIP without asking for authentication.

## 5. Install in Foundry / Forge

Use this Manifest URL:

`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`

Foundry reads that manifest and follows its `download` field to the v1.0.0 release ZIP.

If Forge offers **Install from the Bazaar if the package is found**, disable that option for this custom-manifest test so Forge uses the URL you supplied.

## 6. Important archive structure

The INSTALL ZIP is intentionally flat. Opening it must immediately show:

- system.json
- altered-carbon-rpg.mjs
- module/
- data/
- lang/
- styles/
- templates/

There must not be an extra `altered-carbon-rpg/` wrapper directory inside the ZIP.

## 7. Source/distribution warning

This project is an unofficial implementation and contains material derived from a commercial tabletop RPG. Before making a repository or release public, ensure you have the rights/permission needed for any source-derived text or data you distribute. Forge/Foundry custom-manifest installation requires the manifest and ZIP to be reachable by the server that installs them.

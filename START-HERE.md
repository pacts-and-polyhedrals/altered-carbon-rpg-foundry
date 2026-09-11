# START HERE - Altered Carbon v1.4.3

Repository: **pacts-and-polyhedrals/altered-carbon-rpg-foundry**  
Branch: **main**  
Foundry system ID: **altered-carbon-rpg**  
Version: **1.4.3**  
Foundry minimum: **14**

## What this repairs

This restores the release structure in the saved v1.1.2 and v1.3.0 bundles:
**the original raw main/system.json manifest, a versioned GitHub release ZIP,
a full repository ZIP, and the original numbered bundle labels.**

v1.4.2 changed the update channel to a Latest-release manifest. Its direct-import
variant then removed update metadata. Neither change was necessary for the
original manual-release workflow. v1.4.3 restores that workflow without removing
any journals, game mechanics, sheets or GM features.

This patch does not demonstrate the underlying cause of Forge's HTTP 500.
It repairs the local distribution regressions found by comparing the actual
archives. Public GitHub URLs and live Forge installation were not verified here.

## 1. Update the repository source - same route as before

Extract **00-GITHUB-REPOSITORY-altered-carbon-rpg-foundry-v1.4.3.zip**.
Put its CONTENTS at the root of the existing repository on **main**.

The root must contain `system.json`, `altered-carbon-rpg.mjs`, `module/`, `data/`,
`templates/`, `styles/`, `lang/` and the development files directly. Do not put
another `altered-carbon-rpg-foundry/` folder around them. Do not upload the outer
bundle ZIP as though it were the repository source or the Foundry package.

Update hidden files too, particularly `.github/workflows/ci.yml`,
`.github/workflows/release.yml` and `.gitattributes`. They are inside the repository
ZIP. The normal manual publishing route does NOT require GitHub Actions.

The root `system.json` must say `"version": "1.4.3"`. It is not sufficient to upload
new scripts while leaving the root manifest on an earlier build. The CI now
validates committed files without silently rewriting their release configuration.

## 2. Publish the matching release

Use the original GitHub Releases workflow. Create a normal published release:

- Tag: **v1.4.3**
- Target: the **main commit containing the v1.4.3 source**
- Title: **Altered Carbon RPG - Unofficial v1.4.3**
- Assets: **altered-carbon-rpg-v1.4.3.zip** and **system.json** from this bundle
- Set this release as **Latest**, not Draft or Pre-release, unless a genuinely newer
  version has already been published. Do not overwrite an existing v1.4.3 release.

The exact ZIP asset name matters. Do not attach the source ZIP, the complete
bundle ZIP or the file with the `01-FOUNDRY-INSTALL-` prefix as the named release
asset. The unprefixed `altered-carbon-rpg-v1.4.3.zip` is included ready to attach.
The prefixed copy is byte-identical and exists only to retain the old bundle layout.

The extra `system.json` release asset is a compatibility bridge for installations
that were switched to the v1.4.2 Latest-release URL. Its contents point back to the
ORIGINAL raw-main URL. It is not a new required update strategy. Publishing the
ZIP alone still supports the original raw-main route, but does not repair that
v1.4.2 bridge.

No asset or release has been uploaded to your repository by this delivery.

## 3. Keep using the ORIGINAL Foundry / Forge manifest

```text
https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json
```

That file should contain:

```json
{
  "id": "altered-carbon-rpg",
  "version": "1.4.3",
  "manifest": "https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json",
  "download": "https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/v1.4.3/altered-carbon-rpg-v1.4.3.zip"
}
```

This excerpt is NOT the complete manifest. Upload the supplied full `system.json`,
which includes every Actor/Item type, scripts, styles and other required metadata.

## 4. Verify the hosted files BEFORE asking Forge to install

Open the original manifest URL in a logged-out/incognito browser. It must display
v1.4.3 JSON with the exact v1.4.3 download URL. Open that download URL: it must
return the named ZIP without requiring a login. Open its `system.json`: it must
also say v1.4.3 and include `ammunition` and `drug` under `documentTypes.Item`.

For a complete automated check, the repository includes:

```sh
npm run release:check
npm run verify:published
```

The first command is local and does not prove publication. The second makes real,
unauthenticated requests to the original main manifest, the versioned release
manifest, the Latest-release compatibility bridge, and the exact versioned ZIP.
It checks the full manifest and ZIP hash. It must NOT be described as a successful
public check until it actually succeeds after upload.

`npm run verify:published -- --canonical-only` checks just the original main
manifest and its ZIP when the temporary v1.4.2 bridge is not relevant.

Builds use reproducible flat ZIPs, with fixed metadata and no compression, so
identical runtime files produce the same archive across operating systems. The
runtime is about 2 MB. No dependencies or world data have been added.

## 5. Update Forge with the original manifest

Back up your world, stop the running game, then use **Install from Manifest** with
the original raw-main URL above. For this custom package, turn OFF **Install from
the Bazaar if the package is found**. This remains a manifest installation; it is
not the direct-upload workaround from the previous reply.

Do not uninstall/delete the world or change its system ID. Do not use the outer
bundle ZIP, source ZIP or automatic GitHub source-code archive as the install ZIP.
Restart the game server after the package update and reload connected clients.

GM Control -> System Check should show both loaded manifest and running code at
**1.4.3**, with `ammunition` and `drug` registered. Then retry **Core Equipment
Library -> Install Missing Records to World** if those records previously failed.
Do not recreate characters or run Cold Storage Full Import for this update.

Installations that still check the original raw-main URL stay on that route.
Installations that check the v1.4.2 Latest-release URL can receive the attached
bridge manifest and then return to raw-main. The no-update direct-import variant
needs an explicit manifest install once because it contains no update URL.

## What remains unchanged

Integrated Cold Storage journals and folder importer; direct Skill Roll buttons;
GM-assigned Bonus Dice; editable preset TR; eight-stage character creation;
Actor-sidebar Character Creator; sheet Level Up; Core Equipment Library;
Ammunition and Drug types; current game data; existing view/edit sheet presentation.

The runtime differences from v1.4.2 are the three release manifest fields and
version labels in five files. All 31 game data files and the CSS are unchanged.

## When a 500 persists

A 500 from Forge's task-status endpoint is not a diagnosis of its underlying
cause. If the public checker succeeds but Forge still fails, the hosted package
chain has been verified; the Forge installation task still needs inspection.
Keep the first task's Response body and full task ID for Forge support, excluding
cookies, authorization headers and other credentials. Do not delete world data,
repeatedly create new package versions, or change Item types to disguise this.

## References

The original saved instructions are in `docs/reference/`. Their existence does
not certify that a particular older version ran successfully on the live host.

- Foundry manifest fields and stable update URL: https://foundryvtt.com/article/system-development/
- Foundry update process: https://foundryvtt.com/article/package-management/
- Forge custom manifest installation: https://forums.forge-vtt.com/t/how-to-upload-a-modified-version-of-a-module-system/10510
- GitHub release asset management: https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository

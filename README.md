# Altered Carbon RPG — Unofficial Foundry VTT System

**Current version: v2.4.3** · Foundry VTT v14

Unofficial Foundry VTT implementation of the 2020 Altered Carbon RPG rules. Requires lawful
access to the original tabletop rules. Not affiliated with or endorsed by the Altered Carbon
rights holders or Foundry Gaming LLC.

## Manifest URL

Paste this into Foundry or The Forge under **Game Systems → Install System → Manifest URL**:

```text
https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/latest/download/system.json
```

This link always points to the release marked **Latest**, so **Check for Update** finds every
new version automatically.

Older installs that still use `.../main/system.json` keep working because the `system.json` on
`main` is kept in sync with the latest release. If an install ever looks stuck on an old
version, uninstall it and reinstall from the manifest URL above. Uninstalling a system does
not delete your worlds.

## What's in v2.4.3

- **Install / Update Content** (Game Settings or the GM panel): checks for system and module
  updates, installs compendium content into the world, and has an optional tick box to remove
  previous versions first. Player characters are never removed.
- **GM rulings on chat cards:** a GM-only Scandal / Condition / Injury strip on every
  Altered Carbon chat card. Scandals can also deduct IP and add the Scandalized Condition.
- **GM Command Deck:** every GM tool on the GM Control panel, including Combat Console, Zone
  Assistant, Clinical Console, Upgrade Workbench, Core Equipment Library, Rules Reference,
  GM Operations, Adventure Book, Character Creator, Advancement, World Migration and Emblems.
- **Noir emblems:** custom artwork for all 8 adversaries, 3 vehicles, 7 networks, 95 core items
  and 12 weapon upgrades. New documents created from them get their emblem automatically.
  Run `game.alteredCarbon.applyEmblems()` once as GM to update existing world documents.
- **Compendium fix (from v2.4.1):** pack folders no longer use a `.db` suffix, which fixes
  worlds getting stuck while loading on The Forge.

## Compendiums

Core Skills · Core Traits · Core Baggage · Core Conditions and Injuries · Core Scandals ·
Core Equipment (95 Items) · Generic Weapon Upgrades · Core Networks · Core Vehicles ·
Core Adversaries · Player and GM Guides

## Publishing a new release

1. Bump `version` in `system.json`, `BUILD_VERSION` in `module/system-health.mjs` and
   `GUIDE_VERSION` in `module/gm-guide.mjs`. All three must match, or the system health check
   reports an installation mismatch.
2. Update the `download` URL in `system.json` to
   `.../releases/download/vX.Y.Z/altered-carbon-rpg-vX.Y.Z.zip`.
3. Build `altered-carbon-rpg-vX.Y.Z.zip` with the files at the zip root (no wrapper folder).
   Pack folders must not contain `LOCK` or `LOG` files.
4. Create GitHub release `vX.Y.Z`, attach the zip and `system.json`, and mark it **Latest**.
5. Commit the same files, including this README, to `main`.

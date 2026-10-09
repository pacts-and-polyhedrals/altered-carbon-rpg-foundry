# Altered Carbon RPG - Unofficial Foundry system

## v2.4.0

Unofficial Foundry VTT v14 implementation of the 2020 Altered Carbon RPG rules.
Requires lawful access to the original tabletop rules. Not affiliated with or
endorsed by the Altered Carbon rights holders or Foundry Gaming LLC.

## Install / update

Paste this manifest URL into Foundry (or The Forge) under
**Game Systems → Install System → Manifest URL**:

```text
https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/latest/download/system.json
```

That URL always serves the `system.json` attached to the release marked
**Latest**, so "Check for Update" picks up each new release automatically.

The older address `.../main/system.json` (this branch) is kept in sync with the
latest release so that existing installs that still point at it can update too.

## Publishing a new release

1. Bump `version` and the `download` URL in `system.json`.
2. Build `altered-carbon-rpg-vX.Y.Z.zip` with the files at the zip root (no wrapper folder).
3. Create GitHub release `vX.Y.Z`, attach the zip and `system.json`, mark it **Latest**.
4. Commit the same `system.json` (and changed files) to `main`.

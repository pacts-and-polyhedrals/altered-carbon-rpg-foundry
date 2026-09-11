# Altered Carbon RPG — Unofficial for Foundry VTT v14

An unofficial Foundry VTT v14 game system implementation of the 2020 Altered Carbon RPG rules.

## Installation

Use this manifest URL in Foundry VTT / Forge:

`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`

The current release is **v1.0.0** and the manifest downloads:

`https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/v1.0.0/altered-carbon-rpg-v1.0.0.zip`

## Repository structure

The Foundry system lives at the repository root. `system.json` must remain at the root because Foundry requires it there.

The separate one-shot **Cold Storage: The Faces We Left Behind** is not bundled into this repository. It should be published as its own Foundry module/repository.

## Development checks

Requires Node 22+ for the local test scripts.

- `npm test`
- `npm run validate`
- `npm run build`
- `npm run release:check`

`npm run build` creates a flat Foundry install archive at `dist/altered-carbon-rpg-v1.0.0.zip`.

## Foundry v14 architecture

The system uses Foundry v14 `TypeDataModel`, `ActorSheetV2`, `ItemSheetV2`, `HandlebarsApplicationMixin`, `DocumentSheetConfig`, and `DialogV2` APIs.

## Unofficial project

This is an unofficial fan-made implementation and is not affiliated with or endorsed by the Altered Carbon rights holders or Foundry Gaming LLC. Users should have lawful access to the original tabletop rules.

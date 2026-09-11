# Altered Carbon RPG — Unofficial for Foundry VTT v14

An unofficial Foundry VTT v14 game system implementation of the 2020 Altered Carbon RPG rules.


## View-first character sheets

Actor sheets open in read-only mode. Previous Sleeves, Relationships and Networks expand inline for inspection. Owners and GMs use the **Edit Sheet** control to unlock manual fields and embedded-record editors, preventing an ordinary “Open” action from unexpectedly entering an edit form.

## Current version

**v1.1.2 — View-First Records & Edit Mode**

The 1.1.2 patch keeps the v1.1 interface rebuild and adds a view-first interaction model: character sheets open read-only, previous Sleeves/Relationships/Networks expand inline, and owners or GMs explicitly enable Edit Mode before changing fields or opening embedded record editors.

## Installation

Use this manifest URL in Foundry VTT / Forge:

`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`

The current manifest downloads:

`https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/v1.1.2/altered-carbon-rpg-v1.1.2.zip`

## UI highlights

- Fixed identity/header area with live Stack, Sleeve and Ego state.
- Scroll-safe Actor sheet viewport.
- Seven-value operational vitals strip.
- All six Attributes visible in a responsive Sleeve-vs-DHF matrix.
- Consistent futuristic panels across Identity, Sleeve, Skills, Traits, Sleeve Archive, Relationships, Evidence, Gear and Combat.
- Restyled Item sheets, Rules Browser and Speed Dice Combat Console.
- Guided Character Creator: Identity → Archetype → Variant → Sleeve → Attributes → Resources → Review.
- Dynamic Archetype, Variant and Sleeve explanations, Starting Package filtering and AI-specific resource guidance.

## Repository structure

The Foundry system lives at the repository root. `system.json` must remain at the root.

The separate one-shot **Cold Storage: The Faces We Left Behind** remains a separate Foundry module/repository.

## Development checks

Requires Node 22+ for the local test scripts.

- `npm test`
- `npm run validate`
- `npm run build`
- `npm run release:check`

`npm run build` creates a flat Foundry install archive at `dist/altered-carbon-rpg-v1.1.2.zip`.

## Foundry v14 architecture

The system uses Foundry v14 `TypeDataModel`, `ActorSheetV2`, `ItemSheetV2`, `HandlebarsApplicationMixin`, `DocumentSheetConfig`, and `DialogV2` APIs.

## Unofficial project

This is an unofficial fan-made implementation and is not affiliated with or endorsed by the Altered Carbon rights holders or Foundry Gaming LLC. Users should have lawful access to the original tabletop rules.

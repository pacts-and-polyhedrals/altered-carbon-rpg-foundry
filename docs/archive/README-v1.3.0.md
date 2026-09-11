# Altered Carbon RPG — Unofficial for Foundry VTT v14

An unofficial Foundry VTT v14 game-system implementation of the 2020 *Altered Carbon RPG* rules. It is designed for private tables that already have lawful access to the tabletop rules.

## Current version

**v1.3.0 — Core Equipment Library**

v1.3.0 adds a complete structured equipment layer for the catalog approved from the supplied 2020 Core Rulebook: **95 usable Item records**, **3 Vehicle Actor templates**, and a **12-entry generic weapon-upgrade index**. The 2020 Core Rulebook remains the primary mechanical authority; the supplied Quick Start is secondary when values differ.

### Core Equipment Library

The new **Altered Carbon — Core Equipment Library** is available from character sheets through **Core Gear**, from the Rules Reference, and from the system menu. It contains:

- 30 Weapon records;
- 13 Ammunition profiles;
- 8 Apparel/Armour records;
- 12 Device/Deck records;
- 3 Software records;
- 7 Drug/Medicine records;
- 22 Sleeve Augmentation records;
- 3 Vehicle Actor templates;
- 12 generic weapon upgrades.

Each Item carries a stable Core catalog ID plus source page, Price Level, Tech Points, Capacity/Depletion data where relevant, Skill/use information, damage profile, special rules, Triggered Effects, prerequisites and/or upgrades as appropriate to that record.

Re-adding a normal Core item to the same Actor is blocked by catalog ID. Re-adding ammunition or a drug increases its quantity rather than creating another duplicate row. A GM may also use **Install Missing Records to World** to create all missing catalog Items and the three Vehicle Actors without overwriting customized records already carrying the same Core catalog ID.

### Ammunition workflow

Weapons now expose **Load Ammo**. The Actor's owned ammunition profiles can be selected without replacing the weapon. Attack and damage cards use the loaded profile for properties such as damage type, Armor Piercing, Deadly, organic/synthetic modifiers and range-specific shotgun damage. The weapon's normal Capacity/Depletion remains the ammunition-consumption track.

### Drugs & medicine

`drug` is now a first-class Item type. Drug records display administration method, Addiction, Controlled Substance requirements, duration, effects, Under-the-Influence effects and upgrades. **Administer** consumes one dose and posts a futuristic chat card. Direct state changes that are unambiguous in the supplied Core rules are automated; contextual or choice-dependent effects remain displayed for GM adjudication instead of being guessed.

### Sleeve augmentations

Active Core augmentation Items now participate in derived character data where the source effect is explicit. Attribute-changing neurachem/augments feed effective Attributes without rewriting the stored base values. Speed Neurachem adds a Speed Die; Subdermal Plating adds its Damage Threshold/protection effect; Bestial Dermis adds its passive protection. Other specialized effects remain visible on the augmentation record for use in the appropriate situation.

## GM operations

- **Altered Carbon — GM Guide** is created automatically for a GM and now contains **22 generated pages**, including **21 — Core Equipment Library**.
- Existing generated guides are refreshed automatically when their generated-guide version is stale; custom unflagged notes pages are preserved.
- **Altered Carbon — GM Control** remains available from the GM-only satellite-dish button in Foundry v14 **Token Controls**, from the system menu, and through `game.alteredCarbon.openGMControl()`.
- The GM can send a preset or custom Skill Check request to one or more player characters. Eligible players answer from the chat card and the request card records each returned result.

## Character sheets and chat

Actor sheets remain scroll-safe and view-first. Embedded records use the same read-first disclosure model throughout the sheet; actual editing requires whole-sheet **Edit Sheet** mode. Literal duplicate imports are collapsed in sheet presentation, including Baggage, equipment, ammunition and drugs, while genuinely different same-name equipment can remain distinct.

System Skill Check cards retain the graded futuristic presentation for Success +1 through +5, Failure -1 through -5, Ace, Stroke of Luck and Catastrophe. Weapon, ammunition, drug, equipment, damage, opposed-check and GM-request cards share the same visual language.

## Installation

Use this stable manifest URL in Foundry VTT / Forge:

`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`

The v1.3.0 manifest downloads:

`https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/v1.3.0/altered-carbon-rpg-v1.3.0.zip`

## Repository structure

The Foundry system lives at the repository root. `system.json` must remain at the root of both the repository and the release ZIP.

The one-shot **Cold Storage: The Faces We Left Behind** remains a separate Foundry module/repository. This repository is the reusable game system; its GM presets intentionally support the Cold Storage module.

The Core Equipment Library is shipped as JSON-backed system data and creates real Foundry Item/Actor documents on demand. It is not a prebuilt LevelDB compendium pack; a real Foundry runtime is still required to author and validate a native packaged compendium database safely.

## Development checks

Requires Node 22+ for the local test scripts.

- `npm test`
- `npm run validate`
- `npm run build`
- `npm run release:check`

`npm run build` creates the flat Foundry install archive at `dist/altered-carbon-rpg-v1.3.0.zip`.

See `docs/CORE-EQUIPMENT.md` for the shipped catalog, `docs/GM-TOOLS.md` for GM workflow, and `docs/RUNTIME-TEST.md` for live Foundry/Forge acceptance checks.

## Foundry v14 architecture

The system uses Foundry v14 `TypeDataModel`, `ActorSheetV2`, `ItemSheetV2`, `HandlebarsApplicationMixin`, `ApplicationV2`, `DocumentSheetConfig`, `DialogV2`, JournalEntry pages and the v14 HTML chat render hook.

## Unofficial project

This is an unofficial fan-made implementation and is not affiliated with or endorsed by the Altered Carbon rights holders or Foundry Gaming LLC. Users should have lawful access to the original tabletop rules. Do not redistribute licensed source material unless you have the rights to do so.

# Altered Carbon RPG — Unofficial for Foundry VTT v14

An unofficial Foundry VTT v14 game system implementation of the 2020 Altered Carbon RPG rules.

## Current version

**v1.2.1 — GM Access & Duplicate Presentation Fixes**

v1.2.1 includes a generated **Altered Carbon — GM Guide** Journal, a GM Control panel for sending multi-character Skill Check requests directly into chat, a Cold Storage/cyber-noir preset library, and a system-wide futuristic chat presentation with degree-coded outcomes.

## GM operations

- **Altered Carbon — GM Guide** is created automatically for a GM when a world using the system is opened. Its 21 pages walk through character anatomy, Skill Checks, Difficulty, Luck, situational rolls, combat, damage, conditions, gear, economy, Requests, resleeving, Ego, Virtual, variants, vehicles, adversaries, advancement and the Cold Storage preset library.
- **Altered Carbon — GM Control** is available from a GM-only satellite-dish button in Foundry v14 **Token Controls**, from the system settings menu, and through `game.alteredCarbon.openGMControl()` for macros/advanced use.
- The GM can select one or more Character/AI Actors and send a preset or custom Skill Check request.
- The request appears as a futuristic chat card to the selected characters' player owners and the GMs. The eligible player clicks **Roll <Skill>** directly in chat; the system performs the character's real Skill Check and returns the response to the same request group.
- The built-in preset library targets the kinds of checks needed repeatedly in **Cold Storage: The Faces We Left Behind**: investigation, social pressure, infiltration, digital systems, medical/forensic work, physical obstacles, navigation, institutional knowledge and Virtual scenes.

## Graded chat UI

While this system is active, chat messages use the same black-glass/cyan technology language as the character sheets. System Skill Check cards add clear outcome grades:

- Success +1 through +5
- Failure -1 through -5
- Ace
- Stroke of Luck
- Catastrophe

The colors increase in visual urgency while the literal outcome labels remain visible, so color is never the only information channel.

## View-first character sheets

Actor sheets open in read-only mode. Embedded records across the sheet use the same disclosure model: click the record/name or **Open** to inspect it inline. Owners and GMs use **Edit Sheet** to unlock manual fields and embedded-record editors. Singular records such as Traits, Skills, Specialisations, Conditions, Scandals and Networks are deduplicated semantically. Baggage and equipment/gear records also use presentation identities so doubled imports do not appear twice even when mutable state such as Depletion differs.

## Character creation and UI

- Fixed identity/header area with live Stack, Sleeve and Ego state.
- Scroll-safe Actor sheet viewport.
- All six Attributes in a responsive Sleeve-vs-DHF matrix.
- Consistent futuristic panels across every Actor-sheet page.
- Restyled Item sheets, Rules Browser, Combat Console, GM Control, generated GM Guide and chat cards.
- Guided Character Creator: Identity → Archetype → Variant → Sleeve → Attributes → Resources → Review.
- Dynamic Archetype, Variant and Sleeve explanations, Starting Package filtering and AI-specific resource guidance.

### v1.2.1 fixes

- Exact cloned Baggage, equipment, gear, sleeve-history and other embedded records are collapsed in sheet presentation.
- The GM Guide self-refreshes when the installed generated guide is stale.
- GMs can open GM Control from the satellite-dish tool in Token Controls.

## Installation

Use this manifest URL in Foundry VTT / Forge:

`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`

The v1.2.1 manifest downloads:

`https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/v1.2.1/altered-carbon-rpg-v1.2.1.zip`

## Repository structure

The Foundry system lives at the repository root. `system.json` must remain at the root.

The one-shot **Cold Storage: The Faces We Left Behind** remains a separate Foundry module/repository. This system contains only reusable rules/UI plus the GM preset definitions designed to support that module.

## Development checks

Requires Node 22+ for the local test scripts.

- `npm test`
- `npm run validate`
- `npm run build`
- `npm run release:check`

`npm run build` creates a flat Foundry install archive at `dist/altered-carbon-rpg-v1.2.1.zip`.

See `docs/GM-TOOLS.md` for the GM workflow and `docs/RUNTIME-TEST.md` for live Foundry/Forge acceptance checks.

## Foundry v14 architecture

The system uses Foundry v14 `TypeDataModel`, `ActorSheetV2`, `ItemSheetV2`, `HandlebarsApplicationMixin`, `DocumentSheetConfig`, `DialogV2`, JournalEntry pages, and the v14 HTML chat render hook.

## Unofficial project

This is an unofficial fan-made implementation and is not affiliated with or endorsed by the Altered Carbon rights holders or Foundry Gaming LLC. Users should have lawful access to the original tabletop rules.

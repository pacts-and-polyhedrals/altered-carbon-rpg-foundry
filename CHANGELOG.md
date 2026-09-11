# v1.4.2 - Release/update wiring

The release manifest now follows the published Latest asset; version-pinned downloads, standalone manifest generation, checksums, repository-aware preparation, an explicit publisher and public-download verification are supplied. No game data or roll behaviour changes. Local build only; publication and live Foundry/Forge verification are separate.

# v1.4.1 - Bonus Dice, editable preset TR and registry diagnostics

- Added GM multi-character Bonus Dice awards: independent Actor flags, Skill-sized or fixed dice, next matching check or until removed, Skill filters, label, removal and selected clearing.
- Applied awards automatically across the shared Skill roll path; cancelled/blocked/failed dice execution does not spend one-use awards. Added sheet/dialog/chat display and same-client overlapping-roll protection.
- Added editable base TR, TR modifier, Difficulty and Bonus Dice to all 24 presets and custom requests. Added world Save/Reset and immutable request snapshots.
- Preserved selected recipients and input state during panel refresh, and improved narrow-window layout.
- Hardened request response validation and same-client simultaneous response updates.
- Retained real ammunition/drug Item types. Added startup/manual/pre-import registry/version diagnostics; complete manifest/data-model/catalog alignment checks; and single-flight bulk library import.
- The original v1.4.0 ZIP already declared ammunition and drug. This package and restart instructions address potential stale/mixed deployment, without claiming inspection of the user's host or masking errors through type coercion.
- Preserved all data files, adventure journals, advancement and existing character resources. Added GM Guide page 22 and troubleshooting documentation.
- 155 Node tests and 35 mock-browser checks passed. Actual Foundry/Forge verification and release publication remain pending.

# v1.4.0 - Integrated book and advancement

- Integrated all 74 authored Cold Storage journals and 22 generated references, with GM folders, safe update/recovery and explicit handout disclosure.
- Added GM Control/settings book launch; optional module now delegates to the same book importer.
- Replaced Skill-row Open labels with direct Roll controls; moved expanded roll controls above the descriptions.
- Moved Character Creator to the Actors directory/popout; replaced sheet Creator with owned-Actor Level Up.
- Added an eighth creator stage for starting-SP allocation and a full Skills/Attributes/Specialisations/Traits/History advancement window.
- Added ownership, affordability, stale-quote, duplicate-submit, cap and prerequisite checks, rollback handling and dated purchase records.
- Existing Actors/resources/inventory are not rebuilt by advancement or Book Only.
- Fixed AI active-sleeve derived attributes and three bare book chapter links.
- 115 Node tests and 17 mock-browser checks passed. Live Foundry/Forge QA remains pending; no remote release published.

# Changelog

## 1.3.0 — Core Equipment Library, Ammunition, Drugs & Augments

- Added the **Altered Carbon — Core Equipment Library** with 95 structured source-backed Item records: 30 Weapons, 13 Ammunition profiles, 8 Apparel/Armour records, 12 Device/Deck records, 3 Software records, 7 Drug/Medicine records and 22 Sleeve Augmentations.
- Added three Core Vehicle Actor templates: Airbike, Aircar and Ground Car.
- Added a 12-entry generic weapon-upgrade index for the Core weapon chassis.
- Added first-class `ammunition` and `drug` Item types and corresponding Foundry v14 data models/sheets.
- Added stable Core catalog IDs and source-page metadata to prevent system-owned duplicate creation. Re-adding ammunition/drugs increments quantity.
- Added **Core Gear** access from Actor sheets and the Rules Reference, plus GM world-install/create controls.
- Added weapon **Load Ammo** workflow and special-ammunition damage resolution for Armor Piercing, Deadly, target-body modifiers and shotgun range profiles.
- Added Drug **Administer** workflow with quantity consumption, futuristic chat cards and direct automation where the supplied Core rule is unambiguous.
- Added derived-data support for explicit Attribute-changing augments, Speed Neurachem, Subdermal Plating and Bestial Dermis without rewriting stored base Attributes.
- Extended sheet duplicate suppression to ammunition/drug records even when mutable quantity differs.
- Updated **Altered Carbon — GM Guide** to build v1.3.0 with a new **Core Equipment Library** page; existing generated guides migrate automatically.
- Kept the 2020 Core Rulebook as primary authority. The Quick Start-only Reinforced Dermis is not included in the canonical Core catalog.
- Added v1.3 catalog/UI regression coverage and bumped the system to v1.3.0.

## 1.2.1 — Duplicate Guard, Auto-Updating GM Guide & Token Control Access

- Fixed Baggage and equipment clone records rendering twice on character sheets.
- Character-sheet presentation now suppresses literal cloned embedded Items across every page, with stronger Baggage and inventory identities that ignore mutable use-state while preserving genuinely different same-name items.
- Kept stronger semantic duplicate protection for Skills, Traits, Specialisations, Conditions, Scandals and Networks.
- The generated **Altered Carbon — GM Guide** now refreshes automatically when its guide version or generated page count is stale, including journals created before guide-version flags existed.
- Added a new **GM Control & Chat Requests** guide page and updated the quick-start text to explain the Token Controls workflow.
- Added a GM-only **Altered Carbon — GM Control** satellite-dish button to Foundry v14 Token Controls.
- Bumped the system to v1.2.1.

## 1.2.0 — GM Operations, Rules Journal & Graded Chat

- Added the generated **Altered Carbon — GM Guide** Journal. It contains 20 GM-facing pages covering the core play loop, character anatomy, Skills/Target Results, Luck, situational checks, combat, movement/defense, damage/healing, conditions/injuries/scandals, gear/depletion, economy, Requests, sleeves/resleeving, Ego/backups/psychosurgery, Virtual/viruses/AI, variants, vehicles/adversaries, advancement and the Cold Storage preset library.
- The guide is created automatically for a GM when missing and can be opened/refreshed from GM Control. Refreshing replaces only the generated guide pages after explicit confirmation.
- Added **Altered Carbon — GM Control**, a GM-only ApplicationV2 panel for selecting one or more player characters and issuing preset or custom Skill Check requests.
- Added a Cold Storage/cyber-noir preset library for investigation, social, infiltration, technical, physical, movement, knowledge and Virtual checks.
- Added multi-recipient roll-request chat cards. Eligible owners answer by clicking their character's **Roll** button; the system uses that Actor's real Skill Item, rules modifiers and current conditions.
- Returned responses are recorded back into the original request card so a group request becomes a compact live status board.
- Restyled the complete chat stream with the same black-glass/cyan technology language as the character sheets.
- Added semantic result treatments for Success +1 through +5, Failure -1 through -5, Ace, Stroke of Luck and Catastrophe. Outcome labels remain visible in text so color is not the only signal.
- Restyled weapon-use, equipment-use, damage and opposed-check cards to match the new chat language.
- Standardised all chat integration on Foundry v14's `renderChatMessageHTML` hook to avoid duplicate listeners from legacy render hooks.
- Added GM-control, preset, guide, graded-chat and v14-hook regression tests.

## 1.1.2 — Uniform Record UX & Duplicate Guard

- Standardised every embedded record collection on the Actor sheet to the same read-first disclosure interaction: click the record name/row or **Open** to reveal information inline.
- Moved all Item editor triggers into whole-sheet **Edit Mode** only. `Open` never launches an Item editor.
- Applied the disclosure model to current sleeves, Skills, Traits, Specialisations, Baggage, Conditions, Injuries, Scandals, archived sleeves, Relationships, Networks, Evidence, Memories, equipment and Resource Catalog entries.
- Kept gameplay actions such as Skill rolls, weapon use, Depletion and sleeve activation separate from document editing.
- Added presentation-level semantic deduplication for singular record types: Skills, Traits, Specialisations, Conditions, Scandals and Networks.
- Trait duplicates are deduplicated by catalog ID where available, otherwise by name/tree/branch/tier, so duplicated imported Trait documents are never rendered twice on the sheet.
- Repeatable collections such as gear, Baggage, memories, relationships, injuries and sleeve history remain untouched because duplicate names can be legitimate there.
- Added duplicate prevention to the Rules Browser, Character Creator, and Specialisation advancement path so new singular duplicates are not created by system-owned workflows.
- Added regression tests for uniform disclosure behaviour, Edit-Mode-only editing and duplicate suppression.


## 1.1.1 — View-First Records & Edit Mode

- Added an explicit whole-sheet **Edit Mode**. Character sheets now open read-only by default and editable fields are locked until the owner or GM chooses **Edit Sheet**.
- Leaving Edit Mode submits the current form before returning to read-only view; form changes also submit on change while editing.
- Previous Sleeve names now expand their dossier inline instead of opening an Item editor. Expanded dossiers show dates, physical stats, loss/transfer data, appearance, complications and sleeve tags.
- Relationships now expand inline with reveal state, historical identity, incident and recognition clues. GM-only present agendas remain hidden from players.
- Networks now expand inline with organisation, Request Level, Request Bonus, categories and exhaustion state.
- The visible **Open** affordance on Sleeve Archive, Relationships and Networks now means “show information”, never “open the editor”.
- Embedded Item edit controls are hidden outside whole-sheet Edit Mode, and the edit action itself refuses to open if Edit Mode is off.
- Added regression tests for disclosure behaviour and edit-mode locking.

## 1.1.0 — Interface & Onboarding

- Rebuilt the Actor sheet as a futuristic black-glass data interface with a fixed identity header, operational vitals strip and consistent page cards.
- Fixed Actor sheet scrolling by introducing a dedicated flex-safe `ac-sheet-viewport` with `min-height: 0` and vertical overflow.
- Reworked Attributes so all six are always available in a responsive matrix with clear Sleeve/DHF visual distinction and inline explanations.
- Added a seven-stage guided Character Creator: Identity → Archetype → Variant → Sleeve → Attributes → Resources → Review.
- Added dynamic Archetype, Variant and Sleeve guidance, Starting Package filtering, AI-only resource fields and a live review summary.
- Restyled Skills, Traits, sleeve history, relationships, evidence, gear, combat, Item sheets, Rules Browser and Combat Console around one coherent UI system.
- Added a Character Creator shortcut directly to Actor sheets.
- Added static UI contract tests to prevent regressions in scrolling and wizard structure.

## 1.0.0 — Initial clean system release

- Initial Foundry VTT v14 standalone game system release.
- Core 2020 rules chassis, 32 Skills, Traits, Baggage, sleeves, resleeving, combat, equipment/depletion, networks/requests, Virtual, variants and supporting tools.

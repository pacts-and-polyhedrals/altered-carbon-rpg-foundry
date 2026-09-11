# Changelog

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

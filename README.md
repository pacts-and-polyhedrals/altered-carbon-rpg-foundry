# Altered Carbon RPG - Unofficial for Foundry VTT 14

## v1.4.0 - Journal book, direct Skill rolls and advancement

Based on the user's v1.3.0 system. Requires lawful access to the original tabletop rules. Not affiliated with or endorsed by the Altered Carbon rights holders or Foundry Gaming LLC.

The complete Cold Storage book is embedded in `data/cold-storage`, with a GM-only importer and running console. Roll now replaces Open on collapsed Skill rows. Character Creator lives in the Actors directory; existing characters get Level Up instead. The eight-stage creator includes starting SP allocation, and the full advancement window handles Skills, Attributes, Specialisations and Traits with cost confirmation and history.

Read **START-HERE.md** for installation, safe upgrades and the exact control locations. Read **QA-REPORT.md** for the limits of validation. A live Foundry/Forge test is still required before using this build in production.

## Preserved from v1.3.0

The Core Equipment Library and its catalog records, ammunition workflow, drug/medicine actions, sleeve augmentations, GM Control, read-first sheets, opposed checks, source rules engine and original documentation remain present. This release does not replace those systems with a new ruleset.

The unchanged adventure JSON contains the full authored book and original pregen/contact/sleeve/relationship data. The system's Book Only importer creates only Journals and Journal folders and fills missing scene links; the separate optional module supplies fresh-world Actors, Items and Scenes.

## Development

```sh
npm test
npm run validate
npm run build
node scripts/verify-release.mjs
```

Node 22 or later is expected. The runtime has no added third-party dependencies. Foundry supplies its normal application, document and Handlebars APIs. The install ZIP has `system.json` at its root.

The stable manifest/release URLs refer to the user's existing repository publishing scheme. They are intended deployment addresses, not evidence that this locally prepared release has been published. No remote repository or live world was modified.

## Documentation

START-HERE.md explains user workflows. docs/ADVANCEMENT.md covers costs, caps and API options. docs/live-qa.md is the pre-session checklist. docs/TECHNICAL-SOURCES.md records the API references consulted. docs/CORE-EQUIPMENT.md, docs/GM-TOOLS.md and docs/RUNTIME-TEST.md retain the earlier subsystem guidance. docs/archive contains the historical v1.3.0 README/start guide, whose old UI instructions are superseded by this release.

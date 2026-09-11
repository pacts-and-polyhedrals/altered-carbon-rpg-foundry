# Foundry v14 packaging/API check

The v1.0.0 rebuild was reviewed against the current Foundry v14 documentation for:

- `system.json` at package root
- stable `manifest` URL
- public ZIP `download` URL
- `TypeDataModel` registration through `CONFIG.Actor.dataModels` / `CONFIG.Item.dataModels`
- `ActorSheetV2` and `ItemSheetV2`
- `HandlebarsApplicationMixin`
- `DocumentSheetConfig.registerSheet`
- `DialogV2`

Static and unit validation cannot replace an actual Foundry client/server runtime test. After first installation, create a test world and perform the runtime checklist in `docs/RUNTIME-TEST.md`.

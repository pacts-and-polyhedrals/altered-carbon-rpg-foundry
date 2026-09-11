# Foundry v14 packaging/API check — v1.3.0

The system source and release packaging are statically checked for:

- `system.json` at package root;
- stable `manifest` URL and versioned public ZIP `download` URL;
- `TypeDataModel` registration through `CONFIG.Actor.dataModels` / `CONFIG.Item.dataModels`;
- `ActorSheetV2` and `ItemSheetV2`;
- `HandlebarsApplicationMixin` / `ApplicationV2`;
- `DocumentSheetConfig.registerSheet`;
- `DialogV2`;
- JournalEntry page generation and migration;
- the Foundry v14 `renderChatMessageHTML` hook;
- new v1.3.0 `ammunition` and `drug` Item data models;
- Core Equipment Library world/Actor creation paths.

Static and unit validation cannot replace an actual Foundry client/server runtime test. After installation, create a disposable test world and complete `docs/RUNTIME-TEST.md` before treating the release as live-runtime certified.

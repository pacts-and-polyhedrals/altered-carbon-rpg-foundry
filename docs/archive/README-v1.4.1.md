# Altered Carbon RPG - Unofficial for Foundry VTT 14

## v1.4.1 - Assignable Bonus Dice, editable preset TR and installation checks

Continues the supplied v1.4.0 system and the user's v1.3.0 project. Requires lawful access to the original tabletop rules. Not affiliated with or endorsed by the Altered Carbon rights holders or Foundry Gaming LLC.

GM Control now assigns independent Bonus Dice awards to one or more selected characters. Awards can apply to the next matching check or last until removed, with a chosen Skill or any Skill. All 24 presets have editable base TR, TR modifier, Difficulty and Bonus Dice, plus Send, Save and Reset. The saved preset belongs to this world; sending snapshots the current controls.

The complete package declares and registers the original ammunition and drug Item types. New startup, panel and import checks detect a stale/mixed installation before a Core Library batch can repeatedly fail. These checks do not patch the server's type registry from a browser. Read START-HERE.md before replacing your system: the complete system folder and a game/server restart are important.

## Retained

The 96-entry Cold Storage journal book, direct Skill Roll buttons, Actors-sidebar Character Creator, existing-sheet Level Up, eight-stage creator, Core Equipment Library, ammunition/drug actions, source rules engine, adventure data and original character relationships are retained. This update does not rebuild existing characters or require a Cold Storage Full Import.

## Development and validation

```sh
npm run release:check
python qa-browser/run.py
```

The release command runs Node tests, validates JSON/manifests/data-model registrations, builds the installation ZIP and verifies its contents. The optional browser command requires Python Playwright and Chromium in the development environment. It uses mocked Foundry APIs and a QA-only subset template renderer, not a live Foundry world. Node 22 or later is expected for development. The runtime has no added third-party dependencies.

Read QA-REPORT.md for completed checks and limitations. Live Foundry/Forge verification remains pending. Manifest URLs preserve the user's intended repository publishing scheme; no release has been published and no live world has been changed. The install ZIP has system.json at its root.

## Documentation

START-HERE.md covers deployment and the controls. docs/GM-TOOLS.md explains awards and requests. docs/ITEM-TYPE-TROUBLESHOOTING.md addresses the reported ammunition/drug error. docs/ADVANCEMENT.md covers SP progression. docs/live-qa.md is the pre-session checklist. docs/TECHNICAL-SOURCES.md records the official API references. Earlier subsystem documents remain available; docs/archive contains superseded historical instructions.

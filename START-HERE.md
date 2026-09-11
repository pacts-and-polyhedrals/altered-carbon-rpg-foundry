# Altered Carbon 1.4.0 - Start Here

This is the continuation of the supplied UI/system v1.3.0. The complete Cold Storage 1.1.1 journal book is now embedded in the system. The optional Cold Storage module is included separately for the original pregens, sleeve archives, contacts, relationships and placeholder scenes.

## Choose the right ZIP

- `01-FOUNDRY-INSTALL-altered-carbon-rpg-v1.4.0.zip`: the actual system installation package, with system.json at its root.
- `00-GITHUB-REPOSITORY-altered-carbon-rpg-foundry-v1.4.0.zip`: repository source, tests, build scripts and documentation. This is not the installation ZIP.
- `02-OPTIONAL-MODULE-cold-storage-v1.1.1.zip`: the optional adventure module, with module.json at its root.
- `03-READY-FOLDERS/`: extracted `systems/altered-carbon-rpg/` and `modules/cold-storage/` directories for a manual data-folder installation. Use these OR the matching install ZIPs, not duplicate installations.

The manifest retains the existing repository's intended v1.4.0 release URL. No release has been uploaded or published on your behalf. Automatic manifest installation needs the versioned ZIP and matching system.json published to that repository first. A sandbox download is not a hosted Foundry manifest.

## Upgrade an existing world

1. Back up the world and its current system/module folders. Test this release on a duplicate world before using it for a paid session.
2. Stop the world. Replace the existing `systems/altered-carbon-rpg` files with the new system, keeping exactly one system folder of that name. Do not place the repository ZIP inside it. For a managed host, use its custom-system deployment workflow or publish the matching release through your existing repository workflow.
3. The optional module may be replaced with 1.1.1 in `modules/cold-storage`; it is not required just to use the new journal book. Restart and refresh the client.
4. Open **GM Control -> Cold Storage Book -> Import / Update Book Only**. Alternatively use the system settings menu **Cold Storage Adventure Book**.
5. Check a player account, a character sheet and the Actors sidebar using `docs/live-qa.md` before the next session.

**Do not use Full Import in a played world to update its book.** The optional module's Full Import is for a fresh setup and can rebuild source-managed pregen data. Book Only leaves Actors, Items, resources, inventory and relationship states untouched. It fills a missing scene-to-journal link only; it does not replace a custom link or scene art.

## Where the controls are

**Actors tab / sidebar:** Character Creator creates a new Actor. The same button is added to its popout. It is shown to GMs and users with Actor-creation permission. It is not injected into character sheets.

**Existing character sheet:** Level Up opens that Actor's advancement window. It does not create another Actor or resleeve the character. It is available to owners and GMs on character, AI and NPC sheets. Vehicles/threat-only records do not receive this progression control.

**Skills tab:** every Skill row has Roll in its collapsed summary, replacing Open. Clicking Roll opens the existing check-options dialog without expanding the description. Click the Skill name/chevron to read the rules. Roll and Opposed Roll are also at the top of an expanded Skill, before its text. Other record types retain Open because they are not Skill checks.

**Character Creator:** stage 7 of 8 is Level Up & Starting SP. Queue Skill Levels or rolled Attribute increases, see the starting/planned/remaining SP, remove purchases or clear the plan. Purchases are applied once after the new Actor is created. The checked option opens the full Level Up window for Traits, Specialisations and further purchases. Stage 8 reviews the final allocation. No dice are rolled while simply planning.

**Level Up window:** Skills, Attributes, Specialisations, Traits and History. Confirmed purchases deduct the quoted SP and append a dated history entry. Cancelling costs nothing. Physical increases update the active sleeve; mental increases update the persistent DHF. Existing Health/Ego are not rerolled or refilled.

This uses the supplied system's Stack Point advancement, not a newly invented numbered-level/XP system. Trait prose, choice-based benefits and cap-changing Traits still require GM adjudication. For advanced configuration see `docs/ADVANCEMENT.md`.

## Journal folders

The GM imports the book explicitly; it is not automatically inserted on world startup.

```
Cold Storage
  01 - GM Adventure Book
  02 - Player Briefing
  03 - Private Character Cards
  04 - Evidence - Reveal Individually
  05 - GM Reference
  99 - GM Recovery Copies
```

The book contains 74 authored entries plus 22 generated reference entries: 96 managed Journals. This includes 30 GM chapters, 16 evidence handouts and 8 private character cards. Existing matching source IDs are updated in place, including entries imported by an earlier Cold Storage module. Their Journal IDs and external links are retained.

Public primers receive read permission. GM entries and undisclosed handouts/cards begin hidden. Private cards require a named player recipient; the console rejects reveal-to-everyone for those cards. The importer preserves intentional disclosure on already-migrated cards/handouts. Review player ownership before sending evidence.

Changed managed pages are copied into GM-only Recovery Copies before replacement. Additional custom pages are preserved. Recovery is a convenience, not a replacement for a world backup. Only source-managed journals are updated; unrelated folders and journals are left alone.

## Test status

115 Node automated checks and 17 Chromium harness checks passed. The browser harness uses mock Foundry APIs and a QA-only subset template renderer, not Foundry's full Handlebars/runtime. The actual Foundry 14 server, a live world, multiplayer sync, popout windows and Forge were not tested here. The manifest targets minimum Foundry 14 but deliberately omits a live-verified claim. See QA-REPORT.md and docs/live-qa.md.

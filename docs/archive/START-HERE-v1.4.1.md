# Altered Carbon 1.4.1 - Start Here

This is the complete update to v1.4.0, not a patch of individual JavaScript files. It retains the integrated Cold Storage book and character creation/advancement changes. The optional Cold Storage module remains v1.1.1 and is unchanged.

## Choose the right ZIP

- `01-FOUNDRY-INSTALL-altered-carbon-rpg-v1.4.1.zip`: actual system installation package; system.json is at its root.
- `00-GITHUB-REPOSITORY-altered-carbon-rpg-foundry-v1.4.1.zip`: source, tests, build scripts and documentation; not the system install ZIP.
- `02-OPTIONAL-MODULE-cold-storage-v1.1.1.zip`: optional fresh-world adventure setup; not required for Bonus Dice or the integrated journal book.
- `03-READY-FOLDERS/`: extracted `systems/altered-carbon-rpg/` and `modules/cold-storage/` folders for a supported manual data-folder installation.

Use either the correct runtime ZIP or its extracted system folder, not duplicate installations. Root system.json is also included as a publishing reference. The versioned GitHub URLs are intended deployment targets, not published releases. No remote repository or live world was modified. A sandbox file link is not a hosted Foundry manifest.

## Upgrade and repair the reported Item-type errors

1. Back up the world and current system folder. Try the update on a duplicate world first, especially before a paid session.
2. Stop the game/server through your host's supported controls. Replace the complete `systems/altered-carbon-rpg/` folder with this version, including **system.json**, the entrypoint, module, data, templates, styles and lang. Keep one system folder, not a nested duplicate. Updating only module/scripts cannot update the server's type declarations.
3. Restart the game/server so it loads the new manifest. Have every connected browser reload/reconnect. On a managed host, use its supported custom-system deployment and restart process; changing a local copy alone does not change the hosted system.
4. Open **GM Control -> System Check**. Both loaded and running code versions should be 1.4.1, and all Core Item types should be registered. A mismatch should be resolved before importing. The check reports the details; it does not silently rewrite the server registry.
5. Open **Core Gear / Core Equipment Library -> Install Missing Records to World** to create records that the earlier batch could not create. Existing catalog-ID-matched records are kept. Multiple overlapping clicks are guarded. Verify that one Ammunition and one Drug record can be created and opened, then test their normal workflows.

The supplied v1.4.0 source AND runtime ZIP already declared ammunition and drug. The user's console log establishes that their running Foundry instance rejected those types, but does not establish why. A stale/mixed system installation is a plausible cause, not a confirmed inspection of the host. The complete manifest plus a restart addresses that mismatch; the new safeguards stop a known-bad library import before its repeated writes. There is no forced conversion of ammunition/drug data to generic equipment and no deletion of existing Items.

If System Check is healthy but creation still fails, retain the fresh check output and first full exception, and test a backed-up duplicate world with unrelated modules disabled. Do not delete characters or strip their inventory to work around a type-registration error. See docs/ITEM-TYPE-TROUBLESHOOTING.md.

**No character recreation and no Cold Storage reimport are needed for this update.** If the book is not yet imported, use **GM Control -> Cold Storage Book -> Import / Update Book Only**. Never run the optional module's Full Import just to update a played world's book. The GM Guide refreshes its generated pages with the new control instructions; extra unflagged notes are retained, but back up edits to generated pages.

## Bonus Dice: award now, roll later

Open GM Control, select one or more characters in the left rail, then press **Bonus Dice** to reach the award controls. Choose a count from 1 to 10; Match Skill die or a fixed d4/d6/d8/d10/d12/d20; Next matching check or Until removed; any Skill or a named Skill; and an optional reason. Press **Assign Bonus Dice**.

Each selected Actor gets its own award. One character using theirs does not spend another character's. Next-check awards are spent after the relevant check resolves, including a failed check; opening/cancelling a dialog or a blocked/failed dice execution does not spend them. Until-removed awards persist until the GM removes them. Multiple matching awards add together. Up to 20 awards can be active on one Actor.

Awards live on the Actor, not the User: a player with multiple characters receives the award on each selected character only. They are saved as Actor flags. The sheet announces active awards and roll options explain that they are automatic. Do not re-enter them as manual bonus dice. Existing sheet, weapon, opposed and GM-requested Skill checks use the same roll path.

Use **Remove** on one award, or select characters and confirm **Clear Selected Bonuses**. These operations do not alter SP, Luck, Health or Ego. The GM panel retains selected recipients and unsaved field edits when it refreshes. A Refresh Awards button is available.

## Presets: adjustable TR and request-specific dice

Every one of the 24 preset cards now exposes Base TR override, TR modifier (+/-), Difficulty penalty, Bonus Dice count and die size. Custom requests expose the same roll controls.

**Send Request** uses the current fields once. **Save** stores that card's numeric/dice settings for this world. **Reset** removes its saved override and restores the supplied default. Editing/saving a card later does not change an already-sent request.

Leave Base TR blank to use each character's Attribute Bonus. Enter a number to override that base only; zero is valid. The base is not a forced final TR: Difficulty, applicable training/gear, the explicit modifier and condition effects still contribute. Positive TR modifiers make a roll-under check easier. Difficulty subtracts from TR.

`TR = base - Difficulty + applicable training/gear + explicit modifier`, with normal condition rules still applied.

Bonus Dice are additional dice evaluated by the existing best/lowest-roll rules, not a numeric TR increase. Request-specific dice apply to that request only and combine with any matching Actor awards. Match Skill die resolves independently for each character's current effective Skill die.

Example: select two PCs, set a preset's TR modifier to +2 and add one Skill-size Bonus Die, then Send. Each receives that adjustment and their own-sized extra die. Separately awarding each a next-check d6 would add another die when they respond; it is a separate award, not a duplicate representation of the preset die.

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

155 Node tests and 35 Chromium harness checks passed. The browser uses mock Foundry APIs and a QA-only subset template renderer, not the full Foundry runtime/Handlebars engine. No live Foundry 14 server, live multiplayer socket test or Forge deployment was run. The minimum target remains Foundry 14, without an unearned verified claim. See QA-REPORT.md and docs/live-qa.md.

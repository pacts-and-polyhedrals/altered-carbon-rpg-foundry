# Altered Carbon RPG — Unofficial Foundry VTT System

**Current version: v2.4.9** · Foundry VTT v14

Unofficial Foundry VTT implementation of the 2020 Altered Carbon RPG rules. Requires lawful
access to the original tabletop rules. Not affiliated with or endorsed by the Altered Carbon
rights holders or Foundry Gaming LLC.

## Manifest URL

Paste this into Foundry or The Forge under **Game Systems → Install System → Manifest URL**:

```text
https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/latest/download/system.json
```

This link always points to the release marked **Latest**, so **Check for Update** finds every
new version automatically.

Older installs that still use `.../main/system.json` keep working because the `system.json` on
`main` is kept in sync with the latest release. If an install ever looks stuck on an old
version, uninstall it and reinstall from the manifest URL above. Uninstalling a system does
not delete your worlds.

## What's in v2.4.9

- **Speed Dice reveal is reposted** as a new chat card at the bottom of chat, so no one scrolls
  up in a long fight. The old waiting card collapses to a one-line "Revealed below".

## v2.4.8

- **Bay City Maps (Zoned)** compendium: 10 maps in the Cold Storage noir-schematic style — The Neon
  Strip, Rain Alley, BCPD Precinct House, Resleeving Clinic, Meth Spire Penthouse, The Fight Pit,
  Bay Docks, Skyport Landing Deck, Lower Bay Market and Neon Nightclub. Each has numbered zone
  plaques, doors and connectors between zones, cover markers, exits and a title cartouche.
- Scenes are gridless with Altered Carbon zone units and the zone graph already filled in, so
  range and the Zone Assistant work at once. Tokens dropped or moved into a zone are assigned to it
  automatically (setting: *Assign tokens to map zones automatically*).
- Install them with **Install / Update Content** (they are included by default) or import from the
  compendium. Map generator source: `tools/maps/`.

## v2.4.7

- **Speed Dice run the Combat Tracker.** Begin Combat starts a Speed Dice Turn; Roll Initiative
  (single, Roll All, Roll NPCs) rolls Speed Dice privately; after the GM reveals, each combatant's
  Initiative shows the sum of their unspent Active dice and the tracker sorts lowest-first, so the
  highlighted row is who acts. Next Turn moves to the next Active combatant (and opens a new
  selection when Active dice run out); Next Round starts a new Speed Dice Turn.
- **Speed Dice Console** button on the Combat Tracker and on the Speed Dice chat card, and it opens
  for players automatically when a roll or selection phase starts (client setting).
- The console now refreshes live when anyone rolls, locks or spends dice.

## v2.4.6

- **Vehicle tokens** are sized from the vehicle's Size: Size 1 → 1×2 squares (Airbike),
  Size 2 → 2×3 (Ground Car, Aircar), Size 3 → 3×4, and so on. Art is fitted, not stretched.
- **Getting in and out of vehicles:** right-click your token → **Get in a vehicle**, pick a seat
  (Driver / Pilot, Gunner, Operator, Passenger). Your token shrinks into that seat and moves,
  turns and climbs with the vehicle. **Change seat** and **Get out** are on the same menu, and
  on the vehicle sheet's new Seats panel.
- **Who drives:** per vehicle, the player in the Driver seat, the vehicle's AI (GM moves it), or
  both. A seated driver's player can move the vehicle token until they leave the seat.
- **Combat Console fix:** an unclosed tag in its template (present since v2.4.0) stopped it opening.

## v2.4.5

- **Trait checks after rolls:** the private GM Trait card now only appears when an owned Trait
  is tied to the Skill being rolled or the gear being used (Deck Traits only on Deck rolls).
  The card is shorter, says what is already in the roll, and can be silenced per character
  ("Stop showing these Traits"). Setting: *Trait checks after rolls* (Relevant only / Relevant and
  not already automated / Off). A **Traits** button on the GM chat strip lists them on demand.

## v2.4.4

- **Skills tab:** each Skill row has a Roll button, and only the arrow opens the full rules. The rules
  text is laid out as an intro, Specialisation chips, a Difficulty table, Triggered Effects and
  rulebook sidebars instead of one block.

## Earlier in v2.4.x

- **Install / Update Content** (Game Settings or the GM panel): checks for system and module
  updates, installs compendium content into the world, and has an optional tick box to remove
  previous versions first. Player characters are never removed.
- **GM rulings on chat cards:** a GM-only Scandal / Condition / Injury strip on every
  Altered Carbon chat card. Scandals can also deduct IP and add the Scandalized Condition.
- **GM Command Deck:** every GM tool on the GM Control panel, including Combat Console, Zone
  Assistant, Clinical Console, Upgrade Workbench, Core Equipment Library, Rules Reference,
  GM Operations, Adventure Book, Character Creator, Advancement, World Migration and Emblems.
- **Noir emblems:** custom artwork for all 8 adversaries, 3 vehicles, 7 networks, 95 core items
  and 12 weapon upgrades. New documents created from them get their emblem automatically.
  Run `game.alteredCarbon.applyEmblems()` once as GM to update existing world documents.
- **Compendium fix (from v2.4.1):** pack folders no longer use a `.db` suffix, which fixes
  worlds getting stuck while loading on The Forge.

## Compendiums

Core Skills · Core Traits · Core Baggage · Core Conditions and Injuries · Core Scandals ·
Core Equipment (95 Items) · Generic Weapon Upgrades · Core Networks · Core Vehicles ·
Core Adversaries · Player and GM Guides

## Publishing a new release

1. Bump `version` in `system.json`, `BUILD_VERSION` in `module/system-health.mjs` and
   `GUIDE_VERSION` in `module/gm-guide.mjs`. All three must match, or the system health check
   reports an installation mismatch.
2. Update the `download` URL in `system.json` to
   `.../releases/download/vX.Y.Z/altered-carbon-rpg-vX.Y.Z.zip`.
3. Build `altered-carbon-rpg-vX.Y.Z.zip` with the files at the zip root (no wrapper folder).
   Pack folders must not contain `LOCK` or `LOG` files.
4. Create GitHub release `vX.Y.Z`, attach the zip and `system.json`, and mark it **Latest**.
5. Commit the same files, including this README, to `main`.

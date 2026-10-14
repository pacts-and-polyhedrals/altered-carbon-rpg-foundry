# Altered Carbon RPG — Unofficial Foundry VTT System

**Current version: v2.5.3** · Foundry VTT v14

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

## v2.5.3 — Every Bay City exit linked; contact portraits

- **The 10 original Bay City maps are linked.** All 21 exit tags now lead to real places, and each
  link works both ways (19 two-way links). Some pair two original maps: Neon Strip ↔ Rain Alley,
  Meth Spire ↔ Skyport, Fight Pit ↔ Lower Bay Market. The rest lead to **building entrances**
  drawn on Street Atlas blocks: BCPD ↔ Fell Street (front door and garage ramp), Neon Strip ↔ Old
  Downtown South and Dogpatch, Rain Alley, Resleeving Clinic and Nightclub ↔ Mission Street, Fight
  Pit and Lower Bay Market ↔ Licktown, Meth Spire ↔ Old Downtown North, Bay Docks ↔ Dogpatch and
  the Wharf, Skyport ↔ Civic Center.
- Exits are relabelled with their destination (e.g. "EXIT · FELL STREET · BCPD"); street entrances
  read "ENTER · name". Right-click a token at one → **Go to …** (same mechanics as the street exits).
  Bay City scenes already in a world receive the links automatically when a GM loads it.
- **Contact portraits:** noir dossier portraits in the emblem style. The 20 named Cold Storage
  contacts each have their own (also used for NPC actors with those names); generated Contacts
  get one of 12 looks for their category (informant, supplier, mercenary). Portraits show on the
  sheet's Contacts list. **Apply Emblems** adds them to existing Contacts.

## v2.5.2 — Bay City Street Atlas (linked car-chase maps)

- **14 linked street maps** in the system's flat noir map style, laid out on real San Francisco
  geography: Golden Gate North and South Span, Psychasec Alcatraz (with causeway), Wharf &
  Causeway, Marina Seawall, Old Downtown North and South, Panhandle West, Fell Street · BCPD,
  Civic Center, Twin Peaks Switchbacks, Mission Street · AI Hotels, Licktown and Dogpatch Docks.
- **Every exit links up.** Roads cross map edges only at fixed positions, so a road leaving one map
  meets the same road on the next. Outer edges are closed: bay and ocean, the city wall, the
  Marin blockade. Each map is 42×27 squares, fully zoned (road segments, junctions such as
  "Fell & Mission", and blocks), gridless with Altered Carbon zone units.
- **Drive to the next map:** at an exit, right-click a token or vehicle → **Drive to …**. Vehicles
  bring their seated riders, combat entries follow, and the owning players are taken along. A
  connecting map not yet in the world is imported automatically.
- **Blank map fix for Foundry v14:** scenes now carry their image on the v14 Level as well as the
  v13 background. Bay City scenes already imported without an image are repaired automatically.
- Compendium: **Bay City Street Atlas (Linked)** (also installed by Install / Update Content).
  Generator: `tools/maps/street_atlas.py`. See `docs/STREET-ATLAS-v2.5.2.md`.

## v2.5.1 — Vehicle convoy synchronization and token-HUD boarding

- **Vehicle and occupants now move as one scene update**, not one after another.
  The vehicle's incoming destination and all PC/NPC seat positions are projected
  before the update is committed; rotation, elevation and resizing follow too.
- **Right-click the vehicle token** → car icon **Board vehicle / choose seat**.
  With several available PC/NPC tokens, choose who is getting in; then choose
  Driver/Pilot, Gunner, Operator or a free Passenger seat. Repeat to board others.
  The vehicle icon no longer vanishes when right-clicking clears token selection.
  Non-owners get a boarding-only right-click popover; no vehicle editing rights are granted.
  Each character token also keeps Get in / Change seat / Get out controls.
- A seated **Driver** can move the vehicle through the active GM's synchronized
  movement request; the AI-control setting and existing owner permissions apply.
  Other riders cannot independently drag their own tokens away from the car.
- Existing vehicle, passenger, crew and seat flags are preserved. **No world
  migration** or Cold Storage reimport is required.
- See `docs/VEHICLE-BOARDING-v2.5.1.md` for instructions, limits and test checklist.

## What's in v2.5.0

- Standard-ammunition attacks no longer stop after the Check. Attack cards show Hit state,
  natural-1 Ace, target responses and Damage controls. Ordinary weapon attacks spend selected
  Active Speed Dice; reserve dice are available for defensive Saves.
- Firearms/Directed Energy Ace damage, Brawl/Melee Ace Speed Dice, Accuracy Save penalties,
  complete repeated Damage formulas, Catastrophe precedence and compound formulas are corrected.
- Current HP, Wounds, EP, SP and IP are editable while the sheet is locked. Base totals,
  Attributes and descriptors require Edit Sheet; active Sleeve base edits now persist.
- Named conditions have Clear controls. Creator is removed from existing actor sheets.
- A twelve-page public Player Character Sheet Guide is created automatically and included in
  the Player and GM Guides pack. Open it with Sheet Guide.
- Injury/Dying controls, SP mitigation, reload/exhaustion, rest, Minions and named NPC template
  corrections are included. See docs/AUDIT-v2.5.0.txt for source pages and remaining GM rulings.
- 75 targeted Node regression scenarios pass. These are fixture tests; live Foundry/Forge
  multiplayer certification remains pending. The full printed rules are not claimed automated.

Run the bundled regression scenarios: `node --test tests/*.test.mjs`.
Cold Storage 1.9.0 remains the supplied companion module; this system update does not require
PC reimport. No remote GitHub release is created by this ZIP.

## v2.4.9

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

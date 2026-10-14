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

## v2.7.4 — Bay City Commoners

A new core compendium, **Bay City Commoners**, sits in the GM Library next to the official adversaries. It holds 21 ordinary people for the streets of Bay City:

Street Vendor, Grounder, Dock Worker, Office Clerk, Bartender, Cab Driver, Street Kid, Clinic Orderly, Security Guard, Shopkeeper, Neo-C Priest, Newsfeed Journalist, Courier, Mechanic, Aerium Party Guest, Bouncer, Pickpocket, Street User, Pleasure-House Host, Quellist Activist and Back-Alley Stack Tech.

- **Ready to roll.** Each is a Threat built by the system's own Chapter 7 adversary builder: ordinary Attributes (25–50), all 32 Skills with professional bonuses (a Cab Driver's Pilot, a Bartender's Read Person, a Stack Tech's Medicine), Health, Ego and Speed Dice, and Core gear where it fits.
- **Behaviour.** GM notes say how each one behaves. Fifteen are non-combatants who avoid fights and call for help. Dock Workers, Security Guards, Bouncers, Grounders, Street Kids, Vendors, Pickpockets and Activists have a **minion** option for running crowds.
- **Tokens.** Each has its own top-down token in the same style as the vehicles and the named NPCs. Any world NPC you give one of these names, such as "Bartender", picks up the matching token.

## v2.7.3 — Pregens and NPCs kept apart

- The Butterfly Cut's characters are now **two compendiums**: *One-Shot: The Butterfly Cut — Pregens (Player Characters)* with the eight pregens, and *One-Shot: The Butterfly Cut — NPCs* with the eighteen NPCs and threats. They import into two separate world folders.
- **Upgrading.** Worlds set up with v2.7.0–2.7.2 are sorted when you press **Set up The Butterfly Cut** again. Existing copies are moved into the right folder and re-pointed at the new compendium, not imported a second time.
- Every link to a pregen or NPC in the GM book points at its new compendium.

## v2.7.2 — Vision on for every PC

- Every player character and AI character Actor has **token vision** switched on. New ones get it when they are created, along with a linked, friendly token unless the creator chose otherwise. Existing ones, including Cold Storage pregens and their tokens already on scenes, are switched on automatically when the GM loads the world. A PC token dragged from an older Actor gets vision as it is placed.
- NPCs and threats are not changed.
- The Bay City maps keep global light, so nothing goes dark. Vision matters when you turn on Token Vision or fog for a scene. `game.alteredCarbon.enablePCVision()` runs the fix again by hand.

## v2.7.1 — Live case-file journals

The system's own journals now look and work like the Cold Storage book: a dark teal case-file window, a monospace kicker line, read-aloud boxes, typed evidence handouts, and live text throughout.

- **Everything links.** Every person, place, thread, handout and NPC in *The Butterfly Cut* GM book is a link: 1,169 links in 134 pages, all checked at build time. Every page about a map has an **Open map** chip (210 of them). The chip imports the map if needed; shift-click activates it for everyone.
- **Skill chips.** Each Check is a chip, 52 in total. For the GM, clicking a Skill opens GM Control with the Skill, Difficulty and a player-safe prompt filled in. Players see a plain chip.
- **Show to players.** Evidence handouts and pregen handouts have a **Show to players** chip.
- **Night Console.** A live page that tracks the hour from 21:00 to 05:00. **Advance one hour** whispers you that hour's event, or a near miss if the players prevented it. Mark events prevented as play goes and tick the pressure points; the console shows the score and the matching ending.
- **The Bay City Travel Directory** uses the same format. Every "leads to" is a link to that map's page, with an Open map chip (355 links, 436 chips).
- **World copies link to world copies.** After any install or one-shot set-up, compendium links in these journals are pointed at the imported world documents.
- **Upgrading from v2.7.0.** Press **Set up The Butterfly Cut** again. Old copies of the book are replaced, and their case pins are replaced too. For the Directory, run Install Content with **Remove previous versions first**.
- The GM Guide and Player Guide open in the same teal window.

## v2.7.0 — One-shot: The Butterfly Cut

A complete **sandbox one-shot** inside the system, 4–5 hours, for 4–6 players. It is set in Bay City in 2384, in the same weeks as *Cold Storage*, and starts in Licktown. Neither needs the other.

**The story.** A storm knocks out the Seawall Pumps. The emergency power diversion browns out Dogpatch, and a crane at the Crane Yard drops a sealed Psychasec container bound for Alcatraz. Its forty skimmed vials of *Halcyon-7* are cut into Merge, and a new drug, **Flutter**, hits Licktown. Users go *glassed*: the sleeve lives on, empty, while the person is trapped awake in their stack. Clinics are selling the empty sleeves. Psychasec wants its compound back, and someone above BCPD wants the case closed. Each pregen is one of the dominoes without knowing it.

- **A web of 81 places.** Every street map (14), building map (10) and place map (57) has a page: its role, the scene, the mission, Checks, who is there, clues leading to other places, which places point to it, handouts, and what happens if nobody comes. The test suite checks that every place is reachable from Licktown and that every building is pointed to by a clue (227 in all).
- **Eight threads, one per pregen:** The Cook, The Glassed Officer, Halcyon-7, The Paper Trail, The Street Trade, Deep Cover, The Glassed Heir and The Signal. They cross at shared places on the case-web board.
- **The night moves on its own.** A clock from 21:00 to 05:00 fires an event each hour unless the players have prevented it, from Psychasec raiding the fence to the second batch hitting the Opera House gala. At dawn, five pressure points decide the ending.
- **Eight pregens, built with the Core rules:** age resources, archetype Skill tables, package traits and gear (with the package choices made), Baggage, sleeves and a few signature Skills. Each has a hook, a goal, starting leads and a secret *personal domino*. Eighteen NPCs, including three threats built on the official adversary baselines. Everyone has their own top-down token.
- **GM book** compendium (20 journals, 134 pages): Start Here, How to Run, the opening scene, the clock, endings, the chain of dominoes, a case-web board, the threads, one journal per district, NPCs, pregen handouts, ten evidence handouts and Cold Storage crossover notes.
- **Case pins.** In **Install / Update Content**, **Set up The Butterfly Cut** imports the book and the characters and places a GM-only pin on every Bay City map in the world: one per place, on its own block, opening that place's page. Maps imported later are pinned automatically. **Place case pins** and **Remove case pins** are there too, or use `game.alteredCarbon.OneShot.placePins()`.
- The ordinary content install no longer imports the one-shot compendiums by default.

## v2.6.2 — Tokens drive forwards, scaled road grid, mounted weapons

- **Tokens face the right way.** Foundry turns a moving token so its *bottom* edge leads. All top-down vehicle art (the 23 street vehicles, the police light variants, and new tokens for the core Airbike, Aircar and Ground Car) now faces down, so BCPD cars and bikes, and every other vehicle, drive forwards. Character tokens were turned the same way. Text on tokens (BCPD, TAXI, name plates) still reads upright. Seat positions inside vehicles were turned to match, so the driver sits at the front.
- **Token colours match the art.** Vehicle badges (sheet pictures) now use the same body colour as the vehicle's token. Ring colours on named character tokens match their portraits: each pregen has their own colour, benefactors are gold and adversaries red.
- **Existing worlds:** token images keep the same file names, so tokens already on scenes update on reload (refresh the browser if one looks unchanged). Run **Apply Emblems** to move core vehicles that still show their badge onto the new top-down art.
- **Road maps use a 71 px grid,** taken from your Dogpatch Docks scene, so vehicles, bikes and characters are to scale against the streets. This applies to all 14 street maps in the compendium. Street scenes already in a world that still use the old 100 px grid are switched automatically; any other grid you set yourself is left alone. Buildings, places and the overview keep 100 px.
- **Mounted vehicle weapons.** A vehicle's Weapon Items can be fired by whoever sits in a Gunner seat. Use **Fire** on the new **Weapons** panel of the vehicle sheet, or right-click the vehicle (or the gunner) and click the crosshairs. The option only appears while the gun is manned, and only for the gunner's player or the GM. Target first. The attack is the gunner's own weapon Skill Check through the normal Tactical Attack dialog, with the vehicle's **Fire Control** filled in as a Gear Bonus. Fire Control drops by 1 for each lost Structure. If the gunner's player does not own the vehicle, the GM applies the weapon's Depletion for them. GMs and owners can **Reload** from the panel.
- **CTAC Rhino** now carries a **Roof Turret Railgun** (Firearms, 2d10 Piercing, Armor Piercing, Accuracy 1, Capacity 60). Rhinos already in a world get it fitted automatically the first time the gunner fires, or with **Fit the roof turret now** on the sheet.

## v2.6.1 — Overview pins fixed; tokens for pregens, benefactors and adversaries

- **Overview pins:** the pink Cold Storage pins now sit in the middle of each building's own block, with its name above. They used to sit on the road strip in front of the entrance. The whole block counts as the travel spot. Where two buildings share a block (the Resurrection Ward and the Breach), their pins are spread apart and the labels stacked.
- **Stale pins:** pins and entrance labels already in a world are redrawn whenever their position or text changes. Worlds that had the v2.5.8 pins get them moved automatically on the next GM load.
- **Named top-down tokens** for the Cold Storage pregens (Nia Calder, Tomas "Latch" Araya, Sabine Kade, Imani Voss, Cass Ren, Dr Edda Sorn, Anik Rao, Solenne Pryce), the three benefactors (Dr Adria Sen, Magistrate Severin Holt, Director Oren Thale) and the Cold Storage adversaries (Recovery Dipper, Retrieval Hitman, Compromised Protectorate Officer, Black-Recovery Praetorian), alongside the eight official adversaries. Names match regardless of quotes or capitals. These replace the module's own token art for those characters when they are created, or when you run **Apply Emblems**. Tokens you set yourself are never touched.

## v2.6.0 — Open-world Bay City: a map for every place, every exit linked

**One name everywhere.** Every street block with an entrance now carries exactly the name of the map it opens into, for example *The Fight Pit*, *Lower Bay Market*, *Skyport Landing Deck* and *Resleeving Clinic*. A second entrance to the same map is named *Map · entrance*, for example *Resleeving Clinic · Fire Stair* or *BCPD Precinct House · Garage*. Exit tags inside a building name the exact street section you come out on (*FELL 1 · GARAGE*, *16TH EAST*). Exits into another building name that building.

**A map for every place.** 57 new zoned maps in the new **Bay City Places (Sandbox)** compendium cover every named place that had none, from the Golden Gate stacks, Fort Point and the Psychasec Cellhouse to the Opera House, the Maglev Station, Sutro Mast, Dolores Chapel, the Chop Shops and the Scrapyard. They are drawn in the same noir style and laid out by kind (habs, markets, offices, vaults, ruins, parks, plazas, yards, stations, checkpoints, forts, industrial, docks, towers, lighthouse, chapel, theatre, cells, garages, black clinics, camps, reservoir, sea wall). Each has a front exit, and a back exit where its block faces two streets. Both lead to entrances drawn on the street map.

**Every exit linked.** 95 maps and 308 links are checked by the test suite: 14 street maps, the overview, 10 original buildings, 57 places, and the Cold Storage maps when that module is active. Every link lands inside a zone, and every entrance has a way back to the same spot. The memory maps now connect through Palimpsest Virtuality.

**Bay City Travel Directory.** A new JournalEntry compendium lists, for every map, each exit tag, the zone it is in, the map it leads to and the zone you arrive in. There is one journal per district (street map plus every building on it), an index with the rules, and a Cold Storage journal.

**Party at an exit.** When every player character on a map is gathered at an exit, the GM gets a dialog with one button per destination (*map — arrive: zone*). Choosing one moves the whole party together and changes the scene for everyone. Characters seated in a vehicle go with it. Going into a building, they get out and walk in, and the vehicle is parked at that building's street entrance. *Walk into buildings automatically* is now off by default; turn it on to send characters through one at a time.

**Top-down character tokens.** Characters, NPCs, threats and AIs get directly top-down tokens in the vehicle style. The official adversaries (Hitman, Thug, BCPD Officer, CTAC Praetorian, Meth, Dipper, Freak, Corporate Stooge) have their own. AIs are holograms, and everyone else gets one of 36 looks chosen by name. New Actors get theirs automatically. **Apply Emblems** updates existing Actors and tokens already on scenes, wherever the token is still stock art or a system badge.

**Cold Storage** buildings now have their own named blocks: the Rainline, the Quiet Archive, Blue Lotus, Relay Seventeen, the Resurrection Ward, Anansi House and the Spire. The master overview and street maps have been redrawn to match.

## v2.5.8 — Cold Storage on the master overview map

With the Cold Storage module active, the **Bay City Overview · All Districts** scene also shows every Cold Storage building: a glowing pin at its exact spot on the scaled-down district, with its name beside it. Labels are placed so they stay inside their district and never overlap each other. Put a token on a pin and the travel list opens with *Outside <building>* already selected. Elsewhere in a district, it still opens on that district's main junction. Without the module, the overview is unchanged.

## v2.5.7 — Cold Storage on the Bay City streets; walk into buildings

When the **Cold Storage** module (1.9) is active, its buildings stand on the Street Atlas. Each one has an entrance on a street map, labelled *ENTER · name* (the labels are scene Drawings, so the street art is unchanged without the module):

| Cold Storage map | Street map | Block |
|---|---|---|
| The Resurrection Ward | Dogpatch Docks | Crane Yard |
| Breach of Cold Storage | Dogpatch Docks | Crane Yard |
| The Rainline | Licktown | Chop Shops |
| The Quiet Archive | Licktown | North Block |
| Blue Lotus, Black Water | Licktown | Potrero Hill |
| Relay Seventeen | Licktown | South Block |
| Anansi House | Mission Street · AI Hotels | AI Hotel Row |
| Entering the Spire | Civic Center | Protectorate Office |

- **Self-driving cars:** the destination list gains a **Cold Storage** group, *Outside <building>*. The car and everyone in it park on that building's entrance on the right street map.
- **Walking in:** a character who walks into a building entrance (or an exit inside a building) is moved to the next map automatically. Vehicles never drive inside, and arriving in a doorway does not bounce you back. You can turn this off with the world setting *Walk into buildings automatically*. This applies to the original Bay City maps too.
- **Ways out:** each Cold Storage map's street exit (FRONT DESK, RECOVERY VAN, STREET, SERVICE LADDER, CANAL) leads back out to its own entrance. Its other exit tags follow the adventure's routes:
  - Ward corridor → the Breach;
  - Breach → the Rainline;
  - Rainline ↔ Quiet Archive back door and ↔ Relay Seventeen canal;
  - Rainline → Blue Lotus;
  - Blue Lotus canal → Anansi House;
  - Council and Final Operation → the Spire lift lobby.
  
  The Rainline gets a labelled street exit on the canal walk, and the Spire gets a labelled lift up to the Council.
- If a Cold Storage scene is missing from the world, it is installed through the module the first time someone travels to it.
- The memory and virtual maps (Palimpsest Virtuality, the three memory nodes) have no street location, by design.

## v2.5.6 — Vehicle abilities with real mechanics

Each vehicle's unique abilities are listed on its sheet under **Unique abilities**, and each seat shows whether it is *cage*, *load bay* or *exposed*. The abilities work in play:

| Ability | Vehicles | What happens |
|---|---|---|
| Autopilot / self-driving | Bay City Autocab, Meth Stretch Limousine | Driver gets +3 gear on Pilot checks. Anyone aboard can open the **destination list** (token HUD) and the vehicle takes everyone to the chosen junction, entrance or interior. This also works for any vehicle set to AI or Driver and AI. |
| Police kit | BCPD Interceptor, BCPD Pursuit Bike | **Lights and siren** button: lit token art, an animated siren light on the map, and a siren sound everyone hears. While they are on, the driver gets +1 Bonus Die on Pilot checks. **Plate scanner**: target a vehicle and scan it; the result (registered owner) is whispered to you and the GM. |
| Prisoner cage | BCPD Interceptor (rear seats) | A caged rider cannot get out or change seats. **Let someone out of the cage** works for the GM, or for a player whose character is in the front or standing beside the car. |
| Off-road | Hillcrawler Scrambler, Haulback Pickup, Dune Skiff Buggy | No off-road penalty, and the driver gets +1 Bonus Die on Pilot checks while the vehicle is on a block, park or rubble zone. |
| Goes where cars can't / Tiny | Sprocket BMX, Kick-Glide E-Scooter, Bubble Pod | No off-road penalty. |
| Anti-Grav | Airbike, Aircar | No off-road penalty (flies over the grid). |
| *(everyone else off the road)* | | Driver's Pilot checks take +2 Difficulty while the vehicle is on a non-road zone of a Street Atlas map. |
| Exposed seats | All bikes, golf cart, roadster, buggy, pickup bed | Riders can be attacked directly. Riders in **enclosed** seats can only be shot through the body: +2 Difficulty to attacks against them. Targeting a rider tells you which applies. |
| Privacy glass | Meth Stretch Limousine | Attacks against occupants take a further +2 Difficulty. |
| Windowless load bay | Courier Panel Van (rear 3 seats) | Riders in the back take +3 Difficulty on Perception checks and cannot attack out. |
| Silent motor | Kick-Glide E-Scooter | Perception checks made while targeting it or its rider take +2 Difficulty. |
| Folds to carry | Kick-Glide E-Scooter | **Fold up and carry** (empty scooter, with the carrier selected) takes it off the map into the character's hands; **Unfold** puts it back beside them. |
| Open sides | Fairway Runabout | Board from 2 squares away. |
| Roof turret | CTAC Rhino | Gunner seat that uses Fire Control. |

All modifiers appear in the roll card notes. Vehicles already in your world pick up their abilities by name, so they don't need reimporting. Other changes: the Haulback Pickup now has 3 passenger seats (one in the cab, two in the bed) and the Courier Panel Van has 4 (one in front, three in the load bay).

## v2.5.5 — Taxi destinations; vehicles arrive on the new map

- **Fix:** a vehicle and everyone in it now appears on the new map after **Go to …**. Foundry v14 puts every token on a scene Level, and the copies were still tagged with the old map's Level, so they were created but never shown. Transit now puts them on the new map's Level and drops stale region and movement data.
- **Taxi: choose a destination.** Anyone riding in a vehicle its AI drives (the Bay City Autocab, or any vehicle set to *AI* or *Driver and AI*) gets a taxi button on the token HUD. It opens a dropdown of every Bay City destination, grouped by district: each street map's main junction, every building entrance (for example *Mission Street → Outside Clinic Row (Resleeving Clinic)*), and the inside of each original map. The vehicle and all its passengers go there together. The GM can send any vehicle or token anywhere the same way.
- On the **Bay City Overview** the same dropdown replaces the old click-on-a-district jump, with the district under the token selected as the default.
- Ordinary vehicles still cross at exits and entrances with the one-click **Go to …** button, so chases stay on the streets.

## v2.5.4 — Street vehicles for chases; Bay City overview map

**Bay City Street Vehicles (Chase)** is a new compendium in the GM Library with 23 ground vehicles, from a BMX and an e-scooter up to a hubless hyperbike, and from a golf cart up to a supercharged roadster, plus police, cab, van, limousine and CTAC armour for the other side of the chase. Each vehicle has:
- stats on the Core Rulebook scale, with the book's vehicle upgrades named in its Systems text (Improved Engine, Stripped Frame, Reinforced Hull and so on);
- seats generated from its crew and passenger numbers, so boarding, driver/AI control, convoy movement and map-to-map transit all work as they do for the core vehicles;
- a noir emblem for the sheet;
- a top-down token drawn in the map style, sized to its footprint (bikes 1×2, small cars 1.5×2, cars 2×3, vans and pickups 2×4, limousine 2×5, armoured car 3×4). The front of each vehicle is the top edge.

The roster includes these vehicles:

| Vehicle | Class | Size | Token | Speed Dice | Handling | Durability | Structure | Velocity | Seats |
|---|---|---|---|---|---|---|---|---|---|
| Sprocket BMX | Bike | 0 | 1×2 | 1 | 4 | 3 | 1 | 20 ft or 90 degrees | 1 |
| Kick-Glide E-Scooter | Bike | 0 | 1×2 | 1 | 4 | 3 | 1 | 25 ft or 90 degrees | 1 |
| Courier E-Bike | Bike | 0 | 1×2 | 2 | 3 | 5 | 1 | 30 ft or 60 degrees | 1 |
| Vespina Mag-Scoot | Bike | 1 | 1×2 | 2 | 3 | 8 | 2 | 40 ft or 60 degrees | 2 |
| Hillcrawler Scrambler | Bike | 1 | 1×2 | 3 | 4 | 10 | 2 | 50 ft or 60 degrees | 1 |
| Kestrel Street Bike | Bike | 1 | 1×2 | 3 | 3 | 10 | 2 | 60 ft or 45 degrees | 2 |
| Iron Saint Cruiser | Bike | 1 | 1×2 | 3 | 2 | 15 | 3 | 60 ft or 30 degrees | 2 |
| BCPD Pursuit Bike | Bike | 1 | 1×2 | 4 | 3 | 15 | 3 | 70 ft or 45 degrees | 1 |
| Corvo Diavolo Superbike | Bike | 1 | 1×2 | 4 | 4 | 10 | 2 | 80 ft or 45 degrees | 2 |
| Lumen Hubless Hyperbike | Bike | 1 | 1×2 | 5 | 3 | 5 | 1 | 100 ft or 30 degrees | 1 |
| Fairway Runabout | Car | 1 | 1.5×2 | 1 | 2 | 10 | 2 | 20 ft or 60 degrees | 4 |
| Bubble Pod City Car | Car | 1 | 1.5×2 | 2 | 3 | 15 | 2 | 40 ft or 60 degrees | 2 |
| Bay City Autocab | Car | 2 | 2×3 | 2 | 2 | 25 | 3 | 50 ft or 45 degrees | 5 |
| Kitsu Rally Hatch | Car | 2 | 2×3 | 4 | 3 | 25 | 3 | 60 ft or 45 degrees | 4 |
| Haulback Pickup | Car | 2 | 2×4 | 3 | 2 | 35 | 4 | 50 ft or 45 degrees | 4 |
| Courier Panel Van | Car | 3 | 2×4 | 2 | 1 | 35 | 4 | 40 ft or 30 degrees | 5 |
| Revenant V-12 Muscle Car | Car | 2 | 2×3 | 4 | 2 | 35 | 4 | 70 ft or 30 degrees | 4 |
| BCPD Interceptor | Car | 2 | 2×3 | 4 | 3 | 40 | 5 | 70 ft or 45 degrees | 4 |
| Kitsune GT Coupe | Car | 2 | 2×3 | 4 | 4 | 25 | 3 | 80 ft or 45 degrees | 2 |
| Cerberus Supercharged Roadster | Car | 2 | 2×3 | 5 | 3 | 20 | 3 | 90 ft or 30 degrees | 2 |
| Dune Skiff Buggy | Car | 1 | 1.5×2.5 | 3 | 4 | 15 | 2 | 60 ft or 60 degrees | 2 |
| Meth Stretch Limousine | Car | 3 | 2×5 | 2 | 1 | 50 | 5 | 40 ft or 30 degrees | 7 |
| CTAC Rhino Armoured Car | Car | 3 | 3×4 | 2 | 1 | 60 | 7 | 40 ft or 30 degrees | 8 |

**Bay City Overview · All Districts** is a new scene in the Street Atlas compendium. It is an 8400×5400 WebP of all 14 street maps on one sheet, with district plates, road names, a legend and a compass. Each district is a zone. A token standing on a district can use **right-click → Go to …** to travel straight to the junction nearest the middle of that street map.

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

# Bay City Street Atlas — v2.5.2

Fourteen linked street maps for car chases, in the system's flat top-down noir map style.

## Layout (north up, real San Francisco geography)

```
            [GG North Span]           [Psychasec Alcatraz]
                  |                          | causeway
 [GG South Span]—[Marina Seawall]—[Wharf & Causeway]—[Old Downtown N]
       |               |                 ||                ||
 [Panhandle W]===[Fell St · BCPD]===[Civic Center]===[Old Downtown S]
       |               ||                ||                |
 [Twin Peaks]————[Mission St · AI Hotels]===[Licktown]———[Dogpatch Docks]
```
`—`/`|` one road crosses that edge, `=`/`||` two roads.

Streets keep one name across the whole atlas: east–west Embarcadero Hwy (north shore), Fell St and
Oak St (middle row), 16th St and Cesar Chavez St (south row); north–south Presidio Pkwy / Stanyan St,
Mission St / Valencia St, Van Ness Ave / Powell St, Third St / Battery St. The bridge and causeway
are their own roads.

## Edge rule

Maps are 42 × 27 squares (100 px). Roads cross edges only at these slots:

| Edge | Slot | Squares |
|---|---|---|
| north / south | L | x 8–12 |
| north / south | R | x 29–33 |
| north / south | Bridge / Causeway | x 18–24 |
| east / west | U | y 6–10 |
| east / west | D | y 17–21 |

Every exit has a matching exit on the neighbouring map (tested). Outer edges are closed: water
(north, east, west), the city wall (south), the Marin blockade (north end of the bridge).

## Crossing between maps

1. Drive or walk a token into the exit strip at the end of a road (the arrow names the next map).
2. Right-click the token (or the vehicle) → **Drive to …**.
3. The token reappears one square in from the opposite edge of the next map, at the same position
   along the edge. A vehicle brings everyone seated in it, in the same seats.
4. Combat entries follow the moved tokens. A combat linked to the old scene is unlinked so it can
   continue across both maps.
5. Players who own the moved tokens are taken to the new scene. The GM's view only moves if the GM
   made the crossing.

A GM must be connected. A seated passenger asking to cross moves the whole vehicle; only the
vehicle's owner (the driver, while seated) or a GM can make it cross.

## Foundry v14 backgrounds

Foundry v14 stores a scene's image on its Level. The packs now store the image in both the v13 and
v14 places. Bay City scenes imported from earlier versions without an image are repaired when a GM
loads the world (`game.alteredCarbon.repairSceneBackgrounds()` runs it on demand).

## v2.5.3 — original maps linked

Every exit tag on the ten original Bay City maps now leads to a real map and back (19 two-way
links, generator `tools/maps/link_maps.py`). Original-map exits are relabelled with their
destination; Street Atlas blocks show matching **ENTER · …** entrances. The same right-click
**Go to …** button works for street exits, entrances and original-map exits.

| Original map | Exit | Leads to |
|---|---|---|
| The Neon Strip | left / right / down | Old Downtown South (Old Downtown Arcade) · Dogpatch Docks (Dry Dock) · Rain Alley |
| Rain Alley | left / right / up | The Neon Strip · Mission Street (Mural Alley) · Mission Street (AI Hotel Row) |
| BCPD Precinct House | street / garage ramp | Fell Street (BCPD Fell St Precinct) · Fell Street (Patrol Garage) |
| Resleeving Clinic | street / fire stair | Mission Street (Clinic Row) · Mission Street (Taqueria Block) |
| Meth Spire Penthouse | street level / sky bridge | Old Downtown North (Pyramid Tower) · Skyport Landing Deck |
| The Fight Pit | stairs up / service tunnel | Licktown (Fightdrome) · Lower Bay Market |
| Bay Docks | city / boat slips | Dogpatch Docks (Container Piers) · Wharf & Causeway (Ferry Terminal) |
| Skyport Landing Deck | flight lane / concourse | Meth Spire Penthouse · Civic Center (Transit Hub) |
| Lower Bay Market | street / storm drains | Licktown (Licktown Market) · The Fight Pit |
| Neon Nightclub | street / alley door | Mission Street (Night Market) · Mission Street (The Neon Strip) |

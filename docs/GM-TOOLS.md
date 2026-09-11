# GM Operations — v1.2.1

## Altered Carbon — GM Guide

When a GM opens a world using this system, the system looks for a Journal named **Altered Carbon — GM Guide** (or the system flag that identifies it). If it does not exist, the system creates it as a GM-only Journal.

The generated guide contains 21 ordered text pages:

1. Start Here
2. Character Anatomy
3. Skills & Target Results
4. Luck, Bonus Dice & Outcomes
5. Difficulty & Situational Rolls
6. Combat: Intent, Check, Resolution
7. Combat: Movement, Range & Defense
8. Damage, Dying & Healing
9. Conditions & Injuries
10. Gear, Depletion & Weapons
11. Wealth, Credits & Resource Catalogs
12. Contacts, Networks & Requests
13. Sleeves, Resleeving & Continuity
14. Ego, Backups & Psychosurgery
15. Virtual, Viruses & AI
16. Character Variants
17. Vehicles, Minions & Nemeses
18. Advancement & Campaign Rewards
19. Cold Storage Roll Presets
20. GM Quick Checklist
21. GM Control & Chat Requests

The guide is a play-facing walkthrough of the implemented system rules. The separate **Rules Reference** remains the detailed catalog/index for Traits, Baggage, equipment reference pages and source-backed reference material.

### Refreshing the guide

The guide now self-refreshes on GM login whenever its stored generated-guide version or generated-page count is stale. v1.2.0-era guide pages are migrated automatically. From v1.2.1 onward, only pages flagged as system-generated are replaced, so a GM may append their own unflagged campaign-notes pages without causing those notes to be deleted by later guide refreshes.

GM Control also retains a **Refresh Guide** button for a deliberate manual rebuild of the generated pages.

## Altered Carbon — GM Control

With a Scene open, choose **Token Controls** and click the GM-only satellite-dish **Altered Carbon — GM Control** tool. The system configuration menu remains available as a fallback. Advanced users can also call `game.alteredCarbon.openGMControl()` from a macro/console.

The left rail lists Character and AI Actors and their player owners. Select every character who should receive the same check.

### Preset requests

The bundled presets are aimed at **Cold Storage: The Faces We Left Behind** and similar cyber-noir play. They cover recurring investigation, social, infiltration, technical, physical, navigation, institutional and Virtual situations.

Each preset defines:

- a player-facing title;
- the core Skill to roll;
- a default Difficulty;
- a player-facing prompt;
- GM usage guidance shown in GM Control.

The GM may change approach by using the custom request form instead.

### Custom requests

A custom request allows the GM to choose any core Skill, Difficulty, additional TR modifier, a player-facing prompt, a player-facing context note, and the sight-reliant/sight-only flags used by the Dazzled automation.

## What happens in chat

Sending a request creates one whispered request card addressed to:

- every GM; and
- the non-GM owners of the selected Actors.

Each selected Actor gets a separate row. An eligible owner sees **Roll <Skill>** for Actors they own. They cannot answer for Actors they do not own.

Clicking the button performs the real system Skill Check using that Actor's embedded Skill and current rules state. The result is posted to the same recipient group and the original request card is updated with the character's returned result.

A character cannot answer the same request twice after its response is recorded.

## Result grades

System check cards display the literal result plus a visual grade:

| Result | Visual treatment |
| --- | --- |
| Success +1 to +5 | escalating green/cyan/gold success treatment |
| Failure -1 to -5 | escalating amber/orange/red failure treatment |
| Ace | dedicated cyan treatment |
| Stroke of Luck | dedicated gold treatment |
| Catastrophe | dedicated high-urgency red treatment |

The label is always printed as text. Color never carries the outcome by itself.

## Chat shell

While `altered-carbon-rpg` is the active system, ordinary chat messages inherit the same dark glass / cyan data presentation. System-generated checks, requests, attacks, equipment use, damage and opposed checks add richer diagnostic cards inside that shell.

## Permissions / privacy notes

- GM Control is restricted to GMs.
- Roll requests are whispered to the selected Actors' owners plus GMs rather than broadcast to the whole table.
- The preset `gmNote` text is GM-side usage guidance in the panel. It is not automatically used as a hidden secret. The custom **Context note** is explicitly player-facing and appears on the request card.
- If an Actor has no non-GM owner, the GM is warned; the request remains available to GMs.

## Live QA required

The repository tests validate templates, data contracts and code paths, but a real Foundry v14 world is still required to verify rendered Journal styling, chat DOM behavior, user permissions and sockets. Follow `docs/RUNTIME-TEST.md` before calling a release fully runtime-certified.

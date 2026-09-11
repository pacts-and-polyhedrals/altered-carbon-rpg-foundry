# GM Operations — v1.3.0

## Altered Carbon — GM Guide

When a GM opens a world using this system, the system creates or refreshes **Altered Carbon — GM Guide**. Version 1.3.0 contains 22 generated pages:

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
22. Core Equipment Library

The guide self-refreshes on GM login whenever its generated-guide version or generated-page count is stale. Only system-generated pages are replaced on modern guides, so unflagged campaign-note pages appended by the GM remain intact.

## Core Equipment Library

Open the Library from a character sheet with **Core Gear**, from the Rules Reference, or from the system menu. It ships 95 source-backed Item records, 3 Vehicle Actor templates and 12 generic weapon upgrades.

Adding a normal Core Item twice to the same Actor is prevented by its stable catalog ID. Ammunition and drugs are quantity-bearing; adding the same one again increments quantity. **Install Missing Records to World** creates missing Items and Vehicle Actors without overwriting existing records with the same Core catalog IDs.

Weapons expose **Load Ammo** and use the selected special-ammunition profile in their attack/damage workflow. Drug records expose **Administer**, consume doses and post the current effects to chat. Explicit augmentation bonuses participate in derived character data; context-dependent effects remain visible for GM adjudication.

## Altered Carbon — GM Control

With a Scene open, choose **Token Controls** and click the GM-only satellite-dish **Altered Carbon — GM Control** tool. The system menu remains available as a fallback. Advanced users can also call `game.alteredCarbon.openGMControl()`.

The left rail lists Character and AI Actors and their player owners. Select every character who should receive the same check.

### Preset requests

The bundled presets target **Cold Storage: The Faces We Left Behind** and similar cyber-noir play. Each preset defines a player-facing title, core Skill, default Difficulty, player prompt and GM usage guidance. A custom request can instead choose any core Skill, Difficulty, extra TR modifier, player-facing prompt/context, and Dazzled sight flags.

### Chat response flow

A sent request is whispered to every GM and the selected Actors' non-GM owners. Each selected Actor receives a separate row. An eligible owner presses **Roll <Skill>**; the system uses that Actor's actual Skill and current rules state, posts the grade card, then updates the request card with the returned result. Ownership checks prevent a player from answering for another Actor or answering the same request twice.

### Result grades

Success +1 through +5 and Failure -1 through -5 use escalating visual grades. Ace, Stroke of Luck and Catastrophe have dedicated treatments. The literal outcome label is always present, so color is supplemental.

## Permissions and live QA

GM Control and world-library installation are GM-only. Actor owners can add/use Core records on Actors they own through Actor-context workflows. A real Foundry v14 world remains necessary to verify rendering, permissions, sockets and Forge-hosted behavior; follow `docs/RUNTIME-TEST.md` before treating a release as runtime-certified.

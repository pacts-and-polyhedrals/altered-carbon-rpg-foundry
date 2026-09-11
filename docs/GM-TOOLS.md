# GM Operations - v1.4.1

## Open GM Control

Use Token Controls -> Altered Carbon - GM Control with a Scene open, the system settings menu, or `game.alteredCarbon.openGMControl()`. Select the Character/AI Actors in the recipient rail; this is an Actor selection, not a global award to every character owned by a User.

## Assign Bonus Dice

Press Bonus Dice in the header or preset section. Set count (1-10), Skill-sized or fixed d4/d6/d8/d10/d12/d20, duration, Skill scope and reason, then Assign Bonus Dice. Each selected Actor receives an independent keyed flag award. The player owners are notified by a whispered card; inability to post that notification does not trigger a duplicate grant.

Next matching check awards are automatically included and consumed only after the matching check resolves, success or failure. A cancelled, blocked or dice-engine-failed check retains them. Until removed awards remain active. The sheet banner and check dialog display automatic awards; do not also type them into manual extra dice. Actor awards combine with request-specific and other applicable extra dice under the existing roll-under best/lowest rules.

The rail lists each award and its Remove control. Clear Selected Bonuses asks for confirmation and affects only selected Actors. Refresh Awards fetches the current Actor flags. Selected recipients, form inputs and scroll survive panel rerendering. Opening and using the panel requires GM permission; players cannot invoke its grant/remove API as an authorized GM operation.

Use one rolling client per Actor at a time. This implementation prevents overlapping rolls within a client; it does not implement a server-side transaction across simultaneous clients controlling the same Actor.

## Editable presets and custom requests

All 24 presets have Base TR override, TR modifier, Difficulty penalty, Bonus Dice count and die size. Blank base uses each Actor's Attribute Bonus; zero is a valid override. Base is not final TR: normal training/gear and conditions still apply. Positive modifiers make the roll-under check easier; Difficulty subtracts.

Send uses the edited fields once. Save stores the card's numeric/dice override in this world's settings. Reset restores supplied defaults. Saving/sending validates integer values. Requests retain a snapshot and are not changed by subsequent preset edits. Custom requests use the same fields and allow a player-facing prompt/context; those text fields are not secret GM notes.

The request is whispered to GMs and the selected Actors' non-GM owners. Each selected Actor has a response row. Owners or GMs roll using the actual current Skill and rules state. Results include the effective TR, additional dice and ordinary outcome grades. Each character's response is recorded separately. Socket response processing validates the persisted check/author/Actor rather than trusting an arbitrary client result payload.

## Core Library and System Check

The Library still supplies 95 Item records, 3 Vehicle templates and 12 generic weapon upgrades. Install Missing Records to World preserves matched catalog IDs; adding a quantity-bearing ammunition/drug record to an Actor increases its quantity. Explicit augmentation mechanics remain as before.

System Check inspects the loaded build/manifest and registered Core Item types, and attempts to read the installed system.json without caching. Missing ammunition/drug declarations or stale loaded versions stop Core creation before repeated batch errors. The complete system folder must be deployed and the game/server restarted; a browser-only registry patch is not used. See ITEM-TYPE-TROUBLESHOOTING.md.

## Journals

The integrated Cold Storage book remains available from GM Control. There is no new book reimport requirement for 1.4.1. When needed, use Book Only to update existing journals; Full Import belongs to a fresh optional-module setup.

The generated Altered Carbon - GM Guide now has 23 pages (numbered 00-22). The final page explains Bonus Dice, editable presets and system health. Generated guide pages refresh with the new version, while extra unflagged notes remain. Back up edits to generated text before updates.

## Developer entry points

`game.alteredCarbon.diagnoseSystem()` returns a health report. `game.alteredCarbon.BonusDice` exposes grant, get, remove and clear. Award mutators require a GM. These helpers operate on real Actor documents and are not a workaround for server permissions or manifest registration. See module/gm-bonus-dice.mjs for parameter contracts.

Read live-qa.md for pending real-server validation.

# Advancement in 1.4.0

## Stack Points, not invented character levels

The user-facing Level Up window uses the existing rules-engine costs. Skill improvements buy one level at a time (20, 50, 80, 125 SP for successive upgrades, maximum Skill Level 5). Attribute improvements buy one d4 per SP. Specialisation costs follow the existing count progression (15, 20, 25, then 30 SP). Trait costs, branch unlocks and lower-tier prerequisites use the installed rules engine and catalog.

The optional reason field is stored in a dated actor flag history. Purchases do not grant SP, calculate session awards, reset current Health/Ego, replace gear or rebuild relationship records. Award SP through the existing character resource workflow before spending it.

## Safety boundaries

Every purchase rechecks ownership, current SP, owned records and prerequisite state. If those values changed while the confirmation dialog was open, the quote is rejected and must be refreshed. Same-client duplicate submissions are blocked. This is not a distributed database lock: do not have multiple clients spend the same character's SP simultaneously. Embedded updates are restored when a later write fails; a network/server failure during rollback still requires checking the Actor and world backup.

Only the active sleeve's base Strength/Perception are advanced. Mental attributes stay on the Actor. Explicit augmentations continue to derive their own effects through the pre-existing system; the advancement window does not double-add them to the stored bases. Attributes stop at their displayed cap; any excess rolled points are lost and the history records the rolled and actual increase. Budgeting multiple Attribute purchases uses their minimum possible increase; later rolls may leave less room than the original plan. Such a plan can fail rather than overspend a capped Attribute.

The window does not automatically interpret Trait prose. Conditional effects, chosen benefits and cap-altering Traits need the GM to resolve their meaning. This avoids granting arbitrary effects from natural-language descriptions.

## GM configuration

An explicit cap can be saved in `flags.altered-carbon-rpg.advancementCaps`, keyed by Attribute. A tree Commonality can be saved in `flags.altered-carbon-rpg.traitCommonality`, keyed by the exact catalog tree name. The documented values are common, uncommon or anomaly. A civilian tree without a known override must be confirmed in the window; the selected value is then persisted. Other Archetypes follow their installed common/anomaly mapping, with older Praxis handling retained.

Example, run deliberately on the intended Actor as GM (these are configuration examples, not automatic bonuses):

```js
const actor = game.actors.get("YOUR_ACTOR_ID");
if (!game.user.isGM || !actor) throw new Error("Select a valid Actor as GM.");
await actor.update({
  "flags.altered-carbon-rpg.advancementCaps.willpower": 60,
  "flags.altered-carbon-rpg.traitCommonality.Crime": "common"
});
```

## Programmatic launch

```js
game.alteredCarbon.openCharacterCreator();
game.alteredCarbon.openAdvancement(game.actors.get("YOUR_ACTOR_ID"));
game.alteredCarbon.openAdventureBook();
```

An owner or GM may advance a character. Synthetic/token Actors can be passed directly to openAdvancement rather than resolved to a different world Actor. Vehicle/threat records are excluded from the advancement UI.

# Live pre-session QA - pending

Use a backed-up disposable Foundry 14 world and the exact host/browser you use for play. None of these live-world checks is claimed as completed by the offline test suite.

## Installation and core controls

Confirm the system reports 1.4.0 and there are no console startup errors. Reopen an existing world and a fresh world. Verify the existing GM Control, Rules and Core Gear controls still work. Open the Actors sidebar and its popout: there must be one Character Creator button, not duplicates after rerendering. An unprivileged player without ACTOR_CREATE should not see it. Existing sheets must show Level Up, not Character Creator.

## Rolls and creation

On an owned PC, click Roll while its Skill description is closed. Check the options dialog and chat result; the description should remain closed. Cancel once and confirm no roll is posted. Open the description through the name/chevron and check its top Roll/Opposed controls. Confirm an observer cannot spend another character's points.

Run all eight creator stages. Queue/remove a starting Attribute purchase, try an unaffordable Skill, create the character once, and inspect remaining SP, sleeve, all Skills and history. Check a package-bearing character, an AI with explicit resources, and a custom character with no package. Test normal starting character rules separately from GM-authored final allocations.

## Advancement

Record current SP, HP/Ego, attributes, sleeve, gear and relationships. Cancel an improvement; nothing should change. Confirm one Skill purchase, one physical and one mental Attribute increase, a Specialisation, and a permitted Trait. Check exact costs, history, prerequisite rejection and maximum/cap limits. Current Health/Ego and gear/relationships must remain unchanged. Change SP from the GM client while a player has a confirmation open: the stale quote should be rejected. Avoid simultaneous purchases by two clients.

## Book import and permissions

With the optional module disabled, open GM Control -> Cold Storage Book and Import / Update Book Only. Expect 96 source-managed entries, six child folders, and working inter-chapter links. Repeat; there should be no duplicates. In a world with older Cold Storage entries, verify stable Journal IDs and GM recovery copies. Add a custom page, edit a managed page, import again and confirm preservation/recovery.

Log in as a player: public primers are visible, GM chapters are not, and evidence/private cards are hidden until deliberately granted. Reveal one handout, then one private card to only one named player. Confirm the other player cannot read the card. Reimport and confirm intentional disclosure persists. Check player-created notes and extra pages for unintended grants.

With optional module 1.1.1 enabled, confirm both launch paths reach the integrated console and share book state. Check that no source Actors are added/modified by Book Only. Full Import is a fresh-world test only. Check the retained placeholder maps and existing scene links.

## Host and session readiness

Test reloads, reconnects, popouts and multiplayer updates on your actual host. Inspect console errors, owner permissions, style conflicts and other enabled modules. These offline tests do not certify Forge stability, socket behavior, the full Foundry Handlebars renderer or a specific paid-session environment.

# First live Foundry v14 runtime test — v1.3.0

Run this after installing/updating the system in a real Foundry v14 world. Start with third-party modules disabled.

## Package and base sheets

1. Open a world using **Altered Carbon RPG — Unofficial** and confirm there are no Altered Carbon errors during `init`/`ready`.
2. Create/open a Character, NPC and Vehicle Actor and confirm every sheet page scrolls and renders.
3. Confirm the Character sheet opens in View Mode and embedded records edit only after **Edit Sheet**.
4. Deliberately duplicate Baggage, Weapon, Ammunition and Drug Items. Confirm cloned sheet rows collapse while genuinely different same-name weapons remain distinct.
5. Roll a Skill, open Character Creator, Rules Reference, Combat Console and GM Control.

## Core Equipment Library

6. Press **Core Gear** on a Character sheet. Confirm the Library opens and reports **95 Item records, 3 Vehicle Actor templates and 12 generic weapon upgrades**.
7. Search for `NEMEX`, `Lethinol`, `EMP`, `Flak Coat` and `Speed Neurachem`; confirm filters hide/show records without console errors.
8. Add one Weapon, one Ammunition, one Armour, one Equipment, one Software, one Drug and one Augmentation to the Actor. Confirm each appears once on Gear.
9. Add the same non-repeatable Core Weapon again. Confirm it is not duplicated.
10. Add the same Core Ammunition and Drug again. Confirm their quantities increase instead of creating a second embedded row.
11. As GM, create one Core world Item and one Core Vehicle Actor from the Library.
12. In a disposable world, press **Install Missing Records to World** and confirm all missing Core Items and all three Vehicle Actors are created while existing matching catalog records are preserved.

## Ammunition

13. Put a compatible weapon and special ammunition on a test Actor. Press **Load Ammo** and select the ammunition.
14. Use the weapon and confirm the attack card names/reflects the loaded profile.
15. Test an Armor Penetrating profile and confirm the damage card marks Armor Piercing.
16. Test EMP or Plasma ammunition against organic and synthetic/vehicle targets; confirm the correct profile/bonus is used.
17. Test Buckshot in Shared and Adjacent ranges and confirm the range-specific formula is selected.
18. Confirm weapon Capacity/Depletion still operates normally while special ammunition changes the profile rather than creating a second weapon.

## Drugs and augmentations

19. Add Merge, Lethinol, Stallion and Tetrameth. Press **Administer** and confirm one dose is consumed and a futuristic effect card is posted.
20. With Panic present, administer Lethinol and confirm the direct supported Panic-removal behavior works; verify remaining effects are shown for adjudication.
21. Administer Stallion and confirm the Enraged condition is added.
22. Test active Cognition/Combat/Congenial/Military neurachem or Bestial Attribute augments and confirm derived Attribute bonuses change without overwriting the Actor's stored base Attribute values.
23. Test Speed Neurachem, Subdermal Plating and Bestial Dermis and confirm their supported derived effects appear.

## GM Guide migration

24. Log in as GM and confirm **Altered Carbon — GM Guide** exists.
25. Confirm **Start Here** reports generated guide build **v1.3.0**.
26. Confirm the guide contains **22 generated pages**, including **21 — Core Equipment Library**.
27. Upgrade a disposable world from the v1.2.1 guide to v1.3.0 and confirm the generated pages refresh automatically without deleting a custom unflagged notes page.

## GM Control and chat

28. Open a Scene, select **Token Controls**, and confirm the GM-only satellite-dish **Altered Carbon — GM Control** button appears and opens the panel.
29. Log in as a non-GM user and confirm that user does not receive the GM Control tool.
30. Send **Notice the Anomaly** to one player-owned Actor and answer it from the player client. Confirm the real Detection check is rolled and the original request card updates.
31. Send a request to two or more player-owned Actors and confirm each owner can answer only their Actor once.
32. Send a custom check with Difficulty, TR bonus and context; confirm values affect the roll correctly.
33. Generate normal Success/Failure checks and confirm graded futuristic chat remains readable without color as the only signal.
34. Confirm weapon, ammunition, drug, equipment, damage and opposed-check cards share the system chat styling.

If a step fails, capture the first Altered Carbon-related console error, exact Foundry build number, browser/client role and a screenshot of the affected sheet, Journal, control palette or chat card.

# START HERE — Updating the Altered Carbon System to v1.3.0

Repository: **pacts-and-polyhedrals/altered-carbon-rpg-foundry**  
Foundry system ID: **altered-carbon-rpg**  
Version: **1.3.0**

## What changed

v1.3.0 adds the source-backed **Core Equipment Library** while preserving the v1.2.1 character-sheet, GM Guide, GM Control and graded-chat fixes.

The build now ships **95 usable Core Item records**, **3 Vehicle Actor templates**, and a **12-entry generic weapon-upgrade index**. New first-class Item types are **Ammunition** and **Drug**. Weapons can load special ammunition profiles; drugs can be administered from the Actor sheet; active augmentations can contribute explicit derived effects.

## 1. Update the repository source

Use the supplied **FULL GITHUB REPOSITORY ZIP**. Extract it and replace/update the contents of the existing `altered-carbon-rpg-foundry` repository on `main`.

The repository root must contain `system.json` directly. Do not upload a parent folder that leaves `system.json` one level too deep.

## 2. Create GitHub release v1.3.0

Create a normal published release:

Tag: `v1.3.0`  
Title: `Altered Carbon RPG — Unofficial v1.3.0`

Attach exactly:

`altered-carbon-rpg-v1.3.0.zip`

The supplied Foundry ZIP is already flat. Do not zip it again and do not rename the release asset.

## 3. Stable Foundry / Forge manifest

Continue using:

`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`

The v1.3.0 manifest points to:

`https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/v1.3.0/altered-carbon-rpg-v1.3.0.zip`

After committing `main` and publishing the release, open both URLs in an incognito/logged-out browser. The manifest must return JSON and the release URL must download the ZIP without login.

## 4. First launch after updating

Open the world as a GM and perform a full browser reload.

The generated **Altered Carbon — GM Guide** should migrate to guide build **v1.3.0** and contain **22 generated pages**, including **21 — Core Equipment Library**. Custom unflagged pages that you added yourself are preserved.

On a character sheet press **Core Gear**. The Core Equipment Library should report:

- 95 Items;
- 3 Vehicle Actor templates;
- 12 generic weapon upgrades.

You can search/filter the catalog and add a record directly to the current Actor. A GM can also create individual world Items or use **Install Missing Records to World**.

## 5. Special ammunition

Add a weapon and compatible ammunition to an Actor. On the Gear page:

1. press **Load Ammo** on the weapon;
2. choose the special ammunition profile;
3. press **Use / Attack**;
4. resolve damage from the resulting chat card.

The selected profile can alter damage, damage type, Armor Piercing, Deadly, target-body modifiers and shotgun range profiles. Capacity/Depletion remains tracked on the weapon itself.

## 6. Drugs

Drug Items have quantities. Press **Administer** to consume one dose and post the drug's active/Under-the-Influence rules to chat. Adding the same Core drug again increments quantity rather than creating an accidental duplicate Item.

## 7. Existing v1.2.1 behavior remains

- Character sheets are scroll-safe and view-first.
- **Edit Sheet** is required for document editing.
- Previous Sleeves, Relationships, Networks, Traits, Baggage, equipment and other records disclose information inline.
- Duplicate sheet presentation protection remains active and now includes ammunition/drug quantities.
- GM Control remains available from the satellite-dish tool under **Token Controls**.
- GM roll requests and degree-coded futuristic chat remain enabled.

## 8. Live acceptance test

Run `docs/RUNTIME-TEST.md` in a real Foundry v14 world with at least one GM and one non-GM player account. Static tests can validate the package and code paths, but they cannot certify Foundry browser rendering, socket permissions or Forge behavior.

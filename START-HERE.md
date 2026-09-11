# START HERE — Updating the Altered Carbon System to v1.2.1

Repository: **pacts-and-polyhedrals/altered-carbon-rpg-foundry**

Foundry system ID: **altered-carbon-rpg**

Version: **1.2.1**

## What changed

v1.2.1 repairs and hardens the GM-facing play layer introduced in v1.2.0:

- a generated **Altered Carbon — GM Guide** Journal with 21 walkthrough pages and automatic version-aware refresh;
- an **Altered Carbon — GM Control** panel;
- a Cold Storage/cyber-noir library of preset Skill Check requests;
- multi-character chat requests that eligible players answer by clicking their button in chat;
- futuristic styling for the chat log and all system-generated chat cards;
- degree-coded Success +1 to +5 and Failure -1 to -5, plus distinct Ace, Stroke of Luck and Catastrophe states.

## 1. Update the repository source

Use the supplied FULL REPOSITORY ZIP. Extract it and replace/update the contents of the existing `altered-carbon-rpg-foundry` repository on the `main` branch.

The repository root must contain `system.json` directly.

## 2. Create GitHub release v1.2.1

Create a normal published release:

Tag: `v1.2.1`

Title: `Altered Carbon RPG — Unofficial v1.2.1`

Attach exactly:

`altered-carbon-rpg-v1.2.1.zip`

The supplied install ZIP is already flat. Do not put its contents inside another directory and do not rename the release asset.

## 3. Stable Foundry / Forge manifest

Continue using:

`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`

The v1.2.1 manifest points to:

`https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/v1.2.1/altered-carbon-rpg-v1.2.1.zip`

## 4. Verify the public files before Forge

After committing `main` and publishing v1.2.1, open both URLs in a logged-out/incognito browser.

Manifest:

`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`

Release ZIP:

`https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/v1.2.1/altered-carbon-rpg-v1.2.1.zip`

The first must return the v1.2.1 JSON manifest. The second must download the ZIP without requiring a GitHub login.

## 5. First launch in Foundry

Open a world that uses **Altered Carbon RPG — Unofficial** as a GM.

The system will create a GM-only Journal named:

**Altered Carbon — GM Guide**

If an existing generated guide is stale, the system refreshes its generated pages automatically when a GM opens the world. From v1.2.1 onward, custom unflagged notes pages appended to that Journal are preserved. **Refresh Guide** remains available for a manual rebuild.

With a Scene open, use **Token Controls → satellite-dish Altered Carbon — GM Control**. The system-settings entry remains as a fallback. The panel lets you:

1. select one or more Character/AI Actors;
2. select a Cold Storage/cyber-noir preset or compose a custom check;
3. send one request to the selected characters;
4. let each eligible player click the Roll button in chat;
5. see each returned result graded and recorded in the request card.

## 6. Chat appearance

All chat messages inherit the Altered Carbon black-glass/cyan shell while this system is active. System checks add semantic color grades for Success +1 through +5 and Failure -1 through -5, with separate treatments for Ace, Stroke of Luck and Catastrophe.

The text label is always present; color is supplemental.

## 7. Existing character-sheet behavior remains

Actor sheets remain scroll-safe and view-first. Embedded records disclose information inline. **Edit Sheet** is still required for actual document editing. Traits/Skills/etc. remain deduplicated on the sheet. Baggage and equipment/gear now also collapse doubled presentation records, including duplicate gear that only differs in mutable depletion/exhaustion state.

## 8. Live acceptance test

Run `docs/RUNTIME-TEST.md` in a real Foundry v14 world with at least one GM and one non-GM user. Static tests cannot certify browser rendering, world permissions, socket delivery or Forge-specific hosting behavior.

## Duplicate / GM Guide repair

After the world starts under v1.2.1, the character sheet collapses literal duplicate embedded records before rendering, including the duplicated Baggage and equipment seen in earlier builds. This does not destructively delete world documents.

A GM login also checks **Altered Carbon — GM Guide**. If its stored guide version or generated page count is stale, the system replaces the generated guide pages with the current v1.2.1 set automatically.

With a Scene open, choose **Token Controls** and press the satellite-dish **Altered Carbon — GM Control** tool to open the GM roll-request panel.

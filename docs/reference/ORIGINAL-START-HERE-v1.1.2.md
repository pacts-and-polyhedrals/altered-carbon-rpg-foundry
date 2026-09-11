# START HERE — Updating the Altered Carbon System to v1.1.2

Repository: **pacts-and-polyhedrals/altered-carbon-rpg-foundry**

Foundry system ID: **altered-carbon-rpg**

Version: **1.1.2**

## What changed

This patch makes the character sheet view-first. Previous Sleeves, Relationships and Networks now disclose their information inline, while actual editing is available only after the owner or GM explicitly enables whole-sheet Edit Mode.

## 1. Replace/update the repository source

Use the supplied FULL REPOSITORY ZIP. Extract it and update the contents of your existing `altered-carbon-rpg-foundry` repository on the `main` branch.

The repository root must still contain `system.json` directly.

## 2. Create GitHub release v1.1.2

Create a normal published release:

Tag: `v1.1.2`

Title: `Altered Carbon RPG — Unofficial v1.1.2`

Attach exactly:

`altered-carbon-rpg-v1.1.2.zip`

Do not put the ZIP contents inside an extra folder. The supplied install ZIP is already flat and verified.

## 3. Stable Foundry/Forge manifest

Continue using:

`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`

The v1.1.2 manifest points to:

`https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/v1.1.2/altered-carbon-rpg-v1.1.2.zip`

## 4. Verify before Forge

After committing `main` and publishing v1.1.2, open both URLs in a logged-out/incognito browser:

Manifest:
`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`

Release ZIP:
`https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/download/v1.1.2/altered-carbon-rpg-v1.1.2.zip`

The first must show JSON. The second must download the ZIP immediately.

## 5. Expected UI after update

The Actor window opens in read-only View Mode. Use **Edit Sheet** to unlock manual fields and embedded-record edit buttons; **Finish Editing** saves and locks the sheet again. Sleeve Archive, Relationships and Networks can always be opened as read-only inline dossiers without entering Edit Mode.

The Character Creator is available from Foundry system settings and from the **Creator** button on the Actor sheet. It guides players through:

1. Identity
2. Archetype and Starting Package
3. Variant
4. Sleeve
5. Attributes
6. Resources and economy
7. Review and character creation

## 6. Validation

The package has static syntax, data, rules and UI-contract tests. A live Foundry/Forge runtime test is still required after upload because this build environment does not run your hosted Foundry instance.

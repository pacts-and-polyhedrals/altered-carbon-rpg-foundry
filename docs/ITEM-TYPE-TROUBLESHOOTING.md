# Ammunition / drug: not a valid Item type

The repeated DataModelValidationError occurs when the running Item Document registry rejects a requested subtype. Foundry requires that a system declare its custom subtypes in system.json; its JavaScript data-model registration is a separate step. A model class alone is not a server subtype declaration.

The supplied 1.4.0 source and runtime ZIP already contain both declarations. Therefore it is not justified to claim that the catalog simply used an undeclared name in that archive. Possible deployment causes include an older server-loaded manifest, updated scripts alongside old metadata, a duplicate/nested system installation or another runtime interference. The user's remote host has not been inspected.

## Recovery

Back up the world. Stop the game/server using supported host controls. Replace the entire altered-carbon-rpg system folder with 1.4.1, including system.json. Keep exactly one correctly placed system folder. Restart the server/game process and reload all clients. Merely refreshing a browser does not reload the host's system metadata.

Open GM Control -> System Check. Loaded manifest and running build should both report 1.4.1. The installed manifest must declare Item.ammunition and Item.drug, and the client registry must include both. Correct any reported mismatch before importing.

Then run Core Library -> Install Missing Records to World. Existing catalog-ID records are retained and the failed missing records can be added. The new importer runs one registration preflight before creating the batch and guards overlapping calls in the same client. Run it from one GM client only.

Do not delete or recreate PCs, run Cold Storage Full Import, or retype existing ammo/drugs as generic equipment. This update does not migrate those Items into another type. If you made manual placeholder equipment to bypass earlier failures, it is not automatically deleted or converted; review it separately rather than assuming its ammunition/drug workflow has been restored.

## When the check is healthy but creation still fails

Keep the first fresh full exception and the System Check report. Test a duplicate world with unrelated modules disabled and the exact deployed release. Verify the host is actually serving the new files. A clean report verifies the checks it performs; it cannot certify the entire server or all third-party interactions.

For the report in a browser console, run:

```js
await game.alteredCarbon.diagnoseSystem()
```

The returned report includes buildVersion, loadedVersion, diskVersion (null if not fetched), missing, issues and remedy. It does not contain your character inventory or credentials.

## Reference

Official Foundry v14 document registration and Item.TYPES:
- https://foundryvtt.com/api/v14/modules/foundry.documents.html
- https://foundryvtt.com/article/system-data-models/
- https://foundryvtt.com/api/v14/classes/foundry.documents.Item.html

Consulted 11 September 2026. Documentation inspection is not a live-world test.

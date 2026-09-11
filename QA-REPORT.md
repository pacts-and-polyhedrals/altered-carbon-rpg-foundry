# QA report - Altered Carbon 1.4.0 / Cold Storage 1.1.1

Prepared 11 September 2026 from the user's supplied v1.3.0 source and previously generated full adventure.

## Completed

**115 Node tests passed**: original rules/UI contracts plus new SP quote/application checks, ownership, stale state, duplicate submission, rollback, caps, Trait prerequisites, Civilian Commonality, eight-stage creator and direct-roll contracts, and simulated journal import/reimport/migration/recovery/permission/counter/scene-link tests.

**17 Chromium harness checks passed**: all 32 Skill summaries expose Roll; the click leaves details collapsed; cancel posts no roll; confirmed roll posts a check; sheet has Level Up and no Creator; directory hook filters correctly and is idempotent; cancelled advancement spends nothing; confirmed advancement charges SP, retains Health and records history; Traits search; eight creator stages; starting plan costs and rejection/clear; all 30 GM chapter controls render; no uncaught browser exceptions. Screenshots were inspected for the Skill sheet, Level Up Attributes, creator and book console.

The Chromium harness runs the actual application context/action methods against mock document APIs. Its QA-only template subset renderer supports the constructs used in these templates, but is **not the full Handlebars engine**. It does not prove Foundry's own event dispatcher, CSS environment, sockets or server persistence.

Release validation checks all JSON recursively, package and system version agreement, manifest file paths, JavaScript syntax, the root install-ZIP structure, and the new advancement/book files. Source adventure JSON is copied unchanged from the earlier full module. Three bare chapter tokens are repaired by the importer at rendering time without rewriting the prose source.

## Not completed

No live Foundry 14 server/client world, full Foundry Handlebars rendering, multiplayer synchronization, real detached sidebar, Forge deployment or session load test was run. No new version was published to GitHub and no live world was edited. The minimum compatibility target remains Foundry 14; the manifest omits `verified` rather than claiming a live verification.

Book-only runtime tests show no Actor/Item mutation in the simulated API. Full fresh-world import remains the optional module's existing behavior and should not be used as the book upgrade route in a played world. Review docs/live-qa.md before using this build for a paid game.

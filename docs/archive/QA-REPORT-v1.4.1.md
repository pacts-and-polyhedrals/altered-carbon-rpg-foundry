# QA report - Altered Carbon 1.4.1 / unchanged Cold Storage 1.1.1

Prepared 11 September 2026. This release continues the supplied v1.4.0 source and embedded adventure, which in turn continued the user's v1.3.0 system.

## Completed automated checks

**155 Node tests passed, zero failures.** All 115 earlier tests remain, with release-version assertions updated. New cases exercise the actual request, roll, award, health and library methods against mock Foundry documents/settings/sockets, not only text matching.

Coverage includes multi-Actor independent awards; matching Skill sizes; one-use and persistent awards; Skill filters; cancellation, blocked checks and dice errors not spending bonuses; actual edited-TR resolution; ownership and GM permissions; partial award failure; selected clearing without resource mutation; preserving later awards while consuming an earlier one; same-client overlapping-roll guard; saved/reset preset settings and zero base TR; simultaneous distinct-character responses; legacy request compatibility; forged socket payloads rejected in favour of a persisted check; escaped labels; award display; registry mismatch before writes; all 95 Core Items and 3 Vehicles imported using the declared types; repeat/overlapping library imports; and ammunition/drug quantity behavior.

**35 Chromium harness checks passed, zero uncaught browser exceptions.** These cover earlier Skill Roll, advancement, eight-stage creator and book controls plus the Bonus Dice form, all 24 editable presets, multi-character assignment, preserved input/recipient state, cancelled award-bearing rolls, actual Save/Send/Reset, request plus award dice, edited TR, automatic sheet awards, removal, mismatch warnings and compact controls without horizontal overflow. Screenshots were visually inspected, including the narrow GM layout after correcting clipped fields.

The browser harness uses actual application context/action methods but mocked Foundry document APIs and a QA-only subset template renderer. It is NOT Foundry's own runtime or full Handlebars implementation. Its screenshots are labelled accordingly. Browser results and screenshots are in the complete bundle's 05-QA folder; the source contains the reproducible harness.

Release checks validate recursive JSON, JavaScript syntax, entrypoint/model/manifest alignment, every Core catalog type, package/build versions, correct root ZIP structure and required new modules. The packaged system.json must match the source manifest exactly and declare ammunition and drug. An additional preservation report compares all data files against v1.4.0, along with the unchanged data models and base rules engine. No catalog or adventure prose was rewritten for this patch.

## Diagnosis and repair boundary

Both ammunition and drug already appear in the supplied v1.4.0 source AND install ZIP. The console error proves that the user's running Item registry rejected them; it does not identify the host's exact stale file, deployment state or conflicting module. A mixed or stale server manifest is plausible, not confirmed.

The complete new install package retains the proper declarations and model registration. Startup, System Check and pre-import diagnostics compare running build/version and registered types; System Check also attempts a non-cached fetch of the installed manifest. If the registry/version is inconsistent, imports are stopped before a batch produces repeated validation failures. Diagnostics cannot change a server-loaded registry or guarantee host recovery without full deployment/restart. Failure to fetch the disk manifest does not pretend that a disk comparison occurred; the reported disk version remains null.

## Limits and pending live QA

No live Foundry 14 world, full Foundry Handlebars render, native event-dispatch integration, real server permission round-trip, Forge deployment, release publication or session load test was run. Compatibility minimum is 14; no live-verified version is asserted. No remote repository or user's world was modified.

Simulated sockets and concurrent operations are not proof of real multiplayer behavior. Awards use per-Actor keyed flags, and one-use rolls are guarded against overlapping calls on the same JavaScript client. This is NOT a server-atomic lock across two clients rolling the SAME Actor at precisely the same time. Use one rolling owner per Actor at a time; verify synchronization and reconnect behavior in live QA. Independent different-Actor requests are tested. A failed server update during post-roll award consumption could require GM review of the award.

The Core Library repeat guard is also local to the calling client; do not start its bulk install from two GM browsers simultaneously. The existing advancement concurrency/rollback limitations remain as documented. Book-only simulations show no Actor/Item mutation; the optional module's Full Import is still for a fresh world, not an upgrade route for an active campaign.

Read START-HERE.md and docs/live-qa.md before a paid session. Back up the world and test with your actual host, players, modules and browser clients.

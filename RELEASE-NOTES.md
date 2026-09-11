# Altered Carbon RPG - Unofficial v1.4.3

Distribution repair based on the actual saved v1.1.2 and v1.3.0 packages.

- Restore the original raw `main/system.json` update manifest.
- Keep the system ID and exact version-pinned release ZIP convention.
- Restore the original numbered source/install ZIP presentation.
- Include a release-manifest bridge for installations diverted by v1.4.2.
- Stop CI from silently rewriting committed release metadata before validation.
- Make the optional publisher manual-only; verify public main before publishing.
- Make flat runtime ZIP builds reproducible for meaningful hash verification.
- Check original main, bridge manifests and exact ZIP bytes independently.

All game content, rules, CSS and UI behavior are retained. Runtime changes are
manifest release fields and version labels only. Ammunition and Drug declarations
remain present; no items are converted or deleted.

Follow START-HERE.md. Do not recreate characters or run Cold Storage Full Import.
The Forge HTTP 500's backend cause has not been established. Automated tests are
not a live Forge certification, and this local delivery has not been published.

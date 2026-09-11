# Altered Carbon v1.4.3 - Repair validation

## Completed for this delivery

- **200 Node tests passed**, zero failures/skips. These include the existing game,
  UI-controller, advancement, bonuses, presets, content and book tests; release
  configuration checks; reproducible archive tests; public-verifier boundary
  tests; and four real LOCAL HTTP tests using the actual JSON and runtime ZIP.
- **7 offline publisher scenarios passed**, using simulated `gh` and HTTP. These
  cover normal ordering, private-host rejection, refusing older/published
  versions, failed upload, mismatched tag and stale original main manifest.
  No GitHub account or publication was used by these tests.
- JSON parsing, runtime manifest paths, catalog Item/Actor types and model
  registrations passed. `ammunition` and `drug` are declared in the full manifest.
- All JavaScript modules were syntax-checked; both shell scripts passed `bash -n`;
  both workflows parsed as YAML.
- The full local validation/build process did not rewrite source files.
- An intentionally stale main manifest (v1.3.0 against package v1.4.3) was rejected
  without silently rewriting it.
- Two complete builds produced byte-identical runtime ZIPs. ZIP metadata does not
  depend on source timestamps or permissions; stored ZIP entries avoid zlib
  implementation differences. Source line endings are controlled by .gitattributes.
- The source, standalone and ZIP-embedded `system.json` files are identical.
  Each uses the ORIGINAL raw-main manifest and exact v1.4.3 ZIP URL.

## Preservation checks against the supplied v1.4.2 runtime

There are the same **68 runtime files**. **62 are byte-for-byte identical**.
Five other files differ ONLY by the version label `1.4.2` -> `1.4.3`.
The last file is `system.json`; only `version`, `manifest` and `download` change.

All **31 game data files**, every stylesheet and all game-mechanics behavior
remain unchanged. No new world database, dependency or forced reimport is added.
The source-only development tooling and documentation are intentionally changed.

The ZIP is approximately 2 MB because it uses standard uncompressed ZIP entries
for exact repeatability. This is not extra runtime content or a source archive.

## Package and history evidence

The original v1.1.2 and v1.3.0 saved bundles were extracted and inspected, including
their full repository ZIPs, root manifests, install ZIPs, original START-HERE
instructions and CI workflows. Original instructions are retained unmodified in
`docs/reference/`. The later v1.4.0, v1.4.1, v1.4.2 and direct-import manifests were
compared too. See REPAIR-AUDIT.md.

This recovers the actual release reference. It does not independently establish
which older release the user last ran successfully on their host, nor does it
mean the full linked conversation was readable.

## Not verified

- No authenticated GitHub read/write or publication was performed.
- Public manifest/release fetches could not be completed from this environment.
  The web fetches returned no usable content; the direct runtime checks failed
  local DNS resolution. These are NOT observed HTTP 404s and do not prove that
  the repository is absent or private.
- No live Foundry server, Forge installation, multiplayer test, server-side type
  registry check or browser rendering test was performed for v1.4.3.
- Earlier browser-harness results are historical and are not counted as new tests.
- The underlying cause of the user's Forge task-status HTTP 500 remains unknown.
  Its response body and server task diagnostics were not available.

The supplied verifier is designed to make real unauthenticated public requests
AFTER publication. Its local tests are not a successful public verification.
The compatibility minimum remains Foundry 14 without a fabricated verified field.

## Repeat the checks

```sh
npm run release:check
python3 qa-release/publisher-smoke.py
```

After uploading the source and release assets through the original route:

```sh
npm run verify:published
```

Successful publication and installation must be established separately from these
local results. No world reset, character recreation or Cold Storage Full Import
is part of this repair.

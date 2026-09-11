# Altered Carbon RPG - Unofficial Foundry system

## v1.4.3 - Restore the original update route

This patch preserves the v1.4.x game features and returns distribution to the
saved v1.1.2/v1.3.0 setup: `main/system.json` at the repository root and a named,
version-pinned release ZIP. See **START-HERE.md** for the normal manual upload
steps. The original numbered source/install bundle names are restored.

The repository's stable manifest remains:

```text
https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json
```

The configured remote addresses are deployment targets, not a claim that this
release has been published. No live GitHub or Forge deployment was verified.

## Development and local verification

Node 22+, Python 3, bash and unzip are required by the build/test tools. No extra
runtime dependency is installed into the Foundry game.

```sh
npm run release:check
```

This validates the source AS COMMITTED and builds `dist/system.json`,
`dist/altered-carbon-rpg-v1.4.3.zip` and `dist/SHA256SUMS.txt`. It does not rewrite
source URLs, publish a release, or establish public availability. The ZIP is flat
and reproducible; source timestamps do not change its hash.

After uploading the matching release and main-branch source:

```sh
npm run verify:published
```

That command checks the original raw-main manifest and exact download. It also
checks the two release-manifest bridges for v1.4.2 installations. The deliberate
`--canonical-only` option checks the original route without requiring bridges.
These checks make unauthenticated public HTTP requests and fail on mismatches.

## Preparing a future release

```sh
npm run prepare:release -- --version X.Y.Z
npm run release:check
```

This is an EXPLICIT source-editing maintainer command, never a hidden CI step.
Review and commit its changes to main before publication. Use `--repository
OWNER/REPO` only when deliberately moving the project. Keep the established
manifest URL stable; do not casually move existing installations to a new route.

## Optional publishing workflow

The normal manual GitHub release route is sufficient. For maintainers who
already use Actions, **Publish Foundry Release** remains available ONLY by manual
dispatch on main. It does not run automatically on tags or source pushes, and
it does not rewrite the committed source. Before creating/uploading release
assets it verifies that the original public raw-main manifest already matches
the local build. Published versions are not overwritten. This optional workflow
was tested offline with simulated GitHub responses, not on the live account.

## Content and compatibility

The system targets Foundry 14. No live-verified compatibility claim is added.
All 31 game data files, sheets, CSS and game mechanics are retained. Detailed
feature documentation is in `docs/archive/START-HERE-v1.4.1.md`; original release
instructions are in `docs/reference/`. See **QA-REPORT.md** for the actual tests
run and their limitations. This unofficial project is not affiliated with the
Altered Carbon rights holders or Foundry Gaming LLC.

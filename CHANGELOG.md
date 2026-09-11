# Changelog

## 1.0.0 — 2026-09-11

- Rebuilt the project as a clean, system-only GitHub repository.
- Moved the Foundry package to repository root.
- Removed Cold Storage from the system repository; it remains a separate module project.
- Switched to a stable raw-main `system.json` manifest URL.
- Switched the release to a normal semantic version `1.0.0`.
- Corrected the release ZIP so `system.json` is at ZIP root.
- Added validation which fails if the release ZIP is nested incorrectly.
- Updated Foundry v14 data-model registration to additive `Object.assign` registration.

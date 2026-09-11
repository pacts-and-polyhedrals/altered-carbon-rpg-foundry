# Optional browser harness

Run `python qa-browser/run.py` with Python Playwright and Chromium installed. Set the Chromium executable in run.py to your local location if it is not /usr/bin/chromium. No network access, real Foundry license or installed Foundry server is needed for this mock harness.

The harness loads the actual system JS and template/CSS sources locally. Its subset template renderer is intentionally not the full Handlebars engine. It checks controller behavior and browser DOM interaction, not a live world or multiplayer persistence. Foundry must still be tested separately.

Results and screenshots are written here when run. These QA-only files are excluded from the system install ZIP.

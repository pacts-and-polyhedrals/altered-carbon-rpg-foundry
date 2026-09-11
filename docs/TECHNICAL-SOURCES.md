# API references consulted

Consulted 11 September 2026. Primary Foundry documentation was used to check the intended API surface; documentation review is not a live execution test.

- https://foundryvtt.com/api/v14/classes/foundry.applications.sidebar.tabs.ActorDirectory.html
- https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html
- https://foundryvtt.com/api/v14/functions/hookEvents.renderApplicationV2.html
- https://foundryvtt.com/api/classes/foundry.applications.api.DialogV2.html

The Actors-directory hook is constrained by the ActorDirectory class or its public `actors` tab name, not merely an Actor document type (which could also describe a sheet). HTML is accessed as native DOM with a legacy jQuery-root fallback. Normal Foundry document create/update APIs handle journal and embedded-item persistence.

Rule costs and adventure prose come from the user-provided system 1.3.0 and Cold Storage 1.1.0 files. This update does not claim a new audit of the published tabletop rulebook.

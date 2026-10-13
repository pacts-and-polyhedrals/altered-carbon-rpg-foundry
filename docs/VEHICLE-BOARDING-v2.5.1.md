# Vehicle boarding and synchronized movement — v2.5.1

**For Foundry VTT v14 — Altered Carbon RPG unofficial system.**

## Player flow

1. Put your PC/NPC token next to the vehicle. Open the scene's token layer.
2. **Right-click the vehicle token**. Left-click the **car icon** labelled
   **Board vehicle / choose seat**. The icon remains available even if
   right-clicking the car cleared the previously selected token.
3. If several of your characters can board, select one. Choose a **free seat**:
   Driver/Pilot, Gunner, Operator/Systems, or Passenger 1, 2, etc.
4. Repeat for additional passengers. Each gets a separate position. Seated
   character tokens shrink to half a grid square (as in earlier versions).
5. To change seat or get out, right-click **your own token** and choose
   **Change seat** or **Get out**. A GM can also use the vehicle token's
   **Who is inside / control** button to disembark occupants or change control.
6. The seated driver can move the vehicle unless it uses GM/AI-only control.
   Other passengers may not drag their personal tokens away while seated.

## What changed to fix the one-step lag

In v2.5.0, the first server update moved only the vehicle. An `updateToken`
listener then issued a **second** update containing the passengers, so they
visibly followed one server step later. v2.5.1 intercepts the initiating
vehicle-token transform (`preUpdateToken`, which is synchronous in v14).
The active GM computes all passengers' positions relative to the *proposed
new position and heading* of the vehicle, then submits **one**
`scene.updateEmbeddedDocuments('Token', [vehicle, ...passengers])` operation.
All clients see the same batch rather than a two-stage follow-up. Changes in
vehicle x/y, rotation, size and elevation carry the occupants accordingly.

When a player drives, their client asks the active GM to commit that batch.
The server-side GM request checks that the user controls both the vehicle and
the character in the driver seat, and that the car permits human control.
Seat-changing and exit actions still update the existing seat flags and restore
token size, preserving existing-world data.

## Constraints and live testing

- **One active GM is required** for all boarded-vehicle moves, including those
  initiated by players. With no GM online, movement is refused rather than
  allowing vehicle/rider positions to diverge.
- This uses native Foundry Token Document and token HUD hooks; it does *not*
  monkeypatch third-party movement modules. A module that forcibly bypasses
  originating-client hooks can still cause the legacy two-stage reconciliation.
- A user's normal vehicle/character permissions still apply. A player who does not own the vehicle can still right-click the vehicle
  to get a restricted **Board / Choose Seat** icon. Only owners/GM see the
  full native Token HUD. The character token's **Get in a vehicle** control
  also remains available as a fallback.
- Custom waypoint/terrain/collision behaviour and simultaneous multi-client
  movement require testing with the exact modules used by the group. This
  package includes deterministic test coverage but no live Foundry/Forge server.
- The vehicle and riders must be tokens within the **same scene**. A vehicle
  transported to another scene is not automatically linked to its riders.

## Pre-session smoke tests with a GM and two players

- [ ] Place a 2x3 Ground Car and three characters, with two player-owned tokens.
- [ ] Right-click the car; ensure the car icon appears without a selected PC.
- [ ] Board the driver and two passengers into different free seats.
- [ ] Drag the car 5 squares as GM; each rider should end at the same update step.
- [ ] Move the car as the seated driver on a separate client. Repeat with AI mode
      to verify driver movement is rejected.
- [ ] Rotate by 90° and alter elevation; passengers should follow their seats.
- [ ] Confirm other riders cannot walk away while seated.
- [ ] Change seats, eject someone, delete a vehicle, and check token-size reset.
- [ ] Test multiple rapid movements and use a chase scene with your usual
      additional map/ruler/dragging modules enabled.

No migration or Cold Storage reimport is needed from v2.5.0. Stop the
Foundry server, replace the entire system folder (including `system.json`),
restart, and force-reload every GM/player browser client.

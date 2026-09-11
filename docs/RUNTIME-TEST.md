# First live Foundry v14 runtime test

Run this after installing/updating the system in a real Foundry v14 world. Start with no third-party modules enabled.

## Core system and character-sheet duplicate handling

1. Create/open a world using **Altered Carbon RPG — Unofficial**.
2. Open browser developer tools and confirm there are no red errors from `altered-carbon-rpg` during `init` or `ready`.
3. Create one Character Actor, one NPC Actor and one Vehicle Actor.
4. Open each Actor sheet and confirm every page scrolls and renders.
5. Create representative Skill, Sleeve, Weapon, Armour, Equipment, Trait, Baggage, Condition and Relationship Items.
6. Confirm embedded records expand read-only and only expose document editing after **Edit Sheet** is enabled.
7. On a disposable Actor, deliberately create two identical Baggage Items and two identical equipment/weapon Items. Confirm each duplicate pair renders as a single sheet row.
8. Change only mutable state such as Depletion, Exhausted, Credit spent, or Baggage resolved-state on one of the doubled records and confirm the sheet still does not show an accidental second row.
9. Create two same-name weapons whose actual identity differs (for example, different damage or range) and confirm both remain visible.
10. Roll a Skill from the Actor sheet.
11. Open the Character Creator and Rules Reference menus.
12. Create a Combat encounter and open the Altered Carbon Combat Console.
13. Test weapon use, damage, Wounds/Health mutation and resleeving.

## GM Guide automatic migration and refresh

14. Log in as a GM and confirm a Journal named **Altered Carbon — GM Guide** exists after `ready`.
15. Open the Journal and confirm **Start Here** visibly reports generated guide build **v1.2.1**.
16. Confirm the guide contains **21 generated pages**, including **GM Control & Chat Requests**.
17. Inspect Situational Rolls, Combat, Damage, Gear, Requests, Resleeving, Virtual, Cold Storage Presets, and GM Control & Chat Requests.
18. Confirm long Journal pages remain scrollable/readable with the system's futuristic styling.
19. In a disposable copy of the world, install v1.2.1 over a v1.2.0-generated guide (or deliberately make the guide-version flag stale), reload as GM, and confirm the generated pages refresh automatically without pressing **Refresh Guide**.
20. Append a separate custom notes page that is not system-generated. Use **Refresh Guide** and confirm the custom notes page remains while the generated pages are rebuilt.
21. Open GM Control and click **Open GM Guide**; confirm it opens the refreshed Journal.

## GM Control Token Controls button

22. Open a Scene as GM and select **Token Controls**.
23. Confirm a GM-only satellite-dish tool titled **Altered Carbon — GM Control** appears in the Token Controls palette.
24. Click it and confirm the GM Control application opens or comes to the front.
25. Log in as a non-GM player and confirm that player does not receive the GM Control tool.
26. Confirm the Game Settings GM Control entry still works as a fallback.

## GM Control and chat requests

27. Create or use two player-owned Character Actors with the system's core Skill Items.
28. Join the world from a second non-GM user in another browser/profile.
29. Open **Altered Carbon — GM Control** as GM and select one player character.
30. Send **Notice the Anomaly**. Confirm the request appears only to GMs and the selected Actor's owner.
31. On the player client, click the Actor's **Roll Detection** button in chat.
32. Confirm a real Detection check is rolled, its grade card appears, and the original GM request updates to show the returned result.
33. Select two or more player-owned Actors and send one group preset. Have each owner respond and confirm each row updates independently.
34. Confirm a player cannot roll for an Actor they do not own and cannot answer the same request again after its response has been recorded.
35. Send a custom check with Difficulty, TR bonus and a player-facing Context note. Confirm all values appear correctly and affect the roll as intended.

## Chat presentation

36. Send a normal IC/OOC chat message and confirm it receives the Altered Carbon chat shell.
37. Generate ordinary Success and Failure checks and confirm the grade chip and five-pip degree track render.
38. Where practical in a test Actor, exercise/check the visual classes for Success +1 through +5 and Failure -1 through -5.
39. Exercise Ace, Stroke of Luck and Catastrophe outcomes or inspect their test cards in a development world.
40. Confirm weapon, equipment, damage and opposed-check cards share the same visual language.
41. Confirm result labels remain readable without relying on color alone.

If any step fails, capture the first Altered Carbon-related console error, the Foundry build number, the browser/client role, and a screenshot of the affected sheet, Journal, control palette, chat message, or card.

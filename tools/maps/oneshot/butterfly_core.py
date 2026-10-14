"""The Butterfly Cut — core story data: premise, threads, timeline, clock, NPCs, pregens, endings, handouts.
Places live in butterfly_places.py. build.py merges both into data/oneshot-butterfly-cut.json."""

META = dict(
    id='butterfly-cut', title='The Butterfly Cut', year=2384, start='BCS-LICKTOWN',
    tagline='One storm. One dropped container. One new drug. A whole city falling like dominoes.',
    length='4–5 hours', players='4–6 (eight pregens to choose from)',
    timeline_note='Set in the same weeks as Cold Storage: The Faces We Left Behind. Neither adventure needs the other.',
)

PITCH = """Bay City, 2384. Nine nights ago a storm came off the Pacific. Since then something new has been moving through
Licktown: a cut of Merge the street calls <strong>Flutter</strong>. People who take it don't die. They go <em>glassed</em> —
eyes open, breathing, nobody home. BCPD has twelve of them on the books and orders from upstairs to call it an accident.
You are the people who don't think it was."""

GM_PREMISE = """<p><strong>The truth, in one breath.</strong> A storm surge broke the Marina's <em>Seawall Pumps</em>. To save the
<em>Bay Dam</em>, the city diverted power from the <em>Dogpatch Power Station</em>. The brownout froze a gantry at the <em>Crane Yard</em>
for four seconds, long enough to drop container <strong>KX-4471</strong>: a sealed Psychasec medical consignment bound for the
<em>Psychasec Cellhouse</em> on Alcatraz. Inside were 400 vials of <strong>Halcyon-7</strong>, an unlicensed sedative that loosens the grip
between a cortical stack and its sleeve. Psychasec uses it to keep resleeved convicts docile. It has never been declared to the Protectorate.</p>
<p>The night foreman skimmed forty vials and reported the rest water-damaged. A Licktown fence sold them to a cook, who cut them into Merge.
Merge makes you feel what everyone around you feels; Halcyon-7 makes you let go of yourself. Together they make <strong>Flutter</strong>:
a high like dissolving into a crowd. Too much, and the stack lets go of the sleeve entirely. The body lives. The person is trapped,
awake, inside their own stack. That is being <strong>glassed</strong>.</p>
<p>A glassed victim can be saved: pull the stack and resleeve it. But an empty, healthy sleeve with no owner is worth a fortune, and some
people in this city have already worked that out. Psychasec wants its compound back before anyone asks why it exists. Pressure from the
Protectorate has reached the BCPD captain. A Meth matriarch wants her son back and someone to blame. Every one of the eight pregens is,
without knowing it, one of the dominoes.</p>"""

HOW_TO_RUN = """<h3>Running a sandbox one-shot</h3>
<ul>
<li><strong>Start in Licktown</strong> (the street map). Read the opening, hand out the pregens' <em>Personal Domino</em> cards, and let the players choose where to go first. Every pregen points at two or three places.</li>
<li><strong>Every place has a page.</strong> Each page says what is happening there, the mission or role it plays, the clues that point onward (with the place they lead to), who is there, and what happens if nobody comes. The case pins on the maps open these pages.</li>
<li><strong>The night moves without them.</strong> The session starts at 21:00 and runs to dawn. After each major scene, advance the clock an hour and fire the event for that hour unless the players have already prevented it. That is the butterfly effect: the places they skip still change.</li>
<li><strong>Clues are redundant.</strong> Every thread can be found from at least three places. A failed Check changes the cost or the danger, never whether the clue exists.</li>
<li><strong>Splitting up is fine.</strong> Stragglers and side trips are opportunities. Use the travel system freely; the clock is your pacing tool.</li>
<li><strong>Endings are earned, not chosen.</strong> At dawn, count what the players achieved against the five <em>Pressure Points</em> and read the matching outcomes.</li>
</ul>
<h3>Pacing for 4–5 hours</h3>
<p>Opening and first lead: 30 min. Three to five places, each 20–30 min, with the clock advancing: 2½–3 hours. One climax (the Opera House, the Clinic vault, the Causeway, or the Spire): 45 min. Dawn and endings: 15 min. Places the players never visit happen off-screen through the clock and through the news on Sunny's feed.</p>
<h3>Glassed victims (rules)</h3>
<p>A glassed sleeve is <strong>Incapacitated</strong> and cannot act. The stack inside is conscious. A <strong>Medicine</strong> Check (Difficulty 2) confirms it; extracting the stack safely needs a clinic or a Tissue Welder and Medicine (Difficulty 3). A dipper can reach the trapped mind with <strong>Digital Networking</strong> (Difficulty 2) for one short, harrowing conversation. Every glassed victim the players free counts toward the <em>Lives</em> pressure point.</p>
<h3>Flutter (rules)</h3>
<p>Treat a dose as <strong>Merge (DRG001)</strong> with an extra effect: after the high, make an <strong>Endurance</strong> Save (Difficulty 2, +1 per extra dose that night). On failure, gain the Dazed condition; on a Catastrophe, the user is glassed. Lethinol given within ten minutes prevents glassing.</p>"""

THREADS = [
    dict(id='cook', name='The Cook', colour='#ff7a45', pregen='PG01', question='Who is making Flutter, and where is the second batch?',
         summary='From the street to the lab: the dealers, the fence, the cook "Saint" Ambrose Kell and his last forty vials, cut into a second batch for a party where the rich will never see it coming.',
         spine=['BCS-LICKTOWN', 'BAY-MARKET', 'BCP-CHOP-SHOPS', 'BCP-CONTAINER-HABS', 'BCP-MAGLEV-DEPOT', 'BCP-OPERA-HOUSE']),
    dict(id='badge', name='The Glassed Officer', colour='#6fa8ff', pregen='PG02', question='What happened to Officer Dez Halloran, and who is burying it?',
         summary='A patrol officer found glassed in Rain Alley. A captain closing the file. A stack moved to "storage pending payment". Someone above BCPD wants this quiet.',
         spine=['BAY-ALLEY', 'BAY-PRECINCT', 'BCP-COURTHOUSE-ANNEX', 'BCP-PROTECTORATE-OFFICE', 'BAY-CLINIC']),
    dict(id='compound', name='Halcyon-7', colour='#5ef0c4', pregen='PG03', question='What is the compound in Flutter, and who made it?',
         summary='A toxicology signature nobody should recognise. A sedative that unhooks a mind from its body, tested on prisoners. The road leads to Psychasec Alcatraz.',
         spine=['BAY-PRECINCT', 'BCP-CRANE-YARD', 'BCP-SALLY-PORT', 'BCP-POWERHOUSE', 'BCP-PSYCHASEC-CELLHOUSE']),
    dict(id='paper', name='The Paper Trail', colour='#b9a2ff', pregen='PG04', question='Where did container KX-4471 come from, and who erased it?',
         summary='Crane logs, toll scans, a cargo manifest that changed overnight and a tower full of records that can still prove it. The data leads to Psychasec and to a clerk who was paid to forget.',
         spine=['BCP-CRANE-YARD', 'BCP-TOLL-AUTHORITY', 'BCP-PROTECTORATE-OFFICE', 'BCP-ARCHIVE-TOWER', 'BCP-OLD-BANKS']),
    dict(id='street', name='The Street Trade', colour='#ffc467', pregen='PG05', question='Who is selling Flutter, and who wants a war over it?',
         summary='The Fight Pit book, the Lower Bay Market stalls and a rival crew that sells "clean" Merge and wants Saint Ambrose dead. Money, debts and a turf war about to start.',
         spine=['BAY-PIT', 'BAY-MARKET', 'BCP-STACK-DEALERS', 'BCP-SCRAPYARD', 'BAY-STRIP']),
    dict(id='cover', name='Deep Cover', colour='#ff5a6e', pregen='PG06', question='Can Kesh Arlo stay alive inside the crew long enough to bring it down?',
         summary="Four months inside Saint Ambrose's crew. A handler who has stopped answering. A crew that has started asking who talks to cops. And the crates Kesh carried himself.",
         spine=['BCP-CONTAINER-HABS', 'BCP-SCRAPYARD', 'BCP-POTRERO-HILL', 'BAY-DOCKS', 'BCP-IMPOUND-LOT']),
    dict(id='heir', name='The Glassed Heir', colour='#e9cc8c', pregen='PG07', question='Can Caspian Vance be brought back, and what will his family do to whoever did it?',
         summary="A Meth heir glassed in a VIP booth. A mother in the Spire who wants vengeance and silence. A clinic that has already priced his empty sleeve. Money that can open any door, and close it behind you.",
         spine=['BAY-CLUB', 'BAY-SPIRE', 'BAY-CLINIC', 'BCP-STACK-BROKERS', 'BAY-SKYPORT']),
    dict(id='signal', name='The Signal', colour='#ff7fb0', pregen='PG08', question='Who is telling the city the story, and what will it believe at dawn?',
         summary="A pirate feed that warned Licktown about bad Merge and made it famous instead. Shelters full of glassed grounders. A mast that can reach every screen in Bay City. The truth needs a broadcast.",
         spine=['BCP-DOLORES-CHAPEL', 'BCP-SLUMS', 'BCP-GROUNDER-CAMP', 'BCP-HAIGHT-SQUATS', 'BCP-SUTRO-MAST']),
]

# Backstory: the chain of dominoes before the session starts (days before T0).
BACKSTORY = [
    dict(day=-9, place='BCP-SEAWALL-PUMPS', text='Storm surge. Two Seawall Pumps fail; Marina Seawall floods to the Valencia blocks.'),
    dict(day=-9, place='BCP-BAY-DAM-ACCESS', text='Bay Dam control orders emergency sluice power to stop the surge reaching Dogpatch.'),
    dict(day=-9, place='BCP-POWER-STATION', text='Shift engineer Maren Kosk diverts the Dogpatch grid to the dam. Dogpatch browns out for 41 minutes.'),
    dict(day=-8, place='BCP-CRANE-YARD', text='A gantry\'s power-fail routine glitches for four seconds and drops container KX-4471. It splits on the quay.'),
    dict(day=-8, place='BCP-CRANE-YARD', text='Night foreman Eddo Paz pockets forty vials of Halcyon-7 and logs the container "water-damaged, returned to sender".'),
    dict(day=-8, place='BCP-TOLL-AUTHORITY', text='The re-sealed container crosses the Alcatraz Causeway 120 kg lighter than its manifest. A toll analyst flags it.'),
    dict(day=-7, place='BCP-CHOP-SHOPS', text='Eddo sells the vials to the Licktown fence Lula "Gearbox" Tran, who has no idea what they are.'),
    dict(day=-7, place='BCP-CONTAINER-HABS', text='Gearbox sells them to the cook "Saint" Ambrose Kell. Kesh Arlo, undercover in the crew, carries the crate.'),
    dict(day=-6, place='BCP-CONTAINER-HABS', text='Ambrose cuts 12 vials into Merge. The first batch of Flutter: 600 doses.'),
    dict(day=-6, place='BAY-PIT', text='Flutter is sold at the Fight Pit and the Lower Bay Market. The street name comes from how it feels: like your edges fluttering away.'),
    dict(day=-5, place='BCP-SUTRO-MAST', text='Sunny Achterberg\'s feed warns Licktown about "glass Merge". The warning makes it famous. Demand doubles overnight.'),
    dict(day=-5, place='BAY-CLINIC', text='Six glassed users reach the Resleeving Clinic. Director Pell Okonjo pulls their stacks "pending payment" and keeps the sleeves.'),
    dict(day=-4, place='BAY-CLUB', text='Caspian Vance is glassed in a VIP booth at the Neon Nightclub on a pill his sister Juniper bought him.'),
    dict(day=-4, place='BCP-PSYCHASEC-CELLHOUSE', text='Dr Ilse Varga counts the vials. Forty missing. Psychasec sends its retrieval specialist Corin Slade into the city.'),
    dict(day=-3, place='BAY-ALLEY', text='Officer Dez Halloran is found glassed in Rain Alley with a Psychasec data chip in his glove. The chip disappears at the precinct.'),
    dict(day=-3, place='BCP-PROTECTORATE-OFFICE', text='A Protectorate clerk, Gaspar Dunne, amends KX-4471\'s manifest to "agricultural sedatives". Psychasec pays through the Old Banks.'),
    dict(day=-2, place='BAY-PRECINCT', text='Captain Aurelio Brandt is told by the Protectorate to reclassify the cases as accidental overdoses. Halloran\'s stack is sent to the clinic.'),
    dict(day=-2, place='BCP-STACK-BROKERS', text='Vesna Rhee buys the first two glassed sleeves from the clinic. Word spreads: empty sleeves are worth more than the people in them.'),
    dict(day=-1, place='BCP-SLUMS', text='Snatchers start lifting glassed grounders from the Slums and the Haight Squats to sell.'),
    dict(day=-1, place='BCP-STACK-DEALERS', text='The Sutter crew, who sell "clean" Merge, lose half their customers to Flutter and decide Ambrose has to go.'),
    dict(day=0, place='BCS-LICKTOWN', text='21:00. A runner called Moth goes glassed in the middle of 16th Street in the rain. The pregens are the first ones there.'),
]

# The night: each hour fires unless the players have prevented it.
CLOCK = [
    dict(hour='21:00', title='Moth on 16th Street', place='BCS-LICKTOWN', event='The session opens. Moth, sixteen, glassed in the rain outside the Lower Bay Market. A crowd, a dealer slipping away, a BCPD cruiser that does not stop.', prevent=''),
    dict(hour='22:00', title='Psychasec reaches the fence', place='BCP-CHOP-SHOPS', event='Corin Slade\'s team raids the Chop Shops for the vials. Gearbox Tran is taken (or killed if she fights). Her ledger burns.', prevent='Players reach the Chop Shops first, or warn Gearbox.'),
    dict(hour='23:00', title='The Scrapyard hit', place='BCP-SCRAPYARD', event='The Sutter crew ambush Ambrose\'s runners at the Scrapyard. Two dead. Ambrose decides there is a rat; Kesh Arlo\'s cover starts to crack.', prevent='Broker a truce at Stack Dealers, tip BCPD patrols, or arrest Jax Sutter.'),
    dict(hour='00:00', title='Case closed', place='BAY-PRECINCT', event='Captain Brandt signs the cases off as accidental. The task force is stood down by memo. Halloran\'s stack is listed as "transferred to private storage".', prevent='Get the Psychasec chip or the original manifest to the Courthouse Annex before midnight.'),
    dict(hour='01:00', title='The second batch moves', place='BCP-MAGLEV-DEPOT', event='Ambrose cuts his last 28 vials into 1,400 doses of Flutter and sends them by courier on the late maglev to the Opera House gala caterers.', prevent='Raid the Container Habs lab, or intercept the courier at the Maglev Station or Maglev Depot.'),
    dict(hour='02:00', title='Sleeves for sale', place='BCP-STACK-BROKERS', event='The clinic sells Caspian Vance\'s sleeve. Lady Oriel Vance hires a hitman for whoever sold the pill: the trail points at Danny "Two-Coats" Mbeki.', prevent='Secure the clinic\'s Stack Vault, or reach Vesna Rhee first.'),
    dict(hour='03:00', title='Glass at the gala', place='BCP-OPERA-HOUSE', event='The Opera House gala. Flutter in the champagne mist. Twenty-three glassed, including a Protectorate under-secretary. Civic Center is locked down.', prevent='Stop the second batch before 03:00, or get inside and evacuate the Foyer Bar.'),
    dict(hour='04:00', title='Psychasec cleans up', place='BCP-CAUSEWAY-GATE', event='Psychasec ships the remaining Halcyon-7 off the Rock through the Causeway Gate to an aircar at the Skyport. Dr Varga leaves Bay City with it.', prevent='Hold the Causeway Gate, reach the Skyport first, or expose Halcyon-7 publicly before 04:00.'),
    dict(hour='05:00', title='Dawn and the story', place='BCP-SUTRO-MAST', event='Whatever is on Sunny\'s feed at dawn becomes the truth Bay City believes. If no one broadcasts, the official story wins: "bad Merge, accidental deaths, case closed".', prevent=''),
]

PRESSURE = [
    dict(id='lives', name='Lives', good='Most glassed victims freed: stacks pulled and resleeved, the clinic\'s vault opened, the second batch stopped.', bad='The glassed stay glassed. Their sleeves are sold by the end of the week.'),
    dict(id='cook', name='The Cook', good='Saint Ambrose Kell arrested (or dead) and the second batch destroyed.', bad='Ambrose disappears to another city with a recipe that sells itself.'),
    dict(id='source', name='The Source', good='Halcyon-7 proven and traced to Psychasec: the vials, the manifest, Dr Varga\'s testimony or the Cellhouse records.', bad='Psychasec\'s trial continues, renamed. The next storm drops something else.'),
    dict(id='badge', name='The Badge', good='The cover-up exposed: the amended manifest, Brandt\'s orders, Gaspar Dunne\'s bribe. Halloran\'s case reopened.', bad='BCPD closes ranks. The task force members are reassigned, or worse.'),
    dict(id='story', name='The Story', good='Sunny\'s feed (or another broadcast) tells the truth at dawn, with proof.', bad='The city hears "bad Merge, accidental deaths". Flutter becomes a legend, and demand rises.'),
]

ENDINGS = [
    dict(score='5', name='The Butterfly Stops', text='The city learns what Psychasec did, the glassed come home, and a Protectorate inquiry opens. The pregens are heroes for about a week, which in Bay City is a long time.'),
    dict(score='3–4', name='Partial Light', text='Some of the chain is broken. Read the good and bad lines for each pressure point: the ones left standing are next season\'s problems.'),
    dict(score='1–2', name='The Official Story', text='The cook or the company is gone, but the machine that made Flutter possible is untouched. One of the pregens is quietly offered a promotion to forget.'),
    dict(score='0', name='Glass City', text='The second batch spreads. The task force is stood down. In a month, Flutter is sold in Aerium bars as "Halo". Somewhere a new storm is building.'),
]

NPCS = [
    dict(id='NPC-AMBROSE', name='Ambrose “Saint” Kell', role='The cook', place='BCP-CONTAINER-HABS', thread='cook', kind='threat', base='ADV-THUG',
         look='Gaunt, sleeve-shopped twice, chemical-burned fingers, rosary of empty vial caps.',
         wants='To sell the second batch once at the price of a lifetime, then disappear.', secret='He knows Flutter glasses people. He thinks it is mercy.',
         tactic='Never fights fair; lab rigged with a solvent fire; uses runners as shields.'),
    dict(id='NPC-GEARBOX', name='Lula “Gearbox” Tran', role='Licktown fence', place='BCP-CHOP-SHOPS', thread='cook', kind='npc',
         look='Grease to the elbows, mag-lifter rig, a laugh like a dropped wrench.', wants='Out of this before Psychasec finds her.',
         secret='Her ledger names Eddo Paz as the seller and Ambrose as the buyer. She is Two-Coats\'s cousin.', tactic='Talks to anyone who protects her family.'),
    dict(id='NPC-EDDO', name='Eddo Paz', role='Crane Yard night foreman', place='BCP-CRANE-YARD', thread='paper', kind='npc',
         look='Hi-vis vest over a silk shirt he can\'t afford.', wants='Not to be the first domino.',
         secret='Kept one vial as insurance, taped under the Gatehouse desk.', tactic='Lies badly, then begs.'),
    dict(id='NPC-KOSK', name='Maren Kosk', role='Power Station shift engineer', place='BCP-POWER-STATION', thread='compound', kind='npc',
         look='Ear protectors round her neck, the stare of someone not sleeping.', wants='To know whether her switch-throw killed anyone.',
         secret='The dam order came with a Psychasec priority code: Alcatraz must keep power. Dogpatch did not.', tactic='Helps if treated as a witness, not a suspect.'),
    dict(id='NPC-VARGA', name='Dr Ilse Varga', role='Psychasec project lead, Halcyon-7', place='BCP-PSYCHASEC-CELLHOUSE', thread='compound', kind='npc',
         look='Immaculate grey sleeve, gloves always on.', wants='To finish the trial and leave the city with her results.',
         secret='Halcyon-7 was designed to make prisoners consent to anything. Her signed trial protocol is in Booking.', tactic='Negotiates, lawyers up, offers jobs.'),
    dict(id='NPC-SLADE', name='Corin Slade', role='Psychasec retrieval specialist', place='BCP-CHOP-SHOPS', thread='compound', kind='threat', base='ADV-HITMAN',
         look='Forgettable face, expensive boots, voice like a hotel lobby.', wants='All forty vials back, no witnesses.',
         secret='Slade is under orders to bring back one glassed victim alive for study.', tactic='Arrives one step behind the players and tries to make it one step ahead.'),
    dict(id='NPC-BRANDT', name='Captain Aurelio Brandt', role='BCPD precinct captain', place='BAY-PRECINCT', thread='badge', kind='npc',
         look='Old-school organic sleeve, coffee-stained medal ribbon.', wants='To keep his precinct funded and his officers alive.',
         secret='He received the order from a Protectorate under-secretary who will be at the Opera House gala. He kept a copy.', tactic='Stonewalls, then breaks if shown that Halloran was murdered.'),
    dict(id='NPC-HALLORAN', name='Dez Halloran', role='Glassed patrol officer', place='BAY-CLINIC', thread='badge', kind='npc',
         look='Big, kind face, empty eyes.', wants='(trapped) Out.', secret='He was investigating the vials before he was glassed. He was dosed deliberately by Corin Slade.',
         tactic='If reached in his stack he gives one name: "Slade".'),
    dict(id='NPC-OKONJO', name='Dr Pell Okonjo', role='Resleeving Clinic director', place='BAY-CLINIC', thread='heir', kind='npc',
         look='Warm voice, cold hands, beautiful clinic.', wants='The clinic out of debt.',
         secret='Twelve glassed stacks in the Stack Vault marked "pending payment". Three sleeves already sold.', tactic='Shields herself with paperwork and patient privacy.'),
    dict(id='NPC-RHEE', name='Vesna Rhee', role='Sleeve broker', place='BCP-STACK-BROKERS', thread='heir', kind='npc',
         look='Silver nails, a rotating smile, three phones.', wants='The best price for the cleanest sleeves.',
         secret='Her buyer for Caspian\'s sleeve is Lady Oriel Vance herself, who wants her son\'s body back without a scandal.', tactic='Sells information as readily as sleeves.'),
    dict(id='NPC-CASPIAN', name='Caspian Vance', role='The glassed heir', place='BAY-CLINIC', thread='heir', kind='npc',
         look='Beautiful, bored even now.', wants='(trapped) To tell Juniper it is not her fault.', secret='He went looking for Flutter on purpose after hearing Sunny\'s feed.', tactic='—'),
    dict(id='NPC-ORIEL', name='Lady Oriel Vance', role='Meth matriarch', place='BAY-SPIRE', thread='heir', kind='npc',
         look='Three hundred years in a twenty-five-year-old sleeve, every movement priced.', wants='Her son, her name clean, and someone to pay.',
         secret='She will trade the Protectorate under-secretary\'s secrets for Caspian\'s stack.', tactic='Hires people. Never threatens; arranges.'),
    dict(id='NPC-ILEANA', name='Father Tomas Ileana', role='Dolores Chapel priest', place='BCP-DOLORES-CHAPEL', thread='signal', kind='npc',
         look='Neo-C collar, boxer\'s nose.', wants='Somewhere safe for the glassed grounders in his crypt.',
         secret='He has hidden nine glassed grounders from the snatchers. One is awake inside and keeps tapping on the stack monitor.', tactic='Trusts the press, not the police.'),
    dict(id='NPC-DUNNE', name='Gaspar Dunne', role='Protectorate records clerk', place='BCP-PROTECTORATE-OFFICE', thread='paper', kind='npc',
         look='Tidy, frightened, wearing a new watch.', wants='To not be the one who goes down.', secret='The bribe went through the Old Banks: account 7-HAL.', tactic='Flips the moment he is offered immunity.'),
    dict(id='NPC-OKOYE', name='Ruth Okoye', role='Toll Authority analyst', place='BCP-TOLL-AUTHORITY', thread='paper', kind='npc',
         look='Reading glasses on a chain, three monitors.', wants='Someone to read her report.', secret='She has the scale data: KX-4471 crossed 120 kg light.', tactic='Helpful, scared, by the book.'),
    dict(id='NPC-SUTTER', name='Jax Sutter', role='Rival dealer, "clean Merge"', place='BCP-STACK-DEALERS', thread='street', kind='threat', base='ADV-THUG',
         look='Tracksuit, gold teeth, sleeve too young for his eyes.', wants='Ambrose dead and his customers back.', secret='Sunny\'s feed has been taking his money to call his product safe.', tactic='Ambushes; respects anyone who can hurt him.'),
    dict(id='NPC-BENNY', name='Benny Strand', role='Fight Pit bookmaker', place='BAY-PIT', thread='street', kind='npc',
         look='Visor, ledger tattoos, sweats when he lies.', wants='The book balanced.', secret='Flutter money is laundered through fight bets. The account is the same 7-HAL prefix as the bribe.', tactic='Talks for a bet in his favour.'),
    dict(id='NPC-MOTH', name='Moth', role='Runner, the first victim on screen', place='BCS-LICKTOWN', thread='cook', kind='npc',
         look='Sixteen, yellow raincoat, glassed.', wants='(trapped) Their mum.', secret='Moth ran Flutter for Ambrose and knows the lab door code.', tactic='If reached in their stack: the code, 4471.'),
]

PREGENS = [
    dict(id='PG01', name='Marisol Okafor-Reyes', rank='Detective Sergeant', archetype='Official', package='Police Officer', thread='cook', accent='#ff7a45',
         role='Licktown beat sergeant, BCPD Narcotics Task Force lead', age=41,
         attrs=dict(strength=38, perception=42, empathy=36, willpower=44, acuity=40, intelligence=34),
         sleeve=dict(type='natal', concept='Original organic sleeve, Licktown-born, scar through one eyebrow', health=12),
         skills={'Firearms': 3, 'Intimidation': 3, 'Investigation': 3, 'Read Person': 2, 'Pilot': 2},
         look=dict(build='broad', outfit='#2a3140', coat='#4a3324', hair='#151010', item='badge'),
         hook='You know every corner of Licktown and most of the people who sell on them. Moth went glassed on your street.',
         domino='Two years ago you let "Saint" Ambrose Kell walk from a cook charge in exchange for a name. If you had not, there would be no Flutter.',
         goal='Find the cook. Stop the second batch before it leaves Licktown.', leads=['BAY-MARKET', 'BCP-CHOP-SHOPS', 'BCP-CONTAINER-HABS'],
         baggage=['baggage-23', 'baggage-15', 'baggage-29']),
    dict(id='PG02', name='Teo Vashti', rank='Detective', archetype='Official', package='Investigator', thread='badge', accent='#6fa8ff',
         role='BCPD Homicide detective, attached to the task force', age=36,
         attrs=dict(strength=34, perception=44, empathy=38, willpower=40, acuity=44, intelligence=38),
         sleeve=dict(type='organic', concept='Mid-range organic sleeve, pressed suit, nicotine-stained fingers', health=11),
         skills={'Investigation': 3, 'Search': 3, 'Read Person': 3, 'Bureaucracy': 2, 'Firearms': 2},
         look=dict(build='lean', outfit='#20283a', coat='#2f3a52', hair='#2a1a10', item='badge'),
         hook='Dez Halloran was your first partner. He is lying glassed in a clinic and your captain has called it an accident.',
         domino='Last year you took a Psychasec "consulting fee" to sign off a death in custody on Alcatraz. It is in your bank records. It is how they know you can be bought.',
         goal='Prove Halloran was attacked, and who ordered the cover-up.', leads=['BAY-ALLEY', 'BAY-PRECINCT', 'BAY-CLINIC'],
         baggage=['baggage-29', 'baggage-23', 'baggage-11']),
    dict(id='PG03', name='Hollis Fenn', rank='Dr', archetype='Technician', package='Scientist', thread='compound', accent='#5ef0c4',
         role='BCPD forensic toxicologist', age=52,
         attrs=dict(strength=36, perception=40, empathy=34, willpower=38, acuity=46, intelligence=46),
         sleeve=dict(type='synthetic-mid', concept='Older synthetic sleeve with lab-grade optical sensors, slightly too still', health=10),
         skills={'Science': 4, 'Medicine': 3, 'Data Analysis': 3, 'Search': 2, 'Composure': 2},
         look=dict(build='slim', outfit='#e8e8e2', coat='#d8dcd4', hair='#9a9a9a', item='scanner', synth=True),
         hook='Moth\'s blood has a signature in it you have seen once before: in a sealed trial you worked on at Psychasec Alcatraz, twenty years ago.',
         domino='You helped develop Halcyon-3, the version that only made prisoners sleepy. You signed the NDA. Halcyon-7 is your work, grown up.',
         goal='Identify the compound, prove where it came from, and find a way to unglass the victims.', leads=['BAY-PRECINCT', 'BCP-CRANE-YARD', 'BCP-PSYCHASEC-CELLHOUSE'],
         baggage=['baggage-12', 'baggage-18', 'baggage-29']),
    dict(id='PG04', name='Ines “Rook” Calloway', rank='', archetype='Technician', package='Dipper', thread='paper', accent='#b9a2ff',
         role='BCPD Cyber Crimes contractor, on parole', age=29,
         attrs=dict(strength=30, perception=38, empathy=34, willpower=36, acuity=48, intelligence=44),
         sleeve=dict(type='organic', concept='Wiry organic sleeve with an illegal neural jack behind the ear', health=10),
         skills={'Digital Networking': 4, 'Data Engineering': 3, 'Data Analysis': 3, 'Stealth': 2, 'Bureaucracy': 1},
         look=dict(build='slim', outfit='#2a2236', coat='#3b2f52', hair='#b9a2ff', item='deck'),
         hook='BCPD owns your parole and your deck. Tonight they need you to find a container that officially never existed.',
         domino='Years ago you wrote the power-fail routine for the Crane Yard gantries as a freelance job. It has a four-second bug. You never patched it.',
         goal='Trace container KX-4471 and prove the manifest was changed, and by whom.', leads=['BCP-CRANE-YARD', 'BCP-TOLL-AUTHORITY', 'BCP-PROTECTORATE-OFFICE'],
         baggage=['baggage-11', 'baggage-12', 'baggage-21']),
    dict(id='PG05', name='Danny “Two-Coats” Mbeki', rank='', archetype='Criminal', package='Fixer', thread='street', accent='#ffc467',
         role='BCPD confidential informant, Licktown fixer', age=33,
         attrs=dict(strength=36, perception=40, empathy=44, willpower=34, acuity=40, intelligence=36),
         sleeve=dict(type='organic', concept='Handsome secondhand organic sleeve, always wearing two coats', health=11),
         skills={'Diplomacy': 3, 'Read Person': 3, 'Stealth': 2, 'Digital Networking': 2, 'Expression': 3},
         look=dict(build='average', outfit='#3a2f22', coat='#6b4a22', hair='#0f0c0a', item='device'),
         hook='You know everyone who sells, everyone who buys and everyone who owes. BCPD pays you to tell them who. Tonight it is personal: your cousin Gearbox fenced the vials.',
         domino='You sold a few Flutter pills at the Neon Nightclub before you knew what it was. One of them went to Juniper Vance.',
         goal='Keep Gearbox alive, stop a turf war, and make sure nobody finds out about the club.', leads=['BAY-PIT', 'BCP-CHOP-SHOPS', 'BCP-STACK-DEALERS'],
         baggage=['baggage-07', 'baggage-18', 'baggage-08']),
    dict(id='PG06', name='Kesh Arlo', rank='Officer (undercover)', archetype='Soldier', package='Infiltrator', thread='cover', accent='#ff5a6e',
         role='BCPD undercover officer, four months inside Saint Ambrose\'s crew', age=31,
         attrs=dict(strength=44, perception=42, empathy=32, willpower=40, acuity=36, intelligence=32),
         sleeve=dict(type='organic', concept='Hard organic combat sleeve, crew tattoos over CTAC scars', health=13),
         skills={'Brawl': 3, 'Stealth': 3, 'Firearms': 3, 'Athletics': 2, 'Composure': 3},
         look=dict(build='broad', outfit='#2b1d1d', coat='#3a2020', hair='#1a1210', item='blade'),
         hook='You are inside. Ambrose trusts you more than anyone in the crew. Tonight the crew is asking who talks to cops.',
         domino='You carried the crate of vials from the Chop Shops to the lab yourself. Your handler, Captain Brandt, told you not to log it.',
         goal='Stay alive inside, get proof of the lab and the second batch, and find out why Brandt went silent.', leads=['BCP-CONTAINER-HABS', 'BCP-SCRAPYARD', 'BAY-PRECINCT'],
         baggage=['baggage-24', 'baggage-08', 'baggage-29']),
    dict(id='PG07', name='Juniper Vance', rank='', archetype='Socialite', package='Heir/Heiress', thread='heir', accent='#e9cc8c',
         role='Meth heir, BCPD task force "civic donor"', age=27,
         attrs=dict(strength=32, perception=38, empathy=46, willpower=38, acuity=40, intelligence=38),
         sleeve=dict(type='organic', concept='Flawless designer organic sleeve, mourning clothes cut like armour', health=10),
         skills={'Diplomacy': 3, 'Expression': 3, 'Cultures': 3, 'Read Person': 2, 'Composure': 2},
         look=dict(build='slim', outfit='#e9cc8c', coat='#1b1712', hair='#d8c08a', item='device', acc='#e9cc8c'),
         hook='Your brother Caspian is glassed. Your mother wants it buried. You bought the task force its overtime budget so it would not be.',
         domino='You bought the pill that glassed Caspian, from a fixer at the Neon Nightclub. You told no one.',
         goal='Bring Caspian back, find out who sold the pill, and decide what your family does about it.', leads=['BAY-CLUB', 'BAY-CLINIC', 'BAY-SPIRE'],
         baggage=['baggage-30', 'baggage-20', 'baggage-29']),
    dict(id='PG08', name='Sunny Achterberg', rank='', archetype='Civilian', package='Entertainer', thread='signal', accent='#ff7fb0',
         role='Licktown pirate broadcaster, BCPD tip-line partner', age=24,
         attrs=dict(strength=32, perception=40, empathy=46, willpower=36, acuity=40, intelligence=36),
         sleeve=dict(type='organic', concept='Small bright organic sleeve, holo-earrings, rain-proof camera rig', health=10),
         skills={'Expression': 4, 'Diplomacy': 3, 'Digital Networking': 2, 'Detection': 2, 'Stealth': 2},
         look=dict(build='slim', outfit='#ff7fb0', coat='#2a1a26', hair='#ff7fb0', item='camera'),
         hook='Your feed reaches every screen in Licktown. BCPD pays you to run their tip line. You were the first to call it "glass Merge".',
         domino='Your warning made Flutter famous; demand doubled overnight. And Jax Sutter has been paying you to call his product safe.',
         goal='Get the true story, with proof, onto every screen in Bay City by dawn.', leads=['BCP-DOLORES-CHAPEL', 'BCP-SLUMS', 'BCP-SUTRO-MAST'],
         baggage=['baggage-23', 'baggage-19', 'baggage-29']),
]

HANDOUTS = [
    dict(id='H01', name='Moth\'s tox screen', text='Merge (empathin), 70%. Unknown binder, 30%: a stack-interface sedative. Dr Fenn recognises the signature: Psychasec trial compound, Halcyon series.', place='BAY-PRECINCT'),
    dict(id='H02', name='Crane Yard incident log', text='Gantry G3, 23:52 night of the storm: power-fail, load released, container KX-4471 split. Logged by E. Paz: "water-damaged, returned to sender".', place='BCP-CRANE-YARD'),
    dict(id='H03', name='Toll scale record', text='Alcatraz Causeway, KX-4471 inbound: declared 2,140 kg, weighed 2,020 kg. Flag raised by R. Okoye. Flag cleared by "PROT-OFFICE/GD".', place='BCP-TOLL-AUTHORITY'),
    dict(id='H04', name='Amended manifest', text='KX-4471. Original: "Halcyon-7, restricted, Psychasec clinical consignment". Amended three days later to "agricultural sedatives". Amending officer: G. Dunne.', place='BCP-PROTECTORATE-OFFICE'),
    dict(id='H05', name='Gearbox\'s ledger page', text='"40 x med vials (blue cap) from E.P., Crane Yd. Sold whole to S.A., 7 nights back. Kesh carried." (If the 22:00 raid happens, only the burnt corner survives.)', place='BCP-CHOP-SHOPS'),
    dict(id='H06', name='Account 7-HAL', text='Old Banks transfer slip: 7-HAL to G. Dunne, 40,000. 7-HAL also funds Fight Pit book account 7-HAL/BS.', place='BCP-OLD-BANKS'),
    dict(id='H07', name='The Psychasec chip', text='Found in Halloran\'s glove, logged into evidence, then missing. Contents: a vial inventory, "37 of 40 unrecovered", and a name: C. Slade.', place='BAY-PRECINCT'),
    dict(id='H08', name='Gala catering order', text='Maglev courier manifest, 01:00 service: "Opera House gala, Foyer Bar, scent mist cartridges x 40". The cartridges are the second batch.', place='BCP-MAGLEV-DEPOT'),
    dict(id='H09', name='"Pending payment"', text='Resleeving Clinic Stack Vault register: twelve stacks, including D. Halloran and C. Vance, status "pending payment". Sleeves: three "transferred to S.B."', place='BAY-CLINIC'),
    dict(id='H10', name='Halcyon-7 trial protocol', text='Psychasec Alcatraz, signed I. Varga: "objective: durable compliance in resleeved subjects; side effect: stack-sleeve decoupling (\'glassing\') at high dose. Not for declaration."', place='BCP-PSYCHASEC-CELLHOUSE'),
]

# Optional crossover notes when Cold Storage is also running (no pins; the GM reads these).
CROSSOVER = [
    dict(name='The Rainline', text='The Rainline\'s noodle stalls are where Moth bought dinner every night. Cold Storage investigators passing through hear the yellow-raincoat kid went glassed.'),
    dict(name='Blue Lotus, Black Water', text='The Blue Lotus Combine is offering Vesna Rhee double for any glassed sleeve. They want clean bodies for identity laundering. If both adventures share a world, Rhee\'s buyer list includes a Lotus account.'),
    dict(name='The Resurrection Ward', text='Two of the clinic\'s "pending payment" stacks were moved to the Resurrection Ward for long-term storage. Freeing them may draw attention from the Continuity Foundation.'),
    dict(name='Relay Seventeen', text='Sunny can borrow Relay Seventeen\'s needlecast uplink if the Sutro Mast is lost: one broadcast, city-wide, at the cost of owing Sable Needle a favour.'),
    dict(name='Anansi House', text='Anansi House\'s information brokers already know about account 7-HAL. They will trade it for something from Cold Storage\'s case.'),
]

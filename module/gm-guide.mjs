const SYS='altered-carbon-rpg';
export const GUIDE_VERSION='2.4.7';
export const GUIDE_NAME='Altered Carbon — GM Guide';

async function loadJSON(path){const r=await fetch(`systems/${SYS}/data/${path}`);if(!r.ok)throw new Error(`Unable to load ${path}`);return r.json();}
const e=v=>foundry.utils.escapeHTML(String(v??''));
const list=items=>`<ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul>`;
const table=(headers,rows)=>`<div class="ac-guide-table-wrap"><table class="ac-guide-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const shell=(title,kicker,body)=>`<section class="ac-gm-guide ac-shell"><header class="ac-guide-hero"><span>${e(kicker)}</span><h1>${e(title)}</h1></header>${body}</section>`;
const panel=(title,body,cls='')=>`<section class="ac-guide-panel ${cls}"><h2>${e(title)}</h2>${body}</section>`;
const callout=(title,body,cls='')=>`<aside class="ac-guide-callout ${cls}"><strong>${e(title)}</strong><p>${body}</p></aside>`;

function skillRows(skills){
  const order=['strength','perception','empathy','willpower','acuity','intelligence'];
  return order.map(attr=>{
    const names=skills.filter(s=>s.attribute===attr).map(s=>e(s.name)).join(' · ');
    return [`<strong>${e(attr.toUpperCase())}</strong>`,names];
  });
}

export async function buildGMGuidePages(){
  const [m,skills,presets,itemCatalog]=await Promise.all([loadJSON('mechanics-reference.json'),loadJSON('core-skills.json'),loadJSON('gm-presets.json'),loadJSON('item-catalog.json')]);
  const pages=[];
  const add=(name,content)=>pages.push({name,type:'text',text:{format:1,content},flags:{[SYS]:{gmGuidePage:true,guideVersion:GUIDE_VERSION}}});

  add('00 — Start Here',shell('GM Guide','SYSTEM OPERATIONS',
    panel('What this journal is',`<p><strong>Generated guide build: v${GUIDE_VERSION}.</strong></p><p>This is the table-facing GM reference for the unofficial Foundry implementation. It summarizes the rules the system automates, the rules that still require judgment, and the fastest way to call for checks during play.</p><p>For exhaustive catalog entries such as individual Traits, Baggage, equipment reference pages, and source-indexed material, use <strong>Altered Carbon — Rules Reference</strong>.</p>`)+
    panel('v1.4–v1.9 — Player, Combat, Clinical and Foundry Integration',`<p>The Actor Combat tab now provides a Zone Assistant, Cover and Stance controls, and a Resolution-phase Wound queue. The Gear tab can mark items Worn, Carried, Equipped or Stored and opens a Tech Point Upgrade Workbench. Use the Combat Console for the GM-guided opposed Grapple procedure, which consumes the combatants' committed Speed Dice.</p><p><strong>Resolution:</strong> queue incoming wound messages and resolve once, not once per attack. Mixed damage or Armor Piercing calls for explicit GM review. The GM should confirm unusual cover, armor, non-Armor Protection and source-specific Triggered Effects.</p><p><strong>Boundary:</strong> this release automates deterministic foundations; it does not claim full special attack, ammunition effect or canonical gear upgrade automation. Use v1.7 Clinical / Virtual Console for drugs, medical recovery, and DHF procedures; some advanced effects still need GM adjudication.</p>`)+
    panel('v2.1 Command Deck, Private Speed Dice & Temporal Uplink',`<p>Character sheets now open on a command-deck overview with immediate Health, Ego, Wounds, Speed Dice usage, Status Alerts, fast Skills and equipped Items. Expand <strong>DHF Profile & Resource Controls</strong> for less-used fields; the <strong>More</strong> menu groups extra tabs. Full equipment and Traits can be inspected through disclosure rows without entering edit mode.</p><p><strong>Speed Dice:</strong> GM clicks <em>New Turn / Roll Phase</em> in Tactical Console. Each player privately rolls their own d6 pool, selects one or more Active dice, then locks. The GM waits for <strong>all combatants locked</strong> and clicks <strong>Reveal Everyone</strong>. The shared chat card reveals the set simultaneously, showing Active and reserve results and <strong>USED 2/4</strong>-style counters. During Check/Resolution, spend used dice with the same console; once all Active dice are resolved, use <em>Next / Select Again</em> to let players lock a new subset of their original unspent pool without rerolling.</p><p>Only the owner and GMs receive the real private Roll ChatMessage. Public Combatant flags carry rolled/locked booleans and spent counts, but no dice values or Active indexes until GM reveal. Reveal refuses incomplete or invalid commitments. Manual action costs must still be spent deliberately; normal weapon and Skill rolls do not silently debit Speed Dice. Grapple does debit its two selected dice.</p><p><strong>Future Calendar:</strong> open the clock from the sheet or Game Settings. World settings control the base time zone and mapping of real year to fictional year (default 2026 → 2384); players may override only their viewing IANA time zone. This display is based on their real clocks, not Foundry's game.time.worldTime. The weekday and seasonal DST are based on real dates, with the year label projected.</p>`)+
    panel('v2.0 Core Parity Audit — Read This First','<p>This local release is not Foundry/Forge certified and does not automate the entire 2020 Core Rulebook. It includes 170 Core Traits with at least one authored numeric component, GM-only adjudication cards for 127 Traits with unfinished contextual or triggered clauses, and fixes gained Influence maximums and repeated Accuracy damage formulas. The original Core Rulebook takes precedence over the system when any rule remains GM-assisted.</p><p>Before updating a real campaign, read docs/CORE-RULE-PARITY-v2.0.md and docs/RUNTIME-TEST-v2.0.md. Back up the world, check Compendiums open in Foundry v14, and only migrate a duplicate world. No GitHub publishing action was performed.</p>')+
    panel('v2.4 Baseline Reconciliation',`<p>The original v1.4.3 bundle added separate Level Up, Core Equipment Library, GM Bonus Dice / Roll Requests, diagnostic checks and a bundled Cold Storage book viewer. These workflows are restored in v2.4 while preserving the newer mechanics and 11 Compendiums. <strong>Level Up</strong> is on an existing Actor sheet; <strong>Core Gear</strong> shows 95 enriched official Core Items. The archived v1.4.3 Cold Storage book updater is restricted so it cannot replace a live standalone Cold Storage v1.2+ game. See the source documentation for the ID crosswalk and excluded private page overlays.</p>`)+
    panel('v2.3 Full Trait Review Index and GM Prompt Cards',`<p>All 240 printed Core Traits are indexed for adjudication. Of these, 170 have at least one carefully scoped executable component, while 127 have incomplete clauses that can create GM-only chat reminders. All 79 Traits that lacked a numeric mapping in v2.2 are covered by source-linked private GM review, including the 70 that still have no safe numeric rule.</p><p><strong>Skill and weapon rolls:</strong> applicable, unresolved Traits trigger a separate whisper to the GMs. This private card contains the printed source effect, identifiers, implemented numeric keys and a <em>Review and record ruling</em button. Marking a ruling Applied requires a written explanation; it <strong>does not spend IP, award bonuses or mutate documents</strong>. The GM sees a <em>GM: Review owned Trait abilities</em> option on matching chat cards. From an Actor's Traits panel, players can use <em>Ask GM: Trait ruling</em> for non-dice abilities and narrative rights.</p><p>Network Requests and equipment upgrades pause for GM review when there are relevant unresolved Trait clauses; medical rest and resleeving also generate contextual prompts. Medicine / First Aid applies the Basic First Aid conditional bonus only with no active patient Injuries. Field Medic's Expert First Aid resolves chosen positive degrees as 1d6+IB per degree on a Short Rest or 1d10+IB per degree on a Long Rest; Expert Triage remains GM-selected. See docs/TRAIT-ADJUDICATION-v2.3.md.</p><p><strong>Limit:</strong> a mapping and GM prompt are not full 240-Trait rules parity or Foundry v14 certification. Back up a duplicate world and verify player/GM whisper permissions before use.</p>`)+
    panel('v1.9 Native Compendiums and World Migration','<p>Eleven system-owned native LevelDB Compendiums now carry the official catalogues and guides. Import entries into your world before customization; never edit an installed system pack as a world-storage substitute. A dedicated Vehicle Actor sheet provides structure, fuel, crew assignments, Pilot checks and onboard Items.</p><p>For existing worlds, open <strong>World Data Migration</strong> in Game Settings as GM. Review the dry-run and make a backup. The migration is add-only and requires explicit confirmation.</p>')+
    panel('The core play loop',list([
      '<strong>Describe the situation.</strong> Establish what is at stake and what happens if nobody intervenes.',
      '<strong>Choose the Skill.</strong> Use the Skill whose fictional action best matches the attempt.',
      '<strong>Set Difficulty.</strong> Difficulty reduces the Target Result; favorable Training, Gear, and explicit bonuses can raise it.',
      '<strong>Roll the Skill Die.</strong> Skill Level determines die size. Lower dice are better because checks are roll-under/at the Target Result.',
      '<strong>Read Degrees.</strong> The distance between the best legal result and the Target Result determines success or failure Degrees.',
      '<strong>Resolve consequences.</strong> Apply Triggered Effects, Wounds, Ego loss, Depletion, Requests, or narrative consequences only where the rules or fiction call for them.'
    ]))+
    callout('Rules basis',e(m.source),'violet')+
    callout('Fastest GM workflow','Open <strong>Altered Carbon — GM Control</strong> from the GM-only satellite-dish button in the <strong>Token Controls</strong> palette, select one or more player characters, choose a preset, and send it. Players answer directly from the chat card.','cyan')
  ));

  add('01 — Character Anatomy',shell('Character Anatomy','DHF / SLEEVE',
    panel('v1.5.0 Creator',`<p><strong>Guided Mode</strong> records each SP-backed Attribute roll and validates Skill, Specialisation, Trait and Baggage reroll spending. It offers all 30 Core Starting Packages as typed entitlements, and saves a full creation ledger under the Actor's system flags.</p><p><strong>Expedited Mode</strong> uses the Core shortcut: default Attributes and Skills, Starting Package, age resources, required Baggage. SP remains for later customization.</p><p><strong>Variants</strong>: Religious Coding and Envoy now expose verified Core choices; Combat Conditioning grants the chosen branches. AI starting points must be GM-provided.</p><p><strong>Review boundary</strong>: ambiguous gear configurations and narrative Baggage outcomes retain their Core source and require GM confirmation. Do not assume that all Baggage side effects were applied by the wizard.</p>`)+
    panel('Two layers of identity',`<p>A character is a persistent <strong>DHF/stack identity</strong> inhabiting a current <strong>Sleeve</strong>. The system deliberately separates those layers.</p>`+
      table(['Layer','What lives there'],[
        ['Sleeve','Strength, Perception, Health, Damage Threshold, physical technology, body status.'],
        ['DHF / Stack','Empathy, Willpower, Acuity, Intelligence, Skills, Ego, SP, IP, memories, relationships and continuity.']
      ]))+
    panel('Attribute Bonus',`<p>The Attribute Bonus is the tens digit of an Attribute. It is used throughout the system for Target Results, Speed Dice, resources, damage procedures and recovery.</p>`)+
    panel('Core derived values',table(['Value','Rule'],[
      ['Damage Threshold',e(m.characterResources.damageThreshold)],
      ['Birth/Natal/Clone Health',e(m.characterResources.health.birthNatalClone)],
      ['Synthetic Low Health',e(m.characterResources.health.syntheticLow)],
      ['Synthetic Mid Health',e(m.characterResources.health.syntheticMid)],
      ['Synthetic High Health',e(m.characterResources.health.syntheticHigh)]
    ]))
  ));

  add('02 — Skills & Target Results',shell('Skill Checks','CORE RESOLUTION',
    panel('Skill dice',table(['Skill Level','Die','Automatic-pass TR'],m.skillLevels.map(x=>[x.level,`d${x.die}`,x.autoPassTR])))+
    panel('Target Result',`<p>Start from the relevant Attribute Bonus unless a rule or scenario provides a fixed base TR. Apply Difficulty, then the best applicable Training Value and Gear Bonus, then any explicitly stackable bonuses.</p><p><strong>Higher TR is better. Lower die results are better.</strong></p>`)+
    panel('Degrees',`<p>A result at the TR succeeds. The farther a successful result is below the TR, the more success Degrees it generates; the farther a failed result is above the TR, the more failure Degrees it generates. The system caps displayed Degrees at five.</p>`)+
    panel('All 32 core Skills',table(['Attribute','Skills'],skillRows(skills)))+
    callout('Do not roll without stakes','If success and failure would lead to the same outcome, or if the task is routine at the character’s level, resolve it without a check.','violet')
  ));

  add('03 — Luck, Bonus Dice & Outcomes',shell('Luck & Outcomes','ROLL MODIFIERS',
    panel('Bonus Dice',`<p>Bonus Dice provide alternate results; the best legal result is used. They do not independently create an Ace or Catastrophe.</p>`)+
    panel('Luck modes',table(['Mode','Effect'],m.luckModes.map(x=>[e(x.name),e(x.effect)])))+
    panel('Special outcomes',list([
      '<strong>Ace:</strong> the natural Skill Die shows 1.',
      '<strong>Stroke of Luck:</strong> the system identifies the source-defined interaction of an Ace and Luck result.',
      '<strong>Catastrophe:</strong> the natural Skill Die fails on its maximum face while the Luck Die also shows its maximum face. A successful Bonus Die does not erase this natural Catastrophe.',
      '<strong>Chat colors:</strong> system-generated check cards grade success and failure visually from one to five Degrees; Catastrophes, Aces, and Strokes receive distinct treatments.'
    ]))
  ));

  add('04 — Difficulty & Situational Rolls',shell('Situational Rolls','GM ADJUDICATION',
    panel('Set Difficulty from the fiction',`<p>Difficulty is a penalty to the Target Result. Use it for environmental pressure, distance, poor position, social mismatch, injuries, or other factors that materially make the attempt harder. Avoid stacking several penalties for the same fictional cause.</p>`)+
    panel('Common automated situational rules',table(['Situation','System behavior'],[
      ['Incapacitated','Blocks Skill Checks.'],
      ['Virtual','Substitutes Willpower for Strength and Acuity for Perception where required; applies projection Difficulty for normal DHFs and the Envoy exception.'],
      ['Dazzled','Can reduce sight-reliant Skill Level or automatically fail a sight-only check.'],
      ['Prone','Adds Difficulty to actions while the status applies.'],
      ['Malnourished','Applies its severity-based Difficulty.'],
      ['Enraged','Blocks Intelligence/Acuity checks and penalizes non-Strength checks as implemented.'],
      ['Panic','Reduces affected Skill Levels.'],
      ['Drenched','Penalizes Composure, Discipline, Endurance and Survival.'],
      ['Out of Place','Penalizes Stealth, Diplomacy and Expression where the condition applies.'],
      ['Encumbered / Bone Injury','Adds Strength-related Difficulty according to the active state.']
    ]))+
    panel('Opposed checks',`<p>When characters directly oppose one another, compare success first, then Degrees, then the relevant Attribute as the tiebreaker. The system’s opposed-check workflow handles that comparison.</p>`)+
    callout('Cold Storage pattern','Detection finds the anomaly; Search locates evidence; Investigation connects evidence; Read Person interprets a person; Data Analysis interprets information. Use the narrowest Skill that matches what the character is actually doing.','cyan')
  ));

  add('05 — Combat: Intent, Check, Resolution',shell('Combat Round','SPEED DICE',
    panel('Speed Dice',`<p>${e(m.combat.speedDice)}</p>`)+
    panel('Three phases',table(['Phase','GM procedure'],[
      ['Intent',e(m.combat.intent)],
      ['Check','Resolve the active character’s declared checks, Save Throws, opposed actions and Triggered Effects.'],
      ['Resolution','Apply the consequences of the Turn/Resolution, including aggregate Wounds and Protection timing.']
    ]))+
    panel('Who acts next?',`<p>${e(m.combat.activeOrder)}</p>`)+
    panel('Action complexity',table(['Action','Speed cost'],Object.entries(m.combat.actionComplexity).map(([k,v])=>[e(k),e(v)])))+
    panel('Additional actions',`<p>${e(m.combat.additionalActions)}</p>`)
  ));

  add('06 — Combat: Movement, Range & Defense',shell('Combat Positioning','TACTICAL PROCEDURE',
    panel('Zones',table(['Range','Guidance'],Object.entries(m.combat.zones).map(([k,v])=>[e(k),e(v)])))+
    panel('Save Throws and defense',`<p>Defensive Skills are still Skill Checks. Uncommitted Speed Dice remain important because they can be resolved later for Save Throws and defensive Triggered Effects.</p><p>When a weapon, Skill, or Triggered Effect changes Protection, Defense, Accuracy or required Degrees, use that specific rule rather than inventing a second generic modifier.</p>`)+
    panel('Protection timing',`<p>${e(m.combat.protectionTiming)}</p>`)+
    callout('GM habit','Ask players to state Intent before dice are committed. The tactical meaning of Speed Dice depends on knowing what the character is trying to achieve.','violet')
  ));

  add('07 — Damage, Dying & Healing',shell('Damage & Survival','ORGANIC DAMAGE',
    panel('Wounds and Health',`<p>${e(m.damageAndDying.wounds)}</p><p>${e(m.damageAndDying.protection)}</p>`)+
    panel('Dying',`<p>${e(m.damageAndDying.dying)}</p><p>${e(m.damageAndDying.stable)}</p>`)+
    panel('Instant-death triggers',list(m.damageAndDying.instantDeath.map(e)))+
    panel('Real Death',`<p>${e(m.damageAndDying.realDeath)}</p>`)+
    panel('SP mitigation',`<p>${e(m.damageAndDying.spMitigation)}</p>`)+
    panel('Healing',table(['Rest','Rule'],[["Short Rest",e(m.damageAndDying.healing.shortRest)],["Long Rest",e(m.damageAndDying.healing.longRest)]]))
  ));

  add('08 — Conditions & Injuries',shell('Conditions & Injuries','STATUS MATRIX',
    panel('Conditions',table(['Condition','Effect'],m.conditions.map(x=>[e(x.name),e(x.effect)])))+
    panel('Injuries',table(['Injury','Effect'],m.injuries.map(x=>[e(x.name),e(x.effect)])))+
    panel('Scandals',table(['Scandal','Effect'],m.scandals.map(x=>[e(x.name),e(x.effect)])))+
    callout('Automation boundary','The sheet and roll engine automate deterministic penalties where the source rule is clear. Context-dependent clauses remain visible to the GM rather than being silently guessed.','cyan')
  ));

  add('09 — Gear, Depletion & Weapons',shell('Gear & Depletion','RESOURCE PRESSURE',
    panel('Depletion sequence',list([
      e(m.depletion.use),e(m.depletion.check),e(m.depletion.targetResult),e(m.depletion.failure),e(m.depletion.automatic)
    ]))+
    panel('Firing modes',table(['Mode','Effect'],Object.entries(m.depletion.firingModes).map(([k,v])=>[e(k),e(v)])))+
    panel('Counter-only gear',`<p>${e(m.depletion.counterOnly)}</p>`)+
    panel('Common gear rules',table(['Rule','Effect'],m.gearRules.map(x=>[e(x.name),e(x.effect)])))+
    panel('Tech Points',`<p><strong>Upgrade Kit:</strong> ${e(m.techPoints.upgradeKit)}</p><p><strong>Chassis Upgrade:</strong> ${e(m.techPoints.chassisUpgrade)}</p><p><strong>Hardwired:</strong> ${e(m.techPoints.hardwired)}</p><p><strong>Model Variant:</strong> ${e(m.techPoints.modelVariant)}</p><p><strong>Attachments:</strong> ${e(m.techPoints.attachments)}</p><p><strong>Linked:</strong> ${e(m.techPoints.linked)}</p><p><strong>Narrative Upgrade:</strong> ${e(m.techPoints.narrativeUpgrade)}</p>`)+
    panel('Protection and weapon properties',`<p>Weapon Items carry Accuracy, Armor Piercing, Deadly, damage type, firing mode, Triggered Effects and Depletion data. Use the sheet’s <strong>Use / Attack</strong> action so the system can keep these procedures connected.</p>`)
  ));

  const itemCounts=itemCatalog.items.reduce((out,item)=>{out[item.type]=(out[item.type]||0)+1;return out;},{});
  add('09A — Official Item Library',shell('Core Item Library','CHAPTER 6 // v1.3',
    panel('Canonical typed records',`<p>v1.3 introduced <strong>${itemCatalog.count} canonical Core Item templates</strong>. The Rules Browser can add one record to the active Actor, and a GM can install/refresh the entire set into the world Item Directory.</p>`+
      table(['Type','Records'],Object.entries(itemCounts).map(([type,count])=>[e(type),count])))+
    panel('How to use it',list([
      'Open <strong>Rules Reference</strong> from a character sheet.',
      'Expand <strong>Official Core Item Library</strong>.',
      'Use <strong>Add to Actor</strong> for a single item, or as GM use <strong>Install / Refresh 95-Item World Library</strong> to create reusable world Items.',
      'Weapons can choose typed ammunition using <strong>Use / Attack</strong>. Drugs are activated through the <strong>Clinical / Virtual Console</strong> with doses, administration, Addiction and Endurance metabolization procedures.',
      'Airbike, Aircar and Ground Car remain Vehicle Actor templates rather than inventory Items.'
    ]))+
    callout('Automation boundary','The catalog is complete for the agreed 2020 Core equipment set. Some special Triggered Effects, drug formulation choices, worn Gear corner cases and augment-derived modifiers still require GM decisions and future effect-rule migrations.','violet')
  ));

  add('10 — Wealth, Credits & Resource Catalogs',shell('Economy','WEALTH / PRICE',
    panel('Wealth Levels',table(['Level','Band'],Object.entries(m.economy.wealthLevels).map(([k,v])=>[k,e(v)])))+
    panel('Price Levels',table(['Level','Band'],Object.entries(m.economy.priceLevels).map(([k,v])=>[k,e(v)])))+
    panel('Deferral',table(['Purchase gap','Deferral'],Object.entries(m.economy.deferral).map(([k,v])=>[e(k),e(v)])))+
    panel('Credits',`<p>${e(m.economy.credits)}</p><p>${e(m.economy.untraceableCredits)}</p>`)+
    panel('Resource Catalog',list([e(m.economy.resourceCatalog.capacity),e(m.economy.resourceCatalog.take),e(m.economy.resourceCatalog.belowWealth),e(m.economy.resourceCatalog.exhausted)]))
  ));

  add('11 — Contacts, Networks & Requests',shell('Requests','SOCIAL INFRASTRUCTURE',
    panel('What a Request does',`<p>Requests convert a Contact or Network into material support, information, permissions, resupply or other source-defined assistance. Influence Points are deliberately scarce; use Requests when the fiction supports a real relationship or institutional route.</p>`)+
    panel('Request Levels',table(['Level','Base TR','Network die','Exhaust at'],Object.entries(m.requests.levels).map(([level,x])=>[level,e(x.baseTR),`d${x.networkBonusDie}`,`${x.exhaustDegrees} success Degrees`])))+
    panel('Contact affiliation',table(['Affiliation','SP','Resource dice','TR bonus'],m.requests.contactAffiliation.map(x=>[e(x.id),x.sp,x.resourceDice,x.trBonus])))+
    panel('Material Support / Resupply',`<p>${e(m.requests.materialSupportRule)}</p>`+table(['Request','Physical DP','Powered DP','Rare DP'],Object.entries(m.requests.materialSupport).map(([level,x])=>[`Lv.${level}`,x.physicalDP,x.poweredDP,x.rareDP])))+
    panel('Work for Hire / Bribery',`<p>${e(m.requests.workForHire)}</p>`)+
    callout('Sheet workflow','Networks expand inline in View Mode. Their level, Request Bonus, categories and exhaustion state should be checked before adjudicating support.','violet')
  ));

  add('12 — Sleeves, Resleeving & Continuity',shell('Resleeving','BODY / IDENTITY',
    panel('Sleeve quality',table(['Sleeve','STR','PER','Health'],Object.entries(m.sleeves).map(([name,x])=>[e(name),`${x.strength[0]}–${x.strength[1]}`,`${x.perception[0]}–${x.perception[1]}`,e(x.health)])))+
    panel('Cross-sleeving',`<p>${e(m.resleeving.crossSleeve)}</p>`)+
    panel('Downgrade table',table(['Transfer','Loss'],Object.entries(m.resleeving.downgrade).map(([k,v])=>[e(k),e(v)])))+
    panel('Double-sleeving',`<p>${e(m.resleeving.doubleSleeving)}</p>`)+
    callout('Continuity is story, not just bookkeeping','The sleeve archive is meant to preserve former bodies, dates, causes of transfer, appearance and complications so identity history remains playable.','cyan')
  ));

  add('13 — Ego, Backups & Psychosurgery',shell('Ego & Backups','DHF INTEGRITY',
    panel('Clinical procedures',`<p>From the Actor Gear or Combat tab, open <strong>Clinical / Virtual Console</strong>. Administer the 2020 Core drugs with method-specific checks; record Addiction, Resist Craving, Endurance each Round, and clear passed metabolization at Encounter end. Rapid Regrowth Bios uses Medicine TR8 administration and separate Short/Long Rest effects. Bio Welder resolves source-defined Tissue/Bone Weld effects. Painkiller aftereffects and Merge Hangover track elapsed fictional time.</p><p>Permanent EP loss limits future recovery; Virtual exposure, Psychosurgery, Viral Strikes, and GM-supervised Interrogation are recorded on the target DHF.</p>`)+
    panel('Ego',`<p>${e(m.characterResources.ego)}</p>`)+
    panel('Common Ego-loss modifiers',table(['Modifier','Rule'],Object.entries(m.ego.lossModifiers).map(([k,v])=>[e(k),e(v)])))+
    panel('Ego-loss events',table(['Event','Human','AI'],m.ego.eventLoss.map(x=>[e(x.event),e(x.human),e(x.ai)])))+
    panel('Recovery',table(['Method','Rule'],Object.entries(m.ego.recovery).map(([k,v])=>[e(k),e(v)])))+
    panel('Backups',table(['Type','Rule'],[["Standard",e(m.backup.basic)],["Routine",e(m.backup.routine)],["Payment",e(m.backup.payment)]]))
  ));

  add('14 — Virtual, Viruses & AI',shell('Virtual & Digital Threats','SIMULSPACE',
    panel('Virtual projection',table(['Rule','Value'],[
      ['Attribute substitution',`Strength → ${e(m.virtual.attributeSubstitution.strength)}; Perception → ${e(m.virtual.attributeSubstitution.perception)}`],
      ['Normal projection Difficulty',m.virtual.projectionDifficulty],
      ['Envoy projection Difficulty',m.virtual.envoyProjectionDifficulty],
      ['Damage target',e(m.virtual.damageTarget)]
    ]))+
    panel('Time in Virtual',table(['Band','Ego','Save / instruction'],m.virtual.timeBands.map(x=>[e(x.id),e(x.ego),`${e(x.save)} — ${e(x.instruction)}`])))+
    panel('Viral classes',table(['Class','Dice','Max dice','Save Difficulty'],Object.entries(m.viralClasses).map(([k,x])=>[e(k),e(x.dice),x.maxDice==null?'No cap':x.maxDice,x.saveDifficulty])))+
    panel('AI',list([e(m.variants.ai.restrictions),e(m.variants.ai.ego),e(m.variants.ai.licenses),e(m.variants.ai.virtual),e(m.variants.ai.networking)]))
  ));

  add('15 — Character Variants',shell('Variants','ADVANCED CHARACTER RULES',
    panel('Religious Coding',list([e(m.variants.religious.convert),e(m.variants.religious.earthbound),e(m.variants.religious.orthodoxy),...m.variants.religious.chooseOne.map(e)]))+
    panel('Envoy',list([...m.variants.envoy.always.map(e),...m.variants.envoy.chooseTwo.map(e)]))+
    panel('Meth',list(Object.values(m.variants.meth).map(e)))+
    panel('AI',list(Object.values(m.variants.ai).map(e)))
  ));

  add('16 — Vehicles, Minions & Nemeses',shell('Adversaries & Vehicles','GM SCALE',
    panel('Vehicles',`<p>${e(m.vehicle.structure)}</p><p>${e(m.vehicle.sizePenalty)}</p><p>${e(m.vehicle.crew)}</p>`)+
    panel('Travel fuel DP',table(['Travel','DP'],Object.entries(m.vehicle.travelFuelDP).map(([k,v])=>[e(k),e(v)])))+
    panel('Minions',`<p>${e(m.adversaries.minion)}</p>`)+
    panel('Nemeses',list(m.adversaries.nemesis.map(e)))+
    panel('Non-combatant pressure',list(m.adversaries.nonCombatant.map(e)))
  ));

  add('17 — Advancement & Campaign Rewards',shell('Advancement','LONG-TERM PLAY',
    panel('Skill advancement',table(['Advance','SP'],Object.entries(m.skillAdvancement).map(([k,v])=>[e(k),e(v)])))+
    panel('Trait costs',table(['Commonality','Unlock','Tiers'],Object.entries(m.traitCosts).map(([k,v])=>[e(k),v.unlock,e(v.tiers.join(' / '))])))+
    panel('Campaign rewards',`<p>${e(m.campaign.sessionReward)}</p><p>${e(m.campaign.campaignReward)}</p>`)+
    panel('Optional: Do or Die',`<p>${e(m.campaign.optionalDoOrDie)}</p>`)+
    callout('Catalog content','The Rules Reference contains the full structured Trait and Baggage catalogs used by the system. Keep this GM Journal focused on procedures at the table.','violet')
  ));

  const byCategory={};for(const p of presets.presets)(byCategory[p.category]??=[]).push(p);
  add('18 — Cold Storage Roll Presets',shell('Cold Storage Presets','GM CONTROL PANEL',
    panel('How to use them',`<p>The GM Control panel contains ready-to-send checks chosen for investigation, identity, infiltration, technical, physical, movement, knowledge and Virtual scenes. Select one or more character recipients and press <strong>Send Request</strong>. Each player answers from the card in chat; the result is returned with color-coded Degrees.</p>`)+
    Object.entries(byCategory).map(([category,items])=>panel(category,table(['Preset','Skill','Difficulty','Use'],items.map(x=>[e(x.label),e(x.skill),x.difficulty,e(x.gmNote)])))).join('')+
    callout('Presets are not scripts','Change the Difficulty or use the custom request tool whenever the fiction demands it. The preset name is a prompt, not a replacement for GM judgment.','cyan')
  ));

  add('19 — GM Quick Checklist',shell('GM Quick Checklist','AT THE TABLE',
    panel('Before play',list([
      'Open the GM Control panel from the satellite-dish button in Token Controls and confirm the intended player characters have owners.',
      'Keep the Combat Console available for Speed Dice encounters.',
      'Use the Rules Reference when a Trait, Triggered Effect, gear entry or edge case needs exact source detail.',
      'Treat the character sheet as View Mode by default; Edit Mode is for changing records, not reading them.'
    ]))+
    panel('When a roll happens',list([
      'State the stakes and the Skill.',
      'Set Difficulty once from the actual obstacle.',
      'Apply current conditions and gear.',
      'Read success/failure Degrees from the chat card.',
      'Resolve the rule or fictional consequence immediately.',
      'For group checks, send a single GM Request to multiple characters so every response remains together in the chat log.'
    ]))
  ));

  add('20 — GM Control & Chat Requests',shell('GM Control','TOKEN PALETTE / CHAT REQUESTS',
    panel('Opening the panel',`<p>For a GM, the <strong>Token Controls</strong> palette includes an Altered Carbon satellite-dish tool. Press it to open <strong>Altered Carbon — GM Control</strong>. The same panel remains available from Game Settings as a fallback.</p>`)+
    panel('Sending a request',list([
      '<strong>Select recipients.</strong> Choose one or more player characters in the GM Control panel.',
      '<strong>Choose a preset or custom check.</strong> Presets are tuned for common Cold Storage and cyber-noir situations.',
      '<strong>Send Request.</strong> One shared card is posted to chat for the selected characters.',
      '<strong>Players respond in chat.</strong> Each eligible owner clicks their character’s roll button; they cannot answer for unowned characters.',
      '<strong>Read the shared result card.</strong> Responses are written back into the original request so the whole group check stays together.'
    ]))+
    panel('Result colors',table(['Result','Chat treatment'],[
      ['Success +1 to +5','Green through cyan/gold as success Degrees rise.'],
      ['Failure -1 to -5','Amber through orange/red as failure Degrees rise.'],
      ['Ace','Distinct cyan diagnostic treatment.'],
      ['Stroke of Luck','Distinct gold treatment.'],
      ['Catastrophe','High-alert red treatment.']
    ]))+
    callout('Accessibility','Color is supplemental. Every card also prints the outcome and Degree value in text.','violet')
  ));

  add('21 — Chapter 7 GM Operations',shell('GM Operations','ADVERSARIES / CONTACTS / REQUESTS',
    panel('Opening the Chapter 7 console',`<p>Click <strong>GM Operations</strong> inside GM Control, or open the GM Operations menu in Game Settings. This panel is restricted to the GM. Choose an owning player character/AI before developing Contacts and Networks.</p>`)+
    panel('Core adversaries',`<p>Eight printed opponent examples can be created as Threat Actors with all 32 Skill records and the printed Attribute baselines. Minion and legal Nemesis options are selectable. The console can equip unambiguous canonical gear; model choices and unusual triggered combat effects remain GM-reviewed; no unsupported damage numbers are invented.</p>`)+
    panel('Networks and Contacts',`<p>Install the seven official Network categories idempotently; create an organization-specific Network on a character. For a Contact, roll the social-standing and history d10, relationship Virtue/Flaw d12, and affiliation resource d6. Categories and affiliation SP are checked. The additional development SP, Meth status and narrative prerequisites need GM confirmation.</p>`)+
    panel('Noir / Action campaign dice',`<p>Store one world-scoped campaign. Choose the Genre and advancement method. At the end of each session, GM chooses the appropriate Campaign Die from d4 through d12; the console logs each result and either re-rolls the growing dice pool or adds new results to the running total. It offers an original prose prompt in the relevant published progress band and a suggested SP reward, which the GM may override.</p>`)+
    panel('Request workflows',`<p>Spend IP1 for regular favors, Material Support, Resupply, and General Request modifiers. Paid Work for Hire / Bribery requires a confirmed equivalent Price Level purchase, but does not cost IP. The Request check uses an appropriate Skill and Network Bonus Die and may exhaust a Contact/Network on either exceptional success, exceptional failure or a Catastrophe. GM controls restore access when the Core requirement is satisfied.</p>`)+
    callout('Scope and live-world acceptance','Automated tests validate deterministic rules. Contact beliefs, campaign fiction, equipment suggestions, employer/payment consequences, and mixed social interactions remain GM-led. Live Foundry v14, Forge and multiplayer testing are pending.','violet')
  ));

  add('22 — Private Speed Dice & Future Calendar',shell('Private Initiative and Future Clock','TACTICAL UPLINK / TEMPORAL PROJECTION',
    panel('Core Speed Dice fundamentals',`<p>Roll one d6 for each natural Perception Bonus, modified as applicable (minimum one, natural maximum five). The Speed Dice pool is rolled once at the end of each Turn's Intent Phase. Characters privately choose Active dice for each Round; the combatant with the smallest sum acts first. Unspent dice can be spent for defense, movement and other legal effects, with a new Active selection when the current set resolves. Extra Speed Dice granted by special rules mid-turn still require GM confirmation.</p>`)+
    panel('Multi-client workflow',list([
      'GM starts the next Intent phase after all combatants are in the Combat Tracker.',
      'Each player rolls their own Speed Dice privately; results are whispered to that player and the GMs.',
      'Players select at least one unspent die and click Lock; GM can unlock before reveal if a change is needed.',
      'GM waits for the status to show every character Locked, then clicks Reveal Everyone: one public roster card shows all results.',
      'Used/Total counts remain visible even before the results are revealed; spend each die as the actions and defenses happen.',
      'Next / Select Again runs a new private Active-selection round using the original unspent dice; it does not reroll the Turn.',
      'When every Speed Die is spent, start a new Turn and repeat the Intent phase.'
    ]))+
    panel('Temporal Uplink',`<p>Open via any character sheet's Calendar action, via Game Settings or via game.alteredCarbon.openCalendar(). World GM can set an IANA time zone and base real/fictional years; players can select their own display time zone in the calendar. The real date and clock determine month, day, weekday, daylight saving and clock time; only the year label is projected, beginning at 2384 by default. The calendar does not change game.time.worldTime, downtime clocks, or a Virtual time-dilation ratio.</p>`)+
    callout('Release qualification','Automated tests cover privacy states, unlocking, multi-round selections, d6 caps, timezone and DST. Foundry v14 / Forge live multi-client data permissions and native chat rendering remain to be tested.','violet')
  ));

  return pages;
}

export async function ensureGMGuide({refresh=false,open=false}={}){
  if(!game.user.isGM)throw new Error('GM only.');
  const pages=await buildGMGuidePages();
  let journal=game.journal.find(j=>j.getFlag(SYS,'gmGuide')===true)||game.journal.find(j=>j.name===GUIDE_NAME);
  if(!journal){
    journal=await foundry.documents.JournalEntry.implementation.create({name:GUIDE_NAME,ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},flags:{[SYS]:{gmGuide:true,guideVersion:GUIDE_VERSION}},pages});
    ui.notifications.info(`${GUIDE_NAME} created.`);
  }else{
    const installedVersion=String(journal.getFlag(SYS,'guideVersion')||'');
    const allPages=[...(journal.pages||[])];
    const generatedPages=allPages.filter(page=>page.getFlag?.(SYS,'gmGuidePage')===true);
    const generatedPageCount=generatedPages.length;
    const legacyGeneratedGuide=generatedPageCount===0&&allPages.length>0;
    const needsRefresh=refresh||installedVersion!==GUIDE_VERSION||generatedPageCount!==pages.length;
    if(needsRefresh){
      // v1.2.0 and earlier generated pages were not individually flagged, so
      // the first migration replaces that legacy page set. From v1.2.1 onward
      // only system-generated pages are replaced; a GM may safely append their
      // own unflagged campaign-notes pages to this Journal.
      const generatedNames=new Set(pages.map(page=>page.name));
      const pagesToReplace=legacyGeneratedGuide?allPages.filter(page=>generatedNames.has(page.name)):generatedPages;
      const ids=pagesToReplace.map(p=>p.id).filter(Boolean);
      if(ids.length)await journal.deleteEmbeddedDocuments('JournalEntryPage',ids);
      await journal.createEmbeddedDocuments('JournalEntryPage',pages);
      await journal.update({name:GUIDE_NAME,ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},[`flags.${SYS}.gmGuide`]:true,[`flags.${SYS}.guideVersion`]:GUIDE_VERSION});
      ui.notifications.info(`${GUIDE_NAME} refreshed to v${GUIDE_VERSION}.`);
    }
  }
  if(open){
    try{await journal.sheet?.render?.({force:true});}catch(_error){journal.sheet?.render?.(true);}
  }
  return journal;
}

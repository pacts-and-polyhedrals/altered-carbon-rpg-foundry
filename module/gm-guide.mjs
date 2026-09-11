const SYS='altered-carbon-rpg';
export const GUIDE_VERSION='1.4.1';
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
  const [m,skills,presets]=await Promise.all([loadJSON('mechanics-reference.json'),loadJSON('core-skills.json'),loadJSON('gm-presets.json')]);
  const pages=[];
  const add=(name,content)=>pages.push({name,type:'text',text:{format:1,content},flags:{[SYS]:{gmGuidePage:true,guideVersion:GUIDE_VERSION}}});

  add('00 — Start Here',shell('GM Guide','SYSTEM OPERATIONS',
    panel('What this journal is',`<p><strong>Generated guide build: v${GUIDE_VERSION}.</strong></p><p>This is the table-facing GM reference for the unofficial Foundry implementation. It summarizes the rules the system automates, the rules that still require judgment, and the fastest way to call for checks during play.</p><p>For exhaustive rule references use <strong>Altered Carbon — Rules Reference</strong>. For ready-to-use weapons, ammunition, apparel, devices, decks, software, drugs and sleeve augmentations use <strong>Altered Carbon — Core Equipment Library</strong>.</p>`)+
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
    panel('Use the Level Up wizard','<p>Open an existing character and choose <strong>Level Up</strong>. Skills, Attributes, Specialisations and Traits show costs before purchase and retain an advancement history. Create new DHFs with <strong>Character Creator</strong> in the Actors tab. The creator now includes a starting SP allocation step.</p>')+
    panel('Skill advancement',table(['Advance','SP'],Object.entries(m.skillAdvancement).map(([k,v])=>[e(k),e(v)])))+
    panel('Trait costs',table(['Commonality','Unlock','Tiers'],Object.entries(m.traitCosts).map(([k,v])=>[e(k),v.unlock,e(v.tiers.join(' / '))])))+
    panel('Campaign rewards',`<p>${e(m.campaign.sessionReward)}</p><p>${e(m.campaign.campaignReward)}</p>`)+
    callout('Catalog content','The Rules Reference contains the full structured Trait and Baggage catalogs used by the system. Keep this GM Journal focused on procedures at the table.','violet')
  ));

  const byCategory={};for(const p of presets.presets)(byCategory[p.category]??=[]).push(p);
  add('18 — Cold Storage Roll Presets',shell('Cold Storage Presets','GM CONTROL PANEL',
    panel('The complete adventure book','<p>Use <strong>GM Control &gt; Cold Storage Book &gt; Import / Update Book Only</strong> to place all 96 managed journals in the Cold Storage folder. This does not rebuild existing Actors or Items. Changed managed pages are kept in GM Recovery Copies, and individual handout permissions are retained. The optional adventure module is needed only for full pregen, contact and scene setup.</p>')+
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

  add('21 — Core Equipment Library',shell('Core Equipment Library','GEAR / DRUGS / AUGMENTS',
    panel('What is included',`<p>Version 1.3.0 adds <strong>95 structured Core Item records</strong>: 30 weapons, 13 ammunition profiles, 8 apparel/armour records, 12 device/deck records, 3 software records, 7 drugs/medical chemicals, and 22 sleeve augmentations. It also provides the three example Core Vehicle Actor templates and a 12-entry generic weapon-upgrade index.</p>`)+
    panel('Fast table workflow',list([
      '<strong>Open Core Gear.</strong> From a character sheet press Core Gear, or open the Core Equipment Library from Game Settings.',
      '<strong>Add to Actor.</strong> The Library creates a typed embedded Item. Re-adding ammunition or drugs increases quantity instead of creating a duplicate row.',
      '<strong>Load ammunition.</strong> On a Weapon record press Load Ammo, choose a special round or shell profile, then Use / Attack. Attack and damage cards inherit the ammunition profile.',
      '<strong>Administer drugs.</strong> Drug Items expose administration, Addiction, Controlled Substance requirements, duration, active effects and Under-the-Influence effects. Administer consumes a dose and posts a table-facing effect card.',
      '<strong>Install to world.</strong> A GM can create all missing Core records in the world Item directory and the three Vehicle Actors without overwriting customized records.'
    ]))+
    panel('Automatic augment support',`<p>Active augment records with explicit Attribute effects feed the character’s derived Attribute Bonuses. Speed Neurachem adds a Speed Die; Subdermal Plating adds Damage Threshold and passive Protection; Bestial Dermis adds passive Protection. Ambiguous installation-dependent effects remain displayed for GM adjudication instead of being guessed.</p>`)+
    panel('Source priority',`<p>The 2020 Core Rulebook is authoritative for these records. The Quick Start remains secondary. The Quick Start-only <strong>Reinforced Dermis</strong> is therefore not installed into the canonical Core catalog.</p>`)+
    callout('Licensed source remains authoritative','The Library stores concise typed mechanics and source-page references. Use the supplied Core Rulebook when an edge case or full entry wording matters.','cyan')
  ));

  add('22 - Bonus Dice, Editable Presets & System Health',shell('Live Roll Controls','GM ASSIGNMENTS / PRESET TR',
    panel('Assign Bonus Dice',`<p>Select one or more characters in GM Control, press <strong>Bonus Dice</strong>, choose a count and die size, and press <strong>Assign Bonus Dice</strong>. Use a specific die or <strong>Match Skill die</strong>; the latter resolves separately for each character and includes current Skill-level adjustments.</p><p>Awards can apply to any Skill or one named Skill. Choose <strong>Next matching check</strong> or <strong>Until removed</strong>. Each recipient receives an independent award. A blocked or cancelled check spends nothing; an executed check spends a one-use award whether it succeeds or fails.</p>`)+
    panel('Automatic use and removal',`<p>Assigned dice apply to Skill Checks from sheets, GM requests, weapon/equipment checks and opposed checks through the shared roll function. Awards appear on the character sheet, in matching roll options and in the GM recipient rail. They are not flat TR bonuses. Do not enter an assigned award again in the manual Bonus Dice field.</p><p>Use <strong>Remove</strong> beside an award or <strong>Clear Selected Bonuses</strong>. Persistent awards survive reconnection and server restarts until removed; they do not automatically expire at the end of a scene.</p>`)+
    panel('Adjust preset TR',`<p>Every preset now has <strong>Base TR override</strong>, <strong>TR modifier</strong>, <strong>Difficulty penalty</strong>, <strong>Bonus Dice count</strong> and <strong>Bonus die size</strong>. Leave Base TR empty to use each character's Attribute Bonus. The base override is not a final-TR override: difficulty, Training, Gear and status effects still apply.</p><p><strong>TR = base - difficulty + applicable Training/Gear + modifier.</strong> Higher TR is easier. Send uses current edits; Save persists them for this world; Reset returns to the supplied preset. Sent request cards retain the settings they were created with.</p>`)+
    panel('Registration health',`<p>If Foundry says ammunition or drug is not a valid Item type, run <strong>System Check</strong>. The system checks the loaded manifest, the public Item.TYPES registry and the installed system.json. An incomplete registration blocks the Core Library import before any new documents are created.</p><p>Replace the complete system package, including <strong>system.json</strong>, with v1.4.1 while the game/server is stopped. Restart the game/server and reconnect clients. The code does not pretend to repair server registration by changing browser-only lists or by converting typed Items into generic equipment. Retry the Core Library installation after the system check passes; existing catalog entries are preserved.</p>`)
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

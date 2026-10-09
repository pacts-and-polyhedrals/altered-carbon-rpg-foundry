/**
 * Guided character creation accounting and canonical package expansion.
 * Pure, Foundry-independent helpers. Source: 2020 Core Ch.2 plus the existing
 * archetype-reference.json and item-catalog.json, never inferred price/quality rules.
 */
import {
  ageResources, attributeBonus, SLEEVE_LIMITS, skillUpgradeCost,
  specializationCost, traitCost, canPurchaseTrait, baggageRerollCost,
  validateSleeveAttributes
} from './rules-engine.mjs';

export const CREATOR_ATTRIBUTES = Object.freeze(['strength','perception','empathy','willpower','acuity','intelligence']);
// Verified against the 2020 Core Rulebook, printed pp. 80-82 (PDF pp. 81-83).
export const RELIGIOUS_BENEFITS = Object.freeze([
  {id:'close-knit-community',label:'Close-knit Community'},
  {id:'ego-barrier',label:'Ego Barrier'},
  {id:'eschew-virtual',label:'Eschew Virtual'},
  {id:'spotless-soul',label:'Spotless Soul'}
]);
export const ENVOY_BENEFITS = Object.freeze([
  {id:'perfect-recall',label:'Perfect Recall'},
  {id:'re-sleeving',label:'Re-sleeving'},
  {id:'the-wolf-pack',label:'The Wolf Pack'},
  {id:'resourceful',label:'Resourceful'},
  {id:'combat-conditioning',label:'Combat Conditioning'},
  {id:'control-the-construct',label:'Control the Construct'}
]);
export function envoyConditioningBranches(traitCatalog=[]){
  return [...new Set(traitCatalog.filter(t=>t.tree==='Combat'||t.tree==='Praxis').map(t=>`${t.tree}::${t.branch}`))].sort();
}
export function envoyFreeTraits(traitCatalog=[],choices={}){
  if(![choices.envoyOne,choices.envoyTwo].includes('combat-conditioning'))return [];
  const selected=new Set([choices.envoyBranchOne,choices.envoyBranchTwo]);
  return traitCatalog.filter(t=>selected.has(`${t.tree}::${t.branch}`));
}

const norm = x => String(x ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
const integer = n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
const LIMIT_STACK = 50;

export function baseCreationAttributes(sleeveType='birth') {
  const range=SLEEVE_LIMITS[sleeveType] ?? SLEEVE_LIMITS.birth;
  return Object.fromEntries(CREATOR_ATTRIBUTES.map(k=>[k, k==='strength'||k==='perception' ? Math.max(30,range[k][0]) : 30]));
}

export function creatorCommonality(archetype,tree,age,variant='standard'){
  // Variant constraints override Archetype and DHF age commonality.
  // 2020 Core: Religious Coding / Orthodoxy and Envoy / Low Profile.
  if (variant==='religious' && tree==='Crime') return 'anomaly';
  if (variant==='envoy' && tree==='Business and Society') return 'anomaly';
  const common={Criminal:'Crime',Official:'Law and Government',Socialite:'Business and Society',Soldier:'Combat',Technician:'Technology'};
  const anomaly={Criminal:'Law and Government',Official:'Crime',Socialite:'Survival',Soldier:'Business and Society',Technician:'Combat'};
  if (archetype==='Civilian' && tree==='Citizenship') return 'common';
  if (tree==='Praxis' && Number(age)>100) return 'common';
  if (common[archetype]===tree) return 'common';
  if (anomaly[archetype]===tree) return 'anomaly';
  return 'uncommon';
}

export function resolvePackageTrait(catalog, [branch,name]) {
  const b=norm(branch),n=norm(name);
  return (catalog||[]).find(t=>norm(t.branch)===b&&norm(t.name)===n)
    ?? (catalog||[]).find(t=>norm(t.name)===n && (norm(t.branch).includes(b)||b.includes(norm(t.branch))))
    ?? null;
}

export function evaluateCreationLedger({
  age=30, variant='standard', archetype='Civilian', sleeveType='birth', variantChoices={},
  mode='standard', manualSP=null, manualIP=null,
  attributeRolls=[], skillLevels={}, startingSkillLevels={},
  specialisations=[], traitIds=[], traitCatalog=[], packageTraitIds=[], baggageEvents=[]
}={}) {
  const errors=[], entries=[];
  const base=baseCreationAttributes(sleeveType), attributes={...base};
  const fail = error => errors.push(error);
  if (!['standard','expedited'].includes(mode)) fail('Choose a valid creation mode.');
  if (!['standard','ai','religious','envoy','meth'].includes(variant)) fail('Choose a valid variant.');
  if (variant==='ai' && archetype==='Soldier') fail('AI cannot use Soldier Archetype.');
  if (variant==='ai' && !sleeveType.startsWith('synthetic-')) fail('AI creator requires a synthetic sleeve.');
  if (variant!=='ai' && (!Number.isSafeInteger(Number(age)) || Number(age)<18 || Number(age)>99999)) fail('Age must be a whole number of at least 18.');
  let starting;
  if (variant==='ai') {
    if (!integer(manualSP) || !integer(manualIP)) fail('AI SP and IP must be explicitly entered as whole nonnegative values.');
    starting={stackPoints:integer(manualSP)?manualSP:0,egoPoints:0,influencePoints:integer(manualIP)?manualIP:0,baggageDice:0,lifeEventRolls:0};
  } else {
    // Fix the starting pool BEFORE any Acuity SP purchases. Later improvements
    // must not retroactively mint their own spending currency.
    starting=ageResources(Number(age),base);
    if (variant==='religious' && Number(age)<=40) starting.stackPoints+=25;
    if (variant==='religious' && variantChoices.religiousBenefit==='spotless-soul' && starting.baggageDice>0){
      // The Core halves life-event count (minimum one) and halves the dice,
      // with at most 3 dice removed. It never creates a life event for age <=30.
      starting.lifeEventRolls=Math.max(1,Math.ceil(starting.lifeEventRolls/2));
      starting.baggageDice=Math.max(Math.ceil(starting.baggageDice/2),starting.baggageDice-3);
    }
  }
  let spent=0;
  const spend=(kind,label,cost,metadata={})=>{
    if (!integer(cost)) { fail(`Invalid cost for ${label}.`); return; }
    if (cost){spent+=cost;entries.push({kind,label,cost,...metadata});}
  };
  if (!Array.isArray(attributeRolls)) {fail('Attribute roll journal is invalid.');attributeRolls=[];}
  for (const [index,roll] of attributeRolls.entries()) {
    if (!CREATOR_ATTRIBUTES.includes(roll?.attribute) || !integer(roll?.sp) || roll.sp<1 || roll.sp>100 || !Array.isArray(roll?.faces) || roll.faces.length!==roll.sp || !roll.faces.every(x=>integer(x)&&x>=1&&x<=4)) {
      fail(`Attribute roll ${index+1} is invalid or has no auditable d4 results.`); continue;
    }
    const total=roll.faces.reduce((s,n)=>s+n,0);
    const limit=roll.attribute==='strength'||roll.attribute==='perception' ? (SLEEVE_LIMITS[sleeveType]??SLEEVE_LIMITS.birth)[roll.attribute][1] : LIMIT_STACK;
    const applied=Math.max(0,Math.min(total,limit-attributes[roll.attribute]));
    attributes[roll.attribute]+=applied;
    spend('attribute',`${roll.attribute} (${roll.sp}d4: ${roll.faces.join(', ')})`,roll.sp,{attribute:roll.attribute,rolled:total,applied,wasted:total-applied});
  }
  const limits=SLEEVE_LIMITS[sleeveType]??SLEEVE_LIMITS.birth;
  if (!validateSleeveAttributes(sleeveType,attributes).valid) fail(`STR/PER exceed ${sleeveType} sleeve limits.`);
  for(const key of CREATOR_ATTRIBUTES.slice(2)) if (attributes[key]>LIMIT_STACK) fail(`${key} exceeds initial Stack Attribute cap ${LIMIT_STACK}.`);
  const finalSkills={};
  for(const [id,baseLevel] of Object.entries(startingSkillLevels)) {
    if (!integer(baseLevel) || baseLevel<1 || baseLevel>5){fail(`Invalid starting Skill ${id}.`);continue;}
    const final=skillLevels[id]==null?baseLevel:Number(skillLevels[id]);
    if (!integer(final)||final<baseLevel||final>5){fail(`Invalid level selected for ${id}: ${final}.`);continue;}
    finalSkills[id]=final;
    for(let level=baseLevel;level<final;level++)spend('skill',`${id} level ${level} → ${level+1}`,skillUpgradeCost(level));
  }
  for(const id of Object.keys(skillLevels))if(!(id in startingSkillLevels))fail(`Unknown Skill identifier: ${id}.`);
  if(!Array.isArray(specialisations)){fail('Specialisations must be an array.');specialisations=[];}
  const seenSpec=new Set();
  for(const [idx,spec] of specialisations.entries()){
    const id=String(spec?.skillId||'').trim(),name=String(spec?.name||'').trim();
    if(!(id in startingSkillLevels)||!name||name.length>120){fail('Each Specialisation needs a known Skill and a name (up to 120 characters).');continue;}
    const key=`${id}:${norm(name)}`;
    if(seenSpec.has(key)){fail(`Duplicate Specialisation ${name}.`);continue;}
    seenSpec.add(key);spend('specialisation',`${id}: ${name}`,specializationCost(idx));
  }
  if(!Array.isArray(traitIds)){fail('Trait selections must be an array.');traitIds=[];}
  const traitsById=new Map(traitCatalog.map(t=>[t.id,t]));
  const owned=[];const unlocked=new Set();const seenTraits=new Set();
  for(const id of packageTraitIds){const trait=traitsById.get(id);if(!trait){fail(`Unknown Starting Package Trait: ${id}.`);continue;}
    if(seenTraits.has(id))continue;
    seenTraits.add(id);owned.push({...trait});unlocked.add(trait.tree);
  }
  for(const id of traitIds){
    const trait=traitsById.get(id);
    if(!trait){fail(`Unknown Trait: ${id}.`);continue;}
    if(seenTraits.has(id)){fail(`Trait ${trait.name} already owned.`);continue;}
    const commonality=creatorCommonality(archetype,trait.tree,age,variant);
    if(!canPurchaseTrait({commonality,tier:trait.tier,branch:trait.branch,owned}))fail(`Trait ${trait.name} is missing a prerequisite.`);
    if(!unlocked.has(trait.tree)){spend('trait-unlock',`Unlock ${trait.tree}`,traitCost(commonality,1,{unlock:true}));unlocked.add(trait.tree);}
    spend('trait',`${trait.name} (${commonality}, Tier ${trait.tier})`,traitCost(commonality,trait.tier));
    seenTraits.add(id);owned.push({...trait});
  }
  if (!Array.isArray(baggageEvents)){fail('Baggage event data must be an array.');baggageEvents=[];}
  const allowed=starting.lifeEventRolls;
  let rerollCount=0;
  for(const [index,event] of baggageEvents.entries()){
    if(index>=allowed){fail('Baggage rerolls exceed the number of age-based life events.');continue;}
    if(!Array.isArray(event?.rolls)||event.rolls.some(n=>!integer(n)||n<0||n>starting.baggageDice*6)){fail(`Invalid Baggage history for event ${index+1}.`);continue;}
    const extra=Math.max(0,event.rolls.length-1);
    rerollCount+=extra;
  }
  for(let i=0;i<rerollCount;i++)spend('baggage',`Baggage reroll ${i+1}`,baggageRerollCost(i));
  if(mode==='expedited'&&(spent>0||traitIds.length||specialisations.length))fail('Expedited mode uses unspent starting SP and fixed base Skill/Attribute values.');
  if(spent>starting.stackPoints)fail(`SP overspent by ${spent-starting.stackPoints}.`);
  const derived=variant==='ai'?{egoPoints:attributeBonus(attributes.willpower),influencePoints:starting.influencePoints} : ageResources(Number(age),attributes);
  return {
    valid:errors.length===0, errors,entries, base,attributes,finalSkills,
    startingSP:starting.stackPoints,spentSP:spent,remainingSP:starting.stackPoints-spent,
    egoPoints:variant==='ai'?attributes.willpower:derived.egoPoints,
    influencePoints:variant==='ai'?starting.influencePoints:derived.influencePoints,
    baggageDice:starting.baggageDice,lifeEventRolls:starting.lifeEventRolls,
    mode,rerollCount
  };
}

function itemMatches(record,search){const r=norm(record.name),q=norm(search);return r===q || r.startsWith(q) || (q==='clothing'&&r==='clothes');}
const CATEGORY_CHOICES=[
  {pattern:/^(?:Pistol\/Small Arms|Small Arms|Firearm)\b(?!.*Magazine)/i,filter:x=>x.type==='weapon'&&/Pistols \/ Small Arms/.test(x.category)},
  {pattern:/^Directed Energy Weapon/i,filter:x=>x.type==='weapon'&&/Directed Energy Weapons/.test(x.category)},
  {pattern:/^One-Handed Melee/i,filter:x=>x.type==='weapon'&&/One-Handed Melee/.test(x.category)},
  {pattern:/^Poison or Drug/i,filter:x=>x.type==='drug'},
  {pattern:/^Drug(?:s)?\b/i,filter:x=>x.type==='drug'},
  {pattern:/^Frag Grenades?\b/i,filter:x=>x.name==='Frag Grenade'},
  {pattern:/^Sleeve Augment/i,filter:x=>x.type==='augmentation'&&Number(x.system.techCost||x.system.techPoints)>0&&Number(x.system.techCost||x.system.techPoints)<=2}
];
function fixedMatch(label,catalog){
  const matchName=label.match(/^([^+(—]+?)(?:\s+(?:Q{1,6})(?:\s|$)|\s+with\b|\s*\+\d|\s*—|$)/i)?.[1]?.trim()||label;
  const aliases={'Portable Deck':'Deck, Portable','Clothes':'Clothes','Clothing':'Clothes','Frag Grenades':'Frag Grenade','Rapid Regrowth Bios':'Rapid Regrowth Bios','Tool Kits':'Tool Kit','Programs/Drivers':'','Tissue Welder':''};
  const query=aliases[matchName]??matchName;
  if(!query)return null;
  return catalog.find(x=>itemMatches(x,query))??null;
}
const safeId=(s)=>norm(s).slice(0,32);
/** All source clauses become a typed document or an explicit required choice. */
export function packageEntitlements(archetype,packageName,archetypeReference,itemCatalog){
  const data=archetypeReference?.archetypes?.[archetype];
  const p=data?.packages?.[packageName];if(!p)return [];
  const catalog=Array.isArray(itemCatalog)?itemCatalog:(itemCatalog?.items||[]);
  const clauses=String(p.gear||'').split(';').map(x=>x.trim()).filter(Boolean);
  const extra=[];
  if(archetype==='Criminal')extra.push('Sleeve Augment QQ or less','criminal organization Network');
  if(archetype==='Soldier')extra.push('Protectorate military Network');
  if(archetype==='Technician')extra.push('Custom-equipment upgrade pool QQQ');
  return [...clauses,...extra].map((source,index)=>{
    let text=source,quantity=1;
    const prefix=text.match(/^(\d+)x\s+/i);
    if(prefix){quantity=Number(prefix[1]);text=text.slice(prefix[0].length);}
    const id=`ent-${index}-${safeId(text)}`;
    const quality=(text.match(/\bQ{1,6}\b/i)||[])[0]?.length||0;
    const ip=text.match(/^\+(\d+)\s+IP$/i);
    if(ip)return{id,source,kind:'influence',quantity:Number(ip[1]),label:text};
    const cr=text.match(/^Credits?\s+Lv\.?\s*(\d+)$/i);
    if(cr)return{id,source,kind:'credits',quantity,level:Number(cr[1]),label:text};
    if(/^Custom-equipment upgrade pool\b/i.test(text))return{id,source,kind:'upgrade-pool',quantity:3,label:text};
    if(/\bNetworks?\b/i.test(text)){
      const organisation=text.replace(/\bNetworks?\b/ig,'').trim();
      const branches=/\s+or\s+/i.test(organisation)?organisation.split(/\s+or\s+/i):null;
      if(branches)return{id,source,kind:'network-choice',quantity,options:branches.map(x=>x.trim()),label:text};
      if(/\s+and\s+/i.test(organisation))return{id,source,kind:'networks',quantity,organisations:organisation.split(/\s+and\s+/i).map(x=>x.trim()),label:text};
      return{id,source,kind:'network',quantity,organisation,label:text};
    }
    if(/Magazine/i.test(text))return{id,source,kind:'manual-choice',quantity,quality,label:text,category:'equipment'};
    const specialAlternative=/^Directed Energy Weapon[^;]*\s+or\s+Firearm/i.test(text);
    const predefined=CATEGORY_CHOICES.find(x=>x.pattern.test(text));
    if(predefined){const candidates=catalog.filter(x=>predefined.filter(x)||(specialAlternative&&x.type==='weapon'&&/Pistols \/ Small Arms/.test(x.category))).map(x=>({id:x.id,name:x.name,type:x.type}));
      return{id,source,kind:'catalog-choice',quantity,quality,label:text,candidates};}
    const exact=fixedMatch(text,catalog);
    if(exact)return{id,source,kind:'catalog-fixed',quantity,quality,label:text,itemId:exact.id};
    // Broad source entitlements (Device QQQ, Tool Kit variant, program, service)
    // have no unambiguous Chapter 6 record. Keep the source and require choice.
    return{id,source,kind:'manual-choice',quantity,quality,label:text,category:/Software|Program|Driver/i.test(text)?'software':'equipment'};
  });
}

export const entitlementChoiceKey=(entitlement,index=0)=>entitlement.quantity>1?`${entitlement.id}:${index+1}`:entitlement.id;

/** Validate that every meaningful choice is resolved; never fabricate a Core record. */
export function validateEntitlementChoices(entitlements=[],choices={}){
  const errors=[];
  for(const e of entitlements){
    const count=['catalog-choice','manual-choice'].includes(e.kind)?e.quantity:1;
    for(let i=0;i<count;i++){
      const choice=choices[entitlementChoiceKey(e,i)];
      const tag=e.quantity>1?` (${i+1}/${e.quantity})`:'';
      if(e.kind==='catalog-choice'){
        if(!e.candidates.some(c=>c.id===choice))errors.push(`Select official equipment for “${e.source}”${tag}.`);
      } else if(e.kind==='network-choice'){
        if(!e.options.includes(choice))errors.push(`Select Network affiliation for “${e.source}”.`);
      } else if(e.kind==='manual-choice'){
        if(typeof choice!=='string'||choice.trim().length<2||choice.length>120)errors.push(`Name the choice for “${e.source}”${tag} (2–120 characters).`);
      }
    }
  }
  return errors;
}

const encode=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
/** Non-catalog package specifications remain user-labeled, transparently sourced records. */
export function compileStartingPackage(entitlements,choices,catalog){
  const errors=validateEntitlementChoices(entitlements,choices);
  if(errors.length)throw new Error(errors.join(' '));
  const byId=new Map((catalog?.items||catalog||[]).map(x=>[x.id,x]));
  const items=[];let influenceBonus=0;const seenNetworkNames=new Map();
  for(const e of entitlements){
    const provenance={packageEntitlement:true,source:e.source,quantity:e.quantity};
    if(e.kind==='influence'){influenceBonus+=e.quantity;continue;}
    if(e.kind==='upgrade-pool'){items.push({name:'Technician starting custom-equipment upgrade pool',type:'resourceEntry',system:{itemName:'Unallocated custom-equipment upgrades',capacity:3,description:`Core Starting Package Archetype feature: ${encode(e.source)}. Apply to equipment using the Core rules / future Upgrade Workbench.`,rulesRef:'Core Rulebook 2020, Ch.2 Technician'},flags:{'altered-carbon-rpg':{...provenance,requiresGMReview:true}}});continue;}
    if(e.kind==='credits'){
      for(let i=0;i<e.quantity;i++)items.push({name:`Credits Lv.${e.level} — Package ${e.id} #${i+1}`,type:'creditSet',system:{value:e.level,spent:0,description:`Core Starting Package: ${encode(e.source)}`,rulesRef:'Core Rulebook 2020, Ch.2 Starting Packages'},flags:{'altered-carbon-rpg':{...provenance,creditIndex:i}}});
      continue;
    }
    if(['network','networks','network-choice'].includes(e.kind)){
      const orgs=e.kind==='network-choice'?[choices[e.id]]:e.kind==='network'?[e.organisation]:e.organisations;
      for(let i=0;i<e.quantity;i++)for(const org of orgs){
        const key=norm(org),occurrences=(seenNetworkNames.get(key)||0)+1;seenNetworkNames.set(key,occurrences);
        items.push({name:`${org} Network${occurrences>1?` — affiliation ${occurrences}`:''}`,type:'network',system:{organization:org,level:1,description:`Core Starting Package entitlement: ${encode(e.source)}`,rulesRef:'Core Rulebook 2020, Ch.2 Starting Packages'},flags:{'altered-carbon-rpg':provenance}});}
      continue;
    }
    if(e.kind==='catalog-fixed'||e.kind==='catalog-choice'){
      const count=e.kind==='catalog-choice'?e.quantity:1;
      for(let i=0;i<count;i++){
        const item=byId.get(e.kind==='catalog-fixed'?e.itemId:choices[entitlementChoiceKey(e,i)]);
        if(!item)throw new Error(`Cannot resolve canonical Item for ${e.source}.`);
        const system=JSON.parse(JSON.stringify(item.system));
        system.description=`<p><strong>Starting Package:</strong> ${encode(e.source)}. Exact quality, configuration and conditional choices require Core rulebook review.</p>${system.description||''}`;
        system.quantity=e.kind==='catalog-fixed'?e.quantity:1;
        system.sourceQuality=e.quality||0;
        items.push({name:item.name,type:item.type,system,flags:{'altered-carbon-rpg':{...provenance,quantity:system.quantity,catalogId:item.id,choiceIndex:i+1,sourceBook:'Core Rulebook 2020 Ch.6'}}});
      }
      continue;
    }
    for(let i=0;i<e.quantity;i++){
      const selection=choices[entitlementChoiceKey(e,i)].trim();
      items.push({name:selection,type:e.category,system:{description:`<p><strong>Starting Package specification:</strong> ${encode(e.source)}.</p><p><strong>Player/GM selection:</strong> ${encode(selection)}. No exact canonical Item could be mapped from the catalogue; resolve its stats against the owned Core Rulebook.</p>`,rulesRef:'Core Rulebook 2020, Ch.2 Starting Packages',quantity:1,sourceQuality:e.quality||0},flags:{'altered-carbon-rpg':{...provenance,quantity:1,choiceIndex:i+1,requiresGMReview:true}}});
    }
  }
  // Merge identical repeatable catalogue Items into a single stack so the
  // presentation deduper never hides a separately granted copy. Credit sets
  // deliberately remain separate spendable Documents.
  const stacks=new Map(),merged=[];
  for(const item of items){
    const id=item.flags?.['altered-carbon-rpg']?.catalogId;
    if(id && ['drug','ammunition','weapon','armour','equipment','software','augmentation'].includes(item.type)){
      const key=`${item.type}:${id}:${item.flags['altered-carbon-rpg'].source}`;
      const prior=stacks.get(key);
      if(prior){prior.system.quantity+=Number(item.system.quantity||1);prior.flags['altered-carbon-rpg'].quantity=prior.system.quantity;continue;}
      stacks.set(key,item);
    }
    merged.push(item);
  }
  return{items:merged,influenceBonus,requiresReview:merged.filter(i=>i.flags?.['altered-carbon-rpg']?.requiresGMReview).length};
}

export function validateVariantChoices(variant,choices={},traitCatalog=[],skillCatalog=[],age=30){
  const errors=[],get=x=>String(choices[x]||'').trim();
  if(variant==='religious'){
    if(!RELIGIOUS_BENEFITS.some(v=>v.id===get('religiousBenefit')))errors.push('Choose one of the four published Religious Coding benefits.');
    const available=Number(age)<=80;
    const religiousSkill=get('religiousSkill');
    if(available && !skillCatalog.some(s=>s.id===religiousSkill && ['empathy','willpower'].includes(s.attribute)))errors.push('Choose a free Empathy or Willpower Skill level upgrade (Core Religious Convert).');
  }
  if(variant==='envoy'){
    if(!ENVOY_BENEFITS.some(v=>v.id===get('envoyOne'))||!ENVOY_BENEFITS.some(v=>v.id===get('envoyTwo')))errors.push('Choose two official Envoy conditioning benefits.');
    if(get('envoyOne')===get('envoyTwo'))errors.push('Choose two distinct Envoy conditioning benefits.');
    if([get('envoyOne'),get('envoyTwo')].includes('combat-conditioning')){
      const branches=envoyConditioningBranches(traitCatalog);
      if(!branches.includes(get('envoyBranchOne'))||!branches.includes(get('envoyBranchTwo'))||get('envoyBranchOne')===get('envoyBranchTwo'))errors.push('Combat Conditioning requires two different Combat/Praxis Trait branches.');
    }
  }
  if(variant==='ai'&&get('aiLicence').length<2)errors.push('Record the AI operating licence and restrictions from the Core rules.');
  return errors;
}

/** 2020 Core Ch.7 GM content: deterministic portions only.
 * Pure functions so Node tests and Foundry use identical rules.
 */
import {requestProfile,SKILL_DIE_BY_LEVEL,REQUEST_LEVELS} from './rules-engine.mjs';

const REQUIRED_ATTRIBUTES=['strength','perception','empathy','willpower','acuity','intelligence'];
const LEVEL_FROM_DIE=Object.fromEntries(Object.entries(SKILL_DIE_BY_LEVEL).map(([lvl,die])=>[Number(die),Number(lvl)]));
const int=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(Number(n))&&Number(n)>=min&&Number(n)<=max;
const requireInt=(n,min,max,label)=>{if(!int(n,min,max))throw new Error(`${label} must be an integer from ${min} to ${max}.`);return Number(n);};
const nkey=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const safe=value=>String(value??'').trim();

export const NEMESIS_OPTIONS=Object.freeze(['Consummate Warrior','Escape Artist','Signature Weapon','Juggernaut','Mastermind','Psy-Op','Well Connected']);
export const CONTACT_AFFILIATIONS=Object.freeze({
  none:{sp:5,dice:1,bonus:0,categoryLimit:1,allowed:['informant','supplier']},
  casual:{sp:10,dice:2,bonus:1,categoryLimit:1,allowed:['informant','supplier','mercenary']},
  close:{sp:13,dice:3,bonus:1,categoryLimit:2,allowed:['informant','supplier','mercenary']},
  'extremely-close':{sp:15,dice:4,bonus:2,categoryLimit:2,allowed:['informant','supplier','mercenary']},
  irreplaceable:{sp:20,dice:5,bonus:3,categoryLimit:3,allowed:['informant','supplier','mercenary']}
});
export const CONTACT_VIRTUES=Object.freeze(['Ascetic','Humble','Thrifty','Prudent','Respectful','Compassionate','Honor','Open','Joyful','Devotion','Generosity','Bravery']);
export const CONTACT_FLAWS=Object.freeze(['Indulgent','Vain','Spendthrift','Foolish','Disrespectful','Vindictive','Dishonorable','Secretive','Dour','Duplicitous','Greed','Cowardice']);


/** Strictly matched printed equipment. Unspecified model variants stay GM-selected. */
export const ADVERSARY_GEAR=Object.freeze({
 'ADV-DIPPER':['Deck, Portable','Interrogation/Virus','Flak Coat'],
 'ADV-HITMAN':['Blade','Flak Coat','Steyr M9-A1'],
 'ADV-THUG':['Flak Coat'],
 'ADV-FREAK':['Power Knuckles','Clothes'],
 'ADV-BCPD':['BCPD Sidearm .357MAG','Police Riot Armor'],
 'ADV-CTAC':['CTAC Praetorian Armor','CTAC 9mm Praetorian Sidearm'],
 'ADV-STOOGE':['Clothes','Stallion (Synamorphestrone)'],
 'ADV-METH':['Clothes']
});
/** Avoid inventing variant upgrades, alternative firearm choices, or special effects. */
export function adversaryGearDocuments(entry,canonicalItems=[]){
 if(!Array.isArray(canonicalItems)||canonicalItems.length!==95)throw new Error('The full 95-Item Core catalogue is required to outfit opponents.');
 const names=ADVERSARY_GEAR[entry.id]||[];
 return names.map(name=>{
  const record=canonicalItems.find(i=>i.name===name);if(!record)throw new Error(`Missing official equipment: ${name}`);
  const equipState=record.type==='armour'?'worn':['weapon','equipment','software'].includes(record.type)?'equipped':'carried';
  return {name:record.name,type:record.type,system:{...structuredClone(record.system),equipState},flags:{'altered-carbon-rpg':{coreCatalog:true,catalogId:record.id,catalogVersion:'1.3.0',adversaryGear:true,sourceAdversary:entry.id,bookPage:record.bookPage}}};
 });
}

/** Complete published skill baselines + numeric modifiers on a ready-to-roll Threat Actor. */
export function adversaryDocuments(entry,skills=[],{minion=false,nemesisAbility='',includeGear=false,canonicalItems=[]}={}){
  if(!entry||!safe(entry.id)||!safe(entry.name))throw new Error('An official adversary entry is required.');
  if(!Array.isArray(skills)||skills.length!==32)throw new Error('The complete 32-Skill Core catalogue is required.');
  if(nemesisAbility&&!NEMESIS_OPTIONS.includes(nemesisAbility))throw new Error('Unknown Nemesis feature.');
  if(entry.nonCombatant&&nemesisAbility&&!['Mastermind','Psy-Op'].includes(nemesisAbility))throw new Error('This Core non-combatant may only have Mastermind or Psy-Op.');
  if(minion&&!Number(entry.minionBonus||0))throw new Error('The published opponent has no Minion option.');
  const attr={...entry.attributes}, skillData=[];
  for(const field of REQUIRED_ATTRIBUTES){requireInt(attr[field],0,150,field);if(!LEVEL_FROM_DIE[Number(entry.attributeSkillDice?.[field])])throw new Error(`Unknown Skill die for ${field}.`);}
  for(const s of skills){const level=LEVEL_FROM_DIE[Number(entry.attributeSkillDice?.[s.attribute])];if(!level)throw new Error(`Unknown Skill attribute ${s.attribute}.`);
    skillData.push({name:s.name,type:'skill',system:{attribute:s.attribute,level,trainingBonus:Number(entry.skillBonuses?.[s.name]||0),catalogId:`${entry.id}:${s.id}`,rulesRef:s.rulesRef||'2020 Core Chapter 3'}});
  }
  if(nemesisAbility==='Juggernaut'){attr.strength+=20;attr.perception+=20;}
  if(nemesisAbility==='Mastermind')for(const field of ['empathy','willpower','acuity','intelligence'])attr[field]+=20;
  if(nemesisAbility==='Consummate Warrior')for(const s of skillData)if(['strength','perception'].includes(s.system.attribute))s.system.level=5;
  const gear=includeGear?adversaryGearDocuments(entry,canonicalItems):[];
  const wornDefense=gear.filter(i=>i.type==='armour').reduce((n,i)=>n+Number(i.system.defense||0),0);
  const bonusHealth=nemesisAbility==='Juggernaut'?10:0,bonusEgo=nemesisAbility==='Mastermind'?10:0;
  const speedOffset=Number(entry.speedDice)-Math.floor(Number(attr.perception)/10);
  const actor={name:entry.name,type:'threat',system:{attributes:attr,identity:{publicName:entry.name,archetype:entry.category},resources:{health:{value:entry.health+bonusHealth,max:entry.health+bonusHealth},ego:{value:entry.ego+bonusEgo,max:entry.ego+bonusEgo},wounds:{value:0,max:attr.strength}},defense:Math.max(0,Number(entry.defense||0)-wornDefense),speedModifier:speedOffset,minionBonus:minion?Number(entry.minionBonus):0,nemesis:Boolean(nemesisAbility),tactics:safe(entry.gmNotes),morale:5},flags:{'altered-carbon-rpg':{adversarySourceId:entry.id,printedSpeedDice:Number(entry.speedDice),selectedMinion:Boolean(minion),nemesisAbility,reference:entry.source,nonCombatant:Boolean(entry.nonCombatant),equipmentSuggestions:entry.equipment||[],includedCanonicalGear:gear.map(i=>i.name),equipmentRequiresGMReview:entry.equipment||[],triggeredEffectReference:entry.triggeredEffects||[],armorRuleNote:entry.armorNote||'',specialRuleReference:entry.specialRules||[]}}};
  return {actor,items:[...skillData,...gear]};
}

export function networkDocument(entry,{organization='',level=1}={}){
  if(!entry?.id||!entry?.name)throw new Error('Network catalogue entry is missing.');
  const actual=safe(organization)||entry.organization;
  return {name:actual===entry.organization?entry.name:`${entry.name}: ${actual}`,type:'network',system:{catalogId:entry.id,description:entry.description,organization:actual,level:requireInt(level,1,5,'Network Request Level'),requestBonus:0,categories:entry.name,exhausted:false,rulesRef:'Core Rulebook 2020, Chapter 7, pp.304-309'}};
}

const STANDING=[
  {min:10,max:10,name:'Dredge of society',tr:12,modifier:-5,extraSP:0,categoryCap:1},
  {min:8,max:9,name:'Burnout / petty criminal',tr:10,modifier:-3,extraSP:5,categoryCap:1},
  {min:6,max:7,name:'Poor / career criminal / junior employee',tr:8,modifier:-2,extraSP:10,categoryCap:2},
  {min:4,max:5,name:'Middle class / skilled specialist / AI',tr:6,modifier:0,extraSP:20,categoryCap:2},
  {min:2,max:3,name:'Upper class / senior corporate or public officer',tr:4,modifier:2,extraSP:25,categoryCap:3},
  {min:1,max:1,name:'Meth',tr:2,modifier:3,extraSP:30,categoryCap:3}
];
const HISTORY=[
  {min:10,max:10,name:'Enemy / former partner / rival',modifier:-4},
  {min:8,max:9,name:'Co-worker / business patron',modifier:-3},
  {min:6,max:7,name:'Acquaintance / friend of friend',modifier:-2},
  {min:4,max:5,name:'Friend / war buddy / partner in crime',modifier:-1},
  {min:2,max:3,name:'Family friend / romantic interest / customer',modifier:2},
  {min:1,max:1,name:'Immediate family / equivalent devotion',modifier:3}
];
export function socialStanding(d10){const value=requireInt(d10,1,10,'Standing die');return {...STANDING.find(s=>value>=s.min&&value<=s.max),roll:value};}
export function contactHistory(d10){const value=requireInt(d10,1,10,'History die');return {...HISTORY.find(s=>value>=s.min&&value<=s.max),roll:value};}
export function contactResources(total){
  if(!Number.isFinite(total))throw new Error('Invalid Contact resource total.');
  const points=Math.floor(total);
  if(points<=3)return {tier:0,maxRequestLevel:3,immediateExhaust:true,bonusDie:null,influence:'none'};
  if(points<=6)return {tier:1,maxRequestLevel:3,immediateExhaust:false,bonusDie:4,influence:'restore'};
  if(points<=10)return {tier:1,maxRequestLevel:3,immediateExhaust:false,bonusDie:6,influence:'gain'};
  if(points<=15)return {tier:2,maxRequestLevel:4,immediateExhaust:false,bonusDie:8,influence:'restore'};
  if(points<=20)return {tier:3,maxRequestLevel:4,immediateExhaust:false,bonusDie:10,influence:'gain'};
  if(points<=25)return {tier:4,maxRequestLevel:5,immediateExhaust:false,bonusDie:12,influence:'restore'};
  return {tier:5,maxRequestLevel:5,immediateExhaust:false,bonusDie:'2d6',influence:'gain'};
}
export function contactProfile({name,standingRoll,historyRoll,virtueRoll,flawRoll,extraFlawRoll=null,affiliation='casual',categories=[],resourceDice=[],linkedActorId='',desperation=false}={}){
  name=safe(name);if(!name||name.length>120)throw new Error('Name the Contact (1–120 characters).');
  const aff=CONTACT_AFFILIATIONS[affiliation];if(!aff)throw new Error('Unknown Contact affiliation.');
  const standing=socialStanding(standingRoll),history=contactHistory(historyRoll);
  requireInt(virtueRoll,1,12,'Virtue die');requireInt(flawRoll,1,12,'Flaw die');
  if(standing.name==='Meth'&&extraFlawRoll===null)throw new Error('Meth Contacts require a second Flaw roll.');
  if(extraFlawRoll!==null)requireInt(extraFlawRoll,1,12,'Extra Flaw die');
  if(!Array.isArray(resourceDice)||resourceDice.length!==aff.dice||!resourceDice.every(d=>int(d,1,6)))throw new Error(`Affiliation ${affiliation} requires ${aff.dice} actual d6 resource results.`);
  const selection=[...new Set((Array.isArray(categories)?categories:[]).map(x=>safe(x).toLowerCase()).filter(Boolean))];
  if(!selection.length||selection.length>Math.min(standing.categoryCap,aff.categoryLimit)||selection.some(x=>!aff.allowed.includes(x)))throw new Error('Contact categories exceed the standing/affiliation limits.');
  const score=resourceDice.reduce((n,x)=>n+Number(x),0)+standing.modifier+history.modifier;
  const resources=contactResources(score);
  const flaws=[CONTACT_FLAWS[flawRoll-1],...(extraFlawRoll===null?[]:[CONTACT_FLAWS[extraFlawRoll-1]])];
  return {name,standing,history,virtue:CONTACT_VIRTUES[virtueRoll-1],flaws,affiliation,categories:selection,resourceDice,resourceScore:score,resources,spCost:desperation?0:aff.sp,developmentSP:standing.extraSP,requiresScandal:Boolean(desperation),linkedActorId:safe(linkedActorId)};
}
export function contactDocument(profile){
  return {name:profile.name,type:'contact',system:{catalogId:'',description:`A ${profile.affiliation} Contact. ${profile.history.name}.`,standing:profile.standing.name,history:profile.history.name,affiliation:profile.affiliation,spCost:profile.spCost,developmentSP:profile.developmentSP,resourceScore:profile.resourceScore,resourceLevel:profile.resources.tier,maxRequestLevel:profile.resources.maxRequestLevel,requestBonus:CONTACT_AFFILIATIONS[profile.affiliation].bonus,categories:profile.categories.join(', '),virtue:profile.virtue,flaws:profile.flaws.join(', '),linkedActorId:profile.linkedActorId,exhausted:false,generalModifierPool:0,resourceInfluenceApplied:false,developmentSPPaid:false,desperation:profile.requiresScandal,rulesRef:'Core Rulebook 2020, Chapter 7, pp.294-304'}};
}

export function requestExhaustion({level,networkDieResult,targetResult,catastrophe=false,oneUse=false,diceSides=null}={}){
  const l=requireInt(level,1,5,'Request level'),die=diceSides===null?REQUEST_LEVELS[l].die:requireInt(diceSides,4,12,'Request Bonus Die');
  const roll=requireInt(networkDieResult,1,die,'Network bonus die result');
  if(!Number.isFinite(Number(targetResult)))throw new Error('Request TR must be finite.');
  const offset=Math.abs(roll-Number(targetResult));
  return {exhausted:Boolean(catastrophe||oneUse||offset>=REQUEST_LEVELS[l].exhaust),degrees:Math.floor(offset),threshold:REQUEST_LEVELS[l].exhaust,networkDie:roll,baseTR:targetResult,side:roll<=targetResult?'strong-success':'strong-failure'};
}
export function requestPrerequisites({actor,source,level,kind='favor',paid=false,gmPaidConfirmed=false,ipCostOverride=null}={}){
  if(!actor||!source||!['network','contact'].includes(source.type))throw new Error('Choose a character and their Network or Contact.');
  if(!['favor','material','resupply','work-for-hire','general'].includes(kind))throw new Error('Unknown Request type.');
  const lvl=requireInt(level,1,5,'Request level');
  if(source.system.exhausted)throw new Error('This Contact or Network is exhausted and cannot be used again until restored.');
  if(source.type==='contact'&&lvl>Number(source.system.maxRequestLevel||3))throw new Error('The Contact does not have resources for this Request Level.');
  if(paid||kind==='work-for-hire'){
    if(!gmPaidConfirmed)throw new Error('Paid Requests require GM confirmation of a separate monetary purchase.');
    if(Number(actor.ac?.effectiveWealth??actor.system.wealth??0)<lvl)throw new Error('Effective Wealth is lower than the equivalent Request Price Level; resolve the purchase or Deferral first.');
  } else if(Number(actor.system.resources.influence.value||0)<(ipCostOverride===null?1:Math.max(0,Math.trunc(Number(ipCostOverride)))))throw new Error('The character needs the required IP1 or Trait-adjusted Influence to leverage this Request.');
  const ipCost=paid||kind==='work-for-hire'?0:(ipCostOverride===null?1:Number(ipCostOverride));
  if(!Number.isSafeInteger(ipCost)||ipCost<0||ipCost>5)throw new Error('Invalid Request Influence cost.');
  return {level:lvl,ipCost,paid:paid||kind==='work-for-hire',kind};
}
export function resupplyPlan({level,item}={}){
  const l=requireInt(level,1,5,'Request level');
  if(!item||!['weapon','armour','equipment','software','resourceEntry'].includes(item.type))throw new Error('Select consumable gear or a Resource Catalogue entry.');
  const dp=Number(item.system.depletion||0);if(!int(dp,0))throw new Error('Item depletion is invalid.');
  const source=REQUEST_LEVELS[l].resupply;
  const base=item.system.powered?source.powered:source.physical;
  const limit=item.system.rare?Math.min(base,source.rare):base;
  const restore=Math.min(dp,limit);
  return {before:dp,after:dp-restore,restore,level:l,rare:Boolean(item.system.rare),powered:Boolean(item.system.powered)};
}
export function campaignBand(genre,total,table){
  if(!['noir','action'].includes(genre))throw new Error('Choose Noir or Action genre.');
  if(!int(total,1))throw new Error('Campaign progress must be a positive integer.');
  const rows=table?.genres?.[genre];if(!Array.isArray(rows))throw new Error(`Missing ${genre} campaign table.`);
  const result=rows.find(row=>total>=row.min&&total<=row.max);
  if(!result)throw new Error(`No campaign result for total ${total}.`);
  return {...result,progress:total};
}
export function campaignAdvance({previous={},dieSides,rolls=[],genre='noir',table}={}){
  if(![4,6,8,10,12].includes(Number(dieSides)))throw new Error('Campaign Die must be d4, d6, d8, d10 or d12.');
  const sides=[...(previous?.dice||[]),Number(dieSides)];
  const mode=previous?.mode||'roll-all';if(!['roll-all','running'].includes(mode))throw new Error('Unknown campaign accumulation mode.');
  if(!Array.isArray(rolls)||rolls.length!==(mode==='running'?1:sides.length))throw new Error(`Expected ${mode==='running'?'one new':sides.length} Campaign Die results.`);
  const rolledSides=mode==='running'?[Number(dieSides)]:sides;
  for(let i=0;i<rolls.length;i++)requireInt(rolls[i],1,rolledSides[i],`Campaign die ${i+1}`);
  const total=(mode==='running'?Number(previous.total||0):0)+rolls.reduce((n,v)=>n+Number(v),0);
  const band=campaignBand(genre,total,table);
  const lastRoll=Number(rolls.at(-1));
  return {dice:sides,mode,total,rolls:[...rolls],band,session:(previous?.events?.length||0)+1,rewardSP:Math.max(0,(10-lastRoll)*2)};
}

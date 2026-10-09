/** Altered Carbon 2020 Core, Chapters 4 & 6: deterministic combat/equipment helpers.
 * No Foundry globals. Optional/GM rulings are deliberately returned as review notes.
 */
import {upgradeTR,respecTR,maxChassisTechPoints} from './rules-engine.mjs';
export const BODY_SLOTS=Object.freeze(['head','chest','waist','arms','hands','back','legs','feet']);
export const GEAR_TYPES=new Set(['weapon','armour','equipment','software','augmentation']);
const normalize=v=>String(v??'').trim().toLowerCase().replace(/[\s_-]+/g,' ');
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const unique=a=>[...new Set(a)];
export function parseBodySlots(raw='',choice=''){
 const value=normalize(raw);if(!value||value==='none')return {slots:[],needsChoice:false};
 if(value.includes('choose one')){const chosen=normalize(choice);return {slots:BODY_SLOTS.includes(chosen)?[chosen]:[],needsChoice:!BODY_SLOTS.includes(chosen)};}
 if(value.startsWith('all except')){const except=value.slice('all except'.length).split(/[,/;]|\band\b/).map(normalize);return {slots:BODY_SLOTS.filter(s=>!except.includes(s)),needsChoice:false};}
 if(value==='all')return {slots:[...BODY_SLOTS],needsChoice:false};
 const slots=unique(value.split(/[,/;]|\band\b/).map(normalize).filter(s=>BODY_SLOTS.includes(s)));
 return {slots,needsChoice:false};
}
export function itemSlots(item){return parseBodySlots(item?.system?.bodySlots,item?.system?.slotChoice);}
export function wornItems(items=[]){return [...items].filter(i=>i.type==='armour'&&i.system?.equipState==='worn');}
export function validateWornSlots(items=[],candidate=null){
 const all=wornItems(items).filter(i=>!candidate||i.id!==candidate.id);
 if(candidate?.type==='armour'&&candidate.system?.equipState==='worn')all.push(candidate);
 const occupancy=new Map(BODY_SLOTS.map(s=>[s,[]])),issues=[],layeredIds=new Set();
 for(const item of all){const {slots,needsChoice}=itemSlots(item);
   if(needsChoice){issues.push(`${item.name}: choose a Body Slot before wearing.`);continue;}
   for(const slot of slots)occupancy.get(slot).push(item);
 }
 for(const [slot,itemsAtSlot] of occupancy){
   if(itemsAtSlot.length<=1)continue;
   const battle=itemsAtSlot.some(i=>Boolean(i.system?.battleArmor));
   const nonLayered=itemsAtSlot.filter(i=>!i.system?.layering);
   if(battle||nonLayered.length>1){issues.push(`${slot}: ${itemsAtSlot.map(i=>i.name).join(' + ')} cannot share this Body Slot${battle?' (Battle Armor)':''}.`);continue;}
   // Every additional worn layer is penalised by Heavy +1 once per item, not per slot.
   for(const item of itemsAtSlot.filter(i=>i.system?.layering))layeredIds.add(item.id);
 }
 return {valid:issues.length===0,issues,occupancy,layeredIds:[...layeredIds],items:all};
}
export function damageMatches(raw='',damageType=''){
 if(!normalize(raw))return true;
 if(!normalize(damageType))return true; // Summary view only; combat uses explicit damage type.
 const valid=raw.split(/[,;/]/).map(normalize).filter(Boolean);
 const incoming=damageType.split(/[,;/]/).map(normalize).filter(Boolean);
 return incoming.some(type=>valid.some(v=>v===type||v.includes(type)||type.includes(v)));
}
/** Armour's numeric Protection is an Armor-entry benefit and is bypassed by AP.
 * Special-entry Protection must be explicitly recorded in nonArmorProtection.
 * Layering combines Defense, but does not automatically sum multiple Armor Protection ratings.
 */
export function armourProfile(items=[],{damageType='',armorPiercing=false,cover=null,baseDefense=0,baseProtection=0,augmentationProtection=0}={}){
 const slots=validateWornSlots(items);let armourDefense=0,armourProtection=0,nonArmorProtection=0;
 const sources=[];
 for(const item of slots.items){const s=item.system||{},matches=damageMatches(s.damageTypes||'',damageType);
   if(!matches)continue;
   const def=number(s.defense),pro=number(s.protection),special=number(s.nonArmorProtection);
   if(!armorPiercing){armourDefense+=def;armourProtection=Math.max(armourProtection,pro);}
   nonArmorProtection+=special;
   if(def||pro||special)sources.push({name:item.name,defense:armorPiercing?0:def,protection:armorPiercing?special:pro+special});
 }
 if(!armorPiercing)armourProtection+=Math.max(0,number(augmentationProtection));
 const coverDef=number(cover?.defense),coverProtection=armorPiercing&&!cover?.armorPiercingSafe?0:number(cover?.protection);
 return {valid:slots.valid,issues:slots.issues,layeredIds:slots.layeredIds,armourDefense,armourProtection,nonArmorProtection,
   defense:number(baseDefense)+armourDefense+coverDef,
   protection:Math.max(0,number(baseProtection)+armourProtection+nonArmorProtection+coverProtection),
   armorPiercing:Boolean(armorPiercing),coverDefense:coverDef,coverProtection,sources};
}
export function inventoryLoad(items=[],strengthBonus=0){
 const layers=validateWornSlots(items);let cargo=0,heavy=0,partial=0;const issues=[...layers.issues];
 for(const item of items){if(!['weapon','ammunition','armour','equipment','software','drug','augmentation'].includes(item.type))continue;
   const s=item.system||{};const quantity=s.quantity===undefined?1:Math.max(0,Math.trunc(number(s.quantity)));
   let units=number(s.cargoUnits)*quantity;
   // One normal Cargo Unit per occupied slot is exempt; Heavy always counts.
   if(['worn','equipped'].includes(s.equipState)&&itemSlots(item).slots.length)units=Math.max(0,units-itemSlots(item).slots.length);
   cargo+=units;heavy+=number(s.heavy)*quantity;
   partial+=number(s.partialCargo)*quantity;
 }
 const layerPenalty=layers.layeredIds.length;
 const total=cargo+heavy+Math.ceil(partial/5)+layerPenalty;
 return {used:total,cargo,heavy,partial,layerPenalty,capacity:Math.max(0,number(strengthBonus)),encumbered:total>number(strengthBonus),level:Math.max(0,total-number(strengthBonus)),issues};
}
/** Zone distances count edges in a manually-authored adjacency graph. */
export function zoneDistance(zones=[],startId='',endId=''){
 if(!startId||!endId)return {zone:'unknown',steps:0,reason:'Assign both tokens to a named Zone.'};
 if(startId===endId)return {zone:'shared',steps:0};
 const index=new Map(zones.map(z=>[z.id,z]));if(!index.has(startId)||!index.has(endId))return {zone:'unknown',steps:0,reason:'Token Zone not present in Scene Zone graph.'};
 const queue=[[startId,0]],visited=new Set([startId]);
 while(queue.length){const [id,steps]=queue.shift();const zone=index.get(id);
   for(const neighbor of zone?.adjacent||[]){if(neighbor===endId)return {zone:steps+1===1?'adjacent':'distant',steps:steps+1};
     if(index.has(neighbor)&&!visited.has(neighbor)){visited.add(neighbor);queue.push([neighbor,steps+1]);}
   }
 }
 return {zone:'unknown',steps:0,reason:'No connected Zone path; GM must establish range.'};
}
export function attackRange({zone='shared',steps=1,skill='',specialisation='',deployed=false,weapon=null}={}){
 const s=weapon?.system||{},type=normalize(skill||s.skill),spec=normalize(specialisation||s.specialisation);
 const pistol=spec.includes('pistol')||normalize(s.specialRules).includes('pistol');
 const throwing=type==='throw';const melee=['brawl','melee combat','martial arts'].includes(type);
 if(!['shared','adjacent','distant'].includes(zone))return {allowed:true,penalty:0,review:['Zone unknown: confirm range manually.']};
 if(melee&&zone!=='shared')return {allowed:false,penalty:0,reason:'Melee requires an Engaged target in the Shared Zone.'};
 if(throwing&&zone==='distant')return {allowed:false,penalty:0,reason:'Thrown weapons cannot target Distant Zones.'};
 if(pistol&&zone==='distant')return {allowed:false,penalty:0,reason:'Pistols cannot target Distant Zones.'};
 let penalty=zone==='shared'?0:zone==='adjacent'?(deployed?0:2):3*Math.max(2,Math.trunc(number(steps)||2));
 if(pistol&&zone==='adjacent')penalty=Math.max(penalty,4);
 return {allowed:true,penalty,review:melee?['Confirm the target is Engaged before using a melee weapon.']:[]};
}
const SHOTGUN_ID='WPN017';
export function ammoCompatibility(weapon,ammo){
 if(!ammo)return {allowed:true,reason:'Standard ammunition / equipment Depletion applies.'};
 if(weapon?.type!=='weapon'||ammo?.type!=='ammunition')return {allowed:false,reason:'Ammunition and Weapon records are required.'};
 const w=weapon.system||{},a=ammo.system||{};
 if(a.consumable!==false&&number(a.quantity)<=0)return {allowed:false,reason:'No remaining ammunition.'};
 const compatible=normalize(a.compatible),shotgun=w.catalogId===SHOTGUN_ID||normalize(weapon.name)==='utas uts 15 shotgun';
 if(compatible==='firearm'){
   if(shotgun)return {allowed:false,reason:'Shotgun requires a compatible shell, not generic rounds.'};
   if(normalize(w.skill)!=='firearms')return {allowed:false,reason:'Generic rounds require a conventional Firearms weapon.'};
   if(w.ammoFamily&&normalize(w.ammoFamily)!=='firearm')return {allowed:false,reason:`Weapon uses ${w.ammoFamily} ammunition.`};
   return {allowed:true,reason:'Generic Firearms ammunition.'};
 }
 if(compatible===normalize(weapon.name)||compatible===normalize(w.catalogId))return {allowed:true,reason:'Specific weapon ammunition.'};
 return {allowed:false,reason:`${ammo.name} is compatible with ${a.compatible}, not ${weapon.name}.`};
}
export function targetSleeveType(target){const items=target?.items||[];const sleeve=[...items].find(i=>i.type==='sleeve'&&i.system?.status==='active');return normalize(sleeve?.system?.sleeveType||target?.system?.identity?.sleeveType||'unknown');}
export function ammunitionProfile(ammo,{targetType='unknown',zone='shared',successDegrees=1}={}){
 if(!ammo)return {damageBonus:0,damageOverride:'',damageFormulaExtra:'',damageType:'',armorPiercing:false,notes:[],review:[]};
 const s=ammo.system||{},id=s.catalogId,synthetic=['synthetic low','synthetic mid','synthetic high','synthetic'].includes(normalize(targetType))||normalize(targetType)==='vehicle';
 const organic=['natal','clone','birth','organic'].includes(normalize(targetType)),notes=[],review=[];
 let damageBonus=number(s.damageBonus),override=s.damageOverride||'',extra=s.damageFormulaExtra||'';
 if(['AMM002','AMM003','AMM005','AMM010'].includes(id)){
   const qualifies=id==='AMM002'?synthetic:organic;
   if(!qualifies)damageBonus=0;
   if(normalize(targetType)==='unknown')review.push(`${ammo.name}: target sleeve type unknown; conditional bonus not applied.`);
 }
 if(id==='AMM007')override=zone==='shared'?'1d8+PB':zone==='adjacent'?'1d6+PB':'';
 if(id==='AMM007'&&zone==='distant')review.push('Buckshot damage at Distant range is not specified; GM adjudication required.');
 if(id==='AMM008')override=synthetic?'1d8+PB':'1d6+PB';
 if(id==='AMM004'){extra=`${Math.max(1,Math.trunc(number(successDegrees)||1))}d4`;review.push('Reaper poison: target Endurance check/Poisoned outcome requires GM resolution.');}
 if(['AMM006','AMM012'].includes(id)){override='None';notes.push('Use the special Breach or Stun Triggered Effect; do not roll standard damage.');}
 if(['AMM002','AMM008'].includes(id))review.push('EMP Powered-gear interference requires GM selection and a target-specific check.');
 if(id==='AMM003')review.push('Apply published Plasma Real Death save adjustment if relevant.');
 if(id==='AMM010')notes.push('Plasma Shells: conditional +2 against natal/clone only.');
 return {damageBonus,damageOverride:override,damageFormulaExtra:extra,damageType:s.damageType||'',armorPiercing:Boolean(s.armorPiercing),notes,review};
}
export function advancedAttack(action='normal',{weapon=null,ammo=null,zone='shared',engaged=false}={}){
 const s=weapon?.system||{},skill=normalize(s.skill),melee=['melee combat','brawl','martial arts'].includes(skill),notes=[];
 const stunAvailable=melee||normalize(s.triggeredEffects).includes('stun')||normalize(s.specialRules).includes('stun')||['AMM012'].includes(ammo?.system?.catalogId);
 if(action==='stun'&&!stunAvailable)return {allowed:false,reason:'Ranged Stun requires a stun setting or Stun ammunition.'};
 if(action==='grapple'&&(!engaged||zone!=='shared'))return {allowed:false,reason:'Grapple requires Engaged opponents in the Shared Zone.'};
 if(['normal','stun','disarm','suppression','blast','headshot','grapple','parry','dodge'].indexOf(action)<0)return {allowed:false,reason:'Unknown special attack.'};
 if(action==='stun'){notes.push('Stun: melee attack +2 TR; no standard damaging Triggered Effect. Resolve Stun status using source procedure.');return {allowed:true,bonus:melee?2:0,allowDamage:false,notes};}
 if(action==='disarm'){notes.push('On a successful Hit, disarm one Hand-slot item. Damage only through separately resolved damaging effects.');return {allowed:true,bonus:0,allowDamage:false,notes};}
 if(action==='suppression'){notes.push('Suppression Fire: allocate triggered effects and appropriate defensive/status outcomes with the GM.');return {allowed:true,bonus:0,allowDamage:false,notes};}
 if(action==='blast'){notes.push('Blast: GM chooses Center, Radius and targets. Resolve relevant Saves individually.');return {allowed:true,bonus:0,allowDamage:false,notes};}
 if(action==='headshot'){notes.push('Optional Hit Location: roll d12; head/neck is a result of 1, not an automatic critical. GM applies relevant rules.');return {allowed:true,bonus:0,allowDamage:true,notes};}
 if(action==='grapple'){notes.push('Grapple is an opposed Speed Die Move Action: lowest die wins, Perception Bonus breaks ties.');return {allowed:true,bonus:0,allowDamage:false,notes};}
 if(action==='parry'||action==='dodge'){notes.push('Defensive Save: choose appropriate Skill, available Speed Dice and triggered Protection.');return {allowed:true,bonus:0,allowDamage:false,notes};}
 return {allowed:true,bonus:0,allowDamage:true,notes};
}
export function parseInstalledUpgrades(raw){
 if(!raw)return [];
 let list=raw;if(typeof list==='string'){try{list=JSON.parse(list);}catch{throw new Error('Installed upgrades must contain a valid JSON array.');}}
 if(!Array.isArray(list))throw new Error('Installed upgrades must be an array.');
 return list.map(x=>({id:String(x.id||''),name:String(x.name||'').trim(),techCost:Math.max(0,number(x.techCost)),kitId:String(x.kitId||''),hardwired:Boolean(x.hardwired),modelVariant:Boolean(x.modelVariant),attachment:Boolean(x.attachment),linkedTo:String(x.linkedTo||''),category:String(x.category||''),notes:String(x.notes||'')}));
}
export function availableUpgradeNames(item,generic=[]){
 const itemNames=String(item?.system?.upgrades||'').replace(/<[^>]+>/g,' ').split(';').map(s=>s.trim()).filter(Boolean);
 const extra=(item?.type==='weapon'?generic:[]).map(u=>u.name);
 return unique([...itemNames,...extra]);
}
export function effectiveCapacity(item){const extra=parseInstalledUpgrades(item?.system?.installedUpgrades).filter(u=>normalize(u.name)==='enhanced power cell').length*5;return number(item?.system?.capacity)+extra;}
export function upgradeModifiers(item,{zone='shared',aimed=false,deployed=false}={}){
 const names=parseInstalledUpgrades(item?.system?.installedUpgrades).map(x=>normalize(x.name));let gearBonus=0,difficulty=0,ignoreDistant=0;const notes=[];
 if(names.includes('extended barrel')){if(zone==='adjacent')gearBonus=Math.max(gearBonus,1);if(zone==='shared')difficulty+=1;notes.push('Extended Barrel');}
 if(names.includes('sight, laser')&&zone==='shared'&&item?.system?.powered)gearBonus=Math.max(gearBonus,1);
 if(aimed&&deployed){if(names.includes('scope')&&zone==='shared')gearBonus=Math.max(gearBonus,1);if(names.includes('scope, longshot')){if(zone==='adjacent')gearBonus=Math.max(gearBonus,1);if(zone==='distant')ignoreDistant=1;}}
 if(names.includes('scope, sniper'))notes.push('Sniper Scope: confirm detailed Linked/Aim optics bonus from official entry.');
 return {gearBonus,difficulty,ignoreDistant,notes};
}
export function upgradePlan(item,upgrade,{generic=false,technician=false,kitAvailable=false,gmOverride=false,rest=false,custom=false}={}){
 if(!item||!GEAR_TYPES.has(item.type))throw new Error('Select a modifiable gear Item.');
 if(!upgrade||!String(upgrade.name||'').trim())throw new Error('Select an Upgrade.');
 const s=item.system||{},installed=parseInstalledUpgrades(s.installedUpgrades),name=String(upgrade.name).trim();
 if(installed.some(u=>normalize(u.name)===normalize(name)))throw new Error(`${name} is already installed; duplicate upgrades need a specific source exception.`);
 const specific=String(s.upgrades||'').toLowerCase().includes(name.toLowerCase());
 if(!specific&&!generic&&!custom&&!gmOverride)throw new Error('This upgrade is not listed for this equipment.');
 if(generic&&item.type!=='weapon')throw new Error('Generic weapon upgrades are only for weapons.');
 if((s.standardIssue||s.requisition)&&!gmOverride)throw new Error('Standard Issue/Requisition equipment requires GM authorization to modify.');
 if(custom&&!gmOverride)throw new Error('Narrative custom upgrades require GM approval.');
 const attachment=Boolean(upgrade.attachment),hardwired=Boolean(upgrade.hardwired);
 if(attachment&&!rest&&!gmOverride)throw new Error('Attachments require a Short Rest or GM-approved 3 Speed Dice alternative.');
 if(!attachment&&!kitAvailable&&!gmOverride)throw new Error('A designated Upgrade Kit is required to attempt this modification.');
 const techCost=Math.max(1,Math.trunc(number(upgrade.techCost)||1))+((generic&&!specific&&!technician)?1:0);
 const used=number(s.techUsed),available=number(s.techPoints);
 if(used+techCost>available)throw new Error(`Insufficient Tech Points (${used}/${available} used, requires ${techCost}).`);
 return {upgrade:{id:String(upgrade.id||''),name,techCost,hardwired,attachment,modelVariant:Boolean(upgrade.modelVariant),linkedTo:String(upgrade.linkedTo||''),category:custom?'Narrative':(generic?'Generic Weapon':'Item'),notes:String(upgrade.notes||'')},techCost,tr:attachment?null:upgradeTR(used),requiresCheck:!attachment,consumeKit:!attachment,usedBefore:used,usedAfter:used+techCost};
}
export function respecPlan(item,upgradeIndex,{gmOverride=false}={}){
 const installed=parseInstalledUpgrades(item?.system?.installedUpgrades),u=installed[Number(upgradeIndex)];if(!u)throw new Error('Installed upgrade not found.');
 if(u.hardwired)throw new Error('Hardwired upgrades cannot be respecced.');
 if(u.modelVariant&&!gmOverride)throw new Error('Model Variant respec requires a GM ruling and incurs Skill Check -2.');
 const used=number(item.system?.techUsed);return {upgrade:u,index:Number(upgradeIndex),tr:respecTR(used),usedBefore:used,usedAfter:Math.max(0,used-u.techCost),requiresCheck:true,refundKit:false,penalty:u.modelVariant?-2:0};
}
export function chassisPlan(item,added=1){
 const s=item?.system||{},original=number(s.chassisBaseRecorded?s.baseTechPoints:s.techPoints),current=number(s.techPoints),next=current+Math.max(1,Math.trunc(number(added)||1));
 if(next>maxChassisTechPoints(original))throw new Error(`Chassis Tech Point cap is ${maxChassisTechPoints(original)} for an original ${original} Q item.`);
 return {current,next,added:next-current,maximum:maxChassisTechPoints(original)};
}
/** For mixed Armor Piercing / damage types, require explicit confirmation rather than assume an illegal cumulative reduction. */
export function resolutionPreview(events=[],items=[],{baseProtection=0,cover=null,augmentationProtection=0}={}){
 const valid=events.filter(e=>number(e.wounds)>0),incoming=valid.reduce((sum,e)=>sum+number(e.wounds),0);
 if(!incoming)return {incoming:0,automatic:true,protection:0,netWounds:0,needsGMReview:false,notes:[]};
 const variants=unique(valid.map(e=>`${normalize(e.damageType)}:${Boolean(e.armorPiercing)}`));
 const first=valid[0];const profile=armourProfile(items,{damageType:first.damageType||'',armorPiercing:Boolean(first.armorPiercing),baseProtection,cover,augmentationProtection});
 const review=!profile.valid||variants.length>1;
 return {incoming,automatic:!review,protection:review?0:profile.protection,netWounds:review?incoming:Math.max(1,incoming-profile.protection),needsGMReview:review,
   notes:[...profile.issues,...(variants.length>1?['Mixed damage types and/or Armor Piercing: set Protection manually for aggregate Resolution Wounds.']:[])],profile};
}

/** Core p.137: lower committed Speed Die chooses the Grapple; PB breaks tied dice. */
export function grappleContest(attackerDie,defenderDie,attackerPB=0,defenderPB=0){
 const a=Number(attackerDie),b=Number(defenderDie),ap=Number(attackerPB),dp=Number(defenderPB);
 if(![a,b].every(v=>Number.isInteger(v)&&v>=1&&v<=6))throw new Error('Grapple requires two unspent d6 Speed Die results.');
 if(a<b)return {winner:'attacker',grappled:true,reason:'Attacker has the lower committed Speed Die.'};
 if(b<a)return {winner:'defender',grappled:false,reason:'Defender has the lower committed Speed Die.'};
 if(ap>dp)return {winner:'attacker',grappled:true,reason:'Tied dice; attacker wins by higher Perception Bonus.'};
 if(dp>ap)return {winner:'defender',grappled:false,reason:'Tied dice; defender wins by higher Perception Bonus.'};
 return {winner:'tie',grappled:false,reason:'Both dice and Perception Bonuses tied; GM resolves the standoff.'};
}

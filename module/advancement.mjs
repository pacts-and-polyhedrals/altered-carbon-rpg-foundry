/** Stack Point advancement shared by the creator and existing-character wizard.
 * Quotes are pure data. Applying a quote preserves resources unrelated to SP,
 * rechecks stale state, blocks duplicate submissions and compensates Item writes
 * if the final Actor update fails. No character level or XP rules are invented.
 */
import {skillUpgradeCost,specializationCost,attributeIncreaseFormula,SLEEVE_LIMITS,traitCost,canPurchaseTrait} from './rules-engine.mjs';
import {dedupeSheetRecords} from './sheet-record-utils.mjs';
export const SYS='altered-carbon-rpg';
export const ATTRIBUTES=['strength','perception','empathy','willpower','acuity','intelligence'];
const copy=v=>JSON.parse(JSON.stringify(v));
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'');
const pending=new Set();
export const TREE_COMMON={Criminal:'Crime',Official:'Law and Government',Socialite:'Business and Society',Soldier:'Combat',Technician:'Technology'};
export const TREE_ANOMALY={Criminal:'Law and Government',Official:'Crime',Socialite:'Survival',Soldier:'Business and Society',Technician:'Combat'};
export function commonalityFor(identity,tree,overrides={}){
  if(overrides[tree])return overrides[tree];
  if(tree==='Praxis'&&Number(identity.dhfAge)>100)return 'common';
  if(TREE_COMMON[identity.archetype]===tree)return 'common';
  if(TREE_ANOMALY[identity.archetype]===tree)return 'anomaly';
  return identity.archetype==='Civilian'?null:'uncommon';
}
function integer(v,label,min=0){const n=Number(v);if(!Number.isFinite(n)||!Number.isInteger(n)||n<min)throw new Error(`${label} must be a whole number of at least ${min}.`);return n;}
export function advancementSnapshot(actor){
  const raw=actor.toObject?actor.toObject():copy(actor);
  const items=(raw.items??actor.items?.contents??[]).map(i=>i.toObject?i.toObject():copy(i));
  return {system:copy(raw.system??actor.system),items,flags:copy(raw.flags??actor.flags??{})};
}
export function snapshotFingerprint(state){
  // Do not include mutable HP/EP, chat state or unrelated equipment. Changes to
  // SP, purchased capabilities, caps or the active sleeve invalidate a quote.
  return JSON.stringify({sp:state.system.resources.stackPoints.value,attributes:state.system.attributes,identity:state.system.identity,
    items:state.items.filter(i=>['skill','specialisation','trait'].includes(i.type)||(i.type==='sleeve'&&i.system.status==='active')),
    caps:state.flags[SYS]?.advancementCaps,commonality:state.flags[SYS]?.traitCommonality,unlocks:state.flags[SYS]?.unlockedBranches,
    history:state.flags[SYS]?.advancementHistory});
}
export function attributeLimit(state,key){
  const custom=state.flags[SYS]?.advancementCaps?.[key];
  if(Number.isFinite(Number(custom))&&Number(custom)>0)return Math.min(150,Number(custom));
  const sleeve=state.items.find(i=>i.type==='sleeve'&&i.system.status==='active');
  return ['strength','perception'].includes(key)?(SLEEVE_LIMITS[sleeve?.system.sleeveType??'birth']??SLEEVE_LIMITS.other)[key][1]:50;
}
export function attributeValue(state,key){
  const sleeve=state.items.find(i=>i.type==='sleeve'&&i.system.status==='active');
  return Number(['strength','perception'].includes(key)&&sleeve?sleeve.system[key]:state.system.attributes[key]);
}
function getSkill(state,id){const s=state.items.find(i=>i.type==='skill'&&(i._id===id||i.id===id||i.system.catalogId===id));if(!s)throw new Error('That Skill is no longer on this character.');return s;}
function setAttribute(state,key,value){const sleeve=state.items.find(i=>i.type==='sleeve'&&i.system.status==='active');if(['strength','perception'].includes(key)&&sleeve)sleeve.system[key]=value;else state.system.attributes[key]=value;}
/** Validate every request before any world data or dice are touched. */
export function quoteAdvancement(input,requests,{traits=[]}={}){
  if(!Array.isArray(requests)||!requests.length)throw new Error('Choose an advancement first.');
  const state=copy(input),before=integer(state.system.resources.stackPoints.value,'Available Stack Points'),steps=[];
  let total=0;
  for(const request of requests){
    let step;
    if(request.kind==='skill'){
      const skill=getSkill(state,request.itemId),from=integer(skill.system.level,'Skill level',1),cost=skillUpgradeCost(from);
      if(!cost)throw new Error(`${skill.name} is already at the maximum Skill Level.`);
      step={kind:'skill',itemId:skill._id??skill.id,from,to:from+1,cost,label:`${skill.name}: Level ${from} to ${from+1}`};skill.system.level++;
    }else if(request.kind==='attribute'){
      const key=request.attribute;if(!ATTRIBUTES.includes(key))throw new Error('Choose a valid Attribute.');
      const cost=integer(request.sp,'Attribute SP',1),from=attributeValue(state,key),cap=attributeLimit(state,key);
      if(from>=cap)throw new Error(`${key} is already at its advancement cap of ${cap}.`);
      if(cost>cap-from)throw new Error(`Spend at most ${cap-from} SP on ${key}; even minimum die results would otherwise exceed the cap.`);
      step={kind:'attribute',attribute:key,from,cap,cost,formula:attributeIncreaseFormula(cost),label:`${key}: roll ${attributeIncreaseFormula(cost)} (cap ${cap})`};
      // Preview reserves minimum gains; actual rolls are resolved only on Apply.
      setAttribute(state,key,from+cost);
    }else if(request.kind==='specialisation'){
      const skill=getSkill(state,request.itemId),name=clean(request.name);
      if(!name||name.length>100)throw new Error('Enter a Specialisation name of 1 to 100 characters.');
      const owned=dedupeSheetRecords(state.items).filter(i=>i.type==='specialisation'&&norm(i.system.skill)===norm(skill.name));
      const inline=clean(skill.system.specialisations).split(/[,;\n]/).filter(Boolean);
      if(owned.some(i=>norm(i.name)===norm(name))||inline.some(s=>norm(s)===norm(name)))throw new Error(`${name} is already recorded for ${skill.name}.`);
      const names=new Set([...owned.map(i=>norm(i.name)),...inline.map(norm)]),cost=specializationCost(names.size);
      const item={name,type:'specialisation',system:{skill:skill.name,missingDifficulty:integer(request.missingDifficulty??0,'Untrained Difficulty'),rulesRef:'Core Rulebook 2020, Specializations'}};
      step={kind:'specialisation',cost,label:`${skill.name}: ${name}`,item};state.items.push(copy(item));
    }else if(request.kind==='trait'){
      const trait=traits.find(t=>t.id===request.catalogId);if(!trait)throw new Error('Choose a Trait from the installed catalog.');
      if(state.items.some(i=>i.type==='trait'&&(i.system.catalogId===trait.id||(norm(i.name)===norm(trait.name)&&norm(i.system.branch)===norm(trait.branch)))))throw new Error(`${trait.name} is already recorded.`);
      const owned=dedupeSheetRecords(state.items).filter(i=>i.type==='trait'&&i.system.tree===trait.tree).map(i=>i.system);
      let commonality=commonalityFor(state.system.identity,trait.tree,state.flags[SYS]?.traitCommonality??{});
      if(!commonality){
        // Civilian tree choices and variant exceptions must never be invented.
        if(!request.confirmCommonality||!['common','uncommon','anomaly'].includes(request.commonality))throw new Error('Confirm the table-approved Commonality for this Civilian Trait tree.');
        commonality=request.commonality;
      }
      if(!canPurchaseTrait({commonality,tier:trait.tier,branch:trait.branch,owned}))throw new Error(`${trait.name}: buy the required lower-tier Traits first.`);
      const branchKey=`${trait.tree}::${trait.branch}`;
      const unlocked=owned.some(t=>t.branch===trait.branch)||(state.flags[SYS]?.unlockedBranches??[]).includes(branchKey);
      const unlockCommonality=state.system.identity.archetype==='Civilian'&&trait.branch==='Citizenship'?'common':commonality;
      const unlockCost=unlocked?0:traitCost(unlockCommonality,1,{unlock:true});
      const cost=traitCost(commonality,trait.tier)+unlockCost;
      const item={name:trait.name,type:'trait',system:{catalogId:trait.id,tree:trait.tree,branch:trait.branch,tier:trait.tier,commonality,spCost:cost,effect:trait.effect,description:trait.effect,rulesRef:trait.rulesRef}};
      state.flags[SYS]??={};state.flags[SYS].traitCommonality??={};state.flags[SYS].traitCommonality[trait.tree]=commonality;
      step={kind:'trait',cost,unlockCost,commonality,branchKey,tree:trait.tree,label:`${trait.name} (Tier ${trait.tier}, ${commonality}${unlockCost?`, includes ${unlockCost} SP branch unlock`:''})`,item};state.items.push(copy(item));
    }else throw new Error('Unknown advancement type.');
    total+=step.cost;if(total>before)throw new Error(`Not enough Stack Points: this plan costs ${total} SP; ${before} SP are available.`);
    steps.push(step);
  }
  return {steps,total,before,after:before-total,state,fingerprint:snapshotFingerprint(input)};
}
export function canAdvance(actor){return Boolean(actor&&['character','ai','npc'].includes(actor.type)&&(game.user?.isGM||actor.isOwner));}
export async function applyAdvancement(actor,requests,{traits=[],reason='',expectedFingerprint=null}={}){
  if(!canAdvance(actor))throw new Error('Only an owner or GM may advance this character.');
  const key=actor.uuid??actor.id;if(pending.has(key))throw new Error('An advancement is already being applied to this character.');
  pending.add(key);
  const original=advancementSnapshot(actor),fingerprint=snapshotFingerprint(original);
  let changed=[],created=[];
  try{
    if(expectedFingerprint&&expectedFingerprint!==fingerprint)throw new Error('The character changed while this window was open. Review the updated costs and try again.');
    const quote=quoteAdvancement(original,requests,{traits}),state=copy(original),rolls=[],results=[];
    for(const step of quote.steps){
      if(step.kind==='skill'){const skill=getSkill(state,step.itemId);skill.system.level=step.to;results.push({...step});}
      if(step.kind==='attribute'){
        const roll=await new Roll(step.formula).evaluate(),raw=Number(roll.total),from=attributeValue(state,step.attribute);
        if(!Number.isFinite(raw)||raw<step.cost)throw new Error('Attribute advancement produced an invalid die result. No SP were spent.');
        const to=Math.min(step.cap,from+raw);setAttribute(state,step.attribute,to);rolls.push(roll);
        results.push({...step,from,to,rolled:raw,gain:to-from});
      }
      if(['trait','specialisation'].includes(step.kind)){state.items.push(copy(step.item));results.push({...step,item:undefined});}
      if(step.kind==='trait'){state.flags[SYS]??={};state.flags[SYS].traitCommonality??={};state.flags[SYS].traitCommonality[step.tree]=step.commonality;}
    }
    if(snapshotFingerprint(advancementSnapshot(actor))!==fingerprint)throw new Error('The character changed before advancement was applied. No SP were spent. Please review and retry.');
    const updates=[];
    for(const item of state.items){
      const id=item._id??item.id;if(!id)continue;
      const prior=original.items.find(i=>(i._id??i.id)===id);if(!prior)continue;
      const patch={_id:id},undo={_id:id};
      for(const field of ['level','strength','perception'])if(item.system[field]!==prior.system[field]){patch[`system.${field}`]=item.system[field];undo[`system.${field}`]=prior.system[field];}
      if(Object.keys(patch).length>1){updates.push(patch);changed.push(undo);}
    }
    if(updates.length)await actor.updateEmbeddedDocuments('Item',updates);
    const newItems=state.items.filter(i=>!(i._id??i.id));
    if(newItems.length)created=await actor.createEmbeddedDocuments('Item',newItems);
    const entry={id:globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`,at:new Date().toISOString(),userId:game.user.id,reason:clean(reason).slice(0,500),spent:quote.total,before:quote.before,after:quote.after,steps:results};
    const history=[...(original.flags[SYS]?.advancementHistory??[]),entry];
    const patch={'system.resources.stackPoints.value':quote.after,[`flags.${SYS}.advancementHistory`]:history};
    for(const a of ATTRIBUTES)if(state.system.attributes[a]!==original.system.attributes[a])patch[`system.attributes.${a}`]=state.system.attributes[a];
    if(JSON.stringify(state.flags[SYS]?.traitCommonality)!==JSON.stringify(original.flags[SYS]?.traitCommonality))patch[`flags.${SYS}.traitCommonality`]=state.flags[SYS].traitCommonality;
    // Final Actor write is the SP charge and durable record. No Health, Ego,
    // currency, equipment, existing history or relationships are reset.
    await actor.update(patch);
    return {entry,rolls};
  }catch(error){
    const rollbackErrors=[];
    if(created.length)try{await actor.deleteEmbeddedDocuments('Item',created.map(i=>i.id));}catch(e){rollbackErrors.push(e.message);}
    if(changed.length)try{await actor.updateEmbeddedDocuments('Item',changed);}catch(e){rollbackErrors.push(e.message);}
    if(rollbackErrors.length){console.error('Altered Carbon | Advancement compensation failed',rollbackErrors);throw new Error(`${error.message} Item rollback also failed; no successful SP charge was recorded. Ask the GM to inspect this character before retrying.`);}
    throw error;
  }finally{pending.delete(key);}
}

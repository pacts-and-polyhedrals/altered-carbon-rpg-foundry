import {recordReaperAction} from './clinical-workflow.mjs';
import {equipmentTags} from './core-effect-engine-v2.mjs';
import {evaluateEffects,derivedEffectValue} from './effects.mjs';
import {firingModeProfile} from './rules-engine.mjs';
import {rollSkill} from './rolls.mjs';
import {checkGrade} from './chat-ui.mjs';
import {ammoCompatibility,ammunitionProfile,advancedAttack,targetSleeveType} from './combat-equipment.mjs';
import {queueIncomingDamage} from './combat-workflow.mjs';
import {repeatTriggeredDamageFormula,damageDieCount} from './damage-formulas.mjs';

const FLAG='altered-carbon-rpg';
const esc=value=>foundry.utils.escapeHTML(String(value??''));
const normalizedId=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function formValue(form,key){return form instanceof FormData?form.get(key):form?.[key];}
function firstTargetActor(){return [...game.user.targets][0]?.actor??null;}
function parseBonusDice(value=''){return String(value).split(',').map(x=>Number(x.trim())).filter(x=>[4,6,8,10,12].includes(x));}
function itemBonusDice(item,skillSides){const legacy=parseBonusDice(item?.system?.bonusDice);if(legacy.length)return legacy;const count=Math.max(0,Number(item?.system?.bonusDiceCount||0));return Array.from({length:count},()=>Number(skillSides));}

function findWeaponSkill(actor,weapon){
  const wanted=normalizedId(weapon.system.skill||'firearms');
  return actor.items.find(i=>i.type==='skill'&&(normalizedId(i.system.catalogId)===wanted||normalizedId(i.name)===wanted))
    ||actor.items.find(i=>i.type==='skill'&&normalizedId(i.name).includes(wanted));
}

function substituteDamage(raw,actor){
  const pb=Number(actor.ac?.bonuses?.perception??Math.floor(Number(actor.system.attributes?.perception||0)/10));
  const sb=Number(actor.ac?.bonuses?.strength??Math.floor(Number(actor.system.attributes?.strength||0)/10));
  return String(raw||'').replace(/\bPB\b/gi,String(pb)).replace(/\bSB\b/gi,String(sb));
}

function cleanDamageFormula(raw,actor){
  const replaced=substituteDamage(raw,actor).replace(/\[[^\]]*\]/g,' ').replace(/\b(?:EP|HP|Wounds?|Damage)\b/gi,' ').trim();
  const match=replaced.match(/(?:\d*d\d+|\d+)(?:\s*[+\-]\s*(?:\d*d\d+|\d+))*/i);
  return match?.[0]?.replace(/\s+/g,'')||null;
}

async function chooseDamageRepeats(max=1){
  max=Math.max(1,Math.trunc(Number(max)||1));if(max===1)return 1;
  const form=await foundry.applications.api.DialogV2.input({window:{title:'Damage Triggered Effect'},content:`<div class="form-group"><label>Hit / damage Triggered Effect resolutions</label><input type="number" name="repeats" min="1" max="${max}" value="1"></div><p class="hint">Accuracy repeats the entire damage Triggered Effect, including its per-hit flat bonuses. Separate firing-mode/ammunition bonuses are applied once unless the item rule specifies otherwise.</p>`});
  if(!form)return null;return Math.max(1,Math.min(max,Number(formValue(form,'repeats')||1)));
}

function permissionToChange(actor){return Boolean(game.user.isGM||actor?.isOwner);}

async function resolveTargetActor(preferredUuid=null){
  if(preferredUuid){const actor=await fromUuid(preferredUuid);if(actor)return actor;}
  const targeted=firstTargetActor();if(targeted)return targeted;
  if(!game.user.isGM)return null;
  const actors=game.actors.filter(a=>['character','npc','threat','ai'].includes(a.type));if(!actors.length)return null;if(actors.length===1)return actors[0];
  const options=actors.map(a=>`<option value="${esc(a.uuid)}">${esc(a.name)}</option>`).join('');
  const form=await foundry.applications.api.DialogV2.input({window:{title:'Choose Damage Target'},content:`<div class="form-group"><label>Actor</label><select name="actor">${options}</select></div>`});
  const uuid=formValue(form,'actor');return uuid?fromUuid(uuid):null;
}

async function numericPrompt(title,label,defaultValue=0,{extra=''}={}){
  const form=await foundry.applications.api.DialogV2.input({window:{title},content:`<div class="form-group"><label>${esc(label)}</label><input type="number" name="value" min="0" value="${Number(defaultValue||0)}"></div>${extra}`});
  if(!form)return null;return Math.max(0,Number(formValue(form,'value')||0));
}

async function woundsPrompt(defaultValue=0){
  const form=await foundry.applications.api.DialogV2.input({window:{title:'Apply Resolution Wounds'},content:`<div class="form-group"><label>Total incoming Wounds this Resolution phase</label><input type="number" name="wounds" min="0" value="${Number(defaultValue||0)}"></div><div class="form-group"><label>Total applicable Protection</label><input type="number" name="protection" min="0" value="0"></div><p class="hint">Core 2020 applies Protection once at the end of Resolution against the aggregate Wounds, not separately to every attack.</p>`});
  if(!form)return null;return {wounds:Math.max(0,Number(formValue(form,'wounds')||0)),protection:Math.max(0,Number(formValue(form,'protection')||0))};
}

function depletionSummary(dep){
  if(!dep||dep.skipped)return 'No Depletion check';
  if(dep.automatic)return `DP +${dep.added} -> ${dep.depletion}/${dep.capacity}; automatically Exhausted`;
  if(!dep.checkRequired)return `DP +${dep.added} -> ${dep.depletion}/${dep.capacity}`;
  return `DP +${dep.added} -> ${dep.depletion}/${dep.capacity}; Depletion ${dep.rollResult} vs TR ${dep.tr}: ${dep.passed?'pass':'EXHAUSTED'}`;
}

export async function useEquipment(actor,item,skill,rollOptions={}){
  if(!actor?.isOwner&&!game.user.isGM)throw new Error('Insufficient permission to use this equipment.');
  if(!['equipment','software'].includes(item.type))throw new Error('This action requires Equipment or Software.');
  if(item.system.exhausted)throw new Error(`${item.name} is Exhausted and cannot be used until Depletion Points are removed.`);
  if(!skill||skill.type!=='skill')throw new Error('Choose the Skill Check used with this equipment.');
  const options={...rollOptions,itemTag:rollOptions.itemTag||equipmentTags(item),gearBonus:Number(rollOptions.gearBonus??item.system.gearBonus??0),bonusDice:rollOptions.bonusDice?.length?rollOptions.bonusDice:itemBonusDice(item,skill.skillDieSides),adjudicationKind:'treatment'===rollOptions.adjudicationKind?'treatment':'check',chat:true};
  const result=await rollSkill(actor,skill,options);if(result?.blocked)return result;
  let depletion=null;try{depletion=await item.useDepletion({skillSides:result.sides});}catch(error){ui.notifications.warn(`Equipment used, but Depletion needs manual resolution: ${error.message}`);}
  const grade=checkGrade(result);
  const content=`<section class="ac-chat-card ac-equipment-use ${grade.className}"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">EQUIPMENT USE</span><strong>${esc(actor.name)} — ${esc(item.name)}</strong></div><span class="ac-grade-chip">${esc(grade.label)}</span></header><p class="ac-chat-subtitle">${esc(depletionSummary(depletion))}</p></section>`;
  const message=await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content,flags:{[FLAG]:{equipmentUse:{actorUuid:actor.uuid,itemUuid:item.uuid,checkResult:result,depletion:depletion?{depletion:depletion.depletion,capacity:depletion.capacity,added:depletion.added,rollResult:depletion.rollResult??null,tr:depletion.tr??null,passed:depletion.passed??null,exhausted:depletion.exhausted}:null}}}});
  return {result,depletion,message};
}

export async function useWeapon(actor,weapon,rollOptions={}){
  if(!actor?.isOwner&&!game.user.isGM)throw new Error('Insufficient permission to use this weapon.');
  if(weapon?.type!=='weapon')throw new Error('This action requires a Weapon item.');
  if(weapon.system.exhausted)throw new Error(`${weapon.name} is Exhausted until Depletion Points are removed.`);
  if(actor.getFlag?.(FLAG,'stance')==='full-defense')throw new Error('A character in Full Defense cannot make normal attacks this turn. End the stance first.');
  const skill=findWeaponSkill(actor,weapon);if(!skill)throw new Error(`No matching Skill item found for ${weapon.system.skill||weapon.name}.`);
  const ammunition=rollOptions.ammunitionUuid?await fromUuid(rollOptions.ammunitionUuid):null;
  if(rollOptions.ammunitionUuid&&!ammunition)throw new Error('Selected ammunition is no longer available.');
  if(ammunition){
    if(ammunition.parent?.id!==actor.id)throw new Error('Selected ammunition must belong to the attacking Actor.');
    if(ammunition.system.consumable!==false&&Number(ammunition.system.quantity||0)<1)throw new Error('Ammunition is exhausted; cannot begin this attack.');
    const compatible=ammoCompatibility(weapon,ammunition);if(!compatible.allowed)throw new Error(compatible.reason);
  }
  const action=rollOptions.attackAction||'normal';const special=advancedAttack(action,{weapon,ammo:ammunition,zone:rollOptions.range||'shared',engaged:Boolean(rollOptions.engaged)});
  if(!special.allowed)throw new Error(special.reason);
  if(['grapple','parry','dodge'].includes(action))throw new Error('This action must be performed through the Combat Console, not a weapon Skill roll.');
  const options={...rollOptions,specialisation:rollOptions.specialisation||weapon.system.specialisation||'',itemTag:rollOptions.itemTag||equipmentTags(weapon),gearBonus:Number(rollOptions.gearBonus??weapon.system.gearBonus??0),bonusDice:rollOptions.bonusDice?.length?rollOptions.bonusDice:itemBonusDice(weapon,skill.skillDieSides),adjudicationKind:'attack',chat:true};
  const result=await rollSkill(actor,skill,options);if(result?.blocked)return result;
  // Reaper's HP poison triggers on any Move/Attack action, even a missed attack.
  await recordReaperAction(actor,'attack');
  if(ammunition?.system.consumable!==false){
    // Never decrement when the attack was blocked; never allow depleted ammo to fire.
    if(Number(ammunition.system.quantity||0)<1)throw new Error('Ammunition ran out before the attack was committed.');
    await ammunition.update({'system.quantity':Number(ammunition.system.quantity)-1});
  }
  const modeId=normalizedId(weapon.system.firingMode||'semi-automatic'),mode=firingModeProfile(modeId);
  const availableSuccessDegrees=Math.min(5,Math.max(0,Number(result.successDegrees||0)+Number(mode.extraDegrees||0)));
  const skillTags=equipmentTags(weapon),skillSlug=normalizedId(weapon.system.skill||'firearms');
  const context={skill:skillSlug,itemTag:skillTags,range:rollOptions.range||'shared',activity:rollOptions.activity||'',targetCount:rollOptions.targetCount||1};
  const efficiency=Math.max(0,derivedEffectValue(evaluateEffects(actor,context),'weapon.efficiency',0));
  const burst=['3-round-burst','fully-automatic'].includes(modeId);
  let depletion=null;try{depletion=await weapon.useDepletion({skillSides:result.sides,formula:burst?mode.depletion:null,efficiency});}
  catch(error){ui.notifications.warn(`Weapon used, but Depletion needs manual resolution: ${error.message}`);}
  const target=rollOptions.targetActorUuid?await fromUuid(rollOptions.targetActorUuid):firstTargetActor();
  const ammo=ammunitionProfile(ammunition,{targetType:rollOptions.targetType||targetSleeveType(target),zone:rollOptions.range||'shared',successDegrees:availableSuccessDegrees});
  const depText=depletionSummary(depletion),ammoName=ammunition?.name||'';
  const damageText=ammo.damageOverride||weapon.system.damage||'Special';
  const damageType=ammo.damageType||weapon.system.damageType||'';
  const armorPiercing=Boolean(weapon.system.armorPiercing||ammo.armorPiercing);
  const canDamage=availableSuccessDegrees>0&&special.allowDamage!==false&&rollOptions.allowDamage!==false&&damageText.toLowerCase()!=='none';
  const modeText=mode.extraDegrees?` · Firing mode +${mode.extraDegrees}${mode.damageBonus?`, Damage +${mode.damageBonus}`:''}`:'';
  const grade=checkGrade(result),notes=[...(rollOptions.attackNotes||[]),...ammo.notes,...ammo.review];
  const notesHTML=notes.length?`<p class="ac-request-context">${notes.map(x=>esc(x)).join(' · ')}</p>`:'';
  const content=`<section class="ac-chat-card ac-weapon-use ${grade.className}"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">WEAPON RESOLUTION · ${esc(action.toUpperCase())}</span><strong>${esc(actor.name)} — ${esc(weapon.name)}</strong></div><span class="ac-grade-chip">${esc(grade.label)}</span></header><p class="ac-chat-subtitle">${esc(rollOptions.range||'Unspecified Zone')}${modeText?` · ${esc(modeText.replace(/^ · /,''))}`:''} · ${esc(depText)}</p><div class="ac-request-meta"><span>Triggered +: ${availableSuccessDegrees}</span><span>Damage: ${esc(damageText)}</span>${damageType?`<span>${esc(damageType)}</span>`:''}${armorPiercing?'<span>Armor Piercing</span>':''}${ammoName?`<span>Ammo: ${esc(ammoName)}</span>`:''}${Number(weapon.system.deadly||0)>0?`<span>Deadly ${Number(weapon.system.deadly)}</span>`:''}</div>${notesHTML}${canDamage?'<div class="ac-chat-actions"><button type="button" data-ac-action="roll-damage">Roll Damage</button></div>':''}${availableSuccessDegrees>0&&action==='disarm'?'<div class="ac-chat-actions"><button type="button" data-ac-action="resolve-disarm">GM: Resolve Disarm</button></div>':''}${availableSuccessDegrees>0&&action==='stun'?'<div class="ac-chat-actions"><button type="button" data-ac-action="resolve-stun">GM: Resolve Stun</button></div>':''}</section>`;
  const message=await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content,flags:{[FLAG]:{weaponUse:{actorUuid:actor.uuid,itemUuid:weapon.uuid,targetActorUuid:target?.uuid||null,checkResult:result,availableSuccessDegrees,damageBonus:Number(mode.damageBonus||0)+Number(ammo.damageBonus||0),ammunitionUuid:ammunition?.uuid||null,damageOverride:ammo.damageOverride,damageTypeOverride:damageType,armorPiercingOverride:armorPiercing,damageFormulaExtra:ammo.damageFormulaExtra,firingMode:modeId,attackAction:action,attackActivity:rollOptions.activity||'',range:rollOptions.range||'shared',attackTargetCount:rollOptions.targetCount||1,attackTags:skillTags,attackNotes:notes,canDamage,depletion:depletion?{depletion:depletion.depletion,capacity:depletion.capacity,added:depletion.added,rollResult:depletion.rollResult??null,tr:depletion.tr??null,passed:depletion.passed??null,exhausted:depletion.exhausted}:null}}}});
  return {result,depletion,message};
}


export async function useDrug(actor,item){
  // Kept as an API compatibility entry point; no unchecked active-state toggles.
  const {ACClinicalConsole}=await import('./clinical-console.mjs');
  if(!actor?.isOwner&&!game.user.isGM)throw new Error('Insufficient permission to use this Drug.');
  if(item?.type!=='drug')throw new Error('A Drug Item is required.');
  return new ACClinicalConsole({actorId:actor.id,drugId:item.id}).render({force:true});
}

async function rollWeaponDamage(message,data){
  const actor=await fromUuid(data.actorUuid),weapon=await fromUuid(data.itemUuid);
  if(!actor||!weapon)return ui.notifications.warn('Weapon or Actor is no longer available.');
  if(!permissionToChange(actor))return ui.notifications.warn('You do not have permission to roll damage for this Actor.');
  if(!data.canDamage)return ui.notifications.warn('This special action does not inflict automatic weapon damage.');
  let formula=cleanDamageFormula(data.damageOverride||weapon.system.damage,actor);
  if(!formula){const form=await foundry.applications.api.DialogV2.input({window:{title:`${weapon.name} Damage`},content:'<div class="form-group"><label>Damage formula (GM-approved)</label><input name="formula" value="1d6"></div>'});if(!form)return;formula=String(formValue(form,'formula')||'1d6');}
  const maxRepeats=Number(weapon.system.accuracy||0)>0?Math.max(1,Number(data.availableSuccessDegrees||data.checkResult?.successDegrees||1)):1;
  const repeats=await chooseDamageRepeats(maxRepeats);if(!repeats)return;
  const effectContext={skill:normalizedId(weapon.system.skill),itemTag:data.attackTags||equipmentTags(weapon),range:data.range||'shared',
    activity:data.attackActivity||'',targetCount:Number(data.attackTargetCount||1),damageType:normalizedId(data.damageTypeOverride||weapon.system.damageType||'')};
  const traitDamage=Math.trunc(derivedEffectValue(evaluateEffects(actor,effectContext),'damage.bonus',0));
  const perHitFormula=traitDamage?`${formula}${traitDamage>0?'+':''}${traitDamage}`:formula;
  const baseFormula=repeatTriggeredDamageFormula(perHitFormula,repeats),coreDiceCount=damageDieCount(baseFormula);
  formula=baseFormula;
  if(Number(data.damageBonus||0))formula=`(${formula})+${Number(data.damageBonus)}`;
  const extra=cleanDamageFormula(data.damageFormulaExtra||'',actor);if(extra)formula=`(${formula})+(${extra})`;
  let roll;try{roll=await new Roll(formula).evaluate();}catch(error){return ui.notifications.error(`Invalid damage formula: ${error.message}`);}
  const amount=Math.max(0,Number(roll.total||0)),ego=/\bEP\b/i.test(String(weapon.system.damage||''))||String(weapon.system.damageType||'').toLowerCase()==='ego';
  const deadlyDice=Math.max(0,Math.min(coreDiceCount,Number(weapon.system.deadly||0)));
  // Deadly 0 MUST NOT select every die via .slice(-0).
  const rolls=roll.dice.flatMap(d=>d.results.filter(r=>r.active!==false).map(r=>Number(r.result||0)));
  const deadlyHP=ego?0:(deadlyDice?rolls.slice(0,coreDiceCount).slice(-deadlyDice).reduce((sum,n)=>sum+n,0):0);
  const targetUuid=data.targetActorUuid||firstTargetActor()?.uuid||null;
  let location=null,locRoll=null;if(data.attackAction==='headshot'){locRoll=await new Roll('1d12').evaluate();location=Number(locRoll.total);}
  const stateButtons=ego?'':` <button type="button" data-ac-action="apply-direct-hp">Manual HP</button> <button type="button" data-ac-action="sleeve-dead">Sleeve Dead</button> <button type="button" data-ac-action="stack-damaged">Damage Stack</button> <button type="button" data-ac-action="real-death">Real Death</button> <button type="button" data-ac-action="begin-resleeving">Begin Resleeving</button>`;
  const content=`<section class="ac-chat-card ac-damage-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">DAMAGE OUTPUT</span><strong>${esc(weapon.name)}</strong></div><span class="ac-grade-chip">${amount} ${ego?'EP':'WND'}</span></header><p class="ac-chat-subtitle"><strong>${amount}</strong> ${ego?'Ego Points':'Wounds'} · ${esc(formula)}${repeats>1?` · ${repeats} resolutions`:''}</p>${deadlyHP?`<p class="ac-request-context">Deadly: ${deadlyHP} potential direct HP after applying Protection to non-Deadly Wounds first.</p>`:''}${location?`<p class="ac-request-context">Optional Hit Location d12: ${location} ${location===1?'(Head/Neck)':''}. GM determines effects.</p>`:''}<div class="ac-chat-actions">${ego?'<button type="button" data-ac-action="apply-ego">Apply Ego</button>':'<button type="button" data-ac-action="queue-wounds">Queue Resolution Wounds</button> <button type="button" data-ac-action="apply-wounds">Manual Apply Wounds</button>'}${stateButtons}</div></section>`;
  await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content,rolls:[roll,...(locRoll?[locRoll]:[])],flags:{[FLAG]:{damage:{sourceActorUuid:actor.uuid,itemUuid:weapon.uuid,targetActorUuid:targetUuid,amount,formula,ego,deadly:Number(weapon.system.deadly||0),deadlyHP,armorPiercing:Boolean(data.armorPiercingOverride),damageType:data.damageTypeOverride||weapon.system.damageType||'',location,sourceMessageId:message.id}}}});
}

async function applyDamageAction(message,action){
  const data=message.getFlag(FLAG,'damage')||{};const target=await resolveTargetActor(data.targetActorUuid);if(!target)return ui.notifications.warn('Target an Actor first, or have the GM choose one.');if(!permissionToChange(target))return ui.notifications.warn('Only the GM or an owner of the target Actor can change its damage/state.');
  if(action==='queue-wounds'){if(data.ego)return ui.notifications.warn('Ego Damage is not queued as Wounds.');const r=await queueIncomingDamage(target,{id:message.id,wounds:data.amount,deadlyHP:data.deadlyHP,deadly:data.deadly,damageType:data.damageType,armorPiercing:data.armorPiercing,source:data.itemUuid});return ui.notifications.info(r.duplicate?'This damage is already queued.':`${data.amount} Wounds queued for ${target.name}. Open the Combat tab to resolve the turn once.`);}
  if(action==='apply-wounds'){const values=await woundsPrompt(data.amount||0);if(!values)return;const result=await target.applyTurnWounds(values.wounds,{protection:values.protection});return ui.notifications.info(`${target.name}: ${result.appliedWounds} Wounds applied, ${result.healthLoss} HP lost.`);}
  if(action==='apply-ego'){const amount=await numericPrompt('Apply Ego Damage','Ego Points lost',data.amount||0);if(amount==null)return;const result=await target.applyEgoDamage(amount);return ui.notifications.info(`${target.name}: Ego ${result.value}.`);}
  if(action==='apply-direct-hp'){const amount=await numericPrompt('Apply Direct Health Loss','Health Points lost',0,{extra:'<p class="hint">Use this only for Deadly/direct-HP portions that bypass Damage Threshold.</p>'});if(amount==null)return;const value=await target.loseHealth(amount);return ui.notifications.info(`${target.name}: Health ${value}.`);}
  if(action==='sleeve-dead'){await target.setSleeveState('dead');return ui.notifications.warn(`${target.name}: sleeve marked dead.`);}
  if(action==='stack-damaged'){await target.setStackState('damaged');return ui.notifications.warn(`${target.name}: cortical stack marked damaged.`);}
  if(action==='real-death'){const ok=await foundry.applications.api.DialogV2.confirm({window:{title:'Confirm Real Death'},content:`<p>Mark <strong>${esc(target.name)}</strong> as Real Death? This destroys the stack and marks the active sleeve destroyed.</p>`});if(ok){await target.markRealDeath();ui.notifications.error(`${target.name}: REAL DEATH.`);}return;}
  if(action==='begin-resleeving'){await target.beginResleeving();return ui.notifications.info(`${target.name}: awaiting resleeving.`);}
}

async function resolveSpecialAttack(message,action){
 if(!game.user.isGM)throw new Error('Only the GM may finalize a Stun or Disarm outcome.');
 const source=message.getFlag(FLAG,'weaponUse')||{};
 if(!Number(source.availableSuccessDegrees||0))throw new Error('No successful attack result to resolve.');
 const target=await resolveTargetActor(source.targetActorUuid);if(!target)throw new Error('Choose a target Actor first.');
 if(target.getFlag(FLAG,`specialAttack-${message.id}-${action}`))throw new Error('This special attack has already been resolved against this target.');
 if(action==='resolve-disarm'){
   if(source.attackAction!=='disarm')throw new Error('The original attack was not a Disarm.');
   const held=target.items.filter(i=>i.type==='weapon'&&i.system.equipState==='equipped');
   if(!held.length)throw new Error(`${target.name} has no equipped weapon to Disarm.`);
   const choices=held.map(i=>`<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('');
   const form=await foundry.applications.api.DialogV2.input({window:{title:'GM: Disarm held item'},content:`<p>Confirm that the Hit and chosen Triggered Effect permits this Disarm. The weapon will be marked Carried rather than Equpped.</p><label>Held Weapon</label><select name="id">${choices}</select><label><input type="checkbox" name="confirmed"> Disarm successfully resolved</label>`});
   if(!form)return;
   if(!(form instanceof FormData?form.has('confirmed'):Boolean(form.confirmed)))throw new Error('Confirm the successful Disarm first.');
   const id=formValue(form,'id'),item=held.find(i=>i.id===id);if(!item)throw new Error('Held weapon no longer available.');
   await item.update({'system.equipState':'carried'});
   await target.setFlag(FLAG,`specialAttack-${message.id}-${action}`,true);
   ui.notifications.info(`${target.name} is Disarmed of ${item.name}.`);
 }else if(action==='resolve-stun'){
   if(source.attackAction!=='stun')throw new Error('The original attack was not a Stun.');
   const ok=await foundry.applications.api.DialogV2.confirm({window:{title:'GM: Confirm Stun'},content:`<p>Confirm that ${esc(target.name)} failed the applicable defence and the Stun Triggered Effect was paid. Apply the Stunned status?</p>`});if(!ok)return;
   await target.applyCondition('stunned','Stunned','Apply duration/removal conditions from the official Stun effect.');
   await target.setFlag(FLAG,`specialAttack-${message.id}-${action}`,true);
   ui.notifications.info(`${target.name} is Stunned. Confirm duration using the rule entry.`);
 }
}

async function handleChatAction(message,event){
  const button=event.currentTarget,action=button?.dataset?.acAction;if(!action)return;
  try{if(action==='roll-damage')return rollWeaponDamage(message,message.getFlag(FLAG,'weaponUse')||{});if(action==='resolve-disarm'||action==='resolve-stun')return resolveSpecialAttack(message,action);return applyDamageAction(message,action);}catch(error){console.error(error);ui.notifications.error(error.message||'Altered Carbon chat action failed.');}
}

function attachListeners(message,html){
  const root=html instanceof HTMLElement?html:html?.[0];if(!root?.querySelectorAll)return;
  for(const button of root.querySelectorAll('[data-ac-action]'))button.addEventListener('click',event=>handleChatAction(message,event));
}

export function installChatActionHooks(){Hooks.on('renderChatMessageHTML',attachListeners);}

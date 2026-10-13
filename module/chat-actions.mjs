import {recordReaperAction} from './clinical-workflow.mjs';
import {equipmentTags} from './core-effect-engine-v2.mjs';
import {evaluateEffects,derivedEffectValue} from './effects.mjs';
import {firingModeProfile} from './rules-engine.mjs';
import {rollSkill} from './rolls.mjs';
import {checkGrade} from './chat-ui.mjs';
import {ammoCompatibility,ammunitionProfile,advancedAttack,targetSleeveType} from './combat-equipment.mjs';
import {queueIncomingDamage} from './combat-workflow.mjs';
import {repeatTriggeredDamageFormula,damageDieCount} from './damage-formulas.mjs';
import {attackDegrees,combatAceBenefit,damageFormula,mayRepeatHit,skillKey} from './attack-rules.mjs';
import {conditionKeys} from './condition-state.mjs';
import {defenseAvailable,respondToAttack,renderAttackCard,refreshAttack,commitAttackAction,speedOptions} from './attack-defense.mjs';
import {grantBonusSpeedDie} from './combat.mjs';

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
  return damageFormula(raw,actor);
}

async function chooseDamageRepeats(max=1){
  max=Math.max(1,Math.trunc(Number(max)||1));if(max===1)return 1;
  const form=await foundry.applications.api.DialogV2.input({window:{title:'Damage Triggered Effect'},content:`<div class="form-group"><label>Hit / damage Triggered Effect resolutions</label><input type="number" name="repeats" min="1" max="${max}" value="1"></div><p class="hint">Accuracy repeats the entire damage Triggered Effect, including its per-hit flat bonuses. Separate firing-mode/ammunition bonuses are applied once unless the item rule specifies otherwise.</p>`});
  if(!form)return null;return Math.max(1,Math.min(max,Number(formValue(form,'repeats')||1)));
}

function permissionToChange(actor){return Boolean(game.user.isGM||actor?.isOwner);}

async function resolveTargetActor(preferredUuid=null){
  if(preferredUuid){const actor=await fromUuid(preferredUuid);if(!actor)throw new Error('The original target is no longer available. Resolve the intended target with the GM.');return actor;}
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
  const speed=speedOptions(actor,{activeOnly:true});
  if(speed.combatant&&(!speed.revealed||!['check','resolution'].includes(speed.phase)||!speed.dice.length))throw new Error('No unspent Active Speed Die is available for this attack.');
  const target=rollOptions.targetActorUuid?await fromUuid(rollOptions.targetActorUuid):firstTargetActor();
  if(rollOptions.targetActorUuid&&!target)throw new Error('The original attack target is no longer available.');
  if(target&&conditionKeys(target).has('hidden'))throw new Error('Reveal Hidden targets with Detection before attacking them.');
  if(actor.getFlag?.(FLAG,'grappledWith')&&equipmentTags(weapon).includes('two-handed'))throw new Error('Two-handed weapons cannot be used while Grappled.');
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
  if(ammunition&&ammunition.system.consumable!==false){
    // Never decrement when the attack was blocked; never allow depleted ammo to fire.
    if(Number(ammunition.system.quantity||0)<1)throw new Error('Ammunition ran out before the attack was committed.');
    await ammunition.update({'system.quantity':Number(ammunition.system.quantity)-1});
  }
  const modeId=normalizedId(weapon.system.firingMode||'semi-automatic'),mode=firingModeProfile(modeId);
  const incapacitated=target&&(conditionKeys(target).has('incapacitated')||target.ac?.incapacitated);
  const availableSuccessDegrees=incapacitated&&rollOptions.range==='shared'?Math.max(1,attackDegrees(result,mode)):attackDegrees(result,mode);
  const skillTags=options.itemTag||equipmentTags(weapon),skillSlug=normalizedId(weapon.system.skill||'firearms');
  const context={skill:skillSlug,itemTag:skillTags,range:rollOptions.range||'shared',activity:rollOptions.activity||'',targetCount:rollOptions.targetCount||1};
  const efficiency=Math.max(0,derivedEffectValue(evaluateEffects(actor,context),'weapon.efficiency',0));
  const burst=['3-round-burst','fully-automatic'].includes(modeId);
  let depletion=null;try{depletion=await weapon.useDepletion({skillSides:result.sides,formula:burst?mode.depletion:null,efficiency});}
  catch(error){ui.notifications.warn(`Weapon used, but Depletion needs manual resolution: ${error.message}`);}
  const ammo=ammunitionProfile(ammunition,{targetType:rollOptions.targetType||targetSleeveType(target),zone:rollOptions.range||'shared',successDegrees:availableSuccessDegrees});
  const depText=depletionSummary(depletion),ammoName=ammunition?.name||'';
  const damageText=ammo.damageOverride||weapon.system.damage||'Special';
  const damageType=ammo.damageType||weapon.system.damageType||'';
  const armorPiercing=Boolean(weapon.system.armorPiercing||ammo.armorPiercing);
  const canDamage=special.allowDamage!==false&&rollOptions.allowDamage!==false&&damageText.toLowerCase()!=='none';
  const modeText=mode.extraDegrees?` · Firing mode +${mode.extraDegrees}${mode.damageBonus?`, Damage +${mode.damageBonus}`:''}`:'';
  const ace=combatAceBenefit(result,weapon.system.skill,actor.ac?.bonuses?.perception||0);
  const notes=[...(rollOptions.attackNotes||[]),...ammo.notes,...ammo.review,...(ace.note?[ace.note]:[])];
  if(mode.extraDegrees)notes.push(`Firing mode grants +${mode.extraDegrees} even alongside failure Degrees (Core p.201).`);
  const plannedRepeats=availableSuccessDegrees&&canDamage?(await chooseDamageRepeats(mayRepeatHit(weapon)?availableSuccessDegrees:1))||1:1;
  const currentSpeed=speedOptions(actor,{activeOnly:true});
  await commitAttackAction(actor,rollOptions.speedIndexes||currentSpeed.dice.slice(0,1).map(d=>d.index));
  if(ace.speedDice)await grantBonusSpeedDie(actor,{source:weapon.name});
  const data={actorUuid:actor.uuid,actorName:actor.name,itemUuid:weapon.uuid||null,weaponName:weapon.name,weaponProfile:weapon.uuid?null:{name:weapon.name,type:'weapon',system:weapon.system},targetActorUuid:target?.uuid||null,targetName:target?.name||'',checkResult:result,availableSuccessDegrees,originalSuccessDegrees:availableSuccessDegrees,plannedRepeats,accuracy:Number(weapon.system.accuracy||0),attackSkill:weapon.system.skill,aceWounds:ace.wounds,maximizeDamage:Boolean(incapacitated),needsDefense:defenseAvailable(target,actor),defense:null,damageText,damageBonus:Number(mode.damageBonus||0)+Number(ammo.damageBonus||0),ammunitionUuid:ammunition?.uuid||null,damageOverride:ammo.damageOverride,damageTypeOverride:damageType,armorPiercingOverride:armorPiercing,damageFormulaExtra:ammo.damageFormulaExtra,firingMode:modeId,attackAction:action,attackActivity:rollOptions.activity||'',range:rollOptions.range||'shared',grappleRange:Boolean(rollOptions.grappleRange),attackTargetCount:rollOptions.targetCount||1,attackTags:skillTags,attackNotes:notes,canDamage,depletionText:depText,depletion:depletion?{depletion:depletion.depletion,capacity:depletion.capacity,added:depletion.added,rollResult:depletion.rollResult??null,tr:depletion.tr??null,passed:depletion.passed??null,exhausted:depletion.exhausted}:null};
  const message=await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content:renderAttackCard(actor.name,weapon.name,data),flags:{[FLAG]:{weaponUse:data}}});
  return {result,depletion,message};
}


export async function useDrug(actor,item){
  // Kept as an API compatibility entry point; no unchecked active-state toggles.
  const {ACClinicalConsole}=await import('./clinical-console.mjs');
  if(!actor?.isOwner&&!game.user.isGM)throw new Error('Insufficient permission to use this Drug.');
  if(item?.type!=='drug')throw new Error('A Drug Item is required.');
  return new ACClinicalConsole({actorId:actor.id,drugId:item.id}).render({force:true});
}

export async function rollWeaponDamage(message,data=message.getFlag(FLAG,'weaponUse')){
  const actor=await fromUuid(data.actorUuid),weapon=data.itemUuid?await fromUuid(data.itemUuid):data.weaponProfile;
  if(!actor||!weapon)return ui.notifications.warn('Weapon or Actor is no longer available.');
  if(!permissionToChange(actor))return ui.notifications.warn('You do not have permission to roll damage for this Actor.');
  if(!data.canDamage)return ui.notifications.warn('This special action does not inflict automatic weapon damage.');
  if(data.needsDefense&&!data.defense)return ui.notifications.warn('The target owner or GM must resolve or decline defense first.');
  if(!Number(data.availableSuccessDegrees))return ui.notifications.warn('No positive Degrees remain: this attack cannot resolve a Hit.');
  if(data.damageMessageId)return ui.notifications.warn('Damage has already been rolled for this attack.');
  let formula=cleanDamageFormula(data.damageOverride||data.damageText||weapon.system.damage,actor);
  if(!formula){const form=await foundry.applications.api.DialogV2.input({window:{title:`${weapon.name} Damage`},content:`<p>This weapon has several profiles or a Special damage entry. Select its exact source formula; the system will not silently use only the first die.</p><div class="form-group"><label>Damage formula (GM-approved)</label><input name="formula" placeholder="Enter the exact profile"></div>`});if(!form)return;formula=cleanDamageFormula(formValue(form,'formula'),actor);if(!formula)throw new Error('Enter a complete valid damage formula.');}
  const repeats=mayRepeatHit(weapon)?Math.max(1,Math.min(Number(data.plannedRepeats||1),Number(data.availableSuccessDegrees))):1;
  const effectContext={skill:normalizedId(weapon.system.skill),itemTag:data.attackTags||equipmentTags(weapon),range:data.range||'shared',
    activity:data.attackActivity||'',targetCount:Number(data.attackTargetCount||1),damageType:normalizedId(data.damageTypeOverride||weapon.system.damageType||'')};
  const traitDamage=Math.trunc(derivedEffectValue(evaluateEffects(actor,effectContext),'damage.bonus',0));
  const perHitFormula=traitDamage?`${formula}${traitDamage>0?'+':''}${traitDamage}`:formula;
  const baseFormula=repeatTriggeredDamageFormula(perHitFormula,repeats),coreDiceCount=damageDieCount(baseFormula);
  formula=baseFormula;
  if(Number(data.damageBonus||0)+Number(data.aceWounds||0))formula=`(${formula})+${Number(data.damageBonus||0)+Number(data.aceWounds||0)}`;
  const extra=cleanDamageFormula(data.damageFormulaExtra||'',actor);if(extra)formula=`(${formula})+(${extra})`;
  let roll;try{roll=await new Roll(formula).evaluate({maximize:Boolean(data.maximizeDamage)});}catch(error){return ui.notifications.error(`Invalid damage formula: ${error.message}`);}
  const amount=Math.max(0,Number(roll.total||0)),ego=conditionKeys(actor).has('virtual')||Boolean(actor.system.virtualSession?.active)||/\bEP\b/i.test(String(weapon.system.damage||''))||String(weapon.system.damageType||'').toLowerCase()==='ego';
  const allDeadly=/\bDeadly\b(?!\s*(?:\d|[+]))/i.test(String(weapon.system.specialRules||''))&&!Number(weapon.system.deadly||0);
  const deadlyDice=allDeadly?coreDiceCount:Math.max(0,Math.min(coreDiceCount,Number(weapon.system.deadly||0)));
  // Deadly 0 MUST NOT select every die via .slice(-0).
  const rolls=roll.dice.flatMap(d=>d.results.filter(r=>r.active!==false).map(r=>Number(r.result||0)));
  const deadlyHP=ego?0:allDeadly?amount:(deadlyDice?rolls.slice(0,coreDiceCount).slice(-deadlyDice).reduce((sum,n)=>sum+n,0):0);
  const targetUuid=data.targetActorUuid||firstTargetActor()?.uuid||null;
  let location=null,locRoll=null;if(data.attackAction==='headshot'){locRoll=await new Roll('1d12').evaluate();location=Number(locRoll.total);}
  const stateButtons=ego?'':` <button type="button" data-ac-action="apply-wounds">Manual Wounds</button> <button type="button" data-ac-action="apply-direct-hp">Manual HP</button> <button type="button" data-ac-action="sleeve-dead">Sleeve Dead</button> <button type="button" data-ac-action="stack-damaged">Damage Stack</button> <button type="button" data-ac-action="real-death">Real Death</button> <button type="button" data-ac-action="begin-resleeving">Begin Resleeving</button>`;
  const content=`<section class="ac-chat-card ac-damage-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">DAMAGE OUTPUT</span><strong>${esc(weapon.name)}</strong></div><span class="ac-grade-chip">${amount} ${ego?'EP':'WND'}</span></header><p class="ac-chat-subtitle"><strong>${amount}</strong> ${ego?'Ego Points':'Wounds'} · ${esc(formula)}${repeats>1?` · ${repeats} resolutions`:''}</p>${deadlyHP?`<p class="ac-request-context">Deadly: ${deadlyHP} potential direct HP after applying Protection to non-Deadly Wounds first.</p>`:''}${location?`<p class="ac-request-context">Optional Hit Location d12: ${location} ${location===1?'(Head/Neck)':''}. GM determines effects.</p>`:''}<div class="ac-chat-actions">${ego?'<button type="button" data-ac-action="apply-ego">Apply Ego</button>':'<button type="button" data-ac-action="queue-wounds">Queue Resolution Wounds</button>'}</div>${stateButtons?`<details data-ac-gm-tools><summary>GM adjustments and sleeve / stack controls</summary><div class="ac-chat-actions">${stateButtons}</div></details>`:''}</section>`;
  const damageMessage=await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content,rolls:[roll,...(locRoll?[locRoll]:[])],flags:{[FLAG]:{damage:{sourceActorUuid:actor.uuid,itemUuid:weapon.uuid||null,targetActorUuid:targetUuid,amount,formula,ego,deadly:Number(weapon.system.deadly||0),deadlyHP,defenseProtection:Number(data.defense?.protection||0),ace:Boolean(data.checkResult?.ace),armorPiercing:Boolean(data.armorPiercingOverride),damageType:data.damageTypeOverride||weapon.system.damageType||'',location,sourceMessageId:message.id}}}});
  await refreshAttack(message,{...data,damageMessageId:damageMessage.id});
  return damageMessage;
}

export async function applyDamageAction(message,action){
  if(['apply-wounds','apply-direct-hp','sleeve-dead','stack-damaged','real-death','begin-resleeving'].includes(action)&&!game.user.isGM)throw new Error('The GM resolves manual damage, sleeve and stack adjustments.');
  const data=message.getFlag(FLAG,'damage')||{};const target=await resolveTargetActor(data.targetActorUuid);if(!target)return ui.notifications.warn('Target an Actor first, or have the GM choose one.');if(!permissionToChange(target))return ui.notifications.warn('Only the GM or an owner of the target Actor can change its damage/state.');
  if(['queue-wounds','apply-wounds','apply-ego','apply-direct-hp'].includes(action)&&target.getFlag(FLAG,`damageApplied-${message.id}`))return ui.notifications.warn('This damage card was already applied to this target.');
  if(action!=='queue-wounds'&&['apply-wounds','apply-ego','apply-direct-hp'].includes(action)&&target.getFlag(FLAG,'damageQueue')?.entries?.some(e=>e.id===message.id))return ui.notifications.warn('This damage is queued. Resolve it from the Combat panel.');
  if(action==='queue-wounds'){if(data.ego)return ui.notifications.warn('Ego Damage is not queued as Wounds.');const r=await queueIncomingDamage(target,{id:message.id,wounds:data.amount,deadlyHP:data.deadlyHP,deadly:data.deadly,damageType:data.damageType,armorPiercing:data.armorPiercing,source:data.itemUuid,defenseProtection:data.defenseProtection,ace:data.ace});return ui.notifications.info(r.duplicate?'This damage is already queued.':`${data.amount} Wounds queued for ${target.name}. Open the Combat tab to resolve the turn once.`);}
  if(action==='apply-wounds'){const values=await woundsPrompt(data.amount||0);if(!values)return;const result=await target.applyTurnWounds(values.wounds,{protection:values.protection});await target.setFlag(FLAG,`damageApplied-${message.id}`,{manual:true});return ui.notifications.info(`${target.name}: ${result.appliedWounds} Wounds applied, ${result.healthLoss} HP lost.`);}
  if(action==='apply-ego'){const amount=await numericPrompt('Apply Ego Damage','Ego Points lost',data.amount||0);if(amount==null)return;const result=await target.applyEgoDamage(amount);await target.setFlag(FLAG,`damageApplied-${message.id}`,{ego:true});return ui.notifications.info(`${target.name}: Ego ${result.value}.`);}
  if(action==='apply-direct-hp'){const amount=await numericPrompt('Apply Direct Health Loss','Health Points lost',0,{extra:'<p class="hint">Use this only for direct-HP portions that bypass Damage Threshold. Use the queue for combined Wounds and Deadly.</p>'});if(amount==null)return;const value=await target.loseHealth(amount);await target.setFlag(FLAG,`damageApplied-${message.id}`,{directHP:true});return ui.notifications.info(`${target.name}: Health ${value}.`);}
  if(action==='sleeve-dead'){await target.setSleeveState('dead');return ui.notifications.warn(`${target.name}: sleeve marked dead.`);}
  if(action==='stack-damaged'){await target.setStackState('damaged');return ui.notifications.warn(`${target.name}: cortical stack marked damaged.`);}
  if(action==='real-death'){const ok=await foundry.applications.api.DialogV2.confirm({window:{title:'Confirm Real Death'},content:`<p>Mark <strong>${esc(target.name)}</strong> as Real Death? This destroys the stack and marks the active sleeve destroyed.</p>`});if(ok){await target.markRealDeath();ui.notifications.error(`${target.name}: REAL DEATH.`);}return;}
  if(action==='begin-resleeving'){await target.beginResleeving();return ui.notifications.info(`${target.name}: awaiting resleeving.`);}
}

async function resolveSpecialAttack(message,action){
 if(!game.user.isGM)throw new Error('Only the GM may finalize a Stun or Disarm outcome.');
 const source=message.getFlag(FLAG,'weaponUse')||{};
 if(source.needsDefense&&!source.defense)throw new Error('Resolve or decline defense before the special effect.');
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
   const speed=speedOptions(target);if(!speed.combatant||!speed.dice.length)throw new Error('Core Stun forces Speed Dice to resolve. Use the Combat Tracker and the weapon’s source effect; no invented Stunned Condition is added.');
   const form=await foundry.applications.api.DialogV2.input({window:{title:'GM: Resolve Stun Speed Dice'},content:`<p>Confirm the weapon/Skill Stun Triggered Effect and its cost. Resolve the target’s required Speed Dice. Core Stun has no general Stunned Condition.</p><label>Required dice (from the source effect)</label><input type="number" name="count" min="1" max="${speed.dice.length}" value="${Math.min(2,speed.dice.length)}">`});if(!form)return;
   const count=Number(formValue(form,'count'));if(!Number.isInteger(count)||count<1||count>speed.dice.length)throw new Error('Choose a legal number of remaining Speed Dice.');
   const {resolveActiveDice}=await import('./combat.mjs');await resolveActiveDice(game.combat,speed.combatant,speed.dice.slice(0,count).map(d=>d.index));
   await target.setFlag(FLAG,`specialAttack-${message.id}-${action}`,true);
   ui.notifications.info(`${target.name}: ${count} Speed Dice resolved by Stun.`);
 }
}

const actionLocks=new Set();
async function handleChatAction(message,event){
  const button=event.currentTarget,action=button?.dataset?.acAction;if(!action)return;
  const lock=message.id;if(actionLocks.has(lock))return;actionLocks.add(lock);button.disabled=true;
  try{if(action.startsWith('defend-'))return await respondToAttack(message,action.slice(7));if(action==='decline-defense')return await respondToAttack(message,'decline');if(action==='roll-damage')return await rollWeaponDamage(message,message.getFlag(FLAG,'weaponUse')||{});if(action==='resolve-disarm'||action==='resolve-stun')return await resolveSpecialAttack(message,action);return await applyDamageAction(message,action);}catch(error){console.error(error);ui.notifications.error(error.message||'Altered Carbon chat action failed.');}finally{actionLocks.delete(lock);button.disabled=false;}
}

function attachListeners(message,html){
  const root=html instanceof HTMLElement?html:html?.[0];if(!root?.querySelectorAll)return;
  for(const panel of root.querySelectorAll('[data-ac-gm-tools]'))panel.hidden=!game.user.isGM;
  for(const button of root.querySelectorAll('[data-ac-action]'))button.addEventListener('click',event=>handleChatAction(message,event));
}

export function installChatActionHooks(){Hooks.on('renderChatMessageHTML',attachListeners);}

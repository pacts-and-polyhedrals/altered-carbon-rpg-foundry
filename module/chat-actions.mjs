import {firingModeProfile} from './rules-engine.mjs';
import {rollSkill} from './rolls.mjs';

const FLAG='altered-carbon-rpg';
const esc=value=>foundry.utils.escapeHTML(String(value??''));
const normalizedId=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function formValue(form,key){return form instanceof FormData?form.get(key):form?.[key];}
function firstTargetActor(){return [...game.user.targets][0]?.actor??null;}
function parseBonusDice(value=''){return String(value).split(',').map(x=>Number(x.trim())).filter(x=>[4,6,8,10,12].includes(x));}

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

function scaleDiceFormula(formula,repeats=1){
  repeats=Math.max(1,Math.trunc(Number(repeats)||1));
  return String(formula).replace(/(?:(\d*)d(\d+))/gi,(m,count,sides)=>`${(Number(count||1)*repeats)}d${sides}`);
}

async function chooseDamageRepeats(max=1){
  max=Math.max(1,Math.trunc(Number(max)||1));if(max===1)return 1;
  const form=await foundry.applications.api.DialogV2.input({window:{title:'Damage Triggered Effect'},content:`<div class="form-group"><label>Hit / damage Triggered Effect resolutions</label><input type="number" name="repeats" min="1" max="${max}" value="1"></div><p class="hint">Accuracy permits repeated resolution without another Action. Flat damage bonuses are applied once to the combined damage roll.</p>`});
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
  const options={...rollOptions,gearBonus:Number(rollOptions.gearBonus??item.system.gearBonus??0),bonusDice:rollOptions.bonusDice?.length?rollOptions.bonusDice:parseBonusDice(item.system.bonusDice),chat:true};
  const result=await rollSkill(actor,skill,options);if(result?.blocked)return result;
  let depletion=null;try{depletion=await item.useDepletion({skillSides:result.sides});}catch(error){ui.notifications.warn(`Equipment used, but Depletion needs manual resolution: ${error.message}`);}
  const content=`<section class="ac-chat-card ac-equipment-use"><header><strong>${esc(actor.name)} — ${esc(item.name)}</strong></header><p>${result.success?`Success +${result.successDegrees}`:`Failure -${result.failureDegrees}`} · ${esc(depletionSummary(depletion))}</p></section>`;
  const message=await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content,flags:{[FLAG]:{equipmentUse:{actorUuid:actor.uuid,itemUuid:item.uuid,checkResult:result,depletion:depletion?{depletion:depletion.depletion,capacity:depletion.capacity,added:depletion.added,rollResult:depletion.rollResult??null,tr:depletion.tr??null,passed:depletion.passed??null,exhausted:depletion.exhausted}:null}}}});
  return {result,depletion,message};
}

export async function useWeapon(actor,weapon,rollOptions={}){
  if(!actor?.isOwner&&!game.user.isGM)throw new Error('Insufficient permission to use this weapon.');
  if(weapon.type!=='weapon')throw new Error('This action requires a Weapon item.');
  if(weapon.system.exhausted)throw new Error(`${weapon.name} is Exhausted and cannot be used until Depletion Points are removed.`);
  const skill=findWeaponSkill(actor,weapon);if(!skill)throw new Error(`No matching Skill item was found for ${weapon.system.skill||'this weapon'}.`);
  const options={...rollOptions,gearBonus:Number(rollOptions.gearBonus??weapon.system.gearBonus??0),bonusDice:rollOptions.bonusDice?.length?rollOptions.bonusDice:parseBonusDice(weapon.system.bonusDice),chat:true};
  const result=await rollSkill(actor,skill,options);if(result?.blocked)return result;
  const modeId=normalizedId(weapon.system.firingMode||'semi-automatic'),mode=firingModeProfile(modeId);const availableSuccessDegrees=Math.min(5,Math.max(0,Number(result.successDegrees||0)+Number(mode.extraDegrees||0)));
  const standardBurst=['3-round-burst','fully-automatic'].includes(modeId);
  let depletion=null;try{depletion=await weapon.useDepletion({skillSides:result.sides,formula:standardBurst?mode.depletion:null});}catch(error){ui.notifications.warn(`Weapon used, but Depletion needs manual resolution: ${error.message}`);}
  const target=firstTargetActor();const depText=depletionSummary(depletion);const canDamage=availableSuccessDegrees>0;
  const modeText=mode.extraDegrees?` · Firing mode +${mode.extraDegrees}${mode.damageBonus?`, Damage +${mode.damageBonus}`:''}`:'';
  const content=`<section class="ac-chat-card ac-weapon-use"><header><strong>${esc(actor.name)} — ${esc(weapon.name)}</strong></header><p>${result.success?`Success +${result.successDegrees}`:`Failure -${result.failureDegrees}`}${modeText} · ${esc(depText)}</p><p>Available + for Triggered Effects: <strong>${availableSuccessDegrees}</strong></p><p>Damage: <strong>${esc(weapon.system.damage||'Special')}</strong>${weapon.system.damageType?` [${esc(weapon.system.damageType)}]`:''}${weapon.system.armorPiercing?' · Armor Piercing':''}${Number(weapon.system.deadly||0)>0?` · Deadly ${Number(weapon.system.deadly)}`:''}</p>${canDamage?'<button type="button" data-ac-action="roll-damage">Roll Damage</button>':''}</section>`;
  const message=await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content,flags:{[FLAG]:{weaponUse:{actorUuid:actor.uuid,itemUuid:weapon.uuid,targetActorUuid:target?.uuid||null,checkResult:result,availableSuccessDegrees,damageBonus:Number(mode.damageBonus||0),firingMode:modeId,depletion:depletion?{depletion:depletion.depletion,capacity:depletion.capacity,added:depletion.added,rollResult:depletion.rollResult??null,tr:depletion.tr??null,passed:depletion.passed??null,exhausted:depletion.exhausted}:null}}}});
  return {result,depletion,message};
}

async function rollWeaponDamage(message,data){
  const actor=await fromUuid(data.actorUuid),weapon=await fromUuid(data.itemUuid);if(!actor||!weapon)return ui.notifications.warn('Weapon or Actor is no longer available.');if(!permissionToChange(actor))return ui.notifications.warn('You do not have permission to roll this Actor’s weapon.');
  let formula=cleanDamageFormula(weapon.system.damage,actor);if(!formula){const form=await foundry.applications.api.DialogV2.input({window:{title:`${weapon.name} Damage`},content:`<div class="form-group"><label>Damage formula</label><input name="formula" value="1d6"></div>`});if(!form)return;formula=String(formValue(form,'formula')||'1d6');}
  const maxRepeats=Number(weapon.system.accuracy||0)>0?Math.max(1,Number(data.availableSuccessDegrees||data.checkResult?.successDegrees||1)):1;const repeats=await chooseDamageRepeats(maxRepeats);if(!repeats)return;formula=scaleDiceFormula(formula,repeats);if(Number(data.damageBonus||0))formula=`(${formula})+${Number(data.damageBonus)}`;
  let roll;try{roll=await new Roll(formula).evaluate();}catch(error){return ui.notifications.error(`Invalid damage formula: ${error.message}`);}
  const amount=Math.max(0,Number(roll.total||0)),ego=/\bEP\b/i.test(String(weapon.system.damage||''))||String(weapon.system.damageType||'').toLowerCase()==='ego';
  const targetUuid=data.targetActorUuid||firstTargetActor()?.uuid||null;
  const stateButtons=ego?'':` <button type="button" data-ac-action="apply-direct-hp">Apply Direct HP</button> <button type="button" data-ac-action="sleeve-dead">Sleeve Dead</button> <button type="button" data-ac-action="stack-damaged">Damage Stack</button> <button type="button" data-ac-action="real-death">Real Death</button> <button type="button" data-ac-action="begin-resleeving">Begin Resleeving</button>`;
  const content=`<section class="ac-chat-card ac-damage-card"><header><strong>${esc(weapon.name)} — Damage</strong></header><p><strong>${amount}</strong> ${ego?'Ego Points':'Wounds'} · ${esc(formula)}${repeats>1?` · ${repeats} resolutions`:''}</p>${Number(weapon.system.deadly||0)>0&&!ego?`<p class="hint">Deadly ${Number(weapon.system.deadly)}: commute the appropriate rolled damage dice to direct HP using the Direct HP control.</p>`:''}<div class="ac-chat-actions">${ego?'<button type="button" data-ac-action="apply-ego">Apply Ego</button>':'<button type="button" data-ac-action="apply-wounds">Apply Wounds / Protection</button>'}${stateButtons}</div></section>`;
  await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content,rolls:[roll],flags:{[FLAG]:{damage:{sourceActorUuid:actor.uuid,itemUuid:weapon.uuid,targetActorUuid:targetUuid,amount,formula,ego,deadly:Number(weapon.system.deadly||0),armorPiercing:Boolean(weapon.system.armorPiercing),damageType:weapon.system.damageType||''}}}});
}

async function applyDamageAction(message,action){
  const data=message.getFlag(FLAG,'damage')||{};const target=await resolveTargetActor(data.targetActorUuid);if(!target)return ui.notifications.warn('Target an Actor first, or have the GM choose one.');if(!permissionToChange(target))return ui.notifications.warn('Only the GM or an owner of the target Actor can change its damage/state.');
  if(action==='apply-wounds'){const values=await woundsPrompt(data.amount||0);if(!values)return;const result=await target.applyTurnWounds(values.wounds,{protection:values.protection});return ui.notifications.info(`${target.name}: ${result.appliedWounds} Wounds applied, ${result.healthLoss} HP lost.`);}
  if(action==='apply-ego'){const amount=await numericPrompt('Apply Ego Damage','Ego Points lost',data.amount||0);if(amount==null)return;const result=await target.applyEgoDamage(amount);return ui.notifications.info(`${target.name}: Ego ${result.value}.`);}
  if(action==='apply-direct-hp'){const amount=await numericPrompt('Apply Direct Health Loss','Health Points lost',0,{extra:'<p class="hint">Use this only for Deadly/direct-HP portions that bypass Damage Threshold.</p>'});if(amount==null)return;const value=await target.loseHealth(amount);return ui.notifications.info(`${target.name}: Health ${value}.`);}
  if(action==='sleeve-dead'){await target.setSleeveState('dead');return ui.notifications.warn(`${target.name}: sleeve marked dead.`);}
  if(action==='stack-damaged'){await target.setStackState('damaged');return ui.notifications.warn(`${target.name}: cortical stack marked damaged.`);}
  if(action==='real-death'){const ok=await foundry.applications.api.DialogV2.confirm({window:{title:'Confirm Real Death'},content:`<p>Mark <strong>${esc(target.name)}</strong> as Real Death? This destroys the stack and marks the active sleeve destroyed.</p>`});if(ok){await target.markRealDeath();ui.notifications.error(`${target.name}: REAL DEATH.`);}return;}
  if(action==='begin-resleeving'){await target.beginResleeving();return ui.notifications.info(`${target.name}: awaiting resleeving.`);}
}

async function handleChatAction(message,event){
  const button=event.currentTarget,action=button?.dataset?.acAction;if(!action)return;
  try{if(action==='roll-damage')return rollWeaponDamage(message,message.getFlag(FLAG,'weaponUse')||{});return applyDamageAction(message,action);}catch(error){console.error(error);ui.notifications.error(error.message||'Altered Carbon chat action failed.');}
}

function attachListeners(message,html){
  const root=html instanceof HTMLElement?html:html?.[0];if(!root?.querySelectorAll)return;
  for(const button of root.querySelectorAll('[data-ac-action]'))button.addEventListener('click',event=>handleChatAction(message,event));
}

export function installChatActionHooks(){Hooks.on('renderChatMessageHTML',attachListeners);Hooks.on('renderChatMessage',attachListeners);}

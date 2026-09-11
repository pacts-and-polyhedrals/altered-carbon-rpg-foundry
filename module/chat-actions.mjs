import {firingModeProfile} from './rules-engine.mjs';
import {rollSkill} from './rolls.mjs';
import {checkGrade} from './chat-ui.mjs';

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
function loadedAmmunition(actor,weapon){
  const id=String(weapon.system.activeAmmunition||'');
  if(!id)return null;
  return actor.items.find(i=>i.type==='ammunition'&&(i.system.catalogId===id||i.id===id))||null;
}
function targetBodyClass(actor){
  if(!actor)return 'unknown';
  if(actor.type==='vehicle')return 'synthetic';
  const sleeve=actor.ac?.activeSleeve||actor.items?.find?.(i=>i.type==='sleeve'&&i.system.status==='active');
  const type=String(sleeve?.system?.sleeveType||'').toLowerCase();
  if(type.startsWith('synthetic'))return 'synthetic';
  if(['birth','natal','clone','organic'].includes(type))return 'organic';
  return 'unknown';
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
async function chooseAmmoRange(ammo){
  if(!ammo?.system?.zoneDamageShared&&!ammo?.system?.zoneDamageAdjacent)return null;
  const form=await foundry.applications.api.DialogV2.input({window:{title:`${ammo.name} Range`},content:'<div class="form-group"><label>Target range</label><select name="range"><option value="shared">Shared Zone</option><option value="adjacent">Adjacent Zone</option></select></div>'});
  return form?String(formValue(form,'range')||'shared'):null;
}
async function chooseTargetBodyClass(ammo){
  if(!ammo?.system?.organicDamage&&!ammo?.system?.syntheticDamage&&!Number(ammo?.system?.organicDamageBonus||0)&&!Number(ammo?.system?.syntheticDamageBonus||0))return 'unknown';
  const form=await foundry.applications.api.DialogV2.input({window:{title:`${ammo.name} Target`},content:'<div class="form-group"><label>Target sleeve/material profile</label><select name="bodyClass"><option value="organic">Natal / Clone / Organic</option><option value="synthetic">Synthetic / Vehicle</option><option value="unknown">Other / Unknown</option></select></div>'});
  return form?String(formValue(form,'bodyClass')||'unknown'):null;
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
  const grade=checkGrade(result);
  const content=`<section class="ac-chat-card ac-equipment-use ${grade.className}"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">EQUIPMENT USE</span><strong>${esc(actor.name)} — ${esc(item.name)}</strong></div><span class="ac-grade-chip">${esc(grade.label)}</span></header><p class="ac-chat-subtitle">${esc(depletionSummary(depletion))}</p>${item.system.triggeredEffects?`<div class="ac-chat-rule-text"><strong>Available Triggered Effects</strong>${item.system.triggeredEffects}</div>`:''}</section>`;
  const message=await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content,flags:{[FLAG]:{equipmentUse:{actorUuid:actor.uuid,itemUuid:item.uuid,checkResult:result,depletion:depletion?{depletion:depletion.depletion,capacity:depletion.capacity,added:depletion.added,rollResult:depletion.rollResult??null,tr:depletion.tr??null,passed:depletion.passed??null,exhausted:depletion.exhausted}:null}}}});
  return {result,depletion,message};
}

export async function useDrug(actor,item){
  if(!actor?.isOwner&&!game.user.isGM)throw new Error('Insufficient permission to administer this drug.');
  if(item.type!=='drug')throw new Error('This action requires a Drug item.');
  const quantity=Math.max(0,Number(item.system.quantity||0));if(quantity<=0)throw new Error(`${item.name} has no doses remaining.`);
  const ok=await foundry.applications.api.DialogV2.confirm({window:{title:`Administer ${item.name}`},content:`<p><strong>${esc(item.name)}</strong></p><p>${esc(item.system.administration||'Use the appropriate administration method.')}</p>${item.system.effects?`<div class="ac-dialog-rule">${item.system.effects}</div>`:''}<p class="hint">Temporary bonuses and Under-the-Influence duration remain visible on the chat card for the table to track.</p>`});
  if(!ok)return null;
  await item.update({'system.quantity':Math.max(0,quantity-1)});
  const catalogId=String(item.system.catalogId||'');
  if(catalogId==='core.drug.lethinol'){
    const panic=actor.items.find(i=>i.type==='condition'&&['panic','status.panic'].includes(String(i.system.key||i.system.catalogId||'').toLowerCase()));
    if(panic)await panic.delete();
  }
  if(catalogId==='core.drug.stallion')await actor.applyCondition('enraged','Enraged','Under the Influence of Stallion; apply the Core Enraged rules until metabolized.');
  const controlled=item.system.controlledBy&&item.system.controlledBy!=='none'?`${item.system.controlledBy} ${item.system.controlledTier}`:'Not controlled by the Core licensing rule';
  const content=`<section class="ac-chat-card ac-drug-use ac-grade-success-2"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">CHEMICAL ADMINISTRATION</span><strong>${esc(actor.name)} — ${esc(item.name)}</strong></div><span class="ac-grade-chip">DOSE USED</span></header><div class="ac-request-meta"><span>${esc(item.system.administration||'Administration varies')}</span><span>${item.system.addiction?'Addiction risk':'No Addiction tag'}</span><span>${esc(controlled)}</span><span>Doses: ${Math.max(0,quantity-1)}</span></div>${item.system.effects?`<div class="ac-chat-rule-text"><strong>Immediate / Active Effects</strong><div>${item.system.effects}</div></div>`:''}${item.system.underInfluence?`<div class="ac-chat-rule-text"><strong>Under the Influence</strong><div>${item.system.underInfluence}</div></div>`:''}${item.system.duration?`<p class="ac-request-context"><strong>Duration:</strong> ${esc(item.system.duration)}</p>`:''}</section>`;
  const message=await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content,flags:{[FLAG]:{drugUse:{actorUuid:actor.uuid,itemUuid:item.uuid,catalogId,quantityRemaining:Math.max(0,quantity-1)}}}});
  return {message,quantityRemaining:Math.max(0,quantity-1)};
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
  const target=firstTargetActor(),ammo=loadedAmmunition(actor,weapon),depText=depletionSummary(depletion),canDamage=availableSuccessDegrees>0;
  const modeText=mode.extraDegrees?` · Firing mode +${mode.extraDegrees}${mode.damageBonus?`, Damage +${mode.damageBonus}`:''}`:'';
  const grade=checkGrade(result),ammoText=ammo?`<span>Ammo: ${esc(ammo.name)}</span>`:'';
  const effectiveType=ammo?.system.damageType||weapon.system.damageType||'';
  const effectiveAP=Boolean(weapon.system.armorPiercing||ammo?.system.armorPiercing),effectiveDeadly=Math.max(Number(weapon.system.deadly||0),Number(ammo?.system.deadly||0));
  const content=`<section class="ac-chat-card ac-weapon-use ${grade.className}"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">WEAPON RESOLUTION</span><strong>${esc(actor.name)} — ${esc(weapon.name)}</strong></div><span class="ac-grade-chip">${esc(grade.label)}</span></header><p class="ac-chat-subtitle">${modeText?`${esc(modeText.replace(/^ · /,''))} · `:''}${esc(depText)}</p><div class="ac-request-meta"><span>Triggered +: ${availableSuccessDegrees}</span><span>Damage: ${esc(ammo?.system.damage||weapon.system.damage||'Special')}</span>${ammoText}${effectiveType?`<span>${esc(effectiveType)}</span>`:''}${effectiveAP?'<span>Armor Piercing</span>':''}${effectiveDeadly>0?`<span>Deadly ${effectiveDeadly}</span>`:''}</div>${ammo?.system.effect?`<p class="ac-request-context"><strong>${esc(ammo.name)}:</strong> ${esc(ammo.system.effect)}</p>`:''}${canDamage?'<div class="ac-chat-actions"><button type="button" data-ac-action="roll-damage">Roll Damage</button></div>':''}</section>`;
  const message=await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content,flags:{[FLAG]:{weaponUse:{actorUuid:actor.uuid,itemUuid:weapon.uuid,targetActorUuid:target?.uuid||null,ammunitionUuid:ammo?.uuid||null,ammunitionCatalogId:ammo?.system.catalogId||'',checkResult:result,availableSuccessDegrees,damageBonus:Number(mode.damageBonus||0),firingMode:modeId,depletion:depletion?{depletion:depletion.depletion,capacity:depletion.capacity,added:depletion.added,rollResult:depletion.rollResult??null,tr:depletion.tr??null,passed:depletion.passed??null,exhausted:depletion.exhausted}:null}}}});
  return {result,depletion,message,ammunition:ammo};
}

async function ammunitionDamageProfile(actor,weapon,ammo,target){
  const s=ammo?.system||{};let bodyClass=targetBodyClass(target);
  if(bodyClass==='unknown'&&(s.organicDamage||s.syntheticDamage||Number(s.organicDamageBonus||0)||Number(s.syntheticDamageBonus||0))){bodyClass=await chooseTargetBodyClass(ammo);if(bodyClass==null)return null;}
  let raw=s.damage||weapon.system.damage||'',range=null;
  if(s.zoneDamageShared||s.zoneDamageAdjacent){range=await chooseAmmoRange(ammo);if(!range)return null;raw=range==='adjacent'?(s.zoneDamageAdjacent||s.zoneDamageShared):(s.zoneDamageShared||s.zoneDamageAdjacent);}
  if(bodyClass==='organic'&&s.organicDamage)raw=s.organicDamage;
  if(bodyClass==='synthetic'&&s.syntheticDamage)raw=s.syntheticDamage;
  let damageBonus=Number(s.damageBonus||0);
  if(bodyClass==='organic')damageBonus+=Number(s.organicDamageBonus||0);
  if(bodyClass==='synthetic')damageBonus+=Number(s.syntheticDamageBonus||0);
  return {raw,damageBonus,bodyClass,range,damageType:s.damageType||weapon.system.damageType||'',armorPiercing:Boolean(weapon.system.armorPiercing||s.armorPiercing),deadly:Math.max(Number(weapon.system.deadly||0),Number(s.deadly||0)),effect:String(s.effect||''),catalogId:String(s.catalogId||'')};
}

async function rollWeaponDamage(message,data){
  const actor=await fromUuid(data.actorUuid),weapon=await fromUuid(data.itemUuid);if(!actor||!weapon)return ui.notifications.warn('Weapon or Actor is no longer available.');if(!permissionToChange(actor))return ui.notifications.warn('You do not have permission to roll this Actor’s weapon.');
  const targetUuid=data.targetActorUuid||firstTargetActor()?.uuid||null,target=targetUuid?await fromUuid(targetUuid):null;
  const ammo=data.ammunitionUuid?await fromUuid(data.ammunitionUuid):loadedAmmunition(actor,weapon);
  const ammoProfile=await ammunitionDamageProfile(actor,weapon,ammo,target);if(ammo&&ammoProfile==null)return;
  const rawDamage=ammoProfile?.raw||weapon.system.damage;let formula=cleanDamageFormula(rawDamage,actor);
  if(!formula){const form=await foundry.applications.api.DialogV2.input({window:{title:`${weapon.name} Damage`},content:`<div class="form-group"><label>Damage formula</label><input name="formula" value="1d6"></div><p class="hint">This ammunition/weapon uses a special effect or does not provide ordinary Wound damage. Enter a formula only when the resolved Triggered Effect calls for damage.</p>`});if(!form)return;formula=String(formValue(form,'formula')||'1d6');}
  const maxRepeats=Number(weapon.system.accuracy||0)>0?Math.max(1,Number(data.availableSuccessDegrees||data.checkResult?.successDegrees||1)):1;const repeats=await chooseDamageRepeats(maxRepeats);if(!repeats)return;
  formula=scaleDiceFormula(formula,repeats);
  let flatBonus=Number(data.damageBonus||0)+Number(ammoProfile?.damageBonus||0);if(flatBonus)formula=`(${formula})+${flatBonus}`;
  if(ammoProfile?.catalogId==='core.ammo.reaper')formula=`(${formula})+${repeats}d4`;
  let roll;try{roll=await new Roll(formula).evaluate();}catch(error){return ui.notifications.error(`Invalid damage formula: ${error.message}`);}
  const amount=Math.max(0,Number(roll.total||0)),damageType=ammoProfile?.damageType||weapon.system.damageType||'',ego=/\bEP\b/i.test(String(rawDamage||''))||String(damageType).toLowerCase()==='ego';
  const deadly=ammoProfile?.deadly??Number(weapon.system.deadly||0),armorPiercing=ammoProfile?.armorPiercing??Boolean(weapon.system.armorPiercing);
  const stateButtons=ego?'':` <button type="button" data-ac-action="apply-direct-hp">Apply Direct HP</button> <button type="button" data-ac-action="sleeve-dead">Sleeve Dead</button> <button type="button" data-ac-action="stack-damaged">Damage Stack</button> <button type="button" data-ac-action="real-death">Real Death</button> <button type="button" data-ac-action="begin-resleeving">Begin Resleeving</button>`;
  const ammoNote=ammo?`<p class="ac-request-context"><strong>Loaded:</strong> ${esc(ammo.name)}${ammoProfile?.effect?` — ${esc(ammoProfile.effect)}`:''}${ammoProfile?.bodyClass&&ammoProfile.bodyClass!=='unknown'?` · resolved vs ${esc(ammoProfile.bodyClass)}`:''}${ammoProfile?.range?` · ${esc(ammoProfile.range)} zone`:''}</p>`:'';
  const content=`<section class="ac-chat-card ac-damage-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">DAMAGE OUTPUT</span><strong>${esc(weapon.name)}</strong></div><span class="ac-grade-chip">${amount} ${ego?'EP':'WND'}</span></header><p class="ac-chat-subtitle"><strong>${amount}</strong> ${ego?'Ego Points':'Wounds'} · ${esc(formula)}${repeats>1?` · ${repeats} resolutions`:''}${damageType?` · ${esc(damageType)}`:''}</p>${deadly>0&&!ego?`<p class="ac-request-context">Deadly ${deadly}: commute the appropriate rolled damage dice to direct HP using the Direct HP control.</p>`:''}${armorPiercing?'<p class="ac-request-context"><strong>Armor Piercing:</strong> ignore protections granted by the Armor rule where applicable.</p>':''}${ammoNote}<div class="ac-chat-actions">${ego?'<button type="button" data-ac-action="apply-ego">Apply Ego</button>':'<button type="button" data-ac-action="apply-wounds">Apply Wounds / Protection</button>'}${stateButtons}</div></section>`;
  await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content,rolls:[roll],flags:{[FLAG]:{damage:{sourceActorUuid:actor.uuid,itemUuid:weapon.uuid,ammunitionUuid:ammo?.uuid||null,targetActorUuid:targetUuid,amount,formula,ego,deadly,armorPiercing,damageType}}}});
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
export function installChatActionHooks(){Hooks.on('renderChatMessageHTML',attachListeners);}

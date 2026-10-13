/** Core pp.133–139: visible Injury/Dying procedures, never inferred Real Death. */
import {rollSkill} from './rolls.mjs';
import {pendingDamage,combatTurnKey} from './combat-workflow.mjs';
import {speedOptions} from './attack-defense.mjs';
import {resolveActiveDice} from './combat.mjs';
import {conditionKeys} from './condition-state.mjs';
const NS='altered-carbon-rpg';
const esc=value=>foundry.utils.escapeHTML(String(value??''));
const get=(f,key)=>f instanceof FormData?f.get(key):f?.[key];
const injuries=actor=>[...(actor.items||[])].filter(i=>i.type==='injury'&&i.system.active).reduce((n,i)=>n+Number(i.system.count||1),0);
const busy=new Set();
function access(actor){if(!actor||!game.user.isGM&&!actor.isOwner)throw new Error('Only this character’s owner or GM may resolve the save.');}
export async function postDamageSaveCard(actor,{injury=false,instant=false,turnKey=combatTurnKey(),damageType=''}={}){
  if(!game.combat)turnKey=`${turnKey}:${foundry.utils.randomID()}`;
  const owners=game.users.filter(u=>u.isGM||actor.testUserPermission(u,'OWNER')).map(u=>u.id);
  return ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),whisper:owners,content:`<section class="ac-chat-card"><header class="ac-chat-card-header"><strong>${esc(actor.name)} — Damage Follow-up</strong></header>${injury?'<p>Resolve the Injury save at the end of the Round. Base TR is remaining HP (Core p.133). Apply any compulsory source-specific Injury with the GM.</p>':''}${instant?'<p><strong>Severe Organic Damage:</strong> one attack exceeds Damage Threshold. The GM must adjudicate the survival / Real Death save; this is separate from ordinary Dying (Core pp.135–139).</p>':''}<div class="ac-chat-actions">${injury?'<button type="button" data-ac-save="injury">Roll Injury Save</button>':''}<button type="button" data-ac-save="dying">End Turn: Dying Save</button></div></section>`,flags:{[NS]:{damageSave:{actorUuid:actor.uuid,injury,instant,turnKey,damageType}}}});
}
export async function rollDamageSave(actor,{kind='injury',turnKey=game.combat?combatTurnKey():foundry.utils.randomID(),damageType=''}={}){
  access(actor);const id=`${actor.uuid}:${kind}:${turnKey}`;if(busy.has(id))return;busy.add(id);
  try{
    if(actor.getFlag(NS,`damageSave-${kind}`)?.turnKey===turnKey)throw new Error('This save has already been resolved for this Turn.');
    if(kind==='dying'&&(conditionKeys(actor).has('stable')||actor.system.sleeveState==='stable'))throw new Error('Stable suspends the Dying save until new Wounds remove it.');
    if(kind==='dying'&&!['dying'].includes(actor.system.sleeveState)&&!conditionKeys(actor).has('dying'))throw new Error('This sleeve is not Dying.');
    if(Number(actor.system.resources.health.value)<=0)throw new Error('The sleeve has no Health remaining.');
    const skills=actor.items.filter(i=>i.type==='skill'&&['Endurance','Toughness'].includes(i.name));
    if(!skills.length)throw new Error('Add Endurance or Toughness to resolve the save.');
    const preferred=/poison/i.test(damageType)?'poisoned':/bludgeon/i.test(damageType)?'bone':'flesh';
    const form=await foundry.applications.api.DialogV2.input({window:{title:`${actor.name}: ${kind==='dying'?'Dying':'Injury'} Save`},content:`<p>Base TR: remaining HP (${actor.system.resources.health.value})${kind==='dying'?`, -1 per Injury (${injuries(actor)})`:''}. Confirm contextual penalties with the GM.</p><label>Skill</label><select name="skill">${skills.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><label>Additional Difficulty</label><input name="difficulty" type="number" min="0" value="0">${kind==='injury'?`<label>Injury if failed (GM confirms damage type)</label><select name="injury">${[['flesh','Flesh Wound'],['bone','Bone Injury'],['poisoned','Poisoned']].map(([key,label])=>`<option value="${key}" ${key===preferred?'selected':''}>${label}</option>`).join('')}</select>`:''}`});
    if(!form)return null;const skill=actor.items.get(get(form,'skill'));if(!skill||!skills.includes(skill))throw new Error('Choose a legal save Skill.');
    const result=await rollSkill(actor,skill,{isSave:true,baseTR:Number(actor.system.resources.health.value),difficulty:Number(get(form,'difficulty')||0)+(kind==='dying'?injuries(actor):0),contextLabel:kind==='dying'?'Dying / stack preserved':'Injury Save'});
    if(result.blocked)return result;
    if(!result.success){if(kind==='dying')await actor.setSleeveState('dead');else {const key=get(form,'injury');if(!['bone','flesh','poisoned'].includes(key))throw new Error('Invalid Injury.');const meta={flesh:['Flesh Wound','1 HP/day'],bone:['Bone Injury','1 HP/week'],poisoned:['Poisoned','1 HP/hour']}[key];await actor.applyInjury(key,...meta,`Failed Injury save (${damageType||'GM-selected damage'}).`);}}
    await actor.setFlag(NS,`damageSave-${kind}`,{turnKey,success:result.success});
    return result;
  }finally{busy.delete(id);}
}
export async function advanceDyingRound(actor){
  access(actor);if(conditionKeys(actor).has('stable')||actor.system.sleeveState==='stable')throw new Error('Stable suspends Dying.');
  if(actor.system.sleeveState!=='dying'&&!conditionKeys(actor).has('dying'))throw new Error('The sleeve is not Dying.');
  const st=game.combat?.getFlag(NS,'state')||{},key=`${combatTurnKey()}:${st.round||0}`;
  if(game.combat&&actor.getFlag(NS,'dyingRound')===key)throw new Error('Dying HP loss was already applied for this Round.');
  const health=await actor.loseHealth(1);if(game.combat)await actor.setFlag(NS,'dyingRound',key);return health;
}
export async function mitigateQueuedDamage(actor){
  access(actor);const queue=pendingDamage(actor);if(!queue.entries.length)throw new Error('Queue incoming Wounds before mitigating them.');
  const speed=speedOptions(actor);if(speed.combatant&&speed.dice.length<3)throw new Error('Core mitigation requires three Speed Dice. If borrowing from the next Turn, have the GM record that exception explicitly.');
  const spent=Number(actor.getFlag(NS,'spMitigations')||0),cost=2**spent;
  if(Number(actor.system.resources.stackPoints.value)<cost)throw new Error(`This mitigation costs ${cost} SP.`);
  const form=await foundry.applications.api.DialogV2.input({window:{title:`Mitigate Wounds (${cost} SP)`},content:`<p>Replace all queued incoming Wounds with loss of 1 HP and an Injury. Core p.136 requires three Speed Dice. The SP cost doubles each use in this session.</p>${speed.combatant?'<p>The first three unspent Speed Dice will be resolved.</p>':'<label><input name="speedConfirmed" type="checkbox"> GM has recorded the three Speed Dice (including any borrowing)</label>'}<label>Injury if none active (GM confirms)</label><select name="injury"><option value="flesh">Flesh Wound</option><option value="bone">Bone Injury</option><option value="poisoned">Poisoned</option></select>`});
  if(!form)return null;if(!speed.combatant&&!get(form,'speedConfirmed'))throw new Error('Record the Speed Dice cost first.');
  if(speed.combatant)await resolveActiveDice(game.combat,speed.combatant,speed.dice.slice(0,3).map(d=>d.index));
  const result=await actor.mitigateDamageWithStackPoints();
  if(!injuries(actor)){const key=get(form,'injury'),meta={flesh:['Flesh Wound','1 HP/day'],bone:['Bone Injury','1 HP/week'],poisoned:['Poisoned','1 HP/hour']}[key];if(!meta)throw new Error('Invalid Injury type.');await actor.applyInjury(key,...meta,'Stack Point damage mitigation.');}
  for(const e of queue.entries)await actor.setFlag(NS,`damageApplied-${e.id}`,{mitigated:true,turnKey:queue.turnKey});
  await actor.unsetFlag(NS,'damageQueue');return result;
}
export function installDamageSaveHooks(){Hooks.on('renderChatMessageHTML',(message,html)=>{const root=html instanceof HTMLElement?html:html?.[0];for(const button of root?.querySelectorAll('[data-ac-save]')||[])button.addEventListener('click',async()=>{try{const data=message.getFlag(NS,'damageSave'),actor=await fromUuid(data.actorUuid);await rollDamageSave(actor,{...data,kind:button.dataset.acSave});}catch(e){ui.notifications.warn(e.message);}});});}

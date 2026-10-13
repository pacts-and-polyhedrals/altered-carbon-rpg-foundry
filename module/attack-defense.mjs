/** Chat defenses are owned by the defender. A GM verifies the response document
 * and updates the attack card; no player is granted permission over an enemy Actor.
 */
import {rollSkill} from './rolls.mjs';
import {degrees} from './rules-engine.mjs';
import {defenseResolution,accuracySaveDifficulty,skillKey} from './attack-rules.mjs';
import {conditionKeys} from './condition-state.mjs';
import * as Combat from './combat.mjs';
const NS='altered-carbon-rpg';
const esc=value=>foundry.utils.escapeHTML(String(value??''));
const input=(f,k)=>f instanceof FormData?f.get(k):f?.[k];
const inFlight=new Set();
const combatants=()=>Array.from(game.combat?.combatants||[]);
export function actorCombatant(actor){return combatants().find(c=>c.actor?.uuid===actor?.uuid)||null;}
export function speedOptions(actor,{activeOnly=false}={}){
  const combatant=actorCombatant(actor);if(!combatant)return {combatant:null,dice:[]};
  const s=combatant.getFlag(NS,'speed')||{},st=game.combat?.getFlag(NS,'state')||{};
  const results=s.results?.length?s.results:Combat.privateRollFor(combatant)?.results||[];
  const dice=results.map((result,index)=>({index,result,active:(s.revealedActiveIndexes||[]).includes(index)})).filter(d=>!(s.spentIndexes||[]).includes(d.index)&&(!activeOnly||d.active));
  return {combatant,dice,phase:st.phase,revealed:st.commitmentsRevealed};
}
export function defenseAvailable(target,attacker){
  if(!target)return false;
  if(conditionKeys(target).has('incapacitated')||target.ac?.incapacitated||conditionKeys(attacker).has('hidden'))return false;
  const speed=speedOptions(target);return !speed.combatant||speed.dice.length>0;
}
export function attackActionPenalty(actor){
  const c=actorCombatant(actor);if(!c)return 0;
  const turn=game.combat.getFlag(NS,'state')?.intentKey;
  const count=actor.getFlag(NS,'attackActions')||{};
  return count.turn===turn?Number(count.count||0):0;
}
export async function commitAttackAction(actor,indexes=[]){
  const c=actorCombatant(actor);if(!c)return;
  const speed=speedOptions(actor,{activeOnly:true});
  if(!speed.revealed||!['check','resolution'].includes(speed.phase))throw new Error('Reveal Speed Dice and enter Check before attacking.');
  if(!indexes.length||indexes.some(i=>!speed.dice.some(d=>d.index===Number(i))))throw new Error('Choose an unspent Active Speed Die for this attack.');
  await Combat.resolveActiveDice(game.combat,c,indexes);
  await actor.setFlag(NS,'attackActions',{turn:game.combat.getFlag(NS,'state')?.intentKey,count:attackActionPenalty(actor)+1});
}
export function unarmedWeapon(){return {id:'unarmed',uuid:null,name:'Unarmed Strike',type:'weapon',system:{skill:'Brawl',damage:'SB',damageType:'Bludgeoning',accuracy:1,deadly:0,capacity:0,exhausted:false,gearBonus:0,firingMode:'single',specialRules:'Unarmed',triggeredEffects:'Hit (+): SB Wounds. Accuracy 1.',depletionMode:'none'},useDepletion:async()=>null};}
export function renderAttackCard(actorName,weaponName,data){
  const result=data.checkResult||{},positive=Number(data.availableSuccessDegrees||0),defense=data.defense;
  const waiting=data.needsDefense&&!defense;
  const verdict=waiting?(positive?'POTENTIAL HIT · DEFENSE PENDING':'CHECK FAILED · DEFENSE AVAILABLE'):(positive?'HIT':'NO HIT');
  const grade=result.stroke?'STROKE OF LUCK':result.ace?'ACE · NATURAL 1':result.catastrophe?'CATASTROPHE':result.success?`SUCCESS +${result.successDegrees}`:`FAILURE -${result.failureDegrees}`;
  const damage=data.damageOverride||data.weaponProfile?.system?.damage||data.damageText||'Special';
  const actions=[];
  if(waiting){actions.push('<button type="button" data-ac-action="defend-save">Save Throw / Cancel Degrees</button>');if(data.range==='shared'&&['brawl','melee-combat','martial-arts'].includes(skillKey(data.attackSkill)))actions.push('<button type="button" data-ac-action="defend-parry">Parry</button>');actions.push('<button type="button" data-ac-action="defend-dodge">Dodge</button>','<button type="button" data-ac-action="decline-defense">Take Attack / No Defense</button>');}
  if(positive&&data.canDamage)actions.push(`<button type="button" data-ac-action="roll-damage" ${waiting?'disabled title="Target owner or GM must resolve or decline defense first"':''}>Roll Damage</button>`);
  if(positive&&data.attackAction==='disarm')actions.push(`<button type="button" data-ac-action="resolve-disarm" ${waiting?'disabled':''}>GM: Resolve Disarm</button>`);
  if(positive&&data.attackAction==='stun')actions.push(`<button type="button" data-ac-action="resolve-stun" ${waiting?'disabled':''}>GM: Resolve Stun</button>`);
  const defenseText=defense?defense.kind==='decline'?'Defense declined.':`${defense.label||defense.kind}: ${defense.cancelled||0} Degrees cancelled; +${defense.added||0} from failed Save; Protection +${defense.protection||0}.`:data.needsDefense?'Target owner or GM: choose a response below.':'No Save Throw is available/required; use the successful Degrees.';
  return `<section class="ac-chat-card ac-weapon-use ${result.ace?'ac-grade-ace':positive?'ac-grade-success':'ac-grade-failure'}"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">ATTACK · ${esc(data.attackAction||'normal')}</span><strong>${esc(actorName)} — ${esc(weaponName)}</strong></div><span class="ac-grade-chip">${esc(grade)}</span></header><p class="ac-attack-verdict"><strong>${verdict}</strong>${data.targetName?` against ${esc(data.targetName)}`:''}</p><p class="ac-chat-subtitle">${esc(data.range||'shared')} · ${esc(data.depletionText||'No Depletion')} · Available +${positive} / -${Number(result.failureDegrees||0)}</p><div class="ac-request-meta"><span>Damage: ${esc(damage)}</span><span>Hit repetitions declared: ${Number(data.plannedRepeats||1)}</span>${data.armorPiercingOverride?'<span>Armor Piercing</span>':''}${data.aceWounds?`<span>Ace: +${data.aceWounds} Wounds per attack</span>`:''}</div><p>${esc(defenseText)}</p>${data.attackNotes?.length?`<p class="ac-request-context">${data.attackNotes.map(esc).join(' · ')}</p>`:''}${actions.length?`<div class="ac-chat-actions">${actions.join('')}</div>`:''}${data.damageMessageId?'<p>Damage already rolled. Use the damage card below.</p>':''}</section>`;
}
export async function refreshAttack(message,data){
  const actor=await fromUuid(data.actorUuid),weapon=data.itemUuid?await fromUuid(data.itemUuid):data.weaponProfile;
  await message.update({content:renderAttackCard(actor?.name||data.actorName,weapon?.name||data.weaponName,data),[`flags.${NS}.weaponUse`]:data});
}
function parryFormula(target,attack){
  const weapon=target.items.find(i=>i.type==='weapon'&&i.system.equipState==='equipped'&&/\bparry\b/i.test(String(i.system.triggeredEffects||'')));
  if(weapon){const text=String(weapon.system.triggeredEffects||'').replace(/<[^>]*>/g,' ');const match=text.match(/Parry[^.]*?\b(?:Protection\s*\+?\s*)?(d[468]|1d[468])\b/i);if(match)return {weapon,formula:match[1].startsWith('1')?match[1]:'1'+match[1],skill:target.items.find(i=>i.type==='skill'&&skillKey(i.name)===skillKey(weapon.system.skill))};}
  const brawl=target.items.find(i=>i.type==='skill'&&skillKey(i.name)==='brawl');
  return {weapon:null,formula:skillKey(attack.attackSkill)==='brawl'?'1d6':'1d4',skill:brawl};
}
export async function respondToAttack(message,kind){
  const key=message.id;if(inFlight.has(key))return;inFlight.add(key);
  try{
    const attack=message.getFlag(NS,'weaponUse');if(!attack||attack.defense||!attack.needsDefense)throw new Error('This attack’s defense is already resolved or unavailable.');
    const target=await fromUuid(attack.targetActorUuid);if(!target)throw new Error('The original target is no longer available.');
    if(!game.user.isGM&&!target.isOwner)throw new Error('Only the target’s owner or GM can answer this attack.');
    if(target.getFlag(NS,`attackDefense-${key}`))throw new Error('This target already answered the attack.');
    let result=null,protection=0,label='No defense',rolls=[],speedIndex=null,strategy='cancel';
    if(kind!=='decline'){
      if(conditionKeys(target).has('incapacitated')||target.ac?.incapacitated)throw new Error('An Incapacitated character cannot make a Save Throw.');
      const speed=speedOptions(target),parry=kind==='parry'?parryFormula(target,attack):null;
      const skills=target.items.filter(i=>i.type==='skill');
      const preferred=kind==='dodge'?skills.find(i=>skillKey(i.name)==='athletics'):parry?.skill||skills.find(i=>skillKey(i.name)==='athletics')||skills[0];
      if(!preferred)throw new Error('No suitable defense Skill is available.');
      if(kind==='parry'&&(attack.range!=='shared'||!['brawl','melee-combat','martial-arts'].includes(skillKey(attack.attackSkill))))throw new Error('Parry only protects against Melee attacks.');
      if(kind==='parry'&&!parry?.skill)throw new Error('Parry requires Brawl or an equipped weapon with its Parry Triggered Effect.');
      if(speed.combatant&&(!speed.revealed||!['check','resolution'].includes(speed.phase)||!speed.dice.length))throw new Error('No available Speed Die for a Save Throw this Round.');
      const accuracy=accuracySaveDifficulty(attack.accuracy,attack.plannedRepeats);
      const dice=speed.dice.map(d=>`<option value="${d.index}">Die ${d.index+1}: ${d.result} (${d.active?'Active':'Reserve'})</option>`).join('');
      const form=await foundry.applications.api.DialogV2.input({window:{title:`${target.name}: ${kind==='save'?'Save Throw':kind==='dodge'?'Dodge':'Parry'}`},content:`<p>Core pp.90,100: a Save Throw costs a Speed Die. Cancel Degrees before Damage, or use Dodge/Parry to add Protection. Failed Saves grant Degrees of Difference to the attacker.</p><label>Skill</label><select name="skill">${skills.map(s=>`<option value="${s.id}" ${s.id===preferred.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select><label>Base Target Result (GM may adjust)</label><input type="number" name="tr" value="${kind==='dodge'?Number(target.ac?.bonuses?.perception||0):Number(target.ac?.bonuses?.[preferred.system.attribute]||0)}"><label>Additional Difficulty (Accuracy ${accuracy} already included)</label><input type="number" name="difficulty" value="0">${speed.combatant?`<label>Spend one unspent Speed Die (reserve is legal)</label><select name="speed">${dice}</select>`:'<p>No Combat Tracker entry: this response records the Check only. Speed cost is recorded by the GM.</p>'}${kind==='dodge'?'<label>Procedure</label><select name="procedure"><option value="check">Athletics Save, use successful Degrees for Protection</option><option value="speed">Spend Speed Die directly for one Dodge (no Check)</option></select>':''}${kind==='parry'?`<label>Protection per success</label><input name="protection" value="${esc(parry.formula)}"><p>Confirm equipment-specific upgrades with the GM.</p>`:''}`});
      if(!form)return;
      const skill=target.items.get(input(form,'skill'));if(!skill)throw new Error('Defense Skill no longer available.');
      if(kind==='dodge'&&skillKey(skill.name)!=='athletics')throw new Error('Dodge uses Athletics. Choose Save Throw for another Skill.');
      if(kind==='parry'&&skill.id!==parry.skill.id)throw new Error('Choose the Skill matching the selected Parry weapon/Brawl.');
      if(speed.combatant)speedIndex=Number(input(form,'speed'));
      const direct=kind==='dodge'&&input(form,'procedure')==='speed';
      if(direct&&!speed.combatant)throw new Error('Direct Dodge needs an unspent combat Speed Die.');
      if(!direct){result=await rollSkill(target,skill,{chat:true,baseTR:Number(input(form,'tr')),difficulty:Number(input(form,'difficulty')||0)+accuracy,isSave:true,adjudicationKind:'defense',contextLabel:`Defense against ${attack.weaponName||'attack'}`});if(result.blocked)return;}
      strategy=kind==='save'?'cancel':'protection';
      const repeats=direct?1:Math.max(0,Number(result?.successDegrees||0));
      if(repeats&&kind!=='save'){
        let formula=kind==='dodge'?`${attack.grappleRange?'1d4':attack.range==='shared'&&['brawl','melee-combat'].includes(skillKey(attack.attackSkill))?'1d6':'1d8'}+${Number(target.ac?.bonuses?.perception||0)}`:String(input(form,'protection')||parry.formula);
        if(!/^\d*d\d+(?:\+\d+)?$/.test(formula))throw new Error('Parry Protection requires a valid dice formula such as 1d6.');
        const roll=await new Roll(Array.from({length:repeats},()=>`(${formula})`).join('+')).evaluate();protection=Math.max(0,Number(roll.total));rolls.push(roll);
      }
      if(speed.combatant)await Combat.resolveActiveDice(game.combat,speed.combatant,[speedIndex]);
      label=direct?'Dodge (Speed Die)':kind==='save'?`${skill.name} Save Throw`:kind==='parry'?'Parry':'Dodge';
    }
    const resolved=defenseResolution(attack.availableSuccessDegrees,result||{},strategy);
    const response={attackMessageId:key,actorUuid:target.uuid,kind,actorName:target.name,label,result,protection,speedIndex,strategy,accuracyDifficulty:accuracySaveDifficulty(attack.accuracy,attack.plannedRepeats),...resolved};
    await target.setFlag(NS,`attackDefense-${key}`,true);
    await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor:target}),content:`<section class="ac-chat-card"><header class="ac-chat-card-header"><strong>${esc(target.name)} — ${esc(label)}</strong></header><p>${resolved.cancelled} Degrees cancelled; +${resolved.added} from failure; Protection +${protection}. ${resolved.degrees?'Attack has +'+resolved.degrees+' available.':'Attack has no positive Degrees: no Hit.'}</p></section>`,rolls,flags:{[NS]:{attackDefense:response}}});
  }finally{inFlight.delete(key);}
}
const synchronizing=new Set();
export async function syncDefenseResponse(responseMessage){
  if(!game.user.isGM)return;
  const leader=game.users.filter(u=>u.active&&u.isGM)[0];if(leader&&leader.id!==game.user.id)return;
  const response=responseMessage.getFlag(NS,'attackDefense');if(!response||synchronizing.has(response.attackMessageId))return;
  const attackMessage=game.messages.get(response.attackMessageId),attack=attackMessage?.getFlag(NS,'weaponUse');
  if(!attack||attack.defense||!attack.needsDefense||attack.targetActorUuid!==response.actorUuid)return;
  const target=await fromUuid(response.actorUuid),author=responseMessage.author||game.users.get(responseMessage.user?.id||responseMessage.user);
  if(!author||(!author.isGM&&!target?.testUserPermission(author,'OWNER')))return;
  synchronizing.add(response.attackMessageId);
  try{
    // Recompute the outcome, not the responder's claimed remaining Degrees.
    const outcome=defenseResolution(attack.availableSuccessDegrees,response.result||{},response.strategy);
    const defense={...response,...outcome,responseMessageId:responseMessage.id};
    await refreshAttack(attackMessage,{...attack,defense,availableSuccessDegrees:outcome.degrees});
  }finally{synchronizing.delete(response.attackMessageId);}
}
export function installAttackDefenseHooks(){
  Hooks.on('createChatMessage',m=>{if(m.getFlag(NS,'attackDefense'))syncDefenseResponse(m).catch(e=>console.error('Altered Carbon | Defense synchronization',e));});
  Hooks.once('ready',()=>{if(game.user.isGM)for(const m of game.messages||[])if(m.getFlag(NS,'attackDefense'))syncDefenseResponse(m).catch(e=>console.error(e));});
}

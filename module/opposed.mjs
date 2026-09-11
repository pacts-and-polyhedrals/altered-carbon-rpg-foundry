import {rollSkill} from './rolls.mjs';
import {compareOpposed} from './rules-engine.mjs';
const FLAG='altered-carbon-rpg';
const esc=s=>foundry.utils.escapeHTML(String(s??''));

export async function createOpposedChallenge(attacker,skill,{targetActor=null,...options}={}){
  const result=await rollSkill(attacker,skill,{...options,chat:false});if(result?.blocked)return result;
  const target=targetActor?.uuid||null;
  const content=`<section class="ac-chat-card ac-opposed"><header><strong>${esc(attacker.name)} — ${esc(skill.name)}</strong></header><p>Opposed challenge: ${result.success?`Success +${result.successDegrees}`:`Failure -${result.failureDegrees}`}</p><button type="button" data-ac-opposed-respond>Respond</button></section>`;
  const message=await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor:attacker}),content,flags:{[FLAG]:{opposed:{attackerResult:result,attackerActorUuid:attacker.uuid,targetActorUuid:target,status:'pending'}}}});
  return {message,result};
}

async function chooseOwnedActor(targetUuid=null){
  if(targetUuid){const a=await fromUuid(targetUuid);if(a?.isOwner)return a;}
  const owned=game.actors.filter(a=>a.isOwner&&a.items.some(i=>i.type==='skill'));if(!owned.length)return null;if(owned.length===1)return owned[0];
  const options=owned.map(a=>`<option value="${esc(a.uuid)}">${esc(a.name)}</option>`).join('');
  const form=await foundry.applications.api.DialogV2.input({window:{title:'Opposed Check — Choose Character'},content:`<div class="form-group"><label>Character</label><select name="actor">${options}</select></div>`});
  const id=form instanceof FormData?form.get('actor'):form?.actor;return id?fromUuid(id):null;
}
async function chooseSkill(actor){
  const skills=actor.items.filter(i=>i.type==='skill').sort((a,b)=>a.name.localeCompare(b.name));if(!skills.length)return null;
  const options=skills.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} (d${s.skillDieSides})</option>`).join('');
  const form=await foundry.applications.api.DialogV2.input({window:{title:'Opposed Check — Response'},content:`<div class="form-group"><label>Skill</label><select name="skill">${options}</select></div><div class="form-group"><label>Difficulty</label><input type="number" name="difficulty" value="0"></div>`});
  if(!form)return null;const get=k=>form instanceof FormData?form.get(k):form?.[k];return {skill:actor.items.get(get('skill')),difficulty:Number(get('difficulty')||0)};
}

export async function respondToOpposed(message){
  const data=message.getFlag(FLAG,'opposed');if(!data||data.status!=='pending')return;
  const defender=await chooseOwnedActor(data.targetActorUuid);if(!defender)return ui.notifications.warn('No owned Actor is available to respond.');
  const choice=await chooseSkill(defender);if(!choice?.skill)return;
  const result=await rollSkill(defender,choice.skill,{difficulty:choice.difficulty,chat:false});
  const attacker=await fromUuid(data.attackerActorUuid);const aAttr=data.attackerResult.attribute?attacker?.system?.attributes?.[data.attackerResult.attribute]||0:0;const dAttr=defender.system.attributes[result.attribute]||0;
  const cmp=compareOpposed(data.attackerResult,result,{attributeA:aAttr,attributeB:dAttr});const verdict=cmp>0?'Attacker wins':cmp<0?'Defender wins':'Tie';
  const content=`<section class="ac-chat-card ac-opposed"><header><strong>Opposed Check — ${esc(verdict)}</strong></header><p>${esc(attacker?.name||'Attacker')}: ${data.attackerResult.success?`+${data.attackerResult.successDegrees}`:`-${data.attackerResult.failureDegrees}`} · ${esc(defender.name)}: ${result.success?`+${result.successDegrees}`:`-${result.failureDegrees}`}</p></section>`;
  await message.update({content,[`flags.${FLAG}.opposed`]:{...data,status:'resolved',defenderActorUuid:defender.uuid,defenderResult:result,winner:cmp}});return {winner:cmp,attacker:data.attackerResult,defender:result};
}

function attachListener(message,html){
  const root=html instanceof HTMLElement?html:html?.[0];const button=root?.querySelector?.('[data-ac-opposed-respond]');if(button)button.addEventListener('click',()=>respondToOpposed(message));
}
export function installOpposedHooks(){Hooks.on('renderChatMessageHTML',attachListener);Hooks.on('renderChatMessage',attachListener);}

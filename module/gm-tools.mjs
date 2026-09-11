import {rollSkill} from './rolls.mjs';
import {checkGrade} from './chat-ui.mjs';
import {ensureGMGuide} from './gm-guide.mjs';

const NS='altered-carbon-rpg';
async function loadJSON(path){const r=await fetch(`systems/${NS}/data/${path}`);if(!r.ok)throw new Error(`Unable to load ${path}`);return r.json();}
const esc=v=>foundry.utils.escapeHTML(String(v??''));
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'');

function actorOwners(actor){
  return game.users.filter(u=>!u.isGM&&actor.testUserPermission(u,CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER));
}
function recipientsForActors(actors){
  return [...new Set([...game.users.filter(u=>u.isGM).map(u=>u.id),...actors.flatMap(a=>actorOwners(a).map(u=>u.id))])];
}
function publicName(actor){return actor.system?.identity?.publicName||actor.name;}
function resultSummary(result,userName=''){
  const grade=checkGrade(result);
  return {success:Boolean(result.success),successDegrees:Number(result.successDegrees||0),failureDegrees:Number(result.failureDegrees||0),catastrophe:Boolean(result.catastrophe),ace:Boolean(result.ace),stroke:Boolean(result.stroke),tr:Number(result.tr||0),best:Number(result.best||0),sides:Number(result.sides||0),gradeKey:grade.key,label:grade.label,userName:String(userName||'')};
}

export function renderRollRequestCard(request){
  const rows=(request.actorIds||[]).map(actorId=>{
    const actor=game.actors.get(actorId);if(!actor)return'';
    const response=request.responses?.[actorId]||null;
    if(response){const grade=checkGrade(response);return `<article class="ac-request-target ${grade.className}"><div><span class="ac-request-status">RESPONSE RECEIVED</span><strong>${esc(publicName(actor))}</strong><small>${esc(actor.name)}</small></div><div class="ac-request-result"><span class="ac-grade-chip">${esc(grade.label)}</span><small>TR ${response.tr} · ${response.best} on d${response.sides||'?'}</small></div></article>`;}
    return `<article class="ac-request-target ac-grade-pending"><div><span class="ac-request-status">AWAITING DHF</span><strong>${esc(publicName(actor))}</strong><small>${esc(actor.name)}</small></div><button type="button" data-ac-gm-action="respond-roll" data-actor-id="${esc(actor.id)}"><i class="fa-solid fa-dice"></i> Roll ${esc(request.skill)}</button></article>`;
  }).join('');
  const flags=[`Skill: ${request.skill}`,`Difficulty: ${request.difficulty}`];if(Number(request.bonus||0))flags.push(`TR Bonus: +${request.bonus}`);if(request.sightReliant)flags.push('Sight-reliant');if(request.sightOnly)flags.push('Sight-only');
  return `<section class="ac-chat-card ac-gm-roll-request ac-grade-pending" data-request-id="${esc(request.id)}">
    <header class="ac-chat-card-header"><div><span class="ac-chat-kicker">GM ROLL REQUEST</span><strong>${esc(request.title)}</strong></div><span class="ac-grade-chip">PENDING</span></header>
    <p class="ac-chat-subtitle">${esc(request.prompt||'Make the requested check.')}</p>
    <div class="ac-request-meta">${flags.map(x=>`<span>${esc(x)}</span>`).join('')}</div>
    ${request.gmNote?`<p class="ac-request-context"><i class="fa-solid fa-circle-info"></i> ${esc(request.gmNote)}</p>`:''}
    <div class="ac-request-targets">${rows}</div>
  </section>`;
}

export async function createRollRequest({title,skill,difficulty=0,bonus=0,prompt='',gmNote='',actorIds=[],sightReliant=false,sightOnly=false}={}){
  if(!game.user.isGM)throw new Error('GM only.');
  const actors=[...new Set(actorIds)].map(id=>game.actors.get(id)).filter(Boolean);
  if(!actors.length)throw new Error('Select at least one character.');
  const recipients=recipientsForActors(actors);
  const noOwner=actors.filter(a=>!actorOwners(a).length);
  if(noOwner.length)ui.notifications.warn(`No player owner is assigned to: ${noOwner.map(a=>a.name).join(', ')}. The request will still be visible to GMs.`);
  const request={id:foundry.utils.randomID(),title:String(title||skill||'Skill Check'),skill:String(skill||''),difficulty:Math.max(0,Number(difficulty)||0),bonus:Number(bonus)||0,prompt:String(prompt||''),gmNote:String(gmNote||''),sightReliant:Boolean(sightReliant),sightOnly:Boolean(sightOnly),actorIds:actors.map(a=>a.id),recipients,responses:{},createdBy:game.user.id,createdAt:Date.now()};
  const message=await ChatMessage.implementation.create({speaker:{alias:'GM Control'},content:renderRollRequestCard(request),whisper:recipients,flags:{[NS]:{gmRollRequest:request}}});
  ui.notifications.info(`Roll request sent to ${actors.length} character${actors.length===1?'':'s'}.`);
  return message;
}

async function recordRollResponse(messageId,actorId,response){
  const message=game.messages.get(messageId);if(!message)return;
  const request=message.getFlag(NS,'gmRollRequest');if(!request||!request.actorIds?.includes(actorId))return;
  const next={...request,responses:{...(request.responses||{}),[actorId]:response}};
  await message.update({content:renderRollRequestCard(next),[`flags.${NS}.gmRollRequest`]:next});
}

async function respondToRequest(message,button){
  const request=message.getFlag(NS,'gmRollRequest');if(!request)return;
  const actorId=button.dataset.actorId,actor=game.actors.get(actorId);if(!actor)return ui.notifications.warn('That character no longer exists.');
  if(!request.actorIds?.includes(actorId))return ui.notifications.warn('That character was not included in this request.');
  if(request.responses?.[actorId])return ui.notifications.info(`${actor.name} has already answered this request.`);
  if(!game.user.isGM&&!actor.isOwner)return ui.notifications.warn('You do not own that character.');
  const skill=actor.items.find(i=>i.type==='skill'&&norm(i.name)===norm(request.skill));
  if(!skill)return ui.notifications.warn(`${actor.name} does not have a ${request.skill} Skill record.`);
  button.disabled=true;
  try{
    const result=await rollSkill(actor,skill,{difficulty:request.difficulty,bonus:request.bonus,sightReliant:request.sightReliant,sightOnly:request.sightOnly,chat:true,whisper:request.recipients,contextLabel:request.title,chatFlags:{gmRequestId:request.id,gmRequestMessageId:message.id}});
    if(result?.blocked){button.disabled=false;return;}
    const response=resultSummary(result,game.user.name);
    if(game.user.isGM)await recordRollResponse(message.id,actorId,response);
    else game.socket.emit(`system.${NS}`,{type:'gmRollResponse',messageId:message.id,actorId,response});
  }catch(error){button.disabled=false;throw error;}
}

function rootNode(html){return html instanceof HTMLElement?html:html?.[0]||null;}
function attachRequestListeners(message,html){
  const root=rootNode(html);if(!root?.querySelectorAll)return;
  for(const button of root.querySelectorAll('[data-ac-gm-action="respond-roll"]')){
    const actor=game.actors.get(button.dataset.actorId);if(!game.user.isGM&&!actor?.isOwner){button.hidden=true;continue;}
    button.addEventListener('click',event=>respondToRequest(message,event.currentTarget).catch(error=>{console.error(error);ui.notifications.error(error.message||'Roll request failed.');}));
  }
}

let sceneControlHookInstalled=false;

function openOrFocusGMPanel(){
  if(!game.user.isGM)return ui.notifications.warn('GM only.');
  const existing=foundry.applications.instances?.get?.('ac-gm-panel');
  if(existing){existing.render({force:true});existing.bringToFront?.();return existing;}
  const panel=new ACGMPanel();panel.render({force:true});return panel;
}

/**
 * Foundry v14 uses an object-keyed Scene Controls structure. Register this
 * during init so the GM Control tool exists when the Token Controls palette is
 * first constructed.
 */
export function installGMSceneControlsHook(){
  if(sceneControlHookInstalled)return;
  sceneControlHookInstalled=true;
  Hooks.on('getSceneControlButtons',controls=>{
    if(!game.user.isGM)return;
    const tokenTools=controls?.tokens?.tools;
    if(!tokenTools)return;
    tokenTools.alteredCarbonGMControl={
      name:'alteredCarbonGMControl',
      title:'Altered Carbon — GM Control',
      icon:'fa-solid fa-satellite-dish',
      order:Object.keys(tokenTools).length+20,
      button:true,
      visible:true,
      onChange:()=>openOrFocusGMPanel()
    };
  });
}

export function installGMToolsHooks(){
  Hooks.on('renderChatMessageHTML',attachRequestListeners);
  game.socket.on(`system.${NS}`,async payload=>{
    if(!game.user.isGM||payload?.type!=='gmRollResponse')return;
    try{await recordRollResponse(payload.messageId,payload.actorId,payload.response);}catch(error){console.error('Altered Carbon | GM roll response update failed',error);}
  });
}

export class ACGMPanel extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
  static DEFAULT_OPTIONS={
    id:'ac-gm-panel',classes:['altered-carbon','ac-gm-window'],window:{title:'Altered Carbon — GM Control'},position:{width:1100,height:850},
    actions:{sendPreset:this._sendPreset,sendCustom:this._sendCustom,selectAll:this._selectAll,clearSelection:this._clearSelection,openGuide:this._openGuide,refreshGuide:this._refreshGuide}
  };
  static PARTS={main:{template:'systems/altered-carbon-rpg/templates/gm-panel.hbs'}};
  async _prepareContext(options){
    const context=await super._prepareContext(options),[presetData,skills]=await Promise.all([loadJSON('gm-presets.json'),loadJSON('core-skills.json')]);
    const characters=game.actors.filter(a=>['character','ai'].includes(a.type)).map(actor=>({id:actor.id,name:actor.name,publicName:publicName(actor),type:actor.type,owners:actorOwners(actor).map(u=>u.name).join(', ')||'No player owner'})).sort((a,b)=>a.publicName.localeCompare(b.publicName));
    const groups=[];for(const preset of presetData.presets){let group=groups.find(g=>g.name===preset.category);if(!group){group={name:preset.category,presets:[]};groups.push(group);}group.presets.push(preset);}
    return{...context,characters,groups,skills:skills.map(s=>({name:s.name,attribute:s.attribute}))};
  }
  _selectedActorIds(){return [...(this.element?.querySelectorAll('input[name="gmRecipients"]:checked')||[])].map(el=>el.value);}
  static async _sendPreset(event,target){
    const data=await loadJSON('gm-presets.json'),preset=data.presets.find(p=>p.id===target.dataset.presetId);if(!preset)return;
    try{await createRollRequest({...preset,actorIds:this._selectedActorIds()});}catch(error){ui.notifications.warn(error.message);}
  }
  static async _sendCustom(){
    const root=this.element;const val=name=>root?.querySelector(`[name="${name}"]`)?.value??'';const checked=name=>Boolean(root?.querySelector(`[name="${name}"]`)?.checked);
    const skill=val('customSkill');if(!skill)return ui.notifications.warn('Choose a Skill.');
    try{await createRollRequest({title:val('customTitle')||skill,skill,difficulty:val('customDifficulty'),bonus:val('customBonus'),prompt:val('customPrompt'),gmNote:val('customNote'),sightReliant:checked('customSightReliant'),sightOnly:checked('customSightOnly'),actorIds:this._selectedActorIds()});}catch(error){ui.notifications.warn(error.message);}
  }
  static async _selectAll(){for(const el of this.element?.querySelectorAll('input[name="gmRecipients"]')||[])el.checked=true;}
  static async _clearSelection(){for(const el of this.element?.querySelectorAll('input[name="gmRecipients"]')||[])el.checked=false;}
  static async _openGuide(){try{await ensureGMGuide({open:true});}catch(error){ui.notifications.error(error.message);}}
  static async _refreshGuide(){
    const ok=await foundry.applications.api.DialogV2.confirm({window:{title:'Refresh GM Guide'},content:'<p>Replace the system-generated GM Guide pages with the current v1.2.1 reference?</p><p class="hint">Any notes typed directly into those generated pages will be replaced.</p>'});
    if(ok)await ensureGMGuide({refresh:true,open:true});
  }
}

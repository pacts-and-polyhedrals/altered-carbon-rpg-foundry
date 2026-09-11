import {rollSkill} from './rolls.mjs';
import {checkGrade} from './chat-ui.mjs';
import {ensureGMGuide} from './gm-guide.mjs';
import {normalizeRollOptions, mergePreset, makeBonusDice, describeBonusDice, BONUS_DIE_SIDES} from './gm-roll-options.mjs';
import {getBonusDiceAwards, grantBonusDice, removeBonusDiceAward, clearBonusDiceAwards} from './gm-bonus-dice.mjs';
import {getSystemHealth, diagnoseSystem} from './system-health.mjs';

const NS='altered-carbon-rpg';
async function loadJSON(path){const r=await fetch(`systems/${NS}/data/${path}`);if(!r.ok)throw new Error(`Unable to load ${path}`);return r.json();}
const esc=v=>foundry.utils.escapeHTML(String(v??''));
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const signed=n=>Number(n)>=0?`+${n}`:String(n);

function actorOwners(actor){
  return game.users.filter(u=>!u.isGM&&actor.testUserPermission(u,CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER));
}
function recipientsForActors(actors){
  return [...new Set([...game.users.filter(u=>u.isGM).map(u=>u.id),...actors.flatMap(a=>actorOwners(a).map(u=>u.id))])];
}
function publicName(actor){return actor.system?.identity?.publicName||actor.name;}
function resultSummary(result,userName=''){
  const grade=checkGrade(result);
  return {success:Boolean(result.success),successDegrees:Number(result.successDegrees||0),failureDegrees:Number(result.failureDegrees||0),catastrophe:Boolean(result.catastrophe),ace:Boolean(result.ace),stroke:Boolean(result.stroke),tr:Number(result.tr||0),best:Number(result.best||0),sides:Number(result.sides||0),bonusDice:result.bonusDice||[],gradeKey:grade.key,label:grade.label,userName:String(userName||'')};
}

export function registerGMToolsSettings(){
  game.settings.register(NS,'gmPresetOverrides',{name:'GM preset overrides',scope:'world',config:false,type:Object,default:{}});
}
export function getPresetOverrides(){return game.settings.get(NS,'gmPresetOverrides')||{};}
let presetWrite=Promise.resolve();
export function savePresetOverride(presetId,values,{reset=false}={}){
  const task=presetWrite.catch(()=>{}).then(async()=>{
    if(!game.user.isGM)throw new Error('GM only.');
    const data=await loadJSON('gm-presets.json');
    if(!data.presets.some(p=>p.id===presetId))throw new Error('Unknown preset.');
    const overrides={...getPresetOverrides()};
    if(reset)delete overrides[presetId];else overrides[presetId]=normalizeRollOptions(values);
    await game.settings.set(NS,'gmPresetOverrides',overrides);
    return overrides[presetId]||null;
  });
  presetWrite=task;return task;
}

export function renderRollRequestCard(request){
  const rows=(request.actorIds||[]).map(actorId=>{
    const actor=game.actors.get(actorId);if(!actor)return'';
    const response=request.responses?.[actorId]||null;
    if(response){const grade=checkGrade(response);return `<article class="ac-request-target ${grade.className}"><div><span class="ac-request-status">RESPONSE RECEIVED</span><strong>${esc(publicName(actor))}</strong><small>${esc(actor.name)}</small></div><div class="ac-request-result"><span class="ac-grade-chip">${esc(grade.label)}</span><small>TR ${Number(response.tr)} / ${Number(response.best)} on d${Number(response.sides)||'?'}</small></div></article>`;}
    return `<article class="ac-request-target ac-grade-pending"><div><span class="ac-request-status">AWAITING DHF</span><strong>${esc(publicName(actor))}</strong><small>${esc(actor.name)}</small></div><button type="button" data-ac-gm-action="respond-roll" data-actor-id="${esc(actor.id)}"><i class="fa-solid fa-dice"></i> Roll ${esc(request.skill)}</button></article>`;
  }).join('');
  const flags=[`Skill: ${request.skill}`,`Difficulty penalty: ${request.difficulty}`,`Base TR: ${request.baseTR==null?'character':request.baseTR}`];
  if(Number(request.bonus||0))flags.push(`TR modifier: ${signed(request.bonus)}`);
  if(request.bonusDice?.length)flags.push(describeBonusDice(request.bonusDice));
  if(request.sightReliant)flags.push('Sight-reliant');if(request.sightOnly)flags.push('Sight-only');
  return `<section class="ac-chat-card ac-gm-roll-request ac-grade-pending" data-request-id="${esc(request.id)}">
    <header class="ac-chat-card-header"><div><span class="ac-chat-kicker">GM ROLL REQUEST</span><strong>${esc(request.title)}</strong></div><span class="ac-grade-chip">PENDING</span></header>
    <p class="ac-chat-subtitle">${esc(request.prompt||'Make the requested check.')}</p>
    <div class="ac-request-meta">${flags.map(x=>`<span>${esc(x)}</span>`).join('')}</div>
    ${request.gmNote?`<p class="ac-request-context"><i class="fa-solid fa-circle-info"></i> ${esc(request.gmNote)}</p>`:''}
    <div class="ac-request-targets">${rows}</div>
  </section>`;
}

export async function createRollRequest({title,skill,prompt='',gmNote='',actorIds=[],...values}={}){
  if(!game.user.isGM)throw new Error('GM only.');
  if(!String(skill||'').trim())throw new Error('Choose a Skill.');
  const options=normalizeRollOptions(values);
  const actors=[...new Set(actorIds)].map(id=>game.actors.get(id)).filter(Boolean);
  if(!actors.length)throw new Error('Select at least one character.');
  const recipients=recipientsForActors(actors);
  const noOwner=actors.filter(a=>!actorOwners(a).length);
  if(noOwner.length)ui.notifications.warn(`No player owner is assigned to: ${noOwner.map(a=>a.name).join(', ')}. The request will still be visible to GMs.`);
  const request={id:foundry.utils.randomID(),title:String(title||skill||'Skill Check'),skill:String(skill),...options,prompt:String(prompt),gmNote:String(gmNote),actorIds:actors.map(a=>a.id),recipients,responses:{},createdBy:game.user.id,createdAt:Date.now()};
  const message=await ChatMessage.implementation.create({speaker:{alias:'GM Control'},content:renderRollRequestCard(request),whisper:recipients,flags:{[NS]:{gmRollRequest:request}}});
  ui.notifications.info(`Roll request sent to ${actors.length} character${actors.length===1?'':'s'}.`);
  return message;
}

const responseWrites=new Map();
function recordRollResponse(messageId,actorId,response){
  // Different players can finish together. Do not overwrite an earlier response.
  const task=(responseWrites.get(messageId)||Promise.resolve()).catch(()=>{}).then(async()=>{
    const message=game.messages.get(messageId);if(!message)return;
    const request=message.getFlag(NS,'gmRollRequest');if(!request||!request.actorIds?.includes(actorId)||request.responses?.[actorId])return;
    const next={...request,responses:{...(request.responses||{}),[actorId]:response}};
    await message.update({content:renderRollRequestCard(next),[`flags.${NS}.gmRollRequest`]:next});
  });
  responseWrites.set(messageId,task);
  return task.finally(()=>{if(responseWrites.get(messageId)===task)responseWrites.delete(messageId);});
}
const pendingResponses=new WeakMap();
export async function respondToRequest(message,button){
  const request=message.getFlag(NS,'gmRollRequest');if(!request)return;
  const actorId=button.dataset.actorId,actor=game.actors.get(actorId);if(!actor)return ui.notifications.warn('That character no longer exists.');
  if(!request.actorIds?.includes(actorId))return ui.notifications.warn('That character was not included in this request.');
  if(request.responses?.[actorId])return ui.notifications.info(`${actor.name} has already answered this request.`);
  if(!game.user.isGM&&!actor.isOwner)return ui.notifications.warn('You do not own that character.');
  const skill=actor.items.find(i=>i.type==='skill'&&norm(i.name)===norm(request.skill));
  if(!skill)return ui.notifications.warn(`${actor.name} does not have a ${request.skill} Skill record.`);
  const pending=pendingResponses.get(message)||new Set();pendingResponses.set(message,pending);
  const key=actorId;if(pending.has(key))return;
  pending.add(key);button.disabled=true;
  try{
    const result=await rollSkill(actor,skill,{...normalizeRollOptions(request),chat:true,whisper:request.recipients,contextLabel:request.title,chatFlags:{gmRequestId:request.id,gmRequestMessageId:message.id}});
    if(result?.blocked){button.disabled=false;pending.delete(key);return;}
    const response=resultSummary(result,game.user.name);
    if(game.user.isGM)await recordRollResponse(message.id,actorId,response);
    else game.socket.emit(`system.${NS}`,{type:'gmRollResponse',messageId:message.id,actorId,response,rollMessageId:result.chatMessageId});
    // Retain local completion until the shared request has caught up.
    button.textContent='Rolled';
  }catch(error){button.disabled=false;pending.delete(key);throw error;}
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
export function installGMSceneControlsHook(){
  if(sceneControlHookInstalled)return;sceneControlHookInstalled=true;
  Hooks.on('getSceneControlButtons',controls=>{
    if(!game.user.isGM)return;
    const tokenTools=controls?.tokens?.tools;if(!tokenTools)return;
    tokenTools.alteredCarbonGMControl={name:'alteredCarbonGMControl',title:'Altered Carbon - GM Control',icon:'fa-solid fa-satellite-dish',order:Object.keys(tokenTools).length+20,button:true,visible:true,onChange:()=>openOrFocusGMPanel()};
  });
}
export function installGMToolsHooks(){
  Hooks.on('renderChatMessageHTML',attachRequestListeners);
  game.socket.on(`system.${NS}`,async payload=>{
    if(!game.user.isGM||payload?.type!=='gmRollResponse')return;
    if(game.users.activeGM&&game.users.activeGM.id!==game.user.id)return;
    try{
      // Read the actual persisted check, rather than trusting a socket's result payload.
      const rolled=game.messages.get(payload.rollMessageId),check=rolled?.getFlag(NS,'check');
      const requestMessage=game.messages.get(payload.messageId),request=requestMessage?.getFlag(NS,'gmRollRequest');
      const actor=game.actors.get(payload.actorId),author=rolled?.author;
      if(!check||!actor||!request||!author||(!author.isGM&&!actor.testUserPermission(author,CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)))return;
      if(check.actorUuid!==actor.uuid||rolled.getFlag(NS,'gmRequestMessageId')!==payload.messageId||rolled.getFlag(NS,'gmRequestId')!==request.id)return;
      await recordRollResponse(payload.messageId,payload.actorId,resultSummary(check,author.name));
    }catch(error){console.error('Altered Carbon | GM roll response update failed',error);}
  });
  let refreshTimer;
  Hooks.on('updateActor',(_actor,changes)=>{
    if(!game.user.isGM||!JSON.stringify(changes).includes('gmBonusDice'))return;
    clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{
      const panel=foundry.applications.instances?.get?.('ac-gm-panel');
      if(panel?.rendered){panel._rememberState();panel.render({force:true});}
    },80);
  });
}

export class ACGMPanel extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
  static DEFAULT_OPTIONS={
    id:'ac-gm-panel',classes:['altered-carbon','ac-gm-window'],window:{title:'Altered Carbon - GM Control'},position:{width:1180,height:880},
    actions:{sendPreset:this._sendPreset,savePreset:this._savePreset,resetPreset:this._resetPreset,sendCustom:this._sendCustom,selectAll:this._selectAll,clearSelection:this._clearSelection,grantBonusDice:this._grantBonusDice,clearBonusDice:this._clearBonusDice,removeBonusDice:this._removeBonusDice,focusBonusDice:this._focusBonusDice,refreshAwards:this._refreshAwards,systemCheck:this._systemCheck,openGuide:this._openGuide,refreshGuide:this._refreshGuide,openAdventure:this._openAdventure}
  };
  static PARTS={main:{template:'systems/altered-carbon-rpg/templates/gm-panel.hbs'}};
  async _prepareContext(options){
    if(!game.user.isGM)throw new Error('GM only.');
    const context=await super._prepareContext(options),[presetData,skills]=await Promise.all([loadJSON('gm-presets.json'),loadJSON('core-skills.json')]);
    const characters=game.actors.filter(a=>['character','ai'].includes(a.type)).map(actor=>({id:actor.id,name:actor.name,publicName:publicName(actor),type:actor.type,owners:actorOwners(actor).map(u=>u.name).join(', ')||'No player owner',awards:getBonusDiceAwards(actor).map(award=>({...award,actorId:actor.id}))})).sort((a,b)=>a.publicName.localeCompare(b.publicName));
    const overrides=getPresetOverrides(),groups=[];
    for(const source of presetData.presets){
      let preset;
      try{preset=mergePreset(source,overrides[source.id]);}catch(_error){preset=mergePreset(source);}
      const die=preset.bonusDice[0]??'skill';
      const dieOptions=['skill',...BONUS_DIE_SIDES].map(value=>({value,label:value==='skill'?'Match Skill die':`d${value}`,selected:String(value)===String(die)}));
      preset={...preset,bonusDiceCount:preset.bonusDice.length,dieOptions,saved:Boolean(overrides[source.id])};
      let group=groups.find(g=>g.name===preset.category);if(!group){group={name:preset.category,presets:[]};groups.push(group);}group.presets.push(preset);
    }
    return {...context,characters,groups,skills:skills.map(s=>({name:s.name,attribute:s.attribute})),health:getSystemHealth()};
  }
  _rememberState(){
    if(!this.element?.querySelectorAll)return;
    this._selectedIds=this._selectedActorIds();this._fieldState||={};
    for(const input of this.element.querySelectorAll('input[name],select[name],textarea[name]')){
      if(input.name==='gmRecipients')continue;
      this._fieldState[input.name]=input.type==='checkbox'?input.checked:input.value;
    }
    this._mainScroll=this.element.querySelector('.ac-gm-main')?.scrollTop||0;
    this._railScroll=this.element.querySelector('.ac-gm-recipient-list')?.scrollTop||0;
  }
  async _onRender(context,options){
    await super._onRender(context,options);
    const root=this.element;
    for(const button of root.querySelectorAll('[data-action]'))if(this._busyActions?.has(button.dataset.action))button.disabled=true;
    for(const input of root.querySelectorAll('input[name],select[name],textarea[name]')){
      if(input.name==='gmRecipients'){input.checked=(this._selectedIds||[]).includes(input.value);continue;}
      if(Object.hasOwn(this._fieldState||{},input.name)){
        if(input.type==='checkbox')input.checked=this._fieldState[input.name];else input.value=this._fieldState[input.name];
      }
    }
    const main=root.querySelector('.ac-gm-main'),rail=root.querySelector('.ac-gm-recipient-list');
    if(main)main.scrollTop=this._mainScroll||0;if(rail)rail.scrollTop=this._railScroll||0;
    this._inputAbort?.abort();this._inputAbort=new AbortController();
    root.addEventListener('input',()=>this._rememberState(),{signal:this._inputAbort.signal});
    root.addEventListener('change',()=>this._rememberState(),{signal:this._inputAbort.signal});
  }
  _selectedActorIds(){return [...(this.element?.querySelectorAll('input[name="gmRecipients"]:checked')||[])].map(el=>el.value);}
  _value(name){return this.element?.querySelector(`[name="${name}"]`)?.value??'';}
  _readOptions(prefix){return normalizeRollOptions({baseTR:this._value(`${prefix}BaseTR`),difficulty:this._value(`${prefix}Difficulty`),bonus:this._value(`${prefix}Bonus`),bonusDiceCount:this._value(`${prefix}DiceCount`),bonusDie:this._value(`${prefix}Die`)||'skill'});}
  async _runAction(target,task){
    const action=target?.dataset?.action||'operation';this._busyActions||=new Set();
    if(target?.disabled||this._busyActions.has(action))return;
    this._busyActions.add(action);if(target)target.disabled=true;
    this._rememberState();
    try{return await task();}catch(error){console.error('Altered Carbon | GM Control',error);ui.notifications.warn(error.message);}
    finally{this._busyActions.delete(action);if(target)target.disabled=false;for(const button of this.element?.querySelectorAll(`[data-action="${action}"]`)||[])button.disabled=false;}
  }
  static async _sendPreset(event,target){
    return this._runAction(target,async()=>{
      const data=await loadJSON('gm-presets.json'),source=data.presets.find(p=>p.id===target.dataset.presetId);if(!source)throw new Error('Unknown preset.');
      const preset=mergePreset(source,{...getPresetOverrides()[source.id],...this._readOptions(`preset-${source.id}-`)});
      await createRollRequest({...preset,actorIds:this._selectedActorIds()});
    });
  }
  static async _savePreset(event,target){
    return this._runAction(target,async()=>{
      await savePresetOverride(target.dataset.presetId,this._readOptions(`preset-${target.dataset.presetId}-`));
      ui.notifications.info('Preset saved for this world. Already-sent requests are unchanged.');this.render({force:true});
    });
  }
  static async _resetPreset(event,target){
    return this._runAction(target,async()=>{
      const id=target.dataset.presetId;await savePresetOverride(id,{}, {reset:true});
      for(const key of Object.keys(this._fieldState||{}))if(key.startsWith(`preset-${id}-`))delete this._fieldState[key];
      ui.notifications.info('Preset restored to its supplied defaults.');this.render({force:true});
    });
  }
  static async _sendCustom(event,target){
    return this._runAction(target,async()=>{
      const skill=this._value('customSkill');
      await createRollRequest({title:this._value('customTitle')||skill,skill,...this._readOptions('custom'),prompt:this._value('customPrompt'),gmNote:this._value('customNote'),sightReliant:Boolean(this.element.querySelector('[name="customSightReliant"]')?.checked),sightOnly:Boolean(this.element.querySelector('[name="customSightOnly"]')?.checked),actorIds:this._selectedActorIds()});
    });
  }
  static async _grantBonusDice(event,target){
    return this._runAction(target,async()=>{
      const result=await grantBonusDice({actorIds:this._selectedActorIds(),dice:makeBonusDice(this._value('awardCount'),this._value('awardDie')),duration:this._value('awardDuration'),skill:this._value('awardSkill'),label:this._value('awardLabel')});
      if(result.granted.length){
        ui.notifications.info(`Bonus Dice assigned independently to ${result.granted.length} character(s).`);
        const actors=result.granted.map(entry=>game.actors.get(entry.actorId));
        const award=result.granted[0].award;
        const content=`<section class="ac-chat-card"><header class="ac-chat-card-header"><strong>GM Bonus Dice</strong></header><p>${esc(award.label)}: ${esc(describeBonusDice(award.dice))}</p><p>${esc(actors.map(publicName).join(', '))}</p><p>${award.duration==='next'?'Next matching Skill Check':'Until the GM removes this award'} / ${esc(award.skill||'Any Skill')}. Each character has a separate award. Added automatically when rolling; do not enter these dice again.</p></section>`;
        try{await ChatMessage.implementation.create({speaker:{alias:'GM Control'},content,whisper:recipientsForActors(actors),flags:{[NS]:{gmBonusAward:award.id}}});}catch(error){ui.notifications.warn('Awards were saved, but their chat notification failed. Do not assign them again.');console.error(error);}
      }
      if(result.failed.length)ui.notifications.warn(result.failed.map(f=>`${f.actorName}: ${f.reason}`).join('; '));
      this.render({force:true});
    });
  }
  static async _removeBonusDice(event,target){return this._runAction(target,async()=>{await removeBonusDiceAward(target.dataset.actorId,target.dataset.awardId);this.render({force:true});});}
  static async _clearBonusDice(event,target){
    return this._runAction(target,async()=>{
      const actorIds=this._selectedActorIds();if(!actorIds.length)throw new Error('Select at least one character.');
      const ok=await foundry.applications.api.DialogV2.confirm({window:{title:'Clear GM Bonus Dice'},content:`<p>Remove all outstanding GM Bonus Dice awards from ${actorIds.length} selected character(s)? This does not remove equipment or change any resources.</p>`});
      if(!ok)return;
      const result=await clearBonusDiceAwards(actorIds);if(result.failed.length)ui.notifications.warn(result.failed.map(f=>`${f.actorName}: ${f.reason}`).join('; '));
      this.render({force:true});
    });
  }
  static async _selectAll(){for(const el of this.element?.querySelectorAll('input[name="gmRecipients"]')||[])el.checked=true;this._rememberState();}
  static async _clearSelection(){for(const el of this.element?.querySelectorAll('input[name="gmRecipients"]')||[])el.checked=false;this._rememberState();}
  static async _focusBonusDice(){this.element.querySelector('[data-bonus-panel]')?.scrollIntoView({block:'start'});this.element.querySelector('[name="awardCount"]')?.focus();}
  static async _refreshAwards(){this._rememberState();this.render({force:true});}
  static async _systemCheck(event,target){return this._runAction(target,async()=>{await diagnoseSystem({notify:true});this.render({force:true});});}
  static async _openAdventure(){try{game.alteredCarbon.openAdventureBook();}catch(error){ui.notifications.error(error.message);}}
  static async _openGuide(){try{await ensureGMGuide({open:true});}catch(error){ui.notifications.error(error.message);}}
  static async _refreshGuide(){
    const ok=await foundry.applications.api.DialogV2.confirm({window:{title:'Refresh GM Guide'},content:'<p>Replace the system-generated GM Guide pages with the current v1.4.3 reference?</p><p class="hint">Any notes typed directly into those generated pages will be replaced.</p>'});
    if(ok)await ensureGMGuide({refresh:true,open:true});
  }
}

// GM status tools (v2.4.3): apply Scandals, Conditions and Injuries to one or more
// Actors from the GM Control panel or straight from any Altered Carbon chat card.
import {hasEquivalentUniqueRecord} from './sheet-record-utils.mjs';

const NS='altered-carbon-rpg';
const esc=value=>foundry.utils.escapeHTML(String(value??''));
const KINDS={scandal:'Scandal',condition:'Condition',injury:'Injury'};
let mechanicsCache=null;

async function loadMechanics(){
  if(mechanicsCache)return mechanicsCache;
  const response=await fetch(`systems/${NS}/data/mechanics-reference.json`);
  if(!response.ok)throw new Error('Unable to load mechanics-reference.json');
  mechanicsCache=await response.json();return mechanicsCache;
}
function entriesFor(mechanics,kind){return kind==='scandal'?mechanics.scandals:kind==='injury'?mechanics.injuries:mechanics.conditions;}
function actorInfluence(actor){return Number(actor.system?.resources?.influence?.value||0);}

function itemData(kind,entry,{influenceLoss=0,note=''}={}){
  const description=`<p>${esc(entry.effect||'')}</p>${note?`<p><em>${esc(note)}</em></p>`:''}`;
  if(kind==='scandal')return {name:entry.name,type:'scandal',system:{catalogId:entry.id,key:entry.id,active:true,influenceLoss:Math.max(0,Number(influenceLoss)||0),description,rulesRef:'Core Rulebook, Scandals'},flags:{[NS]:{appliedBy:'gm-status-tools'}}};
  if(kind==='injury')return {name:entry.name,type:'injury',system:{catalogId:entry.id,key:entry.id,recoveryRate:entry.recoveryRate||'',active:true,description,rulesRef:'Core Rulebook, Injuries'},flags:{[NS]:{appliedBy:'gm-status-tools'}}};
  return {name:entry.name,type:'condition',system:{catalogId:entry.id,key:entry.id,description,rulesRef:'Core Rulebook, Status Effects'},flags:{[NS]:{appliedBy:'gm-status-tools'}}};
}

/**
 * Apply one Scandal / Condition / Injury to several Actors.
 * Scandals can also deduct Influence (IP) and add the Scandalized Condition.
 */
export async function applyStatus({actorIds=[],kind='scandal',entryId,influenceLoss=0,deductIP=true,addScandalized=true,note='',publicCard=false}={}){
  if(!game.user.isGM)throw new Error('Only the GM can apply Scandals, Conditions and Injuries.');
  if(!KINDS[kind])throw new Error(`Unknown status type: ${kind}`);
  const mechanics=await loadMechanics(),entry=entriesFor(mechanics,kind).find(e=>e.id===entryId);
  if(!entry)throw new Error('Choose a Scandal, Condition or Injury to apply.');
  const actors=[...new Set(actorIds)].map(id=>game.actors.get(id)).filter(Boolean);
  if(!actors.length)throw new Error('Choose at least one Actor.');
  const scandalized=mechanics.conditions.find(c=>c.id==='scandalized');
  const lines=[],skipped=[];
  for(const actor of actors){
    const data=itemData(kind,entry,{influenceLoss,note});
    const parts=[];
    // Injuries stack (count); Scandals/Conditions are unique records.
    const existing=actor.items.find(i=>i.type===kind&&String(i.system.catalogId||i.system.key||'')===entry.id);
    if(existing&&kind==='injury'){await existing.update({'system.count':Number(existing.system.count||1)+1,'system.active':true});parts.push(`${entry.name} ×${Number(existing.system.count||1)}`);}
    else if(existing||hasEquivalentUniqueRecord(actor.items.contents,data)){
      if(kind==='scandal'&&existing&&!existing.system.active){await existing.update({'system.active':true});parts.push(`${entry.name} reactivated`);}
      else skipped.push(`${actor.name} already has ${entry.name}`);
    }else{await actor.createEmbeddedDocuments('Item',[data]);parts.push(entry.name);}
    if(kind==='scandal'){
      if(addScandalized&&scandalized&&!actor.items.some(i=>i.type==='condition'&&String(i.system.key||i.system.catalogId)==='scandalized')){
        await actor.createEmbeddedDocuments('Item',[itemData('condition',scandalized)]);parts.push('Scandalized');
      }
      const loss=Math.max(0,Number(influenceLoss)||0);
      if(deductIP&&loss&&parts.length){const before=actorInfluence(actor);await actor.update({'system.resources.influence.value':before-loss});parts.push(`IP ${before} → ${before-loss}`);}
    }
    if(parts.length)lines.push(`<li><strong>${esc(actor.name)}</strong>: ${esc(parts.join(' · '))}</li>`);
  }
  if(lines.length){
    const owners=game.users.filter(u=>u.isGM||actors.some(a=>a.testUserPermission(u,'OWNER'))).map(u=>u.id);
    const content=`<section class="ac-chat-card ac-status-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">GM RULING · ${esc(KINDS[kind].toUpperCase())}</span><strong>${esc(entry.name)}</strong></div></header><p>${esc(entry.effect||'')}</p><ul>${lines.join('')}</ul>${note?`<p class="hint">${esc(note)}</p>`:''}</section>`;
    await ChatMessage.implementation.create({speaker:{alias:'GM Control'},content,whisper:publicCard?[]:owners,flags:{[NS]:{statusApplied:{kind,entryId:entry.id,actorIds:actors.map(a=>a.id)}}}});
  }
  if(skipped.length)ui.notifications.info(skipped.join('; '));
  return {applied:lines.length,skipped};
}

/** Remove (or deactivate) a Scandal/Condition/Injury from Actors. */
export async function clearStatus({actorIds=[],kind,entryId}={}){
  if(!game.user.isGM)throw new Error('GM only.');let count=0;
  for(const actor of actorIds.map(id=>game.actors.get(id)).filter(Boolean)){
    const ids=actor.items.filter(i=>i.type===kind&&String(i.system.catalogId||i.system.key||'')===entryId).map(i=>i.id);
    if(ids.length){await actor.deleteEmbeddedDocuments('Item',ids);count+=ids.length;}
  }
  return count;
}

function defaultActorIds(message){
  const ids=new Set();
  const speakerActor=message?.speaker?.actor;if(speakerActor)ids.add(speakerActor);
  const flagged=message?.flags?.[NS]||{};
  for(const key of ['actorId','targetActorId'])if(flagged[key])ids.add(flagged[key]);
  for(const uuidKey of ['actorUuid','sourceActorUuid','targetActorUuid']){
    for(const value of Object.values(flagged)){const uuid=value?.[uuidKey];if(typeof uuid==='string'){const id=uuid.split('.').pop();if(game.actors.get(id))ids.add(id);}}
  }
  for(const token of game.user.targets)if(token.actor?.id)ids.add(token.actor.id);
  for(const token of canvas?.tokens?.controlled||[])if(token.actor?.id)ids.add(token.actor.id);
  return [...ids];
}

/** Dialog: pick a status, choose Actors, set IP loss. */
export async function openStatusDialog({actorIds=[],kind='scandal'}={}){
  if(!game.user.isGM)return ui.notifications.warn('Only the GM can apply Scandals, Conditions and Injuries.');
  const mechanics=await loadMechanics();
  const group=(k,label)=>`<optgroup label="${label}">${entriesFor(mechanics,k).map((e,i)=>`<option value="${k}:${esc(e.id)}"${k===kind&&i===0?' selected':''}>${esc(e.name)}</option>`).join('')}</optgroup>`;
  const order=kind==='condition'?['condition','scandal','injury']:kind==='injury'?['injury','scandal','condition']:['scandal','condition','injury'];
  const select=order.map(k=>group(k,KINDS[k]+'s')).join('');
  const candidates=game.actors.filter(a=>['character','ai','npc','threat'].includes(a.type)).sort((a,b)=>Number(actorIds.includes(b.id))-Number(actorIds.includes(a.id))||a.name.localeCompare(b.name));
  const actorList=candidates.map(a=>`<label class="ac-status-actor"><input type="checkbox" name="actor-${a.id}" ${actorIds.includes(a.id)?'checked':''}> ${esc(a.name)} <small>(${esc(a.type)}${a.type==='character'||a.type==='ai'?` · IP ${actorInfluence(a)}`:''})</small></label>`).join('');
  const effects=Object.fromEntries(['scandal','condition','injury'].flatMap(k=>entriesFor(mechanics,k).map(e=>[`${k}:${e.id}`,e.effect||''])));
  const content=`<div class="ac-status-dialog">
    <label><span>Apply</span><select name="entry">${select}</select></label>
    <p class="hint" data-status-effect></p>
    <fieldset><legend>Actors</legend><div class="ac-status-actors">${actorList||'<p>No Actors in this world.</p>'}</div></fieldset>
    <div class="ac-status-scandal">
      <label><span>Influence (IP) lost</span><input type="number" name="influenceLoss" value="1" min="0" max="20" step="1"></label>
      <label><input type="checkbox" name="deductIP" checked> Deduct IP now</label>
      <label><input type="checkbox" name="addScandalized" checked> Also apply the Scandalized Condition</label>
      <p class="hint">Scandal options are ignored for Conditions and Injuries.</p>
    </div>
    <label><span>GM note (optional, shown on the chat card)</span><input type="text" name="note" maxlength="240"></label>
    <label><input type="checkbox" name="publicCard"> Post the ruling publicly (otherwise GM + owners only)</label>
  </div>`;
  const form=await foundry.applications.api.DialogV2.input({
    window:{title:'Apply Scandal / Condition / Injury'},position:{width:520},content,
    ok:{label:'Apply',icon:'fa-solid fa-gavel'},
    render:(_event,dialog)=>{
      const root=dialog.element??dialog;const sel=root.querySelector?.('[name="entry"]'),out=root.querySelector?.('[data-status-effect]');
      const update=()=>{if(out&&sel)out.textContent=effects[sel.value]||'';};sel?.addEventListener('change',update);update();
    }
  });
  if(!form)return null;
  const [chosenKind,entryId]=String(form.entry||'').split(':');
  const chosen=candidates.filter(a=>form[`actor-${a.id}`]).map(a=>a.id);
  return applyStatus({actorIds:chosen,kind:chosenKind,entryId,influenceLoss:form.influenceLoss,deductIP:Boolean(form.deductIP),addScandalized:Boolean(form.addScandalized),note:form.note||'',publicCard:Boolean(form.publicCard)});
}

/** Adds a GM-only "Rulings" strip to every Altered Carbon chat card. */
export function installStatusChatHooks(){
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    try{
      if(!game.user.isGM)return;
      const root=html instanceof HTMLElement?html:html?.[0];if(!root)return;
      const card=root.querySelector('.ac-chat-card');if(!card||card.classList.contains('ac-status-card')||root.querySelector('.ac-gm-ruling-strip'))return;
      const strip=document.createElement('div');strip.className='ac-gm-ruling-strip';
      strip.innerHTML=`<span>GM</span><button type="button" data-ac-ruling="scandal" title="Apply a Scandal"><i class="fa-solid fa-newspaper"></i> Scandal</button><button type="button" data-ac-ruling="condition" title="Apply a Condition"><i class="fa-solid fa-person-falling"></i> Condition</button><button type="button" data-ac-ruling="injury" title="Apply an Injury"><i class="fa-solid fa-bone"></i> Injury</button>`;
      strip.addEventListener('click',event=>{
        const button=event.target.closest('[data-ac-ruling]');if(!button)return;event.preventDefault();event.stopPropagation();
        openStatusDialog({actorIds:defaultActorIds(message),kind:button.dataset.acRuling}).catch(error=>{console.error('Altered Carbon | Status ruling failed',error);ui.notifications.warn(error.message);});
      });
      card.appendChild(strip);
    }catch(error){console.warn('Altered Carbon | Ruling strip skipped',error);}
  });
}

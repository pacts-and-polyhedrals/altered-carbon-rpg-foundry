/** Foundry v14: precise, private GM handling for Core Traits whose effects are
 * only partly executable. Every one of the 240 Core Traits is indexed; all
 * previous 79 unimplemented Traits have a review path. No guessed mutations.
 */
import {TRAIT_ADJUDICATION_INDEX} from './trait-adjudication-index.mjs';
const NS='altered-carbon-rpg';
const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inventory=actor=>actor?.items?.contents||[...(actor?.items||[])];
const clampText=(s,max=800)=>String(s||'').slice(0,max);
const needsReview=record=>record?.needsReview===true;

export function ownedAdjudications(actor,{event='manual',skill='',itemTags=[],full=false,traitId=null}={}){
 const normalizedSkill=slug(skill),wanted=slug(traitId),tags=new Set((itemTags||[]).map(slug));
 const unique=new Set(),found=[];
 for(const item of inventory(actor)){
  if(item.type!=='trait')continue;
  const id=String(item.system?.catalogId||'');const ref=TRAIT_ADJUDICATION_INDEX[id];
  if(!ref){
    if(full&&item.system?.effect){found.push({id:`custom:${item.id}`,name:item.name,itemId:item.id,events:['manual'],skills:[],needsReview:true,automaticKeys:[],guidance:clampText(item.system.effect,540),rulesRef:'Custom Trait (verify GM source)'});}
    continue;
  }
  if(unique.has(id)||(wanted&&slug(id)!==wanted))continue;
  unique.add(id);
  if(!needsReview(ref))continue;
  if(!full){
    const events=ref.events||[];
    if(!events.includes(event)&&!(event==='attack'&&events.includes('check'))&&!(event==='defense'&&events.includes('check')))continue;
    if(['check','attack','defense','treatment'].includes(event)&&ref.skills?.length&&normalizedSkill&&!ref.skills.includes(normalizedSkill))continue;
    if(event==='attack'){
      const branch=slug(ref.branch||'');
      if(branch.includes('small-arms')&&!tags.has('small-arms'))continue;
      if(branch.includes('long-guns')&&!tags.has('long-guns'))continue;
      if(branch.includes('energy-weapon')&&!tags.has('directed-energy')&&!tags.has('rail'))continue;
      if(branch.includes('melee')&&!tags.has('melee')&&!tags.has('unarmed'))continue;
      if(branch.includes('thrown')&&!tags.has('thrown'))continue;
    }
  }
  found.push({...ref,itemId:item.id});
 }
 return found;
}

export function renderAdjudicationCard({actorName='',event='manual',entries=[],status='pending',reason='',originMessageId=null}={}){
 const label=status==='pending'?'GM DECISION NEEDED':status==='applied'?'GM RESOLVED':status==='not-applicable'?'NOT APPLICABLE':'DEFERRED';
 const listing=entries.map(entry=>`<li class="ac-trait-review-entry"><details><summary><strong>${escapeHTML(entry.name)}</strong> <span>${escapeHTML(entry.id)} / ${entry.automaticKeys?.length?'Partial auto':'GM assisted'}</span></summary><p>${escapeHTML(entry.guidance)}</p><small>${escapeHTML(entry.rulesRef)}</small><p class="ac-muted">${entry.automaticKeys?.length?`Already executable: ${escapeHTML(entry.automaticKeys.join(', '))}. Remaining source clauses need confirmation.`:entry.executableProcedure?`Source procedure available; review remaining clauses before applying extras.`:'No safe executable modifier; apply only after confirming conditions and costs.'}</p>${entry.executableProcedure?`<p class="ac-muted"><strong>Existing procedure:</strong> ${escapeHTML(entry.executableProcedure)} Do not apply it twice.</p>`:''}</details></li>`).join('');
 return `<section class="ac-chat-card ac-trait-adjudication" data-ac-gm-trait="true" aria-label="Private GM Trait adjudication">
  <header class="ac-chat-card-header"><div><span class="ac-chat-kicker">CORE 2020 / TRAITS / ${escapeHTML(event.toUpperCase())}</span><strong>${escapeHTML(actorName)} - Trait adjudication</strong></div><span class="ac-grade-chip">${label}</span></header>
  <p class="ac-chat-subtitle">${entries.length} source-rule item(s) for GM review. Never treat an already-automated modifier as another award.</p>
  <ol class="ac-trait-review-list">${listing}</ol>
  ${reason?`<p class="ac-chat-meta"><strong>GM note:</strong> ${escapeHTML(reason)}</p>`:''}
  ${originMessageId?'<p class="ac-chat-meta">Linked to a roll or action chat message.</p>':''}
  ${status==='pending'||status==='deferred'?'<div class="ac-chat-actions"><button type="button" class="ac-trait-adjudicate" data-ac-trait-action="review">Review and record ruling</button></div>':'<p class="ac-chat-meta">This prompt has been recorded; no character resources were changed automatically.</p>'}
 </section>`;
}

function recipients(){return [...(game?.users||[])].filter(u=>u.isGM).map(u=>u.id);}
export async function postTraitAdjudication(actor,options={}){
 const event=options.event||'manual',entries=ownedAdjudications(actor,{event,skill:options.skill,itemTags:options.itemTags,full:options.full===true,traitId:options.traitId});
 if(!entries.length)return null;
 const whisper=recipients();if(!whisper.length){console.warn('Altered Carbon | Cannot post Trait review without a GM recipient.');return null;}
 const originMessageId=String(options.originMessageId||'').slice(0,128);
 if(originMessageId&&game.messages?.contents?.some(m=>m.getFlag?.(NS,'traitAdjudication')?.originMessageId===originMessageId))return null;
 const metadata={actorUuid:actor.uuid,actorName:actor.name,event,skill:String(options.skill||''),originMessageId,entries:entries.map(x=>({id:x.id,name:x.name,itemId:x.itemId,automaticKeys:x.automaticKeys,executableProcedure:x.executableProcedure||'',guidance:x.guidance,rulesRef:x.rulesRef})),status:'pending',reason:''};
 // A whisper, NOT a flag on the public Skill roll. Players cannot see the
 // pending rules, GM notes or choices in source roll data or broadcast sockets.
 return ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content:renderAdjudicationCard({actorName:actor.name,event,entries,status:'pending',originMessageId}),whisper,flags:{[NS]:{traitAdjudication:metadata}}});
}

export async function recordTraitAdjudication(message,{status,reason=''}={}){
 if(!game.user?.isGM)throw new Error('Only a GM can adjudicate Core Traits.');
 const old=message.getFlag?.(NS,'traitAdjudication');if(!old)throw new Error('Not a Trait adjudication chat card.');
 if(!['applied','not-applicable','deferred'].includes(status))throw new Error('Invalid Trait resolution.');
 if(old.status!=='pending'&&old.status!=='deferred')throw new Error('This Trait prompt was already resolved.');
 const note=clampText(reason,1000).trim();if(status==='applied'&&!note)throw new Error('Record the actual GM ruling before marking a Trait applied.');
 const metadata={...old,status,reason:note,gmUserId:game.user.id,reviewedAt:Date.now()};
 await message.update({content:renderAdjudicationCard({actorName:old.actorName,event:old.event,entries:old.entries,status,reason:note,originMessageId:old.originMessageId}),[`flags.${NS}.traitAdjudication`]:metadata});
 return metadata;
}

const actionValue=(form,name)=>String(form instanceof FormData?form.get(name):form?.[name]||'');
export async function promptForTraitReview(actor,{traitId=null}={}){
 if(!(actor?.isOwner||game.user?.isGM))throw new Error('Actor owner or GM required.');
 const entries=ownedAdjudications(actor,{full:true,traitId});
 if(!entries.length)return ui.notifications.info('No unresolved Core Trait clauses found on this Actor.');
 const options=entries.map(x=>`<option value="${escapeHTML(x.id)}">${escapeHTML(x.name)} (${escapeHTML(x.id)})</option>`).join('');
 const form=await foundry.applications.api.DialogV2.input({window:{title:`Ask the GM: ${actor.name} Traits`},content:`<p>Choose an official or custom Trait that needs adjudication. The pending card will be visible to GMs only and never spends SP/IP or changes a roll automatically.</p><label>Trait</label><select name="trait">${options}</select><label>Action / context</label><textarea name="context" rows="2" maxlength="500" placeholder="What is being attempted? Target, range, source, resource cost..."></textarea>`});
 if(!form)return null;
 const selected=actionValue(form,'trait');if(!entries.some(x=>x.id===selected))throw new Error('Trait selection not owned by Actor.');
 const note=clampText(actionValue(form,'context'),500);
 const m=await postTraitAdjudication(actor,{full:true,traitId:selected,event:'manual'});
 if(m&&note){const f=m.getFlag?.(NS,'traitAdjudication');if(f){const metadata={...f,contextNote:note};await m.update({content:renderAdjudicationCard({actorName:actor.name,event:'manual',entries:entries.filter(e=>e.id===selected),status:'pending',reason:`Player context: ${note}`}),[`flags.${NS}.traitAdjudication`]:metadata});}}
 return m;
}

function rootNode(html){if(typeof HTMLElement!=='undefined'&&html instanceof HTMLElement)return html;return html?.[0]||null;}
/** Register one hook, with no listener duplication on rerenders. GM-only buttons
 * are inserted client-side and never expose the private adjudication contents.
 */
export function installTraitAdjudicationHooks(){
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  if(!game.user?.isGM||game.system?.id!==NS)return;
  const root=rootNode(html);if(!root)return;
  const review=message.getFlag?.(NS,'traitAdjudication');
  if(review){
   const button=root.querySelector('.ac-trait-adjudicate');if(!button)return;
   button.addEventListener('click',async()=>{try{
    if(!game.user.isGM)return;
    const form=await foundry.applications.api.DialogV2.input({window:{title:'Record GM Trait Ruling'},content:`<p>Confirm source requirements and costs. This records an adjudication; it does NOT apply additional bonuses automatically.</p><label>Decision</label><select name="status"><option value="applied">Resolved manually</option><option value="not-applicable">Not applicable this time</option><option value="deferred">Defer</option></select><label>Ruling / consequences</label><textarea name="reason" rows="3" maxlength="1000" placeholder="Record targets, degrees, SP/IP costs and applied consequences"></textarea>`});
    if(!form)return;await recordTraitAdjudication(message,{status:actionValue(form,'status'),reason:actionValue(form,'reason')});
   }catch(error){ui.notifications.error(error.message);}});
   return;
  }
  // Always leave a GM-only review affordance on Action/Skill roll cards; it
  // does not appear in player HTML or in the message's public data.
  const check=message.getFlag?.(NS,'check'),equipment=message.getFlag?.(NS,'equipmentUse'),weapon=message.getFlag?.(NS,'weaponUse');
  if(!check&&!equipment&&!weapon)return;
  const card=root.querySelector('.ac-chat-card');if(!card||card.querySelector('.ac-trait-open-review'))return;
  const entry=document.createElement('div');entry.className='ac-gm-trait-toolbar';
  const button=document.createElement('button');button.type='button';button.className='ac-trait-open-review';button.textContent='GM: Review owned Trait abilities';button.setAttribute('aria-label','Review remaining Trait abilities for this action');
  button.addEventListener('click',async()=>{try{
    const uuid=check?.actorUuid||equipment?.actorUuid||weapon?.actorUuid;const actor=uuid?await fromUuid(uuid):null;if(!actor)return ui.notifications.warn('Actor not available for Trait review.');
    await postTraitAdjudication(actor,{full:true,event:'manual'});
   }catch(error){ui.notifications.error(error.message);}});
  entry.append(button);card.append(entry);
 });
}

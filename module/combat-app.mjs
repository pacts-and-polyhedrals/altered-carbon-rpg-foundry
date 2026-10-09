import * as Combat from './combat.mjs';
import {speedProgress} from './speed-dice.mjs';
import {ACZoneAssistant} from './zone-assistant.mjs';
import {performGrappleContest,clearGrapple} from './combat-workflow.mjs';
const NS='altered-carbon-rpg';
const esc=s=>foundry.utils.escapeHTML(String(s??''));
function allCombatants(combat){return Array.from(combat?.combatants||[]);}
export class ACCombatConsole extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
 static DEFAULT_OPTIONS={id:'altered-carbon-combat-console',classes:['altered-carbon','ac-combat-window'],window:{title:'Altered Carbon — Tactical Interface'},position:{width:920,height:780},actions:{zones:this._zones,grapple:this._grapple,breakGrapple:this._breakGrapple,beginIntent:this._beginIntent,rollPrivate:this._rollPrivate,submit:this._submit,unlock:this._unlock,reveal:this._reveal,advance:this._advance,resolution:this._resolution,spendDie:this._spendDie,next:this._next}};
 static PARTS={main:{template:'systems/altered-carbon-rpg/templates/combat-console.hbs'}};
 async _prepareContext(options){const context=await super._prepareContext(options);const combat=game.combat;if(!combat)return {...context,combat:null};
  const st=combat.getFlag(NS,'state')||{},gm=Boolean(game.user.isGM),revealed=Boolean(st.commitmentsRevealed),selectionPhase=['intent','select'].includes(st.phase);
  const combatants=allCombatants(combat).map(c=>{const s=c.getFlag(NS,'speed')||{},own=gm||Boolean(c.actor?.isOwner),roll=own?Combat.privateRollFor(c):null,available=roll?.results||[];
   const progress=speedProgress(s.total,s.spentIndexes,s.revealedActiveIndexes),locked=Boolean(s.submitted);
   const display=Array.from({length:progress.total},(_,index)=>({index,result:revealed?s.results?.[index]:own?available[index]:null,visible:Boolean(revealed||own&&available.length),spent:(s.spentIndexes||[]).includes(index),active:revealed&&(s.revealedActiveIndexes||[]).includes(index),canSelect:false}));
   // Eligibility depends on the current round and on whether a die has already been resolved.
   for(const die of display)die.canSelect=own&&selectionPhase&&!locked&&Boolean(roll)&&!die.spent;
   return {id:c.id,name:c.name,owned:own,rolled:Boolean(s.rolled||roll),submitted:locked,isCurrent:st.activeCombatantId===c.id,results:display,
    ...progress,canRoll:own&&st.phase==='intent'&&!roll&&!locked,canLock:own&&selectionPhase&&!locked&&progress.remaining>0&&Boolean(roll),canUnlock:gm&&selectionPhase&&!revealed&&locked&&progress.remaining>0,canSpend:own&&revealed&&['check','resolution'].includes(st.phase),ready:locked,activeTotal:(s.revealedActiveIndexes||[]).reduce((n,i)=>n+Number(s.results?.[i]||0),0)};});
  const summary=Combat.publicSpeedSummary(combat);return {...context,combat,gm,state:st,combatants,selectionPhase,canReveal:gm&&selectionPhase&&!revealed&&summary.ready,locked:summary.submitted,expected:summary.total,revealed,canAdvance:gm&&revealed&&selectionPhase};
 }
 static async _grapple(){if(!game.user.isGM)return;const combat=game.combat,cs=allCombatants(combat).filter(c=>c.actor);if(cs.length<2)return ui.notifications.warn('A Combat with at least two combatants is required.');
  const options=cs.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  const form=await foundry.applications.api.DialogV2.input({window:{title:'Opposed Grapple / Speed Dice'},content:`<p>Grapple requires two opponents already Engaged in a Shared Zone; spend one revealed unspent Active Speed Die from each.</p><label>Attacker</label><select name="a">${options}</select><label>Defender</label><select name="b">${options}</select><label><input name="engaged" type="checkbox"> GM confirms both are Engaged in the same Zone</label>`});if(!form)return;
  const input=(f,k)=>f instanceof FormData?f.get(k):f?.[k],a=cs.find(c=>c.id===input(form,'a')),b=cs.find(c=>c.id===input(form,'b'));if(!a||!b||a===b)return ui.notifications.error('Choose two different combatants.');
  if(!(form instanceof FormData?form.has('engaged'):form.engaged))return ui.notifications.error('GM must confirm Engaged and Shared Zone.');
  const getOptions=c=>{const st=c.getFlag(NS,'speed')||{};return (st.revealedActiveIndexes||[]).filter(i=>!(st.spentIndexes||[]).includes(i)).map(i=>`<option value="${i}">Speed Die #${i+1}: ${st.results[i]}</option>`).join('');};
  const optsA=getOptions(a),optsB=getOptions(b);if(!optsA||!optsB)return ui.notifications.warn('Each combatant must have a revealed, unspent Active Speed Die.');
  const dice=await foundry.applications.api.DialogV2.input({window:{title:'Spend Grapple Speed Dice'},content:`<p>${esc(a.name)} vs ${esc(b.name)}</p><label>Attacker Die</label><select name="a">${optsA}</select><label>Defender Die</label><select name="b">${optsB}</select>`});if(!dice)return;
  try{const result=await performGrappleContest(combat,a,b,Number(input(dice,'a')),Number(input(dice,'b')),{engaged:true});await Combat.refreshSpeedBoard(combat);ui.notifications.info(result.reason);this.render({force:true});}catch(e){ui.notifications.error(e.message);}
 }
 static async _breakGrapple(){if(!game.user.isGM)return;const cs=allCombatants(game.combat).filter(c=>c.actor?.getFlag(NS,'grappledWith'));if(!cs.length)return ui.notifications.warn('No active Grapples.');const options=cs.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');const form=await foundry.applications.api.DialogV2.input({window:{title:'GM: Confirm Break Grapple'},content:`<p>Clear a Grapple only after its legal Break Grapple requirements have succeeded.</p><label>Combatant</label><select name="id">${options}</select><label><input name="confirmed" type="checkbox"> Opposed action successfully resolved</label>`});if(!form)return;const get=k=>form instanceof FormData?form.get(k):form?.[k];if(!(form instanceof FormData?form.has('confirmed'):form.confirmed))return ui.notifications.warn('Confirm successful Break Grapple first.');const c=cs.find(c=>c.id===get('id'));if(c&&await clearGrapple(c.actor))ui.notifications.info('Grapple cleared.');this.render({force:true});}
 static async _zones(){new ACZoneAssistant().render({force:true});}
 static async _beginIntent(){try{await Combat.beginIntent(game.combat);await this.render({force:true});}catch(e){ui.notifications.error(e.message);}}
 static async _rollPrivate(event,target){const c=game.combat?.combatants.get(target.dataset.combatantId);if(!c)return;try{await Combat.rollPrivateSpeed(c);this.render({force:true});}catch(e){ui.notifications.error(e.message);}}
 static async _submit(event,target){const c=game.combat?.combatants.get(target.dataset.combatantId);if(!c)return;const indexes=[...this.element.querySelectorAll(`[data-speed-for="${c.id}"]:checked`)].map(x=>Number(x.value));try{await Combat.submitSpeedCommitment(c,indexes);ui.notifications.info('Active Speed Dice locked privately. Waiting for the GM reveal.');this.render({force:true});}catch(e){ui.notifications.error(e.message);}}
 static async _unlock(event,target){const c=game.combat?.combatants.get(target.dataset.combatantId);if(!c)return;try{await Combat.unlockSpeedDice(c);this.render({force:true});}catch(e){ui.notifications.error(e.message);}}
 static async _reveal(){try{const n=await Combat.revealCommitments(game.combat);ui.notifications.info(`${n} combatants revealed on the shared chat card.`);this.render({force:true});}catch(e){ui.notifications.error(e.message);}}
 static async _advance(){try{await Combat.advanceToCheck(game.combat);this.render({force:true});}catch(e){ui.notifications.error(e.message);}}
 static async _resolution(){try{await Combat.setResolution(game.combat);this.render({force:true});}catch(e){ui.notifications.error(e.message);}}
 static async _spendDie(event,target){const c=game.combat?.combatants.get(target.dataset.combatantId);if(!c)return;try{await Combat.resolveActiveDice(game.combat,c,[Number(target.dataset.index)]);this.render({force:true});}catch(e){ui.notifications.error(e.message);}}
 static async _next(){try{await Combat.nextResolution(game.combat);this.render({force:true});}catch(e){ui.notifications.error(e.message);}}
}
/** Live, read-only used/total counters update without rerendering a sheet that someone is editing. */
export function refreshSheetSpeedIndicators(){
 if(typeof document==='undefined')return;
 const roster=new Map(allCombatants(game.combat).filter(c=>c.actor).map(c=>[c.actor.id,speedProgress(c.getFlag(NS,'speed')?.total||c.actor.ac?.speedDice||1,c.getFlag(NS,'speed')?.spentIndexes||[])]));
 document.querySelectorAll('[data-ac-speed-progress]').forEach(el=>{
  const progress=roster.get(el.dataset.acSpeedProgress);if(!progress)return;
  el.textContent=progress.label+(el.dataset.acSpeedSuffix??'');
  el.setAttribute('aria-label',`${progress.used} used of ${progress.total} Speed Dice; ${progress.remaining} remaining`);
 });
}
/** Cross-client Combat/Combatant updates also refresh the tactical UI and sheet counters. */
export function installCombatConsoleHooks(){for(const hook of ['updateCombatant','updateCombat','createCombatant','deleteCombatant'])Hooks.on(hook,()=>{
 refreshSheetSpeedIndicators();
 // v13+/v14: ApplicationV2 windows live in foundry.applications.instances, not ui.windows.
 const app=foundry.applications.instances?.get?.('altered-carbon-combat-console')??Object.values(ui.windows||{}).find(w=>w?.id==='altered-carbon-combat-console');if(app?.rendered)app.render({force:true});
});}


/** Chat-side shortcut: the shared waiting card gains a reveal control only for its GM.
 *  The authoritative reveal still revalidates every private roll and commitment.
 */
export function canShowChatRevealButton(message,combat,user){
 if(!user?.isGM||!message||!combat)return false;
 const card=message.getFlag?.(NS,'speedBoard'),st=combat.getFlag?.(NS,'state')||{};
 return Boolean(card&&card.combatId===combat.id&&st.boardMessageId===message.id&&
   card.intentKey===st.intentKey&&card.selectionKey===st.selectionKey&&
   ['intent','select'].includes(st.phase)&&!st.commitmentsRevealed&&Combat.publicSpeedSummary(combat).ready);
}
export function installSpeedChatHooks(){
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  if(!game.user?.isGM||!message?.getFlag?.(NS,'speedBoard'))return;
  const root=typeof HTMLElement!=='undefined'&&html instanceof HTMLElement?html:html?.[0];
  const board=root?.matches?.('[data-ac-speed-board]')?root:root?.querySelector?.('[data-ac-speed-board]');
  if(!board||board.querySelector('[data-ac-speed-chat-reveal]'))return;
  const combat=game.combats?.get(message.getFlag(NS,'speedBoard')?.combatId);
  if(!canShowChatRevealButton(message,combat,game.user))return;
  const button=document.createElement('button');button.type='button';button.dataset.acSpeedChatReveal='true';
  button.className='ac-speed-chat-reveal';button.textContent='GM · Reveal All Speed Dice';
  button.setAttribute('aria-label','GM reveal all privately submitted Speed Dice to the shared combat chat card');
  button.addEventListener('click',async()=>{
   button.disabled=true;
   try{await Combat.revealCommitments(combat);ui.notifications.info('Speed Dice revealed to everyone.');}
   catch(error){ui.notifications.error(error.message);button.disabled=false;}
  });
  board.append(button);
 });
}

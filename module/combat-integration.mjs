// Combat Tracker ↔ Speed Dice (v2.4.7)
// Foundry's own tracker buttons now drive the 2020 Speed Dice procedure:
//   Begin Combat     → starts a Speed Dice Turn (Intent phase) and opens the console for everyone
//   Roll Initiative  → rolls that combatant's Speed Dice privately (Roll All / Roll NPCs too)
//   Next Turn        → next combatant by the lowest sum of unspent Active dice (Resolution)
//   Next Round       → new Speed Dice Turn (everyone rolls again)
// Each combatant's Initiative shows the sum of their unspent Active dice once revealed, and the
// tracker is sorted lowest-first, so the highlighted row is always who acts next.
import * as Speed from './combat.mjs';

const NS='altered-carbon-rpg';
const leaderGM=()=>game.users.activeGM??game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]??null;
const isLeader=()=>leaderGM()?.id===game.user.id;
const speedOf=c=>c?.getFlag?.(NS,'speed')||{};
const stateOf=combat=>combat?.getFlag?.(NS,'state')||{};

/** Unspent Active dice total after reveal; null before reveal or when none are active. */
export function activeInitiative(combatant,state){
  if(!state?.commitmentsRevealed)return null;
  const s=speedOf(combatant),spent=new Set(s.spentIndexes||[]),active=(s.revealedActiveIndexes||[]).filter(i=>!spent.has(i));
  return active.length?active.reduce((n,i)=>n+Number(s.results?.[i]||0),0):null;
}
/** Lowest first; combatants without Active dice go last. */
export function compareSpeedInitiative(a,b){
  const ia=Number.isFinite(a?.initiative)?a.initiative:Infinity,ib=Number.isFinite(b?.initiative)?b.initiative:Infinity;
  return ia-ib||String(a?.name||'').localeCompare(String(b?.name||''))||String(a?.id||'').localeCompare(String(b?.id||''));
}

export function openCombatConsole(){return game.alteredCarbon?.openCombatConsole?.();}
export function refreshCombatConsole(){
  const app=foundry.applications.instances?.get?.('altered-carbon-combat-console')??Object.values(ui.windows||{}).find(w=>w?.id==='altered-carbon-combat-console');
  if(app?.rendered)app.render({force:true});
}

/** Keep Initiative values and the tracker's current turn in step with the Speed Dice state. */
export async function syncTrackerWithSpeed(combat){
  if(!combat||!game.user.isGM)return;
  const st=stateOf(combat),updates=[];
  for(const c of combat.combatants){const want=activeInitiative(c,st);if((c.initiative??null)!==want)updates.push({_id:c.id,initiative:want});}
  if(updates.length)await combat.updateEmbeddedDocuments('Combatant',updates,{acSpeedSync:true});
  if(st.activeCombatantId){
    const turns=combat.turns?.length?combat.turns:combat.setupTurns?.()||[];
    const index=turns.findIndex(t=>t.id===st.activeCombatantId);
    if(index>=0&&combat.turn!==index)await combat.update({turn:index},{acSpeedSync:true});
  }
}

function needIntent(combat){const st=stateOf(combat);return !st.intentKey||['complete',undefined].includes(st.phase);}

export function defineSpeedCombat(Base){
  return class AlteredCarbonCombat extends Base{
    _sortCombatants(a,b){return compareSpeedInitiative(a,b);}
    static _sortCombatants(a,b){return compareSpeedInitiative(a,b);}

    /** Tracker "Roll Initiative" = roll Speed Dice privately. */
    async rollInitiative(ids,options={}){
      ids=typeof ids==='string'?[ids]:Array.from(ids||[]);
      if(needIntent(this)){
        if(!game.user.isGM){ui.notifications.info('Waiting for the GM to start the Speed Dice Turn.');return this;}
        await Speed.beginIntent(this);
      }
      if(stateOf(this).phase!=='intent'){ui.notifications.info('Speed Dice are rolled once per Turn, at the start. Use the Tactical Console to choose Active dice.');openCombatConsole();return this;}
      let rolled=0;
      for(const id of ids){
        const c=this.combatants.get(id);if(!c||!(game.user.isGM||c.actor?.isOwner))continue;
        if(Speed.privateRollFor(c))continue;
        try{await Speed.rollPrivateSpeed(c);rolled++;}catch(error){ui.notifications.warn(`${c.name}: ${error.message}`);}
      }
      if(rolled)openCombatConsole();
      return this;
    }

    async startCombat(){
      const result=await super.startCombat();
      if(game.user.isGM&&this.combatants.size){try{await Speed.beginIntent(this);}catch(error){ui.notifications.warn(error.message);}}
      return result;
    }

    /** New Round in the tracker = new Speed Dice Turn. */
    async nextRound(){
      const result=await super.nextRound();
      if(game.user.isGM&&this.combatants.size){try{await Speed.beginIntent(this);}catch(error){ui.notifications.warn(error.message);}}
      return result;
    }

    /** Next Turn = next Active combatant by lowest Active dice. */
    async nextTurn(){
      if(!game.user.isGM)return this;
      const st=stateOf(this);
      if(!this.combatants.size)return this;
      if(!st.commitmentsRevealed){ui.notifications.info(st.phase==='intent'||st.phase==='select'?'Reveal everyone\'s Active Speed Dice first (Tactical Console or the chat card).':'Start the combat to begin a Speed Dice Turn.');openCombatConsole();return this;}
      try{
        if(st.phase!=='check'&&st.phase!=='resolution')await Speed.advanceToCheck(this);
        else await Speed.nextResolution(this);
      }catch(error){ui.notifications.warn(error.message);}
      return this;
    }
  };
}

/* ---------------------------------------------------------------- hooks */
export function installCombatIntegration(){
  try{game.settings.register(NS,'autoOpenCombatConsole',{name:'Open the Tactical Console automatically',hint:'Opens the Speed Dice console when the GM starts a Speed Dice Turn or a new selection round, if you have a combatant.',scope:'client',config:true,type:Boolean,default:true});}catch(_e){}

  // Live refresh for every client (the console is an ApplicationV2 window).
  for(const hook of ['updateCombatant','updateCombat','createCombatant','deleteCombatant','deleteCombat','createChatMessage'])Hooks.on(hook,()=>refreshCombatConsole());

  // Initiative + current turn follow the Speed Dice state (one GM writes).
  Hooks.on('updateCombat',(combat,changes,options)=>{
    if(options?.acSpeedSync)return;
    const stateChanged=foundry.utils.hasProperty(changes,`flags.${NS}.state`);
    if(stateChanged&&isLeader())syncTrackerWithSpeed(combat).catch(error=>console.warn('Altered Carbon | tracker sync',error));
    // Bring the console up for players when a new roll or selection phase starts.
    if(stateChanged){
      const st=stateOf(combat),phaseStart=['intent','select'].includes(st.phase)&&!st.commitmentsRevealed;
      const mine=Array.from(combat.combatants).some(c=>c.actor?.isOwner&&!game.user.isGM)||game.user.isGM;
      let auto=true;try{auto=game.settings.get(NS,'autoOpenCombatConsole');}catch(_e){}
      if(phaseStart&&mine&&auto&&combat.id===game.combat?.id)openCombatConsole();
    }
  });
  Hooks.on('updateCombatant',(combatant,changes,options)=>{
    if(options?.acSpeedSync||!isLeader())return;
    if(foundry.utils.hasProperty(changes,`flags.${NS}.speed`))syncTrackerWithSpeed(combatant.parent).catch(error=>console.warn('Altered Carbon | tracker sync',error));
  });

  // Tracker: a console button for everyone, and a Speed Dice phase line.
  Hooks.on('renderCombatTracker',(app,html)=>{
    try{
      const root=html instanceof HTMLElement?html:html?.[0];if(!root||root.querySelector('.ac-tracker-speed'))return;
      const combat=app.viewed??game.combat;
      const bar=document.createElement('div');bar.className='ac-tracker-speed';
      const st=stateOf(combat),phase=combat?(st.phase?String(st.phase).toUpperCase():'NOT STARTED'):'NO COMBAT';
      const summary=combat?Speed.publicSpeedSummary(combat):null;
      bar.innerHTML=`<button type="button" class="ac-tracker-console"><i class="fa-solid fa-dice-d6"></i> Speed Dice Console</button><span class="ac-tracker-phase">${phase}${summary&&['intent','select'].includes(st.phase)&&!st.commitmentsRevealed?` · ${summary.submitted}/${summary.total} locked`:''}</span>`;
      bar.querySelector('button').addEventListener('click',event=>{event.preventDefault();openCombatConsole();});
      const anchor=root.querySelector('.combat-tracker-header')||root.querySelector('header')||root.firstElementChild;
      if(anchor?.after)anchor.after(bar);else root.prepend(bar);
    }catch(error){console.warn('Altered Carbon | tracker button',error);}
  });

  // Speed board chat card: an "Open console" button for everyone.
  Hooks.on('renderChatMessageHTML',(message,html)=>{
    if(!message?.getFlag?.(NS,'speedBoard'))return;
    const root=html instanceof HTMLElement?html:html?.[0];const board=root?.querySelector?.('[data-ac-speed-board]');
    if(!board||board.querySelector('.ac-speed-open-console'))return;
    const b=document.createElement('button');b.type='button';b.className='ac-speed-open-console';b.innerHTML='<i class="fa-solid fa-dice-d6"></i> Open Speed Dice Console';
    b.addEventListener('click',event=>{event.preventDefault();openCombatConsole();});board.append(b);
  });
}

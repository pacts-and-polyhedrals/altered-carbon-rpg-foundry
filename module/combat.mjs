import {activeSpeedTotal,nextActiveCombatant} from './rules-engine.mjs';
const NS='altered-carbon-rpg';
export const PHASES=['intent','check','resolution'];

function speedState(c){return c.getFlag(NS,'speed')||{results:[],revealedActiveIndexes:[],spentIndexes:[],submitted:false};}
function state(combat){return combat.getFlag(NS,'state')||{};}
export function legalActiveIndexes(results,indexes=[],spent=[]){return [...new Set(indexes.map(Number))].filter(i=>Number.isInteger(i)&&i>=0&&i<results.length&&!spent.includes(i));}

export async function beginIntent(combat){
 if(!game.user.isGM)throw new Error('GM only');
 const previous=state(combat);const intentKey=foundry.utils.randomID();
 await combat.setFlag(NS,'state',{phase:'intent',turn:Number(previous.turn||0)+1,round:1,intentKey,activeCombatantId:null,commitmentsRevealed:false});
 const updates=[];
 for(const c of combat.combatants){const actor=c.actor;const count=actor?.ac?.speedDice||1;const roll=await(new Roll(`${count}d6`)).evaluate();const results=roll.dice.flatMap(d=>d.results.map(r=>r.result));updates.push({_id:c.id,flags:{[NS]:{speed:{results,revealedActiveIndexes:[],spentIndexes:[],submitted:false}}}});}
 await combat.updateEmbeddedDocuments('Combatant',updates);
 return intentKey;
}

/** Store the secret choice in a ChatMessage whispered only to GMs and the submitting user. */
export async function submitSpeedCommitment(combatant,indexes){
 const combat=combatant.parent;const cs=speedState(combatant);if(!combat)throw new Error('Combatant is not in a Combat.');if(!game.user.isGM&&!combatant.actor?.isOwner)throw new Error('Not permitted.');
 const activeIndexes=legalActiveIndexes(cs.results,indexes,cs.spentIndexes||[]);if(!activeIndexes.length)throw new Error('Choose at least one Active Speed Die.');
 const st=state(combat);const recipients=[...new Set(game.users.filter(u=>u.isGM).map(u=>u.id).concat(game.user.id))];
 await ChatMessage.implementation.create({content:`<p><strong>${foundry.utils.escapeHTML(combatant.name)}</strong> has locked an Active Speed Dice commitment.</p>`,whisper:recipients,flags:{[NS]:{speedCommitment:{combatId:combat.id,combatantId:combatant.id,intentKey:st.intentKey,activeIndexes,submittedBy:game.user.id}}}});
 if(game.user.isGM)await markSubmitted(combatant.id,combat.id);else game.socket.emit(`system.${NS}`,{type:'speedSubmitted',combatId:combat.id,combatantId:combatant.id});
 return activeSpeedTotal(cs.results,activeIndexes);
}

async function markSubmitted(combatantId,combatId){const combat=game.combats.get(combatId);if(!combat)return;const c=combat.combatants.get(combatantId);if(!c)return;const s=speedState(c);await c.setFlag(NS,'speed',{...s,submitted:true});}

export async function revealCommitments(combat){
 if(!game.user.isGM)throw new Error('GM only');const st=state(combat);const latest=new Map();
 for(const m of game.messages){const x=m.getFlag(NS,'speedCommitment');if(!x||x.combatId!==combat.id||x.intentKey!==st.intentKey)continue;latest.set(x.combatantId,x);}
 const updates=[];
 for(const c of combat.combatants){const s=speedState(c);const x=latest.get(c.id);if(!x)continue;updates.push({_id:c.id,flags:{[NS]:{speed:{...s,revealedActiveIndexes:legalActiveIndexes(s.results,x.activeIndexes,s.spentIndexes||[]),submitted:true}}}});}
 if(updates.length)await combat.updateEmbeddedDocuments('Combatant',updates);
 await combat.setFlag(NS,'state',{...st,commitmentsRevealed:true});return updates.length;
}

export async function unlockSpeedDice(combatant){if(!game.user.isGM)throw new Error('GM only');const s=speedState(combatant);await combatant.setFlag(NS,'speed',{...s,revealedActiveIndexes:[],submitted:false});}
export function chooseNext(combat){const entries=combat.combatants.map(c=>{const s=speedState(c);return{id:c.id,combatant:c,speedResults:s.results||[],activeIndexes:(s.revealedActiveIndexes||[]).filter(i=>!(s.spentIndexes||[]).includes(i))};});return nextActiveCombatant(entries)?.combatant||null;}
export async function advanceToCheck(combat){if(!game.user.isGM)throw new Error('GM only');const st=state(combat);if(!st.commitmentsRevealed)await revealCommitments(combat);const c=chooseNext(combat);await combat.setFlag(NS,'state',{...state(combat),phase:'check',activeCombatantId:c?.id||null});return c;}
export async function setResolution(combat){if(!game.user.isGM)throw new Error('GM only');await combat.setFlag(NS,'state',{...state(combat),phase:'resolution'});}
export async function resolveActiveDice(combat,combatant,indexes){if(!game.user.isGM&&!combatant.actor?.isOwner)throw new Error('Not permitted');const s=speedState(combatant);const spent=[...new Set([...(s.spentIndexes||[]),...indexes.map(Number)])];await combatant.setFlag(NS,'speed',{...s,spentIndexes:spent,revealedActiveIndexes:(s.revealedActiveIndexes||[]).filter(i=>!spent.includes(i))});}
export async function nextResolution(combat){if(!game.user.isGM)throw new Error('GM only');const c=chooseNext(combat);if(!c){return beginIntent(combat);}await combat.setFlag(NS,'state',{...state(combat),phase:'check',round:Number(state(combat).round||1)+1,activeCombatantId:c.id});return c;}

export function installSocket(){game.socket.on(`system.${NS}`,async payload=>{if(!game.user.isGM||!payload)return;if(payload.type==='speedSubmitted')await markSubmitted(payload.combatantId,payload.combatId);});}

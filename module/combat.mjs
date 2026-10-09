/** Intent > Check > Resolution Speed Dice, with private rolls and simultaneous GM reveal. */
import {activeSpeedTotal,nextActiveCombatant,speedDiceFromPerception} from './rules-engine.mjs';
import {normalizeSpeedResults,checkCommitment,speedProgress,revealReadiness,canReveal,speedBoardHTML} from './speed-dice.mjs';
const NS='altered-carbon-rpg';
export const PHASES=['intent','check','resolution'];
export const SELECTION_PHASES=['intent','select'];
const speedState=c=>c?.getFlag?.(NS,'speed')||{};
const state=combat=>combat?.getFlag?.(NS,'state')||{};
const combatants=combat=>Array.from(combat?.combatants||[]);
const id=()=>foundry.utils.randomID();
export function legalActiveIndexes(results,indexes=[],spent=[]){return [...new Set(indexes.map(Number))].filter(i=>Number.isInteger(i)&&i>=0&&i<results.length&&!spent.includes(i));}
export function countForCombatant(c){return Math.max(1,Math.min(5,Math.trunc(Number(c.actor?.ac?.speedDice)||speedDiceFromPerception(c.actor?.system?.attributes?.perception||10,c.actor?.system?.speedModifier||0))));}
export function publicSpeedSummary(combat){const st=state(combat);const entries=combatants(combat).map(c=>{const s=speedState(c);return {id:c.id,name:c.name,total:Number(s.total||0),rolled:Boolean(s.rolled),submitted:Boolean(s.submitted),spentIndexes:s.spentIndexes||[],revealedActiveIndexes:st.commitmentsRevealed?s.revealedActiveIndexes||[]:[],results:st.commitmentsRevealed?s.results||[]:[]};});return {...revealReadiness(entries),turn:st.turn,round:st.round,phase:st.phase,revealed:Boolean(st.commitmentsRevealed),entries};}
function actualRollValues(message){const roll=message?.rolls?.[0];if(!roll)return null;const dice=roll.dice||[];if(dice.some(d=>Number(d.faces)!==6))return null;return dice.flatMap(d=>(d.results||[]).filter(r=>r.active!==false).map(r=>Number(r.result)));}
function authorizedAuthor(combatant,userId){const user=game.users.get(userId);return Boolean(user&&(user.isGM||combatant.actor?.testUserPermission?.(user,'OWNER')));}
function latestPrivateMessage(combatant,type,st=state(combatant.parent)){
 const messages=Array.from(game.messages||[]);for(let i=messages.length-1;i>=0;i--){const m=messages[i],x=m.getFlag(NS,type);if(!x||x.combatId!==combatant.parent.id||x.combatantId!==combatant.id||x.intentKey!==st.intentKey)continue;if(type==='speedCommitment'&&(x.selectionKey!==st.selectionKey||x.revision!==Number(speedState(combatant).commitRevision||0)))continue;const authorId=m.author?.id||m.user?.id;if(!authorizedAuthor(combatant,authorId))continue;return {message:m,data:x,authorId};}return null;
}
export function privateRollFor(combatant){const record=latestPrivateMessage(combatant,'speedRoll');if(!record)return null;const count=Number(speedState(combatant).total);try{return {...record,results:normalizeSpeedResults(actualRollValues(record.message),count)};}catch{return null;}}
export function privateCommitmentFor(combatant){const record=latestPrivateMessage(combatant,'speedCommitment');if(!record)return null;const roll=privateRollFor(combatant);if(!roll||record.data.rollMessageId!==roll.message.id)return null;try{return {...record,indexes:checkCommitment(roll.results,record.data.activeIndexes,speedState(combatant).spentIndexes||[])};}catch{return null;}}
function requireGM(){if(!game.user?.isGM)throw new Error('Only the GM can control this phase.');}
function requireOwner(combatant){if(!game.user?.isGM&&!combatant?.actor?.isOwner)throw new Error('You do not own this combatant.');}
async function newBoard(combat){const st=state(combat);const msg=await ChatMessage.implementation.create({content:speedBoardHTML({...publicSpeedSummary(combat),combatants:publicSpeedSummary(combat).entries}),flags:{[NS]:{speedBoard:{combatId:combat.id,intentKey:st.intentKey,selectionKey:st.selectionKey}}}});await combat.setFlag(NS,'state',{...state(combat),boardMessageId:msg.id});return msg;}
export async function refreshSpeedBoard(combat){if(!game.user?.isGM||!combat)return;const st=state(combat);const message=game.messages.get(st.boardMessageId);if(!message)return;const summary=publicSpeedSummary(combat);await message.update({content:speedBoardHTML({...summary,combatants:summary.entries})});}
export async function beginIntent(combat){
 requireGM();if(!combat||!combatants(combat).length)throw new Error('Add combatants to the encounter first.');
 const prev=state(combat),intentKey=id();await combat.setFlag(NS,'state',{phase:'intent',turn:Number(prev.turn||0)+1,round:1,intentKey,selectionKey:id(),activeCombatantId:null,commitmentsRevealed:false,boardMessageId:null});
 await combat.updateEmbeddedDocuments('Combatant',combatants(combat).map(c=>({_id:c.id,flags:{[NS]:{speed:{total:countForCombatant(c),rolled:false,results:[],revealedActiveIndexes:[],spentIndexes:[],submitted:false,commitRevision:0}}}})));
 await newBoard(combat);return intentKey;
}
export async function rollPrivateSpeed(combatant){
 requireOwner(combatant);const combat=combatant?.parent,st=state(combat);if(!combat||st.phase!=='intent'||st.commitmentsRevealed)throw new Error('Private Speed Dice may only be rolled during the Intent phase.');
 if(privateRollFor(combatant))throw new Error('This combatant already rolled their Speed Dice for this turn.');
 const count=Number(speedState(combatant).total);if(!(count>=1&&count<=5))throw new Error('Start a new Intent phase first.');
 const roll=await(new Roll(`${count}d6`)).evaluate();normalizeSpeedResults(roll.dice.flatMap(d=>d.results.map(r=>r.result)),count);
 const recipients=[...new Set([...game.users.filter(u=>u.isGM).map(u=>u.id),game.user.id])];
 const message=await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor:combatant.actor}),content:`<section class="ac-chat-card ac-private-speed"><strong>${foundry.utils.escapeHTML(combatant.name)} · Private Speed Dice</strong><p>Only you and the GM may view these rolled results. Choose the Active dice in the Combat Console.</p></section>`,rolls:[roll],whisper:recipients,flags:{[NS]:{speedRoll:{combatId:combat.id,combatantId:combatant.id,intentKey:st.intentKey,count,rolledBy:game.user.id}}}});
 if(game.user.isGM)await syncPrivateProgress(combat);else game.socket.emit(`system.${NS}`,{type:'speedProgress',combatId:combat.id,intentKey:st.intentKey});return message;
}
export async function submitSpeedCommitment(combatant,indexes){
 requireOwner(combatant);const combat=combatant?.parent,st=state(combat);if(!combat||!SELECTION_PHASES.includes(st.phase)||st.commitmentsRevealed)throw new Error('Active dice can only be selected before the reveal.');
 const own=speedState(combatant);if(own.submitted||privateCommitmentFor(combatant))throw new Error('Your selection is already locked. Ask the GM to unlock it.');
 const roll=privateRollFor(combatant);if(!roll)throw new Error('Roll your Speed Dice privately before choosing Active dice.');
 const selected=checkCommitment(roll.results,indexes,own.spentIndexes||[]);
 const recipients=[...new Set([...game.users.filter(u=>u.isGM).map(u=>u.id),game.user.id])];
 await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor:combatant.actor}),content:`<section class="ac-chat-card ac-private-speed"><strong>${foundry.utils.escapeHTML(combatant.name)} · Active Dice Locked</strong><p>Private commitment recorded. GM will reveal after every combatant is ready.</p></section>`,whisper:recipients,flags:{[NS]:{speedCommitment:{combatId:combat.id,combatantId:combatant.id,intentKey:st.intentKey,selectionKey:st.selectionKey,rollMessageId:roll.message.id,activeIndexes:selected,revision:Number(own.commitRevision||0),submittedBy:game.user.id}}}});
 if(game.user.isGM)await syncPrivateProgress(combat);else game.socket.emit(`system.${NS}`,{type:'speedProgress',combatId:combat.id,intentKey:st.intentKey});
 return activeSpeedTotal(roll.results,selected);
}
/** The coordinating GM verifies private chat documents rather than trusting socket payloads. */
export async function syncPrivateProgress(combat){
 requireGM();const st=state(combat);if(!SELECTION_PHASES.includes(st.phase)||st.commitmentsRevealed)return;
 const updates=[];for(const c of combatants(combat)){const s=speedState(c),rolled=Boolean(privateRollFor(c)),submitted=speedProgress(s.total,s.spentIndexes).remaining===0||Boolean(privateCommitmentFor(c));if(Boolean(s.rolled)!==rolled||Boolean(s.submitted)!==submitted)updates.push({_id:c.id,flags:{[NS]:{speed:{...s,rolled,submitted}}}});}
 if(updates.length)await combat.updateEmbeddedDocuments('Combatant',updates);await refreshSpeedBoard(combat);
}
export async function revealCommitments(combat){
 requireGM();const st=state(combat);if(!SELECTION_PHASES.includes(st.phase)||st.commitmentsRevealed)throw new Error('No unrevealed Active Dice selection is in progress.');
 // Fail closed: only commit if all signed-in owners' private chat submissions are valid.
 const validated=combatants(combat).map(c=>({c,roll:privateRollFor(c),choice:speedProgress(speedState(c).total,speedState(c).spentIndexes).remaining===0?{indexes:[]}:privateCommitmentFor(c)}));
 if(!validated.length||validated.some(x=>!x.roll||!x.choice))throw new Error('Cannot reveal until every combatant rolls privately and locks a valid Active Dice selection.');
 await combat.updateEmbeddedDocuments('Combatant',validated.map(({c,roll,choice})=>{const s=speedState(c);return {_id:c.id,flags:{[NS]:{speed:{...s,results:roll.results,revealedActiveIndexes:choice.indexes,rolled:true,submitted:true}}}};}));
 await combat.setFlag(NS,'state',{...st,commitmentsRevealed:true});await refreshSpeedBoard(combat);return validated.length;
}
export async function unlockSpeedDice(combatant){requireGM();const st=state(combatant.parent);if(st.commitmentsRevealed)throw new Error('Already revealed. Spend dice or start the next round.');const s=speedState(combatant);await combatant.setFlag(NS,'speed',{...s,revealedActiveIndexes:[],submitted:false,commitRevision:Number(s.commitRevision||0)+1});await refreshSpeedBoard(combatant.parent);}
export function chooseNext(combat){const entries=combatants(combat).map(c=>{const s=speedState(c);return{id:c.id,combatant:c,speedResults:s.results||[],activeIndexes:(s.revealedActiveIndexes||[]).filter(i=>!(s.spentIndexes||[]).includes(i))};});return nextActiveCombatant(entries)?.combatant||null;}
export async function advanceToCheck(combat){requireGM();const st=state(combat);if(!st.commitmentsRevealed)throw new Error('The GM must reveal all locked selections before Check.');const c=chooseNext(combat);await combat.setFlag(NS,'state',{...st,phase:'check',activeCombatantId:c?.id||null});return c;}
export async function setResolution(combat){requireGM();const st=state(combat);if(st.phase!=='check')throw new Error('The Check phase must occur first.');await combat.setFlag(NS,'state',{...st,phase:'resolution'});}
export async function resolveActiveDice(combat,combatant,indexes){
 requireOwner(combatant);if(!combat||combatant.parent?.id!==combat.id)throw new Error('Invalid combatant.');const st=state(combat);if(!st.commitmentsRevealed||!['check','resolution'].includes(st.phase))throw new Error('Speed Dice may be spent only after reveal.');
 const s=speedState(combatant);const pool=checkCommitment(s.results,indexes,s.spentIndexes||[]);
 const spent=[...new Set([...(s.spentIndexes||[]),...pool])].sort((a,b)=>a-b);
 await combatant.setFlag(NS,'speed',{...s,spentIndexes:spent,revealedActiveIndexes:(s.revealedActiveIndexes||[]).filter(i=>!spent.includes(i))});await refreshSpeedBoard(combat);return speedProgress(s.total,spent,s.revealedActiveIndexes);
}
export async function startSelectionRound(combat){
 requireGM();const st=state(combat);if(!st.commitmentsRevealed||!['check','resolution'].includes(st.phase))throw new Error('Finish the current reveal first.');
 if(chooseNext(combat))throw new Error('Active dice remain; resolve them before a new selection.');
 if(!combatants(combat).some(c=>speedProgress(speedState(c).total,speedState(c).spentIndexes).remaining>0))throw new Error('No unspent Speed Dice remain. Start a new Intent/Turn.');
 await combat.setFlag(NS,'state',{...st,phase:'select',round:Number(st.round||1)+1,selectionKey:id(),commitmentsRevealed:false,activeCombatantId:null,boardMessageId:null});
 await combat.updateEmbeddedDocuments('Combatant',combatants(combat).map(c=>{const s=speedState(c);const complete=speedProgress(s.total,s.spentIndexes).remaining===0;return {_id:c.id,flags:{[NS]:{speed:{...s,results:[],revealedActiveIndexes:[],submitted:complete,rolled:true,commitRevision:0}}}};}));
 await newBoard(combat);return state(combat).round;
}
export async function nextResolution(combat){requireGM();const st=state(combat);if(!st.commitmentsRevealed)throw new Error('Waiting for Speed Dice reveal.');const c=chooseNext(combat);if(c){await combat.setFlag(NS,'state',{...st,phase:'check',activeCombatantId:c.id});return c;}const remaining=combatants(combat).some(c=>speedProgress(speedState(c).total,speedState(c).spentIndexes).remaining>0);if(remaining){await startSelectionRound(combat);return null;}await combat.setFlag(NS,'state',{...st,phase:'complete',activeCombatantId:null});return null;}
export function installSocket(){game.socket.on(`system.${NS}`,async payload=>{if(!game.user?.isGM||!payload||payload.type!=='speedProgress')return;
  // Only one GM writes cross-client progress to prevent update races.
  const leader=game.users.filter(u=>u.active&&u.isGM)[0];if(leader&&leader.id!==game.user.id)return;
  const combat=game.combats.get(payload.combatId);if(combat&&state(combat).intentKey===payload.intentKey)try{await syncPrivateProgress(combat);}catch(e){console.error('Altered Carbon | Speed Dice sync failed',e);}
});}

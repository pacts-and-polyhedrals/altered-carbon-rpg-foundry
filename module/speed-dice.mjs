/** Pure, UI-independent helpers for the 2020 Core Speed Dice procedure. */
const between=(n,low,high)=>Number.isInteger(n)&&n>=low&&n<=high;
export function normalizeSpeedResults(values,expected){
  if(!Array.isArray(values)||!between(expected,1,12)||values.length!==expected||!values.every(n=>between(Number(n),1,6)))throw new Error('Speed Dice must be the expected number of d6 results.');
  return values.map(Number);
}
export function checkCommitment(results,indexes,spent=[]){
  if(!Array.isArray(results)||!Array.isArray(indexes)||!Array.isArray(spent))throw new Error('Invalid Speed Dice selection.');
  const unique=new Set(indexes);
  if(!unique.size||unique.size!==indexes.length||!indexes.every(i=>between(i,0,results.length-1)&&!spent.includes(i)))throw new Error('Select one or more distinct, unspent Speed Dice.');
  return [...unique].sort((a,b)=>a-b);
}
export function speedProgress(total,spent=[],active=[]){
  const count=Math.max(0,Math.trunc(Number(total)||0));
  const used=new Set((spent||[]).filter(i=>between(i,0,count-1))).size;
  const committed=new Set((active||[]).filter(i=>between(i,0,count-1)&&!spent.includes(i))).size;
  return {total:count,used,remaining:count-used,active:committed,label:`${used}/${count}`};
}
export function revealReadiness(entries=[]){
  const total=entries.length;const submitted=entries.filter(x=>x.submitted===true&&x.rolled===true).length;
  return {total,submitted,ready:total>0&&submitted===total,waiting:Math.max(0,total-submitted)};
}
export function canReveal(state,entries){return ['intent','select'].includes(state?.phase)&&state?.commitmentsRevealed!==true&&revealReadiness(entries).ready;}
export function canSeePrivateDice({viewerId,rollAuthorId,gm=false,revealed=false}={}){return Boolean(revealed||gm||viewerId&&viewerId===rollAuthorId);}
export function escSpeed(text){return String(text??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
/** A public card is always opaque until explicit GM reveal, even when the server has all private roll messages. */
export function speedBoardHTML({turn,round,phase,combatants=[],revealed=false,ready=false,submitted=0,total=0}={}){
 const rows=combatants.map(c=>{
   const p=speedProgress(c.total,c.spentIndexes,c.revealedActiveIndexes);
   const rolled=c.rolled?'ROLLED':'WAITING';const locked=c.submitted?'LOCKED':'NOT LOCKED';
   const dice=revealed&&Array.isArray(c.results)?`<div class="ac-speed-board-dice" aria-label="${escSpeed(c.name)} Speed Dice">${c.results.map((v,i)=>`<span class="${c.spentIndexes?.includes(i)?'spent':c.revealedActiveIndexes?.includes(i)?'active':'reserve'}" title="Die ${i+1}">${Number(v)}</span>`).join('')}</div>`:'<span class="ac-speed-secret" aria-label="Results hidden until GM reveal">◈ PRIVATE</span>';
   return `<div class="ac-speed-board-row"><strong>${escSpeed(c.name)}</strong><span>${revealed?'REVEALED':`${rolled} / ${locked}`}</span><b aria-label="Used ${p.used} out of ${p.total} Speed Dice">USED ${p.label}</b>${dice}</div>`;
 }).join('');
 return `<section class="ac-chat-card ac-speed-board" data-ac-speed-board="true"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">SPEED DICE // ${escSpeed(String(phase||'intent').toUpperCase())}</span><strong>Turn ${Number(turn)||1} · Round ${Number(round)||1}</strong></div><span class="ac-grade-chip">${revealed?'REVEALED':ready?'READY TO REVEAL':`${submitted}/${total} LOCKED`}</span></header><p class="ac-chat-subtitle">${revealed?'Results released by the GM. Highlighted dice are Active; dark dice remain in reserve.': 'Private d6 rolls and selections are hidden. The GM reveals the set only after everyone locks their Active Dice.'}</p><div class="ac-speed-board-roster">${rows}</div>${!revealed?`<p class="ac-chat-meta">${ready?'All participants have locked their dice. GM may reveal now.':'Waiting for all participants. The GM cannot reveal early.'}</p>`:''}</section>`;
}

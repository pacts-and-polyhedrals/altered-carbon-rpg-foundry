const NS='altered-carbon-rpg';
const esc=value=>foundry?.utils?.escapeHTML?foundry.utils.escapeHTML(String(value??'')):String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

export function checkGrade(result={}){
  if(result.catastrophe)return{key:'catastrophe',className:'ac-grade-catastrophe',label:'CATASTROPHE',degrees:Math.max(1,Number(result.failureDegrees||1))};
  if(result.stroke)return{key:'stroke',className:'ac-grade-stroke',label:'STROKE OF LUCK',degrees:Math.max(1,Number(result.successDegrees||1))};
  if(result.ace)return{key:'ace',className:'ac-grade-ace',label:'ACE',degrees:Math.max(1,Number(result.successDegrees||1))};
  if(result.success){const d=clamp(result.successDegrees||1,1,5);return{key:`success-${d}`,className:`ac-grade-success ac-grade-success-${d}`,label:`SUCCESS +${d}`,degrees:d};}
  const d=clamp(result.failureDegrees||1,1,5);return{key:`failure-${d}`,className:`ac-grade-failure ac-grade-failure-${d}`,label:`FAILURE -${d}`,degrees:d};
}

export function gradePips(result={}){
  const grade=checkGrade(result),success=Boolean(result.success||result.ace||result.stroke),count=clamp(grade.degrees||1,1,5);
  return Array.from({length:5},(_,index)=>`<i class="${index<count?'active':''}" aria-hidden="true"></i>`).join('');
}

export function renderCheckCard({actorName='',skillName='',result={},contextLabel='',tags=[]}={}){
  const grade=checkGrade(result);
  const cleanTags=(tags||[]).filter(Boolean).map(esc);
  return `<section class="ac-chat-card ac-check-card ${grade.className}" data-ac-grade="${grade.key}">
    <header class="ac-chat-card-header">
      <div><span class="ac-chat-kicker">DHF CHECK${contextLabel?` · ${esc(contextLabel)}`:''}</span><strong>${esc(actorName)} — ${esc(skillName)}</strong></div>
      <span class="ac-grade-chip">${esc(grade.label)}</span>
    </header>
    <div class="ac-check-readout">
      <span><small>TARGET</small><b>${Number(result.tr??0)}</b></span>
      <span><small>RESULT</small><b>${Number(result.best??0)}</b></span>
      <span><small>DIE</small><b>d${Number(result.sides??0)}</b></span>
    </div>
    ${result.bonusDice?.length?`<p class="ac-bonus-readout"><strong>Bonus Dice:</strong> ${result.bonusDice.map(d=>`d${Number(d.sides)} = ${Number(d.result)}`).join(" / ")}</p>`:''}
    <div class="ac-degree-track" aria-label="${esc(grade.label)}">${gradePips(result)}</div>
    ${cleanTags.length?`<p class="ac-chat-tags">${cleanTags.join('<span>•</span>')}</p>`:''}
  </section>`;
}

export function renderPendingCard({title='',subtitle='',body='',meta='',actions=''}={}){
  return `<section class="ac-chat-card ac-pending-card ac-grade-pending">
    <header class="ac-chat-card-header"><div><span class="ac-chat-kicker">GM REQUEST</span><strong>${esc(title)}</strong></div><span class="ac-grade-chip">PENDING</span></header>
    ${subtitle?`<p class="ac-chat-subtitle">${esc(subtitle)}</p>`:''}
    ${body||''}
    ${meta?`<p class="ac-chat-meta">${esc(meta)}</p>`:''}
    ${actions?`<div class="ac-chat-actions">${actions}</div>`:''}
  </section>`;
}

function rootNode(html){return html instanceof HTMLElement?html:html?.[0]||null;}
function decorate(message,html){
  const root=rootNode(html);if(!root||game?.system?.id!==NS)return;
  const host=root.matches?.('.chat-message')?root:root.closest?.('.chat-message');
  host?.classList?.add('ac-chat-message');
  const hasAC=root.matches?.('.ac-chat-card')||root.querySelector?.('.ac-chat-card');
  if(hasAC)host?.classList?.add('ac-system-chat-card');
  if(message?.getFlag?.(NS,'check'))host?.classList?.add('ac-check-message');
}

export function installChatUIHooks(){
  Hooks.on('renderChatMessageHTML',decorate);
}

// Book journals (v2.7.1): the system's own journals (the one-shot GM book, the Bay City Travel
// Directory, the GM and Player guides) open in a dark teal case-file window, and their text is live:
//   @ACCheck[Skill;Skill|D|source]{label}  GM: opens GM Control with the check filled in. Players: a chip.
//   @ACMap[MAP-ID]{label}                  GM: opens that Bay City map (imported if needed); shift-click activates it.
//   @ACShow[uuid]{label}                   GM: shows a journal page (a handout) to every player.
//   @ACClock[butterfly-cut]                GM: the night's running console (hour, events, pressure points, ending).
// Imported copies have their compendium links pointed at the world copies (relinkImported).
const NS='altered-carbon-rpg';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const BOOK_SOURCES=Object.freeze(['butterfly-cut','bay-city-directory']);
export const CORE_SKILLS=Object.freeze(['Athletics','Brawl','Endurance','Melee Combat','Toughness','Detection','Directed Energy Weapons','Firearms','Search','Stealth','Throw','Diplomacy','Expression','Read Person','Composure','Discipline','Intimidation','Data Analysis','Data Engineering','Digital Networking','Investigation','Mechanics','Navigation','Pilot','Survival','Bureaucracy','Cultures','Engineering','Geography','History','Science','Medicine']);

/* ------------------------------------------------------------------ which journals */
export function isBookJournal(doc){
  const entry=doc?.documentName==='JournalEntryPage'?doc.parent:doc;
  if(entry?.documentName!=='JournalEntry')return false;
  const f=entry.flags?.[NS]||{};
  return Boolean(f.book||BOOK_SOURCES.includes(f.compendiumSource)||f.gmGuide||f.playerSheetGuide);
}
export function themeJournalElement(app,element){
  const doc=app?.document;if(!isBookJournal(doc))return false;
  const root=element?.classList?element:app?.element;if(!root?.classList)return false;
  root.classList.add('altered-carbon','ac-book-sheet','theme-dark');root.classList.remove('theme-light');
  return true;
}

/* ------------------------------------------------------------------ chips (pure HTML, tested) */
export function checkChipHTML({skills,difficulty,source='',label},{isGM=false}={}){
  const list=String(skills).split(';').map(s=>s.trim()).filter(s=>CORE_SKILLS.includes(s));const d=Math.max(0,Math.min(5,Number(difficulty)||0));
  let text=esc(label);
  if(isGM)for(const skill of list)text=text.replace(new RegExp(`\\b${esc(skill).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`),
    `<a class="ac-check-skill" data-ac-skill="${esc(skill)}" data-ac-difficulty="${d}" data-ac-source="${esc(source)}" data-tooltip="Open GM Control: ${esc(skill)}, Difficulty ${d}">${esc(skill)}</a>`);
  const icon=isGM&&list.length?`<a class="ac-check-open" data-ac-skill="${esc(list[0])}" data-ac-difficulty="${d}" data-ac-source="${esc(source)}" data-tooltip="Open GM Control" aria-label="Open GM Control for this check"><i class="fa-solid fa-satellite-dish" aria-hidden="true"></i></a>`:'<i class="fa-solid fa-dice-d20" aria-hidden="true"></i>';
  return `<span class="ac-check${isGM?' ac-check-gm':''}" data-ac-skills="${esc(list.join(';'))}" data-ac-difficulty="${d}">${icon}<span class="ac-check-label">${text}</span></span>`;
}
export function mapChipHTML({mapId,label},{isGM=false}={}){
  if(!isGM)return `<span class="ac-map-chip"><i class="fa-solid fa-map" aria-hidden="true"></i> ${esc(label)}</span>`;
  return `<a class="ac-map-chip ac-map-open" data-ac-map="${esc(mapId)}" data-tooltip="Open this map (shift-click: activate it for everyone)"><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i> ${esc(label)}</a>`;
}
export function showChipHTML({uuid,label},{isGM=false}={}){
  if(!isGM)return '';
  return `<a class="ac-show-chip" data-ac-show="${esc(uuid)}" data-tooltip="Show this to every player"><i class="fa-solid fa-eye" aria-hidden="true"></i> ${esc(label)}</a>`;
}

/* ------------------------------------------------------------------ the night console */
let story=null;
async function loadStory(){if(story)return story;const r=await fetch(`systems/${NS}/data/oneshot-butterfly-cut.json`);story=r.ok?await r.json():null;return story;}
export function defaultState(){return {hour:0,prevented:{},fired:{},pressure:{}};}
function getState(){try{return {...defaultState(),...(game.settings.get(NS,'oneshotState')||{})};}catch(_e){return defaultState();}}
async function setState(s){await game.settings.set(NS,'oneshotState',s);rerenderBooks();}
/** Pure: the ending for a set of resolved pressure points. */
export function endingFor(data,pressure={}){
  const score=data.pressure.filter(p=>pressure[p.id]).length;
  const e=data.endings.find(x=>{const [a,b]=String(x.score).split(/[–-]/).map(Number);return score>=a&&score<=(Number.isFinite(b)?b:a);});
  return {score,ending:e||null};
}
export function clockHTML(data,state,{isGM=false}={}){
  if(!data)return '<p>The one-shot data is unavailable.</p>';
  if(!isGM)return '<p class="ac-muted">GM console.</p>';
  const rows=data.clock.map((c,i)=>{
    const now=i===state.hour,done=i<state.hour,prevented=Boolean(state.prevented[i]);
    const st=prevented?'<b class="ac-clock-ok">PREVENTED</b>':done?'<b class="ac-clock-fired">HAPPENED</b>':now?'<b class="ac-clock-now">NOW</b>':'';
    return `<tr class="${now?'is-now':''}${prevented?' is-prevented':''}"><td><strong>${esc(c.hour)}</strong></td><td><strong>${esc(c.title)}.</strong> ${esc(c.event)}${c.prevent?`<br><small>Prevented if: ${esc(c.prevent)}</small>`:''}</td><td>${st}</td>
      <td class="ac-clock-actions">${c.prevent?`<button type="button" class="ac-clock-btn" data-ac-clock="prevent" data-index="${i}">${prevented?'Undo':'Prevented'}</button>`:''}</td></tr>`;}).join('');
  const {score,ending}=endingFor(data,state.pressure);
  const pressure=data.pressure.map(p=>`<label class="ac-clock-pressure"><input type="checkbox" data-ac-clock="pressure" data-id="${esc(p.id)}" ${state.pressure[p.id]?'checked':''}> <strong>${esc(p.name)}</strong> <small>${esc(p.good)}</small></label>`).join('');
  const cur=data.clock[Math.min(state.hour,data.clock.length-1)];
  return `<section class="ac-clock" data-ac-clock-root="butterfly-cut">
  <header class="ac-clock-head"><div><span class="ac-clock-kicker">NIGHT CONSOLE</span><h3>${esc(cur.hour)} · ${esc(cur.title)}</h3></div>
  <div class="ac-clock-buttons"><button type="button" class="ac-clock-btn" data-ac-clock="back" ${state.hour<=0?'disabled':''}><i class="fa-solid fa-backward-step"></i> Back</button>
  <button type="button" class="ac-clock-btn ac-clock-primary" data-ac-clock="advance" ${state.hour>=data.clock.length-1?'disabled':''}><i class="fa-solid fa-forward-step"></i> Advance one hour</button>
  <button type="button" class="ac-clock-btn" data-ac-clock="reset"><i class="fa-solid fa-rotate-left"></i> Reset</button></div></header>
  <table class="ac-clock-table"><thead><tr><th>Hour</th><th>Event</th><th>State</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  <h3 class="ac-clock-sub">Pressure points at dawn</h3><div class="ac-clock-pressures">${pressure}</div>
  <p class="ac-clock-ending"><strong>Score ${score}/5${ending?` — ${esc(ending.name)}`:''}.</strong> ${ending?esc(ending.text):''}</p></section>`;
}
/** Pure: the next state for a console action. */
export function clockReduce(state,action,{index,id,checked,length}){
  const s=structuredClone(state);
  if(action==='advance'){s.fired[s.hour+1]=!s.prevented[s.hour+1];s.hour=Math.min(length-1,s.hour+1);}
  else if(action==='back')s.hour=Math.max(0,s.hour-1);
  else if(action==='reset')return defaultState();
  else if(action==='prevent'){s.prevented[index]=!s.prevented[index];}
  else if(action==='pressure'){s.pressure[id]=Boolean(checked);}
  return s;
}
async function clockAction(action,el){
  if(!game.user.isGM)return;
  const data=await loadStory();if(!data)return;
  const state=getState(),next=clockReduce(state,action,{index:Number(el.dataset.index),id:el.dataset.id,checked:el.checked,length:data.clock.length});
  await setState(next);
  if(action==='advance'){
    const c=data.clock[next.hour],prevented=next.prevented[next.hour];
    await ChatMessage.implementation.create({speaker:{alias:'The Butterfly Cut'},whisper:game.users.filter(u=>u.isGM).map(u=>u.id),
      content:`<section class="ac-chat-card ac-book-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">NIGHT CONSOLE · ${esc(c.hour)}</span><strong>${esc(c.title)}</strong></div></header><p>${prevented?'<b>Prevented.</b> The players stopped this; describe the near miss instead.':esc(c.event)}</p></section>`});
  }
}

/* ------------------------------------------------------------------ actions */
async function openCheck({skill,difficulty=0}){
  if(!game.user?.isGM)throw new Error('Only the GM can open GM Control.');
  if(!CORE_SKILLS.includes(skill))throw new Error(`Unknown Skill: ${skill}`);
  const {ACGMPanel}=await import('./gm-tools.mjs');
  let app=foundry.applications.instances?.get?.('ac-gm-panel');
  if(app)app._rememberState?.();else app=new ACGMPanel();
  const d=Math.max(0,Math.min(5,Number(difficulty)||0));
  app._fieldState={...(app._fieldState||{}),customTitle:`${skill} Check`,customSkill:skill,customDifficulty:String(d),customBonus:'0',customBaseTR:'',customDiceCount:'0',customDie:'skill',customPrompt:`Make a ${skill} check${d?` (Difficulty ${d})`:''}.`,customNote:''};
  await app.render({force:true});
  (globalThis.requestAnimationFrame??(f=>setTimeout(f,0)))(()=>{const panel=app.element?.querySelector?.('.ac-gm-custom');if(!panel)return;panel.scrollIntoView?.({block:'center',behavior:'smooth'});panel.classList.add('ac-check-incoming');setTimeout(()=>panel.classList.remove('ac-check-incoming'),1600);});
  return app;
}
async function openMap(mapId,{activate=false}={}){
  if(!game.user?.isGM)throw new Error('Only the GM can open maps from the book.');
  const {findOrImportScene}=await import('./map-transit.mjs');
  const scene=await findOrImportScene(mapId);
  if(activate)await scene.activate();else await scene.view();
  return scene;
}
async function showToPlayers(uuid){
  if(!game.user?.isGM)throw new Error('Only the GM can show handouts.');
  const doc=await fromUuid(uuid);if(!doc)throw new Error('That page is not available.');
  const J=foundry.documents?.collections?.Journal??globalThis.Journal;
  await J.show(doc,{force:true});
  ui.notifications.info(`Shown to players: ${doc.name}`);
}
function onClick(event){
  const t=event.target;if(!t?.closest)return;
  const check=t.closest('.ac-check-skill,.ac-check-open'),map=t.closest('.ac-map-open'),show=t.closest('.ac-show-chip'),clock=t.closest('[data-ac-clock]');
  const run=(p)=>{event.preventDefault();event.stopPropagation();Promise.resolve().then(p).catch(error=>{console.error(error);ui.notifications.error(error.message);});};
  if(check)return run(()=>openCheck({skill:check.dataset.acSkill,difficulty:check.dataset.acDifficulty}));
  if(map)return run(()=>openMap(map.dataset.acMap,{activate:event.shiftKey}));
  if(show)return run(()=>showToPlayers(show.dataset.acShow));
  if(clock&&clock.tagName==='BUTTON')return run(()=>clockAction(clock.dataset.acClock,clock));
}
function onChange(event){const el=event.target?.closest?.('input[data-ac-clock]');if(el){event.stopPropagation();clockAction(el.dataset.acClock,el).catch(e=>ui.notifications.error(e.message));}}
function rerenderBooks(){for(const app of foundry.applications.instances?.values?.()??[])if(isBookJournal(app.document))app.render?.();}

/* ------------------------------------------------------------------ relinking imported copies */
/** Pure: replace compendium UUIDs with world UUIDs. map: compendium uuid → world uuid. */
export function relinkText(text,map){
  return String(text).replace(/Compendium\.altered-carbon-rpg\.[\w-]+\.(JournalEntry|Actor|Scene|Item)\.[A-Za-z0-9]{16}/g,u=>map.get(u)||u);
}
export async function relinkImported(){
  if(!game.user?.isGM)return 0;
  const map=new Map();
  for(const c of [game.journal,game.actors,game.scenes,game.items])for(const d of c.contents){const src=d.getFlag?.(NS,'installSource')||d._stats?.compendiumSource;if(src&&src.startsWith('Compendium.altered-carbon-rpg.'))map.set(src,d.uuid);}
  if(!map.size)return 0;
  let changed=0;
  for(const entry of game.journal.contents){
    if(!isBookJournal(entry))continue;
    const updates=[];
    for(const page of entry.pages){const before=page.text?.content||'';if(!before.includes('Compendium.altered-carbon-rpg.'))continue;const after=relinkText(before,map);if(after!==before)updates.push({_id:page.id,'text.content':after});}
    if(updates.length){await entry.updateEmbeddedDocuments('JournalEntryPage',updates);changed+=updates.length;}
  }
  return changed;
}

export function installBookJournals(){
  try{game.settings.register(NS,'oneshotState',{scope:'world',config:false,type:Object,default:defaultState(),onChange:()=>rerenderBooks()});}catch(_e){}
  const enrichers=CONFIG.TextEditor?.enrichers;
  const add=(id,pattern,fn)=>{if(Array.isArray(enrichers)&&!enrichers.some(e=>e.id===id))enrichers.push({id,pattern,enricher:fn});};
  const el=html=>{const s=document.createElement('span');s.innerHTML=html;return s.firstElementChild||s;};
  add('acCheck',/@ACCheck\[([^\]|]+)\|(\d)\|([A-Za-z0-9-]*)\]\{([^}]+)\}/g,m=>el(checkChipHTML({skills:m[1],difficulty:m[2],source:m[3],label:m[4]},{isGM:Boolean(game.user?.isGM)})));
  add('acMap',/@ACMap\[([A-Za-z0-9-]+)\]\{([^}]+)\}/g,m=>el(mapChipHTML({mapId:m[1],label:m[2]},{isGM:Boolean(game.user?.isGM)})));
  add('acShow',/@ACShow\[([^\]]+)\]\{([^}]+)\}/g,m=>{const h=showChipHTML({uuid:m[1],label:m[2]},{isGM:Boolean(game.user?.isGM)});return h?el(h):document.createTextNode('');});
  add('acClock',/@ACClock\[([a-z0-9-]+)\]/g,async()=>{const d=document.createElement('div');d.innerHTML=clockHTML(await loadStory(),getState(),{isGM:Boolean(game.user?.isGM)});return d.firstElementChild||d;});
  document.body?.addEventListener?.('click',onClick,true);
  document.body?.addEventListener?.('change',onChange,true);
  Hooks.on('renderApplicationV2',(app,element)=>{try{themeJournalElement(app,element);}catch(error){console.warn('Altered Carbon | book theme skipped',error);}});
}

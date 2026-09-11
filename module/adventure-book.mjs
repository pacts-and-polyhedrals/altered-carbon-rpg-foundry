/** Cold Storage 1.1.1, bundled system edition: journal-only updater and manual GM running console.
 * Uses public Foundry document APIs. Does not change existing actors or items.
 * Live Foundry/Forge QA remains required; see docs/live-qa.md.
 */
const MOD='cold-storage';
const VERSION='1.1.1';
const SYS='altered-carbon-rpg';
// Raw legacy flags remain readable even when the optional module is disabled.
const flag=(doc,key)=>doc.flags?.[MOD]?.[key];
const settingsScope=key=>game.modules?.get(MOD)?.active&&game.settings.settings?.has(`${MOD}.${key}`)?[MOD,key]:[SYS,`coldStorage${key[0].toUpperCase()}${key.slice(1)}`];
const getSetting=key=>game.settings.get(...settingsScope(key));
const setSetting=(key,value)=>game.settings.set(...settingsScope(key),value);
const sid=doc=>flag(doc,'sourceId');
const esc=value=>foundry.utils.escapeHTML(String(value??''));
const clone=value=>foundry.utils.deepClone(value);
const gm=()=>{if(!game.user?.isGM)throw new Error('Only a GM may modify the Cold Storage book.');};
const values=collection=>collection?.contents??Array.from(collection??[]);
let pendingImport=null;
async function read(name){const response=await fetch(`systems/${SYS}/data/cold-storage/${name}`);if(!response.ok)throw new Error(`Cannot load Cold Storage ${name}: ${response.status}`);return response.json();}
async function folder(name,type,parent=null){const parentId=parent?.id??null;let f=game.folders.find(x=>x.name===name&&x.type===type&&(x.folder?.id??x.folder??null)===parentId);if(!f)f=await Folder.create({name,type,folder:parentId,sorting:'a'});return f;}
function lockedOwnership(){const out={default:0};for(const u of game.users)if(!u.isGM)out[u.id]=0;return out;}
function pageInheritance(){const out={default:-1};for(const u of game.users)if(!u.isGM)out[u.id]=-1;return out;}
function hash(text){let n=2166136261;for(let i=0;i<text.length;i++){n^=text.charCodeAt(i);n=Math.imul(n,16777619);}return(n>>>0).toString(16);}
function managedPage(journal){return values(journal.pages).find(p=>flag(p,'managedPage'))??values(journal.pages)[0];}
function content(entry,docs){return `<article class="cs-book-journal">${entry.body.replace(/\[\[([A-Z][A-Z0-9-]*)(?:\|([^\]]+))?\]\]/g,(_,id,label)=>{const doc=docs.get(id);if(!doc)throw new Error(`Unresolved journal target ${entry.id} -> ${id}`);return `@UUID[JournalEntry.${doc.id}]{${label??doc.name}}`;})}</article>`;}
async function backup(journal,recoveryFolder){
 const original=values(journal.pages).map(p=>p.toObject());
 if(!original.length)return;
 const key=`REC-${sid(journal)}-${hash(JSON.stringify(original))}`;
 if(game.journal.find(j=>sid(j)===key))return;
 const pages=original.map(p=>{const c=clone(p);delete c._id;delete c._stats;c.ownership=lockedOwnership();return c;});
 await JournalEntry.create({name:`Recovery - ${journal.name} - ${new Date().toISOString().slice(0,19).replace('T',' ')}`,folder:recoveryFolder.id,ownership:lockedOwnership(),pages,flags:{[MOD]:{sourceId:key,recoveredFrom:sid(journal),bookCategory:'recovery',recoveryAt:new Date().toISOString()}}});
}
function referenceEntries(factions,revelations){
 const refs=factions.map(f=>({id:f.id,title:`Faction - ${f.name}`,category:'reference',visibility:'gm',body:`<h1>${esc(f.name)}</h1><h2>Public face</h2><p>${esc(f.public)}</p><h2>Objective</h2><p>${esc(f.goal)}</p><h2>GM secret</h2><p>${esc(f.secret)}</p>`}));
 refs.push(...revelations.map(r=>({id:r.id,title:`Revelation - ${r.revelation}`,category:'reference',visibility:'gm',body:`<h1>${esc(r.revelation)}</h1><p>Essential: ${r.essential?'Yes':'No; personal spotlight, never a character-dependent gate.'}</p><ul>${r.clues.map(c=>`<li><strong>${esc(c.channel)}:</strong> ${esc(c.source)}</li>`).join('')}</ul><p>[[G06|Full evidence docket and independent proof pillars]]</p>`})));
 refs.push({id:'ADVENTURE-GUIDE',title:'Cold Storage - Running Guide',category:'reference',visibility:'gm',body:'<h1>Cold Storage: The Faces We Left Behind</h1><p>[[G00|Start here: exact four-, five- and six-hour running schedules]]</p><p>[[G06|Evidence docket]] / [[G07|Heat and Renewal]] / [[G04|Fray]] / [[G28|Emergency answers]]</p><p>This replaces the abbreviated v1.0.0 outline. The complete adventure is in the numbered GM chapters.</p>'});
 return refs;
}
export async function bindBookScenes(){
 gm();const map={'SCENE-LANDING':'G00','SCENE-WARD':'G08','SCENE-BREACH':'G09','SCENE-RAINLINE':'G10','SCENE-SAFEHOUSE':'G14','SCENE-VIRTUAL':'G15','SCENE-CORE':'G19','SCENE-EPILOGUE':'G23'};
 for(const scene of game.scenes){const target=map[sid(scene)];if(!target||scene.journal)continue;const j=game.journal.find(x=>sid(x)===target);if(j)await scene.update({journal:j.id});}
}
async function importImpl({notify=true}={}){
 const [base,factions,revelations]=await Promise.all(['journals.json','factions.json','revelations.json'].map(read));
 const entries=[...base,...referenceEntries(factions,revelations)];
 const allowedCategories=new Set(['gm','primer','personal','handout','reference']);
 for(const e of entries)if(!allowedCategories.has(e.category)||typeof e.body!=='string')throw new Error(`Invalid journal entry ${e.id}. Import aborted.`);
 const ids=new Set(entries.map(e=>e.id));if(ids.size!==entries.length)throw new Error('Duplicate book source IDs. Import aborted.');
 for(const entry of entries)for(const m of entry.body.matchAll(/\[\[([A-Z][A-Z0-9-]*)(?:\|[^\]]+)?\]\]/g))if(!ids.has(m[1]))throw new Error(`Missing source target ${m[1]}. Import aborted.`);
 const root=await folder('Cold Storage','JournalEntry');
 const names={gm:'01 - GM Adventure Book',primer:'02 - Player Briefing',personal:'03 - Private Character Cards',handout:'04 - Evidence - Reveal Individually',reference:'05 - GM Reference',recovery:'99 - GM Recovery Copies'};
 const folders={};for(const [k,v] of Object.entries(names))folders[k]=await folder(v,'JournalEntry',root);
 const docs=new Map();let created=0,updated=0;
 // Allocate all IDs before replacing any content, so every internal UUID resolves.
 for(const entry of entries){
  let doc=game.journal.find(j=>sid(j)===entry.id);
  if(!doc){doc=await JournalEntry.create({name:`${entry.id} - ${entry.title}`,folder:folders[entry.category].id,ownership:lockedOwnership(),pages:[],flags:{[MOD]:{sourceId:entry.id}}});created++;}
  docs.set(entry.id,doc);
 }
 for(const entry of entries){
  const doc=docs.get(entry.id),html=content(entry,docs),page=managedPage(doc);
  if(page&&page.text?.content!==html){await backup(doc,folders.recovery);updated++;}
  // Preserve explicit disclosure only for an already migrated personal card/handout.
  const mayPreserve=['personal','handout'].includes(entry.category)&&flag(doc,'bookCategory')===entry.category&&flag(doc,'bookVersion');
  const ownership=entry.visibility==='public'?{...pageInheritance(),default:2}:mayPreserve?clone(doc.ownership):lockedOwnership();
  if(entry.visibility==='public')for(const u of game.users)if(!u.isGM)ownership[u.id]=2;
  await doc.update({name:`${entry.id} - ${entry.title}`,folder:folders[entry.category].id,sort:(entry.order??1000)*100000,ownership,[`flags.${MOD}.sourceId`]:entry.id,[`flags.${MOD}.bookVersion`]:VERSION,[`flags.${MOD}.bookCategory`]:entry.category,[`flags.${MOD}.visibility`]:entry.visibility,[`flags.${MOD}.pcId`]:entry.pcId??null});
  if(page)await page.update({name:entry.title,type:'text','text.content':html,'text.format':1,ownership:pageInheritance(),[`flags.${MOD}.managedPage`]:true,[`flags.${MOD}.contentHash`]:hash(html)});
  else await doc.createEmbeddedDocuments('JournalEntryPage',[{name:entry.title,type:'text',text:{content:html,format:1},ownership:pageInheritance(),flags:{[MOD]:{managedPage:true,contentHash:hash(html)}}}]);
  // Additional user pages are preserved; GM-only chapters cannot retain stale page grants.
  if(entry.visibility==='gm'&&!mayPreserve)for(const extra of values(doc.pages))if(extra.id!==page?.id)await extra.update({ownership:pageInheritance()});
 }
 await bindBookScenes();
 await setSetting('bookVersion',VERSION);
 const result={created,updated,journals:entries.length,bookJournals:base.length};
 if(notify)ui.notifications.info(`Cold Storage book ready: ${base.length} book entries plus ${entries.length-base.length} references. Existing PCs, items and relationships were not changed.`);
 return result;
}
export async function importAdventureBook(options={}){
 gm();if(pendingImport)return pendingImport;
 pendingImport=importImpl(options).finally(()=>{pendingImport=null;});return pendingImport;
}
export async function revealBookEntry(sourceId,recipients){
 gm();const doc=game.journal.find(j=>sid(j)===sourceId);if(!doc)throw new Error('Import the book first.');
 const category=flag(doc,'bookCategory');if(!['handout','personal'].includes(category))throw new Error('Only evidence props and private character cards can be revealed from this console.');
 if(recipients==='everyone'&&category==='personal')throw new Error('Private character cards require explicit individual recipients.');
 const users=recipients==='everyone'?game.users.filter(u=>!u.isGM):game.users.filter(u=>!u.isGM&&Array.isArray(recipients)&&recipients.includes(u.id));
 if(!users.length)throw new Error('Choose at least one player recipient.');
 const ownership=clone(doc.ownership??{default:0});for(const u of users)ownership[u.id]=2;
 await doc.update({ownership,[`flags.${MOD}.bookRevealed`]:true});
 for(const p of values(doc.pages))await p.update({ownership:pageInheritance()});
 ui.notifications.info(`${doc.name} is now visible to ${users.map(u=>u.name).join(', ')}.`);
 return doc;
}
export const DEFAULT_STATE={heat:1,renewal:0,proof:0,control:0,people:0,fray:{}};
export async function changeBookCounter(key,delta,pcId=null){
 gm();if(!Number.isInteger(delta)||Math.abs(delta)>6)throw new Error('Invalid counter adjustment.');
 const state={...clone(DEFAULT_STATE),...clone(getSetting('bookState')??{})};state.fray??={};
 if(key==='fray'){
  if(!/^PC0[1-8]$/.test(pcId??''))throw new Error('Invalid pregen ID.');
  state.fray[pcId]=Math.max(0,Math.min(6,(state.fray[pcId]??3)+delta));
 }else{
  const caps={heat:6,renewal:4,proof:2,control:2,people:2};if(!(key in caps))throw new Error('Unknown counter.');
  state[key]=Math.max(0,Math.min(caps[key],state[key]+delta));
 }
 await setSetting('bookState',state);return state;
}
export class ColdStorageBookConsole extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
 static DEFAULT_OPTIONS={id:'cold-storage-book',window:{title:'Cold Storage - GM Book Console'},position:{width:980,height:800},actions:{importBook:this._importBook,open:this._open,reveal:this._reveal,count:this._count}};
 static PARTS={main:{template:'systems/altered-carbon-rpg/templates/adventure-book.hbs'}};
 async _prepareContext(options){
  gm();const context=await super._prepareContext(options);const index=await read('book-index.json');
  const state={...clone(DEFAULT_STATE),...clone(getSetting('bookState')??{})};
  const active=new Set(game.modules?.get(MOD)?.active?game.settings.get(MOD,'activePregens')??[]:game.actors.filter(a=>/^PC0[1-8]$/.test(sid(a)??'')&&flag(a,'selectionState')!=='reserve').map(sid));
  const users=game.users.filter(u=>!u.isGM).map(u=>({id:u.id,name:u.name}));
  const entries=index.chapters.map(x=>({...x,available:!!game.journal.find(j=>sid(j)===x.id)}));
  return {...context,state,users,wordCount:index.wordCount,chapters:entries.filter(x=>x.category==='gm'),handouts:entries.filter(x=>x.category==='handout'),cards:entries.filter(x=>x.category==='personal'),pcs:game.actors.filter(a=>active.has(sid(a))).map(a=>({id:sid(a),name:a.name,fray:state.fray?.[sid(a)]??3})),counters:[['heat','Heat',6],['renewal','Renewal',4],['proof','Proof',2],['control','Control',2],['people','People',2]].map(([key,label,max])=>({key,label,max,value:state[key]}))};
 }
 static async _importBook(){try{await importAdventureBook();await this.render({force:true});}catch(e){console.error(e);ui.notifications.error(e.message);}}
 static async _open(event,target){const doc=game.journal.find(j=>sid(j)===target.dataset.source);if(doc)doc.sheet.render({force:true});else ui.notifications.warn('Import the book first.');}
 static async _reveal(event,target){
  const id=target.dataset.source,recipient=this.element.querySelector(`[data-recipient-for="${id}"]`)?.value;
  if(!recipient)return ui.notifications.warn('Select the intended recipient.');
  const doc=game.journal.find(j=>sid(j)===id);if(!doc)return ui.notifications.warn('Import the book first.');
  const accepted=await foundry.applications.api.DialogV2.confirm({window:{title:'Reveal this entry?'},content:`<p>Grant read access to <strong>${esc(doc.name)}</strong> for ${recipient==='everyone'?'all current players':esc(game.users.get(recipient)?.name)}?</p><p>This may contain late-game evidence. It does not reveal any GM chapter.</p>`,rejectClose:false});
  if(!accepted)return;try{await revealBookEntry(id,recipient==='everyone'?'everyone':[recipient]);}catch(e){ui.notifications.error(e.message);}
 }
 static async _count(event,target){try{await changeBookCounter(target.dataset.key,Number(target.dataset.delta),target.dataset.pc??null);await this.render({force:true});}catch(e){ui.notifications.error(e.message);}}
}
export function registerBook(){
 game.settings.register(SYS,'coldStorageBookVersion',{scope:'world',config:false,type:String,default:''});
 game.settings.register(SYS,'coldStorageBookState',{scope:'world',config:false,type:Object,default:clone(DEFAULT_STATE)});
 game.settings.registerMenu(SYS,'coldStorageBook',{name:'Cold Storage Adventure Book',label:'Open GM Book Console',hint:'Complete adventure, controlled handouts and manual Heat, Renewal and Fray counters.',icon:'fa-solid fa-book-open',type:ColdStorageBookConsole,restricted:true});
}
export function bookAPI(){return {importBook:importAdventureBook,openBook:()=>{gm();return new ColdStorageBookConsole().render({force:true});},revealBookEntry,changeBookCounter};}

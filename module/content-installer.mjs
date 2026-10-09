// Content Installer (v2.4.3): checks for system/module updates and installs or refreshes
// the system's compendium content in the current world. An optional tick box removes
// the previous versions of that content first so nothing is duplicated.
//
// Foundry only installs, updates or uninstalls packages from the Setup screen (or the
// Forge's Bazaar), never from inside a running world. This window therefore reports
// what is out of date and offers "Return to Setup"; it never touches package files.
import {applyEmblems} from './emblems.mjs';

const NS='altered-carbon-rpg';
const esc=value=>foundry.utils.escapeHTML(String(value??''));
const STABLE_MANIFEST=`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json`;
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;

function isNewer(latest,current){return foundry.utils.isNewerVersion(String(latest||'0'),String(current||'0'));}
async function fetchManifestVersion(urls){
  for(const url of urls.filter(Boolean)){
    try{const r=await fetch(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store'});if(!r.ok)continue;const data=await r.json();if(data?.version)return {version:String(data.version),url};}catch(_error){/* CORS or offline: try next */}
  }
  return null;
}
function relatedModules(){
  return game.modules.filter(m=>m.id.includes('altered-carbon')||m.relationships?.systems?.some?.(s=>s.id===NS)||m.relationships?.requires?.some?.(r=>r.id===NS));
}
function sourceOf(doc){return String(doc?._stats?.compendiumSource||doc?.flags?.core?.sourceId||doc?.getFlag?.(NS,'installSource')||'');}
function inFolderTree(doc,predicate){let f=doc.folder;while(f){if(predicate(f))return true;f=f.folder;}return false;}

/** World documents that belong to earlier installs of this system's content. */
export function previousContent({library=true,adventure=false}={}){
  const out={Item:[],Actor:[],JournalEntry:[]};
  const fromSystem=doc=>sourceOf(doc).startsWith(`Compendium.${NS}.`)||Boolean(doc.getFlag?.(NS,'installSource'));
  if(library){
    for(const item of game.items){
      if(fromSystem(item)||item.getFlag(NS,'coreCatalog')||inFolderTree(item,f=>f.name.startsWith('Altered Carbon — ')))out.Item.push(item);
    }
    for(const actor of game.actors){
      if(['character','ai'].includes(actor.type))continue; // never remove player characters
      if(fromSystem(actor)||actor.getFlag(NS,'coreCatalogId')||(['vehicle','threat'].includes(actor.type)&&inFolderTree(actor,f=>f.name.startsWith('Altered Carbon — '))))out.Actor.push(actor);
    }
    for(const journal of game.journal){
      if(fromSystem(journal)||journal.getFlag(NS,'gmGuide'))out.JournalEntry.push(journal);
    }
  }
  if(adventure){
    for(const journal of game.journal){
      if(out.JournalEntry.includes(journal))continue;
      if(journal.getFlag(NS,'sourceId')||inFolderTree(journal,f=>f.name==='Cold Storage'))out.JournalEntry.push(journal);
    }
  }
  return out;
}

async function ensureFolder(name,type,color){
  let folder=game.folders.find(f=>f.type===type&&f.name===name&&!f.folder);
  if(!folder)folder=await Folder.implementation.create({name,type,color,sorting:'a'});
  return folder;
}

/** Import every document from the chosen system compendiums that is not already in the world. */
export async function installCompendiumContent({packIds=null}={}){
  if(!game.user.isGM)throw new Error('Only a GM can install content.');
  const packs=game.packs.filter(p=>p.metadata.packageName===NS&&(!packIds||packIds.includes(p.collection)));
  const report=[];
  for(const pack of packs){
    const type=pack.documentName,collection=game.collections.get(type);if(!collection)continue;
    const docs=await pack.getDocuments();
    const already=new Set(collection.contents.map(sourceOf).filter(Boolean));
    const missing=docs.filter(doc=>!already.has(doc.uuid));
    if(!missing.length){report.push({label:pack.metadata.label,created:0,present:docs.length});continue;}
    const folder=await ensureFolder(`Altered Carbon — ${pack.metadata.label}`,type,'#32c7d6');
    const data=missing.map(doc=>{
      const d=collection.fromCompendium(doc,{clearFolder:true});
      d.folder=folder.id;
      foundry.utils.setProperty(d,`flags.${NS}.installSource`,doc.uuid);
      foundry.utils.setProperty(d,`flags.${NS}.installedVersion`,game.system.version);
      return d;
    });
    const cls=getDocumentClass(type);
    const created=[];
    for(let i=0;i<data.length;i+=50)created.push(...await cls.createDocuments(data.slice(i,i+50)));
    report.push({label:pack.metadata.label,created:created.length,present:docs.length-missing.length});
  }
  return report;
}

async function removeDocuments(groups){
  let removed=0;
  for(const [type,docs] of Object.entries(groups)){
    if(!docs.length)continue;const cls=getDocumentClass(type),ids=docs.map(d=>d.id);
    for(let i=0;i<ids.length;i+=100){await cls.deleteDocuments(ids.slice(i,i+100));}
    removed+=ids.length;
  }
  // Tidy folders this system created that are now empty.
  const empty=game.folders.filter(f=>(f.name.startsWith('Altered Carbon — ')||f.name==='Cold Storage')&&!f.contents.length&&!f.children?.length);
  if(empty.length)await Folder.implementation.deleteDocuments(empty.map(f=>f.id));
  return removed;
}

export class ACContentInstaller extends HandlebarsApplicationMixin(ApplicationV2){
  static DEFAULT_OPTIONS={id:'ac-content-installer',classes:['altered-carbon','ac-content-installer'],window:{title:'Altered Carbon — Install / Update Content',icon:'fa-solid fa-download'},position:{width:720,height:'auto'},
    actions:{checkUpdates:this._checkUpdates,install:this._install,returnToSetup:this._returnToSetup,copyManifest:this._copyManifest}};
  static PARTS={main:{template:`systems/${NS}/templates/content-installer.hbs`}};
  _latest=null;_moduleLatest={};_checked=false;
  async _prepareContext(options){
    if(!game.user.isGM)throw new Error('GM only.');
    const context=await super._prepareContext(options);
    const packs=game.packs.filter(p=>p.metadata.packageName===NS).map(p=>({id:p.collection,label:p.metadata.label,type:p.documentName,count:p.index?.size??0}));
    const prev=previousContent({library:true,adventure:true}),prevLib=previousContent({library:true});
    const modules=relatedModules().map(m=>({id:m.id,title:m.title,version:m.version,active:m.active,latest:this._moduleLatest[m.id]?.version||'',outdated:isNewer(this._moduleLatest[m.id]?.version,m.version)}));
    const latest=this._latest?.version||'';
    return {...context,version:game.system.version,latest,checked:this._checked,outdated:isNewer(latest,game.system.version),upToDate:this._checked&&latest&&!isNewer(latest,game.system.version),
      manifest:game.system.manifest||STABLE_MANIFEST,modules,packs,
      previousCount:Object.values(prevLib).reduce((n,a)=>n+a.length,0),
      adventureCount:prev.JournalEntry.length-prevLib.JournalEntry.length,
      anyOutdated:isNewer(latest,game.system.version)||modules.some(m=>m.outdated),isForge:typeof ForgeVTT!=='undefined'&&ForgeVTT?.usingTheForge};
  }
  async _onFirstRender(context,options){await super._onFirstRender?.(context,options);if(!this._checked)ACContentInstaller._checkUpdates.call(this);}
  static async _checkUpdates(){
    this._latest=await fetchManifestVersion([STABLE_MANIFEST,game.system.manifest]);
    for(const m of relatedModules())this._moduleLatest[m.id]=await fetchManifestVersion([m.manifest]);
    this._checked=true;this.render({force:true});
  }
  static async _copyManifest(){
    const url=game.system.manifest||STABLE_MANIFEST;
    try{await navigator.clipboard.writeText(url);ui.notifications.info('Manifest URL copied.');}catch(_e){ui.notifications.info(url,{permanent:true});}
  }
  static async _returnToSetup(){
    const ok=await foundry.applications.api.DialogV2.confirm({window:{title:'Return to Setup?'},content:`<p>This closes the world for everyone so you can update or reinstall packages.</p><p>On the Setup screen: <b>Game Systems → Altered Carbon RPG → Update</b> (and the same for any related modules under <b>Add-on Modules</b>). ${typeof ForgeVTT!=='undefined'?'On the Forge you can also update from the Bazaar / “My Foundry” page.':''}</p><p>If an update will not install, tick <b>Uninstall</b> on the old version first, then install again from the manifest URL. Worlds are not deleted.</p>`});
    if(!ok)return;
    if(typeof game.shutDown==='function')return game.shutDown();
    window.location.href=foundry.utils.getRoute('setup');
  }
  static async _install(event,target){
    const root=this.element,checked=name=>Boolean(root.querySelector(`[name="${name}"]`)?.checked);
    const packIds=[...root.querySelectorAll('input[name="pack"]:checked')].map(el=>el.value);
    const doInstall=checked('installContent'),doRemove=checked('removePrevious'),doAdventure=checked('removeAdventure'),doEmblems=checked('applyEmblems');
    if(!doInstall&&!doRemove&&!doEmblems)return ui.notifications.warn('Tick at least one option.');
    target.disabled=true;
    try{
      let removed=0;
      if(doRemove){
        const groups=previousContent({library:true,adventure:doAdventure});
        const total=Object.values(groups).reduce((n,a)=>n+a.length,0);
        if(total){
          const list=Object.entries(groups).filter(([,a])=>a.length).map(([t,a])=>`<li><b>${a.length}</b> ${esc(t==='JournalEntry'?'Journal entries':t+'s')}: ${esc(a.slice(0,8).map(d=>d.name).join(', '))}${a.length>8?' …':''}</li>`).join('');
          const ok=await foundry.applications.api.DialogV2.confirm({window:{title:'Remove previous Altered Carbon content?'},content:`<p>These world documents came from earlier versions of the system and will be <b>deleted</b> before the fresh copies are installed:</p><ul>${list}</ul><p>Player characters and AI characters are never removed. Items already on characters are untouched. ${doAdventure?'<b>Adventure Book journals are included — any notes you wrote in them will be lost.</b>':''}</p><p>Back up the world first if you have edited any of these.</p>`});
          if(!ok){target.disabled=false;return;}
          removed=await removeDocuments(groups);
        }
      }
      const report=doInstall?await installCompendiumContent({packIds}):[];
      const emblems=doEmblems?await applyEmblems():0;
      const rows=report.map(r=>`<li>${esc(r.label)}: ${r.created} installed${r.present?`, ${r.present} already present`:''}</li>`).join('');
      await ChatMessage.implementation.create({speaker:{alias:'Content Installer'},whisper:game.users.filter(u=>u.isGM).map(u=>u.id),content:`<section class="ac-chat-card ac-status-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">CONTENT INSTALLER · v${esc(game.system.version)}</span><strong>World content updated</strong></div></header>${doRemove?`<p>Removed ${removed} previous document(s).</p>`:''}${rows?`<ul>${rows}</ul>`:''}${doEmblems?`<p>Emblems applied to ${Number(emblems)||0} document(s).</p>`:''}</section>`});
      ui.notifications.info('Altered Carbon content is up to date in this world.');
    }catch(error){console.error('Altered Carbon | Content install failed',error);ui.notifications.error(`Content install failed: ${error.message}`);}
    finally{target.disabled=false;this.render({force:true});}
  }
}

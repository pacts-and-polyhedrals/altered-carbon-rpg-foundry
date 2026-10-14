// One-shots shipped with the system (v2.7.0): The Butterfly Cut.
// setUpOneShot() imports the GM book and the characters, then placePins() puts a case pin on every
// Bay City map in the world: one per place, opening that place's page in the GM book. Street maps
// get a pin on each building entrance as well as one for the street itself. Scenes imported later
// are pinned automatically once the one-shot has been set up.
const NS='altered-carbon-rpg';
export const ONESHOTS=Object.freeze({
  'butterfly-cut':{title:'The Butterfly Cut',journal:`${NS}.oneshot-butterfly-journal`,actors:`${NS}.oneshot-butterfly-actors`,data:'oneshot-butterfly-cut.json'}
});
const PIN_ART=thread=>`systems/${NS}/assets/oneshot/butterfly-cut/pin-${thread}.svg`;

/* ------------------------------------------------------------------ pure helpers */
const centre=r=>[r[0]+r[2]/2,r[1]+r[3]/2];
/** Map id of a Bay City scene (street atlas or building/place map), or null. */
export function sceneMapId(scene){const f=scene?.flags?.[NS]||{};return f.streetAtlas?.id||f.bayCityMap?.id||null;}
/**
 * Pins for one map: [{place, x, y, label}]. The map's own place sits in its named zone; a street map
 * adds one pin per place reached through a door (at the first door rect for that place).
 */
export function pinsForMap(mapId,maps,places,grid=100){
  const m=maps.get(mapId);if(!m)return [];
  const byId=new Map(places.map(p=>[p.id,p])),out=[];
  const own=byId.get(mapId);
  if(own){const z=(m.zones||[]).find(z=>z.name===own.zone)||m.zones?.[0];if(z){const [x,y]=centre(z.rect);out.push({place:own.id,x,y,label:own.name,thread:own.thread});}}
  const seen=new Set([mapId]);
  for(const l of m.links||[]){
    if(l.kind!=='door'||seen.has(l.to)||!byId.has(l.to))continue;seen.add(l.to);
    const p=byId.get(l.to),block=String(l.at||'').split(' · ')[0];
    // On the building's own block (named after it), so the pin never covers the road or the exit strip.
    const z=(m.zones||[]).find(z=>z.name===block)||(m.zones||[]).find(z=>z.name===p.name);
    const [x,y]=z?centre(z.rect):centre(l.rect);
    out.push({place:p.id,x,y,label:p.name,thread:p.thread});
  }
  return out;
}
/** Index world journal pages by the place id stored on them. */
export function pageIndex(entries,tag='butterfly-cut'){
  const idx=new Map();
  for(const e of entries){
    if((e.flags?.[NS]?.compendiumSource||e.getFlag?.(NS,'compendiumSource'))!==tag)continue;
    for(const p of e.pages?.contents??e.pages??[]){const id=p.flags?.[NS]?.oneshotPlace;if(id&&!idx.has(id))idx.set(id,{entryId:e.id,pageId:p.id});}
  }
  return idx;
}

/* ------------------------------------------------------------------ data */
let cache=null;
async function loadData(){
  if(cache)return cache;
  const get=async f=>{const r=await fetch(`systems/${NS}/data/${f}`);if(!r.ok)throw new Error(`Missing ${f}`);return r.json();};
  const [story,streets,interiors,places]=await Promise.all([get(ONESHOTS['butterfly-cut'].data),get('bay-city-street-atlas.json'),get('bay-city-maps.json'),get('bay-city-places.json')]);
  const maps=new Map([...streets.maps,...interiors.maps,...places.maps].map(m=>[m.id,m]));
  cache={story,maps};return cache;
}
function levelOf(scene){
  if(scene?.levels===undefined)return null;const lv=scene.initialLevel;if(typeof lv==='string'&&lv)return lv;if(lv?.id)return lv.id;
  const first=(scene.levels?.contents??[])[0];return first?.id??null;
}

/* ------------------------------------------------------------------ GM actions */
export async function placePins(scenes=game.scenes.contents,{notify=true}={}){
  if(!game.user.isGM)throw new Error('Only a GM can place case pins.');
  const {story,maps}=await loadData();
  let idx=pageIndex(game.journal.contents);
  if(!idx.size){await importOneShot({actors:false});idx=pageIndex(game.journal.contents);}
  if(!idx.size)throw new Error('The Butterfly Cut GM book could not be found or imported.');
  let placed=0;
  for(const scene of scenes){
    const mapId=sceneMapId(scene);if(!mapId)continue;
    const have=new Set(scene.notes.filter(n=>n.getFlag(NS,'oneshotPin')==='butterfly-cut').map(n=>n.getFlag(NS,'place')));
    const level=levelOf(scene),g=scene.grid?.size||100;
    const add=pinsForMap(mapId,maps,story.places,g).filter(p=>!have.has(p.place)&&idx.has(p.place)).map(p=>{
      const {entryId,pageId}=idx.get(p.place);
      const d={entryId,pageId,x:Math.round(p.x),y:Math.round(p.y),texture:{src:PIN_ART(p.thread)},iconSize:Math.max(40,Math.round(g*0.7)),text:p.label,fontSize:Math.max(24,Math.round(g*0.32)),textAnchor:1,
        global:false,flags:{[NS]:{oneshotPin:'butterfly-cut',place:p.place}}};
      if(level)d.level=level;return d;});
    if(add.length){await scene.createEmbeddedDocuments('Note',add);placed+=add.length;}
  }
  await game.settings.set(NS,'oneshotPins',true).catch(()=>null);
  if(notify)ui.notifications.info(`The Butterfly Cut: placed ${placed} case pin(s).`);
  return placed;
}
export async function removePins({notify=true}={}){
  if(!game.user.isGM)throw new Error('Only a GM can remove case pins.');
  let removed=0;
  for(const scene of game.scenes){const ids=scene.notes.filter(n=>n.getFlag(NS,'oneshotPin')==='butterfly-cut').map(n=>n.id);if(ids.length){await scene.deleteEmbeddedDocuments('Note',ids);removed+=ids.length;}}
  await game.settings.set(NS,'oneshotPins',false).catch(()=>null);
  if(notify)ui.notifications.info(`The Butterfly Cut: removed ${removed} case pin(s).`);
  return removed;
}
/** Import the GM book (and, optionally, the characters) into world folders. */
export async function importOneShot({actors=true}={}){
  const {installCompendiumContent}=await import('./content-installer.mjs');
  const o=ONESHOTS['butterfly-cut'];
  return installCompendiumContent({packIds:[o.journal,...(actors?[o.actors]:[])]});
}
/** One click: GM book, characters, and pins on every Bay City map in the world. */
export async function setUpOneShot(){
  if(!game.user.isGM)throw new Error('Only a GM can set up a one-shot.');
  const report=await importOneShot({actors:true});
  const pins=await placePins(game.scenes.contents,{notify:false});
  const start=game.journal.find(e=>e.getFlag(NS,'compendiumSource')==='butterfly-cut'&&e.name.includes('00 Start Here'));
  ui.notifications.info(`The Butterfly Cut is ready: ${report.reduce((n,r)=>n+r.created,0)} documents imported, ${pins} case pins placed.`);
  start?.sheet?.render(true);
  return {report,pins};
}

export function installOneShots(){
  try{game.settings.register(NS,'oneshotPins',{scope:'world',config:false,type:Boolean,default:false});}catch(_e){}
  // Bay City maps imported after set-up (by travel or by hand) get their pins too.
  Hooks.on('createScene',(scene,options,userId)=>{
    if(userId!==game.user.id||!game.user.isGM)return;
    let on=false;try{on=game.settings.get(NS,'oneshotPins');}catch(_e){}
    if(on&&sceneMapId(scene))setTimeout(()=>placePins([scene],{notify:false}).catch(error=>console.warn('Altered Carbon | case pins',error)),800);
  });
}

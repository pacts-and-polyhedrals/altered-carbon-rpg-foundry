// Scene background repair (v2.5.2)
// Foundry v14 stores a scene's image on its Level (scene.levels / scene.initialLevel), not on
// scene.background. Bay City scenes imported from earlier packs came in blank on v14. This finds
// every Bay City scene (interior maps and the Street Atlas) and puts its image where the running
// Foundry version expects it. Scenes with an image already set are never touched.
const NS='altered-carbon-rpg';
const DATA_FILES=['bay-city-maps.json','bay-city-street-atlas.json'];
let index=null;

async function mapIndex(){
  if(index)return index;index=new Map();
  for(const file of DATA_FILES){
    try{const r=await fetch(`systems/${NS}/data/${file}`);if(!r.ok)continue;const d=await r.json();
      for(const m of d.maps||[])index.set(m.id,{src:`systems/${NS}/assets/maps/${m.file}`,links:m.links||[],kind:file.includes('street')?'streetAtlas':'bayCityMap'});}catch(error){console.warn('Altered Carbon | map index',file,error);}
  }
  return index;
}

/** The image this scene should show, from its flags, or null if it is not a Bay City scene. */
export async function expectedImage(scene){
  const f=scene?.flags?.[NS]||{};const own=f.bayCityMap?.src||f.streetAtlas?.src;if(own)return own;
  const id=f.bayCityMap?.id||f.streetAtlas?.id;if(!id)return null;
  return (await mapIndex()).get(id)?.src||null;
}

export function currentImage(scene){
  const level=scene?.initialLevel??scene?.levels?.contents?.[0]??scene?.levels?.[0];
  if(scene?.levels!==undefined)return level?.background?.src||null;
  return scene?.background?.src||null;
}

/** Repair one scene. Returns true if it was changed. */
export async function repairSceneBackground(scene){
  const src=await expectedImage(scene);if(!src)return false;
  if(scene.levels!==undefined){
    const levels=scene.levels?.contents??scene.levels??[];
    const level=scene.initialLevel??levels[0];
    if(!level){
      const [created]=await scene.createEmbeddedDocuments('Level',[{name:'Street',background:{src},elevation:{bottom:0,top:20},sort:0}]);
      if(created&&!scene.initialLevel)await scene.update({initialLevel:created.id});
      return true;
    }
    if(level.background?.src)return false;
    await scene.updateEmbeddedDocuments('Level',[{_id:level.id,'background.src':src}]);
    return true;
  }
  if(scene.background?.src)return false;
  await scene.update({'background.src':src});
  return true;
}

/** Keep a Bay City scene's map-to-map links in step with the bundled map data. */
export async function syncSceneLinks(scene){
  const f=scene?.flags?.[NS]||{};const id=f.bayCityMap?.id||f.streetAtlas?.id;if(!id)return false;
  const entry=(await mapIndex()).get(id);if(!entry)return false;
  const current=f[entry.kind]?.links||[];
  if(JSON.stringify(current)===JSON.stringify(entry.links))return false;
  await scene.update({[`flags.${NS}.${entry.kind}.links`]:entry.links});
  return true;
}

export async function repairAllSceneBackgrounds({notify=true}={}){
  if(!game.user?.isGM)return 0;let fixed=0;
  for(const scene of game.scenes){try{if(await repairSceneBackground(scene))fixed++;await syncSceneLinks(scene);}catch(error){console.warn('Altered Carbon | could not repair',scene.name,error);}}
  if(fixed&&notify)ui.notifications.info(`Altered Carbon: restored the map image on ${fixed} Bay City scene(s).`);
  return fixed;
}

export function installSceneRepair(){
  Hooks.once('ready',()=>{const leader=game.users.activeGM??null;if(game.user.isGM&&(!leader||leader.id===game.user.id))repairAllSceneBackgrounds().catch(error=>console.warn('Altered Carbon | scene repair',error));});
  Hooks.on('createScene',(scene,options,userId)=>{if(userId===game.user.id&&game.user.isGM)repairSceneBackground(scene).catch(()=>null);});
}

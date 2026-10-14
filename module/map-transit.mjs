// Map-to-map transit for the Bay City Street Atlas (v2.5.2)
// Every road that leaves a Street Atlas map has an exit strip. A token (or a vehicle together
// with everyone seated in it) standing in that strip can cross to the connecting map: it is
// recreated at the same spot along the opposite edge, combat entries follow it, and the players
// who own the moved tokens are taken to the new scene. The connecting scene is imported from the
// compendium automatically if the world does not have it yet.
const NS='altered-carbon-rpg',SOCKET=`system.${NS}`,PACKS=[`${NS}.bay-city-streets`,`${NS}.bay-city-maps`];
const esc=v=>foundry.utils.escapeHTML(String(v??''));
const leaderGM=()=>game.users.activeGM??game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]??null;
const isLeader=()=>leaderGM()?.id===game.user.id;
const atlasOf=scene=>scene?.getFlag?.(NS,'streetAtlas')||null;
const mapOf=scene=>atlasOf(scene)||scene?.getFlag?.(NS,'bayCityMap')||null;   // street map or original map
const mapLinks=scene=>mapOf(scene)?.links||[];
const seatOf=t=>t?.getFlag?.(NS,'vehicleSeat')||null;
const occupantList=vt=>{const raw=vt?.getFlag?.(NS,'vehicleOccupants');return Array.isArray(raw)?raw:[];};

/** The exit strip this token's centre stands in, or null. */
export function linkAt(scene,token){
  const links=mapLinks(scene);const g=scene?.grid?.size||100;
  const cx=Number(token.x||0)+Number(token.width||1)*g/2,cy=Number(token.y||0)+Number(token.height||1)*g/2;
  return links.find(l=>l.to&&cx>=l.rect[0]&&cx<l.rect[0]+l.rect[2]&&cy>=l.rect[1]&&cy<l.rect[1]+l.rect[3])||null;
}

/** Where a token lands on the connecting map: same position along the edge, one square in. */
export function landingPosition(link,token,{width,height,gridSize}){
  const g=gridSize||100,w=Number(token.width||1)*g,h=Number(token.height||1)*g;
  // Building entrances and original-map exits name an exact landing spot (token centred on it).
  if(Array.isArray(link.land)){
    const x=Math.min(Math.max(0,link.land[0]-w/2),width-w),y=Math.min(Math.max(0,link.land[1]-h/2),height-h);
    return {x,y};
  }
  switch(link.edge){
    case 'E':return {x:g,y:token.y};
    case 'W':return {x:width-g-w,y:token.y};
    case 'N':return {x:token.x,y:height-g-h};
    case 'S':return {x:token.x,y:g};
  }
  return {x:token.x,y:token.y};
}

async function findOrImportScene(id){
  let scene=game.scenes.find(s=>mapOf(s)?.id===id);if(scene)return scene;
  for(const key of PACKS){
    const pack=game.packs.get(key);if(!pack)continue;
    const docs=await pack.getDocuments();
    const doc=docs.find(d=>{const f=d.flags?.[NS]||{};return f.streetAtlas?.id===id||f.bayCityMap?.id===id;});
    if(!doc)continue;
    const data=game.scenes.fromCompendium(doc,{clearFolder:false});
    const folderName=key.endsWith('bay-city-streets')?'Altered Carbon — Bay City Street Atlas':'Altered Carbon — Bay City Maps (Zoned)';
    let folder=game.folders.find(f=>f.type==='Scene'&&f.name===folderName);
    if(!folder)folder=await Folder.implementation.create({name:folderName,type:'Scene',color:'#32c7d6'});
    data.folder=folder.id;foundry.utils.setProperty(data,`flags.${NS}.installSource`,doc.uuid);
    [scene]=await getDocumentClass('Scene').createDocuments([data]);
    try{const {repairSceneBackground}=await import('./scene-repair.mjs');await repairSceneBackground(scene);}catch(_e){}
    return scene;
  }
  throw new Error(`Map ${id} is not in the Bay City compendiums.`);
}

/* ------------------------------------------------------------------ GM handler */
async function cross({sceneId,tokenId,userId}){
  const source=game.scenes.get(sceneId);let token=source?.tokens.get(tokenId);const user=game.users.get(userId);
  if(!token)throw new Error('Token not found.');
  // A seated rider crossing means the vehicle crosses.
  const seat=seatOf(token);if(seat){const vt=source.tokens.get(seat.vehicleTokenId);if(vt)token=vt;}
  if(!user?.isGM&&!token.actor?.testUserPermission?.(user,'OWNER'))throw new Error(`${user?.name||'That player'} does not control ${token.name}.`);
  const link=linkAt(source,token);if(!link)throw new Error(`${token.name} is not at a map exit.`);
  const target=await findOrImportScene(link.to);
  const dims={width:target.width,height:target.height,gridSize:target.grid?.size||100};
  const land=landingPosition(link,token,dims);
  const riders=occupantList(token).map(o=>({o,t:source.tokens.get(o.tokenId)})).filter(r=>r.t);
  // 1. vehicle (or lone token) on the new map
  const vData=token.toObject();delete vData._id;vData.x=Math.round(land.x);vData.y=Math.round(land.y);
  const [newToken]=await target.createEmbeddedDocuments('Token',[vData],{acVehicleCarry:true,acTransit:true});
  // 2. riders keep their offset inside the vehicle
  const idMap={[token.id]:newToken.id};
  if(riders.length){
    const rData=riders.map(({t})=>{const d=t.toObject();delete d._id;d.x=Math.round(newToken.x+(t.x-token.x));d.y=Math.round(newToken.y+(t.y-token.y));
      foundry.utils.setProperty(d,`flags.${NS}.vehicleSeat.vehicleTokenId`,newToken.id);return d;});
    const created=await target.createEmbeddedDocuments('Token',rData,{acVehicleCarry:true,acTransit:true});
    riders.forEach(({t},i)=>{idMap[t.id]=created[i].id;});
    await newToken.update({[`flags.${NS}.vehicleOccupants`]:occupantList(token).map(o=>({...o,tokenId:idMap[o.tokenId]||o.tokenId}))},{acVehicleCarry:true});
  }
  // 3. combat entries follow the tokens
  for(const combat of game.combats){
    const updates=combat.combatants.filter(c=>c.sceneId===source.id&&idMap[c.tokenId]).map(c=>({_id:c.id,sceneId:target.id,tokenId:idMap[c.tokenId]}));
    if(!updates.length)continue;
    await combat.updateEmbeddedDocuments('Combatant',updates);
    if(combat.scene?.id===source.id)await combat.update({scene:null}); // the fight now spans two maps
  }
  // 4. remove the originals without triggering "everyone gets out" clean-up
  await source.deleteEmbeddedDocuments('Token',[...riders.map(r=>r.t.id),token.id],{acTransit:true});
  // 5. send the owners' screens to the new map
  const moved=[newToken,...Object.values(idMap).filter(id=>id!==newToken.id).map(id=>target.tokens.get(id))].filter(Boolean);
  const owners=game.users.filter(u=>!u.isGM&&u.active&&moved.some(t=>t.actor?.testUserPermission?.(u,'OWNER'))).map(u=>u.id);
  game.socket.emit(SOCKET,{type:'acTransit.view',data:{sceneId:target.id,userIds:owners}});
  if(user?.isGM&&user.id===game.user.id)await target.view();
  try{await ChatMessage.implementation.create({speaker:{alias:'Bay City Streets'},content:`<section class="ac-chat-card ac-vehicle-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">STREET ATLAS</span><strong>${esc(newToken.name)} → ${esc(target.name)}</strong></div></header><p>${riders.length?`With ${riders.map(r=>esc(r.t.name)).join(', ')} aboard. `:''}${link.edge?`Crossed from ${esc(source.name)} (${esc(link.edge)} edge).`:`Went through from ${esc(source.name)}.`}</p></section>`});}catch(_e){}
  return {scene:target,token:newToken};
}

export async function crossToNextMap(token){
  const data={sceneId:token.parent.id,tokenId:token.id,userId:game.user.id};
  if(isLeader())return cross(data);
  if(!leaderGM())throw new Error('A GM must be connected to move between maps.');
  game.socket.emit(SOCKET,{type:'acTransit.cross',data});
  ui.notifications.info('Crossing to the next map…');
}

/* ------------------------------------------------------------------ hooks */
export function installMapTransit(){
  game.socket.on(SOCKET,async payload=>{
    if(payload?.type==='acTransit.view'){
      if(payload.data?.userIds?.includes(game.user.id))game.scenes.get(payload.data.sceneId)?.view();
      return;
    }
    if(payload?.type!=='acTransit.cross'||!isLeader())return;
    try{await cross(payload.data||{});}catch(error){
      console.warn('Altered Carbon | transit refused',error);
      try{await ChatMessage.implementation.create({speaker:{alias:'Bay City Streets'},whisper:[payload.data?.userId].filter(Boolean),content:`<p>${esc(error.message)}</p>`});}catch(_e){}
    }
  });
  // A hint when a token arrives at an exit.
  Hooks.on('updateToken',(doc,changes,options,userId)=>{
    if(userId!==game.user.id||options?.acTransit||!(('x' in changes)||('y' in changes)))return;
    const link=linkAt(doc.parent,doc);if(link)ui.notifications.info(`${doc.name} is at the way to ${link.toName}. Right-click the token → Go to ${link.toName}.`);
  });
  Hooks.on('renderTokenHUD',(hud,html)=>{
    try{
      const root=html instanceof HTMLElement?html:html?.[0];const doc=hud.document??hud.object?.document;if(!root||!doc)return;
      let subject=doc;const seat=seatOf(doc);if(seat){subject=doc.parent.tokens.get(seat.vehicleTokenId)||doc;}
      const link=linkAt(doc.parent,subject);if(!link)return;
      const col=root.querySelector('.col.left')||root.querySelector('.left');if(!col||col.querySelector('.ac-transit-hud'))return;
      const b=document.createElement('button');b.type='button';b.className='control-icon ac-transit-hud';b.title=`Go to ${link.toName}`;b.setAttribute('aria-label',b.title);b.innerHTML='<i class="fa-solid fa-route"></i>';
      b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();crossToNextMap(subject).catch(error=>ui.notifications.warn(error.message));});
      col.append(b);
    }catch(error){console.warn('Altered Carbon | transit HUD',error);}
  });
}

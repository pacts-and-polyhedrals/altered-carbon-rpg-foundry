// Map-to-map transit for the Bay City Street Atlas (v2.5.2; destinations and v14 levels in v2.5.5)
// Every road that leaves a Street Atlas map has an exit strip. A token (or a vehicle together
// with everyone seated in it) standing in that strip can cross to the connecting map: it is
// recreated at the same spot along the opposite edge, combat entries follow it, and the players
// who own the moved tokens are taken to the new scene. The connecting scene is imported from the
// compendium automatically if the world does not have it yet.
import {hasAbility} from './vehicle-abilities.mjs';
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

/* ------------------------------------------------------------------ destinations (taxi / travel picker) */
const centre=r=>[Math.round(r[0]+r[2]/2),Math.round(r[1]+r[3]/2)];
/** Every place a vehicle can be sent: each street map's central junction, each building entrance on the
 *  street maps, and the arrival point inside each original map. Pure: built from the bundled map data. */
export function buildDestinations(atlas,interiors){
  const out=[];
  for(const m of atlas?.maps||[]){
    const cx=m.width/2,cy=m.height/2;
    const roads=(m.zones||[]).filter(z=>z.kind==='junction');const pool=roads.length?roads:(m.zones||[]).filter(z=>z.kind==='road');
    const hub=pool.slice().sort((a,b)=>Math.hypot(...centre(a.rect).map((v,i)=>v-[cx,cy][i]))-Math.hypot(...centre(b.rect).map((v,i)=>v-[cx,cy][i])))[0];
    if(hub)out.push({key:`${m.id}:centre`,mapId:m.id,group:m.name,short:'Main junction',label:`${m.name} · main junction`,land:centre(hub.rect)});
    (m.links||[]).filter(l=>l.kind==='door').forEach((l,i)=>{const at=l.at?`${l.at} (${l.toName})`:l.toName;out.push({key:`${m.id}:door:${i}`,mapId:m.id,group:m.name,short:`Outside ${at}`,label:`${m.name} · outside ${at}`,land:centre(l.rect)});});
  }
  const all=[...(atlas?.maps||[]),...(interiors?.maps||[])];
  for(const m of interiors?.maps||[]){
    const inbound=all.flatMap(o=>(o.links||[]).filter(l=>l.to===m.id&&Array.isArray(l.land)))[0];
    if(inbound)out.push({key:`${m.id}:inside`,mapId:m.id,group:'Inside (original maps)',short:m.name,label:`${m.name} · inside`,land:inbound.land});
  }
  return out;
}
let destinationCache=null;
export async function transitDestinations(){
  if(destinationCache)return destinationCache;
  const load=async f=>{try{const r=await fetch(`systems/${NS}/data/${f}`);return r.ok?await r.json():{maps:[]};}catch(_e){return {maps:[]};}};
  const [atlas,interiors]=await Promise.all([load('bay-city-street-atlas.json'),load('bay-city-maps.json')]);
  destinationCache=buildDestinations(atlas,interiors);return destinationCache;
}
const vehicleOf=t=>{const seat=seatOf(t);return seat?t.parent?.tokens?.get(seat.vehicleTokenId)||null:(t?.actor?.type==='vehicle'?t:null);};
// Self-driving: AI control, or the Autopilot ability (Autocab, limousine).
const isAIVehicle=vt=>['ai','both'].includes(String(vt?.actor?.system?.vehicle?.control||'driver'))||hasAbility(vt?.actor,'autopilot');
/** Who may pick any destination: the GM, or anyone aboard (or owning) a vehicle its AI drives (a taxi). */
export function canChooseDestination(token,user=game.user){
  if(user?.isGM)return true;const vt=vehicleOf(token);if(!vt||!isAIVehicle(vt))return false;
  if(vt.actor?.testUserPermission?.(user,'OWNER'))return true;
  return occupantList(vt).some(o=>vt.parent?.tokens?.get(o.tokenId)?.actor?.testUserPermission?.(user,'OWNER'));
}
/** The Level a new token belongs on (Foundry v14); null on v13. */
export function targetLevelId(scene){
  if(scene?.levels===undefined)return null;
  const lv=scene.initialLevel;if(typeof lv==='string'&&lv)return lv;if(lv?.id)return lv.id;
  const list=scene.levels?.contents??(Array.isArray(scene.levels)?scene.levels:[]);const first=list[0];
  return typeof first==='string'?first:first?.id??null;
}
/** Make token data from one scene valid on another: right Level, no stale region or movement state. */
export function retarget(data,scene){
  delete data._id;delete data._regions;delete data._movementHistory;
  const level=targetLevelId(scene);if(level)data.level=level;else delete data.level;
  return data;
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
async function cross({sceneId,tokenId,userId,destination}){
  const source=game.scenes.get(sceneId);let token=source?.tokens.get(tokenId);const user=game.users.get(userId);
  if(!token)throw new Error('Token not found.');
  const asked=token;
  // A seated rider crossing means the vehicle crosses.
  const seat=seatOf(token);if(seat){const vt=source.tokens.get(seat.vehicleTokenId);if(vt)token=vt;}
  let link;
  if(destination){
    // A chosen destination (taxi / GM travel): validated against the bundled list, never trusted from the socket.
    if(!canChooseDestination(asked,user))throw new Error(`${user?.name||'That player'} cannot choose where ${token.name} goes.`);
    const d=(await transitDestinations()).find(x=>x.key===destination);if(!d)throw new Error('Unknown destination.');
    link={to:d.mapId,toName:d.label,land:d.land};
  }else{
    if(!user?.isGM&&!token.actor?.testUserPermission?.(user,'OWNER'))throw new Error(`${user?.name||'That player'} does not control ${token.name}.`);
    link=linkAt(source,token);if(!link)throw new Error(`${token.name} is not at a map exit.`);
  }
  const target=await findOrImportScene(link.to);
  const dims={width:target.width,height:target.height,gridSize:target.grid?.size||100};
  const land=landingPosition(link,token,dims);
  const riders=occupantList(token).map(o=>({o,t:source.tokens.get(o.tokenId)})).filter(r=>r.t);
  // 1. vehicle (or lone token) on the new map
  const vData=retarget(token.toObject(),target);vData.x=Math.round(land.x);vData.y=Math.round(land.y);
  const [newToken]=await target.createEmbeddedDocuments('Token',[vData],{acVehicleCarry:true,acTransit:true});
  // 2. riders keep their offset inside the vehicle
  const idMap={[token.id]:newToken.id};
  if(riders.length){
    const rData=riders.map(({t})=>{const d=retarget(t.toObject(),target);d.x=Math.round(newToken.x+(t.x-token.x));d.y=Math.round(newToken.y+(t.y-token.y));
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
    if(target.id!==source.id&&combat.scene?.id===source.id)await combat.update({scene:null}); // the fight now spans two maps
  }
  // 4. remove the originals without triggering "everyone gets out" clean-up
  await source.deleteEmbeddedDocuments('Token',[...riders.map(r=>r.t.id),token.id],{acTransit:true});
  // 5. send the owners' screens to the new map
  const moved=[newToken,...Object.values(idMap).filter(id=>id!==newToken.id).map(id=>target.tokens.get(id))].filter(Boolean);
  const owners=game.users.filter(u=>!u.isGM&&u.active&&moved.some(t=>t.actor?.testUserPermission?.(u,'OWNER'))).map(u=>u.id);
  game.socket.emit(SOCKET,{type:'acTransit.view',data:{sceneId:target.id,userIds:owners}});
  if(user?.isGM&&user.id===game.user.id)await target.view();
  try{await ChatMessage.implementation.create({speaker:{alias:'Bay City Streets'},content:`<section class="ac-chat-card ac-vehicle-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">STREET ATLAS</span><strong>${esc(newToken.name)} → ${esc(target.name)}</strong></div></header><p>${riders.length?`With ${riders.map(r=>esc(r.t.name)).join(', ')} aboard. `:''}${link.edge?`Crossed from ${esc(source.name)} (${esc(link.edge)} edge).`:destination?`Drove from ${esc(source.name)} to ${esc(link.toName)}.`:`Went through from ${esc(source.name)}.`}</p></section>`});}catch(_e){}
  return {scene:target,token:newToken};
}

export async function crossToNextMap(token,{destination=null}={}){
  const data={sceneId:token.parent.id,tokenId:token.id,userId:game.user.id,destination};
  if(isLeader())return cross(data);
  if(!leaderGM())throw new Error('A GM must be connected to move between maps.');
  game.socket.emit(SOCKET,{type:'acTransit.cross',data});
  ui.notifications.info(destination?'On the way…':'Crossing to the next map…');
}

/** Destination picker: every Bay City street, entrance and interior, grouped by district. */
export async function openTravelDialog(token){
  const list=await transitDestinations();if(!list.length)throw new Error('No Bay City destinations found.');
  const subject=vehicleOf(token)||token,here=linkAt(token.parent,subject);
  const preferred=here?list.find(d=>d.mapId===here.to&&Array.isArray(here.land)&&Math.hypot(d.land[0]-here.land[0],d.land[1]-here.land[1])<1)||list.find(d=>d.mapId===here.to):null;
  const groups=new Map();for(const d of list){if(!groups.has(d.group))groups.set(d.group,[]);groups.get(d.group).push(d);}
  const options=[...groups].map(([g,ds])=>`<optgroup label="${esc(g)}">${ds.map(d=>`<option value="${esc(d.key)}" ${d===preferred?'selected':''}>${esc(d.short||d.label)}</option>`).join('')}</optgroup>`).join('');
  const who=occupantList(subject).map(o=>o.name).filter(Boolean);
  const form=await foundry.applications.api.DialogV2.input({window:{title:`${subject.name}: where to?`,icon:'fa-solid fa-taxi'},
    content:`<p>${who.length?`Aboard: <b>${who.map(esc).join(', ')}</b>. `:''}Everyone aboard goes too.</p><label><span>Destination</span><select name="destination">${options}</select></label>`,
    ok:{label:'Go',icon:'fa-solid fa-route'}});
  if(!form?.destination)return null;
  return crossToNextMap(subject,{destination:form.destination});
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
    const link=linkAt(doc.parent,doc);if(link&&link.kind!=='district')ui.notifications.info(`${doc.name} is at the way to ${link.toName}. Right-click the token → Go to ${link.toName}.`);
  });
  Hooks.on('renderTokenHUD',(hud,html)=>{
    try{
      const root=html instanceof HTMLElement?html:html?.[0];const doc=hud.document??hud.object?.document;if(!root||!doc)return;
      let subject=doc;const seat=seatOf(doc);if(seat){subject=doc.parent.tokens.get(seat.vehicleTokenId)||doc;}
      if(!mapOf(doc.parent))return;
      const link=linkAt(doc.parent,subject),choose=canChooseDestination(doc)||link?.kind==='district';
      const col=root.querySelector('.col.left')||root.querySelector('.left');if(!col||col.querySelector('.ac-transit-hud'))return;
      const add=(icon,title,fn)=>{const b=document.createElement('button');b.type='button';b.className='control-icon ac-transit-hud';b.title=title;b.dataset.tooltip=title;b.setAttribute('aria-label',title);b.innerHTML=`<i class="${icon}" inert></i>`;
        b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();fn().catch(error=>ui.notifications.warn(error.message));});col.append(b);};
      // At an exit or entrance: one click through it. On the overview, or in a taxi / as GM: pick from the list.
      if(link&&link.kind!=='district')add('fa-solid fa-route',`Go to ${link.toName}`,()=>crossToNextMap(subject));
      if(choose)add('fa-solid fa-taxi',isAIVehicle(vehicleOf(doc))?'Taxi: choose a destination':'Travel to… (choose a destination)',()=>openTravelDialog(doc));
    }catch(error){console.warn('Altered Carbon | transit HUD',error);}
  });
}

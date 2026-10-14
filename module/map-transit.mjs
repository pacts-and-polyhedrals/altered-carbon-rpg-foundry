// Map-to-map transit for the Bay City Street Atlas (v2.5.2; destinations and v14 levels in v2.5.5)
// Every road that leaves a Street Atlas map has an exit strip. A token (or a vehicle together
// with everyone seated in it) standing in that strip can cross to the connecting map: it is
// recreated at the same spot along the opposite edge, combat entries follow it, and the players
// who own the moved tokens are taken to the new scene. The connecting scene is imported from the
// compendium automatically if the world does not have it yet.
import {hasAbility} from './vehicle-abilities.mjs';
const NS='altered-carbon-rpg',SOCKET=`system.${NS}`,PACKS=[`${NS}.bay-city-streets`,`${NS}.bay-city-maps`,`${NS}.bay-city-places`];
const esc=v=>foundry.utils.escapeHTML(String(v??''));
const leaderGM=()=>game.users.activeGM??game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]??null;
const isLeader=()=>leaderGM()?.id===game.user.id;
const atlasOf=scene=>scene?.getFlag?.(NS,'streetAtlas')||null;
/* ------------------------------------------------------------------ Cold Storage module (v2.5.7)
 * When the cold-storage module is active its buildings stand on the Street Atlas: entrances on the
 * street maps, a way back out of each of its maps, and its own exit tags linked map to map
 * (data/cold-storage-links.json). Nothing is added while the module is absent. */
export const CS_MODULE='cold-storage';
let coldStorage=null;
export function setColdStorageLinks(data){coldStorage=data&&data.streetDoors?data:null;destinationCache=null;}
export const coldStorageActive=()=>Boolean(coldStorage&&globalThis.game?.modules?.get?.(CS_MODULE)?.active);
const csSourceId=scene=>scene?.getFlag?.(CS_MODULE,'sourceId')??scene?.flags?.[CS_MODULE]?.sourceId??null;
const csMap=scene=>{if(!coldStorageActive())return null;const id=csSourceId(scene),rec=id&&coldStorage.scenes?.[id];return rec?{id,name:rec.name,links:rec.links,coldStorage:true}:null;};
export const mapOf=scene=>atlasOf(scene)||scene?.getFlag?.(NS,'bayCityMap')||csMap(scene)||null;   // street map, original map or Cold Storage map
export function mapLinks(scene){
  const m=mapOf(scene);if(!m)return [];
  if(m.id===OVERVIEW_ID)return [...overviewColdStorage(m).map(o=>o.link),...(m.links||[])];   // specific spots before whole districts
  const extra=coldStorageActive()&&atlasOf(scene)?coldStorage.streetDoors?.[m.id]||[]:[];
  return [...(m.links||[]),...extra];
}
/** The master overview: each Cold Storage entrance at its true spot on the scaled-down district. */
export const OVERVIEW_ID='BCS-OVERVIEW';
export function overviewColdStorage(overview){
  if(!coldStorageActive()||!overview)return [];
  const out=[];
  for(const [mapId,doors] of Object.entries(coldStorage.streetDoors||{})){
    const district=(overview.links||[]).find(l=>l.kind==='district'&&l.to===mapId);if(!district)continue;
    const [ox,oy,tw]=district.rect,k=tw/4200,sc=r=>[Math.round(ox+r[0]*k),Math.round(oy+r[1]*k),Math.round(r[2]*k),Math.round(r[3]*k)];
    for(const d of doors){
      // The pin marks the building itself (its block), not the entrance strip on the road.
      const b=d.block?sc(d.block):sc(d.rect),spot=[b[0]+6,b[1]+6,Math.max(40,b[2]-12),Math.max(40,b[3]-12)];
      out.push({key:`ov:${d.key}`,rect:spot,block:b,district:district.rect,label:d.toName.toUpperCase(),
        link:{kind:'district',to:mapId,toName:`${d.toName} (${district.toName})`,rect:spot,land:[d.rect[0]+d.rect[2]/2,d.rect[1]+d.rect[3]/2]}});
    }
  }
  // Two buildings on one block (the Ward and the Breach): spread their pins and stack their labels.
  const byBlock=new Map();for(const o of out){const k=o.block?.join(',');if(!k)continue;if(!byBlock.has(k))byBlock.set(k,[]);byBlock.get(k).push(o);}
  for(const group of byBlock.values())group.forEach((o,i)=>{o.slot=i;o.slots=group.length;});
  placeOverviewLabels(out);
  return out;
}
/** The pin: a disc in the middle of the building block (lower half, leaving room for the label). */
export function pinOf(s){const b=s.block||s.rect,r=28,n=s.slots||1,i=s.slot||0;return {x:Math.round(b[0]+b[2]*(i+1)/(n+1)-r),y:Math.round(b[1]+b[3]*0.62-r),w:2*r,h:2*r};}
/** Label boxes beside each pin: above, below, right or left, inside its district, never on another label. */
export const OVERVIEW_LABEL={fontSize:22,height:46,charWidth:14,pad:34};
export function placeOverviewLabels(spots){
  const {height:h,charWidth,pad}=OVERVIEW_LABEL,placed=[],hit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
  const pins=spots.map(s=>pinOf(s));
  for(const s of spots){
    if(s.block){   // inside the building's own block: label centred above the pin
      const p=pinOf(s),w=Math.min(s.label.length*charWidth+pad,s.block[2]-16),n=s.slots||1,i=s.slot||0;
      // one label row per building on the block, highest first; each label sits over its own pin
      const cx=Math.min(Math.max(p.x+p.w/2,s.block[0]+8+w/2),s.block[0]+s.block[2]-8-w/2);
      s.labelBox={x:Math.round(cx-w/2),y:Math.round(p.y-10-(n-i)*(h+6)),w:Math.round(w),h};placed.push(s.labelBox);continue;
    }
    const w=s.label.length*charWidth+pad,cx=s.rect[0]+s.rect[2]/2,cy=s.rect[1]+s.rect[3]/2,[dx,dy,dw,dh]=s.district;
    const fit=b=>({...b,x:Math.round(Math.min(Math.max(b.x,dx+8),dx+dw-b.w-8)),y:Math.round(Math.min(Math.max(b.y,dy+8),dy+dh-b.h-8))});
    const tries=[{x:cx-w/2,y:cy-36-h},{x:cx-w/2,y:cy+36},{x:cx+36,y:cy-h/2},{x:cx-36-w,y:cy-h/2},{x:cx-w/2,y:cy-36-2*h-6},{x:cx-w/2,y:cy+36+h+6}].map(b=>fit({...b,w,h}));
    s.labelBox=tries.find(b=>!placed.some(p=>hit(p,b))&&!pins.some(p=>hit(p,b)))||tries[0];
    placed.push(s.labelBox);
  }
  return spots;
}
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
export function buildDestinations(atlas,interiors,cs=null){
  const out=[];
  for(const m of atlas?.maps||[]){
    const cx=m.width/2,cy=m.height/2;
    const roads=(m.zones||[]).filter(z=>z.kind==='junction');const pool=roads.length?roads:(m.zones||[]).filter(z=>z.kind==='road');
    const hub=pool.slice().sort((a,b)=>Math.hypot(...centre(a.rect).map((v,i)=>v-[cx,cy][i]))-Math.hypot(...centre(b.rect).map((v,i)=>v-[cx,cy][i])))[0];
    if(hub)out.push({key:`${m.id}:centre`,mapId:m.id,group:m.name,short:'Main junction',label:`${m.name} · main junction`,land:centre(hub.rect)});
    (m.links||[]).filter(l=>l.kind==='door').forEach((l,i)=>{const at=!l.at||l.at===l.toName||String(l.at).startsWith(`${l.toName} ·`)?(l.at||l.toName):`${l.at} (${l.toName})`;out.push({key:`${m.id}:door:${i}`,mapId:m.id,group:m.name,short:`Outside ${at}`,label:`${m.name} · outside ${at}`,land:centre(l.rect)});});
  }
  const all=[...(atlas?.maps||[]),...(interiors?.maps||[])];
  for(const m of interiors?.maps||[]){
    const inbound=all.flatMap(o=>(o.links||[]).filter(l=>l.to===m.id&&Array.isArray(l.land)))[0];
    const street=m.street?(atlas?.maps||[]).find(s=>s.id===m.street):null;
    if(inbound)out.push({key:`${m.id}:inside`,mapId:m.id,group:street?`${street.name} · inside`:'Inside (original maps)',short:m.name,label:`${m.name} · inside`,land:inbound.land});
  }
  // Cold Storage: park outside each building (walking in through the entrance takes you inside).
  for(const [mapId,doors] of Object.entries(cs?.streetDoors||{})){
    const street=(atlas?.maps||[]).find(m=>m.id===mapId);
    for(const d of doors)out.push({key:`${d.key}:outside`,mapId,group:'Cold Storage',short:`Outside ${d.toName} — ${street?.name||mapId} · ${d.at}`,label:`${street?.name||mapId} · outside ${d.toName}`,land:centre(d.rect)});
  }
  return out;
}
let destinationCache=null,atlasData=null;
export async function transitDestinations(){
  if(destinationCache)return destinationCache;
  const load=async f=>{try{const r=await fetch(`systems/${NS}/data/${f}`);return r.ok?await r.json():{maps:[]};}catch(_e){return {maps:[]};}};
  const [atlas,interiors,places]=await Promise.all([load('bay-city-street-atlas.json'),load('bay-city-maps.json'),load('bay-city-places.json')]);
  atlasData=atlas;
  destinationCache=buildDestinations(atlas,{maps:[...(interiors.maps||[]),...(places.maps||[])]},coldStorageActive()?coldStorage:null);return destinationCache;
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
  if(coldStorage?.scenes?.[id]||coldStorage?.streetDoors&&String(id).startsWith('SCENE-')){
    scene=game.scenes.find(s=>csSourceId(s)===id);
    if(!scene&&typeof game.coldStorage?.installMaps==='function'){await game.coldStorage.installMaps({thumbnails:false});scene=game.scenes.find(s=>csSourceId(s)===id);}
    if(scene)return scene;
    throw new Error(`The Cold Storage scene for ${coldStorage?.scenes?.[id]?.name||id} is not in this world. Install the Cold Storage maps first.`);
  }
  for(const key of PACKS){
    const pack=game.packs.get(key);if(!pack)continue;
    const docs=await pack.getDocuments();
    const doc=docs.find(d=>{const f=d.flags?.[NS]||{};return f.streetAtlas?.id===id||f.bayCityMap?.id===id;});
    if(!doc)continue;
    const data=game.scenes.fromCompendium(doc,{clearFolder:false});
    const folderName=key.endsWith('bay-city-streets')?'Altered Carbon — Bay City Street Atlas':key.endsWith('bay-city-places')?'Altered Carbon — Bay City Places':'Altered Carbon — Bay City Maps (Zoned)';
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
export const isStreetMapId=id=>String(id||'').startsWith('BCS-');
/** Spots around a landing point, nearest first, one grid square apart. */
export function formation(n,centre,{width,height,gridSize=100,size=1}={}){
  const g=gridSize,offs=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[2,0],[-2,0],[0,2],[0,-2],[2,1],[-2,1],[2,-1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]];
  const out=[];for(let i=0;i<n;i++){const [dx,dy]=offs[i%offs.length],ring=Math.floor(i/offs.length)*3;
    out.push({x:Math.round(Math.min(Math.max(0,centre[0]-size*g/2+(dx+Math.sign(dx)*ring)*g),width-size*g)),y:Math.round(Math.min(Math.max(0,centre[1]-size*g/2+(dy+Math.sign(dy)*ring)*g),height-size*g))});}
  return out;
}
/** Where a vehicle parks for a building: that building's entrance on its street map. */
export async function parkingFor(interiorId){
  await transitDestinations();
  for(const m of atlasData?.maps||[])for(const l of m.links||[])if(l.kind==='door'&&l.to===interiorId)return {mapId:m.id,land:centre(l.rect)};
  if(coldStorageActive())for(const [mapId,doors] of Object.entries(coldStorage.streetDoors||{}))for(const d of doors)if(d.to===interiorId)return {mapId,land:centre(d.rect)};
  return null;
}
async function remapCombat(source,target,idMap){
  for(const combat of game.combats){
    const updates=combat.combatants.filter(c=>c.sceneId===source.id&&idMap[c.tokenId]).map(c=>({_id:c.id,sceneId:target.id,tokenId:idMap[c.tokenId]}));
    if(!updates.length)continue;
    await combat.updateEmbeddedDocuments('Combatant',updates);
    if(target.id!==source.id&&combat.scene?.id===source.id)await combat.update({scene:null}); // the fight now spans two maps
  }
}
function sendOwners(target,tokens,user){
  const owners=game.users.filter(u=>!u.isGM&&u.active&&tokens.some(t=>t?.actor?.testUserPermission?.(u,'OWNER'))).map(u=>u.id);
  game.socket.emit(SOCKET,{type:'acTransit.view',data:{sceneId:target.id,userIds:owners}});
  if(user?.isGM&&user.id===game.user.id)return target.view();
}
async function card(title,text){try{await ChatMessage.implementation.create({speaker:{alias:'Bay City Streets'},content:`<section class="ac-chat-card ac-vehicle-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">STREET ATLAS</span><strong>${esc(title)}</strong></div></header><p>${text}</p></section>`});}catch(_e){}}

/** Move people (not vehicles) to a landing point on another map, side by side. Seated riders get out first. */
async function walkIn(source,target,people,land,{vehicle=null}={}){
  const dims={width:target.width,height:target.height,gridSize:target.grid?.size||100};
  const occ=vehicle?occupantList(vehicle):[];
  const spots=formation(people.length,land,dims);
  const data=people.map((t,i)=>{const d=retarget(t.toObject(),target);const o=occ.find(x=>x.tokenId===t.id);
    if(o){d.width=o.original?.width||1;d.height=o.original?.height||1;d.rotation=0;}
    foundry.utils.setProperty(d,`flags.${NS}.vehicleSeat`,null);d.x=spots[i].x;d.y=spots[i].y;return d;});
  const created=await target.createEmbeddedDocuments('Token',data,{acVehicleCarry:true,acTransit:true});
  const idMap={};people.forEach((t,i)=>{idMap[t.id]=created[i].id;});
  await remapCombat(source,target,idMap);
  await source.deleteEmbeddedDocuments('Token',people.map(t=>t.id),{acTransit:true});
  return created;
}
/** Move a vehicle and whoever is seated in it, keeping their seats. */
async function driveTo(source,target,vehicle,land){
  const riders=occupantList(vehicle).map(o=>({o,t:source.tokens.get(o.tokenId)})).filter(r=>r.t);
  const vData=retarget(vehicle.toObject(),target);vData.x=Math.round(land.x);vData.y=Math.round(land.y);
  const [newToken]=await target.createEmbeddedDocuments('Token',[vData],{acVehicleCarry:true,acTransit:true});
  const idMap={[vehicle.id]:newToken.id};
  if(riders.length){
    const rData=riders.map(({t})=>{const d=retarget(t.toObject(),target);d.x=Math.round(newToken.x+(t.x-vehicle.x));d.y=Math.round(newToken.y+(t.y-vehicle.y));
      foundry.utils.setProperty(d,`flags.${NS}.vehicleSeat.vehicleTokenId`,newToken.id);return d;});
    const created=await target.createEmbeddedDocuments('Token',rData,{acVehicleCarry:true,acTransit:true});
    riders.forEach(({t},i)=>{idMap[t.id]=created[i].id;});
    await newToken.update({[`flags.${NS}.vehicleOccupants`]:occupantList(vehicle).map(o=>({...o,tokenId:idMap[o.tokenId]||o.tokenId}))},{acVehicleCarry:true});
  }
  await remapCombat(source,target,idMap);
  await source.deleteEmbeddedDocuments('Token',[...riders.map(r=>r.t.id),vehicle.id],{acTransit:true});
  return {token:newToken,riders:riders.map(r=>target.tokens.get(idMap[r.t.id])).filter(Boolean),riderNames:riders.map(r=>r.t.name)};
}
/** One transfer through a link: a lone character (plus optional companions), or a vehicle with riders.
 *  Into a building, the riders walk in and the vehicle is parked at that building's street entrance. */
export async function transfer(source,token,link,{user=game.user,companions=[],destination=null}={}){
  const target=await findOrImportScene(link.to);
  const dims={width:target.width,height:target.height,gridSize:target.grid?.size||100};
  const vehicle=token.actor?.type==='vehicle'||occupantList(token).length?token:null;
  if(vehicle&&!isStreetMapId(link.to)){
    const riders=occupantList(vehicle).map(o=>source.tokens.get(o.tokenId)).filter(Boolean);
    if(!riders.length)throw new Error(`${vehicle.name} cannot drive inside ${target.name}; park it and walk in.`);
    const land=Array.isArray(link.land)?link.land:[target.width/2,target.height/2];
    const inside=await walkIn(source,target,riders,land,{vehicle});
    try{const {clearOccupants}=await import('./vehicle-boarding.mjs');await clearOccupants(vehicle);}catch(_e){}
    let parked='';
    const park=await parkingFor(link.to);
    if(park&&!(isStreetMapId(mapOf(source)?.id)&&mapOf(source)?.id===park.mapId&&linkAt(source,vehicle))){
      const street=await findOrImportScene(park.mapId);
      const g=street.grid?.size||100,spot={x:Math.round(Math.min(Math.max(0,park.land[0]-vehicle.width*g/2),street.width-vehicle.width*g)),y:Math.round(Math.min(Math.max(0,park.land[1]-vehicle.height*g/2),street.height-vehicle.height*g))};
      const fresh=source.tokens.get(vehicle.id);if(fresh){await driveTo(source,street,fresh,spot);parked=` ${esc(vehicle.name)} is parked outside on ${esc(street.name)}.`;}
    }else parked=` ${esc(vehicle.name)} waits where it stopped.`;
    await sendOwners(target,inside,user);
    await card(`${riders.map(r=>r.name).join(', ')} → ${target.name}`,`Got out of the ${esc(vehicle.name)} and went inside.${parked}`);
    return {scene:target,token:inside[0],tokens:inside};
  }
  if(vehicle){
    const land=landingPosition(link,vehicle,dims);
    const r=await driveTo(source,target,vehicle,land);
    await sendOwners(target,[r.token,...r.riders],user);
    await card(`${vehicle.name} → ${target.name}`,`${r.riderNames.length?`With ${r.riderNames.map(esc).join(', ')} aboard. `:''}${link.edge?`Crossed from ${esc(source.name)} (${esc(link.edge)} edge).`:destination?`Drove from ${esc(source.name)} to ${esc(link.toName)}.`:`Went through from ${esc(source.name)}.`}`);
    return {scene:target,token:r.token,tokens:[r.token,...r.riders]};
  }
  const people=[token,...companions.filter(t=>t&&t.id!==token.id)];
  const first=landingPosition(link,token,dims),g=dims.gridSize;
  const centrePt=[first.x+Number(token.width||1)*g/2,first.y+Number(token.height||1)*g/2];
  const moved=await walkIn(source,target,people,centrePt);
  await sendOwners(target,moved,user);
  await card(`${people.map(t=>t.name).join(', ')} → ${target.name}`,`${link.edge?`Crossed from ${esc(source.name)} (${esc(link.edge)} edge).`:`Went through from ${esc(source.name)}.`}`);
  return {scene:target,token:moved[0],tokens:moved};
}

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
  return transfer(source,token,link,{user,destination});
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
export const linkId=l=>`${l.to}@${(l.rect||[]).join(',')}`;
function autoEnterEnabled(){try{return game.settings.get(NS,'autoEnterBuildings')===true;}catch(_e){return false;}}
/** Pure decision: does this move carry the token through the entrance or exit it stepped into? */
export function shouldAutoEnter(token,link,fromLinkId,enabled=autoEnterEnabled()){
  if(!enabled||!link||!['door','exit'].includes(link.kind))return false;
  if(token?.actor?.type==='vehicle'||seatOf(token))return false;
  return linkId(link)!==fromLinkId;
}
/** Where an entrance label goes: inside its building block, against the side the entrance is on
 *  (like the ENTER labels drawn on the street art), so it never covers the road's own EXIT tags. */
export function labelPosition({rect,block},width,height){
  const cx=rect[0]+rect[2]/2,cy=rect[1]+rect[3]/2,pad=24;
  if(!block)return {x:Math.round(cx-width/2),y:Math.max(0,Math.round(rect[1]-height-6))};
  const [bx,by,bw,bh]=block,clampX=x=>Math.round(Math.min(Math.max(x,bx+pad),bx+bw-width-pad)),clampY=y=>Math.round(Math.min(Math.max(y,by+pad),by+bh-height-pad));
  if(cy<=by)return {x:clampX(cx-width/2),y:Math.round(by+pad+70)};             // entrance on the block's top side
  if(cy>=by+bh)return {x:clampX(cx-width/2),y:Math.round(by+bh-height-pad)};    // bottom side
  if(cx<=bx)return {x:Math.round(bx+pad),y:clampY(cy-height/2)};                // left side
  return {x:Math.round(bx+bw-width-pad),y:clampY(cy-height/2)};                 // right side
}
/** Labels for Cold Storage entrances (Drawings, so the street art stays the same without the module). */
export async function syncColdStorageDrawings(){
  if(!game.user?.isGM||!isLeader())return 0;let changed=0;
  const active=coldStorageActive();
  for(const scene of game.scenes){
    const want=[];
    if(active&&atlasOf(scene)?.id===OVERVIEW_ID)for(const o of overviewColdStorage(atlasOf(scene)))want.push({key:o.key,rect:o.rect,box:o.labelBox,pin:pinOf(o),label:o.label,overview:true});
    else if(active&&atlasOf(scene))for(const d of coldStorage.streetDoors?.[atlasOf(scene).id]||[])want.push({key:d.key,rect:d.rect,block:d.block,label:d.label});
    const cid=csSourceId(scene);if(active&&cid)for(const l of coldStorage.scenes?.[cid]?.labels||[])want.push({key:`cs:${cid}:${l.key}`,rect:l.rect,label:l.label});
    for(const w of want)w.sig=JSON.stringify([w.rect,w.block||null,w.box||null,w.pin||null,w.label]);
    const all=scene.drawings?.filter?.(d=>d.getFlag?.(NS,'csDoor'))||[];
    // Keep a drawing only if it is still wanted at exactly the same place with the same text.
    const keep=d=>{const k=String(d.getFlag(NS,'csDoor')),sig=d.getFlag(NS,'csDoorSig');return want.some(w=>(w.key===k||(w.overview&&`${w.key}:pin`===k))&&w.sig===sig);};
    const drop=all.filter(d=>!keep(d)).map(d=>d.id);
    const have=all.filter(keep);
    if(drop.length){await scene.deleteEmbeddedDocuments('Drawing',drop);changed+=drop.length;}
    const add=want.filter(w=>!have.some(d=>d.getFlag(NS,'csDoor')===w.key)).map(w=>{
      // On the overview the label goes beside its pin (placed so labels never collide); on street maps inside the block.
      const fs=w.overview?OVERVIEW_LABEL.fontSize:20,width=w.overview?w.box.w:Math.max(220,w.label.length*15+40),height=w.overview?w.box.h:52;
      const {x,y}=w.overview?w.box:labelPosition(w,width,height);
      const data={x,y,shape:{type:'r',width,height},strokeWidth:3,strokeColor:'#ff4fd8',strokeAlpha:1,fillType:1,fillColor:'#0a0d10',fillAlpha:0.9,
        text:w.label,fontFamily:'Courier New',fontSize:fs,textColor:'#ff4fd8',textAlpha:1,locked:true,flags:{[NS]:{csDoor:w.key,csDoorSig:w.sig}}};
      const level=targetLevelId(scene);if(level)data.level=level;return data;});
    // Overview: a glowing pin on each building's exact spot, under its label.
    for(const w of want.filter(v=>v.overview&&!have.some(d=>d.getFlag(NS,'csDoor')===`${v.key}:pin`))){
      const pin={x:w.pin.x,y:w.pin.y,shape:{type:'e',width:w.pin.w,height:w.pin.h},strokeWidth:5,strokeColor:'#ff4fd8',strokeAlpha:1,
        fillType:1,fillColor:'#ff4fd8',fillAlpha:0.55,locked:true,flags:{[NS]:{csDoor:`${w.key}:pin`,csDoorSig:w.sig}}};
      const level=targetLevelId(scene);if(level)pin.level=level;add.push(pin);
    }
    if(add.length){await scene.createEmbeddedDocuments('Drawing',add);changed+=add.length;}
  }
  return changed;
}
export function installMapTransit(){
  try{game.settings.register(NS,'autoEnterBuildings',{name:'Walk into buildings automatically',hint:'Off by default: the GM is asked when the whole party reaches an exit. Turn on to send each character through on their own the moment they walk into an entrance or exit. Vehicles still use the token HUD.',scope:'world',config:true,type:Boolean,default:false});}catch(_e){}
  Hooks.on('createScene',scene=>{if(coldStorageActive()&&(csSourceId(scene)||atlasOf(scene)))setTimeout(()=>syncColdStorageDrawings().catch(()=>null),500);});
  fetch(`systems/${NS}/data/cold-storage-links.json`).then(r=>r.ok?r.json():null).then(data=>{setColdStorageLinks(data);return syncColdStorageDrawings();}).catch(error=>console.warn('Altered Carbon | Cold Storage links',error));
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
  // Walking into a building entrance or through an exit takes the character straight through.
  // Only when the token moves INTO the strip (not when it arrives standing in one), never for
  // vehicles or seated riders, and never for moves made by boarding / transit code.
  Hooks.on('preUpdateToken',(doc,changes,options)=>{
    if(!('x' in changes)&&!('y' in changes))return;
    const from=linkAt(doc.parent,doc);options.acFromLink=from?linkId(from):null;
  });
  Hooks.on('updateToken',(doc,changes,options,userId)=>{
    if(userId!==game.user.id||options?.acTransit||options?.acVehicleCarry||!(('x' in changes)||('y' in changes)))return;
    const link=linkAt(doc.parent,doc);if(!link||link.kind==='district')return;
    if(shouldAutoEnter(doc,link,options.acFromLink??null)){
      crossToNextMap(doc).catch(error=>ui.notifications.warn(error.message));return;
    }
    ui.notifications.info(`${doc.name} is at the way to ${link.toName}. Right-click the token → Go to ${link.toName}.`);
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

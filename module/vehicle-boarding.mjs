// Vehicle boarding (v2.4.6)
// - Vehicle tokens get a footprint from their Size (Size 1 → 1×2, Size 2 → 2×3, ...).
// - Characters choose a seat (Driver/Pilot, Gunner, Operator, Passenger) to enter a vehicle.
//   Their token shrinks into that seat and is carried, with rotation, whenever the vehicle moves.
// - Who drives: the Driver seat's player (they are given control of the vehicle token while
//   seated), the vehicle's AI / the GM, or both — set per vehicle.
// All scene writes are done by one active GM; players send requests over the system socket.
import {seatLayout,seatPositions,vehicleFootprint,exitPositions} from './vehicle-seat-math.mjs';

const NS='altered-carbon-rpg',SOCKET=`system.${NS}`,SEAT='vehicleSeat',OCC='vehicleOccupants',GRANT='vehicleDriverGrant';
const esc=v=>foundry.utils.escapeHTML(String(v??''));
const OWNER=()=>CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;

const leaderGM=()=>game.users.activeGM??game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]??null;
const isLeader=()=>leaderGM()?.id===game.user.id;
const isVehicleToken=t=>t?.actor?.type==='vehicle';
const occupantsOf=vt=>{const raw=vt?.getFlag?.(NS,OCC);const out={};if(Array.isArray(raw))for(const o of raw)if(o?.seatId)out[o.seatId]={...o};return out;};
const saveOccupants=(vt,map)=>vt.update({[`flags.${NS}.${OCC}`]:Object.entries(map).map(([seatId,o])=>({...o,seatId}))},{acVehicleCarry:true});
const grantsOf=vt=>{const raw=vt?.getFlag?.(NS,GRANT);const out={};if(Array.isArray(raw))for(const g of raw)if(g?.userId)out[g.userId]=g.before;return out;};
const seatOf=t=>t?.getFlag?.(NS,SEAT)||null;
const controlMode=vt=>String(vt?.actor?.system?.vehicle?.control||'driver');

export {seatLayout,vehicleFootprint};

/* ------------------------------------------------------------------ requests */
async function request(type,data){
  if(isLeader())return HANDLERS[type]({...data,userId:game.user.id});
  if(!leaderGM())throw new Error('A GM must be connected to board or leave vehicles.');
  game.socket.emit(SOCKET,{type:`acVehicle.${type}`,data:{...data,userId:game.user.id}});
  return null;
}
export function boardVehicle(vehicleToken,occupantToken,seatId){return request('board',{sceneId:vehicleToken.parent.id,vehicleTokenId:vehicleToken.id,tokenId:occupantToken.id,seatId});}
export function exitVehicle(occupantToken){return request('exit',{sceneId:occupantToken.parent.id,tokenId:occupantToken.id});}
export function setVehicleControl(vehicleToken,{control,aiPilot}={}){return request('control',{sceneId:vehicleToken.parent.id,vehicleTokenId:vehicleToken.id,control,aiPilot});}

function requireUserCanMove(user,token){
  if(user?.isGM)return;
  if(!token?.actor?.testUserPermission?.(user,'OWNER'))throw new Error(`${user?.name||'That player'} does not control ${token?.name||'that token'}.`);
}
async function announce(vt,text){
  try{await ChatMessage.implementation.create({speaker:{alias:vt.name},content:`<section class="ac-chat-card ac-vehicle-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">VEHICLE</span><strong>${esc(vt.name)}</strong></div></header><p>${text}</p></section>`});}catch(error){console.warn('Altered Carbon | vehicle chat',error);}
}

/* ------------------------------------------------------------------ crew + control */
async function syncCrew(vt,occupants){
  const seats=seatLayout(vt.actor),seen=new Set(),crew=[];
  for(const seat of seats){const o=occupants[seat.id];if(!o||seen.has(o.actorId))continue;seen.add(o.actorId);crew.push({actorId:o.actorId,role:seat.role});}
  try{await vt.actor.update({'system.vehicle.crewAssignments':JSON.stringify(crew)});}catch(error){console.warn('Altered Carbon | crew sync',error);}
}
function driverUsers(occupants,scene){
  const o=occupants.pilot;if(!o)return [];
  const token=scene.tokens.get(o.tokenId),actor=token?.actor;if(!actor)return [];
  return game.users.filter(u=>!u.isGM&&actor.testUserPermission(u,'OWNER'));
}
// Give the driver's players OWNER on the vehicle Actor so they can drag the token; remember
// what each had before so leaving the seat restores it exactly.
async function applyDriverControl(vt,occupants){
  const base=vt.baseActor??game.actors.get(vt.actorId)??vt.actor;if(!base)return;
  const previous=grantsOf(vt);
  const wanted=controlMode(vt)==='ai'?[]:driverUsers(occupants,vt.parent).map(u=>u.id);
  const update={},nextGrant={};
  for(const [userId,before] of Object.entries(previous)){
    if(wanted.includes(userId)){nextGrant[userId]=before;continue;}
    update[`ownership.${userId}`]=before;
  }
  for(const userId of wanted){
    if(Object.hasOwn(nextGrant,userId))continue;
    const before=base.ownership?.[userId]??base.ownership?.default??CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
    if(before===OWNER())continue; // already an owner: nothing to grant or revoke later
    nextGrant[userId]=before;update[`ownership.${userId}`]=OWNER();
  }
  if(Object.keys(update).length)await base.update(update);
  await vt.update({[`flags.${NS}.${GRANT}`]:Object.entries(nextGrant).map(([userId,before])=>({userId,before}))},{acVehicleCarry:true});
}

/* ------------------------------------------------------------------ handlers (leader GM) */
function rectGap(a,b,g){
  const ax2=a.x+a.width*g,ay2=a.y+a.height*g,bx2=b.x+b.width*g,by2=b.y+b.height*g;
  const dx=Math.max(0,a.x-bx2,b.x-ax2),dy=Math.max(0,a.y-by2,b.y-ay2);return Math.hypot(dx,dy)/g;
}
async function placeOccupants(vt,occupants,{animate=true}={}){
  const scene=vt.parent,g=scene.grid.size,seats=seatLayout(vt.actor),pos=seatPositions(vt,seats,g);
  const updates=[];
  for(const seat of seats){const o=occupants[seat.id];if(!o)continue;const t=scene.tokens.get(o.tokenId);if(!t)continue;
    const p=pos[seat.id];updates.push({_id:t.id,x:Math.round(p.x),y:Math.round(p.y),width:0.5,height:0.5,rotation:vt.rotation||0,elevation:vt.elevation||0,sort:(vt.sort||0)+1});}
  if(updates.length)await scene.updateEmbeddedDocuments('Token',updates,{acVehicleCarry:true,animate});
}
const HANDLERS={
  async board({sceneId,vehicleTokenId,tokenId,seatId,userId}){
    const scene=game.scenes.get(sceneId),vt=scene?.tokens.get(vehicleTokenId),ot=scene?.tokens.get(tokenId),user=game.users.get(userId);
    if(!vt||!ot)throw new Error('Vehicle or character token not found on this scene.');
    if(!isVehicleToken(vt))throw new Error(`${vt.name} is not a vehicle.`);
    if(isVehicleToken(ot))throw new Error('A vehicle cannot board another vehicle.');
    requireUserCanMove(user,ot);
    const seats=seatLayout(vt.actor),seat=seats.find(s=>s.id===seatId);if(!seat)throw new Error('That seat does not exist in this vehicle.');
    const occupants=occupantsOf(vt);
    if(occupants[seatId]&&occupants[seatId].tokenId!==ot.id)throw new Error(`${seat.label} is taken by ${occupants[seatId].name}.`);
    if(!user?.isGM&&!seatOf(ot)&&rectGap(ot,vt,scene.grid.size)>1.01)throw new Error(`${ot.name} must be next to ${vt.name} to get in.`);
    // Changing seats in the same vehicle, or hopping from another vehicle.
    const current=seatOf(ot);
    let original={width:ot.width,height:ot.height};
    if(current){
      if(current.vehicleTokenId===vt.id){original=occupants[current.seatId]?.original||original;delete occupants[current.seatId];}
      else{await HANDLERS.exit({sceneId,tokenId,userId,quiet:true});original={width:scene.tokens.get(tokenId).width,height:scene.tokens.get(tokenId).height};}
    }
    occupants[seatId]={tokenId:ot.id,actorId:ot.actor?.id||ot.actorId,name:ot.name,original};
    await saveOccupants(vt,occupants);
    await ot.update({[`flags.${NS}.${SEAT}`]:{vehicleTokenId:vt.id,seatId}},{acVehicleCarry:true});
    await placeOccupants(vt,occupants);
    await syncCrew(vt,occupants);
    await applyDriverControl(vt,occupants);
    await announce(vt,`<strong>${esc(ot.name)}</strong> ${current?.vehicleTokenId===vt.id?'moves to':'gets in and takes'} the <strong>${esc(seat.label)}</strong> seat.${seat.role==='pilot'?(controlMode(vt)==='ai'?' The vehicle AI keeps control.':' They now drive the vehicle.'):''}`);
    return true;
  },
  async exit({sceneId,tokenId,userId,quiet=false}){
    const scene=game.scenes.get(sceneId),ot=scene?.tokens.get(tokenId),user=game.users.get(userId);
    if(!ot)throw new Error('Token not found.');requireUserCanMove(user,ot);
    const seat=seatOf(ot);if(!seat)throw new Error(`${ot.name} is not in a vehicle.`);
    const vt=scene.tokens.get(seat.vehicleTokenId),occupants=occupantsOf(vt);
    const record=occupants[seat.seatId]||{},original=record.original||{width:1,height:1};
    delete occupants[seat.seatId];
    const g=scene.grid.size;let spot={x:ot.x,y:ot.y};
    if(vt){for(let i=0;i<24;i++){const p=exitPositions(vt,i,g);if(!scene.tokens.some(t=>t.id!==ot.id&&!seatOf(t)&&Math.abs(t.x-p.x)<g/2&&Math.abs(t.y-p.y)<g/2)){spot=p;break;}}}
    await ot.update({x:Math.round(spot.x),y:Math.round(spot.y),width:original.width,height:original.height,rotation:0,[`flags.${NS}.${SEAT}`]:null},{acVehicleCarry:true});
    if(vt){
      await saveOccupants(vt,occupants);
      await syncCrew(vt,occupants);await applyDriverControl(vt,occupants);
      if(!quiet)await announce(vt,`<strong>${esc(ot.name)}</strong> gets out.`);
    }
    return true;
  },
  async control({sceneId,vehicleTokenId,control,aiPilot,userId}){
    const scene=game.scenes.get(sceneId),vt=scene?.tokens.get(vehicleTokenId),user=game.users.get(userId);
    if(!vt)throw new Error('Vehicle token not found.');if(!user?.isGM)throw new Error('Only the GM sets who controls a vehicle.');
    const update={};if(['driver','ai','both'].includes(control))update['system.vehicle.control']=control;if(typeof aiPilot==='string')update['system.vehicle.aiPilot']=aiPilot.slice(0,80);
    await vt.actor.update(update);await applyDriverControl(vt,occupantsOf(vt));
    const label={driver:'the driver',ai:`its AI${vt.actor.system.vehicle.aiPilot?` (${esc(vt.actor.system.vehicle.aiPilot)})`:''}`,both:'the driver and its AI'}[vt.actor.system.vehicle.control];
    await announce(vt,`Now controlled by ${label}.`);return true;
  }
};

/* ------------------------------------------------------------------ dialogs */
function myTokens(){
  const controlled=canvas?.tokens?.controlled?.map(t=>t.document).filter(t=>!isVehicleToken(t))||[];
  if(controlled.length)return controlled;
  const char=game.user.character;const t=char?canvas?.tokens?.placeables?.find(p=>p.actor?.id===char.id)?.document:null;
  return t?[t]:[];
}
export async function openSeatPicker(vehicleToken,occupantToken){
  const seats=seatLayout(vehicleToken.actor),occ=occupantsOf(vehicleToken),mine=seatOf(occupantToken);
  const firstFree=(seats.find(s=>occ[s.id]?.tokenId===occupantToken.id)||seats.find(s=>!occ[s.id]))?.id;
  const rows=seats.map(s=>{const o=occ[s.id],own=o?.tokenId===occupantToken.id;return `<label class="ac-seat-option${o&&!own?' taken':''}"><input type="radio" name="seat" value="${s.id}" ${o&&!own?'disabled':''} ${s.id===firstFree?'checked':''}><span><b>${esc(s.label)}</b>${s.role==='pilot'?` <small>${controlMode(vehicleToken)==='ai'?'AI drives':'drives the vehicle'}</small>`:''}</span><em>${o?esc(own?'you':o.name):'free'}</em></label>`;});
  const free=seats.some(s=>!occ[s.id]||occ[s.id].tokenId===occupantToken.id);
  if(!free)return ui.notifications.warn(`${vehicleToken.name} is full.`);
  const form=await foundry.applications.api.DialogV2.input({window:{title:`${occupantToken.name}: get in ${vehicleToken.name}`},content:`<div class="ac-seat-picker">${rows.join('')}</div>${mine&&mine.vehicleTokenId===vehicleToken.id?'<p class="hint">Pick another seat to move.</p>':''}`,ok:{label:mine?'Take seat':'Get in',icon:'fa-solid fa-car-side'}});
  if(!form?.seat)return null;
  try{return await boardVehicle(vehicleToken,occupantToken,form.seat);}catch(error){ui.notifications.warn(error.message);}
}
export async function openBoardDialog(occupantToken){
  const vehicles=(canvas?.tokens?.placeables||[]).map(p=>p.document).filter(isVehicleToken);
  if(!vehicles.length)return ui.notifications.info('There are no vehicles on this scene.');
  const g=canvas.grid.size,list=vehicles.map(v=>({v,d:rectGap(occupantToken,v,g)})).sort((a,b)=>a.d-b.d);
  if(list.length===1||list[0].d<=1.01&&(list[1]?.d??99)>1.01)return openSeatPicker(list[0].v,occupantToken);
  const form=await foundry.applications.api.DialogV2.input({window:{title:`${occupantToken.name}: which vehicle?`},content:`<div class="ac-seat-picker">${list.map(({v,d},i)=>`<label class="ac-seat-option"><input type="radio" name="vehicle" value="${v.id}" ${i===0?'checked':''}><span><b>${esc(v.name)}</b></span><em>${d<=1.01?'adjacent':`${d.toFixed(1)} squares away`}</em></label>`).join('')}</div>`});
  const v=vehicles.find(x=>x.id===form?.vehicle);return v?openSeatPicker(v,occupantToken):null;
}

/* ------------------------------------------------------------------ hooks */
function hudButton(icon,title,onClick){
  const b=document.createElement('button');b.type='button';b.className='control-icon ac-vehicle-hud';b.title=title;b.setAttribute('aria-label',title);b.innerHTML=`<i class="${icon}"></i>`;
  b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();Promise.resolve(onClick()).catch(error=>ui.notifications.warn(error.message));});return b;
}
export function installVehicleBoarding(){
  game.socket.on(SOCKET,async payload=>{
    if(!payload?.type?.startsWith?.('acVehicle.')||!isLeader())return;
    const handler=HANDLERS[payload.type.slice(10)];if(!handler)return;
    try{await handler(payload.data||{});}catch(error){console.warn('Altered Carbon | vehicle request refused',error);
      const user=game.users.get(payload.data?.userId);
      try{await ChatMessage.implementation.create({speaker:{alias:'Vehicle'},whisper:user?[user.id]:[],content:`<p>${esc(error.message)}</p>`});}catch(_e){}
    }
  });

  // Occupants are carried with their vehicle: position, rotation and elevation.
  Hooks.on('updateToken',(doc,changes,options)=>{
    if(!isLeader()||options?.acVehicleCarry||!isVehicleToken(doc))return;
    if(!['x','y','rotation','elevation','width','height'].some(k=>k in changes))return;
    const occ=occupantsOf(doc);if(!Object.keys(occ).length)return;
    placeOccupants(doc,occ).catch(error=>console.warn('Altered Carbon | carry occupants',error));
  });
  // A seated token cannot wander off on its own.
  Hooks.on('preUpdateToken',(doc,changes,options)=>{
    if(options?.acVehicleCarry||!seatOf(doc))return;
    if(['x','y'].some(k=>k in changes)){ui.notifications.info(`${doc.name} is inside a vehicle. Use Get Out first (token HUD).`);return false;}
  });
  // Vehicle footprint from Size when placed, if still the default 1×1.
  Hooks.on('preCreateToken',(doc,data)=>{
    if(doc.actor?.type!=='vehicle')return;
    if(Number(data.width??doc.width)===1&&Number(data.height??doc.height)===1){const f=vehicleFootprint(doc.actor.system.vehicle.size);doc.updateSource({width:f.width,height:f.height,'texture.fit':'contain',lockRotation:false});}
  });
  Hooks.on('preCreateActor',(doc,data)=>{
    if(doc.type!=='vehicle')return;const w=foundry.utils.getProperty(data,'prototypeToken.width'),h=foundry.utils.getProperty(data,'prototypeToken.height');
    if((w??1)===1&&(h??1)===1){const f=vehicleFootprint(foundry.utils.getProperty(data,'system.vehicle.size')??1);doc.updateSource({'prototypeToken.width':f.width,'prototypeToken.height':f.height,'prototypeToken.texture.fit':'contain','prototypeToken.lockRotation':false});}
  });
  // Clean up when a vehicle or occupant token is deleted.
  Hooks.on('deleteToken',(doc)=>{
    if(!isLeader())return;const scene=doc.parent;
    if(isVehicleToken(doc)){const occ=occupantsOf(doc);const g=scene.grid.size;let i=0;const updates=[];
      for(const o of Object.values(occ)){const t=scene.tokens.get(o.tokenId);if(!t)continue;updates.push({_id:t.id,x:doc.x+(i%2)*g,y:doc.y+Math.floor(i/2)*g,width:o.original?.width||1,height:o.original?.height||1,rotation:0,[`flags.${NS}.${SEAT}`]:null});i++;}
      if(updates.length)scene.updateEmbeddedDocuments('Token',updates,{acVehicleCarry:true});
      const grant=grantsOf(doc),base=game.actors.get(doc.actorId);if(base&&Object.keys(grant).length)base.update(Object.fromEntries(Object.entries(grant).map(([u,b])=>[`ownership.${u}`,b])));
      return;}
    const seat=seatOf(doc);if(seat){const vt=scene.tokens.get(seat.vehicleTokenId);if(vt){const occ=occupantsOf(vt);delete occ[seat.seatId];saveOccupants(vt,occ).then(()=>syncCrew(vt,occ)).then(()=>applyDriverControl(vt,occ));}}
  });
  // Token HUD buttons.
  Hooks.on('renderTokenHUD',(hud,html)=>{
    try{
      const root=html instanceof HTMLElement?html:html?.[0];const doc=hud.document??hud.object?.document;if(!root||!doc)return;
      const col=root.querySelector('.col.right')||root.querySelector('.right');if(!col)return;
      if(isVehicleToken(doc)){
        const mine=myTokens().filter(t=>t.parent?.id===doc.parent?.id);
        if(mine.length)col.append(hudButton('fa-solid fa-car-side','Get in this vehicle (selected token)',()=>openSeatPicker(doc,mine[0])));
        if(game.user.isGM)col.append(hudButton('fa-solid fa-users','Who is inside / control',()=>openVehicleControl(doc)));
      }else if(seatOf(doc)){
        col.append(hudButton('fa-solid fa-person-walking-arrow-right','Get out of the vehicle',()=>exitVehicle(doc)));
        const vt=doc.parent.tokens.get(seatOf(doc).vehicleTokenId);if(vt)col.append(hudButton('fa-solid fa-arrows-rotate','Change seat',()=>openSeatPicker(vt,doc)));
      }else if((canvas?.tokens?.placeables||[]).some(p=>isVehicleToken(p.document))&&doc.actor?.type!=='vehicle'){
        col.append(hudButton('fa-solid fa-car-side','Get in a vehicle',()=>openBoardDialog(doc)));
      }
    }catch(error){console.warn('Altered Carbon | vehicle HUD',error);}
  });
}

/** GM: list occupants, eject anyone, set control mode. */
export async function openVehicleControl(vt){
  const seats=seatLayout(vt.actor),occ=occupantsOf(vt),v=vt.actor.system.vehicle;
  const rows=seats.map(s=>`<li><b>${esc(s.label)}</b>: ${occ[s.id]?`${esc(occ[s.id].name)} <label><input type="checkbox" name="eject-${s.id}"> get out</label>`:'<em>free</em>'}</li>`).join('');
  const form=await foundry.applications.api.DialogV2.input({window:{title:`${vt.name}: seats and control`},content:`<ul class="ac-seat-list">${rows}</ul>
    <label><span>Who drives</span><select name="control"><option value="driver" ${v.control==='driver'?'selected':''}>The player in the Driver seat</option><option value="ai" ${v.control==='ai'?'selected':''}>The vehicle's AI (GM moves it)</option><option value="both" ${v.control==='both'?'selected':''}>Both: driver and AI</option></select></label>
    <label><span>Vehicle AI name (optional)</span><input type="text" name="aiPilot" value="${esc(v.aiPilot||'')}" maxlength="80"></label>`});
  if(!form)return;
  for(const s of seats)if(form[`eject-${s.id}`]&&occ[s.id]){const t=vt.parent.tokens.get(occ[s.id].tokenId);if(t)await exitVehicle(t);}
  if(form.control!==v.control||String(form.aiPilot||'')!==String(v.aiPilot||''))await setVehicleControl(vt,{control:form.control,aiPilot:String(form.aiPilot||'')});
}

// Vehicle abilities (v2.5.6). Each vehicle lists its unique abilities in
// flags['altered-carbon-rpg'].vehicleAbilities = [{key, seats?}] ("seats" limits an ability to those seats).
// World copies made before v2.5.6 fall back to DEFAULT_ABILITIES by vehicle name.
//
// Mechanics:
//   Pilot checks (driver seat)   autopilot +3 gear; lights & siren +1 Bonus Die; off the road: -2 unless
//                                Off-road (+1 Bonus Die instead), Goes where cars can't or Anti-Grav.
//   Attacks on riders            enclosed seat +2 Difficulty; privacy glass a further +2; exposed seats none.
//   Riders in a load bay         Perception +3 Difficulty; no attacks out.
//   Silent motor                 Perception checks while targeting it (or its rider) +2 Difficulty.
//   Prisoner cage                caged riders cannot get out or move seats; someone else or the GM lets them out.
//   Open sides                   board from 2 squares away.        Folds to carry   fold / unfold on the token HUD.
//   Police kit                   lights & siren (art, animated light, sound) and a plate scanner.
//   Autopilot                    anyone aboard can pick a Bay City destination (see map-transit.mjs).
const NS='altered-carbon-rpg',SOCKET=`system.${NS}`;
const esc=v=>foundry.utils.escapeHTML(String(v??''));
const leaderGM=()=>game.users.activeGM??game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]??null;
const isLeader=()=>leaderGM()?.id===game.user.id;

export const DEFAULT_ABILITIES=Object.freeze({"Airbike": [{"key": "antiGrav"}, {"key": "exposed"}], "Aircar": [{"key": "antiGrav"}], "Sprocket BMX": [{"key": "nimble"}, {"key": "exposed"}], "Kick-Glide E-Scooter": [{"key": "nimble"}, {"key": "silent"}, {"key": "foldable"}, {"key": "exposed"}], "Courier E-Bike": [{"key": "exposed"}], "Vespina Mag-Scoot": [{"key": "exposed"}], "Hillcrawler Scrambler": [{"key": "offroad"}, {"key": "exposed"}], "Kestrel Street Bike": [{"key": "exposed"}], "Iron Saint Cruiser": [{"key": "exposed"}], "BCPD Pursuit Bike": [{"key": "policeKit"}, {"key": "exposed"}], "Corvo Diavolo Superbike": [{"key": "exposed"}], "Lumen Hubless Hyperbike": [{"key": "exposed"}], "Fairway Runabout": [{"key": "openSides"}, {"key": "exposed"}], "Bubble Pod City Car": [{"key": "nimble"}], "Bay City Autocab": [{"key": "autopilot"}], "Kitsu Rally Hatch": [], "Haulback Pickup": [{"key": "offroad"}, {"key": "exposed", "seats": ["passenger-2", "passenger-3"]}], "Courier Panel Van": [{"key": "windowless", "seats": ["passenger-2", "passenger-3", "passenger-4"]}], "Revenant V-12 Muscle Car": [], "BCPD Interceptor": [{"key": "policeKit"}, {"key": "cage", "seats": ["passenger-2", "passenger-3"]}], "Kitsune GT Coupe": [], "Cerberus Supercharged Roadster": [{"key": "exposed"}], "Dune Skiff Buggy": [{"key": "offroad"}, {"key": "exposed"}], "Meth Stretch Limousine": [{"key": "autopilot"}, {"key": "privacy"}], "CTAC Rhino Armoured Car": [{"key": "turret"}]});
export const LIGHTS_ART=Object.freeze({"BCPD Pursuit Bike": "systems/altered-carbon-rpg/assets/tokens/vehicles/bcpd-pursuit-bike-lights.webp", "BCPD Interceptor": "systems/altered-carbon-rpg/assets/tokens/vehicles/bcpd-interceptor-lights.webp"});

export const ABILITIES=Object.freeze({
  autopilot:{label:'Autopilot / self-driving',icon:'fa-solid fa-robot',text:'The driver gets a +3 gear bonus on Pilot checks. Anyone aboard can choose any Bay City destination from the travel list, and the vehicle takes everyone there.'},
  offroad:{label:'Off-road',icon:'fa-solid fa-mountain',text:'No off-road penalty. The driver gets +1 Bonus Die on Pilot checks while the vehicle is off the road (blocks, parks, rubble, storm drains).'},
  nimble:{label:'Goes where cars can\'t',icon:'fa-solid fa-person-running',text:'No off-road penalty: alleys, stairs, crowds and blocks are open to it.'},
  antiGrav:{label:'Anti-Grav',icon:'fa-solid fa-feather',text:'Flies over the street grid, so no off-road penalty. Uses the Anti-Grav Vehicle Pilot specialization and has controlled descent (Core p.257).'},
  policeKit:{label:'Police kit',icon:'fa-solid fa-tower-broadcast',text:'Lights and siren (token HUD): while they are on, the driver gets +1 Bonus Die on Pilot checks as traffic clears. Plate scanner (token HUD): target another vehicle to see whose it is.'},
  cage:{label:'Prisoner cage',icon:'fa-solid fa-lock',text:'The caged seats lock from outside. Someone in the cage cannot get out or change seats; a character in the front or beside the vehicle, or the GM, must let them out.'},
  exposed:{label:'Exposed seats',icon:'fa-solid fa-person-rays',text:'Riders in these seats have no cover from the vehicle and can be attacked directly. (Riders in enclosed seats can only be shot through the body: +2 Difficulty to attacks against them.)'},
  windowless:{label:'Windowless load bay',icon:'fa-solid fa-eye-slash',text:'Riders in the load bay cannot see out: +3 Difficulty to Perception checks, and they cannot attack out of the vehicle.'},
  privacy:{label:'Privacy glass',icon:'fa-solid fa-user-secret',text:'Nobody outside can see who is inside: attacks against occupants take a further +2 Difficulty.'},
  silent:{label:'Silent motor',icon:'fa-solid fa-volume-xmark',text:'Perception checks made while targeting this vehicle or its rider take +2 Difficulty.'},
  foldable:{label:'Folds to carry',icon:'fa-solid fa-suitcase',text:'When nobody is on it, a character beside it can fold it up and carry it (token HUD), then unfold it next to them later.'},
  openSides:{label:'Open sides',icon:'fa-solid fa-door-open',text:'Anyone within 2 squares can jump on.'},
  turret:{label:'Roof turret',icon:'fa-solid fa-crosshairs',text:'Roof Turret Railgun on a Gunner seat. While someone mans it, Fire from the Weapons panel or by right-clicking the vehicle or the gunner. Fire Control is a Gear Bonus.'}
});

/* ------------------------------------------------------------------ pure helpers */
export function abilitiesOf(actor){
  const f=actor?.getFlag?.(NS,'vehicleAbilities')??actor?.flags?.[NS]?.vehicleAbilities;
  if(Array.isArray(f))return f;
  return DEFAULT_ABILITIES[String(actor?.name||'').trim()]||[];
}
/** True if the vehicle has the ability (for seat-limited abilities, in that seat when seatId is given). */
export function hasAbility(actor,key,seatId=null){return abilitiesOf(actor).some(a=>a?.key===key&&(!seatId||!Array.isArray(a.seats)||a.seats.includes(seatId)));}
export const isCagedSeat=(actor,seatId)=>Boolean(seatId)&&hasAbility(actor,'cage',seatId);
export const isExposedSeat=(actor,seatId)=>hasAbility(actor,'exposed',seatId)||hasAbility(actor,'openSides');

/** Driver's Pilot check modifiers. zoneKind: 'road' | 'junction' | 'land' | null. */
export function pilotModifiers({vehicle,seatId,zoneKind=null,lightsOn=false}){
  const out={difficulty:0,bonusDice:0,gearBonuses:[],notes:[]};
  if(seatId!=='pilot'||!vehicle)return out;
  if(hasAbility(vehicle,'autopilot')){out.gearBonuses.push(3);out.notes.push(`${vehicle.name}: Autopilot (+3 gear)`);}
  if(lightsOn&&hasAbility(vehicle,'policeKit')){out.bonusDice++;out.notes.push('Lights and siren: traffic clears (+1 Bonus Die)');}
  if(zoneKind==='land'){
    if(hasAbility(vehicle,'offroad')){out.bonusDice++;out.notes.push('Off-road vehicle off the road (+1 Bonus Die)');}
    else if(hasAbility(vehicle,'nimble')||hasAbility(vehicle,'antiGrav'))out.notes.push(`${vehicle.name} goes where cars can't: no off-road penalty`);
    else{out.difficulty+=2;out.notes.push('Off the road (+2 Difficulty)');}
  }
  return out;
}
/** Modifiers for a rider's own checks (any seat). */
export function riderModifiers({vehicle,seatId,attribute,isAttack}){
  const out={difficulty:0,notes:[],blocked:false,reason:''};
  if(!vehicle||!hasAbility(vehicle,'windowless',seatId))return out;
  if(isAttack)return {...out,blocked:true,reason:`You cannot see out of the ${vehicle.name}'s load bay to attack.`};
  if(attribute==='perception'){out.difficulty+=3;out.notes.push('Load bay: cannot see out (+3 Difficulty)');}
  return out;
}
/** Modifiers from the roller's target. target = {vehicle, seatId} for a rider, or {vehicle, isVehicle:true}. */
export function targetModifiers({vehicle,seatId=null,isVehicle=false,isAttack=false,attribute=''}){
  const out={difficulty:0,notes:[]};if(!vehicle)return out;
  if(attribute==='perception'&&hasAbility(vehicle,'silent')){out.difficulty+=2;out.notes.push(`${vehicle.name}: silent motor (+2 Difficulty)`);}
  if(isAttack&&!isVehicle){
    if(!isExposedSeat(vehicle,seatId)){out.difficulty+=2;out.notes.push(`Target inside the ${vehicle.name}: shooting through the body (+2 Difficulty)`);}
    if(hasAbility(vehicle,'privacy')){out.difficulty+=2;out.notes.push(`${vehicle.name}: privacy glass, target unseen (+2 Difficulty)`);}
  }
  return out;
}

/* ------------------------------------------------------------------ scene helpers */
const seatOf=t=>t?.getFlag?.(NS,'vehicleSeat')||null;
export function seatInfo(token){
  const seat=seatOf(token);if(!seat)return null;
  const vt=token.parent?.tokens?.get(seat.vehicleTokenId);return vt?{vt,vehicle:vt.actor,seatId:seat.seatId}:null;
}
const lightsOn=vt=>Boolean(vt?.getFlag?.(NS,'lightsOn'));
const zoneCache=new Map();
export function registerAtlasZones(atlas){for(const m of atlas?.maps||[])zoneCache.set(m.id,m.zones||[]);}
/** Kind of street-atlas zone under a token's centre, or null off the atlas. */
export function zoneKindAt(token){
  const scene=token?.parent,id=scene?.getFlag?.(NS,'streetAtlas')?.id;const zones=id&&zoneCache.get(id);if(!zones)return null;
  const g=scene.grid?.size||100,cx=Number(token.x)+Number(token.width||1)*g/2,cy=Number(token.y)+Number(token.height||1)*g/2;
  return zones.find(z=>cx>=z.rect[0]&&cx<z.rect[0]+z.rect[2]&&cy>=z.rect[1]&&cy<z.rect[1]+z.rect[3])?.kind||null;
}
function tokensOfActor(actor){
  if(actor?.token)return [actor.token];
  const scene=globalThis.canvas?.scene??game.scenes?.viewed;if(!scene)return [];
  return scene.tokens.filter(t=>t.actorId===actor?.id);
}

/** Everything vehicles add to one check. Never throws: a broken lookup only drops the modifiers. */
export function vehicleRollModifiers(actor,skill,options={},attribute=''){
  const out={blocked:false,reason:'',difficulty:0,bonusDice:0,gearBonuses:[],notes:[]};
  try{
    const isAttack=options.adjudicationKind==='attack',skillId=String(skill?.name||'').toLowerCase();
    const mine=tokensOfActor(actor).map(seatInfo).find(Boolean);
    if(mine){
      if(skillId==='pilot'){const p=pilotModifiers({vehicle:mine.vehicle,seatId:mine.seatId,zoneKind:zoneKindAt(mine.vt),lightsOn:lightsOn(mine.vt)});
        out.difficulty+=p.difficulty;out.bonusDice+=p.bonusDice;out.gearBonuses.push(...p.gearBonuses);out.notes.push(...p.notes);}
      const r=riderModifiers({vehicle:mine.vehicle,seatId:mine.seatId,attribute,isAttack});
      if(r.blocked)return {...out,blocked:true,reason:r.reason};out.difficulty+=r.difficulty;out.notes.push(...r.notes);
    }
    const target=[...(game.user?.targets||[])].map(t=>t.document??t)[0];
    if(target){
      const rider=seatInfo(target);
      const t=rider?targetModifiers({vehicle:rider.vehicle,seatId:rider.seatId,isAttack,attribute})
        :target.actor?.type==='vehicle'?targetModifiers({vehicle:target.actor,isVehicle:true,isAttack,attribute}):null;
      if(t){out.difficulty+=t.difficulty;out.notes.push(...t.notes);}
    }
  }catch(error){console.warn('Altered Carbon | vehicle roll modifiers',error);}
  return out;
}

/* ------------------------------------------------------------------ GM-side actions */
const canDrive=(user,vt)=>{
  if(user?.isGM||vt.actor?.testUserPermission?.(user,'OWNER'))return true;
  const occ=vt.getFlag?.(NS,'vehicleOccupants');const pilot=Array.isArray(occ)?occ.find(o=>o.seatId==='pilot'):null;
  return Boolean(pilot&&vt.parent?.tokens?.get(pilot.tokenId)?.actor?.testUserPermission?.(user,'OWNER'));
};
function sirenLight(){
  const anim=CONFIG?.Canvas?.lightAnimations||{};const type=anim.siren?'siren':anim.revolving?'revolving':'pulse';
  return {dim:5,bright:1.5,color:'#3d5bff',alpha:0.55,angle:360,animation:{type,speed:7,intensity:7}};
}
const ACTIONS={
  async lights({sceneId,vehicleTokenId,userId}){
    const scene=game.scenes.get(sceneId),vt=scene?.tokens.get(vehicleTokenId),user=game.users.get(userId);
    if(!vt||!hasAbility(vt.actor,'policeKit'))throw new Error('That vehicle has no lights and siren.');
    if(!canDrive(user,vt))throw new Error(`${user?.name||'That player'} is not driving ${vt.name}.`);
    const on=!lightsOn(vt);
    if(on){
      const saved={src:vt.texture?.src||'',light:vt.light?.toObject?.()??foundry.utils.deepClone(vt.light||{})};
      const lit=LIGHTS_ART[vt.actor?.name]||null;
      await vt.update({[`flags.${NS}.lightsOn`]:true,[`flags.${NS}.lightsSaved`]:saved,...(lit?{'texture.src':lit}:{}),light:sirenLight()},{acVehicleCarry:true});
      try{foundry.audio.AudioHelper.play({src:`systems/${NS}/assets/sounds/siren.ogg`,volume:0.5,autoplay:true,loop:false},true);}catch(_e){}
    }else{
      const saved=vt.getFlag(NS,'lightsSaved')||{};
      await vt.update({[`flags.${NS}.lightsOn`]:false,...(saved.src?{'texture.src':saved.src}:{}),light:saved.light&&Object.keys(saved.light).length?saved.light:{dim:0,bright:0,animation:{type:null}}},{acVehicleCarry:true});
    }
    await card(vt,on?'<strong>Lights and siren on.</strong> Traffic scatters: the driver gets +1 Bonus Die on Pilot checks.':'Lights and siren off.');
    return on;
  },
  async scan({sceneId,vehicleTokenId,targetTokenId,userId}){
    const scene=game.scenes.get(sceneId),vt=scene?.tokens.get(vehicleTokenId),target=scene?.tokens.get(targetTokenId),user=game.users.get(userId);
    if(!vt||!hasAbility(vt.actor,'policeKit'))throw new Error('That vehicle has no plate scanner.');
    const aboard=scene.tokens.some(t=>seatInfo(t)?.vt?.id===vt.id&&t.actor?.testUserPermission?.(user,'OWNER'));
    if(!canDrive(user,vt)&&!aboard)throw new Error(`${user?.name||'That player'} is not in ${vt.name}.`);
    if(target?.actor?.type!=='vehicle')throw new Error('Target a vehicle to scan its plate.');
    const owners=game.users.filter(u=>!u.isGM&&target.actor.testUserPermission?.(u,'OWNER')).map(u=>u.character?.name||u.name);
    const plate=(target.id.slice(-6)).toUpperCase();
    const text=`<strong>Plate ${esc(plate)}</strong>: ${esc(target.actor.name)}. Registered to: <strong>${owners.length?owners.map(esc).join(', '):'no registration on file'}</strong>.`;
    await ChatMessage.implementation.create({speaker:{alias:`${vt.name} · plate scanner`},whisper:[userId,...game.users.filter(u=>u.isGM).map(u=>u.id)],content:`<section class="ac-chat-card ac-vehicle-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">BCPD PLATE SCAN</span><strong>${esc(target.name)}</strong></div></header><p>${text}</p></section>`});
    return true;
  },
  async fold({sceneId,vehicleTokenId,carrierTokenId,userId}){
    const scene=game.scenes.get(sceneId),vt=scene?.tokens.get(vehicleTokenId),carrier=scene?.tokens.get(carrierTokenId),user=game.users.get(userId);
    if(!vt||!hasAbility(vt.actor,'foldable'))throw new Error('That vehicle does not fold.');
    if(!carrier||carrier.actor?.type==='vehicle')throw new Error('Choose the character who will carry it.');
    if(!user?.isGM&&!carrier.actor?.testUserPermission?.(user,'OWNER'))throw new Error(`${user?.name||'That player'} does not control ${carrier.name}.`);
    const occ=vt.getFlag(NS,'vehicleOccupants');if(Array.isArray(occ)&&occ.length)throw new Error(`Someone is still on the ${vt.name}.`);
    const g=scene.grid.size;const gap=Math.max(0,Math.max(vt.x-(carrier.x+carrier.width*g),carrier.x-(vt.x+vt.width*g),vt.y-(carrier.y+carrier.height*g),carrier.y-(vt.y+vt.height*g)))/g;
    if(!user?.isGM&&gap>1.01)throw new Error(`${carrier.name} must be next to the ${vt.name}.`);
    const list=[...(carrier.actor.getFlag(NS,'foldedVehicles')||[])];
    const data=vt.toObject();delete data._id;
    list.push({name:vt.name,img:vt.texture?.src||'',data});
    await carrier.actor.setFlag(NS,'foldedVehicles',list);
    await scene.deleteEmbeddedDocuments('Token',[vt.id]);
    await card(vt,`${esc(carrier.name)} folds up the <strong>${esc(vt.name)}</strong> and carries it.`);
    return true;
  },
  async unfold({sceneId,carrierTokenId,index=0,userId}){
    const scene=game.scenes.get(sceneId),carrier=scene?.tokens.get(carrierTokenId),user=game.users.get(userId);
    if(!carrier)throw new Error('Character not found.');
    if(!user?.isGM&&!carrier.actor?.testUserPermission?.(user,'OWNER'))throw new Error(`${user?.name||'That player'} does not control ${carrier.name}.`);
    const list=[...(carrier.actor.getFlag(NS,'foldedVehicles')||[])];const item=list[Number(index)||0];if(!item)throw new Error(`${carrier.name} is not carrying anything folded.`);
    const {retarget}=await import('./map-transit.mjs');
    const data=retarget(foundry.utils.deepClone(item.data),scene);const g=scene.grid.size;
    data.x=Math.round(carrier.x+carrier.width*g);data.y=Math.round(carrier.y);
    foundry.utils.setProperty(data,`flags.${NS}.vehicleOccupants`,[]);
    await scene.createEmbeddedDocuments('Token',[data]);
    list.splice(Number(index)||0,1);await carrier.actor.setFlag(NS,'foldedVehicles',list);
    await card({name:item.name},`${esc(carrier.name)} unfolds the <strong>${esc(item.name)}</strong>.`);
    return true;
  }
};
async function card(vt,text){try{await ChatMessage.implementation.create({speaker:{alias:vt.name},content:`<section class="ac-chat-card ac-vehicle-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">VEHICLE</span><strong>${esc(vt.name)}</strong></div></header><p>${text}</p></section>`});}catch(_e){}}
async function request(type,data){
  const payload={...data,userId:game.user.id};
  if(isLeader())return ACTIONS[type](payload);
  if(!leaderGM())throw new Error('A GM must be connected.');
  game.socket.emit(SOCKET,{type:`acAbility.${type}`,data:payload});return null;
}
export const toggleLights=vt=>request('lights',{sceneId:vt.parent.id,vehicleTokenId:vt.id});
export const scanPlate=(vt,target)=>request('scan',{sceneId:vt.parent.id,vehicleTokenId:vt.id,targetTokenId:target.id});
export const foldVehicle=(vt,carrier)=>request('fold',{sceneId:vt.parent.id,vehicleTokenId:vt.id,carrierTokenId:carrier.id});
export const unfoldVehicle=(carrier,index=0)=>request('unfold',{sceneId:carrier.parent.id,carrierTokenId:carrier.id,index});
export const _actions=ACTIONS; // for tests

/* ------------------------------------------------------------------ install */
function hudButton(icon,title,fn){const b=document.createElement('button');b.type='button';b.className='control-icon ac-ability-hud';b.title=title;b.dataset.tooltip=title;b.setAttribute('aria-label',title);b.innerHTML=`<i class="${icon}" inert></i>`;
  b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();Promise.resolve().then(fn).catch(error=>ui.notifications.warn(error.message));});return b;}
export function installVehicleAbilities(){
  fetch(`systems/${NS}/data/bay-city-street-atlas.json`).then(r=>r.ok?r.json():null).then(registerAtlasZones).catch(()=>null);
  game.socket.on(SOCKET,async payload=>{
    if(!String(payload?.type||'').startsWith('acAbility.')||!isLeader())return;
    const fn=ACTIONS[payload.type.slice(10)];if(!fn)return;
    try{await fn(payload.data||{});}catch(error){
      try{await ChatMessage.implementation.create({speaker:{alias:'Vehicle'},whisper:[payload.data?.userId].filter(Boolean),content:`<p>${esc(error.message)}</p>`});}catch(_e){}
    }
  });
  Hooks.on('renderTokenHUD',(hud,html)=>{
    try{
      const root=html instanceof HTMLElement?html:html?.[0];const doc=hud.document??hud.object?.document;if(!root||!doc)return;
      const col=root.querySelector('.col.right')||root.querySelector('.right');if(!col||col.querySelector('.ac-ability-hud'))return;
      const vt=doc.actor?.type==='vehicle'?doc:seatInfo(doc)?.vt;
      if(vt&&hasAbility(vt.actor,'policeKit')){
        col.append(hudButton('fa-solid fa-tower-broadcast',lightsOn(vt)?'Lights and siren: turn off':'Lights and siren: turn on',()=>toggleLights(vt)));
        col.append(hudButton('fa-solid fa-barcode','Scan the plate of the targeted vehicle',()=>{const t=[...game.user.targets][0]?.document;if(!t)throw new Error('Target a vehicle first (T key while hovering it).');return scanPlate(vt,t);}));
      }
      if(doc.actor?.type==='vehicle'&&hasAbility(doc.actor,'foldable'))col.append(hudButton('fa-solid fa-suitcase','Fold up and carry',()=>{
        const carrier=(canvas.tokens.controlled||[]).map(t=>t.document).find(t=>t.id!==doc.id&&t.actor?.type!=='vehicle');
        if(!carrier)throw new Error('Select the character who will carry it as well (shift-click), then try again.');return foldVehicle(doc,carrier);}));
      const folded=doc.actor?.type!=='vehicle'?(doc.actor?.getFlag?.(NS,'foldedVehicles')||[]):[];
      folded.forEach((f,i)=>col.append(hudButton('fa-solid fa-box-open',`Unfold the ${f.name}`,()=>unfoldVehicle(doc,i))));
    }catch(error){console.warn('Altered Carbon | ability HUD',error);}
  });
  // What a target in or on a vehicle means for an attack.
  Hooks.on('targetToken',(user,token,targeted)=>{
    if(user?.id!==game.user.id||!targeted)return;const info=seatInfo(token.document??token);if(!info)return;
    const name=(token.document??token).name;
    if(isExposedSeat(info.vehicle,info.seatId))ui.notifications.info(`${name} is exposed on the ${info.vehicle.name}: attacks hit them directly.`);
    else ui.notifications.info(`${name} is inside the ${info.vehicle.name}: attacks are +2 Difficulty${hasAbility(info.vehicle,'privacy')?', +2 more for privacy glass':''}.`);
  });
}

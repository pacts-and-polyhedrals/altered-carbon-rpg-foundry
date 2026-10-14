import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {seatLayout} from '../module/vehicle-seat-math.mjs';
import {ABILITIES,DEFAULT_ABILITIES,LIGHTS_ART,abilitiesOf,hasAbility,isCagedSeat,isExposedSeat,pilotModifiers,riderModifiers,targetModifiers,registerAtlasZones,vehicleRollModifiers} from '../module/vehicle-abilities.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const NS='altered-carbon-rpg';
const data=JSON.parse(readFileSync(join(root,'data/street-vehicles.json'),'utf8'));
const atlas=JSON.parse(readFileSync(join(root,'data/bay-city-street-atlas.json'),'utf8'));
const V=name=>{const v=data.vehicles.find(x=>x.name===name);return {name,system:v.system,flags:{[NS]:{vehicleAbilities:v.abilities}}};};
globalThis.foundry??={utils:{escapeHTML:s=>s}};

test('every unique ability is defined, seat-limited abilities name real seats, and old world copies fall back by name', ()=>{
  for(const v of data.vehicles){
    assert.ok(Array.isArray(v.abilities),v.name);
    const seats=seatLayout({system:v.system}).map(s=>s.id);
    for(const a of v.abilities){
      assert.ok(ABILITIES[a.key],`${v.name}: ${a.key}`);
      for(const s of a.seats||[])assert.ok(seats.includes(s),`${v.name}: seat ${s}`);
    }
    assert.deepEqual(DEFAULT_ABILITIES[v.name],v.abilities,`${v.name} fallback matches`);
    assert.deepEqual(abilitiesOf({name:v.name}),v.abilities,'unflagged copy uses the fallback');
  }
  assert.ok(hasAbility({name:'Airbike'},'antiGrav'),'core Airbike is Anti-Grav');
  assert.equal(abilitiesOf({name:'Ground Car'}).length,0,'Ground Car: none');
  for(const n of ['Kitsu Rally Hatch','Revenant V-12 Muscle Car','Kitsune GT Coupe'])assert.equal(V(n).flags[NS].vehicleAbilities.length,0,`${n}: none`);
  for(const src of Object.values(LIGHTS_ART))assert.ok(existsSync(join(root,src.replace('systems/altered-carbon-rpg/',''))),src);
  assert.ok(existsSync(join(root,'assets/sounds/siren.ogg')));
});

test('driver modifiers: autopilot, lights and siren, off the road', ()=>{
  const cab=V('Bay City Autocab'),pickup=V('Haulback Pickup'),hatch=V('Kitsu Rally Hatch'),bmx=V('Sprocket BMX'),cop=V('BCPD Interceptor');
  assert.deepEqual(pilotModifiers({vehicle:cab,seatId:'pilot'}).gearBonuses,[3]);
  assert.deepEqual(pilotModifiers({vehicle:cab,seatId:'passenger-1'}).gearBonuses,[],'only the driver');
  assert.equal(pilotModifiers({vehicle:pickup,seatId:'pilot',zoneKind:'land'}).bonusDice,1,'off-road: +1 Bonus Die off the road');
  assert.equal(pilotModifiers({vehicle:pickup,seatId:'pilot',zoneKind:'road'}).bonusDice,0);
  assert.equal(pilotModifiers({vehicle:hatch,seatId:'pilot',zoneKind:'land'}).difficulty,2,'ordinary car off the road: +2 Difficulty');
  assert.equal(pilotModifiers({vehicle:bmx,seatId:'pilot',zoneKind:'land'}).difficulty,0,'goes where cars cannot');
  assert.equal(pilotModifiers({vehicle:{name:'Airbike'},seatId:'pilot',zoneKind:'land'}).difficulty,0,'anti-grav');
  assert.equal(pilotModifiers({vehicle:cop,seatId:'pilot',lightsOn:true}).bonusDice,1,'lights and siren');
  assert.equal(pilotModifiers({vehicle:cop,seatId:'pilot',lightsOn:false}).bonusDice,0);
});

test('riders: enclosed, exposed, privacy glass, load bay, silent motor', ()=>{
  const cop=V('BCPD Interceptor'),roadster=V('Cerberus Supercharged Roadster'),limo=V('Meth Stretch Limousine'),van=V('Courier Panel Van'),pickup=V('Haulback Pickup'),scooter=V('Kick-Glide E-Scooter'),golf=V('Fairway Runabout');
  assert.equal(targetModifiers({vehicle:cop,seatId:'pilot',isAttack:true}).difficulty,2,'enclosed rider');
  assert.equal(targetModifiers({vehicle:roadster,seatId:'pilot',isAttack:true}).difficulty,0,'open top');
  assert.equal(targetModifiers({vehicle:limo,seatId:'passenger-3',isAttack:true}).difficulty,4,'enclosed + privacy glass');
  assert.equal(targetModifiers({vehicle:pickup,seatId:'passenger-2',isAttack:true}).difficulty,0,'open bed');
  assert.equal(targetModifiers({vehicle:pickup,seatId:'passenger-1',isAttack:true}).difficulty,2,'pickup cab');
  assert.ok(isExposedSeat(golf,'passenger-3'));
  assert.equal(targetModifiers({vehicle:scooter,isVehicle:true,attribute:'perception'}).difficulty,2,'silent motor');
  assert.equal(riderModifiers({vehicle:van,seatId:'passenger-2',attribute:'perception'}).difficulty,3,'load bay');
  assert.equal(riderModifiers({vehicle:van,seatId:'passenger-1',attribute:'perception'}).difficulty,0,'front seat sees out');
  assert.equal(riderModifiers({vehicle:van,seatId:'passenger-3',isAttack:true}).blocked,true,'no attacks out of the load bay');
  assert.ok(isCagedSeat(cop,'passenger-2')&&isCagedSeat(cop,'passenger-3')&&!isCagedSeat(cop,'passenger-1')&&!isCagedSeat(cop,'pilot'));
});

test('a roll picks up the vehicle: off-road pickup on a block, attack on a limousine passenger', ()=>{
  registerAtlasZones(atlas);
  const m=atlas.maps.find(x=>x.id==='BCS-LICKTOWN'),land=m.zones.find(z=>z.kind==='land');
  const pickup=V('Haulback Pickup'),limo=V('Meth Stretch Limousine');
  const tokens=[];const scene={grid:{size:100},getFlag:(ns,k)=>k==='streetAtlas'?{id:m.id}:null,tokens:Object.assign(tokens,{get:i=>tokens.find(t=>t.id===i)})};
  const tok=(d)=>{const t={...d,parent:scene,getFlag:(ns,k)=>d.flags?.[ns]?.[k]};tokens.push(t);return t;};
  tok({id:'truck',actor:pickup,x:land.rect[0]+20,y:land.rect[1]+20,width:2,height:4});
  const driver={id:'a1',name:'Kovacs'};tok({id:'kov',actorId:'a1',actor:driver,x:0,y:0,width:.5,height:.5,flags:{[NS]:{vehicleSeat:{vehicleTokenId:'truck',seatId:'pilot'}}}});
  tok({id:'lim',actor:limo,x:0,y:0,width:2,height:5});
  const target=tok({id:'vip',actor:{name:'Bancroft'},x:0,y:0,width:.5,height:.5,flags:{[NS]:{vehicleSeat:{vehicleTokenId:'lim',seatId:'passenger-4'}}}});
  globalThis.canvas={scene};globalThis.game={scenes:{viewed:scene},user:{targets:new Set()}};
  const pilot=vehicleRollModifiers(driver,{name:'Pilot'},{},'acuity');
  assert.equal(pilot.bonusDice,1);assert.ok(pilot.notes.some(n=>/Off-road/.test(n)));
  game.user.targets=new Set([{document:target}]);
  const shot=vehicleRollModifiers({id:'x',name:'Shooter'},{name:'Firearms'},{adjudicationKind:'attack'},'acuity');
  assert.equal(shot.difficulty,4);
});

test('prisoner cage: the rider cannot get out; someone in front or beside, or the GM, lets them out', async ()=>{
  const cop=V('BCPD Interceptor');const chats=[];
  const tokens=[];const scene={id:'s',grid:{size:100},tokens:Object.assign(tokens,{get:i=>tokens.find(t=>t.id===i)})};
  const mk=d=>{const t={...d,parent:scene};t.getFlag=(ns,k)=>t.flags?.[ns]?.[k];t.update=async u=>{for(const [k,v] of Object.entries(u)){if(k.startsWith('flags.')){const [,ns,key]=k.split('.');t.flags??={};t.flags[ns]??={};t.flags[ns][key]=v;}else t[k]=v;}return t;};tokens.push(t);return t;};
  const player={id:'pl',isGM:false},other={id:'p2',isGM:false},gm={id:'gm',isGM:true};
  const owns=uid=>({testUserPermission:u=>u.id===uid,type:'character'});
  cop.update=async()=>{};cop.ownership={};cop.testUserPermission=u=>u.isGM;cop.type='vehicle';
  const car=mk({id:'car',name:'BCPD Interceptor',actor:cop,actorId:'cop',x:1000,y:1000,width:2,height:3,flags:{[NS]:{vehicleOccupants:[{seatId:'passenger-2',tokenId:'pri',name:'Prisoner',original:{width:1,height:1}},{seatId:'pilot',tokenId:'off',name:'Officer',original:{width:1,height:1}}]}}});
  const pri=mk({id:'pri',name:'Prisoner',actor:owns('pl'),x:1050,y:1150,width:.5,height:.5,flags:{[NS]:{vehicleSeat:{vehicleTokenId:'car',seatId:'passenger-2'}}}});
  mk({id:'off',name:'Officer',actor:owns('p2'),x:1025,y:1025,width:.5,height:.5,flags:{[NS]:{vehicleSeat:{vehicleTokenId:'car',seatId:'pilot'}}}});
  const bystander=mk({id:'by',name:'Bystander',actor:owns('p3'),x:3000,y:3000,width:1,height:1});
  globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{NONE:0,OWNER:3}};
  globalThis.game={user:gm,users:Object.assign([gm,player,other,{id:'p3',isGM:false}],{activeGM:gm,get(i){return this.find(u=>u.id===i);}}),scenes:{get:()=>scene},actors:{get:()=>null},socket:{emit(){},on(){}}};
  globalThis.ChatMessage={implementation:{create:async d=>chats.push(d)}};
  globalThis.foundry={utils:{escapeHTML:s=>String(s)}};
  const {_handlers}=await import('../module/vehicle-boarding.mjs');
  await assert.rejects(_handlers.exit({sceneId:'s',tokenId:'pri',userId:'pl'}),/locked from outside/,'the prisoner cannot open it');
  await assert.rejects(_handlers.board({sceneId:'s',vehicleTokenId:'car',tokenId:'pri',seatId:'passenger-1',userId:'pl'}),/locked in the cage/,'or climb into the front');
  await assert.rejects(_handlers.release({sceneId:'s',vehicleTokenId:'car',tokenId:'pri',userId:'p3'}),/must be in the front/,'a stranger across the street cannot');
  await _handlers.release({sceneId:'s',vehicleTokenId:'car',tokenId:'pri',userId:'p2'});
  assert.equal(pri.flags[NS].vehicleSeat,null,'the officer in front lets them out');
  assert.ok(chats.some(c=>/opens the cage/.test(c.content)));
  void bystander;
});

test('police lights and siren switch art, light and sound; folding scooter goes into a character\'s hands and back', async ()=>{
  const cop=V('BCPD Interceptor'),scooter=V('Kick-Glide E-Scooter');cop.testUserPermission=u=>u.isGM;cop.type='vehicle';scooter.type='vehicle';scooter.testUserPermission=u=>u.isGM||u.id==='pl';
  const chats=[],sounds=[];
  const tokens=[];const scene={id:'s',grid:{size:100},levels:{contents:[{id:'L1'}]},initialLevel:{id:'L1'},tokens:Object.assign(tokens,{get:i=>tokens.find(t=>t.id===i)})};
  const mk=d=>{const t={...structuredClone(Object.fromEntries(Object.entries(d).filter(([k])=>k!=='actor'))),actor:d.actor,parent:scene};t.getFlag=(ns,k)=>t.flags?.[ns]?.[k];
    t.update=async u=>{for(const [k,v] of Object.entries(u))foundry.utils.setProperty(t,k,v);return t;};
    t.toObject=()=>{const o=structuredClone(Object.fromEntries(Object.entries(t).filter(([k,v])=>typeof v!=='function'&&!['parent','actor'].includes(k))));o._id=t.id;return o;};tokens.push(t);return t;};
  scene.deleteEmbeddedDocuments=async(type,ids)=>{for(const i of ids)tokens.splice(tokens.findIndex(t=>t.id===i),1);};
  scene.createEmbeddedDocuments=async(type,list)=>list.map(d=>mk({...d,id:'new'+tokens.length,actor:scooter}));
  const car=mk({id:'car',name:'BCPD Interceptor',actor:cop,x:0,y:0,width:2,height:3,texture:{src:'systems/altered-carbon-rpg/assets/tokens/vehicles/bcpd-interceptor.webp'},light:{dim:0,bright:0},flags:{[NS]:{}}});
  const carrierFlags={};const carrierActor={type:'character',testUserPermission:u=>u.id==='pl'||u.isGM,getFlag:(ns,k)=>carrierFlags[k],setFlag:async(ns,k,v)=>{carrierFlags[k]=v;}};
  const kid=mk({id:'kid',name:'Courier',actor:carrierActor,x:300,y:0,width:1,height:1});
  mk({id:'sc',name:'Kick-Glide E-Scooter',actor:scooter,x:400,y:0,width:1,height:2,flags:{[NS]:{vehicleOccupants:[]}}});
  const gm={id:'gm',isGM:true},pl={id:'pl',isGM:false};
  globalThis.game={user:gm,users:Object.assign([gm,pl],{activeGM:gm,get(i){return this.find(u=>u.id===i);}}),scenes:{get:()=>scene}};
  globalThis.CONFIG={Canvas:{lightAnimations:{siren:{}}}};
  globalThis.foundry={utils:{escapeHTML:s=>String(s),deepClone:o=>structuredClone(o),setProperty:(o,k,v)=>{const p=k.split('.');let c=o;for(const x of p.slice(0,-1))c=c[x]??={};c[p.at(-1)]=v;}},audio:{AudioHelper:{play:(d,b)=>sounds.push([d.src,b])}}};
  globalThis.ChatMessage={implementation:{create:async d=>chats.push(d)}};
  const {_actions}=await import('../module/vehicle-abilities.mjs?lights='+Date.now());
  assert.equal(await _actions.lights({sceneId:'s',vehicleTokenId:'car',userId:'gm'}),true);
  assert.match(car.texture.src,/bcpd-interceptor-lights\.webp$/);assert.equal(car.light.animation.type,'siren');
  assert.deepEqual(sounds[0],['systems/altered-carbon-rpg/assets/sounds/siren.ogg',true],'siren heard by everyone');
  assert.equal(car.flags[NS].lightsOn,true);
  await assert.rejects(_actions.lights({sceneId:'s',vehicleTokenId:'car',userId:'pl'}),/not driving/,'a stranger cannot switch them');
  assert.equal(await _actions.lights({sceneId:'s',vehicleTokenId:'car',userId:'gm'}),false);
  assert.match(car.texture.src,/bcpd-interceptor\.webp$/,'art restored');assert.equal(car.light.dim,0,'light restored');
  await _actions.fold({sceneId:'s',vehicleTokenId:'sc',carrierTokenId:'kid',userId:'pl'});
  assert.equal(scene.tokens.get('sc'),undefined,'scooter folded away');assert.equal(carrierFlags.foldedVehicles.length,1);
  await _actions.unfold({sceneId:'s',carrierTokenId:'kid',index:0,userId:'pl'});
  const back=tokens.find(t=>t.name==='Kick-Glide E-Scooter');assert.ok(back,'unfolded beside the carrier');assert.equal(back.x,kid.x+100);assert.equal(back.level,'L1');
  assert.equal(carrierFlags.foldedVehicles.length,0);
});

test('autopilot vehicles get the destination list even when a human is driving', async ()=>{
  const T=await import('../module/map-transit.mjs');
  const limo=V('Meth Stretch Limousine');limo.type='vehicle';limo.system.vehicle.control='driver';limo.testUserPermission=()=>false;
  const pl={id:'pl',isGM:false};const tokens=[];const scene={tokens:Object.assign(tokens,{get:i=>tokens.find(t=>t.id===i)})};
  const vt={id:'lim',actor:limo,parent:scene,getFlag:(ns,k)=>k==='vehicleOccupants'?[{seatId:'passenger-1',tokenId:'vip'}]:null};
  const vip={id:'vip',parent:scene,actor:{testUserPermission:u=>u.id==='pl'},getFlag:(ns,k)=>k==='vehicleSeat'?{vehicleTokenId:'lim',seatId:'passenger-1'}:null};
  tokens.push(vt,vip);
  assert.equal(T.canChooseDestination(vip,pl),true);
  const hatch=V('Kitsu Rally Hatch');hatch.type='vehicle';vt.actor=hatch;
  assert.equal(T.canChooseDestination(vip,pl),false,'an ordinary car still has to drive');
});

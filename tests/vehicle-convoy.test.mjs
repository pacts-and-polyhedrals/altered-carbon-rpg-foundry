import test from 'node:test';
import assert from 'node:assert/strict';
import {Hooks,game,reset,Collection,dialogs} from './runtime-fixture.mjs';
import {seatLayout,seatPositions} from '../module/vehicle-seat-math.mjs';
import {pickVehicleTransform,planVehicleMove} from '../module/vehicle-movement.mjs';
import {installVehicleBoarding,boardingCandidates,openVehicleBoardDialog,moveVehicle} from '../module/vehicle-boarding.mjs';

function fixture(){
  reset();
  game.system.version='2.5.1';
  const gm=game.users.get('gm'),player=game.users.get('player');
  gm.active=true;player.active=true;
  const vehicleActor={type:'vehicle',id:'carActor',system:{vehicle:{crewFull:2,passengers:2,fireControl:1,control:'driver'}},testUserPermission:u=>u.isGM||u.id==='player'};
  const driverActor={type:'character',id:'driverActor',testUserPermission:u=>u.isGM||u.id==='player'};
  const passengerActor={type:'npc',id:'npcActor',testUserPermission:u=>u.isGM};
  const passenger2Actor={type:'character',id:'pc2Actor',testUserPermission:u=>u.isGM};
  const vehicle={id:'car',name:'Ground Car',actor:vehicleActor,x:100,y:100,width:2,height:3,rotation:0,elevation:0,sort:10,flags:{'altered-carbon-rpg':{vehicleOccupants:[]}},getFlag(ns,key){return this.flags?.[ns]?.[key];}};
  function makeToken(id,name,actor,seatId,x=500,y=500){
    return {id,name,actor,x,y,width:1,height:1,sort:0,rotation:0,elevation:0,flags:{'altered-carbon-rpg':{vehicleSeat:seatId?{vehicleTokenId:'car',seatId}:null}},getFlag(ns,key){return this.flags?.[ns]?.[key];}};
  }
  const driver=makeToken('driver','Pilot',driverActor,'pilot',110,110),gunner=makeToken('gunner','Gunner',passengerActor,'gunner-1',115,110),back=makeToken('back','Passenger',passenger2Actor,'passenger-1',120,120),far=makeToken('far','Far character',passengerActor,null,10000,10000);
  const tokens=new Collection(vehicle,driver,gunner,back,far);
  const calls=[];
  const scene={id:'test-scene',grid:{size:100},tokens,updateEmbeddedDocuments:async(type,updates,options)=>{
    calls.push({type,updates:structuredClone(updates),options:{...options}});
    for(const change of updates){const tok=tokens.get(change._id);if(!tok)continue;for(const [key,value] of Object.entries(change)){if(key!=='_id')tok[key]=value;}}
    return updates.map(u=>tokens.get(u._id));
  }};
  for(const t of tokens)t.parent=scene;
  game.scenes=new Collection(scene);game.scenes.get=id=>game.scenes.find(s=>s.id===id);
  vehicle.flags['altered-carbon-rpg'].vehicleOccupants=[
    {seatId:'pilot',tokenId:'driver',actorId:'driverActor',name:'Pilot',original:{width:1,height:1}},
    {seatId:'gunner-1',tokenId:'gunner',actorId:'npcActor',name:'Gunner',original:{width:1,height:1}},
    {seatId:'passenger-1',tokenId:'back',actorId:'pc2Actor',name:'Passenger',original:{width:1,height:1}}
  ];
  return {scene,vehicle,driver,gunner,back,far,gm,player,calls};
}
function occupants(vehicle){return Object.fromEntries(vehicle.getFlag('altered-carbon-rpg','vehicleOccupants').map(({seatId,...rest})=>[seatId,rest]));}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('Projected vehicle transform rejects invalid/out of scope socket values',()=>{
  assert.deepEqual(pickVehicleTransform({x:450,rotation:90,foo:'forged'}),{x:450,rotation:90});
  assert.throws(()=>pickVehicleTransform({x:Infinity}),/Invalid x/);
  assert.throws(()=>pickVehicleTransform({width:0}),/out of range/);
  assert.throws(()=>pickVehicleTransform({x:'500'}),/Invalid x/);
  assert.throws(()=>pickVehicleTransform({foo:1}),/No vehicle/);
});

test('One batch plans the vehicle plus three riders at the destination, not the former position',()=>{
  const {vehicle}=fixture();
  const updates=planVehicleMove(vehicle,{x:700,y:450},occupants(vehicle),100);
  assert.deepEqual(updates.map(u=>u._id),['car','driver','gunner','back']);
  const expected=seatPositions({...vehicle,x:700,y:450},seatLayout(vehicle.actor),100);
  for(const [seatId,id] of [['pilot','driver'],['gunner-1','gunner'],['passenger-1','back']]){
    const actual=updates.find(u=>u._id===id),seat=expected[seatId];
    assert.deepEqual([actual.x,actual.y],[Math.round(seat.x),Math.round(seat.y)]);
    assert.equal(actual.width,0.5);assert.equal(actual.height,0.5);
  }
  assert.equal(updates[0].x,700);
});

test('Turning and climbing a vehicle rotates and elevates every carried token in the same plan',()=>{
  const {vehicle}=fixture();
  const updates=planVehicleMove(vehicle,{rotation:90,elevation:10},occupants(vehicle),100);
  assert.equal(updates.length,4);
  assert.equal(updates[0].rotation,90);
  const expected=seatPositions({...vehicle,rotation:90,elevation:10},seatLayout(vehicle.actor),100);
  assert.ok(updates.slice(1).every(x=>x.rotation===90&&x.elevation===10));
  assert.equal(updates[1].x,Math.round(expected.pilot.x));
  assert.equal(updates[1].y,Math.round(expected.pilot.y));
});

test('Skip stale, duplicate and deleted seat records rather than pulling strangers',()=>{
  const {vehicle,back}=fixture();
  const existing=occupants(vehicle);existing['passenger-2']={tokenId:'gone'};
  existing['operator-99']={tokenId:'back'};
  back.flags['altered-carbon-rpg'].vehicleSeat=null;
  const updates=planVehicleMove(vehicle,{x:800},existing,100);
  assert.deepEqual(updates.map(u=>u._id),['car','driver','gunner']);
});

test('Vehicle-HUD candidate selection works after the previous token selection is cleared',()=>{
  const {vehicle,driver,gunner,back,far,gm,player}=fixture();
  assert.deepEqual(boardingCandidates(vehicle,player).map(t=>t.id),['driver']);
  assert.deepEqual(boardingCandidates(vehicle,gm).map(t=>t.id).sort(),['back','driver','far','gunner']);
});

test('One GM movement request commits ONE native Scene operation including every rider',async()=>{
  const {vehicle,driver,gunner,back,calls}=fixture();
  const result=await moveVehicle(vehicle,{x:600,y:500,rotation:180,elevation:5});
  assert.equal(result,true);
  assert.equal(calls.length,1);
  assert.equal(calls[0].type,'Token');
  assert.equal(calls[0].options.acVehicleCarry,true);
  assert.equal(calls[0].updates.length,4);
  assert.equal(vehicle.x,600);assert.equal(vehicle.y,500);
  assert.equal(driver.rotation,180);assert.equal(gunner.rotation,180);assert.equal(back.rotation,180);
  assert.equal(gunner.elevation,5);
});

test('Player driving goes over GM socket; player need not own fellow occupants',async()=>{
  const {vehicle,player,gm,calls}=fixture();
  let socketHandler,emitted;
  game.socket.on=(_channel,callback)=>{socketHandler=callback;};
  game.socket.emit=(_channel,payload)=>{emitted=payload;};
  installVehicleBoarding();
  game.user=player;
  await moveVehicle(vehicle,{x:400,y:300});
  assert.equal(calls.length,0,'player must not move riders with their own permissions');
  assert.equal(emitted.type,'acVehicle.move');
  game.user=gm;
  await socketHandler(emitted);
  assert.equal(calls.length,1);
  assert.deepEqual(calls[0].updates.map(u=>u._id),['car','driver','gunner','back']);
});

test('An occupied vehicle native drag is cancelled before writing; GM performs a single follow-up batch',async()=>{
  const {vehicle,calls}=fixture();
  let preMove;
  const saveOn=Hooks.on;
  Hooks.on=(name,fn)=>{if(name==='preUpdateToken'&&!preMove)preMove=fn;return saveOn(name,fn);};
  installVehicleBoarding();
  Hooks.on=saveOn;
  assert.equal(preMove(vehicle,{x:900,y:650},{}),false);
  await flush();await flush();
  assert.equal(calls.length,1);
  assert.equal(calls[0].updates.length,4);
  assert.equal(vehicle.x,900);
  assert.equal(vehicle.y,650);
  assert.notEqual(calls[0].updates[1].x,100);
  assert.equal(preMove(vehicle,{x:1000},{acVehicleCarry:true}),undefined);
});

test('No passengers: native move is not intercepted',()=>{
  const {vehicle}=fixture();
  vehicle.flags['altered-carbon-rpg'].vehicleOccupants=[];
  let preMove;const originalOn=Hooks.on;
  Hooks.on=(name,fn)=>{if(name==='preUpdateToken'&&!preMove)preMove=fn;return originalOn(name,fn);};
  installVehicleBoarding();Hooks.on=originalOn;
  assert.equal(preMove(vehicle,{x:1200},{}),undefined);
});

test('Vehicle-HUD Boarding button appears without any controlled character',()=>{
  const {vehicle,gm}=fixture();game.user=gm;
  let handler;const oldOn=Hooks.on;
  Hooks.on=(name,fn)=>{if(name==='renderTokenHUD')handler=fn;return oldOn(name,fn);};
  installVehicleBoarding();Hooks.on=oldOn;
  const appended=[];
  const col={append:x=>appended.push(x)};
  const root={querySelector:selector=>selector==='.col.right'?col:selector==='.ac-vehicle-hud'?appended[0]:null};
  const oldDoc=globalThis.document;
  globalThis.document={createElement:()=>({dataset:{},setAttribute(){},addEventListener(){}})};
  try{handler({document:vehicle},root);assert.equal(appended.length,2);assert.equal(appended[0].title,'Board vehicle / choose seat');handler({document:vehicle},root);assert.equal(appended.length,2,'second V2 render must not double-install buttons');}
  finally{globalThis.document=oldDoc;}
});


test('Rapid consecutive movement requests are serialized, with the final destination correct',async()=>{
  const {vehicle,calls}=fixture();
  await Promise.all([
    moveVehicle(vehicle,{x:200,y:250,rotation:45}),
    moveVehicle(vehicle,{x:900,y:650,rotation:120})
  ]);
  assert.equal(calls.length,2);
  assert.equal(vehicle.x,900);assert.equal(vehicle.rotation,120);
  assert.ok(calls.every(c=>c.updates.length===4));
});

test('Vehicle-right-click dialog offers PC/NPC selection followed by free driver/gunner/passenger seat',async()=>{
  const {vehicle,scene,far,gm,calls}=fixture();
  game.user=gm;
  // Emulate TokenDocument updates in the Foundry fixture for the full boarding flow.
  const patch=async function(change){
    for(const [key,value] of Object.entries(change)){
      const parts=key.split('.');let node=this;
      for(const part of parts.slice(0,-1))node=node[part]??={};
      node[parts.at(-1)]=value;
    }
    return this;
  };
  vehicle.update=patch;
  vehicle.actor.update=patch;
  for(const token of scene.tokens)token.update??=patch;
  vehicle.actor.ownership={default:0};
  globalThis.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER=3;
  // An existing driver and two passengers are aboard. Add the extra NPC in passenger-2.
  dialogs.push({tokenId:far.id},{seat:'passenger-2'});
  const result=await openVehicleBoardDialog(vehicle);
  assert.equal(result,true);
  assert.ok(vehicle.getFlag('altered-carbon-rpg','vehicleOccupants').some(x=>x.tokenId===far.id&&x.seatId==='passenger-2'));
  assert.deepEqual(far.getFlag('altered-carbon-rpg','vehicleSeat'),{vehicleTokenId:'car',seatId:'passenger-2'});
  // A subsequent driving movement keeps all four riders in one batch.
  calls.length=0;
  await moveVehicle(vehicle,{x:700,y:700});
  assert.equal(calls.length,1);assert.equal(calls[0].updates.length,5);
});

test('A non-owning player right-clicks a parked car and receives a boarding-only icon without Actor ownership',async()=>{
  const {vehicle,player}=fixture();
  game.user=player;
  const prevDoc=globalThis.document,prevWindow=globalThis.window,prevToken=globalThis.Token;
  const events={},hosts=[];
  function fakeNode(){return {
    style:{},dataset:{},children:[],textContent:'',classList:{add(){}},
    setAttribute(k,v){this[k]=v;},
    addEventListener(key,fn){this.events??={};this.events[key]=fn;},
    append(el){this.children.push(el);},remove(){this.removed=true;},contains(target){return target===this||this.children.includes(target);}
  };}
  globalThis.document={
    body:{append(el){hosts.push(el);}},
    createElement:fakeNode,
    addEventListener(type,fn){events[type]=fn;},
    removeEventListener(type){delete events[type];}
  };
  globalThis.window={innerWidth:1200,innerHeight:800};
  class TokenPlaceable{_onClickRight(){return 'native right click preserved';}}
  globalThis.Token=TokenPlaceable;
  try{
    installVehicleBoarding();
    const p=new TokenPlaceable();p.document=vehicle;p.isOwner=false;
    const result=p._onClickRight({nativeEvent:{clientX:500,clientY:300}});
    assert.equal(result,'native right click preserved');
    assert.equal(hosts.length,1);assert.equal(hosts[0].children.length,1);
    assert.equal(hosts[0].children[0].title,'Board Ground Car / choose seat');
    assert.equal(hosts[0].style.left,'500px');
    assert.equal(vehicle.actor.ownership,undefined,'No Actor ownership is granted to show the popup');
    // A right-click elsewhere removes the popover safely.
    events.pointerdown({target:{}});
    assert.equal(hosts[0].removed,true);
  }finally{globalThis.document=prevDoc;globalThis.window=prevWindow;globalThis.Token=prevToken;}
});

test('Passenger tokens are repositioned when a vehicle changes its footprint',()=>{
  const {vehicle}=fixture();
  const start=planVehicleMove(vehicle,{x:500},occupants(vehicle),100);
  const resized=planVehicleMove(vehicle,{x:500,width:3,height:4},occupants(vehicle),100);
  assert.equal(resized[0].width,3);assert.equal(resized[0].height,4);
  assert.notDeepEqual([start[1].x,start[1].y],[resized[1].x,resized[1].y]);
});

test('AI-controlled occupied car rejects a player movement packet',async()=>{
  const {vehicle,player,gm,calls}=fixture();
  vehicle.actor.system.vehicle.control='ai';
  let socketHandler,emitted;
  game.socket.on=(_channel,callback)=>{socketHandler=callback;};
  game.socket.emit=(_channel,data)=>{emitted=data;};
  installVehicleBoarding();
  game.user=player;
  await moveVehicle(vehicle,{x:800});
  game.user=gm;
  await socketHandler(emitted);
  assert.equal(calls.length,0);
  assert.equal(vehicle.x,100);
});

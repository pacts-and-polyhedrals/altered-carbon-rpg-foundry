import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {seatPositions,seatLayout} from '../module/vehicle-seat-math.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const NS='altered-carbon-rpg';
globalThis.foundry??={utils:{escapeHTML:s=>s}};
const W=await import('../module/vehicle-weapons.mjs');
const data=JSON.parse(readFileSync(join(root,'data/street-vehicles.json'),'utf8'));
const rhinoData=data.vehicles.find(v=>v.name==='CTAC Rhino Armoured Car');

function items(list){return {contents:list,get:id=>list.find(i=>i.id===id)};}
function rhino(weapons=[]){return {name:'CTAC Rhino Armoured Car',uuid:'Actor.rhino',system:rhinoData.system,flags:{[NS]:{vehicleAbilities:rhinoData.abilities}},items:items(weapons)};}
function scene(tokens){return {tokens:{get:id=>tokens.find(t=>t.id===id)}};}
function vehicleToken(actor,occupants,tokens){const vt={id:'vt',name:actor.name,actor,getFlag:(ns,k)=>k==='vehicleOccupants'?occupants:null};vt.parent=scene([vt,...tokens]);return vt;}

test('seats follow the downward-facing art: the driver sits at the front, which is the bottom edge at rotation 0', ()=>{
  const vt={x:0,y:0,width:2,height:3,rotation:0};
  const seats=seatLayout({system:{vehicle:{crewFull:1,passengers:7}}});
  const p=seatPositions(vt,seats,100);
  assert.ok(p.pilot.y>p['passenger-7'].y,'driver row is below the back row');
  assert.ok(p.pilot.y>150,'driver is in the lower half');
  // Facing north (rotation 180) the driver is at the top.
  const q=seatPositions({...vt,rotation:180},seats,100);
  assert.ok(q.pilot.y<150);
});

test('Rhino: roof turret, Gunner seat, Fire Control drops with Structure', ()=>{
  const r=rhino();
  assert.ok(W.hasMountedWeapons(r),'turret ability counts as a mounted weapon');
  assert.deepEqual(W.gunnerSeatIds(r),['gunner-1']);
  assert.equal(W.effectiveFireControl({fireControl:2,structure:{value:7,max:7}}),2);
  assert.equal(W.effectiveFireControl({fireControl:2,structure:{value:6,max:7}}),1);
  assert.equal(W.effectiveFireControl({fireControl:2,structure:{value:2,max:7}}),0);
  assert.equal(W.TURRET_WEAPON.type,'weapon');
  assert.equal(W.TURRET_WEAPON.system.skill,'firearms');
  assert.ok(existsSync(join(root,W.TURRET_WEAPON.img.replace('systems/altered-carbon-rpg/',''))));
  assert.ok(!W.hasMountedWeapons({name:'Kitsu Rally Hatch',items:items([]),system:{vehicle:{}}}),'unarmed cars have no gun');
});

test('only a manned Gunner seat can fire, and only by its player or the GM', async ()=>{
  const gunnerActor={name:'Kade',testUserPermission:(u)=>u.id==='p1'};
  const gunnerTok={id:'g',name:'Kade',actor:gunnerActor};
  const driverTok={id:'d',name:'Latch',actor:{name:'Latch',testUserPermission:()=>true}};
  globalThis.game={user:{id:'p2',isGM:false},users:{activeGM:null,filter:()=>[]}};
  const r=rhino();
  const empty=vehicleToken(r,[{seatId:'pilot',tokenId:'d'}],[driverTok]);
  assert.deepEqual(W.mannedGunners(empty),[],'driver alone does not man the gun');
  await assert.rejects(()=>W.fireMountedWeapon(empty,r),/Nobody is manning the gun/);
  const manned=vehicleToken(r,[{seatId:'pilot',tokenId:'d'},{seatId:'gunner-1',tokenId:'g'}],[driverTok,gunnerTok]);
  assert.equal(W.mannedGunners(manned)[0].id,'g');
  await assert.rejects(()=>W.fireMountedWeapon(manned,r),/Only Kade's player or the GM/);
});

test('the Rhino in the compendium carries the turret, and the sheet and HUD offer Fire', ()=>{
  const sheet=readFileSync(join(root,'templates/vehicle-sheet.hbs'),'utf8');
  assert.match(sheet,/data-action="fireWeapon"/);
  assert.match(sheet,/nobody is manning the gun/);
  const mod=readFileSync(join(root,'module/vehicle-weapons.mjs'),'utf8');
  assert.match(mod,/renderTokenHUD/);
  assert.match(readFileSync(join(root,'altered-carbon-rpg.mjs'),'utf8'),/installVehicleWeapons\(\)/);
  const pack=readFileSync(join(root,'packs/street-vehicles',readdirSync(join(root,'packs/street-vehicles')).find(f=>f.endsWith('.ldb'))));
  assert.ok(pack.includes(Buffer.from('Turret')),'embedded turret item in the pack');
});

test('road maps use the 71 px grid; buildings and the overview keep 100', async ()=>{
  const atlas=JSON.parse(readFileSync(join(root,'data/bay-city-street-atlas.json'),'utf8'));
  assert.equal(atlas.maps.length,14);
  for(const m of atlas.maps){assert.equal(m.gridSize,71,m.name);assert.equal(m.width,4200);assert.equal(m.height,2700);}
  for(const f of ['bay-city-maps.json','bay-city-places.json','bay-city-street-overview.json'])
    for(const m of JSON.parse(readFileSync(join(root,'data',f),'utf8')).maps)assert.equal(m.gridSize,100,`${f} ${m.name}`);
  // Older world copies at 100 move to 71; a GM's own grid is left alone.
  const atlasRaw=readFileSync(join(root,'data/bay-city-street-atlas.json'),'utf8');
  globalThis.fetch=async u=>({ok:true,json:async()=>u.endsWith('bay-city-street-atlas.json')?JSON.parse(atlasRaw):{maps:[]}});
  const {syncSceneGrid}=await import('../module/scene-repair.mjs');
  const mk=size=>{const s={grid:{size},flags:{[NS]:{streetAtlas:{id:'BCS-DOGPATCH'}}},updates:[],async update(u){this.updates.push(u);this.grid.size=u['grid.size'];}};return s;};
  const old=mk(100);assert.equal(await syncSceneGrid(old),true);assert.equal(old.grid.size,71);
  const custom=mk(80);assert.equal(await syncSceneGrid(custom),false);assert.equal(custom.grid.size,80);
  const done=mk(71);assert.equal(await syncSceneGrid(done),false);
  const interior={grid:{size:100},flags:{[NS]:{bayCityMap:{id:'X'}}},update(){throw new Error('touched');}};
  assert.equal(await syncSceneGrid(interior),false);
});

test('every vehicle has top-down token art (core vehicles included) and police cars have a lights variant', ()=>{
  const src=readFileSync(join(root,'module/emblems.mjs'),'utf8');
  for(const n of ['Airbike','Aircar','Ground Car',...data.vehicles.map(v=>v.name)])assert.match(src,new RegExp(`"${n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}": "systems/altered-carbon-rpg/assets/tokens/vehicles/`),n);
  for(const f of ['airbike','aircar','ground-car','bcpd-interceptor-lights','bcpd-pursuit-bike-lights'])assert.ok(existsSync(join(root,`assets/tokens/vehicles/${f}.webp`)),f);
});

test('getting out lands beside the vehicle as drawn, also when it is turned sideways', async ()=>{
  const {exitPositions}=await import('../module/vehicle-seat-math.mjs');
  const up={x:0,y:0,width:2,height:4,rotation:0};
  assert.deepEqual(exitPositions(up,0,100),{x:200,y:0});assert.deepEqual(exitPositions(up,3,100),{x:200,y:300});assert.deepEqual(exitPositions(up,4,100),{x:300,y:0});
  const side={x:0,y:0,width:2,height:4,rotation:90};   // drawn 4 wide x 2 tall around the same centre (100,200)
  const p=exitPositions(side,0,100);assert.equal(p.x,300,'right of the drawn car, not inside it');assert.equal(p.y,100);
  assert.deepEqual(exitPositions(side,2,100),{x:400,y:100},'two rows, then the next column');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {seatLayout} from '../module/vehicle-seat-math.mjs';
import {emblemFor,VEHICLE_TOKEN_ART} from '../module/emblems.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const SYS='systems/altered-carbon-rpg/';
const data=JSON.parse(readFileSync(join(root,'data/street-vehicles.json'),'utf8'));
const byName=Object.fromEntries(data.vehicles.map(v=>[v.name,v]));
const local=src=>join(root,src.replace(SYS,''));
function webpSize(file){
  const b=readFileSync(file);assert.equal(b.toString('ascii',0,4),'RIFF');const chunk=b.toString('ascii',12,16);
  if(chunk==='VP8X')return {w:1+b.readUIntLE(24,3),h:1+b.readUIntLE(27,3)};
  if(chunk==='VP8L'){const bits=b.readUInt32LE(21);return {w:(bits&0x3fff)+1,h:((bits>>14)&0x3fff)+1};}
  return {w:b.readUInt16LE(26)&0x3fff,h:b.readUInt16LE(28)&0x3fff};
}

test('street vehicle roster: bikes from BMX to hyperbike, cars from golf cart to supercharged roadster', ()=>{
  assert.equal(data.vehicles.length,23);
  assert.equal(new Set(data.vehicles.map(v=>v.id)).size,23);assert.equal(new Set(data.vehicles.map(v=>v.name)).size,23);
  assert.equal(data.vehicles.filter(v=>v.kind==='bike').length,10);assert.equal(data.vehicles.filter(v=>v.kind==='car').length,13);
  for(const n of ['Sprocket BMX','Corvo Diavolo Superbike','Lumen Hubless Hyperbike','Fairway Runabout','Cerberus Supercharged Roadster','BCPD Interceptor'])assert.ok(byName[n],n);
  const sd=n=>byName[n].system.vehicle.speedDice;
  assert.ok(sd('Sprocket BMX')<sd('Kestrel Street Bike')&&sd('Kestrel Street Bike')<sd('Corvo Diavolo Superbike')&&sd('Corvo Diavolo Superbike')<sd('Lumen Hubless Hyperbike'));
  const cars=data.vehicles.filter(v=>v.kind==='car');
  assert.equal(Math.max(...cars.map(v=>v.system.vehicle.speedDice)),sd('Cerberus Supercharged Roadster'),'the roadster is the fastest car');
  assert.equal(Math.min(...cars.map(v=>v.system.vehicle.speedDice)),sd('Fairway Runabout'),'the golf cart is the slowest car');
});

test('every street vehicle has valid stats, seats that fit its token, and both pictures', ()=>{
  for(const v of data.vehicles){
    const x=v.system.vehicle;
    assert.ok(x.structure.max>=1&&x.structure.value===x.structure.max,v.name);
    assert.ok(x.speedDice>=1&&x.speedDice<=5,v.name);assert.ok(x.handling>=1&&x.handling<=4,v.name);
    assert.ok(x.durability>0&&x.size>=0&&x.size<=3,v.name);
    assert.match(x.velocity,/^\d+ ft or \d+ degrees$/,v.name);
    assert.ok(['driver','ai','both'].includes(x.control),v.name);
    assert.ok(x.crewFull>=x.crewStandard&&x.crewStandard>=x.crewSkeleton,v.name);
    const seats=seatLayout({system:v.system}).length,capacity=Math.floor(v.token.width/0.5)*Math.floor(v.token.height/0.5);
    assert.ok(seats<=capacity,`${v.name}: ${seats} seats in ${v.token.width}×${v.token.height}`);
    assert.ok(existsSync(local(v.img)),v.img);assert.ok(existsSync(local(v.tokenImg)),v.tokenImg);
    const {w,h}=webpSize(local(v.tokenImg));
    assert.equal(w/h,v.token.width/v.token.height,`${v.name} token art matches its footprint`);
    assert.ok(w>=256*v.token.width,'token art is at least 256 px per square');
    assert.equal(emblemFor('vehicle',v.name),v.img);assert.equal(VEHICLE_TOKEN_ART[v.name],v.tokenImg);
  }
});

test('street vehicles compendium is registered in the GM Library', ()=>{
  const sys=JSON.parse(readFileSync(join(root,'system.json'),'utf8'));
  const pack=sys.packs.find(p=>p.name==='street-vehicles');
  assert.equal(pack?.type,'Actor');assert.ok(existsSync(join(root,pack.path,'CURRENT')));
  assert.ok(sys.packFolders.find(f=>f.name.includes('GM Library')).packs.includes('street-vehicles'));
});

test('the Bay City overview links every district to its street map', ()=>{
  const ov=JSON.parse(readFileSync(join(root,'data/bay-city-street-overview.json'),'utf8')).maps[0];
  const atlas=JSON.parse(readFileSync(join(root,'data/bay-city-street-atlas.json'),'utf8'));
  assert.deepEqual(webpSize(join(root,'assets/maps',ov.file)),{w:ov.width,h:ov.height});
  assert.ok(ov.width>=8000,'high resolution');
  assert.equal(ov.zones.length,14);assert.equal(ov.links.length,14);
  for(const m of atlas.maps){
    const l=ov.links.find(x=>x.to===m.id);assert.ok(l,m.name);
    const [x,y]=l.land;assert.ok(m.zones.some(z=>['junction','road'].includes(z.kind)&&x>=z.rect[0]&&x<=z.rect[0]+z.rect[2]&&y>=z.rect[1]&&y<=z.rect[1]+z.rect[3]),`${m.name}: lands on a road`);
  }
  for(const z of ov.zones)for(const a of z.adjacent)assert.ok(ov.zones.find(b=>b.id===a)?.adjacent.includes(z.id),`${z.id}↔${a}`);
  assert.match(readFileSync(join(root,'module/scene-repair.mjs'),'utf8'),/bay-city-street-overview\.json/);
});

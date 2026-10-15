// v2.5.2 Street Atlas: linked edges, zones, landing positions, transit and v14 background repair.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const atlas=JSON.parse(readFileSync(join(root,'data/bay-city-street-atlas.json'),'utf8'));
const interiors=JSON.parse(readFileSync(join(root,'data/bay-city-maps.json'),'utf8'));
const places=JSON.parse(readFileSync(join(root,'data/bay-city-places.json'),'utf8'));
const byId=Object.fromEntries(atlas.maps.map(m=>[m.id,m]));
const NS='altered-carbon-rpg';

// minimal globals for the modules under test
globalThis.foundry??={utils:{escapeHTML:s=>String(s),setProperty:(o,p,v)=>{const k=p.split('.');let t=o;for(const x of k.slice(0,-1))t=t[x]??={};t[k.at(-1)]=v;},getProperty:(o,p)=>p.split('.').reduce((a,k)=>a?.[k],o),deepClone:o=>structuredClone(o)}};
const {zoneAt}=await import('../module/map-zones.mjs');
const {linkAt,landingPosition}=await import('../module/map-transit.mjs');

test('every exit leads to a map whose matching edge leads straight back', ()=>{
  let links=0;
  for(const m of atlas.maps)for(const l of m.links.filter(l=>l.edge)){
    links++;
    assert.ok(l.to,`${m.code} ${l.edge}/${l.slot} has a destination`);
    const n=byId[l.to];assert.ok(n,`${l.to} exists`);
    const back=n.links.find(b=>b.edge===l.toEdge&&b.slot===l.slot);
    assert.ok(back,`${n.code} has the return exit on its ${l.toEdge} edge`);
    assert.equal(back.to,m.id);
    // the road crosses at the same place along the shared edge
    const along=r=>['N','S'].includes(l.edge)?[r[0],r[2]]:[r[1],r[3]];
    assert.deepEqual(along(back.rect),along(l.rect),`${m.code}→${n.code} road lines up`);
  }
  assert.ok(links>=50);
});

test('the atlas is one connected network of 14 maps', ()=>{
  assert.equal(atlas.maps.length,14);
  const seen=new Set([atlas.maps[0].id]),todo=[atlas.maps[0].id];
  while(todo.length){const m=byId[todo.pop()];for(const l of m.links.filter(l=>l.edge))if(!seen.has(l.to)){seen.add(l.to);todo.push(l.to);}}
  assert.equal(seen.size,14);
  for(const name of ['Golden Gate · North Span','Golden Gate · South Span','Licktown','Mission Street · AI Hotels','Fell Street · BCPD','Psychasec Alcatraz','Old Downtown · North','Old Downtown · South'])
    assert.ok(atlas.maps.some(m=>m.name===name),name);
});

test('zones: each finds itself, adjacency is symmetric, every zone is reachable, images exist', ()=>{
  for(const m of [...atlas.maps,...interiors.maps]){
    assert.ok(existsSync(join(root,'assets/maps',m.file)),m.file);
    const zones=m.zones,ids=new Set(zones.map(z=>z.id));assert.equal(ids.size,zones.length,`${m.name} unique zone ids`);
    for(const z of zones){
      const [x,y,w,h]=z.rect;assert.equal(zoneAt(zones,x+w/2,y+h/2),z.id,`${m.name}: ${z.id}`);
      for(const n of z.adjacent)assert.ok(zones.find(o=>o.id===n)?.adjacent.includes(z.id),`${m.name}: ${z.id}↔${n}`);
    }
    const seen=new Set([zones[0].id]),todo=[zones[0].id];
    while(todo.length){const cur=todo.pop(),z=zones.find(a=>a.id===cur);for(const n of z.adjacent)if(!seen.has(n)){seen.add(n);todo.push(n);}}
    assert.equal(seen.size,zones.length,`${m.name}: all zones reachable`);
  }
});

test('a token leaving by an exit lands on a road of the next map, inside the map', ()=>{
  const g=100;
  for(const m of atlas.maps)for(const l of m.links.filter(l=>l.edge)){
    const n=byId[l.to];
    for(const size of [[1,1],[2,3]]){
      const [w,h]=size;
      const token={x:l.rect[0]+l.rect[2]/2-w*g/2,y:l.rect[1]+l.rect[3]/2-h*g/2,width:w,height:h};
      const scene={grid:{size:g},getFlag:(ns,k)=>k==='streetAtlas'?{links:m.links}:null};
      assert.equal(linkAt(scene,token)?.to,n.id,`${m.code} ${l.edge} detected`);
      const p=landingPosition(l,token,{width:n.width,height:n.height,gridSize:g});
      assert.ok(p.x>=0&&p.y>=0&&p.x+w*g<=n.width&&p.y+h*g<=n.height,`${m.code}→${n.code} inside map`);
      const zone=n.zones.find(z=>z.id===zoneAt(n.zones,p.x+w*g/2,p.y+h*g/2));
      assert.ok(zone&&['road','junction'].includes(zone.kind),`${m.code}→${n.code} lands on a road (${zone?.id})`);
    }
  }
});

test('transit moves a vehicle with its riders, remaps seats and combat, and deletes originals quietly', async ()=>{
  let seq=0;const chats=[],emitted=[];
  const mkDoc=(d,parent)=>{const t={...structuredClone(d),id:d._id||('t'+(++seq)),parent};t.getFlag=(ns,k)=>t.flags?.[ns]?.[k];
    t.toObject=()=>{const o={};for(const [k,v] of Object.entries(t))if(typeof v!=='function'&&!['parent','actor'].includes(k))o[k]=structuredClone(v);o._id=t.id;delete o.id;return o;};
    t.update=async u=>{for(const [k,v] of Object.entries(u))foundry.utils.setProperty(t,k,v);return t;};t.actor={testUserPermission:()=>true};return t;};
  const mkScene=(id,m)=>{const s={id,name:m.name,width:m.width,height:m.height,grid:{size:100},flags:{[NS]:{streetAtlas:{id:m.id,links:m.links}}},tokens:[],deleted:[]};
    s.getFlag=(ns,k)=>s.flags[ns]?.[k];s.tokens.get=i=>s.tokens.find(t=>t.id===i);
    s.createEmbeddedDocuments=async(type,list,opts)=>list.map(d=>{const t=mkDoc(d,s);s.tokens.push(t);return t;});
    s.deleteEmbeddedDocuments=async(type,ids,opts)=>{s.deleted.push({ids,opts});for(const i of ids)s.tokens.splice(s.tokens.findIndex(t=>t.id===i),1);};
    s.view=async()=>{};return s;};
  const fell=byId['BCS-FELL'],civic=byId['BCS-CIVIC'];
  const src=mkScene('s1',fell),dst=mkScene('s2',civic);
  const east=fell.links.find(l=>l.edge==='E'&&l.slot==='U');
  const vx=east.rect[0],vy=east.rect[1]+50;
  const car=mkDoc({_id:'car',name:'Ground Car',x:vx,y:vy,width:2,height:3,flags:{[NS]:{vehicleOccupants:[{seatId:'pilot',tokenId:'kov'},{seatId:'passenger-1',tokenId:'ort'}]}}},src);
  const kov=mkDoc({_id:'kov',name:'Kovacs',x:vx+25,y:vy+25,width:.5,height:.5,flags:{[NS]:{vehicleSeat:{vehicleTokenId:'car',seatId:'pilot'}}}},src);
  const ort=mkDoc({_id:'ort',name:'Ortega',x:vx+125,y:vy+25,width:.5,height:.5,flags:{[NS]:{vehicleSeat:{vehicleTokenId:'car',seatId:'passenger-1'}}}},src);
  src.tokens.push(car,kov,ort);
  const combatant={id:'cb1',sceneId:'s1',tokenId:'kov'};const combat={id:'c1',scene:{id:'s1'},combatants:[combatant],
    updateEmbeddedDocuments:async(t,u)=>{for(const x of u)Object.assign(combatant,x);},update:async u=>{if('scene' in u)combat.scene=u.scene;}};
  const gm={id:'gm',isGM:true,active:true};
  globalThis.game={user:gm,users:Object.assign([gm],{activeGM:gm,get:()=>gm}),scenes:Object.assign([src,dst],{get:i=>[src,dst].find(s=>s.id===i)}),combats:[combat],
    socket:{emit:(e,p)=>emitted.push(p),on(){}},packs:{get:()=>null}};
  globalThis.ChatMessage={implementation:{create:async d=>chats.push(d)}};
  globalThis.ui={notifications:{info(){},warn(){}}};
  const {crossToNextMap}=await import('../module/map-transit.mjs?run='+Date.now());
  const r=await crossToNextMap(kov); // a rider asking to cross moves the whole vehicle
  assert.equal(r.scene.id,'s2');
  assert.equal(src.tokens.length,0,'originals removed');
  assert.equal(src.deleted[0].opts.acTransit,true,'deletion marked as transit');
  const nCar=dst.tokens.find(t=>t.name==='Ground Car'),nKov=dst.tokens.find(t=>t.name==='Kovacs'),nOrt=dst.tokens.find(t=>t.name==='Ortega');
  assert.ok(nCar&&nKov&&nOrt);
  assert.equal(nCar.x,100,'enters one square in from the west edge');
  assert.equal(nCar.y,vy,'same position along the edge');
  // Riders are seated from the seat layout on the new map (not copied from where they lagged on the old one).
  const inside=t=>t.x>=nCar.x&&t.x+50<=nCar.x+nCar.width*100&&t.y>=nCar.y&&t.y+50<=nCar.y+nCar.height*100;
  assert.ok(inside(nKov)&&inside(nOrt),'riders sit inside the vehicle footprint');
  assert.equal(nKov.width,0.5);assert.equal(nKov.flags[NS].vehicleSeat.seatId,'pilot');assert.equal(nOrt.flags[NS].vehicleSeat.seatId,'passenger-1','riders keep their seats');
  assert.equal(nKov.flags[NS].vehicleSeat.vehicleTokenId,nCar.id);
  assert.deepEqual(nCar.flags[NS].vehicleOccupants.map(o=>o.tokenId).sort(),[nKov.id,nOrt.id].sort());
  assert.deepEqual([combatant.sceneId,combatant.tokenId],['s2',nKov.id],'combatant follows');
  assert.equal(combat.scene,null,'combat spans both maps');
  assert.ok(chats.length===1);
});

test('v14 scenes with an empty level image are repaired; v13 scenes use background; set images are kept', async ()=>{
  globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(readFileSync(join(root,'data',url.split('/').pop()),'utf8'))});
  globalThis.game={user:{isGM:true}};
  const {repairSceneBackground}=await import('../module/scene-repair.mjs');
  const level={id:'L1',background:{src:null}};
  const v14={flags:{[NS]:{bayCityMap:{id:interiors.maps[0].id}}},levels:{contents:[level]},initialLevel:level,
    updateEmbeddedDocuments:async(t,u)=>{assert.equal(t,'Level');level.background.src=u[0]['background.src'];}};
  assert.equal(await repairSceneBackground(v14),true);
  assert.equal(level.background.src,`systems/${NS}/assets/maps/${interiors.maps[0].file}`);
  assert.equal(await repairSceneBackground(v14),false,'already set: untouched');
  const v13={flags:{[NS]:{streetAtlas:{id:'BCS-LICKTOWN'}}},background:{src:''},update:async u=>{v13.background.src=u['background.src'];}};
  assert.equal(await repairSceneBackground(v13),true);
  assert.match(v13.background.src,/streets\/bcs13-licktown\.webp$/);
  assert.equal(await repairSceneBackground({flags:{},background:{src:''}}),false,'non-Bay City scenes ignored');
});

test('every exit tag on the original and place maps leads to a real map and back again', ()=>{
  const all=Object.fromEntries([...atlas.maps,...interiors.maps,...places.maps].map(m=>[m.id,m]));
  for(const m of interiors.maps){
    assert.equal(m.links.length,m.exits.length,`${m.code}: every exit tag is linked`);
    for(const l of m.links){
      assert.ok(m.exits.includes(l.key),`${m.code}: link carries its exit tag (${l.key})`);
      // onto a street: the tag names the street section you arrive in; into a building: that building
      if(l.to.startsWith('BCS-'))assert.ok(l.key.startsWith(String(all[l.to].zones.find(z=>z.id===zoneAt(all[l.to].zones,...l.land))?.name).toUpperCase()),`${m.code}: ${l.key} names the arrival section`);
      else assert.equal(l.key,l.toName.toUpperCase());
    }
  }
  let pairs=0;
  for(const m of [...atlas.maps,...interiors.maps,...places.maps])for(const l of m.links.filter(l=>Array.isArray(l.land))){
    const dest=all[l.to];assert.ok(dest,`${m.id} → ${l.to} exists`);
    const back=dest.links.find(b=>Array.isArray(b.land)&&b.to===m.id&&Math.abs(b.land[0]-(l.rect[0]+l.rect[2]/2))<=300&&Math.abs(b.land[1]-(l.rect[1]+l.rect[3]/2))<=300);
    assert.ok(back,`${dest.id} leads back to the same spot on ${m.id}`);
    const [x,y]=l.land;assert.ok(x>=0&&y>=0&&x<=dest.width&&y<=dest.height,`${m.id}→${dest.id} lands inside the map`);
    assert.ok(zoneAt(dest.zones,x,y),`${m.id}→${dest.id} lands inside a zone`);
    pairs++;
  }
  const placeLinks=places.maps.reduce((n,m)=>n+m.links.length,0);
  assert.equal(pairs,38+2*placeLinks,'19 original two-way links plus every place entrance both ways');
  for(const m of places.maps)assert.equal(m.links.length,m.exits.length,`${m.name}: every exit tag is linked`);
});

test('contacts get portraits: named Cold Storage faces, category looks for everyone else', async ()=>{
  const {CONTACT_PORTRAITS,contactPortrait,namedPortrait}=await import('../module/contact-portraits.mjs');
  const files=[...Object.values(CONTACT_PORTRAITS.generic).flat(),...Object.values(CONTACT_PORTRAITS.named)];
  for(const f of files)assert.ok(existsSync(join(root,f.replace('systems/altered-carbon-rpg/',''))),f);
  assert.match(namedPortrait('Tom Arlen'),/named\/tom-arlen\.svg$/);
  assert.match(namedPortrait('Dr Lucan Vey'),/named\/elias-north\.svg$/,'historical identity maps to the same face');
  assert.match(contactPortrait('Kade Morrow','mercenary'),/generic\/mercenary-\d\d\.svg$/);
  assert.match(contactPortrait('Ana Pell','informant, supplier'),/generic\/supplier-\d\d\.svg$/);
  assert.equal(contactPortrait('Ana Pell','supplier'),contactPortrait('Ana Pell','supplier'),'same contact, same face');
  assert.match(contactPortrait('Nobody',''),/generic\/contact-\d\d\.svg$/);
});

test('repair refreshes the links on Bay City scenes imported before they existed', async ()=>{
  globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(readFileSync(join(root,'data',url.split('/').pop()),'utf8'))});
  const {syncSceneLinks}=await import('../module/scene-repair.mjs');
  const scene={flags:{[NS]:{bayCityMap:{id:'BAY-PRECINCT'}}},update:async u=>{foundry.utils.setProperty(scene,Object.keys(u)[0],Object.values(u)[0]);}};
  assert.equal(await syncSceneLinks(scene),true);
  assert.deepEqual(scene.flags[NS].bayCityMap.links.map(l=>l.to),['BCS-FELL','BCS-FELL']);
  assert.equal(await syncSceneLinks(scene),false,'already current');
});

test('v14: transit puts the vehicle and riders on the new map\'s Level; taxi passengers pick any destination', async ()=>{
  let seq=0;const emitted=[];
  const mkDoc=(d,parent)=>{const t={...structuredClone(d),id:d._id||('n'+(++seq)),parent};t.getFlag=(ns,k)=>t.flags?.[ns]?.[k];
    t.toObject=()=>{const o={};for(const [k,v] of Object.entries(t))if(typeof v!=='function'&&!['parent','actor'].includes(k))o[k]=structuredClone(v);o._id=t.id;delete o.id;return o;};
    t.update=async u=>{for(const [k,v] of Object.entries(u))foundry.utils.setProperty(t,k,v);return t;};return t;};
  const mkScene=(id,m,kind,level)=>{const s={id,name:m.name,width:m.width,height:m.height,grid:{size:100},flags:{[NS]:{[kind]:{id:m.id,links:m.links}}},tokens:[],deleted:[],
      levels:{contents:[{id:level}]},initialLevel:{id:level}};
    s.getFlag=(ns,k)=>s.flags[ns]?.[k];s.tokens.get=i=>s.tokens.find(t=>t.id===i);
    s.createEmbeddedDocuments=async(type,list)=>list.map(d=>{const t=mkDoc(d,s);t.actor=d.actorId==='cab'?cabActor:playerActor;s.tokens.push(t);return t;});
    s.deleteEmbeddedDocuments=async(type,ids,opts)=>{s.deleted.push({ids,opts});for(const i of ids)s.tokens.splice(s.tokens.findIndex(t=>t.id===i),1);};
    s.view=async()=>{};return s;};
  const player={id:'pl',isGM:false,active:true},gm={id:'gm',isGM:true,active:true};
  const cabActor={type:'vehicle',system:{vehicle:{control:'ai'}},testUserPermission:u=>u.isGM};
  const playerActor={type:'character',testUserPermission:u=>u.isGM||u.id==='pl'};
  const fell=byId['BCS-FELL'],licktown=byId['BCS-LICKTOWN'];
  const src=mkScene('s1',fell,'streetAtlas','lvlA'),dst=mkScene('s2',licktown,'streetAtlas','lvlB');
  const cab=mkDoc({_id:'cab',actorId:'cab',name:'Bay City Autocab',x:1500,y:1200,width:2,height:3,level:'lvlA',_regions:['r1'],flags:{[NS]:{vehicleOccupants:[{seatId:'passenger-1',tokenId:'kov',name:'Kovacs'}]}}},src);cab.actor=cabActor;
  const kov=mkDoc({_id:'kov',actorId:'pc',name:'Kovacs',x:1525,y:1325,width:.5,height:.5,level:'lvlA',flags:{[NS]:{vehicleSeat:{vehicleTokenId:'cab',seatId:'passenger-1'}}}},src);kov.actor=playerActor;
  src.tokens.push(cab,kov);
  globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(readFileSync(join(root,'data',url.split('/').pop()),'utf8'))});
  globalThis.game={user:gm,users:Object.assign([gm,player],{activeGM:gm,get:i=>[gm,player].find(u=>u.id===i),filter:f=>[gm,player].filter(f)}),scenes:Object.assign([src,dst],{get:i=>[src,dst].find(s=>s.id===i)}),combats:[],
    socket:{emit:(e,p)=>emitted.push(p),on(){}},packs:{get:()=>null}};
  globalThis.ChatMessage={implementation:{create:async()=>null}};globalThis.ui={notifications:{info(){},warn(){}}};
  const T=await import('../module/map-transit.mjs?levels='+Date.now());
  const list=await T.transitDestinations();
  const atlasCount=JSON.parse(readFileSync(join(root,'data/bay-city-street-atlas.json'),'utf8')).maps.length;
  assert.equal(list.filter(d=>d.key.endsWith(':centre')).length,atlasCount,'every street map is a destination');
  assert.ok(list.some(d=>d.label.includes('outside')),'building entrances are destinations');
  assert.ok(list.some(d=>d.key.endsWith(':inside')),'original maps are destinations');
  assert.equal(new Set(list.map(d=>d.key)).size,list.length,'unique keys');
  assert.ok(T.canChooseDestination(kov,player),'a passenger in an AI taxi chooses where it goes');
  cabActor.system.vehicle.control='driver';assert.equal(T.canChooseDestination(kov,player),false,'not in an ordinary car');cabActor.system.vehicle.control='ai';
  const dest=list.find(d=>d.mapId==='BCS-LICKTOWN'&&d.label.includes('The Fight Pit'));assert.ok(dest);
  // the player's request is handled by the GM client
  game.user=gm;
  const handler=T;await handler.crossToNextMap(kov,{destination:dest.key}).catch(e=>{throw e;});
  // crossToNextMap ran as the GM (leader); repeat as the player's request would be validated the same way
  const nCab=dst.tokens.find(t=>t.name==='Bay City Autocab'),nKov=dst.tokens.find(t=>t.name==='Kovacs');
  assert.ok(nCab&&nKov,'taxi and passenger are on the new map');
  assert.equal(nCab.level,'lvlB','vehicle is on the new map\'s Level');assert.equal(nKov.level,'lvlB','rider is on the new map\'s Level');
  assert.equal(nCab._regions,undefined,'stale region membership dropped');
  assert.equal(Math.round(nCab.x+nCab.width*100/2),dest.land[0]);assert.equal(Math.round(nCab.y+nCab.height*100/2),dest.land[1],'arrives at the chosen spot');
  assert.equal(nKov.flags[NS].vehicleSeat.vehicleTokenId,nCab.id);
  assert.equal(src.tokens.length,0);
  await assert.rejects(T.crossToNextMap(nKov,{destination:'BCS-NOWHERE:centre'}),/Unknown destination/);
});

test('Cold Storage: every building stands on the Street Atlas, every exit tag leads somewhere, and the taxi list knows them', async ()=>{
  const cs=JSON.parse(readFileSync(join(root,'data/cold-storage-links.json'),'utf8'));
  const placed=Object.values(cs.streetDoors).flat();
  assert.equal(placed.length,8,'eight buildings on the streets');
  for(const id of ['SCENE-WARD','SCENE-BREACH','SCENE-RAINLINE','SCENE-ARCHIVE','SCENE-LOTUS','SCENE-RELAY','SCENE-SAFEHOUSE','SCENE-SPIRE'])assert.ok(placed.some(d=>d.to===id),id);
  for(const [mid,doors] of Object.entries(cs.streetDoors)){
    const m=byId[mid];assert.ok(m,mid);
    for(const d of doors){const [x,y]=[d.rect[0]+d.rect[2]/2,d.rect[1]+d.rect[3]/2];
      assert.ok(m.zones.some(z=>['road','junction'].includes(z.kind)&&x>=z.rect[0]&&x<=z.rect[0]+z.rect[2]&&y>=z.rect[1]&&y<=z.rect[1]+z.rect[3]),`${d.toName} entrance is on a road of ${m.name}`);
      assert.ok(!m.links.some(l=>l.rect[0]<d.rect[0]+d.rect[2]&&d.rect[0]<l.rect[0]+l.rect[2]&&l.rect[1]<d.rect[1]+d.rect[3]&&d.rect[1]<l.rect[1]+l.rect[3]),`${d.toName} entrance does not overlap another link`);}
  }
  for(const [sid,rec] of Object.entries(cs.scenes))for(const l of rec.links){
    if(byId[l.to])assert.ok(cs.streetDoors[l.to].some(d=>d.to===sid),`${sid} → ${l.to} comes back out at its own entrance`);
    else assert.ok(cs.scenes[l.to]||['SCENE-COUNCIL','SCENE-SPIRE','SCENE-SAFEHOUSE','SCENE-BREACH','SCENE-RAINLINE','SCENE-LOTUS','SCENE-ARCHIVE','SCENE-RELAY'].includes(l.to),l.to);
  }
  const T=await import('../module/map-transit.mjs?cs='+Date.now());
  // inactive module: nothing added
  globalThis.game={modules:{get:()=>({active:false})}};T.setColdStorageLinks(cs);
  const street={getFlag:(ns,k)=>ns===NS&&k==='streetAtlas'?{id:'BCS-LICKTOWN',links:byId['BCS-LICKTOWN'].links}:null};
  assert.equal(T.mapLinks(street).length,byId['BCS-LICKTOWN'].links.length,'module absent: street maps unchanged');
  game.modules.get=()=>({active:true});
  assert.equal(T.mapLinks(street).length,byId['BCS-LICKTOWN'].links.length+cs.streetDoors['BCS-LICKTOWN'].length,'module present: entrances added');
  const csScene={getFlag:(ns,k)=>ns==='cold-storage'&&k==='sourceId'?'SCENE-RAINLINE':null};
  assert.equal(T.mapOf(csScene)?.id,'SCENE-RAINLINE');assert.equal(T.mapLinks(csScene).length,cs.scenes['SCENE-RAINLINE'].links.length);
  const list=T.buildDestinations(atlas,interiors,cs);
  assert.equal(list.filter(d=>d.group==='Cold Storage').length,8,'taxi list: outside every Cold Storage building');
  assert.ok(list.find(d=>d.group==='Cold Storage'&&/Rainline/.test(d.short)).mapId==='BCS-LICKTOWN');
  assert.equal(T.buildDestinations(atlas,interiors,null).filter(d=>d.group==='Cold Storage').length,0);
  // walking in
  const door=cs.streetDoors['BCS-LICKTOWN'].find(d=>d.to==='SCENE-RAINLINE');
  const pc={actor:{type:'character'},getFlag:()=>null},cab={actor:{type:'vehicle'},getFlag:()=>null};
  assert.equal(T.shouldAutoEnter(pc,door,null,true),true,'a character walking in goes inside');
  assert.equal(T.shouldAutoEnter(pc,door,T.linkId(door),true),false,'not when already standing in the doorway');
  assert.equal(T.shouldAutoEnter(cab,door,null,true),false,'vehicles park; they do not drive inside');
  assert.equal(T.shouldAutoEnter(pc,{kind:'edge',to:'X',rect:[0,0,1,1]},null,true),false,'map edges still use the button');
  assert.equal(T.shouldAutoEnter(pc,door,null,false),false,'setting off');
});

test('Cold Storage end to end: the taxi parks outside the Rainline, a passenger walks in and lands inside', async ()=>{
  const cs=JSON.parse(readFileSync(join(root,'data/cold-storage-links.json'),'utf8'));
  let seq=0;
  const mkDoc=(d,parent)=>{const t={...structuredClone(Object.fromEntries(Object.entries(d).filter(([k])=>k!=='actor'))),actor:d.actor,id:d._id||('e'+(++seq)),parent};t.getFlag=(ns,k)=>t.flags?.[ns]?.[k];
    t.toObject=()=>{const o={};for(const [k,v] of Object.entries(t))if(typeof v!=='function'&&!['parent','actor'].includes(k))o[k]=structuredClone(v);o._id=t.id;delete o.id;return o;};
    t.update=async u=>{for(const [k,v] of Object.entries(u))foundry.utils.setProperty(t,k,v);return t;};return t;};
  const cabActor={name:'Bay City Autocab',type:'vehicle',system:{vehicle:{control:'ai'}},testUserPermission:u=>u.isGM};
  const pcActor={type:'character',testUserPermission:u=>u.isGM||u.id==='pl'};
  const mkScene=(id,name,w,h,flags)=>{const s={id,name,width:w,height:h,grid:{size:100},flags,tokens:[],levels:{contents:[{id:'L'+id}]},initialLevel:{id:'L'+id}};
    s.getFlag=(ns,k)=>s.flags[ns]?.[k];s.tokens.get=i=>s.tokens.find(t=>t.id===i);
    s.createEmbeddedDocuments=async(type,list)=>list.map(d=>{const t=mkDoc({...d,actor:d.name==='Bay City Autocab'?cabActor:pcActor},s);s.tokens.push(t);return t;});
    s.deleteEmbeddedDocuments=async(type,ids)=>{for(const i of ids)s.tokens.splice(s.tokens.findIndex(t=>t.id===i),1);};s.view=async()=>{};return s;};
  const fell=byId['BCS-FELL'],lick=byId['BCS-LICKTOWN'],rain=JSON.parse(readFileSync(join(root,'data/cold-storage-links.json'),'utf8')).scenes['SCENE-RAINLINE'];
  const src=mkScene('f','Fell',fell.width,fell.height,{[NS]:{streetAtlas:{id:fell.id,links:fell.links}}});
  const lt=mkScene('l','Licktown',lick.width,lick.height,{[NS]:{streetAtlas:{id:lick.id,links:lick.links}}});
  const rl=mkScene('r','The Rainline',2800,1800,{'cold-storage':{sourceId:'SCENE-RAINLINE'}});
  const cab=mkDoc({_id:'cab',name:'Bay City Autocab',actor:cabActor,x:1500,y:1200,width:2,height:3,flags:{[NS]:{vehicleOccupants:[{seatId:'passenger-1',tokenId:'nia',name:'Nia'}]}}},src);
  const nia=mkDoc({_id:'nia',name:'Nia',actor:pcActor,x:1525,y:1325,width:.5,height:.5,flags:{[NS]:{vehicleSeat:{vehicleTokenId:'cab',seatId:'passenger-1'}}}},src);
  src.tokens.push(cab,nia);
  const gm={id:'gm',isGM:true,active:true},pl={id:'pl',isGM:false,active:true};
  globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(readFileSync(join(root,'data',url.split('/').pop()),'utf8'))});
  globalThis.game={user:gm,users:Object.assign([gm,pl],{activeGM:gm,get:i=>[gm,pl].find(u=>u.id===i)}),scenes:Object.assign([src,lt,rl],{get:i=>[src,lt,rl].find(s=>s.id===i)}),combats:[],
    modules:{get:id=>id==='cold-storage'?{active:true}:null},socket:{emit(){},on(){}},packs:{get:()=>null}};
  globalThis.ChatMessage={implementation:{create:async()=>null}};globalThis.ui={notifications:{info(){},warn(){}}};
  const T=await import('../module/map-transit.mjs?e2e='+Date.now());T.setColdStorageLinks(cs);
  const dest=(await T.transitDestinations()).find(d=>d.group==='Cold Storage'&&/Rainline/.test(d.short));
  await T.crossToNextMap(nia,{destination:dest.key});
  const parked=lt.tokens.find(t=>t.name==='Bay City Autocab');assert.ok(parked,'the taxi is on the Licktown map');
  const door=cs.streetDoors['BCS-LICKTOWN'].find(d=>d.to==='SCENE-RAINLINE');
  assert.equal(parked.x+100,door.rect[0]+100);assert.equal(parked.y+150,door.rect[1]+100,'parked on the Rainline entrance');
  // Nia gets out and walks into the entrance
  const walker=lt.tokens.find(t=>t.name==='Nia');walker.flags[NS].vehicleSeat=null;walker.width=1;walker.height=1;walker.x=door.rect[0]+50;walker.y=door.rect[1]+50;
  assert.equal(T.linkAt(lt,walker)?.to,'SCENE-RAINLINE');
  assert.equal(T.shouldAutoEnter(walker,T.linkAt(lt,walker),null,true),true);
  await T.crossToNextMap(walker);
  const inside=rl.tokens.find(t=>t.name==='Nia');assert.ok(inside,'Nia is on the Rainline map');
  assert.equal(inside.level,'Lr','on the Rainline Level');
  assert.equal(inside.x+50,door.land[0]);assert.equal(inside.y+50,door.land[1]);
  // and back out the way she came
  inside.x=rain.links.find(l=>l.to==='BCS-LICKTOWN').rect[0]+50;inside.y=rain.links.find(l=>l.to==='BCS-LICKTOWN').rect[1]+50;
  assert.equal(T.linkAt(rl,inside)?.to,'BCS-LICKTOWN');
});

test('master overview: each Cold Storage building is pinned at its true spot and opens the travel list on it', async ()=>{
  const cs=JSON.parse(readFileSync(join(root,'data/cold-storage-links.json'),'utf8'));
  const ov=JSON.parse(readFileSync(join(root,'data/bay-city-street-overview.json'),'utf8')).maps[0];
  const T=await import('../module/map-transit.mjs?ov='+Date.now());
  globalThis.game={modules:{get:()=>({active:false})}};T.setColdStorageLinks(cs);
  assert.equal(T.overviewColdStorage(ov).length,0,'module absent: overview unchanged');
  game.modules.get=()=>({active:true});
  const spots=T.overviewColdStorage(ov);assert.equal(spots.length,8);
  for(const s of spots){
    const district=ov.links.find(l=>l.to===s.link.to);const [x,y,w,h]=district.rect;
    assert.ok(s.rect[0]>=x&&s.rect[0]+s.rect[2]<=x+w&&s.rect[1]>=y&&s.rect[1]+s.rect[3]<=y+h,`${s.label} inside ${district.toName}`);
  }
  const hit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
  spots.forEach((s,i)=>{const [x,y,w,h]=s.district;assert.ok(s.labelBox.x>=x&&s.labelBox.x+s.labelBox.w<=x+w&&s.labelBox.y>=y&&s.labelBox.y+s.labelBox.h<=y+h,`${s.label} label inside its district`);
    spots.slice(i+1).forEach(t=>assert.ok(!hit(s.labelBox,t.labelBox),`${s.label} / ${t.label} labels do not overlap`));});
  const scene={grid:{size:100},getFlag:(ns,k)=>ns===NS&&k==='streetAtlas'?ov:null};
  const rain=spots.find(s=>/RAINLINE/.test(s.label));
  const tok={x:rain.rect[0]+10,y:rain.rect[1]+10,width:1,height:1};
  const link=T.linkAt(scene,tok);assert.equal(link.to,'BCS-LICKTOWN');assert.match(link.toName,/Rainline/);
  const dest=T.buildDestinations(atlas,interiors,cs).find(d=>d.group==='Cold Storage'&&/Rainline/.test(d.short));
  assert.deepEqual(link.land,dest.land,'the travel list opens on "Outside The Rainline"');
  const elsewhere={x:ov.links[0].rect[0]+5,y:ov.links[0].rect[1]+5,width:1,height:1};
  assert.equal(T.linkAt(scene,elsewhere).kind,'district','the rest of a district still opens on its junction');
});

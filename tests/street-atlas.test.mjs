// v2.5.2 Street Atlas: linked edges, zones, landing positions, transit and v14 background repair.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const atlas=JSON.parse(readFileSync(join(root,'data/bay-city-street-atlas.json'),'utf8'));
const interiors=JSON.parse(readFileSync(join(root,'data/bay-city-maps.json'),'utf8'));
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
  assert.equal(nKov.x-nCar.x,25);assert.equal(nOrt.x-nCar.x,125,'riders keep their seats');
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

test('every exit tag on the original maps leads to a real map and back again', ()=>{
  const all=Object.fromEntries([...atlas.maps,...interiors.maps].map(m=>[m.id,m]));
  for(const m of interiors.maps){
    assert.equal(m.links.length,m.exits.length,`${m.code}: every exit tag is linked`);
    for(const l of m.links)assert.ok(m.exits.includes(l.toName.toUpperCase()),`${m.code}: exit is labelled with its destination (${l.toName})`);
  }
  let pairs=0;
  for(const m of [...atlas.maps,...interiors.maps])for(const l of m.links.filter(l=>Array.isArray(l.land))){
    const dest=all[l.to];assert.ok(dest,`${m.id} → ${l.to} exists`);
    const back=dest.links.find(b=>Array.isArray(b.land)&&b.to===m.id&&Math.abs(b.land[0]-(l.rect[0]+l.rect[2]/2))<=300&&Math.abs(b.land[1]-(l.rect[1]+l.rect[3]/2))<=300);
    assert.ok(back,`${dest.id} leads back to the same spot on ${m.id}`);
    const [x,y]=l.land;assert.ok(x>=0&&y>=0&&x<=dest.width&&y<=dest.height,`${m.id}→${dest.id} lands inside the map`);
    assert.ok(zoneAt(dest.zones,x,y),`${m.id}→${dest.id} lands inside a zone`);
    pairs++;
  }
  assert.equal(pairs,38,'19 two-way links');
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

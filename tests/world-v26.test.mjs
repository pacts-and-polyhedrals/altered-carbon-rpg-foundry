import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const NS='altered-carbon-rpg';
const J=f=>JSON.parse(readFileSync(join(root,'data',f),'utf8'));
const atlas=J('bay-city-street-atlas.json'),interiors=J('bay-city-maps.json'),places=J('bay-city-places.json'),cs=J('cold-storage-links.json');
const all=Object.fromEntries([...atlas.maps,...interiors.maps,...places.maps].map(m=>[m.id,m]));
const generic=n=>/Block( \d+)?$/.test(n);
const CS_BLOCKS=new Set(Object.values(cs.streetDoors).flat().map(d=>d.at));

test('one name everywhere: every entrance block is named exactly after the map it opens into', ()=>{
  for(const m of atlas.maps)for(const l of m.links.filter(l=>l.kind==='door')){
    const dest=all[l.to];assert.ok(dest,`${m.name}: ${l.to}`);
    assert.equal(l.toName,dest.name,`${m.name}: door names its map`);
    assert.ok(l.at===dest.name||l.at.startsWith(`${dest.name} · `),`${m.name}: block "${l.at}" matches "${dest.name}"`);
  }
  for(const m of places.maps){assert.equal(all[m.street].zones.some(z=>z.name===m.name),true,`${m.name} is a block on ${m.street}`);}
});

test('every named place in Bay City has a map (Cold Storage places through the module)', ()=>{
  let named=0;
  for(const m of atlas.maps)for(const z of m.zones.filter(z=>z.kind==='land'&&!generic(z.name))){
    named++;
    const hasDoor=m.links.some(l=>l.kind==='door'&&(l.at===z.name||String(l.at).startsWith(z.name)))||CS_BLOCKS.has(z.name);
    assert.ok(hasDoor,`${m.name}: ${z.name} has an entrance`);
  }
  assert.ok(named>=80,`${named} named places`);
  assert.equal(places.maps.length,57);
  for(const m of places.maps){
    assert.ok(existsSync(join(root,'assets/maps',m.file)),m.file);
    assert.equal(m.links.length,m.exits.length,`${m.name}: every exit linked`);
    assert.ok(m.zones.length>=3);
    for(const l of m.links){const [x,y]=l.land;assert.ok(all[l.to].zones.some(z=>x>=z.rect[0]&&x<=z.rect[0]+z.rect[2]&&y>=z.rect[1]&&y<=z.rect[1]+z.rect[3]),`${m.name} → ${l.to} lands in a zone`);}
  }
  const sys=JSON.parse(readFileSync(join(root,'system.json'),'utf8'));
  for(const p of ['bay-city-places','bay-city-directory'])assert.ok(sys.packs.some(x=>x.name===p)&&existsSync(join(root,'packs',p,'CURRENT')),p);
});

test('party at an exit: the GM option list and the whole party moving; a taxi parks outside and its riders walk in', async ()=>{
  let seq=0;
  const mkDoc=(d,parent)=>{const t={...structuredClone(Object.fromEntries(Object.entries(d).filter(([k])=>k!=='actor'))),actor:d.actor,id:d._id||('w'+(++seq)),parent};t.getFlag=(ns,k)=>t.flags?.[ns]?.[k];
    t.toObject=()=>{const o={};for(const [k,v] of Object.entries(t))if(typeof v!=='function'&&!['parent','actor'].includes(k))o[k]=structuredClone(v);o._id=t.id;delete o.id;return o;};
    t.update=async u=>{for(const [k,v] of Object.entries(u))foundry.utils.setProperty(t,k,v);return t;};return t;};
  const cabActor={id:'cabA',name:'Bay City Autocab',type:'vehicle',system:{vehicle:{control:'ai',passengers:4,crewFull:1}},ownership:{},testUserPermission:u=>u.isGM,update:async()=>{}};
  const pc=uid=>({type:'character',testUserPermission:u=>u.isGM||u.id===uid});
  const actorFor=d=>d.name==='Bay City Autocab'?cabActor:pc(d.name==='Nia'?'p1':'p2');
  const mkScene=(id,m,flags)=>{const s={id,name:m.name,width:m.width,height:m.height,grid:{size:100},flags,tokens:[],levels:{contents:[{id:'L'+id}]},initialLevel:{id:'L'+id},activated:false};
    s.getFlag=(ns,k)=>s.flags[ns]?.[k];s.tokens.get=i=>s.tokens.find(t=>t.id===i);Object.defineProperty(s.tokens,'contents',{get:()=>[...s.tokens]});
    s.createEmbeddedDocuments=async(type,list)=>list.map(d=>{const t=mkDoc({...d,actor:actorFor(d)},s);s.tokens.push(t);return t;});
    s.deleteEmbeddedDocuments=async(type,ids)=>{for(const i of ids)s.tokens.splice(s.tokens.findIndex(t=>t.id===i),1);};s.view=async()=>{};s.activate=async()=>{s.activated=true;};return s;};
  const civic=all['BCS-CIVIC'],fell=all['BCS-FELL'],opera=places.maps.find(p=>p.name==='Opera House');
  const street=mkScene('c',civic,{[NS]:{streetAtlas:{id:civic.id,links:civic.links}}});
  const far=mkScene('f',fell,{[NS]:{streetAtlas:{id:fell.id,links:fell.links}}});
  const inside=mkScene('o',opera,{[NS]:{bayCityMap:{id:opera.id,links:opera.links}}});
  const door=civic.links.find(l=>l.kind==='door'&&l.to===opera.id);
  // the cab is parked on the far street map with Nia aboard; Ortega walks to the Opera House door
  const cab=mkDoc({_id:'cab',name:'Bay City Autocab',actor:cabActor,actorId:'cabA',x:1500,y:1200,width:2,height:3,flags:{[NS]:{vehicleOccupants:[{seatId:'passenger-1',tokenId:'nia',name:'Nia',original:{width:1,height:1}}]}}},far);
  const nia=mkDoc({_id:'nia',name:'Nia',actor:pc('p1'),x:1525,y:1325,width:.5,height:.5,flags:{[NS]:{vehicleSeat:{vehicleTokenId:'cab',seatId:'passenger-1'}}}},far);
  far.tokens.push(cab,nia);
  const gm={id:'gm',isGM:true,active:true},p1={id:'p1',isGM:false,active:true},p2={id:'p2',isGM:false,active:true};
  const users=Object.assign([gm,p1,p2],{activeGM:gm,get(i){return this.find(u=>u.id===i);}});
  globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(readFileSync(join(root,'data',url.split('/').pop()),'utf8'))});
  globalThis.foundry={utils:{escapeHTML:s=>String(s),setProperty:(o,k,v)=>{const p=k.split('.');let c=o;for(const x of p.slice(0,-1))c=c[x]??={};c[p.at(-1)]=v;},deepClone:o=>structuredClone(o)}};
  globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{NONE:0,OWNER:3}};
  globalThis.game={user:gm,users,scenes:Object.assign([street,far,inside],{get:i=>[street,far,inside].find(s=>s.id===i)}),combats:[],actors:{get:()=>cabActor},modules:{get:()=>null},socket:{emit(){},on(){}},packs:{get:()=>null}};
  globalThis.ChatMessage={implementation:{create:async()=>null}};globalThis.ui={notifications:{info(){},warn(){}}};
  const T=await import('../module/map-transit.mjs?w26='+Date.now());
  // 1. taxi to "Outside Opera House"
  const dest=(await T.transitDestinations()).find(d=>d.mapId==='BCS-CIVIC'&&/Outside Opera House/.test(d.short));assert.ok(dest,'Opera House is in the taxi list');
  await T.crossToNextMap(nia,{destination:dest.key});
  const cabHere=street.tokens.find(t=>t.name==='Bay City Autocab');assert.ok(cabHere,'taxi arrived on Civic Center');
  // 2. Ortega walks up; the party (Nia still in the cab, Ortega on foot) is at the door
  const ort=mkDoc({_id:'ort',name:'Ortega',actor:pc('p2'),x:door.rect[0],y:door.rect[1]+100,width:1,height:1},street);street.tokens.push(ort);
  const P=await import('../module/party-exits.mjs?w26='+Date.now());
  const party=P.partyTokens(street,users);assert.deepEqual(party.map(t=>t.name).sort(),['Nia','Ortega']);
  const here=P.gatheredExits(street,party,T.mapLinks(street));assert.ok(here.some(l=>l.to===opera.id),'the GM is offered the Opera House');
  const opts=P.destinationOptions(here);assert.ok(opts.length>=1);
  assert.equal(P.zoneAtPoint(opera.zones,door.land)!=='',true,'arrival zone named');
  await P.movePartyThrough(street,opts.find(l=>l.to===opera.id));
  assert.deepEqual(inside.tokens.map(t=>t.name).sort(),['Nia','Ortega'],'both characters are inside');
  const niaIn=inside.tokens.find(t=>t.name==='Nia');assert.equal(niaIn.width,1,'Nia is full size again');assert.equal(niaIn.flags[NS].vehicleSeat,null,'and out of her seat');
  assert.equal(inside.tokens.some(t=>t.name==='Bay City Autocab'),false,'the car does not go inside');
  const parked=street.tokens.find(t=>t.name==='Bay City Autocab');assert.ok(parked,'the car is still outside on Civic Center');
  assert.deepEqual(parked.flags[NS].vehicleOccupants,[],'and empty');
  assert.equal(inside.activated,true,'the scene changes for everyone');
});

test('top-down character tokens: named adversaries, AI holograms, and a stable look for everyone else', async ()=>{
  globalThis.foundry??={utils:{getProperty:()=>null}};
  const {personToken,PEOPLE_TOKENS}=await import('../module/emblems.mjs');
  assert.match(personToken('threat','Hitman'),/npc-hitman\.webp$/);
  assert.match(personToken('ai','Poe'),/ai-hologram\.webp$/);
  assert.equal(personToken('character','Takeshi Kovacs'),personToken('character','Takeshi Kovacs'),'same name, same look');
  assert.ok(PEOPLE_TOKENS.generic.length>=30);
  for(const src of [...Object.values(PEOPLE_TOKENS.named),...PEOPLE_TOKENS.generic,PEOPLE_TOKENS.ai])assert.ok(existsSync(join(root,src.replace('systems/altered-carbon-rpg/',''))),src);
});

test('named top-down tokens for the Cold Storage pregens, benefactors and adversaries', async ()=>{
  const {namedPersonToken}=await import('../module/emblems.mjs');
  for(const n of ['Nia Calder','Tomas "Latch" Araya','Sabine Kade','Imani Voss','Cass Ren','Dr Edda Sorn','Anik Rao','Solenne Pryce',
    'Dr Adria Sen','Magistrate Severin Holt','Director Oren Thale',
    'Palimpsest Recovery Dipper','Palimpsest Retrieval Hitman','Compromised Protectorate Officer','Praetorian Black-Recovery Operative']){
    const src=namedPersonToken(n);assert.ok(src,`${n} has a token`);assert.ok(existsSync(join(root,src.replace('systems/altered-carbon-rpg/',''))),src);
  }
  assert.equal(namedPersonToken('Tomas “Latch” Araya'),namedPersonToken('tomas latch araya'),'quotes and case do not matter');
  assert.equal(namedPersonToken('Somebody Else'),null);
});

test('overview: Cold Storage pins sit on their own buildings, two on one block are spread apart', async ()=>{
  const T=await import('../module/map-transit.mjs?pins='+Date.now());
  globalThis.game={modules:{get:()=>({active:true})}};T.setColdStorageLinks(cs);
  const ov=J('bay-city-street-overview.json').maps[0];const spots=T.overviewColdStorage(ov);
  for(const s of spots){const p=T.pinOf(s),b=s.block;assert.ok(p.x>=b[0]&&p.x+p.w<=b[0]+b[2]&&p.y>=b[1]&&p.y+p.h<=b[1]+b[3],`${s.label} pin inside its block`);}
  const ward=spots.filter(s=>/WARD|BREACH/.test(s.label));assert.equal(ward.length,2);
  const [a,b]=ward.map(T.pinOf);assert.ok(Math.abs(a.x-b.x)>=a.w,'pins do not overlap');
  const [la,lb]=ward.map(s=>s.labelBox);assert.ok(la.y+la.h<=lb.y||lb.y+lb.h<=la.y,'labels stacked');
});

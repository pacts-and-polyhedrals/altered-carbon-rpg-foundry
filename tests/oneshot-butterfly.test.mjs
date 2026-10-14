import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const NS='altered-carbon-rpg';
globalThis.foundry??={utils:{escapeHTML:s=>s}};
const J=f=>JSON.parse(readFileSync(join(root,'data',f),'utf8'));
const story=J('oneshot-butterfly-cut.json');
const maps=new Map([...J('bay-city-street-atlas.json').maps,...J('bay-city-maps.json').maps,...J('bay-city-places.json').maps].map(m=>[m.id,m]));
const {pinsForMap,pageIndex,sceneMapId,ONESHOTS}=await import('../module/oneshot.mjs');
const art=src=>join(root,src.replace(`systems/${NS}/`,''));

test('every Bay City map has a place in the web, with a real zone, a mission and clues to real places', ()=>{
  const ids=story.places.map(p=>p.id);
  assert.equal(new Set(ids).size,ids.length,'no duplicates');
  assert.deepEqual([...maps.keys()].sort(),[...ids].sort(),'one place per map: 14 streets, 10 buildings, 57 places');
  assert.equal(ids.length,81);
  for(const p of story.places){
    assert.ok(maps.get(p.id).zones.some(z=>z.name===p.zone),`${p.id} zone ${p.zone}`);
    assert.ok(p.scene&&p.mission,`${p.id} scene and mission`);
    assert.ok(p.clues.length>=1,`${p.id} has clues`);
    for(const c of p.clues){assert.ok(maps.has(c.to),`${p.id} → ${c.to}`);assert.notEqual(c.to,p.id);}
    assert.ok(story.threads.some(t=>t.id===p.thread),`${p.id} thread`);
    if(p.npc)assert.ok(story.npcs.some(n=>n.id===p.npc),`${p.id} npc`);
  }
});

test('the web is connected: every place can be reached from Licktown and every building is pointed to by a clue', ()=>{
  const by=new Map(story.places.map(p=>[p.id,p])),seen=new Set(),todo=[story.meta.start];
  const streetOf=id=>[...maps.values()].find(m=>m.id.startsWith('BCS-')&&m.links.some(l=>l.kind==='door'&&l.to===id))?.id;
  while(todo.length){const x=todo.pop();if(seen.has(x))continue;seen.add(x);
    for(const c of by.get(x).clues)todo.push(c.to);
    if(x.startsWith('BCS-'))for(const l of maps.get(x).links)if(l.to&&maps.has(l.to))todo.push(l.to);
    const s=streetOf(x);if(s)todo.push(s);}
  assert.equal(seen.size,81,'all reachable');
  for(const p of story.places)if(!p.id.startsWith('BCS-'))assert.ok(story.places.some(q=>q.clues.some(c=>c.to===p.id)),`${p.id} has an inbound clue`);
  assert.ok(story.places.reduce((n,p)=>n+p.clues.length,0)>=200,'a dense web');
});

test('threads, clock, pressure points, handouts and backstory all point at real places', ()=>{
  assert.equal(story.threads.length,8);
  for(const t of story.threads){for(const s of t.spine)assert.ok(maps.has(s),`${t.id} ${s}`);assert.ok(story.pregens.some(g=>g.id===t.pregen));}
  assert.equal(story.clock[0].hour,'21:00');assert.equal(story.clock.at(-1).hour,'05:00');
  for(const x of [...story.clock,...story.backstory,...story.handouts])assert.ok(maps.has(x.place),x.place);
  assert.equal(story.pressure.length,5);
  assert.equal(story.backstory[0].place,'BCP-SEAWALL-PUMPS','the first domino is the storm');
});

test('eight BCPD-linked pregens, each with a personal domino and a top-down token; NPCs have tokens too', ()=>{
  assert.equal(story.pregens.length,8);
  const threads=new Set(story.pregens.map(g=>g.thread));assert.equal(threads.size,8,'one thread each');
  const {PEOPLE_TOKENS}=awaitImport();
  for(const g of story.pregens){
    assert.ok(g.domino&&g.hook&&g.goal,g.name);
    for(const l of g.leads)assert.ok(maps.has(l));
    const tok=PEOPLE_TOKENS.named[g.name];assert.ok(tok,`${g.name} token`);assert.ok(existsSync(art(tok)),tok);
  }
  for(const n of story.npcs){const tok=PEOPLE_TOKENS.named[n.name];assert.ok(tok,`${n.name} token`);assert.ok(existsSync(art(tok)));}
});
let emblemMod=null;
function awaitImport(){return emblemMod;}
test.before(async()=>{emblemMod=await import('../module/emblems.mjs');});

test('case pins: the map\'s own place plus one per building entrance, on the building\'s block', ()=>{
  const lick=pinsForMap('BCS-LICKTOWN',maps,story.places,71);
  assert.equal(lick[0].place,'BCS-LICKTOWN');
  const places=lick.map(p=>p.place).sort();
  assert.deepEqual(places,['BAY-MARKET','BAY-PIT','BCP-CHOP-SHOPS','BCP-CONTAINER-HABS','BCP-POTRERO-HILL','BCP-SCRAPYARD','BCP-STACK-DEALERS','BCS-LICKTOWN'].sort());
  const m=maps.get('BCS-LICKTOWN'),pit=lick.find(p=>p.place==='BAY-PIT'),z=m.zones.find(z=>z.name==='The Fight Pit');
  assert.ok(pit.x>=z.rect[0]&&pit.x<=z.rect[0]+z.rect[2]&&pit.y>=z.rect[1]&&pit.y<=z.rect[1]+z.rect[3],'pin sits on the block');
  const clinic=pinsForMap('BAY-CLINIC',maps,story.places);assert.equal(clinic.length,1);
  const vault=maps.get('BAY-CLINIC').zones.find(z=>z.name==='Stack Vault');assert.equal(clinic[0].x,vault.rect[0]+vault.rect[2]/2);
  let total=0;for(const id of maps.keys())total+=pinsForMap(id,maps,story.places).length;
  assert.ok(total>=81+60,'a pin for every place on its own map, and on the street outside');
  for(const t of story.threads)assert.ok(existsSync(join(root,`assets/oneshot/butterfly-cut/pin-${t.id}.svg`)),t.id);
});

test('pages are found by the place stored on them; scenes by their Bay City map id', ()=>{
  const entries=[{id:'E1',flags:{[NS]:{compendiumSource:'butterfly-cut'}},pages:[{id:'P1',flags:{[NS]:{oneshotPlace:'BAY-PIT'}}},{id:'P2',flags:{}}]},
    {id:'E2',flags:{[NS]:{compendiumSource:'other'}},pages:[{id:'P9',flags:{[NS]:{oneshotPlace:'BAY-CLUB'}}}]}];
  const idx=pageIndex(entries);
  assert.deepEqual(idx.get('BAY-PIT'),{entryId:'E1',pageId:'P1'});
  assert.equal(idx.has('BAY-CLUB'),false,'only this one-shot\'s book');
  assert.equal(sceneMapId({flags:{[NS]:{streetAtlas:{id:'BCS-LICKTOWN'}}}}),'BCS-LICKTOWN');
  assert.equal(sceneMapId({flags:{[NS]:{bayCityMap:{id:'BCP-SCRAPYARD'}}}}),'BCP-SCRAPYARD');
  assert.equal(sceneMapId({flags:{}}),null);
});

test('shipped in the system: compendiums, folder, installer and API', ()=>{
  const sys=JSON.parse(readFileSync(join(root,'system.json'),'utf8'));
  for(const name of ['oneshot-butterfly-journal','oneshot-butterfly-actors']){
    const p=sys.packs.find(x=>x.name===name);assert.ok(p,name);
    const files=readdirSync(join(root,p.path));assert.ok(files.some(f=>f.endsWith('.ldb')),`${name} has data`);
    assert.ok(!files.includes('LOCK'),`${name} has no lock file`);
  }
  assert.ok(sys.packFolders.some(f=>f.packs.includes('oneshot-butterfly-journal')));
  assert.equal(ONESHOTS['butterfly-cut'].journal,`${NS}.oneshot-butterfly-journal`);
  const inst=readFileSync(join(root,'module/content-installer.mjs'),'utf8');
  assert.match(inst,/checked:!p\.collection\.includes\('oneshot-'\)/,'one-shots are not imported by the ordinary install');
  assert.match(readFileSync(join(root,'templates/content-installer.hbs'),'utf8'),/data-action="setUpOneShot"/);
  assert.match(readFileSync(join(root,'altered-carbon-rpg.mjs'),'utf8'),/OneShot:\{setUp:setUpOneShot/);
  assert.ok(existsSync(join(root,'assets/oneshot/butterfly-cut/web.webp')));
});

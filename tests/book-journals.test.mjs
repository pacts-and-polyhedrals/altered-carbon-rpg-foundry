import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const NS='altered-carbon-rpg';
const B=await import('../module/book-journals.mjs');
const story=JSON.parse(readFileSync(join(root,'data/oneshot-butterfly-cut.json'),'utf8'));

test('the system\'s own journals are themed; other journals are not', ()=>{
  const e=f=>({documentName:'JournalEntry',flags:{[NS]:f}});
  assert.ok(B.isBookJournal(e({compendiumSource:'butterfly-cut'})));
  assert.ok(B.isBookJournal(e({compendiumSource:'bay-city-directory'})));
  assert.ok(B.isBookJournal(e({gmGuide:true})));
  assert.ok(B.isBookJournal({documentName:'JournalEntryPage',parent:e({book:true})}),'pages follow their entry');
  assert.equal(B.isBookJournal(e({})),false);
  assert.equal(B.isBookJournal({documentName:'JournalEntry',flags:{'cold-storage':{sourceId:'G00'}}}),false,'Cold Storage themes its own');
});

test('check chips: GM gets a GM Control link per Skill, players a plain chip; unknown Skills are dropped', ()=>{
  const gm=B.checkChipHTML({skills:'Medicine;Data Analysis',difficulty:2,label:'Medicine or Data Analysis (Difficulty 2)'},{isGM:true});
  assert.match(gm,/data-ac-skill="Medicine"/);assert.match(gm,/data-ac-skill="Data Analysis"/);assert.match(gm,/ac-check-open/);
  const pl=B.checkChipHTML({skills:'Medicine',difficulty:2,label:'Medicine (Difficulty 2)'},{isGM:false});
  assert.doesNotMatch(pl,/data-ac-skill=/);assert.match(pl,/Medicine \(Difficulty 2\)/);
  assert.equal(B.checkChipHTML({skills:'Hacking',difficulty:9,label:'x'},{isGM:true}).includes('data-ac-skill='),false);
  assert.match(B.mapChipHTML({mapId:'BCS-LICKTOWN',label:'Open'},{isGM:true}),/data-ac-map="BCS-LICKTOWN"/);
  assert.doesNotMatch(B.mapChipHTML({mapId:'BCS-LICKTOWN',label:'Open'},{isGM:false}),/data-ac-map/);
  assert.equal(B.showChipHTML({uuid:'x',label:'Show'},{isGM:false}),'','players never see show buttons');
});

test('night console: advance, prevent, back, reset; the ending follows the pressure points', ()=>{
  const n=story.clock.length;let s=B.defaultState();
  s=B.clockReduce(s,'prevent',{index:1});assert.equal(s.prevented[1],true);
  s=B.clockReduce(s,'advance',{length:n});assert.equal(s.hour,1);assert.equal(s.fired[1],false,'a prevented event does not fire');
  s=B.clockReduce(s,'advance',{length:n});assert.equal(s.fired[2],true);
  for(let i=0;i<20;i++)s=B.clockReduce(s,'advance',{length:n});assert.equal(s.hour,n-1,'stops at dawn');
  s=B.clockReduce(s,'back',{});assert.equal(s.hour,n-2);
  s=B.clockReduce(s,'pressure',{id:'lives',checked:true});
  assert.equal(B.endingFor(story,s.pressure).ending.name,'The Official Story');
  assert.equal(B.endingFor(story,Object.fromEntries(story.pressure.map(p=>[p.id,true]))).ending.name,'The Butterfly Stops');
  assert.equal(B.endingFor(story,{}).ending.name,'Glass City');
  assert.equal(B.endingFor(story,{lives:1,cook:1,source:1}).ending.name,'Partial Light');
  assert.deepEqual(B.clockReduce(s,'reset',{}),B.defaultState());
  const html=B.clockHTML(story,{...B.defaultState(),hour:2},{isGM:true});
  assert.match(html,/23:00 · The Scrapyard hit/);assert.match(html,/data-ac-clock="advance"/);
  assert.doesNotMatch(B.clockHTML(story,B.defaultState(),{isGM:false}),/data-ac-clock/,'players get no console');
});

test('imported copies link to the world copies', ()=>{
  const map=new Map([['Compendium.altered-carbon-rpg.oneshot-butterfly-journal.JournalEntry.aaaaaaaaaaaaaaaa','JournalEntry.W1'],['Compendium.altered-carbon-rpg.oneshot-butterfly-actors.Actor.bbbbbbbbbbbbbbbb','Actor.A1']]);
  const t='@UUID[Compendium.altered-carbon-rpg.oneshot-butterfly-journal.JournalEntry.aaaaaaaaaaaaaaaa.JournalEntryPage.cccccccccccccccc]{Chop Shops} @UUID[Compendium.altered-carbon-rpg.oneshot-butterfly-actors.Actor.bbbbbbbbbbbbbbbb]{Gearbox} @UUID[Compendium.altered-carbon-rpg.oneshot-butterfly-actors.Actor.dddddddddddddddd]{Not imported}';
  const out=B.relinkText(t,map);
  assert.match(out,/@UUID\[JournalEntry\.W1\.JournalEntryPage\.cccccccccccccccc\]\{Chop Shops\}/);
  assert.match(out,/@UUID\[Actor\.A1\]\{Gearbox\}/);
  assert.match(out,/Actor\.dddddddddddddddd\]\{Not imported\}/,'unimported links still point at the compendium');
});

test('wired in: enrichers at init, teal theme CSS, relink after every install', ()=>{
  assert.match(readFileSync(join(root,'altered-carbon-rpg.mjs'),'utf8'),/installBookJournals\(\)/);
  const css=readFileSync(join(root,'styles/altered-carbon.css'),'utf8');
  for(const sel of ['.ac-book-sheet .window-content','.ac-book-journal blockquote:before','.ac-book-journal.ac-cat-handout','.ac-check-skill','.ac-book-journal .ac-clock'])assert.ok(css.includes(sel),sel);
  assert.match(readFileSync(join(root,'module/content-installer.mjs'),'utf8'),/relinkImported/);
  assert.match(readFileSync(join(root,'module/oneshot.mjs'),'utf8'),/relinkImported/);
  assert.match(readFileSync(join(root,'module/map-transit.mjs'),'utf8'),/export async function findOrImportScene/);
});

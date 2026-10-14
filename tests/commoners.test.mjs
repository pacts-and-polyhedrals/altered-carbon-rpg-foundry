import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const J=f=>JSON.parse(readFileSync(join(root,'data',f),'utf8'));
const {adversaryDocuments}=await import('../module/gm-content.mjs');
const recs=J('commoner-catalog.json').records,skills=J('core-skills.json'),items=J('item-catalog.json').items;

test('Bay City Commoners: 21 ordinary people built on the Chapter 7 format, ready to roll', ()=>{
  assert.equal(recs.length,21);
  assert.equal(new Set(recs.map(r=>r.name)).size,21,'unique names');
  for(const r of recs){
    const {actor,items:skillItems}=adversaryDocuments(r,skills,{});
    assert.equal(actor.type,'threat');assert.equal(skillItems.filter(i=>i.type==='skill').length,32,r.name);
    for(const v of Object.values(r.attributes))assert.ok(v>=25&&v<=50,`${r.name}: ordinary attributes`);
    assert.ok(r.health<=10&&r.speedDice<=3,`${r.name}: weaker than official adversaries`);
    for(const g of r.equipment)assert.ok(items.some(i=>i.name===g),`${r.name}: ${g} is Core gear`);
    for(const s of Object.keys(r.skillBonuses))assert.ok(skills.some(k=>k.name===s),`${r.name}: ${s}`);
  }
  assert.ok(recs.filter(r=>r.nonCombatant).length>=15,'most commoners avoid fights');
  assert.ok(recs.some(r=>r.minionBonus>0),'crowds can be run as minions');
});

test('every commoner has a top-down token, and the compendium is in the core GM library', async ()=>{
  const {PEOPLE_TOKENS}=await import('../module/emblems.mjs');
  for(const r of recs){const t=PEOPLE_TOKENS.named[r.name];assert.ok(t,r.name);assert.ok(existsSync(join(root,t.replace('systems/altered-carbon-rpg/',''))),t);}
  const sys=JSON.parse(readFileSync(join(root,'system.json'),'utf8'));
  const p=sys.packs.find(x=>x.name==='core-commoners');assert.ok(p);assert.equal(p.type,'Actor');
  assert.ok(readdirSync(join(root,p.path)).some(f=>f.endsWith('.ldb')));
  assert.ok(sys.packFolders.find(f=>f.packs.includes('official-adversaries')).packs.includes('core-commoners'));
});

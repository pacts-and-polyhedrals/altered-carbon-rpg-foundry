import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const V=await import('../module/pc-vision.mjs');

test('new player characters get vision on, linked and friendly unless the creator chose otherwise', ()=>{
  assert.deepEqual(V.pcTokenDefaults({}),{'prototypeToken.sight.enabled':true,'prototypeToken.actorLink':true,'prototypeToken.disposition':1});
  assert.deepEqual(V.pcTokenDefaults({prototypeToken:{actorLink:false,disposition:0,sight:{enabled:false}}}),{'prototypeToken.sight.enabled':true},'vision is always switched on');
  assert.deepEqual(V.PC_TYPES,['character','ai']);
});

test('existing PC actors and their placed tokens are switched on by the GM on load', async ()=>{
  const updated=[],tokenUps=[];
  const pc={id:'a1',type:'character',prototypeToken:{sight:{enabled:false}}},ai={id:'a2',type:'ai',prototypeToken:{sight:{}}},ok={id:'a3',type:'character',prototypeToken:{sight:{enabled:true}}},npc={id:'a4',type:'npc',prototypeToken:{sight:{enabled:false}}};
  const scene={tokens:[{id:'t1',actor:pc,sight:{enabled:false}},{id:'t2',actor:npc,sight:{enabled:false}},{id:'t3',actor:ok,sight:{enabled:true}}],async updateEmbeddedDocuments(_t,u){tokenUps.push(...u);}};
  globalThis.game={user:{isGM:true},actors:[pc,ai,ok,npc],scenes:[scene]};
  globalThis.Actor={async updateDocuments(u){updated.push(...u);}};
  const r=await V.enablePCVision();
  assert.deepEqual(updated.map(u=>u._id),['a1','a2']);
  assert.deepEqual(tokenUps,[{_id:'t1','sight.enabled':true}],'NPC tokens are left alone');
  assert.deepEqual(r,{actors:2,tokens:1});
  globalThis.game.user.isGM=false;assert.deepEqual(await V.enablePCVision(),{actors:0,tokens:0},'players never write');
});

test('wired in at init, and the one-shot pregens ship with vision on', ()=>{
  assert.match(readFileSync(join(root,'altered-carbon-rpg.mjs'),'utf8'),/installPCVision\(\)/);
  assert.match(readFileSync(join(root,'tools/maps/oneshot/bfactors.mjs'),'utf8'),/actorLink:true,disposition:1[^\n]*sight:\{enabled:true\}/);
});

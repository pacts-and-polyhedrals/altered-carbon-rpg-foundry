import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=rel=>fs.readFileSync(new URL(`../../${rel}`,import.meta.url),'utf8');
const json=rel=>JSON.parse(read(rel));

test('GM Control is registered and exposed through the system API',()=>{
  const main=read('altered-carbon-rpg.mjs');
  assert.match(main,/registerMenu\(game\.system\.id,'gmControl'/);
  assert.match(main,/openGMControl/);
  assert.match(main,/installGMToolsHooks\(\)/);
  assert.match(main,/installGMSceneControlsHook\(\)/);
  assert.match(main,/ensureGMGuide\(\)/);
});

test('Cold Storage GM presets all point at real core Skills',()=>{
  const skills=new Set(json('data/core-skills.json').map(s=>s.name));
  const presets=json('data/gm-presets.json').presets;
  assert.ok(presets.length>=20,'expected a useful preset library');
  for(const p of presets){
    assert.ok(p.id&&p.label&&p.category&&p.prompt,`incomplete preset ${p.id}`);
    assert.ok(skills.has(p.skill),`${p.id} references missing Skill ${p.skill}`);
    assert.ok(Number.isFinite(p.difficulty)&&p.difficulty>=0,`${p.id} has invalid difficulty`);
  }
});

test('GM requests support multiple recipients and in-chat player responses',()=>{
  const js=read('module/gm-tools.mjs');
  const hbs=read('templates/gm-panel.hbs');
  assert.match(hbs,/name="gmRecipients"/);
  assert.match(hbs,/data-action="sendPreset"/);
  assert.match(hbs,/data-action="sendCustom"/);
  assert.match(js,/actorIds:\s*actors\.map/);
  assert.match(js,/data-ac-gm-action="respond-roll"/);
  assert.match(js,/rollSkill\(actor,skill/);
  assert.match(js,/type:'gmRollResponse'/);
  assert.match(js,/recordRollResponse/);
});

test('GM Guide is a generated Journal with comprehensive rules pages',()=>{
  const js=read('module/gm-guide.mjs');
  const pageNames=[...js.matchAll(/add\('([^']+)'/g)].map(m=>m[1]);
  assert.ok(pageNames.length>=21,`expected at least 21 guide pages, found ${pageNames.length}`);
  for(const topic of ['Skill Checks','Situational Rolls','Combat Round','Damage & Survival','Conditions & Injuries','Gear & Depletion','Economy','Requests','Resleeving','Ego & Backups','Virtual & Digital Threats','Variants','Adversaries & Vehicles','Advancement','Cold Storage Presets','GM Control & Chat Requests']) assert.ok(js.includes(topic),`missing guide topic ${topic}`);
  for(const key of ['m.conditions','m.injuries','m.scandals','m.gearRules','m.techPoints','m.requests','m.resleeving','m.ego','m.virtual','m.viralClasses','m.variants','m.vehicle','m.adversaries','m.skillAdvancement','m.traitCosts']) assert.ok(js.includes(key),`guide does not consume ${key}`);
  assert.match(js,/foundry\.documents\.JournalEntry\.implementation\.create/);
  assert.match(js,/installedVersion!==GUIDE_VERSION/);
  assert.match(js,/generatedPageCount!==pages\.length/);
  assert.match(js,/gmGuidePage/);
  assert.match(js,/legacyGeneratedGuide/);
});

test('system chat cards use degree-coded futuristic grades',()=>{
  const ui=read('module/chat-ui.mjs');
  const rolls=read('module/rolls.mjs');
  const css=read('styles/altered-carbon.css');
  assert.match(ui,/ac-grade-success-\$\{d\}/);
  assert.match(ui,/ac-grade-failure-\$\{d\}/);
  assert.match(ui,/ac-grade-catastrophe/);
  assert.match(ui,/ac-grade-ace/);
  assert.match(ui,/ac-grade-stroke/);
  assert.match(rolls,/renderCheckCard/);
  assert.match(css,/\.chat-message\.ac-chat-message/);
  assert.match(css,/\.ac-grade-success-5/);
  assert.match(css,/\.ac-grade-failure-5/);
});

test('Foundry v14 chat integrations use the HTML render hook exactly once per subsystem',()=>{
  for(const rel of ['module/chat-ui.mjs','module/gm-tools.mjs','module/chat-actions.mjs','module/opposed.mjs']){
    const js=read(rel);
    assert.match(js,/renderChatMessageHTML/,`${rel} is missing the v14 HTML chat hook`);
    assert.doesNotMatch(js,/Hooks\.on\(['\"]renderChatMessage['\"]/,`${rel} still registers the legacy chat render hook`);
  }
});

test('all chat messages inherit the Altered Carbon shell while graded system cards keep semantic classes',()=>{
  const ui=read('module/chat-ui.mjs');
  const css=read('styles/altered-carbon.css');
  assert.match(ui,/game\?\.system\?\.id!==NS/);
  assert.match(ui,/classList\?\.add\('ac-chat-message'\)/);
  assert.match(ui,/classList\?\.add\('ac-system-chat-card'\)/);
  assert.match(css,/not\(\.ac-system-chat-card\)/);
  assert.match(css,/\.ac-chat-card \.ac-chat-actions button/);
});


test('GM Control is exposed as a GM-only Foundry v14 Token Controls tool',()=>{
  const js=read('module/gm-tools.mjs');
  assert.match(js,/Hooks\.on\('getSceneControlButtons'/);
  assert.match(js,/controls\?\.tokens\?\.tools/);
  assert.match(js,/alteredCarbonGMControl/);
  assert.match(js,/fa-solid fa-satellite-dish/);
  assert.match(js,/button:true/);
  assert.match(js,/visible:true/);
  assert.match(js,/onChange:\(\)=>openOrFocusGMPanel\(\)/);
});

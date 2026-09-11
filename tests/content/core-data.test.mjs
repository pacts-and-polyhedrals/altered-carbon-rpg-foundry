import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const base=new URL('../../data/',import.meta.url);const read=n=>JSON.parse(fs.readFileSync(new URL(n,base),'utf8'));
test('core data catalogs cover all source-backed mechanical records',()=>{const skills=read('core-skills.json'),traits=read('trait-catalog.json'),bag=read('baggage-catalog.json'),arch=read('archetype-reference.json'),eq=read('equipment-reference-pages.json'),sl=read('sleeve-reference-pages.json'),gm=read('gm-reference-pages.json'),mech=read('mechanics-reference.json');assert.equal(skills.length,32);assert.equal(traits.count,240);assert.equal(traits.traits.length,240);assert.equal(bag.entries.length,30);assert.equal(Object.keys(arch.archetypes).length,6);for(const a of Object.values(arch.archetypes))assert.equal(Object.keys(a.packages).length,5);assert.equal(eq.pages.length,63);assert.equal(sl.pages.length,9);assert.equal(gm.pages.length,48);for(const k of ['characterResources','damageAndDying','ego','economy','techPoints','campaign','variants','requests','virtual','combat','depletion'])assert.ok(mech[k],k);});
test('all published Starting Package trait references resolve to the 240-trait catalog',()=>{const t=read('trait-catalog.json').traits,a=read('archetype-reference.json');const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');for(const [an,av] of Object.entries(a.archetypes))for(const [pn,pv] of Object.entries(av.packages))for(const [branch,name] of pv.traits||[]){const found=t.some(x=>norm(x.name)===norm(name)&&(norm(x.branch)===norm(branch)||norm(x.branch).includes(norm(branch))||norm(branch).includes(norm(x.branch))));assert.ok(found,`${an}/${pn}: ${branch} — ${name}`);}});

test('v1.3.0 Core Equipment Library contains the complete approved 2020 equipment set',()=>{
  const files=[
    ['core-weapons.json',30,'weapon'],
    ['core-ammunition.json',13,'ammunition'],
    ['core-armour.json',8,'armour'],
    ['core-equipment.json',12,'equipment'],
    ['core-software.json',3,'software'],
    ['core-drugs.json',7,'drug'],
    ['core-augmentations.json',22,'augmentation']
  ];
  const all=[];
  for(const [file,count,type] of files){
    const data=read(file);
    assert.equal(data.count,count,`${file} declared count`);
    assert.equal(data.items.length,count,`${file} record count`);
    for(const item of data.items){
      assert.equal(item.type,type,`${item.name} type`);
      assert.equal(item.id,item.system.catalogId,`${item.name} catalog id`);
      assert.ok(item.system.description,`${item.name} description`);
      assert.ok(item.system.rulesRef?.includes('2020 Core Rulebook'),`${item.name} rules reference`);
      assert.equal(item.system.sourceBook,'Altered Carbon RPG Core Rulebook (2020)',`${item.name} source book`);
      assert.ok(Number(item.system.sourcePage)>0,`${item.name} source page`);
      all.push(item);
    }
  }
  assert.equal(all.length,95);
  assert.equal(new Set(all.map(x=>x.id)).size,95,'all Core catalog ids are unique');
  assert.equal(new Set(all.map(x=>`${x.type}:${x.name}`)).size,95,'all Core Item names are unique within type');
  assert.equal(all.some(x=>x.name==='Reinforced Dermis'),false,'Quick Start-only Reinforced Dermis is not canonical Core content');
});

test('Core vehicles and generic weapon upgrades are complete',()=>{
  const vehicles=read('core-vehicles.json');
  assert.equal(vehicles.count,3);
  assert.deepEqual(vehicles.actors.map(x=>x.name),['Airbike','Aircar','Ground Car']);
  assert.equal(new Set(vehicles.actors.map(x=>x.id)).size,3);
  for(const actor of vehicles.actors){
    assert.equal(actor.type,'vehicle');
    assert.ok(actor.system.vehicle);
    assert.ok(Number(actor.sourcePage)>0);
  }
  const upgrades=read('core-upgrades.json');
  assert.equal(upgrades.entries.length,12);
  assert.equal(new Set(upgrades.entries.map(x=>x.id)).size,12);
  for(const entry of upgrades.entries){assert.ok(entry.name);assert.ok(Number(entry.q)>=1);assert.ok(entry.effect);}
});

test('ammunition and drug records carry their operational fields',()=>{
  const ammo=read('core-ammunition.json').items;
  for(const item of ammo){
    assert.ok(item.system.compatibleWith,`${item.name} compatibility`);
    assert.ok('armorPiercing' in item.system,`${item.name} AP field`);
    assert.ok('deadly' in item.system,`${item.name} Deadly field`);
  }
  const emp=ammo.find(x=>x.id==='core.ammo.emp-rounds');
  assert.equal(emp.system.syntheticDamageBonus,2);
  const buckshot=ammo.find(x=>x.id==='core.ammo.shotgun-buckshot');
  assert.ok(buckshot.system.zoneDamageShared&&buckshot.system.zoneDamageAdjacent);

  const drugs=read('core-drugs.json').items;
  assert.equal(drugs.length,7);
  for(const item of drugs){
    assert.ok(item.system.administration,`${item.name} administration`);
    assert.ok(['none','medicine','science'].includes(item.system.controlledBy),`${item.name} controlled branch`);
    assert.ok('addiction' in item.system,`${item.name} addiction flag`);
  }
  assert.equal(drugs.find(x=>x.id==='core.drug.reaper').system.controlledBy,'science');
  assert.equal(drugs.find(x=>x.id==='core.drug.lethinol').system.controlledBy,'medicine');
});

test('source-backed augmentation attribute changes are encoded for derived-data automation',()=>{
  const a=read('core-augmentations.json').items;
  const by=id=>a.find(x=>x.id===id)?.system.attributeEffects||'';
  assert.match(by('core.augment.bestial-appendage'),/Strength \+15/);
  assert.match(by('core.augment.bestial-upgrade'),/Perception \+15/);
  assert.match(by('core.augment.cognition-neurachem'),/Acuity \+5/);
  assert.match(by('core.augment.combat-neurachem'),/Strength \+5/);
  assert.match(by('core.augment.congenial-neurachem'),/Empathy \+5/);
  assert.match(by('core.augment.military-neurachem'),/Strength \+10/);
});

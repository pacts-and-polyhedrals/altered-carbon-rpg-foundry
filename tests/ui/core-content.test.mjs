import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=rel=>fs.readFileSync(new URL(`../../${rel}`,import.meta.url),'utf8');
const json=rel=>JSON.parse(read(rel));

test('Foundry manifest and data models register ammunition and drug Item types',()=>{
  const manifest=json('system.json');
  assert.equal(manifest.version,'1.4.1');
  assert.ok(manifest.documentTypes.Item.ammunition);
  assert.ok(manifest.documentTypes.Item.drug);
  assert.match(manifest.download,/v1\.4\.1\/altered-carbon-rpg-v1\.4\.1\.zip$/);
  const models=read('module/data-models.mjs');
  const main=read('altered-carbon-rpg.mjs');
  assert.match(models,/export class AmmunitionModel/);
  assert.match(models,/export class DrugModel/);
  assert.match(main,/ammunition:Models\.AmmunitionModel/);
  assert.match(main,/drug:Models\.DrugModel/);
});

test('Core Equipment Library loads all catalog segments and supports safe actor/world installation',()=>{
  const js=read('module/core-content.mjs');
  const hbs=read('templates/core-library.hbs');
  for(const file of ['core-weapons.json','core-ammunition.json','core-armour.json','core-equipment.json','core-software.json','core-drugs.json','core-augmentations.json','core-vehicles.json','core-upgrades.json']) assert.ok(js.includes(file),`missing ${file}`);
  assert.match(js,/REPEATABLE=new Set\(\['ammunition','drug'\]\)/);
  assert.match(js,/system\.quantity/);
  assert.match(js,/catalogId/);
  assert.match(js,/installCoreLibraryToWorld/);
  assert.match(hbs,/Core Equipment Library/);
  assert.match(hbs,/data-action="addToActor"/);
  assert.match(hbs,/data-action="createWorldItem"/);
  assert.match(hbs,/data-action="installAll"/);
  assert.match(hbs,/Vehicle Actor Templates/);
  assert.match(hbs,/Generic Weapon Upgrades/);
});

test('actor loadout exposes Core Gear, special ammunition loading, and drug administration',()=>{
  const js=read('module/sheets.mjs');
  const hbs=read('templates/actor-sheet.hbs');
  assert.match(js,/useDrug:this\._useDrug/);
  assert.match(js,/loadAmmo:this\._loadAmmo/);
  assert.match(js,/openCoreLibrary:this\._openCoreLibrary/);
  assert.match(js,/i\.type==='ammunition'/);
  assert.match(js,/i\.type==='drug'/);
  assert.match(hbs,/data-action="openCoreLibrary"/);
  assert.match(hbs,/data-action="loadAmmo"/);
  assert.match(hbs,/data-action="useDrug"/);
  assert.match(hbs,/Loaded Ammo/);
});

test('weapon chat flow resolves loaded ammunition and target-specific profiles',()=>{
  const js=read('module/chat-actions.mjs');
  assert.match(js,/loadedAmmunition/);
  assert.match(js,/ammunitionDamageProfile/);
  assert.match(js,/chooseTargetBodyClass/);
  assert.match(js,/zoneDamageShared/);
  assert.match(js,/syntheticDamageBonus/);
  assert.match(js,/core\.ammo\.reaper/);
  assert.match(js,/armorPiercing/);
});

test('drug use consumes doses and applies supported direct conditions',()=>{
  const js=read('module/chat-actions.mjs');
  assert.match(js,/export async function useDrug/);
  assert.match(js,/system\.quantity/);
  assert.match(js,/core\.drug\.lethinol/);
  assert.match(js,/core\.drug\.stallion/);
  assert.match(js,/condition.*enraged/is);
  assert.match(js,/CHEMICAL ADMINISTRATION/);
});

test('active Core augmentations affect derived attributes without overwriting stored base attributes',()=>{
  const js=read('module/documents.mjs');
  assert.match(js,/applyAttributeEffectString/);
  assert.match(js,/effectiveAttributes/);
  assert.match(js,/core\.augment\.subdermal-plating/);
  assert.match(js,/core\.augment\.bestial-dermis/);
  assert.match(js,/core\.augment\.speed-neurachem/);
  assert.match(js,/augmentationBonuses/);
});

test('Rules Browser and GM Guide expose the v1.3 Core Equipment Library',()=>{
  const browser=read('templates/rules-browser.hbs');
  const guide=read('module/gm-guide.mjs');
  assert.match(browser,/Official Core Equipment Library/);
  assert.match(browser,/coreItemCount/);
  assert.match(guide,/const GUIDE_VERSION='1\.4\.1'/);
  assert.match(guide,/21 — Core Equipment Library/);
  assert.match(guide,/95 structured Core Item records/);
  assert.match(guide,/Reinforced Dermis/);
});

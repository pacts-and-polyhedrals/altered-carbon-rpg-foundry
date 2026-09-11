import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

test('actor sheet has a dedicated scroll viewport and exposes all six Attributes',()=>{
  const hbs=read('templates/actor-sheet.hbs');
  const css=read('styles/altered-carbon.css');
  assert.match(hbs,/class="ac-sheet-viewport"/);
  assert.match(css,/\.ac-sheet-viewport\s*\{[\s\S]*?overflow-y:auto/);
  for(const key of ['strength','perception','empathy','willpower','acuity','intelligence']) assert.match(hbs,new RegExp(`name="system\\.attributes\\.${key}"`));
});

test('guided creator presents eight sequential stages and all six Attribute fields',()=>{
  const hbs=read('templates/character-creator.hbs');
  const js=read('module/character-creator.mjs');
  assert.equal((hbs.match(/data-wizard-step="\d"/g)||[]).length,8);
  assert.match(js,/STEP_LABELS=\['Identity','Archetype','Variant','Sleeve','Attributes','Resources','Level Up','Review'\]/);
  for(const key of ['strength','perception','empathy','willpower','acuity','intelligence']) assert.match(js,new RegExp(`id:'${key}'`));
});

test('major interfaces share the futuristic Altered Carbon shell',()=>{
  for(const file of ['templates/actor-sheet.hbs','templates/character-creator.hbs','templates/rules-browser.hbs','templates/combat-console.hbs','templates/core-library.hbs']) assert.match(read(file),/ac-shell/);
  const css=read('styles/altered-carbon.css');
  for(const token of ['--ac-cyan','--ac-violet','--ac-panel','--ac-line']) assert.ok(css.includes(token));
});

test('actor sheet is view-first with an explicit whole-sheet edit mode',()=>{
  const hbs=read('templates/actor-sheet.hbs');
  const js=read('module/sheets.mjs');
  const css=read('styles/altered-carbon.css');
  assert.match(hbs,/data-action="toggleEditMode"/);
  assert.match(hbs,/is-editing/);
  assert.match(hbs,/is-viewing/);
  assert.match(js,/_editMode=false/);
  assert.match(js,/submitOnChange:true/);
  assert.match(js,/if\(this\._editMode\)await this\.submit\(\)/);
  assert.match(js,/querySelectorAll\('input\[name\],select\[name\],textarea\[name\]'\)/);
  assert.match(js,/if\(!this\._editMode\)return ui\.notifications\.warn\('Switch the character sheet to Edit Mode/);
  assert.match(css,/\.ac-sheet\.is-viewing \[data-action="editItem"\]/);
});

test('sleeve archive relationships and networks disclose read-only information inline',()=>{
  const hbs=read('templates/actor-sheet.hbs');
  assert.match(hbs,/ac-timeline-entry ac-disclosure-record/);
  assert.match(hbs,/ac-relationship-record/);
  assert.match(hbs,/ac-network-record/);
  assert.match(hbs,/class="ac-open-label">Open<\/span>/);
  assert.match(hbs,/Historical Incident/);
  assert.match(hbs,/Recognition Clues/);
  assert.match(hbs,/Request Bonus/);
  assert.match(hbs,/Loss \/ Transfer/);
  const relationshipSection=hbs.slice(hbs.indexOf('{{#if isRelationships}}'),hbs.indexOf('{{#if isEvidence}}'));
  assert.doesNotMatch(relationshipSection,/data-action="editItem"[^>]*>Open<\/button>/);
});

test('every embedded Actor-sheet collection uses the same read-first disclosure contract',()=>{
  const hbs=read('templates/actor-sheet.hbs');
  for(const marker of [
    'ac-sleeve-record','ac-skill-record','ac-trait-record','ac-timeline-entry ac-disclosure-record',
    'ac-relationship-record','ac-network-record','ac-evidence-record','ac-gear-record','ac-resource-record'
  ]) assert.ok(hbs.includes(marker),`missing disclosure family ${marker}`);
  assert.doesNotMatch(hbs,/data-action="editItem"[^>]*>\s*(?:<[^>]+>[^<]*<\/[^>]+>\s*)?Open\s*<\/button>/i);
  const editButtons=(hbs.match(/data-action="editItem"/g)||[]).length;
  const editContainers=(hbs.match(/class="ac-edit-only-actions"/g)||[]).length;
  assert.equal(editButtons,editContainers,'every Item editor trigger must live in an Edit-Mode-only action container');
});

test('sheet preparation deduplicates singular records before rendering',()=>{
  const js=read('module/sheets.mjs');
  assert.match(js,/dedupeSheetRecords\(actor\.items\.contents\)/);
  assert.match(js,/traits:all\.filter\(i=>i\.type==='trait'\)/);
});

test('system-owned add paths reject or collapse duplicate singular records',()=>{
  const browser=read('module/rules-browser.mjs');
  const creator=read('module/character-creator.mjs');
  const docs=read('module/documents.mjs');
  assert.match(browser,/hasEquivalentUniqueRecord\(actor\.items\.contents,data\)/);
  assert.match(creator,/dedupeUniqueSheetRecords\(items\)/);
  assert.match(docs,/hasEquivalentUniqueRecord\(this\.items\.contents,candidate\)/);
});

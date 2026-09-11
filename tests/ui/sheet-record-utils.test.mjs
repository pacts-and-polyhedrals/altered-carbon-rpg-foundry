import test from 'node:test';
import assert from 'node:assert/strict';
import {dedupeUniqueSheetRecords,hasEquivalentUniqueRecord,stableRecordKey} from '../../module/sheet-record-utils.mjs';

const rec=(type,name,system={})=>({type,name,system});

test('duplicate Traits are collapsed by catalog id before sheet presentation',()=>{
  const records=[
    rec('trait','Situational Awareness',{catalogId:'trait-001',tree:'Mental',branch:'Awareness',tier:1}),
    rec('trait','Situational Awareness',{catalogId:'trait-001',tree:'Mental',branch:'Awareness',tier:1})
  ];
  assert.equal(dedupeUniqueSheetRecords(records).length,1);
});

test('duplicate Traits without catalog ids are collapsed by semantic identity',()=>{
  const a=rec('trait','Cold Reader',{tree:'Social',branch:'Empathy',tier:2});
  const b=rec('trait','Cold Reader',{tree:'Social',branch:'Empathy',tier:2});
  assert.equal(stableRecordKey(a),stableRecordKey(b));
  assert.equal(dedupeUniqueSheetRecords([a,b]).length,1);
});

test('singular Skill, Specialisation, Condition, Scandal and Network records are deduplicated',()=>{
  const records=[
    rec('skill','Firearms',{catalogId:'firearms'}),rec('skill','Firearms',{catalogId:'firearms'}),
    rec('specialisation','Pistols',{skill:'Firearms'}),rec('specialisation','Pistols',{skill:'Firearms'}),
    rec('condition','Dazzled',{key:'dazzled'}),rec('condition','Dazzled',{key:'dazzled'}),
    rec('scandal','Public disgrace',{key:'public-disgrace'}),rec('scandal','Public disgrace',{key:'public-disgrace'}),
    rec('network','Bay City PD',{organization:'BCPD'}),rec('network','Bay City PD',{organization:'BCPD'})
  ];
  assert.equal(dedupeUniqueSheetRecords(records).length,5);
});

test('repeatable collections are preserved even when their names match',()=>{
  const records=[
    rec('weapon','Pistol',{}),rec('weapon','Pistol',{}),
    rec('baggage','Old Enemy',{}),rec('baggage','Old Enemy',{}),
    rec('memory','The Fall',{}),rec('memory','The Fall',{}),
    rec('relationship','Mara',{}),rec('relationship','Mara',{}),
    rec('archivedSleeve','Clone Body',{}),rec('archivedSleeve','Clone Body',{})
  ];
  assert.equal(dedupeUniqueSheetRecords(records).length,10);
});

test('duplicate prevention helper catches equivalent unique records only',()=>{
  const existing=[rec('trait','Situational Awareness',{catalogId:'trait-001'})];
  assert.equal(hasEquivalentUniqueRecord(existing,rec('trait','Situational Awareness',{catalogId:'trait-001'})),true);
  assert.equal(hasEquivalentUniqueRecord(existing,rec('weapon','Pistol',{})),false);
});

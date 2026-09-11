import test from 'node:test';
import assert from 'node:assert/strict';
import {dedupeSheetRecords,dedupeUniqueSheetRecords,displayRecordKey,exactRecordKey,hasEquivalentUniqueRecord,stableRecordKey} from '../../module/sheet-record-utils.mjs';

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


test('full sheet presentation collapses literal duplicate Baggage and equipment records',()=>{
  const records=[
    rec('baggage','Old Enemy',{catalogId:'bag-01',severity:2,description:'A former enemy returns.'}),
    rec('baggage','Old Enemy',{catalogId:'bag-01',severity:2,description:'A former enemy returns.'}),
    rec('weapon','ONI Pistol',{damage:'1d6',capacity:6,depletion:0}),
    rec('weapon','ONI Pistol',{damage:'1d6',capacity:6,depletion:0}),
    rec('equipment','Forensic Scanner',{priceLevel:2,gearBonus:1}),
    rec('equipment','Forensic Scanner',{priceLevel:2,gearBonus:1})
  ];
  assert.equal(dedupeSheetRecords(records).length,3);
});

test('sheet presentation keeps doubled gear collapsed when only mutable state differs',()=>{
  const fresh=rec('weapon','ONI Pistol',{skill:'Firearms',damage:'1d6',damageType:'ballistic',range:'near',capacity:6,depletion:0});
  const depleted=rec('weapon','ONI Pistol',{skill:'Firearms',damage:'1d6',damageType:'ballistic',range:'near',capacity:6,depletion:2});
  assert.notEqual(exactRecordKey(fresh),exactRecordKey(depleted));
  assert.equal(displayRecordKey(fresh),displayRecordKey(depleted));
  assert.equal(dedupeSheetRecords([fresh,depleted]).length,1);
});

test('same-name gear remains distinct when its actual equipment identity differs',()=>{
  const pistol=rec('weapon','ONI Pistol',{skill:'Firearms',damage:'1d6',damageType:'ballistic',range:'near'});
  const heavy=rec('weapon','ONI Pistol',{skill:'Firearms',damage:'2d6',damageType:'ballistic',range:'near'});
  assert.notEqual(displayRecordKey(pistol),displayRecordKey(heavy));
  assert.equal(dedupeSheetRecords([pistol,heavy]).length,2);
});

test('full sheet presentation removes exact cloned records on every page without deleting legitimate variants',()=>{
  const originals=[
    rec('archivedSleeve','Bay City Clone',{acquired:'2274',lost:'2280'}),
    rec('relationship','Mara',{category:'Loved One',revealState:'verified'}),
    rec('memory','Rainline',{year:2274,recovered:true}),
    rec('injury','Broken Arm',{count:1,active:true}),
    rec('resourceEntry','Emergency Medbay',{priceLevel:2,capacity:3,depletion:0})
  ];
  const duplicated=originals.flatMap(x=>[x,{...x,system:{...x.system}}]);
  assert.equal(dedupeSheetRecords(duplicated).length,originals.length);
});

test('duplicate ammunition and drugs collapse on sheets even when mutable quantity differs',()=>{
  const ammoA=rec('ammunition','EMP Rounds',{catalogId:'core.ammo.emp-rounds',quantity:1,damageBonus:0,syntheticDamageBonus:2});
  const ammoB=rec('ammunition','EMP Rounds',{catalogId:'core.ammo.emp-rounds',quantity:4,damageBonus:0,syntheticDamageBonus:2});
  const drugA=rec('drug','Lethinol',{catalogId:'core.drug.lethinol',quantity:1,administration:'Pill',controlledBy:'medicine',controlledTier:2});
  const drugB=rec('drug','Lethinol',{catalogId:'core.drug.lethinol',quantity:3,administration:'Pill',controlledBy:'medicine',controlledTier:2});
  assert.equal(displayRecordKey(ammoA),displayRecordKey(ammoB));
  assert.equal(displayRecordKey(drugA),displayRecordKey(drugB));
  assert.equal(dedupeSheetRecords([ammoA,ammoB,drugA,drugB]).length,2);
});

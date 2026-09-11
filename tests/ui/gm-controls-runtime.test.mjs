import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {resetFoundry,state,manifest} from '../helpers/foundry-mocks.mjs';
import {makeBonusDice,normalizeRollOptions,mergePreset,resolveBonusDice,describeBonusDice} from '../../module/gm-roll-options.mjs';
import {grantBonusDice,getBonusDiceAwards,matchingBonusDiceAwards,clearBonusDiceAwards,removeBonusDiceAward} from '../../module/gm-bonus-dice.mjs';
import {rollSkill} from '../../module/rolls.mjs';
import {createRollRequest,respondToRequest,savePresetOverride,registerGMToolsSettings,getPresetOverrides,ACGMPanel,installGMToolsHooks} from '../../module/gm-tools.mjs';
import {getSystemHealth,assertRegisteredDocumentTypes,diagnoseSystem} from '../../module/system-health.mjs';
import {installCoreLibraryToWorld,createWorldCoreItem,addCatalogItemToActor,loadCoreCatalog} from '../../module/core-content.mjs';
let a,b;
beforeEach(()=>{({a,b}=resetFoundry());registerGMToolsSettings();});
const awards=actor=>getBonusDiceAwards(actor);
const grant=options=>grantBonusDice({actorIds:['a'],...options});

test('options: blank and zero base TR remain distinct, and negative modifiers are preserved',()=>{
  assert.equal(normalizeRollOptions({baseTR:''}).baseTR,null);
  assert.equal(normalizeRollOptions({baseTR:'0'}).baseTR,0);
  assert.equal(normalizeRollOptions({bonus:'-3'}).bonus,-3);
  assert.deepEqual(makeBonusDice('2','8'),[8,8]);
});
test('options: invalid dice sizes, fractions, excessive counts and non-numeric TR are rejected',()=>{
  for(const fn of [()=>makeBonusDice(2,7),()=>makeBonusDice(1.5,8),()=>makeBonusDice(11,8),()=>normalizeRollOptions({baseTR:'NaN'}),()=>normalizeRollOptions({difficulty:-1}),()=>normalizeRollOptions({bonusDice:'8,8'})])assert.throws(fn);
});
test('options: Skill-size bonus dice resolve independently for differently trained characters',()=>{
  assert.deepEqual(resolveBonusDice(['skill','skill'],8),[8,8]);assert.deepEqual(resolveBonusDice(['skill',4],6),[6,4]);
  assert.match(describeBonusDice(['skill',8]),/Skill-size.*1d8/);
});
test('awards: one assignment creates independent grants for several unique characters',async()=>{
  const result=await grant({actorIds:['a','b','a'],dice:[6,6]});assert.equal(result.granted.length,2);assert.equal(result.failed.length,0);
  assert.equal(awards(a).length,1);assert.equal(awards(b).length,1);assert.notEqual(a.flags,b.flags);
});
test('awards: player A rolling does not consume player B bonus',async()=>{
  await grant({actorIds:['a','b'],dice:['skill']});state.rollValues=[7,2];
  const result=await rollSkill(a,a.items[0],{chat:false});assert.deepEqual(result.bonusDice,[{sides:8,result:2}]);
  assert.equal(awards(a).length,0);assert.equal(awards(b).length,1);
  const other=await rollSkill(b,b.items[0],{chat:false});assert.equal(other.bonusDice[0].sides,6);
});
test('awards: persistent grants survive checks until the GM removes them',async()=>{
  await grant({duration:'persistent',dice:[4]});await rollSkill(a,a.items[0],{chat:false});await rollSkill(a,a.items[0],{chat:false});
  assert.equal(awards(a).length,1);await removeBonusDiceAward('a',awards(a)[0].id);assert.equal(awards(a).length,0);
});
test('awards: a Skill-specific award waits for a matching check',async()=>{
  await grant({skill:'Search'});assert.equal(matchingBonusDiceAwards(a,a.items[0]).length,0);
  await rollSkill(a,a.items[0],{chat:false});assert.equal(awards(a).length,1);
  await rollSkill(a,a.items[1],{chat:false});assert.equal(awards(a).length,0);
});
test('rolls: requested dice combine with assigned dice without turning into a TR bonus',async()=>{
  await grant({dice:[4]});state.rollValues=[7,5,2];
  const result=await rollSkill(a,a.items[0],{bonusDice:[6],chat:false});
  assert.equal(result.tr,3);assert.equal(result.best,2);assert.equal(result.bonusDice.length,2);assert.equal(result.ace,false);
  assert.deepEqual(state.rollFormulas,['1d8','1d6','1d4']);
});
test('rolls: base TR, difficulty, negative modifier and training retain their rules',async()=>{
  a.items[0].system.trainingBonus=2;
  const result=await rollSkill(a,a.items[0],{baseTR:8,difficulty:2,bonus:-1,chat:false});assert.equal(result.tr,7);
});
test('rolls: one-use bonuses are spent even when the executed check fails',async()=>{
  await grant();state.rollValues=[8,7];const result=await rollSkill(a,a.items[0],{chat:false});assert.equal(result.success,false);assert.equal(awards(a).length,0);
});
test('rolls: incapacitation does not consume an award or roll any dice',async()=>{
  await grant();a.items.push({type:'condition',name:'Incapacitated',system:{key:'incapacitated'}});
  assert.equal((await rollSkill(a,a.items[0],{chat:false})).blocked,true);assert.equal(awards(a).length,1);assert.equal(state.rollFormulas.length,0);
});
test('rolls: sight-only Dazzled failure does not consume an award',async()=>{
  await grant();a.items.push({type:'condition',name:'Dazzled',system:{key:'dazzled'}});
  assert.equal((await rollSkill(a,a.items[0],{sightOnly:true,chat:false})).blocked,true);assert.equal(awards(a).length,1);
});
test('rolls: a dice evaluation error preserves the unspent award',async()=>{
  await grant();state.rollError=true;await assert.rejects(rollSkill(a,a.items[0],{chat:false}),/simulated dice failure/);assert.equal(awards(a).length,1);
});
test('rolls: concurrent same-client attempts cannot reuse a one-check award',async()=>{
  await grant();let finish;state.rollWait=new Promise(resolve=>{finish=resolve;});
  const first=rollSkill(a,a.items[0],{chat:false});const second=await rollSkill(a,a.items[0],{chat:false});
  assert.equal(second.blocked,true);finish();await first;assert.equal(awards(a).length,0);assert.equal(state.rollFormulas.length,2);
});
test('awards: spending an earlier grant preserves a newly granted independent flag',async()=>{
  await grant();let finish;state.rollWait=new Promise(resolve=>{finish=resolve;});
  const roll=rollSkill(a,a.items[0],{chat:false});await grant({label:'Later award',dice:[6]});finish();await roll;
  assert.equal(awards(a).length,1);assert.equal(awards(a)[0].label,'Later award');
});
test('permissions: players cannot assign, clear or remove GM awards',async()=>{
  await grant();const id=awards(a)[0].id;game.user=game.users.get('p1');
  await assert.rejects(grant(),/Only a GM/);await assert.rejects(clearBonusDiceAwards(['a']),/Only a GM/);await assert.rejects(removeBonusDiceAward('a',id),/Only a GM/);assert.equal(awards(a).length,1);
});
test('permissions: owners can use their awarded dice, non-owners cannot roll another character',async()=>{
  await grant();game.user=game.users.get('p2');await assert.rejects(rollSkill(a,a.items[0]),/do not own/);assert.equal(awards(a).length,1);
  game.user=game.users.get('p1');await rollSkill(a,a.items[0],{chat:false});assert.equal(awards(a).length,0);
});
test('awards: clearing selected characters leaves other awards and resources intact',async()=>{
  await grant({actorIds:['a','b']});const system=structuredClone(a.system),items=structuredClone(a.items);
  await clearBonusDiceAwards(['a']);assert.equal(awards(a).length,0);assert.equal(awards(b).length,1);assert.deepEqual(a.system,system);assert.deepEqual([...a.items],[...items]);
});
test('awards: assignment reports partial failure without hiding successful grants',async()=>{
  b.failUpdate=true;const result=await grant({actorIds:['a','b']});assert.equal(result.granted.length,1);assert.equal(result.failed[0].actorId,'b');assert.equal(awards(a).length,1);assert.equal(awards(b).length,0);
});
test('chat: a used grant appears in the roll data and escaped readable dice output',async()=>{
  await grant({label:'<script>bad</script>',dice:[6]});await rollSkill(a,a.items[0]);const message=state.messages.at(-1);
  assert.match(message.content,/Bonus Dice:/);assert.match(message.content,/&lt;script&gt;/);assert.doesNotMatch(message.content,/<script>/);assert.equal(message.flags['altered-carbon-rpg'].check.gmBonusAwardIds.length,1);
});
test('presets: overrides persist per world, resetting one preserves others',async()=>{
  await Promise.all([savePresetOverride('notice-anomaly',{baseTR:7,bonus:-1,bonusDice:['skill']}),savePresetOverride('search-scene',{baseTR:9})]);
  assert.equal(getPresetOverrides()['notice-anomaly'].baseTR,7);assert.equal(getPresetOverrides()['search-scene'].baseTR,9);
  await savePresetOverride('notice-anomaly',{}, {reset:true});assert.equal(getPresetOverrides()['notice-anomaly'],undefined);assert.equal(getPresetOverrides()['search-scene'].baseTR,9);
});
test('presets: invalid saves and player saves never alter stored settings',async()=>{
  await assert.rejects(savePresetOverride('notice-anomaly',{baseTR:'abc'}));await assert.rejects(savePresetOverride('__proto__',{baseTR:5}),/Unknown/);
  game.user=game.users.get('p1');await assert.rejects(savePresetOverride('notice-anomaly',{baseTR:3}),/GM only/);assert.deepEqual(getPresetOverrides(),{});
});
test('requests: use the preset label and carry editable TR and dice to the right recipients',async()=>{
  const preset=mergePreset({id:'x',skill:'Detection',label:'Notice the Anomaly',difficulty:1},{baseTR:6,bonus:-2,bonusDice:[8,8]});
  const message=await createRollRequest({...preset,actorIds:['a','b','a']});const request=message.getFlag('altered-carbon-rpg','gmRollRequest');
  assert.equal(request.title,'Notice the Anomaly');assert.equal(request.baseTR,6);assert.equal(request.bonus,-2);assert.equal(request.difficulty,1);assert.deepEqual(request.bonusDice,[8,8]);
  assert.deepEqual(request.actorIds,['a','b']);assert.deepEqual(message.whisper,['gm','p1','p2']);assert.match(message.content,/TR modifier: -2/);assert.doesNotMatch(message.content,/\+-2/);
});
test('requests: selected players perform the actual requested check with TR and Bonus Dice',async()=>{
  const message=await createRollRequest({skill:'Detection',baseTR:8,difficulty:1,bonus:-2,bonusDice:['skill'],actorIds:['a']});
  await respondToRequest(message,{dataset:{actorId:'a'}});const response=message.getFlag('altered-carbon-rpg','gmRollRequest').responses.a;
  assert.equal(response.tr,5);assert.equal(response.bonusDice.length,1);assert.equal(response.bonusDice[0].sides,8);
});
test('requests: simultaneous recipients keep both response records',async()=>{
  const message=await createRollRequest({skill:'Detection',actorIds:['a','b']});
  await Promise.all([respondToRequest(message,{dataset:{actorId:'a'}}),respondToRequest(message,{dataset:{actorId:'b'}})]);
  assert.deepEqual(Object.keys(message.getFlag('altered-carbon-rpg','gmRollRequest').responses).sort(),['a','b']);
});
test('requests: a completed character cannot answer the same request twice',async()=>{
  const message=await createRollRequest({skill:'Detection',actorIds:['a']});await respondToRequest(message,{dataset:{actorId:'a'}});const count=state.rollFormulas.length;
  await respondToRequest(message,{dataset:{actorId:'a'}});assert.equal(state.rollFormulas.length,count);
});
test('requests: non-GMs cannot send requests or respond for someone else',async()=>{
  const message=await createRollRequest({skill:'Detection',actorIds:['a']});game.user=game.users.get('p2');
  await assert.rejects(createRollRequest({skill:'Detection',actorIds:['a']}),/GM only/);
  await respondToRequest(message,{dataset:{actorId:'a'}});assert.equal(state.rollFormulas.length,0);
});
test('requests: old cards without bonus dice or base TR remain usable',async()=>{
  const message=await createRollRequest({skill:'Detection',actorIds:['b']});const request=message.getFlag('altered-carbon-rpg','gmRollRequest');delete request.baseTR;delete request.bonusDice;
  await respondToRequest(message,{dataset:{actorId:'b'}});assert.equal(request.responses.b,undefined);assert.equal(message.getFlag('altered-carbon-rpg','gmRollRequest').responses.b.tr,3);
});
test('requests: socket receipts use the stored rolled check, not a forged result payload',async()=>{
  installGMToolsHooks();const message=await createRollRequest({skill:'Detection',actorIds:['a']});game.user=game.users.get('p1');
  await respondToRequest(message,{dataset:{actorId:'a'}});const event=state.emitted.at(-1);event.payload.response.tr=99;
  game.user=game.users.get('gm');await state.socketHandlers[0](event.payload);
  assert.equal(message.getFlag('altered-carbon-rpg','gmRollRequest').responses.a.tr,3);
});
test('panel: saved settings and independent awards are exposed in actual context',async()=>{
  await savePresetOverride('notice-anomaly',{baseTR:7,bonusDice:[6,6]});await grant();
  const context=await new ACGMPanel()._prepareContext({});const preset=context.groups.flatMap(group=>group.presets).find(p=>p.id==='notice-anomaly');
  assert.equal(preset.baseTR,7);assert.equal(preset.saved,true);assert.equal(preset.bonusDiceCount,2);assert.equal(context.characters.find(c=>c.id==='a').awards.length,1);assert.equal(context.health.ok,true);
});
test('health: complete live registration is accepted without registry mutation',()=>{
  const types=[...CONFIG.Item.documentClass.TYPES];assert.equal(getSystemHealth().ok,true);assertRegisteredDocumentTypes({itemTypes:['drug','ammunition']});assert.deepEqual(CONFIG.Item.documentClass.TYPES,types);
});
test('health: stale server registrations are detected even when client data models exist',()=>{
  CONFIG.Item.documentClass.TYPES=CONFIG.Item.documentClass.TYPES.filter(type=>!['drug','ammunition'].includes(type));
  const health=getSystemHealth();assert.equal(health.ok,false);assert.deepEqual(health.missing,['Item.ammunition','Item.drug']);assert.match(health.remedy,/restart/i);
  assert.throws(()=>assertRegisteredDocumentTypes({itemTypes:['ammunition']}),/not registered/);
});
test('health: mismatched code and loaded manifest fail before catalog writes',async()=>{
  game.system.version='1.3.0';await assert.rejects(installCoreLibraryToWorld(),/Loaded manifest/);assert.equal(state.itemCreates,0);assert.equal(state.actorCreates,0);
});
test('health: batch import stops before any write if even one required Item type is missing',async()=>{
  CONFIG.Item.documentClass.TYPES=CONFIG.Item.documentClass.TYPES.filter(type=>type!=='ammunition');
  await assert.rejects(installCoreLibraryToWorld(),/ammunition/);assert.equal(state.itemCreates,0);assert.equal(state.actorCreates,0);
});
test('health: direct world and embedded ammunition imports fail once with actionable guidance',async()=>{
  const catalog=await loadCoreCatalog();const entry=catalog.items.find(item=>item.type==='ammunition');
  CONFIG.Item.documentClass.TYPES=CONFIG.Item.documentClass.TYPES.filter(type=>type!=='ammunition');const count=a.items.length;
  await assert.rejects(createWorldCoreItem(entry),/replace the complete/);await assert.rejects(addCatalogItemToActor(a,entry),/installation mismatch/);assert.equal(state.itemCreates,0);assert.equal(a.items.length,count);
});
test('health: fresh disk metadata and loaded registration can be diagnosed',async()=>{
  const health=await diagnoseSystem();assert.equal(health.ok,true);assert.equal(health.diskVersion,manifest.version);
  const wrong={...manifest,version:'1.3.0'};assert.equal(getSystemHealth({diskManifest:wrong}).ok,false);
});
test('catalog: healthy import creates every Core Item with its declared type and is repeat-safe',async()=>{
  const catalog=await loadCoreCatalog();const first=await installCoreLibraryToWorld();assert.equal(first.createdItems.length,catalog.items.length);assert.equal(catalog.items.length,95);assert.equal(first.createdVehicles.length,3);
  assert.ok(game.items.some(item=>item.type==='ammunition'));assert.ok(game.items.some(item=>item.type==='drug'));
  const second=await installCoreLibraryToWorld();assert.equal(second.createdItems.length,0);assert.equal(second.createdVehicles.length,0);assert.equal(state.itemCreates,95);
});
test('catalog: both ammunition and drug keep their types, quantity and specific fields on Actor add',async()=>{
  const catalog=await loadCoreCatalog();
  for(const type of ['ammunition','drug']){
    const entry=catalog.items.find(item=>item.type===type);const created=await addCatalogItemToActor(a,entry);assert.equal(created.type,type);const quantity=created.system.quantity;
    await addCatalogItemToActor(a,entry);assert.equal(a.items.filter(item=>item.system?.catalogId===entry.system.catalogId).length,1);assert.equal(created.system.quantity,quantity+Math.max(1,entry.system.quantity||1));
  }
});

test('catalog: overlapping full imports are serialized without duplicate Items or vehicles',async()=>{
  const [first,second]=await Promise.all([installCoreLibraryToWorld(),installCoreLibraryToWorld()]);
  assert.equal(first.createdItems.length,95);assert.equal(second.createdItems.length,95);assert.equal(state.itemCreates,95);assert.equal(state.actorCreates,3);
});
test('rolls: declining an AI temporary license leaves a one-check award intact',async()=>{
  a.type='ai';a.items[0].system.level=1;await grant();const result=await rollSkill(a,a.items[0],{aiLicense:false,chat:false});
  assert.equal(result.blocked,true);assert.equal(awards(a).length,1);assert.equal(state.rollFormulas.length,0);
});

/** Foundry v14 clinical operations console. No irreversible automated GM judgments. */
import {rollSkill} from './rolls.mjs';
import * as Procedures from './clinical-workflow.mjs';
import {ADMINISTRATION,DRUG_IDS,drugCatalogId,normalizeAdministration,egoEventProfile,EGO_EVENTS,virtualExposureProfile,installedUpgradeNames} from './drug-medical-virtual.mjs';
const api=foundry.applications.api;
const esc=x=>foundry.utils.escapeHTML(String(x??''));
const get=(form,key)=>form instanceof FormData?form.get(key):form?.[key];
const yes=(form,key)=>form instanceof FormData?form.has(key):Boolean(form?.[key]);
const opt=(value,label,selected=false)=>`<option value="${esc(value)}" ${selected?'selected':''}>${esc(label)}</option>`;
function skillSelect(actor,names,selected=names[0]){
 const found=actor.items.filter(i=>i.type==='skill'&&names.some(n=>i.name.toLowerCase()===n.toLowerCase()));
 return `<select name="skill">${found.map(s=>opt(s.id,s.name,s.name===selected)).join('')}</select>`;
}
function actOptions(){return game.actors.filter(a=>game.user.isGM||a.isOwner).filter(a=>['character','npc','threat','ai'].includes(a.type));}
export class ACClinicalConsole extends api.HandlebarsApplicationMixin(api.ApplicationV2){
 static DEFAULT_OPTIONS={id:'altered-carbon-clinical-console',classes:['altered-carbon','ac-clinical-console'],window:{title:'Altered Carbon — Drugs, Medical & Virtual'},position:{width:890,height:790},actions:{selectActor:this._selectActor,selectDrug:this._selectDrug,administer:this._administer,addiction:this._addiction,craving:this._craving,metabolize:this._metabolize,encounterEnd:this._encounterEnd,forceClear:this._forceClear,hangover:this._hangover,reaperMove:this._reaperMove,rest:this._rest,firstAid:this._firstAid,fieldMedic:this._fieldMedic,bioWelder:this._bioWelder,advanceMedical:this._advanceMedical,egoEvent:this._egoEvent,restoreEgo:this._restoreEgo,psychosurgery:this._psychosurgery,interrogation:this._interrogation,viralStrike:this._viralStrike,enterVirtual:this._enterVirtual,exitVirtual:this._exitVirtual,virtualExposure:this._virtualExposure,virtualTraining:this._virtualTraining,clearTrainingPool:this._clearTrainingPool}};
 static PARTS={main:{template:'systems/altered-carbon-rpg/templates/clinical-console.hbs'}};
 constructor(options={}){super(options);this.actorId=options.actorId||null;this.drugId=options.drugId||null;}
 get actor(){return game.actors.get(this.actorId);}
 get drug(){return this.actor?.items.get(this.drugId);}
 async _prepareContext(options){const ctx=await super._prepareContext(options),actors=actOptions();if(!this.actor&&!this.actorId&&actors.length)this.actorId=actors[0].id;
 const actor=this.actor,drugs=actor?.items.filter(i=>i.type==='drug')||[];
 if(!this.drugId&&drugs.length)this.drugId=drugs[0].id;
 const drug=this.drug,ego=actor?.system.resources.ego,permanent=Number(actor?.system.egoPermanentLoss||0);
 return {...ctx,actors:actors.map(a=>({id:a.id,name:a.name,selected:a.id===actor?.id})),hasActor:Boolean(actor),actorName:actor?.name||'',canOperate:Boolean(actor&&(game.user.isGM||actor.isOwner)),isGM:game.user.isGM,
  drugs:drugs.map(i=>({id:i.id,name:i.name,selected:i.id===drug?.id,doses:i.system.quantity,active:i.system.active,phase:i.system.drugPhase,addicted:i.system.addicted,hangover:i.system.hangoverHours,checks:i.system.metabolismChecks})),
  drug:drug?{name:drug.name,active:drug.system.active,phase:drug.system.drugPhase,quantity:drug.system.quantity,addicted:drug.system.addicted,craving:drug.system.craving,hangover:drug.system.hangoverHours,metabolismSuccesses:drug.system.metabolismSuccesses,metabolismChecks:drug.system.metabolismChecks,addictionRisk:drug.system.addiction,controlledBy:drug.system.controlledBy,controlledTier:drug.system.controlledTier,isBios:drugCatalogId(drug)===DRUG_IDS.bios}:null,
  egoValue:ego?.value||0,egoMax:ego?.max||0,egoEffectiveMax:Math.max(0,Number(ego?.max||0)-permanent),egoPermanentLoss:permanent,
  virtual:actor?.system.virtualSession||null,virtualBonusPool:actor?.system.virtualTrainingBonusPool||0,virtualTrainingChoiceCount:JSON.parse(actor?.system.virtualSession?.trainingChoices||'[]').length,medicalAftereffectHours:actor?.system.medicalAftereffectHours||0,hasFieldMedic:Boolean(actor?.items.some(i=>i.type==='trait'&&i.system.catalogId==='trait-145')),hasBioWelder:Boolean(actor?.items.some(i=>i.type==='equipment'&&/bio welder/i.test(i.name))),medicalItems:drugs.filter(d=>drugCatalogId(d)===DRUG_IDS.bios).map(d=>({id:d.id,name:d.name,quantity:d.system.quantity})),activeCount:drugs.filter(d=>d.system.active).length};
 }
 async _do(action){try{await action();await this.render({force:true});}catch(error){console.error('Altered Carbon Clinical Console',error);ui.notifications.error(error?.message||'Clinical procedure failed.');}}
 static async _selectActor(event,target){this.actorId=target.dataset.actorId;this.drugId=null;await this.render({force:true});}
 static async _selectDrug(event,target){this.drugId=target.dataset.drugId;await this.render({force:true});}
 static async _administer(){return this._do(async()=>{const actor=this.actor,drug=this.drug;if(!drug)throw new Error('Select a Drug first.');if(drugCatalogId(drug)===DRUG_IDS.bios)throw new Error('Use Medical Treatment for Rapid Regrowth Bios.');
  const current=normalizeAdministration(drug.system.lastAdministrationMethod||drug.system.administration)||'aerosol';
  const options=Object.entries(ADMINISTRATION).map(([v,m])=>opt(v,m.label,v===current)).join('');
  const form=await api.DialogV2.input({window:{title:`Administer ${drug.name}`},content:`<p>Source method decides action cost and any required Skill Check. Controlled Substance licensing applies when acquired, not when injected.</p><label>Method</label><select name="method">${options}</select><label><input type="checkbox" name="covert"> Covert application</label><p>For offensive delivery, the GM must resolve targeting and effects on the target separately; this patient-only procedure cannot attack another Actor.</p><label><input type="checkbox" name="grapple"> Target within Grapple range (GM confirmed)</label>${game.user.isGM?'<label><input type="checkbox" name="override"> GM records a resolved administration check / authorizes exception</label>':''}`});if(!form)return;
  const result=await Procedures.administerDrug(actor,drug,{method:get(form,'method'),covert:yes(form,'covert'),offensive:yes(form,'offensive'),inGrapple:yes(form,'grapple'),gmOverride:game.user.isGM&&yes(form,'override')});
  if(!result.administered)return ui.notifications.warn(result.reason);
  if(result.needsAddictionCheck){try{await Procedures.testAddiction(actor,drug);}catch(e){ui.notifications.warn(`Dose administered. Addiction test still required: ${e.message}`);}}
  ui.notifications.info(`${drug.name} administered; Under the Influence.`);
 });}
 static async _addiction(){return this._do(async()=>{await Procedures.testAddiction(this.actor,this.drug);});}
 static async _craving(){return this._do(async()=>{const r=await Procedures.resistCraving(this.actor,this.drug);ui.notifications.info(r.resisted?'Craving resisted; -1 to Checks until influence.':'Craving not resisted: GM handles acquisition.');});}
 static async _metabolize(){return this._do(async()=>{const r=await Procedures.drugMetabolizationRound(this.actor,this.drug);ui.notifications.info(r.wearsOffAtEncounterEnd?'Metabolized: clear at Encounter end.':`Active; +${r.enduranceBonus} to future Endurance tests.`);});}
 static async _encounterEnd(){return this._do(async()=>{const n=await Procedures.completeEncounterMetabolization(this.actor);ui.notifications.info(`${n} drug effect(s) cleared after successful Endurance checks.`);});}
 static async _forceClear(){return this._do(async()=>{if(!game.user.isGM)throw new Error('GM only.');const approved=await api.DialogV2.confirm({window:{title:'GM: Clear Drug Effect'},content:`<p>Override metabolization state for ${esc(this.drug?.name)}? This is an explicit adjudication, not the default Core rule.</p>`});if(approved)await Procedures.clearDrugAfterEncounter(this.actor,this.drug,{gmForce:true});});}
 static async _hangover(){return this._do(async()=>{const form=await api.DialogV2.input({window:{title:'Advance Merge Hangover'},content:'<label>Elapsed hours</label><input name="hours" type="number" min="1" max="10" value="1">'});if(form)await Procedures.advanceHangover(this.actor,this.drug,{hours:Number(get(form,'hours'))});});}
 static async _reaperMove(){return this._do(async()=>{const r=await Procedures.recordReaperAction(this.actor,'move');if(!r)ui.notifications.warn('No active Reaper drug.');});}
 static async _rest(){return this._do(async()=>{const actor=this.actor,medical=actor.items.filter(i=>i.type==='drug'&&drugCatalogId(i)===DRUG_IDS.bios&&i.system.quantity>0);
  const form=await api.DialogV2.input({window:{title:'Medical Rest / Rapid Regrowth Bios'},content:`<p>The base rest check uses Endurance or Toughness. Rapid Regrowth adds either HP or Wounds recovery, and consumes a dose.</p><label>Rest</label><select name="rest">${opt('short','Short Rest')}${opt('long','Long Rest')}</select><label>Rapid Regrowth</label><select name="item">${opt('','None — natural recovery')}${medical.map(i=>opt(i.id,`${i.name} (${i.system.quantity} dose(s))`)).join('')}</select><label>Treatment benefit</label><select name="choice">${opt('wounds','Additional Wounds')}${opt('health','Health Points')}</select><label>Rest Skill</label>${skillSelect(actor,['Endurance','Toughness'])}<p>The selected treatment's Catastrophe risk is enforced when a check yields a Catastrophe.</p>`});if(!form)return;
  const skill=actor.items.get(get(form,'skill'));if(!skill)throw new Error('An Endurance or Toughness Skill is required for a rest check.');
  const bios=actor.items.get(get(form,'item'))||null;
  let treatmentCatastrophe=false;
  if(bios){const medicine=actor.items.find(i=>i.type==='skill'&&i.name.toLowerCase()==='medicine');
   if(!medicine)throw new Error('The subdermal Rapid Regrowth ampule needs Medicine TR8; add the official Medicine Skill Item.');
   const attempt=await rollSkill(actor,medicine,{chat:true,baseTR:8,gearBonus:2,contextLabel:'Rapid Regrowth — Ampule (Medicine TR8)'});
   if(attempt.blocked)throw new Error(attempt.reason);
   treatmentCatastrophe=Boolean(attempt.catastrophe);
   if(!attempt.success){if(treatmentCatastrophe){await actor.applyInjury('flesh','Flesh Wound','HP1 per day','Failed Rapid Regrowth administration; dangerous tissue growth.');}
    ui.notifications.warn('Medicine TR8 failed. Rapid Regrowth not administered; no dose consumed.');return;}
  }
  const r=await rollSkill(actor,skill,{chat:true,contextLabel:'Medical Rest'});if(r.blocked)throw new Error(r.reason);
  const result=await Procedures.performMedicalRest(actor,{rest:get(form,'rest'),success:r.success,successDegrees:r.successDegrees,catastrophe:treatmentCatastrophe,item:bios,choice:get(form,'choice')});
  if(result.blocked)ui.notifications.warn(result.reason);else ui.notifications.info('Rest and medical treatment recorded.');
 });}
 static async _firstAid(){return this._do(async()=>{
  if(!game.user.isGM)throw new Error('GM must confirm target, check and healing.');
  const operator=this.actor,targets=actOptions(),skill=operator?.items.find(i=>i.type==='skill'&&i.name.toLowerCase()==='medicine');
  if(!skill)throw new Error('Operator requires the official Medicine Skill.');
  const form=await api.DialogV2.input({window:{title:'Medicine — First Aid (Core Trait)'},content:`<p>Roll Medicine, choose a patient, and record the base Wounds removed by the published treatment. <strong>Basic First Aid</strong> grants an additional +1 Wound per + degree only if the patient has no active Injuries. Both components are applied once, after the check.</p><label>Patient</label><select name="target">${targets.map(a=>opt(a.id,a.name,a.id===operator.id)).join('')}</select><label>Base wounds restored (GM reviewed)</label><input type="number" name="base" min="0" max="100" value="0"><label>Additional difficulty</label><input type="number" name="difficulty" min="0" max="10" value="0">`});
  if(!form)return;
  const target=game.actors.get(get(form,'target'));
  if(!target)throw new Error('Select a patient.');
  const degree=await rollSkill(operator,skill,{chat:true,activity:'first-aid',adjudicationKind:'treatment',targetType:target.items.some(i=>i.type==='injury'&&i.system.active!==false)?'injured':'uninjured',difficulty:Number(get(form,'difficulty'))||0,contextLabel:`First Aid: ${target.name}`});
  if(degree.blocked)throw new Error(degree.reason);
  if(degree.successDegrees<1){ui.notifications.warn('No + degrees: no First Aid Wounds healed.');return;}
  const plan=await Procedures.performFirstAid(operator,target,{successDegrees:degree.successDegrees,baseWounds:Number(get(form,'base')),checkMessageId:degree.chatMessageId});
  ui.notifications.info(`First Aid: ${plan.recovered} Wounds restored (${plan.extraWounds} from Basic First Aid).`);
 });}
 static async _fieldMedic(){return this._do(async()=>{
  if(!game.user.isGM)throw new Error('GM must confirm Expert First Aid treatment.');
  const operator=this.actor,targets=actOptions(),skill=operator?.items.find(i=>i.type==='skill'&&i.name.toLowerCase()==='medicine');
  if(!skill)throw new Error('Operator requires the Medicine Skill.');
  if(!operator.items.some(i=>i.type==='trait'&&i.system.catalogId==='trait-145'))throw new Error('Operator needs the Field Medic Trait.');
  const form=await api.DialogV2.input({window:{title:'Field Medic — Expert First Aid (+)'},content:`<p>Source: Core Ch.5 Field Medic. Each + Resolved restores 1d6 + Intelligence Bonus Wounds during Short Rest, or 1d10 + IB during Long Rest. Requires Medicine, and you must choose how many + to spend after the check.</p><label>Patient</label><select name="target">${targets.map(a=>opt(a.id,a.name,a.id===operator.id)).join('')}</select><label>Rest</label><select name="rest"><option value="short">Short</option><option value="long">Long</option></select><label>Additional difficulty</label><input type="number" name="difficulty" min="0" max="10" value="0">`});
  if(!form)return;
  const target=game.actors.get(get(form,'target'));if(!target)throw new Error('Select a patient.');
  const result=await rollSkill(operator,skill,{chat:true,activity:'expert-first-aid',adjudicationKind:'treatment',difficulty:Number(get(form,'difficulty'))||0,contextLabel:`Field Medic: ${target.name}`});
  if(result.blocked)throw new Error(result.reason);
  if(result.successDegrees<1){ui.notifications.warn('No + degrees: Expert First Aid cannot be Resolved.');return;}
  const spending=await api.DialogV2.input({window:{title:'Resolve Field Medic +' },content:`<p>Medicine rolled <strong>${result.successDegrees}</strong> + degree(s). Each degree spent triggers a complete Wound recovery die plus Intelligence Bonus. Do not spend the same + on another Triggered Effect.</p><label>Positive degrees to spend</label><input type="number" name="spend" min="1" max="${result.successDegrees}" value="1">`});
  if(!spending)return;
  const applied=await Procedures.performFieldMedic(operator,target,{rest:get(form,'rest'),positiveDegrees:result.successDegrees,spentDegrees:Number(get(spending,'spend')),checkMessageId:result.chatMessageId});
  ui.notifications.info(`Field Medic healed ${applied.recovered} Wounds (${applied.formula}).`);
 });}
 static async _bioWelder(){return this._do(async()=>{
 const operator=this.actor,welders=operator.items.filter(i=>i.type==='equipment'&&/bio welder/i.test(i.name));
 if(!welders.length)throw new Error('Operator must have a Bio Welder Item.');
 const targets=actOptions();const form=await api.DialogV2.input({window:{title:'Bio Welder — Tissue / Bone Weld'},content:`<label>Welder</label><select name="welder">${welders.map(w=>opt(w.id,w.name)).join('')}</select><label>Patient</label><select name="target">${targets.map(a=>opt(a.id,a.name,a.id===operator.id)).join('')}</select><label>Rest</label><select name="rest">${opt('short','Short Rest')}${opt('long','Long Rest')}</select><label>Injury / Trigger</label><select name="injury">${opt('flesh','Tissue Weld')}${opt('bone','Bone Weld (upgrade required)')}</select><label>Effect</label><select name="recover">${opt('wounds','Heal Wounds')}${opt('health','Restore lost HP for that Injury')}</select><label>Skill</label>${skillSelect(operator,['Medicine','Digital Engineering'])}<p>Core Bio Welder: TR10; printed (-3) specialty penalty is adjudicated via the check. Each + resolves Tissue/Bone Weld once; Advanced Bio Welder may grant +1 Bonus Die.</p><label>Additional GM-chosen Difficulty</label><input type="number" name="difficulty" min="0" max="10" value="0">`});if(!form)return;
 const skill=operator.items.get(get(form,'skill')),target=game.actors.get(get(form,'target')),welder=operator.items.get(get(form,'welder'));
 if(!skill||!target)throw new Error('Select a supported operator Skill and patient.');
 const upgrades=installedUpgradeNames(welder);if(skill.name==='Digital Engineering'&&!upgrades.has('autosurgeon'))throw new Error('Digital Engineering requires the installed Autosurgeon modification.');
 const die={1:20,2:12,3:10,4:8,5:6}[Number(skill.system.level||1)]||20;
 const bonusDice=upgrades.has('advanced-bio-welder')?[die]:[];
 const result=await rollSkill(operator,skill,{chat:true,contextLabel:'Bio Welder',baseTR:10,difficulty:Number(get(form,'difficulty'))||0,bonusDice,gearBonus:upgrades.has('guidance-servos')?1:0});
 if(result.blocked)throw new Error(result.reason);
 if(!result.successDegrees){ui.notifications.warn('No + resolved; no Bio Welder healing applied.');return;}
 const output=await Procedures.performBioWelder(operator,target,welder,{degrees:result.successDegrees,rest:get(form,'rest'),injury:get(form,'injury'),recover:get(form,'recover')});
 ui.notifications.info(`Bio Welder restored ${output.actual} ${get(form,'recover')}.`);
 });}
 static async _advanceMedical(){return this._do(async()=>{const form=await api.DialogV2.input({window:{title:'Advance Medical Aftereffects'},content:'<p>Advance fictional hours. Rapid Regrowth Painkiller -2 Skill Check penalty ends after the next 24 hours.</p><label>Hours</label><input name="hours" type="number" min="1" value="1">'});if(form)await Procedures.advanceMedicalAftereffects(this.actor,{hours:Number(get(form,'hours'))});});}
 static async _egoEvent(){return this._do(async()=>{const actor=this.actor;
  const form=await api.DialogV2.input({window:{title:'Apply Official Ego-Loss Event'},content:`<p>Event formulas depend on AI status, Willpower and active Soma/Lethinol. Permanent events reduce the recoverable Ego cap.</p><label>Event</label><select name="event">${Object.keys(EGO_EVENTS).map(k=>opt(k,k)).join('')}</select><label>Discipline + degrees already resolved</label><input name="discipline" type="number" min="0" max="5" value="0"><label>HP lost due to Organic Damage (if any)</label><input name="hp" type="number" min="0" value="0"><label><input type="checkbox" name="birth"> Birth sleeve lost</label><label><input type="checkbox" name="clone"> Destination is an own clone</label><label><input type="checkbox" name="resleeving"> Ego loss part of resleeving/needlecasting</label>`});if(!form)return;
  await Procedures.applyEgoEvent(actor,get(form,'event'),{disciplineDegrees:Number(get(form,'discipline')),healthLost:Number(get(form,'hp')),birthSleeve:yes(form,'birth'),cloneDestination:yes(form,'clone'),resleeving:yes(form,'resleeving')});
 });}
 static async _restoreEgo(){return this._do(async()=>{if(!game.user.isGM)throw new Error('Only the GM can grant free Ego healing.');const actor=this.actor;const form=await api.DialogV2.input({window:{title:'Restore Recoverable Ego'},content:'<p>GM-entered award/therapy. Permanent Ego loss cannot be restored.</p><label>EP to restore</label><input name="ep" type="number" min="0" value="1">'});if(form)await Procedures.restoreEgo(actor,Number(get(form,'ep')));});}
 static async _psychosurgery(){return this._do(async()=>{if(!game.user.isGM)throw new Error('Psychosurgery procedure is GM-supervised.');
  const operator=this.actor,targets=actOptions().filter(a=>a.system.virtualSession?.active),software=operator.items.filter(i=>i.type==='software'&&/psychosurgery/i.test(i.name));
  if(!software.length)throw new Error('Operator needs the Psychosurgery Software Item.');if(!targets.length)throw new Error('Put target in Virtual first.');
  const form=await api.DialogV2.input({window:{title:'Psychosurgery — Core and Software'},content:`<label>Patient in Virtual</label><select name="target">${targets.map(t=>opt(t.id,t.name)).join('')}</select><label>Operator Skill</label>${skillSelect(operator,['Medicine','Read Person','Data Engineering'])}<label>Rulebook source for check</label><select name="tr"><option value="chapter">Chapter 4: Medicine TR3 / Data Engineering TR5</option><option value="software">Chapter 6: program TR6 (GM interpretation)</option></select><label>Protocol upgrade tiers (0–4)</label><input type="number" name="tiers" min="0" max="4" value="0"><label><input type="checkbox" name="reconstruct"> Choose Ego Reconstruction if at least +++++ generated</label><p>Run a Skill Check, then execute the published positive/negative Triggered Effect.</p>`});if(!form)return;
  const target=game.actors.get(get(form,'target')),skill=operator.items.get(get(form,'skill'));if(!skill)throw new Error('Select an operator Skill.');
  const baseTR=get(form,'tr')==='software'?6:skill.name==='Medicine'?3:skill.name==='Data Engineering'?5:null;
  const bonusDice=Array.from({length:({low:0,medium:1,high:2}[target.system.virtualSession.resolution]||0)},()=>skill.skillDieSides);
  const result=await rollSkill(operator,skill,{baseTR,bonusDice,chat:true,contextLabel:`Psychosurgery: ${target.name}`});if(result.blocked)throw new Error(result.reason);
  const reconstruct=yes(form,'reconstruct')&&result.successDegrees>=5;
  const out=await Procedures.resolvePsychosurgery(operator,target,{positiveDegrees:result.successDegrees,negativeDegrees:result.failureDegrees,protocolTiers:Number(get(form,'tiers')),reconstruct});
  ui.notifications.info(`Psychosurgery: restored ${out.restored} EP, trauma ${out.trauma}, permanent conversion ${out.converted}.`);
 });}
 static async _interrogation(){return this._do(async()=>{if(!game.user.isGM)throw new Error('GM supervision required.');const actor=this.actor,targets=actOptions().filter(a=>a.system.virtualSession?.active);
  if(!targets.length)throw new Error('Target must be in Virtual.');
  const form=await api.DialogV2.input({window:{title:'Virtual Interrogation / Virus'},content:`<label>Target in Virtual</label><select name="target">${targets.map(t=>opt(t.id,t.name)).join('')}</select><label>Interrogation Skill</label>${skillSelect(actor,['Intimidation','Read Person','Data Engineering'])}<label>Interrogation protocol tier (0–4)</label><input name="tiers" type="number" min="0" max="4" value="0"><label><input name="sharya" type="checkbox"> GM confirms Sharya Protocols installed</label><label><input name="save" type="checkbox"> Target Discipline opposed Save Throw resolved separately</label>`});if(!form)return;
  if(!yes(form,'save'))throw new Error('Resolve the target’s opposed Discipline check before applying Interrogation results.');
  const target=game.actors.get(get(form,'target')),skill=actor.items.get(get(form,'skill'));if(!skill)throw new Error('Choose an interrogation Skill.');
  const resolution=target.system.virtualSession.resolution,bonusDice=Array.from({length:({low:0,medium:1,high:2}[resolution]||0)},()=>skill.skillDieSides);
  const result=await rollSkill(actor,skill,{difficulty:3,bonusDice,chat:true,contextLabel:`Interrogation: ${target.name}`});if(result.blocked)throw new Error(result.reason);
  await Procedures.resolveInterrogation(actor,target,{positiveDegrees:result.successDegrees,negativeDegrees:result.failureDegrees,protocolTiers:Number(get(form,'tiers')),sharya:yes(form,'sharya')});
 });}
 static async _viralStrike(){return this._do(async()=>{if(!game.user.isGM)throw new Error('GM supervision required.');const targets=actOptions().filter(a=>a.id!==this.actor.id);
  const form=await api.DialogV2.input({window:{title:'Virus / Firewall — GM Resolution'},content:`<label>Target</label><select name="target">${targets.map(t=>opt(t.id,t.name)).join('')}</select><label>Class</label><select name="cls">${['c','b','a','milspec'].map(v=>opt(v,v.toUpperCase())).join('')}</select><label>Successful + resolutions</label><input type="number" name="plus" min="1" max="5" value="1"><label><input name="delivery" type="checkbox"> GM confirms published delivery conditions</label><label><input name="save" type="checkbox"> GM resolves defending Save Throw</label>`});if(!form)return;
  await Procedures.resolveViralStrike(this.actor,game.actors.get(get(form,'target')),{cls:get(form,'cls'),successes:Number(get(form,'plus')),deliveryConfirmed:yes(form,'delivery'),savingThrowResolved:yes(form,'save')});
 });}
 static async _enterVirtual(){return this._do(async()=>{const form=await api.DialogV2.input({window:{title:'Project DHF into Virtual'},content:`<label>Resolution</label><select name="resolution">${['low','medium','high'].map(x=>opt(x,x)).join('')}</select><label>Purpose</label><select name="purpose">${['therapeutic','instruction','incarceration'].map(x=>opt(x,x)).join('')}</select><label>Exposure band</label><select name="band">${['days','month','months-year','five-years','ten-plus-years'].map(x=>opt(x,x)).join('')}</select><label>Real time : Virtual time (narrative)</label><input name="ratio" value="1:1"><label>Session notes</label><textarea name="notes"></textarea>`});if(!form)return;
  await Procedures.enterVirtual(this.actor,{resolution:get(form,'resolution'),purpose:get(form,'purpose'),timeBand:get(form,'band'),timeRatio:get(form,'ratio'),notes:get(form,'notes')});
 });}
 static async _virtualExposure(){return this._do(async()=>{const actor=this.actor,v=actor.system.virtualSession;if(!v?.active)throw new Error('Project into Virtual first.');
  const form=await api.DialogV2.input({window:{title:'Resolve Virtual Time / Ego'},content:`<p>${esc(v.purpose)} · ${esc(v.timeBand)}. The selected Core time band determines the Ego formula and Discipline penalty.</p><label>Years in Virtual (if 10+ incarceration)</label><input name="years" type="number" min="10" max="1000" value="10"><label><input name="skip" type="checkbox"> GM has already resolved the Discipline Save; use 0 degrees</label>`});if(!form)return;
  const isAI=actor.type==='ai'||actor.system.identity?.variant==='ai',profile=virtualExposureProfile({band:v.timeBand,purpose:v.purpose,isAI,years:Number(get(form,'years'))});let disciplineDegrees=0;
  if(profile.formula!=='0'&&!yes(form,'skip')){const skill=actor.items.find(i=>i.type==='skill'&&i.name.toLowerCase()==='discipline');if(!skill)throw new Error('Need a Discipline Skill or confirm the GM already adjudicated it.');const r=await rollSkill(actor,skill,{difficulty:profile.difficulty,chat:true,contextLabel:'Virtual Exposure'});if(r.blocked)throw new Error(r.reason);disciplineDegrees=Number(r.successDegrees||0);}
  await Procedures.resolveVirtualExposure(actor,{years:Number(get(form,'years')),disciplineDegrees});
 });}
 static async _virtualTraining(){return this._do(async()=>{
 if(!game.user.isGM)throw new Error('Virtual training rewards require GM authorization.');
 const actor=this.actor,v=actor.system.virtualSession;
 if(!v?.active||v.purpose!=='instruction')throw new Error('Enter an Instruction Virtual session first.');
 const band=v.timeBand;let available={days:['session-bonus'],month:['attribute-bonus','sp'],'months-year':['sp','half-skill'],'five-years':['sp','skill'],'ten-plus-years':['sp','skill','two-skills']}[band];
 if(!available)throw new Error('Select an official Virtual time band.');
 const skills=actor.items.filter(i=>i.type==='skill');
 const form=await api.DialogV2.input({window:{title:'Virtual Instruction / Learning Reward'},content:`<p>Core Time Band: ${esc(band)}. Each session awards only once, and named specialized protocols are once per character. Long-duration instruction can confer SP or upgrade Skills.</p><label>Reward</label><select name="mode">${available.map(m=>opt(m,m)).join('')}</select><label>Skill 1</label><select name="skill1">${opt('','None')}${skills.map(s=>opt(s.id,s.name)).join('')}</select><label>Skill 2 (if two-skills)</label><select name="skill2">${opt('','None')}${skills.map(s=>opt(s.id,s.name)).join('')}</select><label>Bonus-die Attribute (short/one month)</label><select name="attribute">${['perception','acuity','intelligence'].map(v=>opt(v,v)).join('')}</select><label>Specialized training protocol ID (optional)</label><input name="protocol" placeholder="Stable protocol name, one award per ID"><p>For 10+ years, claim two <strong>different</strong> official reward options with separate confirmations. The console prevents repeat selections and duplicate training protocols.</p>`});if(!form)return;
 const selected=[get(form,'skill1'),get(form,'skill2')].filter(Boolean);
 const out=await Procedures.awardVirtualInstruction(actor,{mode:get(form,'mode'),skills:selected,attribute:get(form,'attribute'),protocolId:get(form,'protocol')});
 ui.notifications.info(`Instruction recorded: ${out.grant} reward points, upgraded ${out.upgraded.length} Skills.`);
 });}
 static async _clearTrainingPool(){return this._do(async()=>{if(!game.user.isGM)throw new Error('GM must clear session-only training credits.');const confirm=await api.DialogV2.confirm({window:{title:'Clear Virtual Training Credits'},content:'<p>Remove remaining session-only Virtual bonus-die points when the narrative session or training benefit expires?</p>'});if(!confirm)return;await this.actor.update({'system.virtualTrainingBonusPool':0,'system.virtualTrainingBonusAttribute':''});});}
 static async _exitVirtual(){return this._do(async()=>{const ok=await api.DialogV2.confirm({window:{title:'Return to Realspace'},content:'<p>Have you resolved any pending Virtual exposure and protocol consequences? Exit does not automatically roll them.</p>'});if(ok)await Procedures.exitVirtual(this.actor);});}
}

/** Stateful Foundry v14 procedures built on the deterministic 2020 Core helpers.
 * Every mutate operation validates user permissions; no GM rulings are guessed.
 */
import {rollSkill} from './rolls.mjs';
import {evaluateEffects} from './effects.mjs';
import {postTraitAdjudication} from './trait-adjudication.mjs';
import {
 DRUG_IDS,drugCatalogId,activeDrugs,administrationPlan,metabolizationPlan,metabolismDifficulty,
 clearingDrug,addictionUseOutcome,reaperActionFormula,medicalRestPlan,installedUpgradeNames,
 EGO_EVENTS,egoEventProfile,egoDamageAfterReduction,egoResourceChange,egoAvailableMaximum,
 psychosurgeryPlan,interrogationPlan,virtualExposureProfile,virtualAllowed,virtualResolutionBonus,virusProfile,bioWelderPlan,virtualInstructionPlan
} from './drug-medical-virtual.mjs';
const NS='altered-carbon-rpg';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const items=actor=>actor?.items?.contents||[...actor.items];
const ident=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const limited=n=>Math.max(0,Math.trunc(Number(n)||0));
function assertAccess(actor){if(!actor)throw new Error('Select an Actor.');if(!(game.user.isGM||actor.isOwner))throw new Error('Only the GM or Actor owner can perform this procedure.');}
function assertGM(){if(!game.user.isGM)throw new Error('A GM must confirm this high-impact procedure.');}
function findSkill(actor,name){const id=ident(name);return items(actor).find(i=>i.type==='skill'&&(ident(i.name)===id||ident(i.system?.catalogId)===id));}
async function ensureStatus(actor,key,label=key,source='clinical'){
 const present=items(actor).find(i=>i.type==='condition'&&ident(i.system.key||i.system.catalogId||i.name)===key);if(present)return present;
 return (await actor.createEmbeddedDocuments('Item',[{name:label,type:'condition',system:{key,description:`Applied by Altered Carbon ${source} workflow.`},flags:{[NS]:{managedBy:'clinical'}}}]))[0];
}
async function removeManagedStatus(actor,key){
 const status=items(actor).find(i=>i.type==='condition'&&ident(i.system.key||i.system.catalogId||i.name)===key);
 if(status&&status.flags?.[NS]?.managedBy==='clinical')await status.delete();
}
async function updateInfluenceStatuses(actor){
 const active=activeDrugs(items(actor));
 if(active.length)await ensureStatus(actor,'under-the-influence','Under the Influence');
 else await removeManagedStatus(actor,'under-the-influence');
 if(active.some(i=>drugCatalogId(i)===DRUG_IDS.stallion))await ensureStatus(actor,'enraged','Enraged');
 else await removeManagedStatus(actor,'enraged');
}
export async function clinicalMessage(actor,title,detail,{kind='CLINICAL PROCEDURE',flags={}}={}){
 const content=`<section class="ac-chat-card ac-clinical-card"><header class="ac-chat-card-header"><div><span class="ac-chat-kicker">${esc(kind)}</span><strong>${esc(title)}</strong></div><span class="ac-grade-chip">RECORDED</span></header><p class="ac-chat-subtitle">${esc(actor.name)}</p><p class="ac-request-context">${esc(detail)}</p></section>`;
 return ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content,flags:{[NS]:{clinical:{title,detail,...flags}}}});
}
/** Administer to the Actor carrying the item. Transfer gear to another Actor before administering it. */
export async function administerDrug(actor,item,{method,offensive=false,covert=false,inGrapple=false,check=null,addictionCheck=null,gmOverride=false}={}){
 assertAccess(actor);if(item?.type!=='drug'||item.parent?.id!==actor.id)throw new Error('Choose a Drug belonging to this Actor.');
 if(offensive)throw new Error('Offensive administration requires selecting an enemy target and resolving resistance. Use a GM-targeted procedure; this console is for the patient Actor only.');
 if(drugCatalogId(item)===DRUG_IDS.bios)throw new Error('Rapid Regrowth Bios are handled by the Medical Treatment workflow, not recreational drug activation.');
 if(item.system.active)throw new Error('This drug is already active. Resolve metabolization or the encounter before another dose.');
 if(Number(item.system.quantity||0)<1)throw new Error('No doses available.');
 const plan=administrationPlan(method||item.system.lastAdministrationMethod,{offensive,covert,inGrapple});
 if(gmOverride)assertGM();
 let checkResult=check;
 if(plan.check&&!gmOverride){
  if(checkResult===null){const skill=findSkill(actor,plan.check.skill);if(!skill)throw new Error(`Need the ${plan.check.skill} Skill record, or a GM override, to administer this way.`);
   checkResult=await rollSkill(actor,skill,{chat:true,contextLabel:`Administer ${item.name}`,baseTR:plan.check.tr,difficulty:plan.check.difficulty});}
  if(checkResult?.blocked||!checkResult?.success)return {administered:false,method:plan.id,check:checkResult,reason:'Administration check failed; dose not consumed.'};
 }
 await item.update({'system.quantity':limited(item.system.quantity)-1,'system.active':true,'system.drugPhase':'influence','system.metabolismSuccesses':0,'system.metabolismChecks':0,'system.hangoverHours':0,'system.craving':false,'system.lastAdministrationMethod':plan.id});
 if(drugCatalogId(item)===DRUG_IDS.lethinol){const panic=items(actor).find(i=>i.type==='condition'&&ident(i.system.key||i.system.catalogId||i.name)==='panic');if(panic)await panic.delete();}
 await updateInfluenceStatuses(actor);
 let addicted=false;
 if(item.system.addiction&&addictionCheck){addicted=addictionUseOutcome({hasAddictionRule:true,failureDegrees:addictionCheck.failureDegrees,wasAddicted:item.system.addicted}).addicted;
  if(addicted&&!item.system.addicted)await item.update({'system.addicted':true});}
 await clinicalMessage(actor,`Administered ${item.name}`,`${plan.label}; Under the Influence. ${item.system.addiction?'Discipline Addiction check is required.':''} ${item.system.controlledTier?`Controlled Substance (${item.system.controlledBy} ${item.system.controlledTier}) — acquisition/license handled by GM.`:''}`,{flags:{drug:item.id,method:plan.id,addicted}});
 return {administered:true,method:plan.id,addicted,needsAddictionCheck:Boolean(item.system.addiction&&!addictionCheck)};
}
export async function testAddiction(actor,item,{check=null,gmOverrideDegrees=null}={}){
 assertAccess(actor);if(item.type!=='drug'||!item.system.addiction)throw new Error('Drug has no official Addiction rule.');
 let r=check;if(gmOverrideDegrees!==null){assertGM();r={success:false,failureDegrees:limited(gmOverrideDegrees)};}
 else if(!r){const skill=findSkill(actor,'Discipline');if(!skill)throw new Error('Actor needs Discipline to test addiction.');r=await rollSkill(actor,skill,{chat:true,contextLabel:`Addiction — ${item.name}`});}
 if(r?.blocked)throw new Error('Addiction check was blocked.');
 const outcome=addictionUseOutcome({hasAddictionRule:true,failureDegrees:r.failureDegrees,wasAddicted:item.system.addicted});
 if(outcome.triggered)await item.update({'system.addicted':true});
 await clinicalMessage(actor,`${item.name}: Addiction test`,outcome.addicted?'Addiction applies (three or more negative degrees).':'No new addiction (fewer than three negative degrees).');
 return outcome;
}
export async function resistCraving(actor,item,{check=null}={}){
 assertAccess(actor);if(item.type!=='drug'||!item.system.addicted)throw new Error('No addiction recorded for this drug.');
 if(item.system.active)throw new Error('This drug is active; resolve metabolization instead.');
 const skill=findSkill(actor,'Discipline');if(!skill&&!check)throw new Error('Discipline Skill required to resist an opportunity to acquire the drug.');
 const r=check||await rollSkill(actor,skill,{chat:true,contextLabel:`Resist ${item.name} craving`});if(r.blocked)throw new Error('Discipline check blocked.');
 if(r.success)await item.update({'system.craving':true});
 await clinicalMessage(actor,`Addiction: ${item.name}`,r.success?'Resisted immediate temptation: Skill Checks -1 until Under the Influence.':'Failed to resist: GM adjudicates effort to acquire the drug; no purchase is automatically made.');
 return {resisted:r.success,craving:Boolean(r.success)};
}
export async function drugMetabolizationRound(actor,item,{check=null}={}){
 assertAccess(actor);if(item.type!=='drug'||!item.system.active)throw new Error('Select an active Drug.');
 const skill=findSkill(actor,'Endurance');if(!skill&&!check)throw new Error('An Endurance Skill record is required.');
 const bonus=limited(item.system.metabolismSuccesses),difficulty=metabolismDifficulty(item);
 const r=check||await rollSkill(actor,skill,{chat:true,contextLabel:`Metabolization — ${item.name}`,bonus,difficulty});
 if(r.blocked)throw new Error('Metabolization check was blocked.');
 const change=metabolizationPlan(item,{success:r.success});
 await item.update({'system.metabolismChecks':change.checksMade,'system.metabolismSuccesses':change.successes,'system.drugPhase':change.phase});
 await clinicalMessage(actor,`${item.name}: Endurance Round`,r.success?'Passed; the drug wears off at the end of this Encounter.':`Still Under the Influence. Future Endurance Bonus +${change.enduranceBonus}; additional checks each Round.`);
 return change;
}
export async function clearDrugAfterEncounter(actor,item,{gmForce=false}={}){
 assertAccess(actor);if(gmForce)assertGM();const cleared=clearingDrug(item,{force:gmForce});if(!cleared.cleared)return cleared;
 await item.update({'system.active':false,'system.drugPhase':cleared.phase,'system.hangoverHours':cleared.hangoverHours,'system.metabolismChecks':0,'system.metabolismSuccesses':0});
 await updateInfluenceStatuses(actor);
 await clinicalMessage(actor,`${item.name} metabolized`,cleared.hangoverHours?`Influence ended. Merge hangover lasts ${cleared.hangoverHours} hours.`:'Drug cleared.');
 return cleared;
}
export async function completeEncounterMetabolization(actor){
 assertAccess(actor);let total=0;for(const item of activeDrugs(items(actor))){if(item.system.drugPhase==='pending-clearance'){await clearDrugAfterEncounter(actor,item);total++;}}
 return total;
}
export async function advanceHangover(actor,item,{hours=1}={}){
 assertAccess(actor);if(drugCatalogId(item)!==DRUG_IDS.merge||item.system.drugPhase!=='hangover')throw new Error('No active Merge hangover.');
 if(!(Number(hours)>0))throw new Error('Advance time by a positive number of hours.');const left=Math.max(0,limited(item.system.hangoverHours)-limited(hours));await item.update({'system.hangoverHours':left,'system.drugPhase':left?'hangover':'inactive'});
 return left;
}
export async function recordReaperAction(actor,action='attack'){
 assertAccess(actor);const formula=reaperActionFormula(items(actor),action);if(!formula)return null;
 const roll=await new Roll(formula).evaluate(),damage=limited(roll.total);
 const health=await actor.loseHealth(damage);await clinicalMessage(actor,'Reaper Poison — '+action,`Lose ${damage} HP directly [Poison] from ${formula}; remaining HP ${health}.`,{flags:{reaperAction:action,formula,damage}});
 return {formula,damage,health};
}
/** Rest recovery and Rapid Regrowth treatment use the Core's separate Wounds/HP tracks. */
export async function performMedicalRest(actor,{rest='short',success=false,successDegrees=0,item=null,choice='wounds',catastrophe=false}={}){
 assertAccess(actor);
 try{await postTraitAdjudication(actor,{event:'rest'});}catch(error){console.warn('Altered Carbon | Rest Trait review unavailable; check GM manually.',error);}const usingBios=Boolean(item);
 if(usingBios&&(item.type!=='drug'||drugCatalogId(item)!==DRUG_IDS.bios||item.parent?.id!==actor.id))throw new Error('Select Rapid Regrowth Bios from the patient’s Drug inventory.');
 if(usingBios&&limited(item.system.quantity)<1)throw new Error('No Rapid Regrowth doses available.');
 const upgrades=usingBios?[...installedUpgradeNames(item)]:[],days=usingBios?limited(item.system.delayedDaysUsed):0,plan=medicalRestPlan({rest,treatment:usingBios?'rapid-regrowth':'none',upgrades,desired:choice,catastrophe,delayedDaysUsed:days});
 // Validate Squalor and poisoned recovery BEFORE consuming a dose.
 const forbidden=actor.ac?.conditions?.has('squalor')||(rest==='short'&&actor.ac?.injuries?.some(i=>(i.system.key||i.system.catalogId)==='poisoned'));
 if(forbidden&&!usingBios)return {blocked:true,reason:'Natural Wound recovery blocked by Squalor/Poisoned.'};
 const base=await actor.healWoundsFromRest(rest,{success,successDegrees});
 const roll=plan.formula==='0'?null:await new Roll(plan.formula).evaluate();
 const extra=plan.maximizeHealth?4:limited(roll?.total),resources=actor.system.resources;
 let recovery=0,remaining=0;
 if(choice==='health'&&usingBios){const max=limited(resources.health.max),before=limited(resources.health.value);remaining=Math.min(max,before+extra);recovery=remaining-before;await actor.update({'system.resources.health.value':remaining});}
 else if(choice==='wounds'&&usingBios){const before=limited(resources.wounds.value);remaining=Math.max(0,before-extra);recovery=before-remaining;await actor.update({'system.resources.wounds.value':remaining});}
 if(usingBios){await item.update({'system.quantity':limited(item.system.quantity)-1,'system.delayedDaysUsed':days+plan.delayedDaysIncrement});if(plan.applyNextDayDifficulty)await actor.update({'system.medicalAftereffectHours':24});if(plan.catastropheInjury)await actor.applyInjury('flesh','Flesh Wound','HP1 per day','Rapid Regrowth dangerous tissue growth; surgical excision needed.');}
 await clinicalMessage(actor,`${rest} rest ${usingBios?'+ Rapid Regrowth':''}`,`Base recovery ${base.heal} Wounds; additional ${recovery} ${choice==='health'?'HP':'Wounds'} (${plan.formula}). ${plan.catastropheInjury?'Catastrophe: Flesh Wound recorded.':''} ${plan.notes}`);
 return{base,recovery,extra,plan,remaining};
}
/** Core Ch.5 Basic First Aid: the +1 Wound per positive degree applies only
 * when the patient has no Injuries. Other Medicine effects remain GM-resolved.
 * This is a pure plan: no rounding surprise, no hidden healing, no GM choice.
 */
export function firstAidTreatmentPlan(operator,patient,{successDegrees=0,baseWounds=0}={}){
 const degrees=Number(successDegrees),base=Number(baseWounds);
 if(!Number.isInteger(degrees)||degrees<0||degrees>20)throw new Error('Use a valid 0–20 number of Medicine positive degrees.');
 if(!Number.isInteger(base)||base<0||base>100)throw new Error('Specify the GM-confirmed base Wound healing (0–100).');
 const activeInjuries=items(patient).filter(i=>i.type==='injury'&&i.system?.active!==false);
 const targetType=activeInjuries.length?'injured':'uninjured';
 const results=evaluateEffects(operator,{skill:'medicine',activity:'first-aid',targetType});
 const bonusPerDegree=Math.max(0,Math.trunc(Number(results.values['medical.woundsPerDegree']||0)));
 const extras=degrees*bonusPerDegree;
 const woundValue=limited(patient?.system?.resources?.wounds?.value);
 const recovered=Math.min(woundValue,base+extras);
 return {degrees,base,bonusPerDegree,extraWounds:extras,recovered,remaining:woundValue-recovered,targetType,activeInjuries:activeInjuries.length,errors:results.errors};
}

/** GM-confirmed treatment using a previously resolved Medicine Check. Logs only
 * the actual change. No player-initiated automatic roll can heal a target.
 */
export async function performFirstAid(operator,patient,options={}){
 assertGM();assertAccess(operator);if(!patient?.system?.resources?.wounds)throw new Error('Select a patient with Wounds.');
 const plan=firstAidTreatmentPlan(operator,patient,options);
 if(!plan.degrees&&plan.base)throw new Error('No successful Medicine degrees: base treatment must be adjudicated separately.');
 const checkId=String(options.checkMessageId||'').trim();
 if(checkId&&!/^[a-zA-Z0-9._-]{1,128}$/.test(checkId))throw new Error('Invalid Medicine roll identifier.');
 const used=patient.getFlag?.(NS,'firstAidChecks')||[];
 if(checkId&&used.includes(checkId))throw new Error('This Medicine check was already used for First Aid.');
 const previousWounds=limited(patient.system.resources.wounds.value);
 if(plan.recovered)await patient.update({'system.resources.wounds.value':plan.remaining});
 try{if(checkId){if(!patient.setFlag)throw new Error('Patient must support persistent check tracking.');await patient.setFlag(NS,'firstAidChecks',[...used.slice(-49),checkId]);}}
 catch(error){if(plan.recovered)await patient.update({'system.resources.wounds.value':previousWounds});throw error;}
 await clinicalMessage(patient,'Medicine: First Aid',`${operator.name} treated ${patient.name}. ${plan.degrees} positive degrees; base ${plan.base}; Basic First Aid +${plan.extraWounds} (${plan.bonusPerDegree} extra per degree). ${plan.targetType==='injured'?'Patient has Injuries: Basic First Aid benefit not applied.':''} Wounds restored: ${plan.recovered}.`,{flags:{firstAid:{operatorUuid:operator.uuid,positiveDegrees:plan.degrees,bonus:plan.extraWounds,recovered:plan.recovered}}});
 return plan;
}

/** Core Ch.5 Field Medic: Expert First Aid (+), one die + IB per
 * deliberately Resolved positive degree. Expert Triage (+++) is separate:
 * targeting up to 5 with a medical device remains an explicit GM choice.
 */
export function fieldMedicPlan(operator,patient,{rest='short',positiveDegrees=0,spentDegrees=1}={}){
 const hasTrait=items(operator).some(i=>i.type==='trait'&&i.system?.catalogId==='trait-145');
 if(!hasTrait)throw new Error('Only a character with the official Field Medic Trait can use Expert First Aid.');
 if(!['short','long'].includes(rest))throw new Error('Expert First Aid must occur during a Short or Long Rest.');
 if(!Number.isSafeInteger(positiveDegrees)||positiveDegrees<1||positiveDegrees>20||!Number.isSafeInteger(spentDegrees)||spentDegrees<1||spentDegrees>positiveDegrees)throw new Error('Spend 1 or more earned + degrees, never more than the Medicine result.');
 const intelligence=Number(operator?.system?.attributes?.intelligence||0);
 const intelligenceBonus=Math.max(0,Math.floor(intelligence/10));
 return {rest,positiveDegrees,spentDegrees,die:rest==='short'?6:10,intelligenceBonus,formula:`${spentDegrees}d${rest==='short'?6:10}+${spentDegrees*intelligenceBonus}`,before:limited(patient?.system?.resources?.wounds?.value)};
}
export async function performFieldMedic(operator,patient,options={}){
 assertGM();assertAccess(operator);if(!patient?.system?.resources?.wounds)throw new Error('Select a valid Field Medic patient.');
 const plan=fieldMedicPlan(operator,patient,options);
 const checkId=String(options.checkMessageId||'').trim();
 if(checkId&&!/^[a-zA-Z0-9._-]{1,128}$/.test(checkId))throw new Error('Invalid Medicine roll identifier.');
 const used=patient.getFlag?.(NS,'firstAidChecks')||[];
 if(checkId&&used.includes(checkId))throw new Error('These Medicine + degrees were already used for treatment.');
 const roll=await new Roll(plan.formula).evaluate();
 const raw=limited(roll.total),recovered=Math.min(plan.before,raw),remaining=plan.before-recovered;
 if(recovered)await patient.update({'system.resources.wounds.value':remaining});
 try{if(checkId){if(!patient.setFlag)throw new Error('Patient must support persistent Medicine-roll tracking.');await patient.setFlag(NS,'firstAidChecks',[...used.slice(-49),checkId]);}}
 catch(error){if(recovered)await patient.update({'system.resources.wounds.value':plan.before});throw error;}
 await clinicalMessage(patient,'Field Medic: Expert First Aid',`${operator.name} Resolved ${plan.spentDegrees} Medicine + on ${patient.name} during a ${plan.rest} Rest; ${plan.formula} = ${raw}. Wounds restored ${recovered}; ${remaining} remain. Expert Triage of multiple patients is GM-reviewed separately.`,{flags:{fieldMedic:{operatorUuid:operator.uuid,positiveDegrees:plan.positiveDegrees,spentDegrees:plan.spentDegrees,formula:plan.formula,rolled:raw,recovered}}});
 return {...plan,rolled:raw,recovered,remaining};
}

export async function restoreEgo(actor,amount,{reason='Psychosurgery',message=true}={}){
 assertAccess(actor);const {ego}=actor.system.resources;
 const result=egoResourceChange({current:ego.value,maximum:ego.max,permanentLoss:actor.system.egoPermanentLoss,heal:limited(amount)});
 await actor.update({'system.resources.ego.value':result.value,'system.egoState':result.egoState});
 if(message)await clinicalMessage(actor,reason,`Restored up to ${limited(amount)} recoverable EP; current ${result.value}/${result.effectiveMaximum}.`);
 return result;
}
/** Converts EXISTING recoverable Ego loss into permanent loss, without double damaging current EP. */
export async function makeEgoLossPermanent(actor,amount,{reason='Permanent Ego damage'}={}){
 assertAccess(actor);const r=actor.system.resources.ego,current=limited(r.value),baseMax=limited(r.max),oldPermanent=limited(actor.system.egoPermanentLoss);
 const available=egoAvailableMaximum({maximum:baseMax,permanentLoss:oldPermanent});
 const convertible=Math.max(0,available-current);const added=Math.min(convertible,limited(amount));
 const change=egoResourceChange({current,maximum:baseMax,permanentLoss:oldPermanent,newPermanent:added});
 await actor.update({'system.egoPermanentLoss':change.permanentLoss,'system.resources.ego.value':change.value,'system.egoState':change.egoState});
 await clinicalMessage(actor,reason,`${added} previously lost EP now unrecoverable. Effective maximum ${change.effectiveMaximum}.`);
 return{...change,converted:added};
}
export async function applyEgoEvent(actor,event,{disciplineDegrees=0,healthLost=0,birthSleeve=false,cloneDestination=false,resleeving=false,permanent=null,gmOverride=false}={}){
 assertAccess(actor);if(gmOverride)assertGM();
 const isAI=actor.type==='ai'||actor.system.identity?.variant==='ai';
 const profile=egoEventProfile(event,{isAI,items:items(actor),resleeving,birthSleeve,cloneDestination});
 if(event==='organic'&&healthLost<0)throw new Error('HP lost cannot be negative.');
 const roll=profile.formula==='0'?null:await new Roll(profile.formula).evaluate();
 const raw=limited(roll?.total);const amount=profile.formula==='0'?0:egoDamageAfterReduction(raw,{healthLost,willpowerBonus:actor.ac?.bonuses?.willpower,disciplineDegrees});
 const r=actor.system.resources.ego,isPermanent=permanent===null?profile.permanent:Boolean(permanent);
 const result=egoResourceChange({current:r.value,maximum:r.max,permanentLoss:actor.system.egoPermanentLoss,damage:amount,newPermanent:isPermanent?amount:0});
 await actor.update({'system.resources.ego.value':result.value,'system.egoPermanentLoss':result.permanentLoss,'system.egoState':result.egoState});
 await clinicalMessage(actor,`${event}: Ego loss`,`${profile.formula} = ${raw}; after discipline/Willpower ${amount} EP lost${isPermanent?' permanently':''}. Remaining ${result.value}/${result.effectiveMaximum}. ${profile.notes}`);
 return{...result,raw,amount,profile};
}
export async function enterVirtual(actor,{resolution='low',purpose='therapeutic',timeBand='days',timeRatio='1:1',notes=''}={}){
 assertAccess(actor);const isAI=actor.type==='ai'||actor.system.identity?.variant==='ai';
 const religiousCoding=actor.system.identity?.variant==='religious'||actor.system.identity?.variant==='religious-coding'||String(actor.system.identity?.variantChoices||'').includes('eschew-virtual');
 if(!virtualAllowed({religiousCoding,isAI}))throw new Error('Religious Coding / Eschew Virtual prevents ordinary Virtual projection without a GM-directed narrative override.');
 if(actor.system.virtualSession?.active)throw new Error('Already in Virtual.');
 virtualResolutionBonus(resolution);virtualExposureProfile({band:timeBand,purpose,isAI});
 await actor.update({'system.virtualSession.active':true,'system.virtualSession.resolution':resolution,'system.virtualSession.purpose':purpose,'system.virtualSession.timeBand':timeBand,'system.virtualSession.timeRatio':String(timeRatio),'system.virtualSession.notes':String(notes),'system.virtualSession.exposures':0,'system.virtualSession.trainingClaimed':false,'system.virtualSession.trainingChoices':'[]','system.virtualSession.trainingProtocolKey':''});
 await ensureStatus(actor,'virtual','Virtual');await clinicalMessage(actor,'Entered Virtual',`${resolution} resolution; ${purpose}; ${timeBand}; time ratio ${timeRatio}. Physical sleeve augments/abilities do not automatically follow DHF projection.`);
 return actor.system.virtualSession;
}
export async function exitVirtual(actor){assertAccess(actor);if(!actor.system.virtualSession?.active)throw new Error('No Virtual session active.');await actor.update({'system.virtualSession.active':false});await removeManagedStatus(actor,'virtual');await clinicalMessage(actor,'Exited Virtual','Return to realspace; GM resolves pending exposure/needlecasting consequences.');}
export async function resolveVirtualExposure(actor,{band=null,purpose=null,years=10,disciplineDegrees=0}={}){
 assertAccess(actor);if(!actor.system.virtualSession?.active)throw new Error('Actor must be in Virtual.');
 const v=actor.system.virtualSession,isAI=actor.type==='ai'||actor.system.identity?.variant==='ai';
 const profile=virtualExposureProfile({band:band||v.timeBand,purpose:purpose||v.purpose,isAI,years});
 const roll=profile.formula==='0'?null:await new Roll(profile.formula).evaluate(),raw=limited(roll?.total);
 const amount=raw?egoDamageAfterReduction(raw,{willpowerBonus:(actor.ac?.bonuses?.willpower||0)*profile.willpowerReductions,disciplineDegrees}):0;
 const resources=actor.system.resources.ego,result=egoResourceChange({current:resources.value,maximum:resources.max,permanentLoss:actor.system.egoPermanentLoss,damage:amount});
 await actor.update({'system.resources.ego.value':result.value,'system.egoState':result.egoState,'system.virtualSession.exposures':limited(v.exposures)+1});
 await clinicalMessage(actor,'Virtual exposure',`${profile.band} / ${profile.purpose}: ${profile.formula} = ${raw}; effective ${amount} EP lost; Discipline difficulty -${profile.difficulty}. ${profile.description}`);
 return{...result,raw,amount,profile};
}
export async function resolvePsychosurgery(operator,target,{positiveDegrees=0,negativeDegrees=0,protocolTiers=0,reconstruct=false}={}){
 assertAccess(operator);assertAccess(target);assertGM();if(!target.system.virtualSession?.active)throw new Error('Target DHF must be in Virtual to receive Psychosurgery.');
 if(!items(operator).some(i=>i.type==='software'&&/psychosurgery/i.test(i.name)))throw new Error('Operator needs the official Psychosurgery Software Item.');
 const plan=psychosurgeryPlan({positiveDegrees,negativeDegrees,protocolTiers,reconstruct});
 const roll=async f=>f==='0'?0:limited((await new Roll(f).evaluate()).total);
 const restored=await roll(plan.restoreFormula),feedback=await roll(plan.negativeFeedbackFormula),trauma=await roll(plan.traumaFormula);
 if(trauma)await target.applyEgoDamage(trauma);
 if(restored)await restoreEgo(target,restored,{message:false});
 const converted=feedback?await makeEgoLossPermanent(target,feedback,{reason:'Psychosurgery: Negative Feedback'}):null;
 await clinicalMessage(operator,`Psychosurgery on ${target.name}`,`Resolved +${positiveDegrees}/-${negativeDegrees}; recovered ${restored} EP, trauma ${trauma} EP, previously lost EP made permanent ${converted?.converted||0}. ${plan.notes}`);
 return{plan,restored,feedback,converted:converted?.converted||0,trauma};
}
export async function resolveInterrogation(operator,target,{positiveDegrees=0,negativeDegrees=0,protocolTiers=0,sharya=false,virusClass=null}={}){
 assertAccess(operator);assertAccess(target);assertGM();if(!target.system.virtualSession?.active)throw new Error('Target DHF must be in Virtual to be interrogated with software.');
 if(!items(operator).some(i=>i.type==='software'&&/interrogation/i.test(i.name)))throw new Error('Operator requires the official Interrogation/Virus Software Item.');
 const isAI=target.type==='ai'||target.system.identity?.variant==='ai';
 if(isAI&&!virusClass)throw new Error('Core p.146: AI is immune to nonviral interrogation/torture in Virtual; use a documented Viral Strike instead.');
 const plan=interrogationPlan({positiveDegrees:isAI?0:positiveDegrees,negativeDegrees,protocolTiers,sharya:isAI?false:sharya,virusClass});
 const roll=async f=>f==='0'?0:limited((await new Roll(f).evaluate()).total);
 const damage=await roll(plan.egoDamageFormula),viral=plan.viral?await roll(plan.viral.formula):0;
 const res=egoResourceChange({current:target.system.resources.ego.value,maximum:target.system.resources.ego.max,permanentLoss:target.system.egoPermanentLoss,damage:damage+viral,newPermanent:plan.permanent?damage:0});
 await target.update({'system.resources.ego.value':res.value,'system.egoPermanentLoss':res.permanentLoss,'system.egoState':res.egoState});
 if(plan.interrogatorEgoLoss)await operator.applyEgoDamage(plan.interrogatorEgoLoss);
 await clinicalMessage(operator,`Interrogation of ${target.name}`,`Interrogation EP loss ${damage}; Viral Strike ${viral}; Sympathy -${plan.interrogatorEgoLoss} EP. ${plan.personalityFrag?'Personality Frag condition met; GM resolves narrative consequences.':''} ${plan.terminated?'Protocols terminated.':''} ${sharya?'Sharya: damage permanent.':''}`);
 return{plan,damage,viral,res};
}
export async function resolveViralStrike(operator,target,{cls='c',successes=1,deliveryConfirmed=false,savingThrowResolved=false}={}){
 assertAccess(operator);assertAccess(target);assertGM();
 if(!deliveryConfirmed||!savingThrowResolved)throw new Error('GM must confirm legal viral delivery and resolve any defender Save Throw first.');
 const profile=virusProfile(cls,successes),roll=await new Roll(profile.formula).evaluate();
 const amount=limited(roll.total);const result=await target.applyEgoDamage(amount);
 await clinicalMessage(operator,`Class ${profile.classId.toUpperCase()} Viral Strike`,`${target.name} loses ${amount} EP (${profile.formula}) after GM-confirmed delivery/save; resistance Difficulty -${profile.saveDifficulty}.`);
 return{profile,amount,result};
}

/** Explicit advancement of fictional hours; Foundry world time is not assumed to match game time. */
export async function advanceMedicalAftereffects(actor,{hours=1}={}){
 assertAccess(actor);if(!(Number(hours)>0))throw new Error('Advance by a positive number of hours.');
 const left=Math.max(0,limited(actor.system.medicalAftereffectHours)-limited(hours));
 await actor.update({'system.medicalAftereffectHours':left});
 await clinicalMessage(actor,'Advanced medical time',`Painkiller next-day Skill penalty: ${left}h remaining.`);
 return left;
}
/** Bio Welder is an Equipment Item with source-defined Medicine procedures, not a new drug. */
export async function performBioWelder(operator,patient,welder,{degrees=0,rest='short',injury='flesh',recover='wounds'}={}){
 assertAccess(operator);assertAccess(patient);
 if(welder?.parent?.id!==operator.id||welder.type!=='equipment'||!/bio welder/i.test(welder.name))throw new Error('Operator must possess a Bio Welder equipment item.');
 const upgrades=[...installedUpgradeNames(welder)];
 const plan=bioWelderPlan({degrees,rest,injury,recover,upgrades});
 if(recover==='health'){
  const injuries=items(patient).filter(i=>i.type==='injury'&&i.system.active&&(ident(i.system.key||i.system.catalogId||i.name).includes(injury)));
  if(!injuries.length)throw new Error(`HP recovery with ${injury} Weld requires a matching active Injury; otherwise use Tissue/Bone Wounds recovery.`);
 }
 const raw=limited((await new Roll(plan.formula).evaluate()).total),bonus=plan.woundBonus;
 const resource=patient.system.resources[recover==='wounds'?'wounds':'health'];
 const original=limited(resource.value),updated=recover==='wounds'?Math.max(0,original-raw-bonus):Math.min(limited(resource.max),original+raw);
 await patient.update({[`system.resources.${recover==='wounds'?'wounds':'health'}.value`]:updated});
 const actual=Math.abs(updated-original);
 await clinicalMessage(operator,`Bio Welder: ${patient.name}`,`${injury==='bone'?'Bone':'Tissue'} Weld: +${degrees} (${plan.formula}${bonus?` + ${bonus}`:''}). Rest: ${rest}. ${recover==='health'?'HP':'Wounds'} restored ${actual}.`);
 return {plan,actual,raw,remaining:updated};
}

/** GM-confirmed virtual instruction: session-unique rewards, protocol-unique across sessions. */
export async function awardVirtualInstruction(actor,{mode='sp',skills=[],attribute='acuity',protocolId=''}={}){
 assertAccess(actor);assertGM();const v=actor.system.virtualSession||{};
 if(!v.active||v.purpose!=='instruction')throw new Error('The DHF must be in an active Instruction Virtual session.');
 if(v.trainingClaimed)throw new Error('This Virtual training session already granted its allowed rewards.');
 const plan=virtualInstructionPlan({band:v.timeBand,mode,acuityBonus:actor.ac?.bonuses?.acuity||Math.floor(Number(actor.system.attributes?.acuity||30)/10)});
 let choices=[],history=[],vouchers=[];
 try{choices=JSON.parse(v.trainingChoices||'[]');}catch{choices=[];}
 try{history=JSON.parse(actor.system.virtualTrainingProtocols||'[]');}catch{history=[];}
 try{vouchers=JSON.parse(actor.system.virtualHalfSkillVouchers||'[]');}catch{vouchers=[];}
 if(!Array.isArray(choices)||!Array.isArray(history)||!Array.isArray(vouchers))throw new Error('Invalid Virtual training history; GM must repair legacy record.');
 if(choices.includes(plan.mode))throw new Error('An extended Virtual session grants different reward choices, not the same reward twice.');
 if(choices.length>=plan.choicesRequired)throw new Error('This Virtual session has exhausted its instruction options.');
 const key=String(protocolId||v.trainingProtocolKey||'').trim();
 if(v.trainingProtocolKey&&protocolId&&key!==v.trainingProtocolKey)throw new Error('The training protocol cannot change halfway through a session.');
 if(key&&history.includes(key))throw new Error('This specialized Training Protocol has already been used to claim a reward.');
 const required=plan.mode==='two-skills'?2:['skill','half-skill'].includes(plan.mode)?1:0;
 const requestedIds=skills.map(String),selected=requestedIds.map(id=>items(actor).find(i=>i.type==='skill'&&(i.id===id||i.name===id)));
 if(selected.length!==required||selected.some(s=>!s)||new Set(selected.map(s=>s.id)).size!==required)throw new Error(`Choose ${required} distinct Skill(s) for this mode.`);
 if(required===2&&selected[0].system.attribute!==selected[1].system.attribute)throw new Error('Two-skill training must improve Skills of the same Attribute.');
 if(['skill','two-skills'].includes(plan.mode)&&selected.some(s=>Number(s.system.level)>=plan.cap))throw new Error(`Virtual Instruction Skill cap is Level ${plan.cap}.`);
 if(plan.mode==='half-skill'&&vouchers.includes(selected[0].id))throw new Error('A half-price Skill voucher already exists for this Skill.');
 const grant=plan.formula==='0'?0:limited((await new Roll(plan.formula).evaluate()).total);
 // Commit only after every legal prerequisite has been checked.
 for(const skill of (['skill','two-skills'].includes(plan.mode)?selected:[]))await skill.update({'system.level':Number(skill.system.level)+1});
 const update={};
 if(plan.mode==='sp')update['system.resources.stackPoints.value']=limited(actor.system.resources.stackPoints.value)+grant;
 if(['attribute-bonus','session-bonus'].includes(plan.mode)){
  const attr=String(attribute).toLowerCase();if(!['perception','acuity','intelligence'].includes(attr))throw new Error('The instruction bonus must be bound to Perception, Acuity or Intelligence.');
  if(actor.system.virtualTrainingBonusPool>0&&actor.system.virtualTrainingBonusAttribute!==attr)throw new Error('Spend the existing training bonus pool before changing its Attribute.');
  update['system.virtualTrainingBonusPool']=limited(actor.system.virtualTrainingBonusPool)+grant;update['system.virtualTrainingBonusAttribute']=attr;
 }
 if(plan.mode==='half-skill'){vouchers.push(selected[0].id);update['system.virtualHalfSkillVouchers']=JSON.stringify(vouchers);}
 const nextChoices=[...choices,plan.mode],complete=nextChoices.length>=plan.choicesRequired;
 if(key&&complete)history.push(key);
 Object.assign(update,{'system.virtualSession.trainingChoices':JSON.stringify(nextChoices),'system.virtualSession.trainingClaimed':complete,'system.virtualSession.trainingProtocolKey':key,'system.virtualTrainingProtocols':JSON.stringify(history)});
 await actor.update(update);
 await clinicalMessage(actor,'Virtual Instruction Reward',`${plan.band} / ${plan.mode}: ${grant} awarded${plan.mode==='sp'?' SP':''}. Skill advances: ${selected.map(s=>s.name).join(', ')||'none'}. ${complete?'Session completed.':'One further different reward choice remains.'} ${plan.notes}`);
 return {plan,grant,upgraded:['skill','two-skills'].includes(plan.mode)?selected.map(s=>s.id):[],complete,choices:nextChoices,history};
}

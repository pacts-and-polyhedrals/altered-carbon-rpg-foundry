/** GM-only world mutations for 2020 Core Ch.7. No network access except local Foundry documents. */
import {rollSkill} from './rolls.mjs';
import {requestProfile,stepDie} from './rules-engine.mjs';
import {postTraitAdjudication,ownedAdjudications} from './trait-adjudication.mjs';
import {evaluateEffects} from './effects.mjs';
import {adversaryDocuments,networkDocument,contactDocument,requestPrerequisites,requestExhaustion,resupplyPlan,contactResources} from './gm-content.mjs';
const NS='altered-carbon-rpg';
const locks=new WeakSet();
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const esc=v=>foundry.utils.escapeHTML(String(v??''));
function requireGM(){if(!game.user?.isGM)throw new Error('These GM operations are GM-only.');}
async function locked(actor,callback){if(locks.has(actor))throw new Error(`An operation is already being resolved for ${actor.name}.`);locks.add(actor);try{return await callback();}finally{locks.delete(actor);}}
function assertActor(actor){if(!actor||!['character','ai'].includes(actor.type))throw new Error('Choose a Player Character or AI Actor.');return actor;}
function requireSource(actor,sourceId){const source=actor.items?.get(sourceId);if(!source||!['network','contact'].includes(source.type))throw new Error('The selected Contact/Network is not owned by the requesting character.');return source;}
const msg=async (title,body,flags={})=>ChatMessage.implementation.create({speaker:{alias:'GM Operations'},content:`<section class="ac-chat-card ac-gm-operations-log"><header class="ac-chat-card-header"><strong>${esc(title)}</strong></header><p>${body}</p></section>`,whisper:game.users.filter(u=>u.isGM).map(u=>u.id),flags:{[NS]:flags}});

export async function createOfficialAdversary(entry,skills,options={}){
  requireGM();const {actor,items}=adversaryDocuments(entry,skills,options);
  if(options.name){const name=String(options.name).trim();if(name.length>120||!name)throw new Error('NPC name must be 1–120 characters.');actor.name=name;actor.system.identity.publicName=name;}
  // Embedded Skill records make every printed Attribute skill level ready to roll.
  const created=await foundry.documents.Actor.implementation.create({...actor,items});
  if(!created)throw new Error('Foundry did not create the adversary.');
  await msg('Adversary template created',`${esc(created.name)} · ${esc(entry.category)} · ${options.minion?'Minion · ':''}${esc(options.nemesisAbility||'Core baseline')}. Source: printed Core p.287–293.`,{gmAdversaryCreated:entry.id});
  return created;
}

export async function addNetwork(actor,entry,options={}){
  requireGM();assertActor(actor);
  const doc=networkDocument(entry,options);
  if(actor.items.some(i=>i.type==='network'&&i.system.catalogId===entry.id&&norm(i.system.organization)===norm(doc.system.organization)))throw new Error('This organization is already a Network on the character.');
  const created=await actor.createEmbeddedDocuments('Item',[doc]);return created[0];
}
export async function installOfficialNetworkLibrary(entries){
  requireGM();if(!Array.isArray(entries)||entries.length!==7)throw new Error('The seven official Network categories are required.');
  const name='Altered Carbon — Core Networks',existing=game.folders?.find(f=>f.type==='Item'&&f.name===name);
  const folder=existing||await Folder.create({name,type:'Item'});let created=0,refreshed=0;
  for(const entry of entries){const doc=networkDocument(entry),item=game.items.find(i=>i.type==='network'&&i.system.catalogId===entry.id&&i.folder?.id===folder.id);
    if(item){await item.update({'name':doc.name,'system.description':doc.system.description,'system.categories':doc.system.categories,'system.rulesRef':doc.system.rulesRef});refreshed++;}
    else{await Item.create({...doc,folder:folder.id});created++;}
  }
  return {created,refreshed,folder};
}

/** Persist Contact as a typed Item. Optionally debit only the affiliation SP (advanced development is a separate GM decision). */
export async function addContact(actor,profile,{chargeSP=true,chargeDevelopmentSP=false,applyInfluence=true}={}){
  requireGM();assertActor(actor);const doc=contactDocument(profile);
  if(actor.items.some(i=>i.type==='contact'&&norm(i.name)===norm(doc.name)))throw new Error('A Contact with this name already exists for this character.');
  const originalSP=Number(actor.system.resources.stackPoints.value||0),originalIP=Number(actor.system.resources.influence.value||0);
  const maxIP=Number(actor.system.resources.influence.max||0);
  const costs={affiliation:chargeSP?profile.spCost:0,development:chargeDevelopmentSP?profile.developmentSP:0};
  const totalCost=costs.affiliation+costs.development;
  if(totalCost>originalSP)throw new Error(`Developing this Contact requires SP${totalCost}; only SP${originalSP} available.`);
  const reward=applyInfluence?profile.resources.influence:'none';
  const newIP=reward==='gain'?originalIP+1:reward==='restore'?Math.min(maxIP,originalIP+1):originalIP;
  // Core 2020 p.39: gaining IP increases its maximum; restoring IP never does.
  const newMaxIP=reward==='gain'?Math.max(maxIP,originalIP)+1:maxIP;
  doc.system.resourceInfluenceApplied=Boolean(reward!=='none'&&newIP!==originalIP);
  doc.system.developmentSPPaid=Boolean(costs.development);
  doc.flags={[NS]:{source:'2020 Core Ch.7 Contact Resources',resourceDice:profile.resourceDice,resourceScore:profile.resourceScore,standingDie:profile.standing.roll,historyDie:profile.history.roll,virtue:profile.virtue,flaws:profile.flaws,resourceInfluence:reward,affiliationSPCharged:costs.affiliation,developmentSPCharged:costs.development}};
  const companion=profile.requiresScandal?{name:`Desperation — ${profile.name}`,type:'scandal',system:{key:`desperation-${norm(profile.name)}`,active:true,description:`This Scandal is tied to the emergency Contact ${profile.name}. The GM must select its narrative consequences from the published Scandal options.`,rulesRef:'Core Rulebook 2020, Ch.7 p.302–303'}}:null;
  return locked(actor,async()=>{
    let changedResources=false,added=[];
    try{
      if(totalCost||newIP!==originalIP||newMaxIP!==maxIP){await actor.update({'system.resources.stackPoints.value':originalSP-totalCost,'system.resources.influence.value':newIP,'system.resources.influence.max':newMaxIP});changedResources=true;}
      added=await actor.createEmbeddedDocuments('Item',[doc,...(companion?[companion]:[])]);
      if(!added?.length)throw new Error('Contact creation returned no Item.');
    }catch(err){
      if(added?.length){try{await actor.deleteEmbeddedDocuments('Item',added.map(i=>i.id));}catch(rollback){console.error('Altered Carbon | Contact cleanup failed',rollback);}}
      if(changedResources){try{await actor.update({'system.resources.stackPoints.value':originalSP,'system.resources.influence.value':originalIP,'system.resources.influence.max':maxIP});}catch(rollback){console.error('Altered Carbon | Contact resource rollback failed',rollback);}}
      throw err;
    }
    try{
      await msg('Contact developed',`${esc(actor.name)} established ${esc(profile.name)} (${esc(profile.affiliation)}). Resources: Lv.${profile.resources.tier}; Request cap: ${profile.resources.maxRequestLevel}. SP${totalCost} spent (${costs.affiliation} affiliation + ${costs.development} standing development). ${reward==='none'?'No Contact Influence reward.':`${esc(reward)} IP reward (${originalIP} → ${newIP}).`}${profile.requiresScandal?' Desperation Scandal recorded.':''}`,{gmContactCreated:added[0].id});
    }catch(error){console.warn('Altered Carbon | Contact created, but GM notice could not post',error);}
    return added[0];
  });
}

/** GM Request: explicit IP leverage; paid help handled as a confirmed monetary purchase.
 * Every outcome is preserved in GM chat and the Item's exhausted state.
 */
export async function resolveNetworkRequest({actor,sourceId,skillId,level=1,kind='favor',gearId='',paidConfirmed=false,environment=''}={}){
  requireGM();assertActor(actor);
  const source=requireSource(actor,sourceId),skill=actor.items.get(skillId);
  if(!skill||skill.type!=='skill')throw new Error('Choose one of the character’s Skills for this Request.');
  const paid=kind==='work-for-hire';
  const categories=String(source.system.categories||source.name||'').toLowerCase();
  const affiliation=(categories.includes('corporat')||categories.includes('business'))?'corporation':categories.includes('criminal')?'criminal-organization':categories.includes('law')?'law-enforcement':'';
  const requestActivity=kind==='general'?['general-request']:
    level<=2?['request-low','request-official']:level===3?['request-official']:['request-standard'];
  const social=evaluateEffects(actor,{activity:requestActivity,against:affiliation,environment});
  const ipCost=paid?0:Math.max(0,1+Math.trunc(Number(social.values['request.ipCostDelta']||0)));
  const p=requestPrerequisites({actor,source,level,kind,paid,gmPaidConfirmed:paidConfirmed,ipCostOverride:ipCost});
  const item=kind==='resupply'?actor.items.get(gearId):null;
  const plan=kind==='resupply'?resupplyPlan({level:p.level,item}):null;
  if(kind==='general'&&source.type!=='contact')throw new Error('General Request modifiers use a developed Contact with an NPC resource roll.');
  if(kind==='general'&&contactResources(Number(source.system.resourceScore||0)).tier===0)throw new Error('This Contact has no reusable general Request modifiers.');
  // GM sees a private reminder BEFORE an unresolved Trait could affect IP,
  // source eligibility or a Request Level. The published default is retained
  // unless the GM explicitly confirms an alternate ruling.
  const manual=ownedAdjudications(actor,{event:'request'});
  if(manual.length){
    try{await postTraitAdjudication(actor,{event:'request'});}catch(error){console.warn('Altered Carbon | Request Trait prompt failed',error);}
    const reviewed=await foundry.applications.api.DialogV2.confirm({window:{title:'Review Trait-specific Request rules'},content:`<p>${manual.length} owned Trait(s) have GM-assisted Request clauses. A private chat card identifies each rule. Confirm their requirements, IP costs and any exceptions before proceeding with the system's default calculation. The chat card records the ruling; it does not automatically change spending.</p>`});
    if(!reviewed)throw new Error('Request paused for GM Trait adjudication.');
  }
  return locked(actor,async()=>{
    const empathy=Math.floor(Number(actor.system.attributes.empathy||0)/10);
    const ai=actor.type==='ai'||actor.system.identity?.variant==='ai';
    const baseProfile=requestProfile(p.level,empathy,{ai,aiContact:false});
    const extraSteps=p.ipCost>0?Math.max(0,Math.min(1,Number(social.values['request.bonusDieSteps']||0))):0;
    const profile={...baseProfile,die:stepDie(baseProfile.die,extraSteps)};
    const result=await rollSkill(actor,skill,{baseTR:profile.targetResult,bonus:Number(source.system.requestBonus||0)+(kind==='general'?0:Number(social.values['request.modifier']||0)),bonusDice:[profile.die],against:affiliation,activity:requestActivity,environment,adjudicationKind:'request',skipTraitAdjudication:true,chat:true,rollMode:'gmroll',contextLabel:`Request Lv.${p.level}: ${source.name} (${kind})`});
    if(result.blocked)throw new Error(result.reason||'The Request roll was blocked.');
    const die=Number(result.bonusDice?.[0]?.result||0);if(!die)throw new Error('Request must return the dedicated Network Bonus Die.');
    const specialOneUse=source.type==='contact'&&contactResources(Number(source.system.resourceScore||0)).immediateExhaust;
    const exhaust=requestExhaustion({level:p.level,networkDieResult:die,targetResult:result.tr,catastrophe:result.catastrophe,oneUse:specialOneUse,diceSides:profile.die});
    let generalGenerated=0;
    if(kind==='general'&&(!paid||result.success)){const r=source.system.resourceLevel;
      const formula=source.system.resourceScore<=6?'1d4':source.system.resourceScore<=10?'1d6':source.system.resourceScore<=15?'1d8':source.system.resourceScore<=20?'1d10':source.system.resourceScore<=25?'1d12':'2d6';
      generalGenerated=Math.max(0,Number((await new Roll(formula).evaluate()).total||0)+empathy+Number(social.values['request.modifier']||0));
    }
    const startIP=Number(actor.system.resources.influence.value||0),startDP=plan?.before,startPool=Number(source.system.generalModifierPool||0),startExhaust=Boolean(source.system.exhausted);
    const applied=[];
    try{
      if(p.ipCost){await actor.update({'system.resources.influence.value':startIP-p.ipCost});applied.push('ip');}
      if(plan&&(!paid||result.success)&&plan.restore){await item.update({'system.depletion':plan.after,'system.exhausted':false});applied.push('dp');}
      if(generalGenerated){await source.update({'system.generalModifierPool':startPool+generalGenerated});applied.push('pool');}
      if(exhaust.exhausted){await source.update({'system.exhausted':true});applied.push('exhaust');}
    }catch(err){
      try{if(applied.includes('ip'))await actor.update({'system.resources.influence.value':startIP});if(applied.includes('dp'))await item.update({'system.depletion':startDP});if(applied.includes('pool'))await source.update({'system.generalModifierPool':startPool});if(applied.includes('exhaust'))await source.update({'system.exhausted':startExhaust});}catch(rollback){console.error('Altered Carbon | Request transaction rollback failed',rollback);}throw err;
    }
    const fulfilled=Boolean(result.success||p.ipCost);
    const narrative=fulfilled?'Fulfilled / leveraged: GM decides exact support and any obligations.':'Paid Request failed: GM determines contractual consequences.';
    await msg('Network Request resolved',`${esc(actor.name)} → ${esc(source.name)} · Lv.${p.level} ${esc(kind)} · ${esc(skill.name)}: ${result.success?'Pass':'Fail'} (${result.successDegrees||-result.failureDegrees}) · network d${profile.die}: ${die} · ${narrative} IP spent: ${p.ipCost}. ${exhaust.exhausted?'SOURCE EXHAUSTED.':'Source remains available.'}${plan?` Resupply: ${plan.restore} DP on ${esc(item.name)}.`:''}${generalGenerated?` General modifiers added: ${generalGenerated} (no more than +5 to a single Request TR).`:''}`,{gmRequestOutcome:{actorId:actor.id,sourceId:source.id,kind,level:p.level,ipSpent:p.ipCost,fulfilled,exhaustion:exhaust,resupply:plan,generalGenerated}});
    return {result,exhaust,fulfilled,ipSpent:p.ipCost,resupply:plan,generalGenerated};
  });
}

export async function useGeneralModifiers({actor,sourceId,skillId,points=1}={}){
  requireGM();assertActor(actor);const source=requireSource(actor,sourceId);
  if(source.type!=='contact')throw new Error('General Request modifiers belong to a Contact.');
  const count=Number(points);if(!Number.isSafeInteger(count)||count<1||count>5)throw new Error('A single request may apply at most +5 general modifiers.');
  const pool=Number(source.system.generalModifierPool||0);if(count>pool)throw new Error('Not enough generated general modifiers remain.');
  const skill=actor.items.get(skillId);if(skill?.type!=='skill')throw new Error('Select a Skill to use the modifier.');
  return locked(actor,async()=>{const r=await rollSkill(actor,skill,{bonus:count,chat:true,contextLabel:`General Request via ${source.name}`});if(r.blocked)throw new Error(r.reason);
    await source.update({'system.generalModifierPool':pool-count});return r;});
}

export async function restoreNetwork(actor,sourceId,{spendIP=false,reason=''}={}){
  requireGM();assertActor(actor);const source=requireSource(actor,sourceId);
  if(!source.system.exhausted)throw new Error('This source is not exhausted.');
  if(!spendIP&&!String(reason).trim())throw new Error('GM must record a Deferral / narrative restoration reason.');
  const ip=Number(actor.system.resources.influence.value||0);if(spendIP&&ip<1)throw new Error('Need IP1 to restore access.');
  return locked(actor,async()=>{
    if(spendIP)await actor.update({'system.resources.influence.value':ip-1});
    try{await source.update({'system.exhausted':false});await source.setFlag(NS,'restoration',{reason:spendIP?'IP1':reason,at:Date.now(),gmId:game.user.id});}
    catch(err){if(spendIP)await actor.update({'system.resources.influence.value':ip});throw err;}
    await msg('Network access restored',`${esc(actor.name)} may now contact ${esc(source.name)}. Resolution: ${esc(spendIP?'Spent IP1':reason)}.`,{gmRestoredNetwork:source.id});
    return source;
  });
}

export async function contactVirtueFlaw(actor,sourceId,{virtue=false,gmConfirmed=false}={}){
  requireGM();assertActor(actor);const source=requireSource(actor,sourceId);
  if(source.type!=='contact'||!gmConfirmed)throw new Error('GM must confirm the Contact’s Virtue/Flaw was meaningfully demonstrated.');
  return locked(actor,async()=>{
    const current=Number(actor.system.resources.influence.value||0),max=Number(actor.system.resources.influence.max||0);
    const next=virtue?current+1:current>=max?current:Math.min(max,current+1);
    const nextMax=virtue?Math.max(max,current)+1:max;
    if(next===current)throw new Error('No Influence can be restored; choose a narrative consequence instead.');
    await actor.update({'system.resources.influence.value':next,'system.resources.influence.max':nextMax});
    await msg('Contact relationship — Influence',`${esc(actor.name)} ${virtue?'gained':'restored'} IP1 by appealing to ${esc(source.name)}’s ${virtue?'Virtue':'Flaw'} (${esc(virtue?source.system.virtue:source.system.flaws)}).`,{gmContactInfluence:source.id});
    return next;
  });
}

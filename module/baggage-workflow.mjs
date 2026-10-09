/** Published Baggage with deterministic starting choices (2020 Core pp.75-78).
 * A GM must select one outcome explicitly. No historical Baggage is replayed on load.
 */
const NS='altered-carbon-rpg';
export const BAGGAGE_CHOICES=Object.freeze({
 'baggage-10':{name:'Trauma',attribute:'willpower',formula:'2d6'},
 'baggage-11':{name:'Personality Frag',attribute:'acuity',formula:'2d6'},
 'baggage-12':{name:'Compromised DHF',attribute:'intelligence',formula:'2d6'}
});
export function baggageEligibility(actor,baggage){
 const key=String(baggage?.system?.catalogId||''),rule=BAGGAGE_CHOICES[key];
 if(!actor||!rule||baggage?.type!=='baggage')return {supported:false,reason:'No deterministic Baggage choice is authored for this entry.'};
 const skills=(actor.items?.contents||[...(actor.items||[])]).filter(i=>i.type==='skill'&&String(i.system?.attribute||'').toLowerCase()===rule.attribute)
  .map(i=>({id:i.id,name:i.name,level:Number(i.system.level||1),eligible:Number(i.system.level||1)>1}));
 return {supported:true,alreadyResolved:Boolean(baggage.system.resolved),rule,skills,canDowngrade:skills.filter(s=>s.eligible).length>=2};
}
export function planBaggageResolution(actor,baggage,{choice='skills',skillIds=[]}={}){
 const eligibility=baggageEligibility(actor,baggage);
 if(!eligibility.supported)throw new Error(eligibility.reason);
 if(eligibility.alreadyResolved)throw new Error('This Baggage has already been resolved; do not apply the consequence again.');
 if(!['skills','ego'].includes(choice))throw new Error('Choose two downgraded Skills OR the printed Ego loss.');
 if(choice==='ego')return {choice,formula:eligibility.rule.formula,updates:[],rule:eligibility.rule};
 if(!Array.isArray(skillIds)||skillIds.length!==2||new Set(skillIds).size!==2)throw new Error('Choose two different Skills.');
 const skillMap=new Map(eligibility.skills.map(s=>[s.id,s]));
 const selected=skillIds.map(id=>skillMap.get(id));
 if(selected.some(s=>!s?.eligible))throw new Error('Each chosen Skill must belong to the specified Attribute and have a Level of at least 2.');
 return {choice,formula:'0',updates:selected.map(s=>({_id:s.id,'system.level':s.level-1})),rule:eligibility.rule};
}
const inFlight=new WeakSet();
export async function resolveBaggage(actor,baggage,{choice='skills',skillIds=[]}={}){
 if(!game.user?.isGM)throw new Error('Only the GM can confirm a published Baggage consequence.');
 if(!actor?.isOwner&&!game.user?.isGM)throw new Error('Insufficient permission.');
 if(baggage?.parent?.id!==actor?.id)throw new Error('Baggage Item is not owned by this character.');
 if(inFlight.has(baggage))throw new Error('Baggage consequence is already resolving.');
 const plan=planBaggageResolution(actor,baggage,{choice,skillIds});
 inFlight.add(baggage);
 let changed=false,damage=0;
 const originalLevels=plan.updates.map(u=>({_id:u._id,'system.level':actor.items.get(u._id).system.level}));
 const originalEgo=Number(actor.system.resources.ego.value||0);
 try{
  if(choice==='ego'){
   damage=Math.max(0,Number((await new Roll(plan.formula).evaluate()).total||0));
   if(!Number.isSafeInteger(damage))throw new Error('Invalid Baggage Ego roll.');
   await actor.applyEgoDamage(damage);changed=true;
  }else{await actor.updateEmbeddedDocuments('Item',plan.updates);changed=true;}
  await baggage.update({'system.resolved':true,'system.resolutionChoice':choice,'system.resolutionSkillIds':JSON.stringify(skillIds),'system.resolutionEgoLoss':damage});
 }catch(e){
  if(changed){try{if(choice==='ego')await actor.update({'system.resources.ego.value':originalEgo});else await actor.updateEmbeddedDocuments('Item',originalLevels);}catch(recovery){console.error('Altered Carbon | Baggage rollback failed',recovery);}}
  throw e;
 }finally{inFlight.delete(baggage);}
 // Chat is a best-effort audit; cannot roll back a successful actor update if unavailable.
 try{const gmIds=game.users.filter(u=>u.isGM).map(u=>u.id);await ChatMessage.implementation.create({speaker:{alias:'Baggage / Core Rules'},whisper:gmIds,content:`<p><strong>${foundry.utils.escapeHTML(actor.name)} — ${foundry.utils.escapeHTML(baggage.name)}</strong>: ${choice==='ego'?`EP ${damage} lost (${plan.formula}).`:`Two ${plan.rule.attribute} Skills reduced one level.`} Confirmed once by GM.</p>`,flags:{[NS]:{baggageResolution:{actorId:actor.id,itemId:baggage.id,choice,skillIds,egoLoss:damage}}}});}catch(error){console.warn('Altered Carbon | Baggage audit chat failed',error);}
 return {choice,damage,plan,resolved:true};
}

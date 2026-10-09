/** Altered Carbon 2020 Core: clinical, drug, Ego and Virtual deterministic helpers.
 * Pure functions, deliberately separate from Foundry Documents and user decisions.
 * Core pp. 138-147, 248-253, 310-315. Any narrative choice remains GM-led.
 */
const clean=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const positive=n=>Math.max(0,Math.trunc(Number(n)||0));
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
export const DRUG_IDS=Object.freeze({merge:'DRG001',reaper:'DRG002',lethinol:'DRG003',bios:'DRG004',soma:'DRG005',stallion:'DRG006',tetrameth:'DRG007'});
export const ADMINISTRATION=Object.freeze({
  aerosol:{label:'Aerosol / eye / mouth spray',skill:null,tr:null,speedDice:2,offensiveSkill:'Throw',offensiveDifficulty:2,notes:'Resolve two Speed Dice to use; offensively Throw -2 unless adapted to a dispersal grenade.'},
  ampule:{label:'Ampule',skill:'Medicine',tr:8,notes:'Medicine check against TR 8.'},
  dermal:{label:'Dermal patch',skill:null,tr:null,covertSkill:'Stealth',covertDifficulty:2,covertRequiresGrapple:true,notes:'Covert placement: Stealth -2, Grapple range only.'},
  intravenous:{label:'Intravenous',skill:'Medicine',tr:5,notes:'Medicine check against TR 5.'},
  pill:{label:'Pill',skill:null,tr:null,covertSkill:'Stealth',covertDifficulty:1,notes:'Grinding into food or drink clandestinely: Stealth -1.'}
});
export const DRUG_PHASES=Object.freeze(['inactive','influence','pending-clearance','hangover']);
const METHOD_ALIASES={'eye-spray':'aerosol','mouth-spray':'aerosol','spray':'aerosol','inhaled':'aerosol','subdermal':'ampule','ampoule':'ampule','iv':'intravenous','injection':'intravenous','oral':'pill','patch':'dermal'};
export function normalizeAdministration(method){const id=clean(method);if(ADMINISTRATION[id])return id;if(METHOD_ALIASES[id])return METHOD_ALIASES[id];const matched=Object.keys(METHOD_ALIASES).find(s=>id.includes(s));return matched?METHOD_ALIASES[matched]:null;}
export function administrationPlan(method,{offensive=false,covert=false,inGrapple=false}={}){
 const id=normalizeAdministration(method);if(!id)throw new Error('Select a published administration method; free-text item descriptions are not sufficient.');
 const m=ADMINISTRATION[id];if(offensive&&!m.offensiveSkill)throw new Error('Offensive delivery for this formulation requires a GM-confirmed action, not the basic administration check.');
 if(covert&&!m.covertSkill)throw new Error('This covert use has no automatic published Stealth procedure; ask the GM.');
 if(covert&&m.covertRequiresGrapple&&!inGrapple)throw new Error('Covert dermal placement requires Grapple range.');
 return {id,...m,check:offensive?{skill:m.offensiveSkill,difficulty:m.offensiveDifficulty,tr:null}:covert?{skill:m.covertSkill,difficulty:m.covertDifficulty,tr:null}:m.skill?{skill:m.skill,tr:m.tr,difficulty:0}:null};
}
export function installedUpgradeNames(item){
 const raw=item?.system?.installedUpgrades??item?.installedUpgrades??'[]';let data=[];
 try{data=typeof raw==='string'?JSON.parse(raw):raw;}catch{/* Older world data may contain a plain text list. */}
 if(!Array.isArray(data))data=[];
 return new Set(data.map(v=>clean(typeof v==='string'?v:(v?.name||v?.key||v?.id))).filter(Boolean));
}
function hasUpgrade(item,name){const wanted=clean(name);return [...installedUpgradeNames(item)].some(n=>n===wanted||n.includes(wanted));}
export function drugCatalogId(item){return String(item?.system?.catalogId||item?.catalogId||'').toUpperCase();}
export function activeDrugs(items=[]){return [...items].filter(i=>i.type==='drug'&&Boolean(i.system?.active));}
export function drugRollModifiers(items=[],{attribute='',skill='',suggestion=false,sensorStealth=false}={}){
 let difficulty=0,gearBonus=0,levelDelta=0;const notes=[];const attributeId=clean(attribute),skillId=clean(skill);
 for(const item of activeDrugs(items)){
  const id=drugCatalogId(item),gh=hasUpgrade(item,'ghedon');
  if(id===DRUG_IDS.merge){
   if(attributeId==='empathy'){gearBonus+=hasUpgrade(item,'satyron')?(hasUpgrade(item,'merge-9')?3:2):1; if(hasUpgrade(item,'merge-9'))levelDelta+=1;notes.push(`${item.name}: Empathy bonus${hasUpgrade(item,'merge-9')?', +1 Skill Level':''}`);}
   if(suggestion&&skillId==='discipline'){difficulty+=hasUpgrade(item,'merge-9')?4:2;notes.push('Merge: Suggestible');}
  }
  if(id===DRUG_IDS.reaper){if(['strength','perception'].includes(attributeId)){difficulty+=2;notes.push('Reaper: slow metabolism -2');}if(sensorStealth&&skillId==='stealth'){gearBonus+=3;notes.push('Reaper: +3 Stealth vs heat/metabolism sensors');}}
  if(id===DRUG_IDS.lethinol&&attributeId==='acuity'){difficulty+=2;notes.push('Lethinol: lethargy -2');}
  if(id===DRUG_IDS.stallion){if(gh){if(attributeId==='strength')gearBonus+=2;if(['empathy','willpower'].includes(attributeId))difficulty+=1;notes.push('Stallion Ghedon formulation');}else if(['empathy','willpower'].includes(attributeId)){difficulty+=3;notes.push('Stallion: unfeeling -3');}}
  if(id===DRUG_IDS.tetrameth){if(attributeId==='perception'){gearBonus+=2;notes.push('Tetrameth: heightened awareness +2');}if(['acuity','intelligence'].includes(attributeId)){difficulty+=1;notes.push('Tetrameth: tunnel vision -1');}}
 }
 for(const item of items){if(item.type==='drug'&&!item.system?.active&&positive(item.system?.hangoverHours)>0&&drugCatalogId(item)===DRUG_IDS.merge&&['endurance','discipline'].includes(skillId)){difficulty+=1;notes.push('Merge: 10-hour hangover -1');}}
 if(items.some(i=>i.type==='drug'&&i.system?.addicted&&i.system?.craving&&!i.system?.active)){difficulty+=1;notes.push('Unfulfilled addiction: -1 all Skill Checks');}
 return{difficulty,gearBonus,levelDelta,notes};
}
export function addictionUseOutcome({hasAddictionRule=false,failureDegrees=0,wasAddicted=false}={}){return {addicted:Boolean(wasAddicted||(hasAddictionRule&&positive(failureDegrees)>=3)),triggered:Boolean(hasAddictionRule&&positive(failureDegrees)>=3&&!wasAddicted)};}
export function metabolizationPlan(item,{success=false}={}){
 if(!item||!item.system?.active)throw new Error('Drug is not Under the Influence.');
 const successes=positive(item.system.metabolismSuccesses)+(success?1:0),oldPhase=item.system.drugPhase||'influence';
 return {successes,phase:success?'pending-clearance':oldPhase,wearsOffAtEncounterEnd:Boolean(success||item.system.drugPhase==='pending-clearance'),enduranceBonus:successes,checksMade:positive(item.system.metabolismChecks)+1};
}
export function metabolismDifficulty(item){let penalty=0;if(hasUpgrade(item,'ghedon'))penalty+=drugCatalogId(item)===DRUG_IDS.stallion?4:2;if(drugCatalogId(item)===DRUG_IDS.reaper&&hasUpgrade(item,'lingering-toxin'))penalty+=1; if(drugCatalogId(item)===DRUG_IDS.stallion){penalty+=2*[...installedUpgradeNames(item)].filter(x=>x.includes('potency')).length;}return penalty;}
export function clearingDrug(item,{force=false}={}){
 if(!item?.system?.active)return {cleared:false,reason:'Not active.'};
 if(!force&&item.system.drugPhase!=='pending-clearance')return {cleared:false,reason:'No successful Endurance metabolization check recorded this Encounter.'};
 const hangover=drugCatalogId(item)===DRUG_IDS.merge?10:0;
 return{cleared:true,active:false,phase:hangover?'hangover':'inactive',hangoverHours:hangover,metabolismSuccesses:0,metabolismChecks:0};
}
export function reaperActionFormula(items=[],action='attack'){
 if(!['attack','move'].includes(clean(action)))return null;
 const item=activeDrugs(items).find(i=>drugCatalogId(i)===DRUG_IDS.reaper);
 return item?(hasUpgrade(item,'potent')?'2d4':'1d4'):null;
}
export function egoDiceReduction(items=[],{resleeving=false}={}){
 const ids=new Set(activeDrugs(items).map(drugCatalogId));return (ids.has(DRUG_IDS.soma)?1:0)+(resleeving&&ids.has(DRUG_IDS.lethinol)?1:0);
}
export function reduceEgoDice(formula,remove=1){
 let remaining=positive(remove);return String(formula).replace(/(\d*)d(\d+)/gi,(match,count,sides)=>{
  if(remaining===0)return match;const original=Number(count||1);const reduce=Math.min(remaining,Math.max(0,original-1));remaining-=reduce;return `${original-reduce}d${sides}`;
 });
}
export const EGO_EVENTS=Object.freeze({
 organic:{human:'1d6',ai:null,permanent:false,description:'Add one EP for every HP lost when the sleeve dies.'},
 accident:{human:'1d6',ai:'1d4',permanent:true},assassination:{human:'2d6',ai:'1d6',permanent:true},
 combat:{human:'3d6',ai:'2d6',permanent:false},trauma:{human:'4d6',ai:'3d6',permanent:true},
 torture:{human:'1d6',ai:null,permanent:false,description:'Per successful Intimidation degree; GM selects dice count.'},
 simulspace:{human:'1d6',ai:null,permanent:false,description:'Per successful Data Engineering degree, except viruses can harm AI.'}
});
export function egoEventProfile(event,{isAI=false,items=[],resleeving=false,birthSleeve=false,cloneDestination=false}={}){
 const d=EGO_EVENTS[clean(event)];if(!d)throw new Error('Select an official Ego-loss event.');
 const base=isAI?d.ai:d.human;if(!base)return {event,formula:'0',permanent:false,notes:'No routine Ego loss; special AI or viral effects require GM confirmation.'};
 let formula=base;
 if(birthSleeve&&!cloneDestination&&!isAI)formula=formula.replace(/(\d*)d(\d+)/i,(_,n,s)=>`${Number(n||1)*2}d${s}`);
 formula=reduceEgoDice(formula,egoDiceReduction(items,{resleeving}));
 return {event,formula,permanent:d.permanent,notes:d.description||''};
}
export function egoDamageAfterReduction(raw,{willpowerBonus=0,disciplineDegrees=0,healthLost=0,minimum=1}={}){
 return Math.max(raw>0?minimum:0,positive(raw)+positive(healthLost)-positive(willpowerBonus)-positive(disciplineDegrees));
}
export function egoAvailableMaximum({maximum=0,permanentLoss=0}={}){return Math.max(0,positive(maximum)-positive(permanentLoss));}
export function egoResourceChange({current=0,maximum=0,permanentLoss=0,damage=0,heal=0,newPermanent=0}={}){
 const added=Math.min(positive(newPermanent),Math.max(0,positive(maximum)-positive(permanentLoss)));
 const permanent=positive(permanentLoss)+added,limit=egoAvailableMaximum({maximum,permanentLoss:permanent});
 const value=clamp(positive(current)-positive(damage)+positive(heal),0,limit);
 return {value,permanentLoss:permanent,effectiveMaximum:limit,egoState:value<=0?'splintered':limit>0&&value/limit<.5?'damaged':'stable'};
}
export function protocolDie(tiers=0){return `1d${[4,6,8,10,12][clamp(positive(tiers),0,4)]}`;}
export function virtualResolutionBonus(resolution='low'){const r=clean(resolution);if(!['low','medium','high'].includes(r))throw new Error('Virtual resolution must be low, medium or high.');return {low:0,medium:1,high:2}[r];}
export function psychosurgeryPlan({positiveDegrees=0,negativeDegrees=0,protocolTiers=0,reconstruct=false}={}){
 const plus=positive(positiveDegrees),minus=positive(negativeDegrees),die=protocolDie(protocolTiers);
 if(reconstruct&&plus<5)throw new Error('Ego Reconstruction requires at least five positive degrees.');
 return {restoreFormula:reconstruct?'2d4':plus?`${plus}${die.slice(1)}`:'0',negativeFeedbackFormula:minus?'1d6':'0',traumaFormula:minus>=3?`3d6${minus>3?`+${minus-3}d6`:''}`:'0',reconstruction:reconstruct,notes:reconstruct?'A free Specialisation may be chosen if the target fell to EP5 or less; requires player choice.':''};
}
export function interrogationPlan({positiveDegrees=0,negativeDegrees=0,protocolTiers=0,sharya=false,virusClass=null}={}){
 const plus=positive(positiveDegrees),minus=positive(negativeDegrees),die=protocolDie(protocolTiers);
 return {egoDamageFormula:plus?`${plus}${die.slice(1)}`:'0',permanent:sharya,personalityFrag:plus>=(sharya?3:5),interrogatorEgoLoss:minus,terminated:minus>=3,viral:virusClass?virusProfile(virusClass,plus):null};
}
export const VIRUS_CLASSES=Object.freeze({c:{dice:1,cap:3,saveDifficulty:0,delivery:'Requires infected server/Trojan or target carelessness'},b:{dice:2,cap:6,saveDifficulty:1,delivery:'Exploitable vulnerability or Virtual'},a:{dice:3,cap:10,saveDifficulty:2,delivery:'May target without vulnerability'},milspec:{dice:4,cap:Infinity,saveDifficulty:3,delivery:'Can hijack benign channels; highly restricted'}});
export function virusProfile(cls,plus=1){const x=VIRUS_CLASSES[clean(cls)];if(!x)throw new Error('Unknown official Virus/Firewall Class.');if(positive(plus)<1)throw new Error('A Viral Strike must resolve at least one positive degree.');return{...x,formula:`${Math.min(x.cap,x.dice*positive(plus))}d6`,classId:clean(cls)};}
export const VIRTUAL_BANDS=Object.freeze({
 days:{label:'A few days',therapeutic:'0',instruction:'0',incarceration:'0',difficulty:0},
 month:{label:'About a month',therapeutic:'0',instruction:'1',incarceration:'1d4',difficulty:0},
 'months-year':{label:'Months to a year',therapeutic:'0',instruction:'1d4',incarceration:'1d6',difficulty:1},
 'five-years':{label:'Up to five years',therapeutic:'1d6',instruction:'2d6',incarceration:'3d6',difficulty:2},
 'ten-plus-years':{label:'Ten or more years',therapeutic:'2d6',instruction:'3d6',incarceration:'special',difficulty:3}
});
export function virtualExposureProfile({band='days',purpose='therapeutic',isAI=false,years=10}={}){
 const b=VIRTUAL_BANDS[clean(band)],p=clean(purpose);if(!b||!['therapeutic','instruction','incarceration'].includes(p))throw new Error('Invalid Virtual exposure band or purpose.');
 if(isAI&&p!=='instruction')return {band,purpose:p,formula:'0',difficulty:0,willpowerReductions:0,description:'AI passive Virtual occupancy does not inflict Ego loss.'};
 let formula=b[p],wb=1;
 if(formula==='special'){
  const decades=Math.max(1,Math.floor(Math.max(10,Number(years)||10)/10));
  const first=Math.min(10,decades),later=Math.max(0,decades-10);
  formula=`${first*2+later}d6`;wb=decades;
 }
 return {band:clean(band),purpose:p,formula,difficulty:b.difficulty,willpowerReductions:wb,description:formula==='0'?'No routine exposure Ego loss.':'Discipline reduces damage by one per success degree; Willpower reduction applies to each full ten-year segment during very long incarceration.'};
}
export function virtualAllowed({religiousCoding=false,isAI=false}={}){return isAI||!religiousCoding;}
export function medicalRestPlan({rest='short',treatment='none',upgrades=[],catastrophe=false,desired='wounds',delayedDaysUsed=0}={}){
 const kind=clean(rest),choice=clean(desired),up=new Set(upgrades.map(clean));
 if(!['short','long'].includes(kind))throw new Error('Medical rest must be short or long.');
 if(!['wounds','health'].includes(choice))throw new Error('Choose Wounds or Health recovery.');
 const usingBios=clean(treatment)==='rapid-regrowth';
 if(!usingBios)return {kind,choice,formula:'0',catastropheInjury:false,usesDose:false,notes:'Standard rest recovery is handled by the Actor.'};
 const delayed=up.has('delayed-growth'),painkiller=up.has('painkiller');
 if(delayed&&choice==='health')throw new Error('Delayed Growth explicitly cannot restore Health Points.');
 if(delayed&&kind!=='long')throw new Error('Delayed Growth requires Long Rest.');
 if(delayed&&positive(delayedDaysUsed)>=3)throw new Error('Delayed Growth permits up to three days of treatment.');
 const formula=choice==='health'?(kind==='short'?'1':'1d4'):(delayed?'1d6':kind==='short'?'1d6':'3d6');
 return {kind,choice,formula,maximizeHealth:Boolean(painkiller&&kind==='long'&&choice==='health'),applyNextDayDifficulty:Boolean(painkiller&&kind==='long'),delayedDaysIncrement:delayed?1:0,catastropheInjury:Boolean(catastrophe&&!delayed),usesDose:true,notes:painkiller?'Painkiller requires next-day Skill Check -2 and further GM validation of the published HP maximum clause.':'Medical Gear grants Medicine +2 during treatment; choose the effect before rolling.'};
}

/** Core p.240: Bio Welder Tissue/Bone Weld triggered effects; one + per activation. */
export function bioWelderPlan({degrees=0,rest='short',injury='flesh',recover='wounds',upgrades=[]}={}){
 const plus=positive(degrees),r=clean(rest),i=clean(injury),mode=clean(recover),up=new Set(upgrades.map(clean));
 if(!['short','long'].includes(r)||!['flesh','bone'].includes(i)||!['wounds','health'].includes(mode))throw new Error('Choose a Bio Welder source-defined rest, injury and effect.');
 if(plus<1)throw new Error('At least one + is required to activate a Bio Welder Triggered Effect.');
 if(i==='bone'&&!up.has('bone-welder'))throw new Error('Bone Weld requires the installed Bone Welder upgrade.');
 const bonus=up.has('advanced-organic-fusion')?plus:0;
 return {plus,rest:r,injury:i,recover:mode,formula:mode==='wounds'?`${plus}d6`:r==='short'?String(plus):`${plus}d6`,woundBonus:mode==='wounds'?bonus:0,notes:'Tissue/Bone Weld (+) per resolved Degree; recovery cannot exceed the Actor’s existing loss.'};
}

/** Core pp. 312-314: virtual instruction, separate from exposure Ego damage. */
export const VIRTUAL_INSTRUCTION=Object.freeze({
 days:{modes:['session-bonus'],formula:'1',note:'One SP-equivalent for relevant bonus dice during this session only; subject is GM selected.'},
 month:{modes:['attribute-bonus','sp'],formula:'1d4',note:'Relevant Attribute bonus-die pool, or one normal SP.'},
 'months-year':{modes:['sp','half-skill'],formula:'1d6',note:'Either 1d6 + Acuity Bonus normal SP, or half-price one Skill upgrade, rounded at GM discretion.'},
 'five-years':{modes:['sp','skill'],formula:'2d6',cap:3,note:'Either 2d6 + Acuity Bonus normal SP, or one Skill level gain to at most Skill Level 3.'},
 'ten-plus-years':{modes:['sp','skill','two-skills'],formula:'3d6',cap:4,note:'Choose two distinct rewards: 3d6 + Acuity Bonus SP; one Skill to level 4; two same-Attribute Skills to level 3.'}
});
export function virtualInstructionPlan({band='days',mode='sp',acuityBonus=0}={}){
 const id=clean(band),type=clean(mode),record=VIRTUAL_INSTRUCTION[id];
 if(!record||!record.modes.includes(type))throw new Error('Choose a Core-legal Virtual instruction outcome for this duration.');
 const formula=type==='sp'?(id==='month'?'1':`${record.formula}+${positive(acuityBonus)}`):type==='attribute-bonus'?record.formula:type==='session-bonus'?'1':'0';
 return {band:id,mode:type,formula,cap:type==='two-skills'?3:record.cap||0,choicesRequired:id==='ten-plus-years'?2:1,notes:record.note};
}

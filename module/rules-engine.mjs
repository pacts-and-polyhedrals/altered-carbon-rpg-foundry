export const SKILL_DIE_BY_LEVEL = Object.freeze({1:12, 2:10, 3:8, 4:6, 5:4});
export const AUTO_PASS_TR = Object.freeze({1:20, 2:15, 3:12, 4:10, 5:8});
export const SKILL_ADVANCEMENT_COST = Object.freeze({1:20, 2:50, 3:80, 4:125});
export const WEALTH_DEPLETION_DIE = Object.freeze({1:12, 2:10, 3:8, 4:6, 5:4});
export const DEFERRAL_DURATIONS = Object.freeze({0:'none',1:'day',2:'week',3:'year',4:'decade',5:'decade'});
export const TRAIT_COSTS = Object.freeze({
  common:{unlock:1,1:5,2:10,3:15,4:20,5:25},
  uncommon:{unlock:5,1:10,2:20,3:25,4:30,5:35},
  anomaly:{unlock:10,1:15,2:30,3:35,4:45,5:55}
});
export const REQUEST_LEVELS = Object.freeze({
  1:{base:10,die:4,exhaust:2,resupply:{physical:3,powered:5,rare:1}},
  2:{base:8,die:6,exhaust:3,resupply:{physical:5,powered:7,rare:2}},
  3:{base:6,die:8,exhaust:4,resupply:{physical:7,powered:10,rare:3}},
  4:{base:4,die:10,exhaust:5,resupply:{physical:10,powered:15,rare:4}},
  5:{base:2,die:12,exhaust:5,resupply:{physical:Infinity,powered:Infinity,rare:5}}
});
export const VIRUS_CLASSES = Object.freeze({
  c:{damage:'1d6',perSuccessDice:1,maxDice:3,saveDifficulty:0},
  b:{damage:'2d6',perSuccessDice:2,maxDice:6,saveDifficulty:1},
  a:{damage:'3d6',perSuccessDice:3,maxDice:10,saveDifficulty:2},
  milspec:{damage:'4d6',perSuccessDice:4,maxDice:Infinity,saveDifficulty:3}
});
export const FIRING_MODES = Object.freeze({
  'semi-automatic':{extraDegrees:0,damageBonus:0,depletion:'1',saturation:true,suppression:true},
  '3-round-burst':{extraDegrees:1,damageBonus:1,depletion:'1d3',saturation:true,suppression:true},
  'fully-automatic':{extraDegrees:2,damageBonus:3,depletion:'1d6',saturation:true,suppression:true}
});
export const SLEEVE_LIMITS = Object.freeze({
  birth:{strength:[30,50],perception:[30,50],techCapacity:0,healthFormula:'2d8+SB'},
  natal:{strength:[30,50],perception:[30,50],techCapacity:0,healthFormula:'2d8+SB'},
  clone:{strength:[30,50],perception:[30,50],techCapacity:0,healthFormula:'2d8+SB'},
  'synthetic-low':{strength:[30,40],perception:[20,40],techCapacity:3,healthFormula:'2d6+SB'},
  'synthetic-mid':{strength:[35,55],perception:[30,45],techCapacity:4,healthFormula:'2d8+SB'},
  'synthetic-high':{strength:[35,60],perception:[35,60],techCapacity:5,healthFormula:'2d10+SB'},
  organic:{strength:[30,50],perception:[30,50],techCapacity:0,healthFormula:'2d8+SB'},
  other:{strength:[0,99],perception:[0,99],techCapacity:0,healthFormula:'2d8+SB'}
});

export function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
export function attributeBonus(score) { return Math.floor(Math.max(0, Number(score)||0) / 10); }
export function skillDie(level) { return SKILL_DIE_BY_LEVEL[clamp(Math.trunc(Number(level)||1),1,5)]; }
export function autoPassThreshold(level) { return AUTO_PASS_TR[clamp(Math.trunc(Number(level)||1),1,5)]; }
export function autoPassAllowed(level,tr,{opposed=false}={}){return !opposed && Number(tr)>=autoPassThreshold(level);}

function maxBonus(...values){return Math.max(0,...values.flat().map(Number).filter(Number.isFinite));}
/** Core TR: base Attribute Bonus or scenario TR, minus Difficulty, plus at most one Gear Bonus and one Training Value. */
export function targetResult({attribute=0, baseTR=null, difficulty=0, bonus=0, training=0, gearBonus=0, trainingBonuses=[], gearBonuses=[], stackableBonuses=[]}={}) {
  const base = baseTR == null ? attributeBonus(attribute) : Number(baseTR);
  const tv=maxBonus(training,trainingBonuses);
  const gb=maxBonus(gearBonus,gearBonuses);
  const extra=Number(bonus||0)+stackableBonuses.map(Number).filter(Number.isFinite).reduce((a,b)=>a+b,0);
  return Number(base||0) - Number(difficulty||0) + tv + gb + extra;
}
export function degrees(result, tr, {ace=false}={}) {
  result=Number(result); tr=Number(tr);
  if (ace) return {success:true, successDegrees:clamp(Math.max(1,tr-result),1,5), failureDegrees:0};
  if (result < tr) return {success:true, successDegrees:clamp(tr-result,1,5), failureDegrees:0};
  if (result === tr) return {success:true, successDegrees:1, failureDegrees:0};
  return {success:false, successDegrees:0, failureDegrees:clamp(result-tr,1,5)};
}
export function degreeDifference(opponentFailureDegrees=0){return clamp(Number(opponentFailureDegrees)||0,0,5);}
export function cancelDegrees(own=0,opponent=0){const n=Math.min(Math.max(0,own),Math.max(0,opponent));return {own:Math.max(0,own-n),opponent:Math.max(0,opponent-n),cancelled:n};}

/** Luck handling. Bonus dice never generate Aces or Catastrophes. */
export function applyLuck({skillResult, bonusResults=[], luckResult=null, luckSides=null, mode='none', luckMode=null}={}) {
  const originalSkill = Number(skillResult);
  let skill = originalSkill;
  let bonus = [...bonusResults].map(Number);
  let spCost=0;
  mode=luckMode??mode;
  if (luckResult != null) {
    const luck=Number(luckResult);
    if (mode==='beginners') bonus.push(luck);
    else if (mode==='pressing') skill += luck;
    else if (mode==='making') bonus = bonus.map(v=>v+luck);
    else if (mode==='tough') { skill += luck; bonus = bonus.map(v=>v+luck); }
    else if (mode==='dumb' && luck!==1 && luck!==Number(luckSides)) { spCost=Math.abs(originalSkill-luck); skill=luck; bonus=[]; }
  }
  const best = Math.min(skill, ...(bonus.length?bonus:[Infinity]));
  const ace = originalSkill===1;
  const stroke = Number(luckResult)===1 && ace;
  return {skillResult:skill, bonusResults:bonus, bestResult:best, ace, stroke, spCost,mode};
}
export function catastrophe({success, originalSkillResult, skillSides, luckResult, luckSides}={}) {
  return !success && luckResult!=null && Number(originalSkillResult)===Number(skillSides) && Number(luckResult)===Number(luckSides);
}
export function resolveCheck(input={}) {
  const tr=targetResult(input);
  const luck=applyLuck(input);
  const dg=degrees(luck.bestResult,tr,{ace:luck.ace});
  const naturalSkill=degrees(Number(input.skillResult),tr,{ace:Number(input.skillResult)===1});
  const isCatastrophe=catastrophe({success:naturalSkill.success, originalSkillResult:input.skillResult, skillSides:input.skillSides, luckResult:input.luckResult, luckSides:input.luckSides});
  return {...dg, targetResult:tr, ...luck, catastrophe:isCatastrophe};
}
export function compareOpposed(a,b,{attributeA=0,attributeB=0}={}) {
  if (a.success!==b.success) return a.success ? 1 : -1;
  if (a.success) { if (a.successDegrees!==b.successDegrees) return Math.sign(a.successDegrees-b.successDegrees); }
  else if (a.failureDegrees!==b.failureDegrees) return Math.sign(b.failureDegrees-a.failureDegrees);
  return Math.sign(Number(attributeA)-Number(attributeB));
}

export function speedDiceFromPerception(perception, modifiers=0,{max=5}={}) { return clamp(attributeBonus(perception)+Number(modifiers||0),1,max); }
export function activeSpeedTotal(results, activeIndexes=[]) { return activeIndexes.reduce((n,i)=>n+Number(results[i]||0),0); }
export function nextActiveCombatant(entries=[]) {
  const legal=entries.filter(e=>Array.isArray(e.activeIndexes)&&e.activeIndexes.length>0);
  return legal.sort((a,b)=>activeSpeedTotal(a.speedResults,a.activeIndexes)-activeSpeedTotal(b.speedResults,b.activeIndexes) || String(a.id).localeCompare(String(b.id)))[0]||null;
}
export function actionDifficulty(actionNumber=1) { return Math.max(0, Number(actionNumber||1)-1); }

export function depletionTR(capacity, depletionPoints=0) { return Number(capacity||0)-Number(depletionPoints||0); }
export function isExhausted(capacity, depletionPoints=0) { return Number(capacity||0)>0 && Number(depletionPoints||0)>=Number(capacity||0); }
export function depletionCheckOutcome({capacity=0,currentDepletion=0,addedDepletion=1,rollResult=null,counterOnly=false}={}) {
  capacity=Math.max(0,Number(capacity)||0); currentDepletion=Math.max(0,Number(currentDepletion)||0); addedDepletion=Math.max(0,Number(addedDepletion)||0);
  const depletion=currentDepletion+addedDepletion;
  if(capacity<=0)return {depletion,capacity,tr:0,automatic:false,checkRequired:false,passed:true,exhausted:false};
  const tr=depletionTR(capacity,depletion),automatic=depletion>=capacity;
  if(automatic)return {depletion,capacity,tr,automatic:true,checkRequired:false,passed:false,exhausted:true};
  if(counterOnly)return {depletion,capacity,tr,automatic:false,checkRequired:false,passed:true,exhausted:false};
  if(rollResult==null)return {depletion,capacity,tr,automatic:false,checkRequired:true,passed:null,exhausted:false};
  const passed=Number(rollResult)<=tr;
  return {depletion,capacity,tr,automatic:false,checkRequired:true,rollResult:Number(rollResult),passed,exhausted:!passed};
}
export function resourceDepletionDie(wealthLevel=1){return WEALTH_DEPLETION_DIE[clamp(Number(wealthLevel)||1,1,5)];}
export function resourceCatalogTR(capacity=0,depletionPoints=0){return Number(capacity||0)-Number(depletionPoints||0);}
export function resourceCatalogBonusDice(wealthLevel=1,priceLevel=1){return Math.max(0,Number(wealthLevel)-Number(priceLevel));}
export function resourceCatalogCapacity({wealthLevel=1,rare=false,rollTotal=null}={}){return rollTotal==null?`${rare?'2d4':'2d6'}+${Number(wealthLevel||1)}`:Number(rollTotal)+Number(wealthLevel||1);}
export function applyProtection(wounds, protection=0) { return wounds<=0 ? 0 : Math.max(1, Number(wounds)-Number(protection||0)); }

const AGE_BANDS = [
  [30,15,50,0,-3,0,0],[40,20,45,0,-2,1,1],[50,25,40,0,-1,2,1],[65,30,35,1,0,3,1],[80,35,30,2,0,4,1],[100,40,25,2,0,5,1],[125,45,20,2,0,6,2],[150,50,20,3,0,7,2],[175,55,20,3,0,8,3],[200,60,20,3,0,9,3],[Infinity,65,15,4,0,10,4]
];
export function ageResources(age,{acuity=30,willpower=30,empathy=30}={}) {
  const band=AGE_BANDS.find(b=>Number(age)<=b[0]);
  const [maxAge,spBase,epBase,ipBase,empathyOffset,baggageDice,lifeEventRolls]=band;
  return {stackPoints:spBase+attributeBonus(acuity), egoPoints:epBase+attributeBonus(willpower), influencePoints:Math.max(0,ipBase+attributeBonus(empathy)+empathyOffset), baggageDice, lifeEventRolls, maxAge};
}
export function spEgoRecovery(spentSP, willpowerBonus=0, roll=1) { return Math.floor(Number(spentSP)/5) * (Number(roll)+Number(willpowerBonus)); }
export function spInfluenceRecovery(spentSP) { return Math.floor(Number(spentSP)/15); }
export function attributeIncreaseFormula(sp=1){return `${Math.max(0,Math.trunc(Number(sp)||0))}d4`;}
export function skillUpgradeCost(fromLevel,toLevel=Number(fromLevel)+1){fromLevel=Number(fromLevel);return Number(toLevel)===fromLevel+1?SKILL_ADVANCEMENT_COST[fromLevel]??null:null;}
export function specializationCost(existingCount=0){return Math.min(30,15+(Math.max(0,Number(existingCount)||0)*5));}
export function traitCost(commonality='uncommon',tier=1,{unlock=false}={}){const table=TRAIT_COSTS[commonality]||TRAIT_COSTS.uncommon;return unlock?table.unlock:table[clamp(Number(tier)||1,1,5)];}
export function canPurchaseTrait({commonality='uncommon',tier=1,branch='',owned=[]}={}){
  tier=Number(tier)||1;if(tier<=1)return true;
  const lower=owned.filter(t=>Number(t.tier)<tier);
  if(tier===5 && owned.filter(t=>t.branch===branch).length<3)return false;
  if(commonality==='common')return Array.from({length:tier-1},(_,i)=>i+1).every(req=>lower.some(t=>Number(t.tier)===req));
  return Array.from({length:tier-1},(_,i)=>i+1).every(req=>lower.some(t=>t.branch===branch&&Number(t.tier)===req));
}
export function baggageRerollCost(previousRerolls=0){return 5*(Math.max(0,Number(previousRerolls)||0)+1);}
export function baggageEntryForTotal(catalog,total){const entries=Array.isArray(catalog)?catalog:(Array.isArray(catalog?.entries)?catalog.entries:[]);return entries.find(e=>Number(total)>=Number(e.min)&&Number(total)<=Number(e.max??Infinity))||null;}

export function purchaseDeferral(priceLevel=0, wealthLevel=0) {
  const gap=Math.max(0,Number(priceLevel||0)-Number(wealthLevel||0));
  const level=Math.min(5,gap); return {required:gap>0,level,duration:DEFERRAL_DURATIONS[level]};
}
export function effectiveWealthDuringDeferral(wealthLevel=0,{deferral=0,inDebt=false}={}) { return Math.max(1,Number(wealthLevel||0)-((Number(deferral)>0||inDebt)?1:0)); }
export function canCreditPurchase(creditLevel=0, priceLevel=0) { return Number(creditLevel||0)>=Number(priceLevel||0); }
export function creditChange(creditLevel=0, spendLevel=0) {
  creditLevel=Math.max(0,Number(creditLevel||0)); spendLevel=Math.max(0,Number(spendLevel||0)); if(spendLevel>creditLevel)return null;
  const remaining=creditLevel-spendLevel; const parts=[]; if(remaining)parts.push(remaining); return {spent:spendLevel,remaining,parts};
}
export function applyEgoDamage(currentEgo=0, amount=0) { return Math.max(0,Number(currentEgo||0)-Math.max(0,Number(amount||0))); }

export function damageThresholdFromStrength(strength=0){return Math.max(0,Number(strength)||0);}
export function sleeveHealthFormula(type='birth',strength=30){return (SLEEVE_LIMITS[type]||SLEEVE_LIMITS.other).healthFormula.replace('SB',String(attributeBonus(strength)));}
export function sleeveAverageHealth(type='birth',strength=30){const formula=sleeveHealthFormula(type,strength);const m=formula.match(/(\d+)d(\d+)\+(\d+)/);if(!m)return 10;return Math.floor(Number(m[1])*(Number(m[2])+1)/2+Number(m[3]));}
/** Wound overflow is cumulative: each point beyond Damage Threshold costs HP. */
export function resolveWoundDamage({currentWounds=0,incomingWounds=0,damageThreshold=0,protection=0,currentHealth=0}={}) {
  currentWounds=Math.max(0,Number(currentWounds)||0); incomingWounds=Math.max(0,Number(incomingWounds)||0); damageThreshold=Math.max(0,Number(damageThreshold)||0); currentHealth=Math.max(0,Number(currentHealth)||0);
  const appliedWounds=applyProtection(incomingWounds,protection); const newWounds=currentWounds+appliedWounds; const previousOverflow=Math.max(0,currentWounds-damageThreshold); const newOverflow=Math.max(0,newWounds-damageThreshold); const healthLoss=Math.max(0,newOverflow-previousOverflow); const newHealth=Math.max(0,currentHealth-healthLoss);
  return {appliedWounds,newWounds,healthLoss,newHealth,dying:newWounds>=damageThreshold,sleeveDead:newHealth<=0};
}
export function dyingSaveTarget(remainingHealth=0, injuries=0) { return Math.max(0,Number(remainingHealth||0)-Number(injuries||0)); }
export function dyingRoundHealthLoss(currentHealth=0) { return Math.max(0,Number(currentHealth||0)-1); }
export function instantDeathFromWounds(incomingWounds=0, damageThreshold=0) { return Number(incomingWounds||0)>Number(damageThreshold||0); }
export function severeOrganicFailure(failureDegrees=0,{strengthBonus=0,willpowerBonus=0}={}) { return Number(failureDegrees||0)>Number(strengthBonus||0)+Number(willpowerBonus||0); }
export function spMitigateDamageCost(timesUsedThisSession=0) { return 2 ** Math.max(0,Number(timesUsedThisSession)||0); }
export function mitigateWoundsWithSP({incomingWounds=0,currentHealth=0,timesUsedThisSession=0}={}) { return {spCost:spMitigateDamageCost(timesUsedThisSession),appliedWounds:0,healthLoss:Number(incomingWounds)>0?1:0,newHealth:Math.max(0,Number(currentHealth||0)-(Number(incomingWounds)>0?1:0)),injuryRequired:Number(incomingWounds)>0}; }
export function longRestWoundRecovery({success=false,successDegrees=0,strengthBonus=0}={}) { return success?Math.max(0,Number(successDegrees||0)+Number(strengthBonus||0)):Math.max(0,Number(strengthBonus||0)); }
export function shortRestWoundRecovery({success=false,strengthBonus=0}={}) { return success?Math.max(0,Number(strengthBonus||0)):1; }

export function validateSleeveAttributes(type,{strength,perception}={}){const l=SLEEVE_LIMITS[type]||SLEEVE_LIMITS.other;const s=Number(strength),p=Number(perception);return{valid:s>=l.strength[0]&&s<=l.strength[1]&&p>=l.perception[0]&&p<=l.perception[1],limits:l};}
export function resleeveDissociation({compulsory=false,divergent=false,crossSleeve=false,dhfAge=100}={}){const qualifies=Boolean(compulsory)&&Boolean(divergent||crossSleeve)&&Number(dhfAge)<100;return qualifies?{egoLoss:Number(dhfAge)<50?'2d6':'1d6',stackLoss:'0'}:{egoLoss:'0',stackLoss:'0'};}
export const RESLEEVE_DOWNGRADE = Object.freeze({'birth->synthetic-high':{egoLoss:'2d6',stackLoss:'0'},'clone->synthetic-high':{egoLoss:'2d6',stackLoss:'0'},'birth->synthetic-mid':{egoLoss:'3d6',stackLoss:'1d6'},'clone->synthetic-mid':{egoLoss:'3d6',stackLoss:'1d6'},'birth->synthetic-low':{egoLoss:'4d6',stackLoss:'2d6'},'clone->synthetic-low':{egoLoss:'4d6',stackLoss:'2d6'},'natal->synthetic-high':{egoLoss:'1d6',stackLoss:'0'},'natal->synthetic-mid':{egoLoss:'2d6',stackLoss:'0'},'natal->synthetic-low':{egoLoss:'3d6',stackLoss:'1d6'},'synthetic-high->synthetic-mid':{egoLoss:'1d6',stackLoss:'0'},'synthetic-high->synthetic-low':{egoLoss:'2d6',stackLoss:'1d6'},'synthetic-mid->synthetic-low':{egoLoss:'1d6',stackLoss:'0'}});
export function resleeveDowngradeConsequence(fromType='',toType='',{preferredBirthClone=false}={}){const from=String(fromType),to=String(toType);if(['birth','clone'].includes(from)&&['birth','natal','clone'].includes(to))return preferredBirthClone&&to==='clone'?{egoLoss:'0',stackLoss:'0'}:{egoLoss:'1d6',stackLoss:'0'};return RESLEEVE_DOWNGRADE[`${from}->${to}`]||{egoLoss:'0',stackLoss:'0'};}
export function doubleSleeveConsequence(){return {egoLoss:'3d6',influenceLoss:1,duplicateBecomesNPC:true};}

export function upgradeTR(usedTechPoints=0){const q=Math.max(0,Number(usedTechPoints)||0);if(q<=1)return 12;if(q===2)return 10;if(q===3)return 8;if(q===4)return 6;return 4;}
export function respecTR(totalTechPoints=1){const q=Math.max(1,Number(totalTechPoints)||1);if(q===1)return 10;if(q===2)return 8;if(q===3)return 6;if(q===4)return 4;return 2;}
export function maxChassisTechPoints(defaultTechPoints=0){const q=Math.max(0,Number(defaultTechPoints)||0);return Math.max(q+1,q*2);}
export function cargoEncumbrance(cargoUnits=0,strengthBonus=0){const over=Math.max(0,Number(cargoUnits)-Number(strengthBonus));return {encumbered:over>0,level:over,strengthDifficulty:over,speedDicePenalty:over};}
export function firingModeProfile(mode='semi-automatic'){return FIRING_MODES[mode]||FIRING_MODES['semi-automatic'];}

export function stepDie(sides=8,steps=0){const order=[4,6,8,10,12];let i=order.indexOf(Number(sides));if(i<0)i=2;return order[clamp(i+Number(steps||0),0,order.length-1)];}
export function requestProfile(level=1,empathyBonus=0,{ai=false,aiContact=false}={}){const l=clamp(Number(level)||1,1,5);const p=REQUEST_LEVELS[l];const die=ai?stepDie(p.die,aiContact?-1:1):p.die;return {...p,die,level:l,targetResult:p.base+Number(empathyBonus||0)};}
export function requestExhausted(successDegrees=0,level=1){return Number(successDegrees)>=REQUEST_LEVELS[clamp(Number(level)||1,1,5)].exhaust;}
export function contactAffiliation({name='none'}={}){const key=String(name).toLowerCase().replace(/\s+/g,'-');return ({none:{sp:5,dice:'1d6',bonus:0,categories:1},casual:{sp:10,dice:'2d6',bonus:1,categories:1},close:{sp:13,dice:'3d6',bonus:1,categories:2},'extremely-close':{sp:15,dice:'4d6',bonus:2,categories:2},irreplaceable:{sp:20,dice:'5d6',bonus:3,categories:3}})[key]||null;}

export function virtualAttributes(attributes={}, {envoy=false,ai=false}={}){const penalty=ai?0:(envoy?1:3);return {...attributes,strength:Math.max(0,Number(attributes.willpower||0)-penalty*10),perception:Math.max(0,Number(attributes.acuity||0)-penalty*10)};}
export function virusProfile(virusClass='c'){return VIRUS_CLASSES[String(virusClass).toLowerCase()]||VIRUS_CLASSES.c;}
export function viralStrikeDice(virusClass='c',applications=1,{ai=false}={}){const p=virusProfile(virusClass);const dice=p.perSuccessDice*Math.max(1,Number(applications)||1);return ai?dice:Math.min(p.maxDice,dice);}
export function egoLossAfterReduction(rawLoss=0,{healthLost=0,willpowerBonus=0,disciplineDegrees=0}={}){const total=Math.max(0,Number(rawLoss||0)+Math.max(0,Number(healthLost||0)));if(!total)return 0;return Math.max(1,total-Math.max(0,Number(willpowerBonus||0))-Math.max(0,Number(disciplineDegrees||0)));}
export function doubleEgoLossDiceFormula(formula='0'){const m=String(formula).match(/^(\d+)d(\d+)([+-]\d+)?$/i);if(!m)return formula;return `${Number(m[1])*2}d${m[2]}${m[3]||''}`;}
export function syntheticDissociationFormula(formula='0',{featureCount=0,lowQuality=false}={}){const m=String(formula).match(/^(\d+)d(\d+)([+-]\d+)?$/i);if(!m)return formula;const dice=Number(m[1])+Math.max(0,Number(featureCount)||0);const sides=lowQuality?stepDie(Number(m[2]),1):Number(m[2]);return `${dice}d${sides}${m[3]||''}`;}
export function vehicleStructureLossFormula({savePassed=false,armorPiercing=false}={}){if(armorPiercing)return savePassed?'1d4':'1d6';return savePassed?'1':'1d4';}
export function vehicleDerivedStats({handling=0,fireControl=0,structureMax=0,structureCurrent=structureMax}={}){const lost=Math.max(0,Number(structureMax)-Number(structureCurrent));return {handling:Math.max(0,Number(handling)-lost),fireControl:Math.max(0,Number(fireControl)-lost),destroyed:Number(structureCurrent)<=0};}
export function vehicleFuelDP(travel='district',size=1){size=Math.max(1,Number(size)||1);switch(String(travel).toLowerCase()){case'district':return '1';case'city':return String(size);case'region':return String(2*size);case'planetary':return `1d8+${2*size}`;case'space':return 'narrative';default:return '0';}}
export function minionDefeated({woundsThisRound=0,health=10,minionBonus=0}={}){return Number(woundsThisRound)>=Number(health)+Number(minionBonus);}
export function backupProfile({premium=false}={}){return premium?{influence:2,priceLevel:5,extraLossDie:false}:{influence:1,priceLevel:4,extraLossDie:true};}

import {reduceEgoDice,egoDiceReduction,egoResourceChange,egoAvailableMaximum} from './drug-medical-virtual.mjs';
import {armourProfile,inventoryLoad,effectiveCapacity} from './combat-equipment.mjs';
import {evaluateEffects,derivedEffectValue} from './effects.mjs';
import {
  attributeBonus, speedDiceFromPerception, SLEEVE_LIMITS, skillDie, resolveWoundDamage, depletionTR, isExhausted,
  spMitigateDamageCost, spInfluenceRecovery, applyEgoDamage, purchaseDeferral, damageThresholdFromStrength,
  skillUpgradeCost, specializationCost, attributeIncreaseFormula, longRestWoundRecovery, shortRestWoundRecovery,
  resleeveDissociation, resleeveDowngradeConsequence, requestProfile, requestExhausted, resourceDepletionDie,
  resourceCatalogTR, effectiveWealthDuringDeferral, cargoEncumbrance, vehicleDerivedStats, minionDefeated, egoLossAfterReduction, doubleEgoLossDiceFormula, syntheticDissociationFormula, depletionCheckOutcome
} from './rules-engine.mjs';
import {hasEquivalentUniqueRecord} from './sheet-record-utils.mjs';
import {postTraitAdjudication} from './trait-adjudication.mjs';

function hasItemKey(actor,type,key){return actor.items?.some(i=>i.type===type&&(i.system.key===key||i.system.catalogId===key));}
async function evalFormula(formula){if(!formula||formula==='0')return 0;return Number((await new Roll(formula).evaluate()).total||0);}

export class AlteredCarbonActor extends Actor {
  prepareDerivedData(){
    super.prepareDerivedData();
    const active=this.items?.find(i=>i.type==='sleeve' && i.system.status==='active');
    if(active && ['character','npc','threat'].includes(this.type)){
      this.system.attributes.strength=active.system.strength;
      this.system.attributes.perception=active.system.perception;
      this.system.resources.health.max=active.system.healthMax;
      this.system.resources.health.value=Math.min(this.system.resources.health.value, active.system.healthMax);
      this.system.resources.wounds.max=damageThresholdFromStrength(active.system.strength);
    }
    const effects=evaluateEffects(this);
    const initialHealthMax=Number(active?.system?.healthMax??this._source?.system?.resources?.health?.max??this.system.resources.health.max??0);
    this.system.resources.health.max=Math.max(0,derivedEffectValue(effects,'resource.health.max',initialHealthMax));
    this.system.resources.health.value=Math.min(this.system.resources.health.value,this.system.resources.health.max);
    for(const attr of ['strength','perception','empathy','willpower','acuity','intelligence']){
      const sourceAttr=Number(this._source?.system?.attributes?.[attr]??this.system.attributes[attr]??0);
      this.system.attributes[attr]=derivedEffectValue(effects,`attribute.${attr}`,['strength','perception'].includes(attr)&&active?Number(active.system[attr]||0):sourceAttr);
    }
    this.ac={effects,bonuses:{},conditions:new Set(),injuries:[],activeSleeve:active||null};
    for(const [k,v] of Object.entries(this.system.attributes||{})) this.ac.bonuses[k]=derivedEffectValue(effects,`bonus.${k}`,attributeBonus(v));
    const masteryBase=SLEEVE_LIMITS[active?.system?.sleeveType||'birth']||SLEEVE_LIMITS.birth;
    this.ac.attributeCaps=Object.fromEntries(['strength','perception','empathy','willpower','acuity','intelligence'].map(k=>[k,derivedEffectValue(effects,`attribute.${k}.cap`,['strength','perception'].includes(k)?masteryBase[k][1]:50)]));
    const ownedEgoTiers=(this.items?.contents||[...(this.items||[])]).filter(i=>i.type==='trait'&&/^trait-23[6-9]$|^trait-240$/.test(i.system?.catalogId||''));
    const egoIncrement=ownedEgoTiers.length*(10+this.ac.bonuses.willpower);
    this.system.resources.ego.max=Number(this._source?.system?.resources?.ego?.max??this.system.resources.ego.max??0)+egoIncrement;
    this.ac.egoSaveBonus=derivedEffectValue(effects,'check.egoSave',0);
    this.ac.healthMax=this.system.resources.health.max;
    for(const item of this.items||[]){
      if(item.type==='condition')this.ac.conditions.add(item.system.key||item.system.catalogId||item.name.toLowerCase());
      if(item.type==='injury'&&item.system.active)this.ac.injuries.push(item);
    }
    let speedMod=derivedEffectValue(effects,'speed.modifier',Number(this.system.speedModifier||0));
    if(this.ac.conditions.has('distracted'))speedMod-=2;
    if(this.ac.conditions.has('enraged'))speedMod+=1;
    speedMod-=this.ac.injuries.filter(i=>(i.system.key||i.system.catalogId)==='bone').reduce((n,i)=>n+Number(i.system.count||1),0);
    const load=inventoryLoad(this.items?.contents||[],this.ac.bonuses.strength||0);
    if(load.encumbered)speedMod-=load.level;
    this.ac.cargo={...load,strengthDifficulty:load.level,speedDicePenalty:load.level};
    this.ac.speedDice=speedDiceFromPerception(this.system.attributes?.perception||0,speedMod);
    this.ac.damageThreshold=Math.max(0,derivedEffectValue(effects,'damageThreshold.bonus',damageThresholdFromStrength(this.system.attributes?.strength||0)));
    this.system.resources.wounds.max=this.ac.damageThreshold;
    const armour=armourProfile(this.items?.contents||[],{baseDefense:derivedEffectValue(effects,'defense',Number(this.system.defense||0)),baseProtection:derivedEffectValue(effects,'protection',0),augmentationProtection:derivedEffectValue(effects,'armor.protection',0)});
    this.ac.armour=armour;
    this.ac.defense=armour.defense;
    this.ac.protection=armour.protection;
    const wealthTier=derivedEffectValue(effects,'resource.wealth.delta',Number(this._source?.system?.wealth??this.system.wealth??0));
    this.ac.effectiveWealth=effectiveWealthDuringDeferral(Math.max(1,Math.min(derivedEffectValue(effects,'resource.wealth.cap',5),wealthTier)),{deferral:this.system.economy?.deferral,inDebt:this.system.economy?.debt});if(this.system.identity?.variant==='envoy')this.ac.effectiveWealth=Math.max(1,this.ac.effectiveWealth-1);
    if(this.type==='vehicle')this.ac.vehicle=vehicleDerivedStats({handling:this.system.vehicle.handling,fireControl:this.system.vehicle.fireControl,structureMax:this.system.vehicle.structure.max,structureCurrent:this.system.vehicle.structure.value});
  }

  async activateSleeve(itemId,{applyPsychologicalEffects=true,overrideReligiousCoding=false}={}){
    if(!this.isOwner) throw new Error('Insufficient permission to resleeve this actor.');
    if(this.system.identity?.variant==='religious'&&!overrideReligiousCoding&&this.items?.some(i=>i.type==='sleeve'&&i.system.status==='active'))throw new Error('Religious Coding is Earthbound: this character cannot needlecast/resleeve into another sleeve. A GM may override only for a deliberate timeline/ruling exception.');
    const sleeve=this.items.get(itemId); if(!sleeve || sleeve.type!=='sleeve') throw new Error('Sleeve not found.');
    if((this.type==='ai'||this.system.identity?.variant==='ai')&&!sleeve.system.geoRestricted)throw new Error('AI characters may only inhabit synthetic sleeves with the GeoRestriction Feature (or operate from buildings/mainframes handled outside sleeve activation).');
    const old=this.items.find(i=>i.type==='sleeve'&&i.system.status==='active');
    if(old?.id===sleeve.id)return {sleeve,consequences:{egoLoss:0,stackLoss:0,formulas:[]},unchanged:true};
    const updates=this.items.filter(i=>i.type==='sleeve').map(i=>({_id:i.id,'system.status':i.id===itemId?'active':(i.system.status==='active'?'archived':i.system.status)}));
    await this.updateEmbeddedDocuments('Item',updates);
    const threshold=damageThresholdFromStrength(sleeve.system.strength);
    await this.update({'system.resources.health.max':sleeve.system.healthMax,'system.resources.health.value':sleeve.system.healthMax,'system.resources.wounds.value':0,'system.resources.wounds.max':threshold,'system.sleeveState':'healthy'});
    const consequences={egoLoss:0,stackLoss:0,formulas:[]};
    if(applyPsychologicalEffects&&old&&old.id!==sleeve.id){
      const avatarIDs=new Set((this.items?.contents||[...(this.items||[])]).filter(i=>i.type==='trait').map(i=>i.system?.catalogId));
      const avatarImmunity=avatarIDs.has('trait-180');
      const dis=avatarImmunity||avatarIDs.has('trait-179')?{egoLoss:'0',stackLoss:'0'}:resleeveDissociation({compulsory:Boolean(sleeve.system.compulsoryTransfer),divergent:Boolean(sleeve.system.crossSleeved),dhfAge:this.system.identity.dhfAge});
      const downgrade=avatarImmunity?{egoLoss:'0',stackLoss:'0'}:resleeveDowngradeConsequence(old.system.sleeveType,sleeve.system.sleeveType,{preferredBirthClone:Boolean(sleeve.system.preferredBirthClone)});
      let rawEgoLoss=0;
      for(const x of [dis,downgrade]){
        if(x.egoLoss&&x.egoLoss!=='0'){const formula=reduceEgoDice(x.egoLoss,egoDiceReduction(this.items?.contents||[],{resleeving:true}));const n=await evalFormula(formula);rawEgoLoss+=n;consequences.formulas.push(`EP ${formula}`);}
        if(x.stackLoss&&x.stackLoss!=='0'){const n=await evalFormula(x.stackLoss);consequences.stackLoss+=n;consequences.formulas.push(`SP ${x.stackLoss}`);}
      }
      consequences.egoLoss=rawEgoLoss?egoLossAfterReduction(rawEgoLoss,{willpowerBonus:this.ac?.bonuses?.willpower||0}):0;
      if(consequences.egoLoss)await this.applyEgoDamage(consequences.egoLoss);
      if(consequences.stackLoss){const cur=Number(this.system.resources.stackPoints.value||0);await this.update({'system.resources.stackPoints.value':Math.max(0,cur-consequences.stackLoss)});}
    }
    try{await postTraitAdjudication(this,{event:'resleeve'});}catch(error){console.warn('Altered Carbon | GM resleeve Trait prompt failed',error);}
    return {sleeve,consequences};
  }

  async applyTurnWounds(wounds,{protection=0}={}){
    const current=Number(this.system.resources.wounds.value||0), currentHealth=Number(this.system.resources.health.value||0);
    const threshold=Number(this.ac?.damageThreshold??damageThresholdFromStrength(this.system.attributes.strength));
    const result=resolveWoundDamage({currentWounds:current,incomingWounds:wounds,damageThreshold:threshold,protection,currentHealth});
    const update={'system.resources.wounds.value':result.newWounds,'system.resources.wounds.max':threshold,'system.resources.health.value':result.newHealth};
    if(result.sleeveDead) update['system.sleeveState']='dead'; else if(result.dying) update['system.sleeveState']='dying';
    await this.update(update);
    if(result.appliedWounds>0){const stable=this.items?.find(i=>i.type==='condition'&&(i.system.key||i.system.catalogId)==='stable');if(stable)await stable.delete();}
    return result;
  }
  /** Protection is applied once to the aggregate incoming Wounds for the Resolution phase/Turn, not per individual attack. */
  async applyWounds(wounds,options={}){return this.applyTurnWounds(wounds,options);}
  async loseHealth(amount){const v=Math.max(0,Number(this.system.resources.health.value||0)-Number(amount||0));await this.update({'system.resources.health.value':v});return v;}
  async spendStackPoints(amount){amount=Math.max(0,Number(amount||0));const v=Number(this.system.resources.stackPoints.value||0);if(amount>v)throw new Error('Not enough Stack Points.');await this.update({'system.resources.stackPoints.value':v-amount});return v-amount;}
  async spendInfluence(amount){const v=Number(this.system.resources.influence.value||0);amount=Math.max(0,Number(amount||0));if(amount>v)throw new Error('Not enough Influence Points.');await this.update({'system.resources.influence.value':v-amount});return v-amount;}
  async increaseAttributeWithStackPoints(attribute,spentSP=1){
    if(!['strength','perception','empathy','willpower','acuity','intelligence'].includes(attribute))throw new Error('Invalid Attribute.');
    spentSP=Math.max(1,Math.trunc(Number(spentSP)||1));
    const current=Number(this.system.attributes[attribute]||0),maximum=Number(this.ac?.attributeCaps?.[attribute]??50);
    if(current>=maximum)throw new Error(`${attribute} has reached its current Trait/Sleeve maximum (${maximum}).`);
    const roll=await new Roll(attributeIncreaseFormula(spentSP)).evaluate();const rolledGain=Math.max(0,Number(roll.total||0)),gain=Math.max(0,Math.min(rolledGain,maximum-current));
    await this.spendStackPoints(spentSP);
    if(['strength','perception'].includes(attribute)&&this.ac?.activeSleeve){const item=this.ac.activeSleeve;await item.update({[`system.${attribute}`]:Number(item.system[attribute]||0)+gain});}
    else await this.update({[`system.attributes.${attribute}`]:current+gain});
    return {gain,rolledGain,maximum,roll,capped:gain<rolledGain};
  }
  async upgradeSkill(itemId){
  const item=this.items.get(itemId);if(!item||item.type!=='skill')throw new Error('Skill not found.');
  const regularCost=skillUpgradeCost(item.system.level);if(!regularCost)throw new Error('Skill is already at maximum level.');
  let vouchers=[];try{vouchers=JSON.parse(this.system.virtualHalfSkillVouchers||'[]');}catch{vouchers=[];}
  if(!Array.isArray(vouchers))vouchers=[];
  const discount=vouchers.includes(item.id);const cost=discount?Math.ceil(regularCost/2):regularCost;
  await this.spendStackPoints(cost);
  await item.update({'system.level':Number(item.system.level)+1});
  if(discount)await this.update({'system.virtualHalfSkillVouchers':JSON.stringify(vouchers.filter(id=>id!==item.id))});
  return {cost,regularCost,virtualDiscount:discount,level:item.system.level};
 }
  async takeSpecialisation(skillItemId,name){const skill=this.items.get(skillItemId);if(!skill||skill.type!=='skill')throw new Error('Skill not found.');const candidate={name,type:'specialisation',system:{skill:skill.name,missingDifficulty:0,rulesRef:'Core Rulebook, Specializations'}};if(hasEquivalentUniqueRecord(this.items.contents,candidate))throw new Error(`${name} is already recorded as a ${skill.name} Specialisation.`);const existing=this.items.filter(i=>i.type==='specialisation'&&i.system.skill===skill.name).length;const cost=specializationCost(existing);await this.spendStackPoints(cost);const [item]=await this.createEmbeddedDocuments('Item',[candidate]);return {cost,item};}
  async restoreEgoWithStackPoints(spentSP=5){const blocks=Math.floor(Number(spentSP)/5);if(!blocks)throw new Error('At least 5 Stack Points are required.');await this.spendStackPoints(blocks*5);let gain=0;for(let i=0;i<blocks;i++)gain+=Number((await new Roll(`1d6+${this.ac?.bonuses?.willpower||0}`).evaluate()).total||0);const r=this.system.resources.ego;const effectiveMax=egoAvailableMaximum({maximum:r.max,permanentLoss:this.system.egoPermanentLoss});const value=Math.min(effectiveMax,Number(r.value||0)+gain);await this.update({'system.resources.ego.value':value,'system.egoState':value===effectiveMax?'stable':this.system.egoState});return {gain,value,effectiveMax};}
  async healWoundsFromRest(kind='short',{success=false,successDegrees=0}={}){if(this.ac?.conditions?.has('squalor'))return {heal:0,value:Number(this.system.resources.wounds.value||0),blocked:true,reason:'Squalor prevents natural healing.'};if(kind==='short'&&this.ac?.injuries?.some(i=>(i.system.key||i.system.catalogId)==='poisoned'))return {heal:0,value:Number(this.system.resources.wounds.value||0),blocked:true,reason:'Poisoned prevents Short Rest Wound recovery.'};const sb=this.ac?.bonuses?.strength||0;const heal=kind==='long'?longRestWoundRecovery({success,successDegrees,strengthBonus:sb}):shortRestWoundRecovery({success,strengthBonus:sb});const current=Number(this.system.resources.wounds.value||0),value=Math.max(0,current-heal);await this.update({'system.resources.wounds.value':value});return {heal,value,blocked:false};}
  async restoreInfluenceWithStackPoints(spentSP=15){const gain=spInfluenceRecovery(spentSP);if(!gain)throw new Error('At least 15 Stack Points are required to restore Influence.');await this.spendStackPoints(spentSP);const r=this.system.resources.influence;const value=Math.min(Number(r.max||0),Number(r.value||0)+gain);await this.update({'system.resources.influence.value':value});return {gain,value};}
  async applyEgoDamage(amount){const r=this.system.resources.ego;const result=egoResourceChange({current:r.value,maximum:r.max,permanentLoss:this.system.egoPermanentLoss,damage:amount});await this.update({'system.resources.ego.value':result.value,'system.egoState':result.egoState});return result;}
  async applyEgoLossEvent(formula,{healthLost=0,birthSleeve=false,cloneDestination=false,disciplineDegrees=0,realspace=true,resleeving=false}={}){let adjusted=String(formula||'0');if(birthSleeve&&!cloneDestination)adjusted=doubleEgoLossDiceFormula(adjusted);adjusted=reduceEgoDice(adjusted,egoDiceReduction(this.items?.contents||[],{resleeving:resleeving||!realspace}));const sleeve=this.ac?.activeSleeve;if(realspace&&sleeve&&String(sleeve.system.sleeveType||'').startsWith('synthetic'))adjusted=syntheticDissociationFormula(adjusted,{featureCount:Number(sleeve.system.syntheticFeatureCount||0),lowQuality:Boolean(sleeve.system.lowQuality)});const raw=await evalFormula(adjusted);const amount=egoLossAfterReduction(raw,{healthLost,willpowerBonus:this.ac?.bonuses?.willpower||0,disciplineDegrees});const result=await this.applyEgoDamage(amount);return {...result,amount,raw,formula:adjusted};}
  evaluatePurchase(priceLevel){return purchaseDeferral(priceLevel,this.ac?.effectiveWealth??this.system.wealth);}
  async mitigateDamageWithStackPoints({timesUsedThisSession=0}={}){const cost=spMitigateDamageCost(timesUsedThisSession);await this.spendStackPoints(cost);const hp=Math.max(0,Number(this.system.resources.health.value||0)-1);await this.update({'system.resources.health.value':hp});return {spCost:cost,newHealth:hp,injuryRequired:true};}
  async setSleeveState(state){if(!['healthy','dying','stable','dead','awaiting-resleeving'].includes(state))throw new Error('Invalid sleeve state.');await this.update({'system.sleeveState':state});}
  async setStackState(state){if(!['intact','damaged','destroyed'].includes(state))throw new Error('Invalid stack state.');await this.update({'system.stackState':state});return state;}
  async markRealDeath(){await this.update({'system.stackState':'destroyed','system.sleeveState':'dead'});const sleeve=this.ac?.activeSleeve;if(sleeve)await sleeve.update({'system.status':'destroyed'});return {stackState:'destroyed',sleeveState:'dead'};}
  async beginResleeving(){await this.update({'system.sleeveState':'awaiting-resleeving'});return 'awaiting-resleeving';}

  async applyCondition(key,name=key,effect=''){if(hasItemKey(this,'condition',key))return null;return (await this.createEmbeddedDocuments('Item',[{name,type:'condition',system:{key,catalogId:key,description:effect}}]))[0];}
  async applyInjury(key,name=key,recoveryRate='',effect=''){const current=this.items.find(i=>i.type==='injury'&&i.system.key===key&&i.system.active);if(current){await current.update({'system.count':Number(current.system.count||1)+1});return current;}return (await this.createEmbeddedDocuments('Item',[{name,type:'injury',system:{key,catalogId:key,recoveryRate,description:effect,count:1,active:true}}]))[0];}
  async makeRequest(level,{skillResult=null,successDegrees=null,aiContact=false}={}){const isAI=this.type==='ai'||this.system.identity?.variant==='ai';const profile=requestProfile(level,this.ac?.bonuses?.empathy||0,{ai:isAI,aiContact});return {...profile,successDegrees,exhausted:successDegrees==null?false:requestExhausted(successDegrees,level),skillResult};}
  resourceCatalogDepletionDie(){return resourceDepletionDie(this.ac?.effectiveWealth??this.system.wealth);}
  resourceCatalogTR(item){return resourceCatalogTR(item.system.capacity,item.system.depletion);}
  minionDefeatedBy(woundsThisRound){return this.type==='threat'&&minionDefeated({woundsThisRound,health:this.system.resources.health.max,minionBonus:this.system.minionBonus});}
}

export class AlteredCarbonItem extends Item {
  get skillDieSides(){return this.type==='skill'?skillDie(this.system.level):null;}
  async addDepletion(points=1){
    if(!['weapon','armour','equipment','software','resourceEntry'].includes(this.type)) return;
    const depletion=Number(this.system.depletion||0)+Number(points||0), exhausted=isExhausted(this.system.capacity,depletion);
    await this.update({'system.depletion':depletion,'system.exhausted':exhausted});
    return {depletion, exhausted, tr:depletionTR(this.system.capacity,depletion)};
  }
  async useDepletion({skillSides=null,formula=null,counterOnly=null,efficiency=0}={}){
    if(!['weapon','armour','equipment','software'].includes(this.type))return {skipped:true,reason:'This item does not use equipment Depletion.'};
    const capacity=effectiveCapacity(this),mode=String(this.system.depletionMode||'check');
    if(capacity<=0||mode==='none')return {skipped:true,reason:'No finite Capacity/Depletion applies to this use.',depletion:Number(this.system.depletion||0),exhausted:Boolean(this.system.exhausted)};
    let dpFormula=String(formula||this.system.depletionFormula||'1').trim()||'1';
    if(this.type==='weapon'&&!formula){const firing=String(this.system.firingMode||'').toLowerCase();if(firing.includes('3-round')||firing.includes('3 round'))dpFormula='1d3';else if(firing.includes('fully automatic')||firing.includes('full auto'))dpFormula='1d6';}
    const dpRoll=await new Roll(dpFormula).evaluate(),added=Math.max(0,Number(dpRoll.total||0));
    const current=Number(this.system.depletion||0),counter=counterOnly==null?mode==='counter':Boolean(counterOnly);
    let preview=depletionCheckOutcome({capacity,currentDepletion:current,addedDepletion:added,counterOnly:counter,efficiency});let checkRoll=null;
    if(preview.checkRequired&&!preview.automatic){if(!skillSides)throw new Error('A Skill Check die is required for this Depletion Check.');checkRoll=await new Roll(`1d${Number(skillSides)}`).evaluate();const checkResult=Number(checkRoll.dice?.[0]?.results?.[0]?.result??checkRoll.total);preview=depletionCheckOutcome({capacity,currentDepletion:current,addedDepletion:added,rollResult:checkResult,counterOnly:counter,efficiency});}
    await this.update({'system.depletion':preview.depletion,'system.exhausted':preview.exhausted});
    return {...preview,added,dpFormula,dpRoll,checkRoll};
  }
  async removeDepletion(points=1){if(!['weapon','armour','equipment','software','resourceEntry'].includes(this.type))return;const depletion=Math.max(0,Number(this.system.depletion||0)-Number(points||0));await this.update({'system.depletion':depletion,'system.exhausted':false});return depletion;}
}

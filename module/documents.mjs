import {
  attributeBonus, speedDiceFromPerception, skillDie, resolveWoundDamage, depletionTR, isExhausted,
  spMitigateDamageCost, spInfluenceRecovery, applyEgoDamage, purchaseDeferral, damageThresholdFromStrength,
  skillUpgradeCost, specializationCost, attributeIncreaseFormula, longRestWoundRecovery, shortRestWoundRecovery,
  resleeveDissociation, resleeveDowngradeConsequence, requestProfile, requestExhausted, resourceDepletionDie,
  resourceCatalogTR, effectiveWealthDuringDeferral, cargoEncumbrance, vehicleDerivedStats, minionDefeated, egoLossAfterReduction, doubleEgoLossDiceFormula, syntheticDissociationFormula, depletionCheckOutcome
} from './rules-engine.mjs';

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
    this.ac={bonuses:{},conditions:new Set(),injuries:[],activeSleeve:active||null};
    for(const [k,v] of Object.entries(this.system.attributes||{})) this.ac.bonuses[k]=attributeBonus(v);
    for(const item of this.items||[]){
      if(item.type==='condition')this.ac.conditions.add(item.system.key||item.system.catalogId||item.name.toLowerCase());
      if(item.type==='injury'&&item.system.active)this.ac.injuries.push(item);
    }
    let speedMod=Number(this.system.speedModifier||0);
    if(this.ac.conditions.has('distracted'))speedMod-=2;
    if(this.ac.conditions.has('enraged'))speedMod+=1;
    speedMod-=this.ac.injuries.filter(i=>(i.system.key||i.system.catalogId)==='bone').reduce((n,i)=>n+Number(i.system.count||1),0);
    const cargo=this.items?.filter(i=>['weapon','armour','equipment','augmentation','software'].includes(i.type)).reduce((n,i)=>n+Number(i.system.cargoUnits||0)+Number(i.system.heavy||0),0)||0;
    const enc=cargoEncumbrance(cargo,this.ac.bonuses.strength||0); if(enc.encumbered)speedMod-=enc.speedDicePenalty;
    this.ac.cargo={used:cargo,capacity:this.ac.bonuses.strength||0,...enc};
    this.ac.speedDice=speedDiceFromPerception(this.system.attributes?.perception||0,speedMod);
    this.ac.damageThreshold=damageThresholdFromStrength(this.system.attributes?.strength||0);
    this.ac.effectiveWealth=effectiveWealthDuringDeferral(this.system.wealth,{deferral:this.system.economy?.deferral,debt:this.system.economy?.debt});if(this.system.identity?.variant==='envoy')this.ac.effectiveWealth=Math.max(1,this.ac.effectiveWealth-1);
    if(this.type==='vehicle')this.ac.vehicle=vehicleDerivedStats({handling:this.system.vehicle.handling,fireControl:this.system.vehicle.fireControl,structureMax:this.system.vehicle.structure.max,structureCurrent:this.system.vehicle.structure.value});
  }

  async activateSleeve(itemId,{applyPsychologicalEffects=true,overrideReligiousCoding=false}={}){
    if(!this.isOwner) throw new Error('Insufficient permission to resleeve this actor.');
    if(this.system.identity?.variant==='religious'&&!overrideReligiousCoding&&this.items?.some(i=>i.type==='sleeve'&&i.system.status==='active'))throw new Error('Religious Coding is Earthbound: this character cannot needlecast/resleeve into another sleeve. A GM may override only for a deliberate timeline/ruling exception.');
    const sleeve=this.items.get(itemId); if(!sleeve || sleeve.type!=='sleeve') throw new Error('Sleeve not found.');
    if((this.type==='ai'||this.system.identity?.variant==='ai')&&!sleeve.system.geoRestricted)throw new Error('AI characters may only inhabit synthetic sleeves with the GeoRestriction Feature (or operate from buildings/mainframes handled outside sleeve activation).');
    const old=this.items.find(i=>i.type==='sleeve'&&i.system.status==='active');
    const updates=this.items.filter(i=>i.type==='sleeve').map(i=>({_id:i.id,'system.status':i.id===itemId?'active':(i.system.status==='active'?'archived':i.system.status)}));
    await this.updateEmbeddedDocuments('Item',updates);
    const threshold=damageThresholdFromStrength(sleeve.system.strength);
    await this.update({'system.resources.health.max':sleeve.system.healthMax,'system.resources.health.value':sleeve.system.healthMax,'system.resources.wounds.value':0,'system.resources.wounds.max':threshold,'system.sleeveState':'healthy'});
    const consequences={egoLoss:0,stackLoss:0,formulas:[]};
    if(applyPsychologicalEffects&&old&&old.id!==sleeve.id){
      const dis=resleeveDissociation({compulsory:Boolean(sleeve.system.compulsoryTransfer),divergent:Boolean(sleeve.system.crossSleeved),dhfAge:this.system.identity.dhfAge});
      const downgrade=resleeveDowngradeConsequence(old.system.sleeveType,sleeve.system.sleeveType,{preferredBirthClone:Boolean(sleeve.system.preferredBirthClone)});
      let rawEgoLoss=0;
      for(const x of [dis,downgrade]){
        if(x.egoLoss&&x.egoLoss!=='0'){const formula=syntheticDissociationFormula(x.egoLoss,{featureCount:Number(sleeve.system.syntheticFeatureCount||0),lowQuality:Boolean(sleeve.system.lowQuality)});const n=await evalFormula(formula);rawEgoLoss+=n;consequences.formulas.push(`EP ${formula}`);}
        if(x.stackLoss&&x.stackLoss!=='0'){const n=await evalFormula(x.stackLoss);consequences.stackLoss+=n;consequences.formulas.push(`SP ${x.stackLoss}`);}
      }
      consequences.egoLoss=rawEgoLoss?egoLossAfterReduction(rawEgoLoss,{willpowerBonus:this.ac?.bonuses?.willpower||0}):0;
      if(consequences.egoLoss)await this.applyEgoDamage(consequences.egoLoss);
      if(consequences.stackLoss){const cur=Number(this.system.resources.stackPoints.value||0);await this.update({'system.resources.stackPoints.value':Math.max(0,cur-consequences.stackLoss)});}
    }
    return {sleeve,consequences};
  }

  async applyTurnWounds(wounds,{protection=0}={}){
    const current=Number(this.system.resources.wounds.value||0), currentHealth=Number(this.system.resources.health.value||0);
    const threshold=damageThresholdFromStrength(this.system.attributes.strength);
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
  async increaseAttributeWithStackPoints(attribute,spentSP=1){if(!['strength','perception','empathy','willpower','acuity','intelligence'].includes(attribute))throw new Error('Invalid Attribute.');spentSP=Math.max(1,Math.trunc(Number(spentSP)||1));await this.spendStackPoints(spentSP);const roll=await new Roll(attributeIncreaseFormula(spentSP)).evaluate();const gain=Number(roll.total||0);if(['strength','perception'].includes(attribute)&&this.ac?.activeSleeve){const item=this.ac.activeSleeve;await item.update({[`system.${attribute}`]:Number(item.system[attribute]||0)+gain});}else await this.update({[`system.attributes.${attribute}`]:Number(this.system.attributes[attribute]||0)+gain});return {gain,roll};}
  async upgradeSkill(itemId){const item=this.items.get(itemId);if(!item||item.type!=='skill')throw new Error('Skill not found.');const cost=skillUpgradeCost(item.system.level);if(!cost)throw new Error('Skill is already at maximum level.');await this.spendStackPoints(cost);await item.update({'system.level':Number(item.system.level)+1});return {cost,level:item.system.level};}
  async takeSpecialisation(skillItemId,name){const skill=this.items.get(skillItemId);if(!skill||skill.type!=='skill')throw new Error('Skill not found.');const existing=this.items.filter(i=>i.type==='specialisation'&&i.system.skill===skill.name).length;const cost=specializationCost(existing);await this.spendStackPoints(cost);const [item]=await this.createEmbeddedDocuments('Item',[{name,type:'specialisation',system:{skill:skill.name,missingDifficulty:0,rulesRef:'Core Rulebook, Specializations'}}]);return {cost,item};}
  async restoreEgoWithStackPoints(spentSP=5){const blocks=Math.floor(Number(spentSP)/5);if(!blocks)throw new Error('At least 5 Stack Points are required.');await this.spendStackPoints(blocks*5);let gain=0;for(let i=0;i<blocks;i++)gain+=Number((await new Roll(`1d6+${this.ac?.bonuses?.willpower||0}`).evaluate()).total||0);const r=this.system.resources.ego;const value=Math.min(Number(r.max||0),Number(r.value||0)+gain);await this.update({'system.resources.ego.value':value,'system.egoState':value===Number(r.max||0)?'stable':this.system.egoState});return {gain,value};}
  async healWoundsFromRest(kind='short',{success=false,successDegrees=0}={}){if(this.ac?.conditions?.has('squalor'))return {heal:0,value:Number(this.system.resources.wounds.value||0),blocked:true,reason:'Squalor prevents natural healing.'};if(kind==='short'&&this.ac?.injuries?.some(i=>(i.system.key||i.system.catalogId)==='poisoned'))return {heal:0,value:Number(this.system.resources.wounds.value||0),blocked:true,reason:'Poisoned prevents Short Rest Wound recovery.'};const sb=this.ac?.bonuses?.strength||0;const heal=kind==='long'?longRestWoundRecovery({success,successDegrees,strengthBonus:sb}):shortRestWoundRecovery({success,strengthBonus:sb});const current=Number(this.system.resources.wounds.value||0),value=Math.max(0,current-heal);await this.update({'system.resources.wounds.value':value});return {heal,value,blocked:false};}
  async restoreInfluenceWithStackPoints(spentSP=15){const gain=spInfluenceRecovery(spentSP);if(!gain)throw new Error('At least 15 Stack Points are required to restore Influence.');await this.spendStackPoints(spentSP);const r=this.system.resources.influence;const value=Math.min(Number(r.max||0),Number(r.value||0)+gain);await this.update({'system.resources.influence.value':value});return {gain,value};}
  async applyEgoDamage(amount){const r=this.system.resources.ego;const value=applyEgoDamage(r.value,amount);const ratio=Number(r.max||0)>0?value/Number(r.max):0;const egoState=value<=0?'splintered':ratio<0.5?'damaged':'stable';await this.update({'system.resources.ego.value':value,'system.egoState':egoState});return {value,egoState};}
  async applyEgoLossEvent(formula,{healthLost=0,birthSleeve=false,cloneDestination=false,disciplineDegrees=0,realspace=true}={}){let adjusted=String(formula||'0');if(birthSleeve&&!cloneDestination)adjusted=doubleEgoLossDiceFormula(adjusted);const sleeve=this.ac?.activeSleeve;if(realspace&&sleeve&&String(sleeve.system.sleeveType||'').startsWith('synthetic'))adjusted=syntheticDissociationFormula(adjusted,{featureCount:Number(sleeve.system.syntheticFeatureCount||0),lowQuality:Boolean(sleeve.system.lowQuality)});const raw=await evalFormula(adjusted);const amount=egoLossAfterReduction(raw,{healthLost,willpowerBonus:this.ac?.bonuses?.willpower||0,disciplineDegrees});const result=await this.applyEgoDamage(amount);return {...result,amount,raw,formula:adjusted};}
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
    if(!['weapon','equipment','software','resourceEntry'].includes(this.type)) return;
    const depletion=Number(this.system.depletion||0)+Number(points||0), exhausted=isExhausted(this.system.capacity,depletion);
    await this.update({'system.depletion':depletion,'system.exhausted':exhausted});
    return {depletion, exhausted, tr:depletionTR(this.system.capacity,depletion)};
  }
  async useDepletion({skillSides=null,formula=null,counterOnly=null}={}){
    if(!['weapon','equipment','software'].includes(this.type))return {skipped:true,reason:'This item does not use equipment Depletion.'};
    const capacity=Number(this.system.capacity||0),mode=String(this.system.depletionMode||'check');
    if(capacity<=0||mode==='none')return {skipped:true,reason:'No finite Capacity/Depletion applies to this use.',depletion:Number(this.system.depletion||0),exhausted:Boolean(this.system.exhausted)};
    let dpFormula=String(formula||this.system.depletionFormula||'1').trim()||'1';
    if(this.type==='weapon'&&!formula){const firing=String(this.system.firingMode||'').toLowerCase();if(firing.includes('3-round')||firing.includes('3 round'))dpFormula='1d3';else if(firing.includes('fully automatic')||firing.includes('full auto'))dpFormula='1d6';}
    const dpRoll=await new Roll(dpFormula).evaluate(),added=Math.max(0,Number(dpRoll.total||0));
    const current=Number(this.system.depletion||0),counter=counterOnly==null?mode==='counter':Boolean(counterOnly);
    let preview=depletionCheckOutcome({capacity,currentDepletion:current,addedDepletion:added,counterOnly:counter});let checkRoll=null;
    if(preview.checkRequired&&!preview.automatic){if(!skillSides)throw new Error('A Skill Check die is required for this Depletion Check.');checkRoll=await new Roll(`1d${Number(skillSides)}`).evaluate();const checkResult=Number(checkRoll.dice?.[0]?.results?.[0]?.result??checkRoll.total);preview=depletionCheckOutcome({capacity,currentDepletion:current,addedDepletion:added,rollResult:checkResult,counterOnly:counter});}
    await this.update({'system.depletion':preview.depletion,'system.exhausted':preview.exhausted});
    return {...preview,added,dpFormula,dpRoll,checkRoll};
  }
  async removeDepletion(points=1){if(!['weapon','equipment','software','resourceEntry'].includes(this.type))return;const depletion=Math.max(0,Number(this.system.depletion||0)-Number(points||0));await this.update({'system.depletion':depletion,'system.exhausted':false});return depletion;}
}

import {serializedCoreTraitRules,hasCoreTraitRules} from './core-trait-effects.mjs';
import {augmentationRules} from './core-augmentation-effects.mjs';
/** AC 1.4 rules-element engine. Only explicitly authored rules are executable.
 * Narrative source text is NEVER parsed into guessed mechanics.
 * Each rule: {key,mode,value,when?,label?}. Supported modes: add, set, max.
 * Targets: attribute.<six>, bonus.<six>, skill.level, check.difficulty,
 * check.training, check.gear, check.bonusDie, speed.modifier,
 * defense, protection, damage.bonus, resource.<name>.max.
 */
const ATTRS=new Set(['strength','perception','empathy','willpower','acuity','intelligence']);
const RESOURCES=new Set(['health','ego','wounds','stackPoints','influence']);
const MODES=new Set(['add','set','max','min']);
const ALLOWED=new Set(['skill','attribute','specialisation','damageType','range','targetType','virtual','sleeveType','actorType','status','itemTag','installation','isSave','activity','environment','against','targetAware','targetCount','skillTag','quality','hasTrait']);
export function parseEffects(raw){
  if(!raw)return [];
  let data=raw;
  if(typeof raw==='string'){try{data=JSON.parse(raw);}catch{throw new Error('Rules elements must be valid JSON.');}}
  if(!Array.isArray(data))throw new Error('Rules elements must be a JSON array.');
  return data.map((rule,index)=>{
    if(!rule||typeof rule!=='object'||Array.isArray(rule))throw new Error(`Effect ${index+1}: expected object.`);
    const key=String(rule.key||''),mode=rule.mode||'add';
    const valid= /^attribute\.(strength|perception|empathy|willpower|acuity|intelligence)(\.cap)?$/.test(key)||/^bonus\.(strength|perception|empathy|willpower|acuity|intelligence)$/.test(key)||/^resource\.(health|ego|wounds|stackPoints|influence)\.max$/.test(key)||['skill.level','check.difficulty','check.training','check.gear','check.bonusDie','check.extraBonusDice','check.nonStackingBonusDice','check.unarmedPenalty','check.egoSave','speed.modifier','defense','protection','armor.protection','damage.bonus','damageThreshold.bonus','request.levelDelta','request.ipCostDelta','request.modifier','request.bonusDieSteps','weapon.efficiency','resource.wealth.delta','resource.wealth.cap','medical.woundsPerDegree'].includes(key);
    if(!valid||!MODES.has(mode)||!Number.isFinite(rule.value)||((key==='check.bonusDie')&&!([4,6,8,10,12].includes(rule.value))))throw new Error(`Effect ${index+1}: invalid target, mode or numeric value.`);
    const when=rule.when||{};
    if(typeof when!=='object'||Array.isArray(when)||Object.keys(when).some(k=>!ALLOWED.has(k)))throw new Error(`Effect ${index+1}: invalid predicate.`);
    return {...rule,key,mode,when};
  });
}
export function matchesEffect(when={},context={}){
  return Object.entries(when).every(([key,expected])=>{
    if(!ALLOWED.has(key))return false;
    const actual=context[key];
    if(actual===undefined||actual===null)return false;
    if(Array.isArray(expected))return expected.some(v=>Array.isArray(actual)?actual.includes(v):actual===v);
    return Array.isArray(actual)?actual.includes(expected):actual===expected;
  });
}
export function applyEffect(base,rule){if(rule.mode==='set')return rule.value;if(rule.mode==='max')return Math.max(base,rule.value);if(rule.mode==='min')return Math.min(base,rule.value);return base+rule.value;}
export function collectEffects(actor,context={}){
  const effects=[],errors=[];
  const inventory=actor.items?.contents||[...(actor.items||[])];
  const ownedTraitIds=inventory.filter(i=>i.type==='trait').map(i=>i.system?.catalogId).filter(Boolean);
  const activeSleeve=inventory.find(i=>i.type==='sleeve'&&i.system.status==='active');
  const activeBestialUpgrade=inventory.some(i=>i.type==='augmentation'&&i.system?.active&&i.system.catalogId==='AUG007');
  for(const item of inventory){
    const type=item.type,s=item.system||{};
    if(!['trait','augmentation','drug','armour','equipment','weapon','software','condition','scandal','sleeve','baggage'].includes(type))continue;
    if(type==='sleeve'&&item!==activeSleeve)continue;
    if(type==='augmentation'&&(!s.active||(s.sleeveId&&s.sleeveId!==activeSleeve?.id)))continue;
    if(type==='drug'&&!s.active)continue;
    if(type==='armour'&&s.equipState!=='worn')continue;
    if(['weapon','equipment','software'].includes(type)&&s.equipState!=='equipped')continue;
    if(type==='scandal'&&!s.active)continue;
    const sourceRules=s.rulesOverride?s.ruleElements:(type==='trait'&&hasCoreTraitRules(s.catalogId)?serializedCoreTraitRules(s.catalogId):type==='augmentation'?(String(s.catalogId||'').startsWith('AUG')?JSON.stringify(augmentationRules(item)):s.ruleElements):s.ruleElements);
    try{for(const rule of parseEffects(sourceRules)){
      if(type==='augmentation'&&activeBestialUpgrade&&['AUG005','AUG006'].includes(s.catalogId)&&rule.key==='attribute.empathy')continue;
      const ruleContext={...context,hasTrait:ownedTraitIds,actorType:actor.type,sleeveType:activeSleeve?.system.sleeveType,installation:s.installation||'',virtual:context.virtual??false};
      if(matchesEffect(rule.when,ruleContext))effects.push({...rule,source:item.name,sourceId:item.id});}}
    catch(e){errors.push(`${item.name}: ${e.message}`);}
  }
  return {effects,errors};
}
export function evaluateEffects(actor,context={}){
  const {effects,errors}=collectEffects(actor,context);const values={},applied=[];
  for(const effect of effects){const key=effect.key;if(key==='check.bonusDie'){(values[key]??=[]).push(effect.value);}else{const base=values[key]??0;values[key]=applyEffect(base,effect);}applied.push({source:effect.source,key,mode:effect.mode,value:effect.value,label:effect.label||''});}
  return {values,applied,errors};
}
export function derivedEffectValue(evaluation,key,base){let result=base;for(const e of evaluation.applied.filter(x=>x.key===key))result=applyEffect(result,e);return result;}

import {drugRollModifiers} from './drug-medical-virtual.mjs';
import {evaluateEffects,derivedEffectValue} from './effects.mjs';
import {skillDie, resolveCheck} from './rules-engine.mjs';
import {renderCheckCard} from './chat-ui.mjs';
import {postTraitAdjudication} from './trait-adjudication.mjs';
import {matchingBonusDiceAwards,awardedDiceForRoll,consumeBonusDiceAwards} from './gm-bonus-dice.mjs';
import {resolveBonusDice} from './gm-roll-options.mjs';

function dieResult(roll){return roll.dice?.[0]?.results?.[0]?.result ?? roll.total;}
function normalizedId(name=''){return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function conditionKeys(actor){const c=new Set(actor.items.filter(i=>i.type==='condition').map(i=>i.system.key||i.system.catalogId||normalizedId(i.name)));if(actor.items.some(i=>i.type==='trait'&&i.system.catalogId==='trait-024'))c.add('out-of-place');return c;}
function injuryCount(actor,key){return actor.items.filter(i=>i.type==='injury'&&i.system.active&&(i.system.key||i.system.catalogId)===key).reduce((n,i)=>n+Number(i.system.count||1),0);}

function situationalRules(actor,skill,options={}){
  const c=conditionKeys(actor); let difficulty=Number(options.difficulty||0); let drugGearBonus=0; const baseLevel=Number(skill.system.level||1); let level=baseLevel; let levelPenalty=0; let attribute=skill.system.attribute;
  const skillId=normalizedId(skill.name); const notes=[];
  const innateTraining=Number(skill.system.trainingBonus||0);if(innateTraining<0){difficulty+=Math.abs(innateTraining);notes.push(`Published Skill penalty ${innateTraining}`);}
  const activeDrugIds=new Set(actor.items.filter(i=>i.type==='drug'&&i.system.active).map(i=>String(i.system.catalogId||'').toUpperCase()));
  const chem=drugRollModifiers(actor.items.contents||[...actor.items],{attribute,skill:skill.name,suggestion:options.suggestion===true,sensorStealth:options.sensorStealth===true});
  difficulty+=chem.difficulty;drugGearBonus+=chem.gearBonus;level=Math.max(1,Math.min(5,level+chem.levelDelta));notes.push(...chem.notes);
  if(c.has('pinned')&&(options.itemTag||[]).includes('weapon')&&!options.weaponHandsFree)return {blocked:true,reason:'Pinned: cannot use a weapon requiring the hands until freed.'};
  if(c.has('incapacitated'))return {blocked:true,reason:'Incapacitated characters cannot make Skill Checks.'};
  if(c.has('virtual')||actor.system.virtualSession?.active){
    if(attribute==='strength')attribute='willpower'; else if(attribute==='perception')attribute='acuity';
    if(['strength','perception'].includes(skill.system.attribute)){const isAI=actor.type==='ai'||actor.system.identity.variant==='ai';difficulty+=isAI?0:(actor.system.identity.variant==='envoy'?1:3);if(!isAI)notes.push('Virtual projection');}
  }
  if(c.has('dazzled')&&options.sightOnly)return {blocked:true,reason:'Dazzled: this check relies exclusively on sight and automatically fails.'};
  if(c.has('dazzled')&&options.sightReliant){levelPenalty+=1;level=Math.max(1,level-levelPenalty);notes.push('Dazzled: Skill Level reduced');}
  if(c.has('prone')||c.has('pinned')){difficulty+=1;notes.push(c.has('pinned')?'Pinned (also Prone)':'Prone');}
  const mal=actor.items.find(i=>i.type==='condition'&&(i.system.key||i.system.catalogId)==='malnourished');if(mal){const d=Number(mal.system.severity||mal.system.difficulty||2)||2;difficulty+=Math.max(2,d);notes.push(`Malnourished -${Math.max(2,d)}`);}
  if(Number(actor.system.medicalAftereffectHours||0)>0){difficulty+=2;notes.push('Rapid Regrowth Painkiller: next-day -2');}
  const poison=injuryCount(actor,'poisoned');if(poison&&['perception','acuity'].includes(attribute)){difficulty+=poison;notes.push(`Poisoned injury ${poison}`);}
  if(c.has('squalor')&&['composure','diplomacy'].includes(skillId)){difficulty+=2;notes.push('Squalor');}
  if(c.has('enraged')){
    if(['intelligence','acuity'].includes(attribute))return {blocked:true,reason:'Enraged characters cannot make Intelligence or Acuity checks.'};
    if(attribute!=='strength'){difficulty+=2;notes.push('Enraged');}
  }
  if(c.has('panic')&&!activeDrugIds.has('DRG003')&&['strength','perception','acuity','intelligence'].includes(attribute)){levelPenalty+=1;level=Math.max(1,level-levelPenalty);notes.push('Panic: Skill Level reduced');}
  if(c.has('drenched')&&['composure','discipline','endurance','survival'].includes(skillId)){difficulty+=2;notes.push('Drenched');}
  if(c.has('out-of-place')&&['stealth','diplomacy','expression'].includes(skillId)){difficulty+=1;notes.push('Out of Place');}
  const enc=actor.ac?.cargo?.level||0;if(enc&&attribute==='strength'){difficulty+=enc;notes.push(`Encumbered ${enc}`);}
  const bone=injuryCount(actor,'bone');if(bone&&attribute==='strength'){difficulty+=bone;notes.push(`Bone Injury ${bone}`);}
  return {blocked:false,difficulty,baseLevel,levelPenalty,level,attribute,notes,drugGearBonus};
}

const pendingBonusRolls = new Set();
/** Player-owned rolls may use GM awards. Serialize one-time grants per Actor on
 * this client so two simultaneous rolls cannot both reuse one promised die.
 * Server-side cross-client races still require multiplayer live QA.
 */
export async function rollSkill(actor,skill,options={}){
  if(globalThis.game?.user && !game.user.isGM && actor?.isOwner===false)throw new Error('You do not own that character.');
  const grantKey=actor?.uuid||actor?.id;
  const oneUse=matchingBonusDiceAwards(actor,skill).some(award=>award.duration==='next');
  if(oneUse && pendingBonusRolls.has(grantKey))return {blocked:true,reason:'Another check is resolving the character’s one-use GM Bonus Dice.'};
  if(oneUse)pendingBonusRolls.add(grantKey);
  try{return await executeSkillRoll(actor,skill,options);}
  finally{if(oneUse)pendingBonusRolls.delete(grantKey);}
}
async function executeSkillRoll(actor, skill, options={}){
  const sit=situationalRules(actor,skill,options);if(sit.blocked){ui?.notifications?.warn?.(sit.reason);return {blocked:true,reason:sit.reason};}
  const keys=conditionKeys(actor),isVirtual=keys.has('virtual')||Boolean(actor.system.virtualSession?.active),isAI=actor.type==='ai'||actor.system.identity?.variant==='ai';
  if(isAI&&!isVirtual&&sit.baseLevel<3){const formula=sit.baseLevel===1?'1d6':'2d6';const elevated=sit.baseLevel===1?3:4;const effective=Math.max(1,elevated-Number(sit.levelPenalty||0));const allow=options.aiLicense===true?true:(options.aiLicense===false?false:await foundry.applications.api.DialogV2.confirm({window:{title:'AI License / Driver'},content:`<p>This AI is licensed below Skill Level 3. Download/extend a temporary license for <strong>${formula} EP</strong>? The license uses Skill Level ${elevated}${effective!==elevated?`, modified to ${effective} by current status effects`:''}.</p>`}));if(!allow){const reason='AI license restriction: Skills below Level 3 cannot be attempted in realspace without paying the listed Ego cost.';ui?.notifications?.warn?.(reason);return {blocked:true,reason};}const cost=Number((await new Roll(formula).evaluate()).total||0);await actor.applyEgoDamage(cost);sit.level=effective;sit.notes.push(`AI temporary license: -${cost} EP`);}
  if(options.enforceSpecialisation===true&&options.specialisation){
    const {specializationContext}=await import('./core-effect-engine-v2.mjs');
    const isPioneer=['science','data-analysis'].includes(normalizedId(skill.name))&&(actor.items?.contents||[...(actor.items||[])]).some(i=>i.type==='trait'&&i.system?.catalogId==='trait-170');
    const known=isPioneer||specializationContext(actor,skill,options.specialisation).known;
    if(!known){sit.difficulty+=Math.max(0,Number(options.missingSpecialisationDifficulty??1));sit.notes.push('Missing required Specialisation');}
  }
  const effectContext={skill:normalizedId(skill.name),attribute:normalizedId(sit.attribute),specialisation:normalizedId(options.specialisation||''),itemTag:options.itemTag||[],
    isSave:options.isSave===true,activity:options.activity||'',environment:options.environment||'',against:options.against||'',targetAware:options.targetAware??null,targetCount:options.targetCount??null,
    virtual:conditionKeys(actor).has('virtual')||Boolean(actor.system.virtualSession?.active),targetType:options.targetType||'',range:options.range||'',damageType:normalizedId(options.damageType||''),status:[...conditionKeys(actor)]};
  const effectResult=evaluateEffects(actor,effectContext);
  sit.level=Math.max(1,Math.min(5,derivedEffectValue(effectResult,'skill.level',sit.level)));
  sit.difficulty=derivedEffectValue(effectResult,'check.difficulty',sit.difficulty);
  if(effectContext.skill==='brawl'&&effectContext.itemTag.includes('unarmed')){const penalty=Math.max(0,derivedEffectValue(effectResult,'check.unarmedPenalty',2));sit.difficulty+=penalty;sit.notes.push(`Unarmed Attack: ${penalty} Difficulty`);}
  const extraDiceCount=Math.max(0,Math.min(10,Math.trunc(Number(effectResult.values['check.extraBonusDice']||0))));
  const sides=skillDie(sit.level), attr=sit.attribute;
  const virtualTrainingBonus=options.virtualTrainingBonus===true;
  if(virtualTrainingBonus&&(Number(actor.system.virtualTrainingBonusPool||0)<1||actor.system.virtualTrainingBonusAttribute!==skill.system.attribute))throw new Error('Virtual training Bonus Dice require a remaining training point and a Skill under the selected Attribute.');
  // GM awards are stored as independent keyed flags. Their skill-size dice
  // resolve against this check's current die, after conditions and Traits.
  const gmAwards=matchingBonusDiceAwards(actor,skill);
  const gmAwardDice=awardedDiceForRoll(gmAwards,sides);
  const skillRoll=await new Roll(`1d${sides}`).evaluate(), original=dieResult(skillRoll);
  const nonStackingBonus=Number(effectResult.values['check.nonStackingBonusDice']||0)>0;
  const ordinaryBonusDice=[...resolveBonusDice(options.bonusDice||[],sides),...(effectResult.values['check.bonusDie']||[]),...Array(extraDiceCount).fill(sides),...(virtualTrainingBonus?[sides]:[]),...gmAwardDice];
  const allBonusDice=ordinaryBonusDice.length?ordinaryBonusDice:nonStackingBonus?[sides]:[];
  const bonusDice=[];for(const d of allBonusDice){const ds=Number(d);if(!ds)continue;const r=await new Roll(`1d${ds}`).evaluate();bonusDice.push({sides:ds,result:dieResult(r),roll:r});}
  let luck=null;if(options.luckSides){const ds=Number(options.luckSides),r=await new Roll(`1d${ds}`).evaluate();luck={sides:ds,result:dieResult(r),roll:r};}
  let mode=options.luckMode||'none';
  if(mode==='dumb'&&luck){
    const cost=Math.abs(original-luck.result);const legal=luck.result!==1&&luck.result!==luck.sides&&cost<=Number(actor.system.resources.stackPoints.value||0);
    if(legal){const use=await foundry.applications.api.DialogV2.confirm({window:{title:'Dumb Luck'},content:`<p>Replace the Skill result <strong>${original}</strong> with Luck <strong>${luck.result}</strong> for <strong>${cost} SP</strong>?</p>`});if(use&&cost)await actor.spendStackPoints(cost);else mode='none';}else mode='none';
  }
  const input={skillResult:original,skillSides:sides,bonusResults:bonusDice.map(x=>x.result),luckResult:luck?.result??null,luckSides:luck?.sides??null,luckMode:mode,attribute:actor.system.attributes[attr],baseTR:options.baseTR??null,difficulty:sit.difficulty,bonus:Number(options.bonus||0)+(options.isEgoSave===true&&options.isSave===true?Number(effectResult.values['check.egoSave']||0):0),training:derivedEffectValue(effectResult,'check.training',Math.max(0,Number(skill.system.trainingBonus||0))),trainingBonuses:options.trainingBonuses||[],gearBonus:derivedEffectValue(effectResult,'check.gear',Number(options.gearBonus||0)),gearBonuses:[...(options.gearBonuses||[]),Number(sit.drugGearBonus||0)].filter(x=>Number(x)>0),stackableBonuses:options.stackableBonuses||[]};
  const out=resolveCheck(input);
  if(virtualTrainingBonus){await actor.update({'system.virtualTrainingBonusPool':Number(actor.system.virtualTrainingBonusPool)-1});sit.notes.push('Virtual Instruction: 1 pool point spent for a Bonus Die');}
  const result={actorUuid:actor.uuid,skillUuid:skill.uuid,sides,attribute:attr,original,bonusDice:bonusDice.map(({sides,result})=>({sides,result})),luck:luck&&{sides:luck.sides,result:luck.result},luckMode:mode,best:out.bestResult,ace:out.ace,stroke:out.stroke,catastrophe:out.catastrophe,spCost:out.spCost,success:out.success,successDegrees:out.successDegrees,failureDegrees:out.failureDegrees,tr:out.targetResult,notes:[...sit.notes,...effectResult.applied.map(e=>`${e.source}: ${e.key} ${e.mode} ${e.value}`)],effectErrors:effectResult.errors,
    gmBonusAwardIds:gmAwards.map(award=>award.id),
    gmBonusAwards:gmAwards.map(award=>({id:award.id,label:award.label||'GM Bonus Dice',description:award.description,duration:award.duration}))};
  if(options.chat!==false){
    const tags=[...sit.notes];
    const flavor=renderCheckCard({actorName:actor.name,skillName:skill.name,result,contextLabel:options.contextLabel||'',tags});
    const rollMode=options.rollMode||'publicroll';
    const whisper=Array.isArray(options.whisper)?options.whisper:(rollMode==='selfroll'?[game.user.id]:(['gmroll','blindroll'].includes(rollMode)?ChatMessage.getWhisperRecipients('GM').map(u=>u.id):[]));
    const extraFlags=options.chatFlags&&typeof options.chatFlags==='object'?options.chatFlags:{};
    const message=await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content:flavor,rolls:[skillRoll,...bonusDice.map(x=>x.roll),...(luck?[luck.roll]:[])],whisper,blind:rollMode==='blindroll',flags:{'altered-carbon-rpg':{check:result,...extraFlags}}});
    result.chatMessageId=message?.id||null;
    // Post a separate GM-only chat card: neither public roll flags nor the
    // player's check HTML contain private pending Trait decisions.
    try{if(options.skipTraitAdjudication!==true)await postTraitAdjudication(actor,{event:options.adjudicationKind||(options.isSave?'defense':'check'),skill:normalizedId(skill.name),itemTags:options.itemTag||[],originMessageId:message?.id});}
    catch(error){console.error('Altered Carbon | Trait prompt failed',error);ui?.notifications?.warn?.('Trait adjudication prompt could not be posted; GM should review the owned Traits.');}
  }
  // Never consume a one-use award for a blocked check, cancelled license,
  // invalid die, or a chat-write failure. This code only runs after success.
  if(gmAwards.length){
    const used=await consumeBonusDiceAwards(actor,gmAwards);
    result.gmBonusSpentIds=used;
  }
  return result;
}

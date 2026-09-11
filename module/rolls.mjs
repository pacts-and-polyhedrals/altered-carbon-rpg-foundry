import {skillDie, resolveCheck} from './rules-engine.mjs';

function dieResult(roll){return roll.dice?.[0]?.results?.[0]?.result ?? roll.total;}
function normalizedId(name=''){return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function conditionKeys(actor){return new Set(actor.items.filter(i=>i.type==='condition').map(i=>i.system.key||i.system.catalogId||normalizedId(i.name)));}
function injuryCount(actor,key){return actor.items.filter(i=>i.type==='injury'&&i.system.active&&(i.system.key||i.system.catalogId)===key).reduce((n,i)=>n+Number(i.system.count||1),0);}

function situationalRules(actor,skill,options={}){
  const c=conditionKeys(actor); let difficulty=Number(options.difficulty||0); const baseLevel=Number(skill.system.level||1); let level=baseLevel; let levelPenalty=0; let attribute=skill.system.attribute;
  const skillId=normalizedId(skill.name); const notes=[];
  if(c.has('incapacitated'))return {blocked:true,reason:'Incapacitated characters cannot make Skill Checks.'};
  if(c.has('virtual')){
    if(attribute==='strength')attribute='willpower'; else if(attribute==='perception')attribute='acuity';
    if(['strength','perception'].includes(skill.system.attribute)){const isAI=actor.type==='ai'||actor.system.identity.variant==='ai';difficulty+=isAI?0:(actor.system.identity.variant==='envoy'?1:3);if(!isAI)notes.push('Virtual projection');}
  }
  if(c.has('dazzled')&&options.sightOnly)return {blocked:true,reason:'Dazzled: this check relies exclusively on sight and automatically fails.'};
  if(c.has('dazzled')&&options.sightReliant){levelPenalty+=1;level=Math.max(1,baseLevel-levelPenalty);notes.push('Dazzled: Skill Level reduced');}
  if(c.has('prone')){difficulty+=1;notes.push('Prone');}
  const mal=actor.items.find(i=>i.type==='condition'&&(i.system.key||i.system.catalogId)==='malnourished');if(mal){const d=Number(mal.system.severity||mal.system.difficulty||2)||2;difficulty+=Math.max(2,d);notes.push(`Malnourished -${Math.max(2,d)}`);}
  if(c.has('enraged')){
    if(['intelligence','acuity'].includes(attribute))return {blocked:true,reason:'Enraged characters cannot make Intelligence or Acuity checks.'};
    if(attribute!=='strength'){difficulty+=2;notes.push('Enraged');}
  }
  if(c.has('panic')&&['strength','perception','acuity','intelligence'].includes(attribute)){levelPenalty+=1;level=Math.max(1,baseLevel-levelPenalty);notes.push('Panic: Skill Level reduced');}
  if(c.has('drenched')&&['composure','discipline','endurance','survival'].includes(skillId)){difficulty+=2;notes.push('Drenched');}
  if(c.has('out-of-place')&&['stealth','diplomacy','expression'].includes(skillId)){difficulty+=1;notes.push('Out of Place');}
  const enc=actor.ac?.cargo?.level||0;if(enc&&attribute==='strength'){difficulty+=enc;notes.push(`Encumbered ${enc}`);}
  const bone=injuryCount(actor,'bone');if(bone&&attribute==='strength'){difficulty+=bone;notes.push(`Bone Injury ${bone}`);}
  return {blocked:false,difficulty,baseLevel,levelPenalty,level,attribute,notes};
}

export async function rollSkill(actor, skill, options={}){
  const sit=situationalRules(actor,skill,options);if(sit.blocked){ui?.notifications?.warn?.(sit.reason);return {blocked:true,reason:sit.reason};}
  const keys=conditionKeys(actor),isVirtual=keys.has('virtual'),isAI=actor.type==='ai'||actor.system.identity?.variant==='ai';
  if(isAI&&!isVirtual&&sit.baseLevel<3){const formula=sit.baseLevel===1?'1d6':'2d6';const elevated=sit.baseLevel===1?3:4;const effective=Math.max(1,elevated-Number(sit.levelPenalty||0));const allow=options.aiLicense===true?true:(options.aiLicense===false?false:await foundry.applications.api.DialogV2.confirm({window:{title:'AI License / Driver'},content:`<p>This AI is licensed below Skill Level 3. Download/extend a temporary license for <strong>${formula} EP</strong>? The license uses Skill Level ${elevated}${effective!==elevated?`, modified to ${effective} by current status effects`:''}.</p>`}));if(!allow){const reason='AI license restriction: Skills below Level 3 cannot be attempted in realspace without paying the listed Ego cost.';ui?.notifications?.warn?.(reason);return {blocked:true,reason};}const cost=Number((await new Roll(formula).evaluate()).total||0);await actor.applyEgoDamage(cost);sit.level=effective;sit.notes.push(`AI temporary license: -${cost} EP`);}
  const sides=skillDie(sit.level), attr=sit.attribute;
  const skillRoll=await new Roll(`1d${sides}`).evaluate(), original=dieResult(skillRoll);
  const bonusDice=[];for(const d of options.bonusDice||[]){const ds=Number(d);if(!ds)continue;const r=await new Roll(`1d${ds}`).evaluate();bonusDice.push({sides:ds,result:dieResult(r),roll:r});}
  let luck=null;if(options.luckSides){const ds=Number(options.luckSides),r=await new Roll(`1d${ds}`).evaluate();luck={sides:ds,result:dieResult(r),roll:r};}
  let mode=options.luckMode||'none';
  if(mode==='dumb'&&luck){
    const cost=Math.abs(original-luck.result);const legal=luck.result!==1&&luck.result!==luck.sides&&cost<=Number(actor.system.resources.stackPoints.value||0);
    if(legal){const use=await foundry.applications.api.DialogV2.confirm({window:{title:'Dumb Luck'},content:`<p>Replace the Skill result <strong>${original}</strong> with Luck <strong>${luck.result}</strong> for <strong>${cost} SP</strong>?</p>`});if(use&&cost)await actor.spendStackPoints(cost);else mode='none';}else mode='none';
  }
  const input={skillResult:original,skillSides:sides,bonusResults:bonusDice.map(x=>x.result),luckResult:luck?.result??null,luckSides:luck?.sides??null,luckMode:mode,attribute:actor.system.attributes[attr],baseTR:options.baseTR??null,difficulty:sit.difficulty,bonus:Number(options.bonus||0),training:Number(skill.system.trainingBonus||0),trainingBonuses:options.trainingBonuses||[],gearBonus:Number(options.gearBonus||0),gearBonuses:options.gearBonuses||[],stackableBonuses:options.stackableBonuses||[]};
  const out=resolveCheck(input);
  const result={actorUuid:actor.uuid,skillUuid:skill.uuid,sides,attribute:attr,original,bonusDice:bonusDice.map(({sides,result})=>({sides,result})),luck:luck&&{sides:luck.sides,result:luck.result},luckMode:mode,best:out.bestResult,ace:out.ace,stroke:out.stroke,catastrophe:out.catastrophe,spCost:out.spCost,success:out.success,successDegrees:out.successDegrees,failureDegrees:out.failureDegrees,tr:out.targetResult,notes:sit.notes};
  if(options.chat!==false){
    const tags=[result.ace?'ACE':'',result.stroke?'STROKE OF LUCK':'',result.catastrophe?'CATASTROPHE':'',...sit.notes].filter(Boolean).join(' · ');
    const flavor=`<section class="ac-chat-card"><header><strong>${foundry.utils.escapeHTML(actor.name)} — ${foundry.utils.escapeHTML(skill.name)}</strong></header><p>TR <b>${result.tr}</b> · Best <b>${result.best}</b> · ${result.success?`Success +${result.successDegrees}`:`Failure -${result.failureDegrees}`}${tags?` · ${foundry.utils.escapeHTML(tags)}`:''}</p></section>`;
    const rollMode=options.rollMode||'publicroll';const whisper=rollMode==='selfroll'?[game.user.id]:(['gmroll','blindroll'].includes(rollMode)?ChatMessage.getWhisperRecipients('GM').map(u=>u.id):[]);
    await ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content:flavor,rolls:[skillRoll,...bonusDice.map(x=>x.roll),...(luck?[luck.roll]:[])],whisper,blind:rollMode==='blindroll',flags:{'altered-carbon-rpg':{check:result}}});
  }
  return result;
}

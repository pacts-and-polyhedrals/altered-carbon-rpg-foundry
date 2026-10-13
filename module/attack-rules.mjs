/** Deterministic 2020 Core combat rules (pp.89–90, 100–105, 125, 198–200).
 * No Foundry globals. Narrative and model-specific effects stay explicit GM choices.
 */
export const skillKey=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function attackDegrees(result={},mode={}){
  if(result.catastrophe)return 0;
  // Burst/automatic Use grants positive Degrees even if the Check also fails (p.201).
  return Math.min(5,Math.max(0,Number(result.successDegrees||0)+Number(mode.extraDegrees||0)));
}
export function combatAceBenefit(result={},skill='',perceptionBonus=0){
  if(!result.ace)return {wounds:0,speedDice:0,note:''};
  const key=skillKey(skill);
  if(['firearms','directed-energy-weapons'].includes(key))return {wounds:Math.max(0,Number(perceptionBonus)||0),speedDice:0,note:'Ace: add Perception Bonus in Wounds to each attack resolved (Core p.104).'};
  if(['brawl','melee-combat'].includes(key))return {wounds:0,speedDice:1,note:'Ace: roll one additional Speed Die immediately (Core pp.101–102).'};
  if(key==='throw')return {wounds:0,speedDice:0,note:'Ace: use the Throw skill’s published weapon-specific benefit (Core p.105).'};
  return {wounds:0,speedDice:0,note:'Ace: apply this Skill’s Special entry; no universal doubled damage.'};
}
export function defenseResolution(positive=0,result={},strategy='cancel'){
  const plus=Math.max(0,Number(result.successDegrees)||0),minus=Math.max(0,Number(result.failureDegrees)||0);
  return {degrees:Math.min(5,Math.max(0,(Number(positive)||0)-(strategy==='cancel'?plus:0)+minus)),cancelled:strategy==='cancel'?Math.min(positive,plus):0,added:minus};
}
export function accuracySaveDifficulty(accuracy=0,repeats=1){return Number(repeats)>1?Math.max(0,Number(accuracy)||0):0;}
export function mayRepeatHit(weapon){
  const s=weapon?.system||{};
  // Accuracy without X repeats too; X controls only the Save penalty.
  return Number(s.accuracy)>0||/\baccuracy\b/i.test(String(s.triggeredEffects||''));
}
/** Validate the ENTIRE formula, rather than silently extracting its first die. */
export function damageFormula(raw,actor={}){
  const attrs=actor.system?.attributes||{},bonuses=actor.ac?.bonuses||{};
  const attrNames={SB:'strength',PB:'perception',WB:'willpower',AB:'acuity',IB:'intelligence',EB:'empathy'};
  if(actor.system?.virtualSession?.active){attrNames.SB='willpower';attrNames.PB='acuity';}
  let source=String(raw??'').trim();
  for(const [symbol,attribute] of Object.entries(attrNames))source=source.replace(new RegExp('\\b'+symbol+'\\b','gi'),String(Number(bonuses[attribute]??Math.floor(Number(attrs[attribute]||0)/10))));
  source=source.replace(/\[(?:[^\]]*)\]/g,'').replace(/\b(?:EP|HP|Wounds?|Damage)\b/gi,'').replace(/\s+/g,'');
  if(!source||/[^\ddD+\-()]/.test(source))return null;
  const tokens=source.match(/\d*d\d+|\d+|[()+-]/gi)||[];
  if(tokens.join('').toLowerCase()!==source.toLowerCase())return null;
  let depth=0,expectValue=true;
  for(const token of tokens){
    if(token==='('){if(!expectValue)return null;depth++;}
    else if(token===')'){if(expectValue||depth--<=0)return null;expectValue=false;}
    else if(token==='+'||token==='-'){if(expectValue)return null;expectValue=true;}
    else{if(!expectValue)return null;const die=token.match(/^(\d*)d(\d+)$/i);if(die&&(Number(die[1]||1)<1||Number(die[1]||1)>100||Number(die[2])<2||Number(die[2])>1000))return null;expectValue=false;}
  }
  return depth===0&&!expectValue?source:null;
}
export function damageApplicationKey(messageId,targetUuid){return `${String(messageId)}:${String(targetUuid)}`;}

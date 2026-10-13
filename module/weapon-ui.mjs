/** Attack dialog connects Zone Assistant, ammo, armour, and special attacks. */
import {ammoCompatibility,ammunitionProfile,attackRange,advancedAttack,armourProfile,upgradeModifiers,targetSleeveType} from './combat-equipment.mjs';
import {rangeBetweenTokens,getCombatCover} from './combat-workflow.mjs';
import {useWeapon} from './chat-actions.mjs';
import {specializationContext} from './core-effect-engine-v2.mjs';
import {speedOptions,attackActionPenalty} from './attack-defense.mjs';
import {conditionKeys} from './condition-state.mjs';
const esc=s=>foundry.utils.escapeHTML(String(s??''));
const input=(f,k)=>f instanceof FormData?f.get(k):f?.[k];
const checked=(f,k)=>Boolean(input(f,k));
const getTarget=()=>[...game.user.targets]?.[0]||null;
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function weaponSkill(actor,weapon){const id=normalize(weapon.system.skill||'firearms');return actor.items.find(i=>i.type==='skill'&&(normalize(i.system.catalogId)===id||normalize(i.name)===id))||actor.items.find(i=>i.type==='skill'&&normalize(i.name).includes(id));}
export function weaponSpecialisationPenalty(actor,weapon,skill){const spec=String(weapon.system.specialisation||'').trim();if(!spec)return 0;const owned=specializationContext(actor,skill,spec).known||actor.items.some(i=>i.type==='specialisation'&&normalize(i.system.skill)===normalize(skill.name)&&(normalize(i.name)===normalize(spec)||normalize(spec).includes(normalize(i.name))||normalize(i.name).includes(normalize(spec))));return owned?0:Number(weapon.system.untrainedDifficulty||0);}
export async function startWeaponAttack(actor,weapon,checkOptionsDialog){
 if(actor.getFlag?.('altered-carbon-rpg','stance')==='full-defense')throw new Error('End Full Defense before making a weapon attack.');
 const skill=weaponSkill(actor,weapon);if(!skill)return ui.notifications.warn(`No matching Skill for ${weapon.name}.`);
 const target=getTarget(),targetActor=target?.actor||null;const actorToken=actor.getActiveTokens?.()?.find(t=>t.isControlled)||actor.getActiveTokens?.()?.[0]||canvas?.tokens?.controlled?.[0];
 if(targetActor&&conditionKeys(targetActor).has('hidden'))throw new Error('Hidden targets must first be revealed with Detection.');
 const speed=speedOptions(actor,{activeOnly:true});
 if(speed.combatant&&(!speed.revealed||!['check','resolution'].includes(speed.phase)||!speed.dice.length))throw new Error('Reveal Speed Dice, enter Check and retain at least one Active die before attacking.');
 const speedHTML=speed.combatant?`<fieldset><legend>Active Speed Dice to resolve (one for Hit; add dice for drawing, movement, or equipment costs)</legend>${speed.dice.map((d,i)=>`<label><input type="checkbox" name="speed-${d.index}" ${i===0?'checked':''}> Die ${d.index+1}: ${d.result}</label>`).join('')}</fieldset>`:'';
 const detected=actorToken&&target?rangeBetweenTokens(actorToken,target):{zone:'unknown',steps:0};
 const eligible=actor.items.filter(i=>i.type==='ammunition'&&Number(i.system.quantity||0)>0&&ammoCompatibility(weapon,i).allowed);
 const ammoOptions=[`<option value="">Standard / built-in ammunition</option>`,...eligible.map(i=>`<option value="${esc(i.id)}">${esc(i.name)} (${i.system.quantity})</option>`)].join('');
 const zoneOptions=['shared','adjacent','distant'].map(z=>`<option value="${z}" ${detected.zone===z?'selected':''}>${z[0].toUpperCase()+z.slice(1)}</option>`).join('');
 const form=await foundry.applications.api.DialogV2.input({window:{title:`Tactical Attack — ${weapon.name}`},content:`
  <p>Confirm the target, Zone and attack procedure. ${targetActor?`Target: <strong>${esc(targetActor.name)}</strong>.`:'No token targeted; damage target may need GM selection.'}</p>
  <label>Target Zone</label><select name="zone"><option value="">Choose a Zone...</option>${zoneOptions}</select>
  <label>Zone boundaries (Distant only)</label><input type="number" name="steps" min="2" max="99" value="${Math.max(2,Number(detected.steps||2))}">
  <label>Attack option</label><select name="action"><option value="normal">Normal Attack</option><option value="stun">Stun</option><option value="disarm">Disarm</option><option value="suppression">Suppression Fire (guided)</option><option value="blast">Blast (guided)</option><option value="headshot">Optional Hit Location d12</option></select>
  <label>Ammunition</label><select name="ammo">${ammoOptions}</select>
  <label><input type="checkbox" name="deployed" ${actor.getFlag?.('altered-carbon-rpg','stance')==='deployed'?'checked':''}> Deployed (no Move Action)</label>
  <label><input type="checkbox" name="aimed"> Aimed this action</label>
  <label><input type="checkbox" name="engaged"> Target is Engaged (required for Melee/Grapple)</label>
  ${speedHTML}
  <p class="hint">Zone penalties, Defense and Cover will prefill Difficulty. Range assumes connected GM-authored Zones; opacity and unusual perspectives still require a GM ruling.</p>`});
 if(!form)return null;const zone=input(form,'zone');if(!zone)throw new Error('Choose a target Zone; unknown Zones cannot silently count as Shared.');
 const action=input(form,'action')||'normal',steps=Number(input(form,'steps')||2),deployed=checked(form,'deployed'),aimed=checked(form,'aimed'),engaged=checked(form,'engaged');
 const speedIndexes=speed.dice.filter(d=>checked(form,`speed-${d.index}`)).map(d=>d.index);if(speed.combatant&&!speedIndexes.length)throw new Error('Select at least one Active Speed Die.');
 const ammo=actor.items.get(input(form,'ammo'))||null;if(ammo&&!ammoCompatibility(weapon,ammo).allowed)throw new Error(ammoCompatibility(weapon,ammo).reason);
 if(['grapple','parry','dodge'].includes(action))throw new Error('Grapple uses opposed committed Speed Dice; Parry/Dodge use defensive Save Throws. Open the Combat Console.');
 const special=advancedAttack(action,{weapon,ammo,zone,engaged});if(!special.allowed)throw new Error(special.reason);
 const range=attackRange({zone,steps,weapon,deployed});if(!range.allowed)throw new Error(range.reason);
 if(['melee-combat','brawl','martial-arts'].includes(normalize(weapon.system.skill))&&!engaged)throw new Error('A Melee Attack requires an Engaged target in the Shared Zone.');
 const upgrade=upgradeModifiers(weapon,{zone,aimed,deployed});let rangePenalty=range.penalty;
 if(zone==='distant'&&upgrade.ignoreDistant){const reduced=Math.max(1,steps-upgrade.ignoreDistant);rangePenalty=reduced===1?2:3*reduced;}
 const targetType=targetSleeveType(targetActor),ammoResult=ammunitionProfile(ammo,{targetType,zone});
 const damageType=ammoResult.damageType||weapon.system.damageType||'';
 const cover=getCombatCover(targetActor,{damageType,armorPiercing:Boolean(ammoResult.armorPiercing||weapon.system.armorPiercing)});
 const defenses=targetActor?armourProfile(targetActor.items?.contents||[],{damageType,armorPiercing:Boolean(ammoResult.armorPiercing||weapon.system.armorPiercing),cover,baseDefense:Number(targetActor.system.defense||0)+Number(targetActor.ac?.effects?.values?.defense||0)}):null;
 const difficulty=weaponSpecialisationPenalty(actor,weapon,skill)+rangePenalty+upgrade.difficulty+Number(defenses?.defense||0)+attackActionPenalty(actor);
 if(!Number.isFinite(difficulty))throw new Error('Unable to calculate legal attack difficulty.');
 const count=Math.max(0,Number(weapon.system.bonusDiceCount||0)),bonusDice=weapon.system.bonusDice||Array.from({length:count},()=>skill.skillDieSides).join(',');
 const opts=await checkOptionsDialog(skill,{difficulty,gearBonus:Math.max(Number(weapon.system.gearBonus||0),upgrade.gearBonus),bonusDice});if(!opts)return null;
 if(targetActor?.getFlag?.('altered-carbon-rpg','stance')==='full-defense'&&!opts.luckSides)throw new Error('Full Defense requires a GM-selected Luck Die (Core p.136). Select it in the Check dialog.');
 const notes=[...special.notes,...range.review,...upgrade.notes,...ammoResult.notes,...ammoResult.review,...(defenses?.issues||[])];
 const tags=(await import('./core-effect-engine-v2.mjs')).equipmentTags(weapon);if(weapon.id==='unarmed')tags.push('unarmed');
 const unarmedAgainstArmed=weapon.id==='unarmed'&&Boolean(targetActor?.items?.some(i=>i.type==='weapon'&&i.system.equipState==='equipped'||i.type==='armour'&&i.system.equipState==='worn'&&i.system.battleArmor));
 return useWeapon(actor,weapon,{...opts,itemTag:tags,speedIndexes,unarmedAgainstArmed,targetCount:Math.max(1,game.user.targets?.size||1),bonus:Number(opts.bonus||0)+Number(special.bonus||0),ammunitionUuid:ammo?.uuid||null,targetActorUuid:targetActor?.uuid||null,targetType,range:zone,damageType,attackAction:action,attackNotes:notes,allowDamage:special.allowDamage,zoneSteps:steps,aimed,deployed,engaged,armorDefense:Number(defenses?.defense||0)});
}

/** Persistent tactical state and per-Resolution Wound queue. Foundry runtime adapter. */
import {zoneDistance,resolutionPreview,damageMatches} from './combat-equipment.mjs';
import {evaluateEffects,derivedEffectValue} from './effects.mjs';
import {applyProtection} from './rules-engine.mjs';
export const NS='altered-carbon-rpg';
export const COVER_PRESETS=Object.freeze({
 none:{label:'No Cover',defense:0,protection:0,damageTypes:''},
 brush:{label:'Brush / Grass / Glass',defense:1,partialDefense:0,protection:0,damageTypes:''},
 bulletproof:{label:'Bulletproof Window',defense:1,partialDefense:1,protection:0,damageTypes:'Bludgeoning, Piercing, Slashing, Electrical'},
 wood:{label:'Wood / Drywall',defense:2,partialDefense:1,protection:0,damageTypes:'Bludgeoning, Slashing'},
 concrete:{label:'Concrete / Stone',defense:3,partialDefense:2,protection:1,damageTypes:'Bludgeoning, Piercing, Slashing, Electrical'},
 metal:{label:'Thin Sheet Metal',defense:3,partialDefense:2,protection:2,damageTypes:'Bludgeoning, Slashing'},
 steel:{label:'Thick Sheet Metal',defense:3,partialDefense:2,protection:3,damageTypes:'Bludgeoning, Slashing'},
 ferrocrete:{label:'Ferrocrete',defense:4,partialDefense:2,protection:4,armorPiercingProtection:2,damageTypes:'Bludgeoning, Piercing, Slashing, Thermal, Electrical'}
});
export function combatTurnKey(combat=game.combat){if(!combat)return 'outside-combat';const turn=combat.getFlag(NS,'state')?.turn??combat.round??0;return `${combat.id}:${turn}`;}
export function isMinion(actor){return actor?.type==='threat'&&(actor.getFlag?.(NS,'selectedMinion')||Number(actor.system?.minionBonus||0)>0);}
export function combatRoundKey(combat=game.combat){return `${combatTurnKey(combat)}:r${combat?.getFlag?.(NS,'state')?.round??combat?.turn??0}`;}
export function getCombatCover(actor,{damageType='',armorPiercing=false}={}){
 const state=actor?.getFlag?.(NS,'cover')||{kind:'none',partial:false},preset=COVER_PRESETS[state.kind]||COVER_PRESETS.none;
 const defense=state.kind==='none'?0:Number(state.defense??(state.partial?preset.partialDefense??preset.defense:preset.defense));
 let protection=Number(state.protection??preset.protection??0);
 if(armorPiercing)protection=Number(preset.armorPiercingProtection||0);
 if(!(damageMatches(state.damageTypes??preset.damageTypes,damageType)))protection=0;
 return {label:preset.label,defense,protection,armorPiercingSafe:Boolean(armorPiercing&&preset.armorPiercingProtection),kind:state.kind,partial:Boolean(state.partial)};
}
export function getZoneGraph(scene=canvas?.scene){const raw=scene?.getFlag?.(NS,'zoneGraph')||{zones:[]};return {zones:Array.isArray(raw.zones)?raw.zones:[]};}
export function rangeBetweenTokens(attacker,target,scene=canvas?.scene){
 const a=attacker?.document||attacker,b=target?.document||target;
 const zoneA=a?.getFlag?.(NS,'zone')||'',zoneB=b?.getFlag?.(NS,'zone')||'';
 return zoneDistance(getZoneGraph(scene).zones,zoneA,zoneB);
}
export async function queueIncomingDamage(actor,event,{turnKey=isMinion(actor)?combatRoundKey():combatTurnKey()}={}){
 if(!actor?.isOwner&&!game.user.isGM)throw new Error('Target ownership or GM access is required.');
 const wounds=Number(event.wounds);if(!Number.isFinite(wounds)||wounds<0)throw new Error('Wounds must be a non-negative number.');
 const before=actor.getFlag(NS,'damageQueue')||{};
 if(before.entries?.length&&before.turnKey!==turnKey)throw new Error(`Unresolved damage remains from ${before.turnKey}. Resolve or discard it before a new Turn.`);
 const entries=[...(before.entries||[])];
 const id=String(event.id||'').trim();if(!id)throw new Error('Queued Wounds require a unique source message ID.');
 if(entries.some(e=>e.id===id))return {duplicate:true,entries,turnKey};
 if(actor.getFlag(NS,`damageApplied-${id}`))return {duplicate:true,entries,turnKey};
 const deadlyHP=Number(event.deadlyHP||0),defenseProtection=Number(event.defenseProtection||0);if(!Number.isFinite(deadlyHP)||deadlyHP<0||deadlyHP>wounds||!Number.isFinite(defenseProtection)||defenseProtection<0)throw new Error('Invalid Deadly/defensive Protection amount.');
 entries.push({id,wounds,damageType:String(event.damageType||''),armorPiercing:Boolean(event.armorPiercing),deadly:Number(event.deadly||0),deadlyHP,defenseProtection,ace:Boolean(event.ace),source:String(event.source||'')});
 await actor.setFlag(NS,'damageQueue',{turnKey,entries});return {duplicate:false,entries,turnKey};
}
export function pendingDamage(actor){return actor?.getFlag?.(NS,'damageQueue')||{turnKey:null,entries:[]};}
export async function resolvePendingDamage(actor,{protectionOverride=null,minionOutcome='incapacitated'}={}){
 if(!actor?.isOwner&&!game.user.isGM)throw new Error('Insufficient permission to resolve damage.');
 const queue=pendingDamage(actor);if(!queue.entries?.length)throw new Error('No queued Wounds for this Actor.');
 const cover=getCombatCover(actor,{damageType:queue.entries[0].damageType,armorPiercing:queue.entries[0].armorPiercing});
 const attack=queue.entries[0],effects=evaluateEffects(actor,{damageType:String(attack.damageType||'').toLowerCase(),armorPiercing:Boolean(attack.armorPiercing)});
 const profileAug=derivedEffectValue(effects,'armor.protection',0);
 const preview=resolutionPreview(queue.entries,actor.items?.contents||[],{baseProtection:derivedEffectValue(effects,'protection',0),augmentationProtection:profileAug,cover});
 if(preview.needsGMReview&&protectionOverride===null)throw new Error('Mixed/invalid armour: confirm Protection in the Resolution dialog.');
 const defensiveProtection=queue.entries.reduce((n,e)=>n+Number(e.defenseProtection||0),0);
 const protection=protectionOverride===null?preview.protection+defensiveProtection:Math.max(0,Number(protectionOverride)||0);
 if(isMinion(actor)){
   if(!['dead','incapacitated'].includes(minionOutcome))throw new Error('Choose a legal Minion defeat outcome.');
   const wounds=applyProtection(preview.incoming,protection),threshold=Number(actor.system.resources.health.max||0)+Number(actor.system.minionBonus||0),defeated=wounds>=threshold;
   const hp=Number(actor.system.resources.health.value||0);
   if(defeated){if(minionOutcome==='dead')await actor.loseHealth(hp);else await actor.applyCondition('incapacitated','Incapacitated','Defeated Minion (Core pp.285–286).');}
   // Below the Round threshold, no Wounds persist into another Round.
   await actor.update({'system.resources.wounds.value':0});
   for(const event of queue.entries)await actor.setFlag(NS,`damageApplied-${event.id}`,{turnKey:queue.turnKey,minion:true});
   await actor.unsetFlag(NS,'damageQueue');
   return {minion:true,defeated,threshold,preview,protection,directHP:0,turnKey:queue.turnKey,events:queue.entries,result:{appliedWounds:wounds,newWounds:0,healthLoss:defeated&&minionOutcome==='dead'?hp:0,newHealth:actor.system.resources.health.value}};
 }
 const result=await actor.applyTurnWounds(preview.incoming,{protection});
 const totalDeadly=queue.entries.reduce((n,e)=>n+Number(e.deadlyHP||0),0);
 const nonDeadly=Math.max(0,preview.incoming-totalDeadly);
 const deadliest=Math.max(0,totalDeadly-Math.max(0,protection-nonDeadly));
 if(deadliest)await actor.loseHealth(deadliest);
 for(const event of queue.entries)await actor.setFlag(NS,`damageApplied-${event.id}`,{turnKey:queue.turnKey,wounds:event.wounds});
 await actor.unsetFlag(NS,'damageQueue');
 const injuryRequired=result.healthLoss+deadliest>0||queue.entries.some(e=>e.ace&&Number(e.wounds)>Number(actor.ac?.bonuses?.strength||0));
 if(injuryRequired){const {postDamageSaveCard}=await import('./damage-saves.mjs');await postDamageSaveCard(actor,{injury:true,turnKey:queue.turnKey,damageType:queue.entries[0].damageType,instant:queue.entries.some(e=>Number(e.wounds)>Number(actor.ac?.damageThreshold||0))});}
 return {result,preview,protection,directHP:deadliest,events:queue.entries,turnKey:queue.turnKey};
}
export async function setCombatCover(actor,{kind='none',partial=false,defense=null,protection=null}={}){
 if(!COVER_PRESETS[kind])throw new Error('Unknown cover material.');
 const state={kind,partial:Boolean(partial)};if(defense!==null)state.defense=Number(defense);if(protection!==null)state.protection=Number(protection);
 return actor.setFlag(NS,'cover',state);
}

/** Resolve Grapple with existing combat Speed Dice, NOT new independent rolls. */
export async function performGrappleContest(combat,attacker,defender,attackerIndex,defenderIndex,{engaged=false}={}){
 if(!game.user.isGM)throw new Error('Only GM can finalize an opposed Grapple.');
 if(!engaged)throw new Error('Attacker and defender must already be Engaged in a Shared Zone.');
 if(!combat||attacker?.parent?.id!==combat.id||defender?.parent?.id!==combat.id||attacker===defender)throw new Error('Choose two distinct Combatants in this active Combat.');
 const get=(c,index)=>{const s=c.getFlag(NS,'speed')||{},i=Number(index);if(!Number.isInteger(i)||!(s.revealedActiveIndexes||[]).includes(i)||(s.spentIndexes||[]).includes(i))throw new Error(`${c.name}: choose one revealed, unspent Active Speed Die.`);return {s,i,roll:s.results?.[i]};};
 const a=get(attacker,attackerIndex),b=get(defender,defenderIndex);
 const {grappleContest}=await import('./combat-equipment.mjs');
 const out=grappleContest(a.roll,b.roll,attacker.actor?.ac?.bonuses?.perception||0,defender.actor?.ac?.bonuses?.perception||0);
 await combat.updateEmbeddedDocuments('Combatant',[{_id:attacker.id,flags:{[NS]:{speed:{...a.s,spentIndexes:[...new Set([...(a.s.spentIndexes||[]),a.i])],revealedActiveIndexes:a.s.revealedActiveIndexes.filter(i=>i!==a.i)}}}},{_id:defender.id,flags:{[NS]:{speed:{...b.s,spentIndexes:[...new Set([...(b.s.spentIndexes||[]),b.i])],revealedActiveIndexes:b.s.revealedActiveIndexes.filter(i=>i!==b.i)}}}}]);
 if(out.grappled){await attacker.actor.setFlag(NS,'grappledWith',defender.actor.uuid);await defender.actor.setFlag(NS,'grappledWith',attacker.actor.uuid);}
 const esc=s=>foundry.utils.escapeHTML(String(s??''));
 await ChatMessage.implementation.create({content:`<section class="ac-chat-card"><header class="ac-chat-card-header"><strong>Grapple // ${esc(attacker.name)} vs ${esc(defender.name)}</strong></header><p>Committed Speed Dice: ${a.roll} vs ${b.roll}. ${esc(out.reason)}</p>${out.grappled?'<p>Grapple initiated. GM may clear Grapple when a legal Break Grapple action succeeds.</p>':''}</section>`,speaker:ChatMessage.getSpeaker({actor:attacker.actor})});
 return {...out,attackerDie:a.roll,defenderDie:b.roll};
}
export async function clearGrapple(actor){if(!game.user.isGM)throw new Error('GM only: confirm the published Break Grapple action first.');const partnerId=actor?.getFlag(NS,'grappledWith');if(!partnerId)return false;const partner=await fromUuid(partnerId);await actor.unsetFlag(NS,'grappledWith');if(partner?.getFlag(NS,'grappledWith')===actor.uuid)await partner.unsetFlag(NS,'grappledWith');return true;}

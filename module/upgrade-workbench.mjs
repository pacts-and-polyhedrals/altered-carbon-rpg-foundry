/** Structured 2020 Chapter 6 upgrade installation and respec workflow. */
import {availableUpgradeNames,parseInstalledUpgrades,upgradePlan,respecPlan,chassisPlan} from './combat-equipment.mjs';
import {rollSkill} from './rolls.mjs';
import {ownedAdjudications,postTraitAdjudication} from './trait-adjudication.mjs';
const api=foundry.applications.api;
const esc=s=>foundry.utils.escapeHTML(String(s??''));
const formValue=(f,key)=>f instanceof FormData?f.get(key):f?.[key];
const checked=(f,key)=>f instanceof FormData?f.has(key):Boolean(f?.[key]);
let cache=null;
export async function genericWeaponUpgrades(){if(cache)return cache;const res=await fetch('systems/altered-carbon-rpg/data/equipment-upgrades.json');if(!res.ok)throw new Error('Generic Upgrade catalogue could not be loaded.');cache=(await res.json()).upgrades||[];return cache;}
const normalized=s=>String(s||'').trim().toLowerCase();
const skillOptions=actor=>actor.items.filter(i=>i.type==='skill').map(i=>`<option value="${esc(i.id)}">${esc(i.name)} (Lv.${Number(i.system.level||1)})</option>`).join('');
const kitOptions=actor=>actor.items.filter(i=>i.type==='equipment'&&Number(i.system.quantity||0)>0&&/upgrade kit/i.test(i.name)).map(i=>`<option value="${esc(i.id)}">${esc(i.name)} x${i.system.quantity}</option>`).join('');
function kitMatches(kit,upgradeName,item){const s=kit?.system||{},name=normalized(kit?.name);
  return kit?.type==='equipment'&&Number(s.quantity||0)>0&&name.includes('upgrade kit')&&(!s.upgradeFor||normalized(s.upgradeFor)===normalized(upgradeName))&&(!s.upgradeTargetCatalogId||s.upgradeTargetCatalogId===item.system.catalogId);
}
async function reviewUpgradeTraits(actor,action){
 const entries=ownedAdjudications(actor,{event:'upgrade'});
 if(!entries.length)return;
 // The review occurs before upgrade resources / kits are consumed. The GM
 // decides whether any Trait changes Q costs or prerequisites; this function
 // never silently edits an upgrade plan.
 await postTraitAdjudication(actor,{event:'upgrade'});
 const ok=await api.DialogV2.confirm({window:{title:'Core Trait upgrade review'},content:`<p>${entries.length} owned Trait(s) affect upgrade procedures or resource costs. Read their private GM chat card and confirm the listed prerequisites/costs before ${esc(action)}. This confirmation does not auto-apply an unimplemented effect.</p>`});
 if(!ok)throw new Error('Upgrade paused for GM Trait review.');
}
export async function performUpgrade(actor,item,upgrade,{kit=null,skill=null,rest=false,technician=false,gmOverride=false,generic=false,custom=false,notes='',linkedTo='',modelVariant=false,hardwired=false,attachment=false}={}){
 if(!actor?.isOwner&&!game.user.isGM)throw new Error('No permission to upgrade this Actor’s gear.');
 if(gmOverride&&!game.user.isGM)throw new Error('Only the GM may approve Upgrade exceptions.');
 await reviewUpgradeTraits(actor,'installing');
 if(kit&&!kitMatches(kit,upgrade.name,item))throw new Error('Upgrade Kit does not match this upgrade / Item.');
 const option={...upgrade,notes,linkedTo,modelVariant,hardwired,attachment};
 const plan=upgradePlan(item,option,{generic,custom,rest,technician,gmOverride,kitAvailable:Boolean(kit)});
 let check=null;
 if(plan.requiresCheck){if(!skill||skill.type!=='skill')throw new Error('Select a suitable upgrade Skill.');
   check=await rollSkill(actor,skill,{baseTR:plan.tr,difficulty:modelVariant?2:0,contextLabel:`Install ${plan.upgrade.name} — ${item.name}`,skipTraitAdjudication:true,chat:true});if(check.blocked)return {installed:false,check,plan};
 }
 if(kit&&!kitMatches(kit,upgrade.name,item))throw new Error('Upgrade Kit is no longer available for this upgrade.');
 const existing=parseInstalledUpgrades(item.system.installedUpgrades),oldQty=kit?Number(kit.system.quantity):0;
 if(kit&&plan.consumeKit)await kit.update({'system.quantity':oldQty-1});
 if(plan.requiresCheck&&!check.success)return {installed:false,check,kitConsumed:!!kit,plan};
 try{await item.update({'system.installedUpgrades':JSON.stringify([...existing,plan.upgrade]),'system.techUsed':plan.usedAfter});}
 catch(e){if(kit&&plan.consumeKit)await kit.update({'system.quantity':oldQty});throw e;}
 return {installed:true,check,kitConsumed:!!kit&&plan.consumeKit,plan};
}
export async function performRespec(actor,item,index,{skill,gmOverride=false}={}){
 if(!actor?.isOwner&&!game.user.isGM)throw new Error('No permission to respec this gear.');
 if(gmOverride&&!game.user.isGM)throw new Error('Only the GM may approve respec exceptions.');
 await reviewUpgradeTraits(actor,'removing or respecing');
 const plan=respecPlan(item,index,{gmOverride});if(!skill||skill.type!=='skill')throw new Error('Select a relevant Skill.');
 const check=await rollSkill(actor,skill,{baseTR:plan.tr,difficulty:Math.abs(plan.penalty||0),contextLabel:`Respec ${plan.upgrade.name} — ${item.name}`,skipTraitAdjudication:true,chat:true});if(check.blocked||!check.success)return {removed:false,check,plan};
 const upgrades=parseInstalledUpgrades(item.system.installedUpgrades);upgrades.splice(plan.index,1);
 await item.update({'system.installedUpgrades':JSON.stringify(upgrades),'system.techUsed':plan.usedAfter});return {removed:true,check,plan};
}
export class ACUpgradeWorkbench extends api.HandlebarsApplicationMixin(api.ApplicationV2){
 static DEFAULT_OPTIONS={id:'altered-carbon-upgrade-workbench',classes:['altered-carbon','ac-upgrade-workbench'],window:{title:'Altered Carbon — Equipment Workbench'},position:{width:820,height:760},actions:{select:this._select,install:this._install,respec:this._respec,awardKit:this._awardKit,chassis:this._chassis}};
 static PARTS={main:{template:'systems/altered-carbon-rpg/templates/upgrade-workbench.hbs'}};
 constructor(options={}){super(options);this.actorId=options.actorId||null;this.itemId=options.itemId||null;}
 get actor(){return game.actors.get(this.actorId);}
 get item(){return this.actor?.items.get(this.itemId);}
 async _prepareContext(options){const context=await super._prepareContext(options),actor=this.actor,gear=actor?.items.filter(i=>['weapon','armour','equipment','software','augmentation'].includes(i.type))||[];
   if(!this.itemId&&gear.length)this.itemId=gear[0].id;
   const item=this.item,installed=parseInstalledUpgrades(item?.system?.installedUpgrades),upgrades=item?availableUpgradeNames(item,await genericWeaponUpgrades()):[];
   return {...context,actor:actor?.name||'Select actor',hasActor:Boolean(actor),itemName:item?.name||'',itemId:item?.id,items:gear.map(i=>({id:i.id,name:i.name,selected:i.id===this.itemId})),
     selected:item?{name:item.name,type:item.type,techPoints:item.system.techPoints,techUsed:item.system.techUsed,capacity:item.system.capacity,sourceRules:item.system.upgrades,baseTechPoints:item.system.chassisBaseRecorded?item.system.baseTechPoints:item.system.techPoints}:null,
     upgrades,installed:installed.map((x,i)=>({...x,index:i})),isGM:game.user.isGM,canEdit:Boolean(game.user.isGM||actor?.isOwner)};
 }
 static async _select(event,target){this.itemId=target.dataset.itemId;await this.render({force:true});}
 static async _install(){const actor=this.actor,item=this.item;if(!actor||!item)return;try{
   const all=await genericWeaponUpgrades(),names=availableUpgradeNames(item,all);
   const list=names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
   const form=await api.DialogV2.input({window:{title:`Install Upgrade — ${item.name}`},content:`<p>Select an Item-listed upgrade or generic weapon modification. Source-listed upgrade costs are often item-specific: default is Q1 unless approved otherwise by GM.</p>
    <label>Upgrade</label><select name="upgrade">${list}<option value="__narrative__">Narrative Upgrade (GM-approved)</option></select>
    <label>Narrative Upgrade name (if selected)</label><input name="customName" placeholder="Custom ability">
    <label>Q Cost</label><input type="number" min="1" max="8" value="1" name="techCost">
    <label>Skill for Installation</label><select name="skill">${skillOptions(actor)}</select>
    <label>Consumable Upgrade Kit</label><select name="kit"><option value="">None</option>${kitOptions(actor)}</select>
    <label>Linked Item UUID (optional)</label><input name="linkedTo" placeholder="Actor Item UUID">
    <label>Notes / GM agreement</label><textarea name="notes"></textarea>
    <label><input type="checkbox" name="rest"> Short Rest completed (Attachment)</label>
    <label><input type="checkbox" name="attachment"> Attachment (no Skill Check)</label>
    <label><input type="checkbox" name="hardwired"> Hardwired (cannot respec)</label>
    <label><input type="checkbox" name="modelVariant"> Manufacturer Model Variant</label>
    <label><input type="checkbox" name="technician"> Technician generic adaptation qualification</label>
    ${game.user.isGM?'<label><input type="checkbox" name="gmOverride"> GM authorized exception / narrative option</label>':''}`});
   if(!form)return;const get=k=>formValue(form,k);
   const custom=get('upgrade')==='__narrative__',name=custom?String(get('customName')||'').trim():get('upgrade');if(!name)throw new Error('Provide an Upgrade name.');
   const catalog=all.find(u=>u.name===name),generic=Boolean(catalog)&&!String(item.system.upgrades||'').toLowerCase().includes(String(name).toLowerCase());
   const kit=actor.items.get(get('kit')),skill=actor.items.get(get('skill'));
   const r=await performUpgrade(actor,item,{id:catalog?.id||'',name,techCost:Math.max(1,Number(get('techCost')||catalog?.techCost||1))},{kit,skill,rest:checked(form,'rest'),technician:checked(form,'technician'),gmOverride:game.user.isGM&&checked(form,'gmOverride'),generic,custom,notes:get('notes'),linkedTo:get('linkedTo'),modelVariant:checked(form,'modelVariant'),hardwired:checked(form,'hardwired'),attachment:checked(form,'attachment')});
   ui.notifications[r.installed?'info':'warn'](r.installed?`${name} installed on ${item.name}.`:`Upgrade not installed (${r.check?.blocked?'Skill check blocked':'failed Skill Check'}). ${r.kitConsumed?'Kit consumed.':''}`);
   await this.render({force:true});
  }catch(e){ui.notifications.error(e.message);}}
 static async _respec(event,target){const item=this.item,actor=this.actor;if(!item)return;
   const list=parseInstalledUpgrades(item.system.installedUpgrades),index=Number(target.dataset.upgradeIndex),u=list[index];if(!u)return;
   try{const form=await api.DialogV2.input({window:{title:`Remove ${u.name}`},content:`<p>Respec refunds ${u.techCost} Q on success. The original Upgrade Kit is not returned.</p><label>Relevant Skill</label><select name="skill">${skillOptions(actor)}</select>${game.user.isGM?'<label><input type="checkbox" name="gmOverride"> GM authorizes Model Variant respec</label>':''}`});if(!form)return;
     const r=await performRespec(actor,item,index,{skill:actor.items.get(formValue(form,'skill')),gmOverride:game.user.isGM&&checked(form,'gmOverride')});
     ui.notifications[r.removed?'info':'warn'](r.removed?`${u.name} removed and Q refunded.`:'Respec Skill Check failed; upgrade remains.');this.render({force:true});
   }catch(e){ui.notifications.error(e.message);}}
 static async _awardKit(){if(!game.user.isGM)return;const item=this.item,actor=this.actor;if(!item)return;
   const names=availableUpgradeNames(item,await genericWeaponUpgrades());const form=await api.DialogV2.input({window:{title:'GM Award — Upgrade Kit'},content:`<label>Upgrade</label><select name="upgrade">${names.map(n=>`<option>${esc(n)}</option>`).join('')}</select><label>Quantity</label><input name="quantity" type="number" min="1" value="1">`});if(!form)return;
   const name=String(formValue(form,'upgrade')||'').trim(),quantity=Math.max(1,Math.trunc(Number(formValue(form,'quantity')||1)));if(!name)return;
   const kit=actor.items.find(i=>i.type==='equipment'&&i.system.upgradeFor===name&&i.system.upgradeTargetCatalogId===item.system.catalogId);
   if(kit)await kit.update({'system.quantity':Number(kit.system.quantity||0)+quantity});else await actor.createEmbeddedDocuments('Item',[{name:`Upgrade Kit — ${name}`,type:'equipment',system:{quantity,upgradeFor:name,upgradeTargetCatalogId:item.system.catalogId,priceLevel:item.system.priceLevel,specialRules:`Upgrade Kit for ${item.name}; issued/authorized by GM.`}}]);
   ui.notifications.info(`Awarded ${quantity} Upgrade Kit(s) for ${item.name}.`);await this.render({force:true});}
 static async _chassis(){if(!game.user.isGM)return;const item=this.item;if(!item)return;try{
   const form=await api.DialogV2.input({window:{title:'GM Chassis Upgrade'},content:'<p>GM confirms procurement, price and success of the published Chassis Upgrade procedure before applying the Q increase.</p><label>Extra Q granted</label><input name="amount" type="number" min="1" max="5" value="1"><label><input name="approved" type="checkbox"> GM has resolved prerequisite check and Chassis Upgrade cost</label>'});if(!form)return;
   if(!checked(form,'approved'))throw new Error('GM must confirm Chassis Upgrade prerequisites and check.');
   const plan=chassisPlan(item,formValue(form,'amount'));
   await item.update({'system.baseTechPoints':Number(item.system.chassisBaseRecorded?item.system.baseTechPoints:item.system.techPoints),'system.techPoints':plan.next,'system.chassisBaseRecorded':true});ui.notifications.info(`Chassis Q upgraded ${plan.current} → ${plan.next}.`);this.render({force:true});
 }catch(e){ui.notifications.error(e.message);}}
}

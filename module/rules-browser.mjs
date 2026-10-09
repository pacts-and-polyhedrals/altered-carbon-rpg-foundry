import {serializedCoreTraitRules} from './core-trait-effects.mjs';
import {hasEquivalentUniqueRecord} from './sheet-record-utils.mjs';
const SYS='altered-carbon-rpg';
const CATALOG_VERSION='1.3.0';
async function loadJSON(path){const r=await fetch(`systems/${SYS}/data/${path}`);if(!r.ok)throw new Error(`Unable to load ${path}`);return r.json();}
async function loadOptionalJSON(path,fallback){try{return await loadJSON(path);}catch(_error){return fallback;}}
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;

function groupBy(items,key='category'){
  const map=new Map();
  for(const item of items||[]){const k=item?.[key]||'Other';if(!map.has(k))map.set(k,[]);map.get(k).push(item);}
  return [...map.entries()].map(([name,records])=>({name,records}));
}

function catalogDocument(record,folderId=null){
  return {
    name:record.name,
    type:record.type,
    folder:folderId,
    system:foundry.utils.deepClone(record.system),
    flags:{[SYS]:{coreCatalog:true,catalogId:record.id,catalogVersion:CATALOG_VERSION,bookPage:record.bookPage,category:record.category}}
  };
}

export class ACRulesBrowser extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={id:'ac-rules-browser',classes:['altered-carbon','ac-rules-window'],window:{title:'Altered Carbon — 2020 Rules Reference'},position:{width:1040,height:860},actions:{add:this._add,createVehicle:this._createVehicle,installCatalog:this._installCatalog}};
 static PARTS={main:{template:'systems/altered-carbon-rpg/templates/rules-browser.hbs'}};
 constructor(options={}){super(options);this.actorId=options.actorId||null;}
 async _prepareContext(options){
   const context=await super._prepareContext(options);
   const [skills,traits,baggage,mechanics,sleeveRef,equipmentRef,gmRef,itemCatalog,upgradeCatalog,vehicleCatalog,legacyCatalog]=await Promise.all([
     loadJSON('core-skills.json'),loadJSON('trait-catalog.json'),loadJSON('baggage-catalog.json'),loadJSON('mechanics-reference.json'),
     loadOptionalJSON('sleeve-reference-pages.json',{pages:[]}),loadOptionalJSON('equipment-reference-pages.json',{pages:[]}),loadOptionalJSON('gm-reference-pages.json',{pages:[]}),
     loadJSON('item-catalog.json'),loadJSON('equipment-upgrades.json'),loadJSON('vehicle-catalog.json'),loadJSON('legacy-qsg-items.json')
   ]);
   const actor=game.actors.get(this.actorId)||null;
   return {...context,actor,isGM:game.user.isGM,skills,traits:traits.traits,baggage:baggage.entries,mechanics,conditions:mechanics.conditions,injuries:mechanics.injuries,scandals:mechanics.scandals,gearRules:mechanics.gearRules,sleeveReference:sleeveRef.pages,equipmentReference:equipmentRef.pages,gmReference:gmRef.pages,itemCatalog:itemCatalog.items,itemGroups:groupBy(itemCatalog.items),itemCatalogCount:itemCatalog.count,upgradeCatalog:upgradeCatalog.upgrades,vehicleCatalog:vehicleCatalog.vehicles,legacyCatalog:legacyCatalog.items,hasSleeveReference:Boolean(sleeveRef.pages?.length),hasEquipmentReference:Boolean(equipmentRef.pages?.length),hasGMReference:Boolean(gmRef.pages?.length)};
 }
 static async _add(event,target){
   const actor=game.actors.get(this.actorId);if(!actor)return ui.notifications.warn('Open the Rules Reference from an Actor sheet to add entries.');
   const type=target.dataset.type,id=target.dataset.id;
   const [traits,baggage,mechanics,itemCatalog]=await Promise.all([loadJSON('trait-catalog.json'),loadJSON('baggage-catalog.json'),loadJSON('mechanics-reference.json'),loadJSON('item-catalog.json')]);let data=null;
   if(type==='trait'){const t=traits.traits.find(x=>x.id===id);if(t)data={name:t.name,type:'trait',system:{catalogId:t.id,tree:t.tree,branch:t.branch,tier:t.tier,commonality:t.commonality||'uncommon',spCost:t.spCost||0,ruleElements:serializedCoreTraitRules(t.id),effect:t.effect||'',description:t.effect||'',rulesRef:t.rulesRef||'Core Rulebook, Chapter 5'}};}
   if(type==='baggage'){const b=baggage.entries.find(x=>x.id===id);if(b)data={name:b.name,type:'baggage',system:{catalogId:b.id,rollMin:b.min,rollMax:Number.isFinite(b.max)?b.max:999,severity:b.severity||0,description:b.effect||'',rulesRef:'Core Rulebook, Baggage'}};}
   if(type==='condition'){const x=mechanics.conditions.find(x=>x.id===id);if(x)data={name:x.name,type:'condition',system:{catalogId:x.id,key:x.id,description:x.effect,rulesRef:'Core Rulebook, Status Effects'}};}
   if(type==='injury'){const x=mechanics.injuries.find(x=>x.id===id);if(x)data={name:x.name,type:'injury',system:{catalogId:x.id,key:x.id,recoveryRate:x.recoveryRate||'',description:x.effect,rulesRef:'Core Rulebook, Injuries'}};}
   if(type==='scandal'){const x=mechanics.scandals.find(x=>x.id===id);if(x)data={name:x.name,type:'scandal',system:{catalogId:x.id,key:x.id,description:x.effect,rulesRef:'Core Rulebook, Scandals'}};}
   if(type==='catalog-item'){const x=itemCatalog.items.find(x=>x.id===id);if(x)data={name:x.name,type:x.type,system:foundry.utils.deepClone(x.system),flags:{[SYS]:{coreCatalog:true,catalogId:x.id,catalogVersion:CATALOG_VERSION,bookPage:x.bookPage,category:x.category}}};}
   if(data){
     const existingByCatalog=actor.items.find(i=>String(i.system.catalogId||'')===String(data.system.catalogId||'')&&i.type===data.type);
     if(existingByCatalog&&['ammunition','drug'].includes(data.type)){
       const qty=Math.max(0,Number(existingByCatalog.system.quantity||1))+1;await existingByCatalog.update({'system.quantity':qty});ui.notifications.info(`${data.name} quantity increased to ${qty}.`);return;
     }
     if(existingByCatalog)return ui.notifications.info(`${data.name} is already recorded on ${actor.name}.`);
     if(hasEquivalentUniqueRecord(actor.items.contents,data))return ui.notifications.info(`${data.name} is already recorded on ${actor.name}.`);
     await actor.createEmbeddedDocuments('Item',[data]);
     ui.notifications.info(`${data.name} added to ${actor.name}.`);
   }
 }
 static async _installCatalog(){
   if(!game.user.isGM)return ui.notifications.warn('Only a GM can install or refresh the world Core Item Library.');
   const catalog=await loadJSON('item-catalog.json');
   let folder=game.folders?.find(f=>f.type==='Item'&&f.name==='Altered Carbon — Core Item Library');
   if(!folder)folder=await Folder.create({name:'Altered Carbon — Core Item Library',type:'Item',sorting:'a'});
   const existing=[...(game.items||[])].filter(i=>i.getFlag?.(SYS,'coreCatalog')===true);
   const byCatalog=new Map(existing.map(i=>[String(i.getFlag(SYS,'catalogId')||i.system.catalogId||''),i]));
   const create=[];let updated=0;
   for(const record of catalog.items){
     const current=byCatalog.get(String(record.id));
     const data=catalogDocument(record,folder.id);
     if(current){
       await current.update({name:data.name,type:data.type,folder:folder.id,system:data.system,[`flags.${SYS}.coreCatalog`]:true,[`flags.${SYS}.catalogId`]:record.id,[`flags.${SYS}.catalogVersion`]:CATALOG_VERSION,[`flags.${SYS}.bookPage`]:record.bookPage,[`flags.${SYS}.category`]:record.category});
       updated++;
     }else create.push(data);
   }
   if(create.length)await foundry.documents.Item.implementation.createDocuments(create);
   ui.notifications.info(`Core Item Library v${CATALOG_VERSION}: ${create.length} created, ${updated} refreshed (${catalog.items.length} canonical Items).`);
   return {created:create.length,updated,total:catalog.items.length,folderId:folder.id};
 }
 static async _createVehicle(event,target){
   if(!game.user.isGM)return ui.notifications.warn('Only the GM can create official Vehicle templates.');
   const catalog=await loadJSON('vehicle-catalog.json'),x=catalog.vehicles.find(v=>v.id===target.dataset.id);if(!x)return;
   const actor=await Actor.create({name:x.name,type:'vehicle',system:foundry.utils.deepClone(x.system),ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},flags:{[SYS]:{coreCatalog:true,catalogId:x.id,catalogVersion:CATALOG_VERSION,bookPage:x.bookPage}}});
   ui.notifications.info(`${actor.name} created from the Core vehicle catalog.`);actor.sheet?.render?.(true);
 }
}

const SYS='altered-carbon-rpg';
const ITEM_FILES=[
  ['Weapons','core-weapons.json'],
  ['Ammunition','core-ammunition.json'],
  ['Apparel & Armour','core-armour.json'],
  ['Devices & Decks','core-equipment.json'],
  ['Software','core-software.json'],
  ['Drugs & Medicine','core-drugs.json'],
  ['Sleeve Augmentations','core-augmentations.json']
];
const REPEATABLE=new Set(['ammunition','drug']);
let cache=null;

async function loadJSON(path){
  const response=await fetch(`systems/${SYS}/data/${path}`);
  if(!response.ok)throw new Error(`Unable to load ${path}`);
  return response.json();
}
function clone(value){
  try{return foundry.utils.deepClone(value);}catch(_error){return JSON.parse(JSON.stringify(value));}
}
function norm(value){return String(value??'').trim().toLowerCase();}
function itemCatalogId(item){return String(item?.system?.catalogId||'');}

export async function loadCoreCatalog({refresh=false}={}){
  if(cache&&!refresh)return cache;
  const loaded=await Promise.all(ITEM_FILES.map(async([label,file])=>({label,file,data:await loadJSON(file)})));
  const [vehicles,upgrades]=await Promise.all([loadJSON('core-vehicles.json'),loadJSON('core-upgrades.json')]);
  const groups=loaded.map(({label,file,data})=>({label,file,items:(data.items||[]).map(entry=>({...entry,groupLabel:label}))}));
  const items=groups.flatMap(group=>group.items);
  cache={groups,items,vehicles:vehicles.actors||[],upgrades:upgrades.entries||[],source:'Altered Carbon RPG Core Rulebook (2020)'};
  return cache;
}

export function catalogItemData(entry){
  if(!entry?.name||!entry?.type)throw new Error('Invalid Core Library item record.');
  return {name:entry.name,type:entry.type,system:clone(entry.system||{})};
}

export async function addCatalogItemToActor(actor,entry,{notify=true}={}){
  if(!actor)throw new Error('Choose an Actor first.');
  if(!game.user.isGM&&!actor.isOwner)throw new Error(`You do not have permission to add equipment to ${actor.name}.`);
  const data=catalogItemData(entry);
  const catalogId=String(data.system.catalogId||entry.id||'');
  const existing=actor.items.find(item=>catalogId&&itemCatalogId(item)===catalogId);
  if(existing){
    if(REPEATABLE.has(data.type)){
      const quantity=Math.max(0,Number(existing.system.quantity||0))+Math.max(1,Number(data.system.quantity||1));
      await existing.update({'system.quantity':quantity});
      if(notify)ui.notifications.info(`${entry.name}: quantity is now ${quantity} on ${actor.name}.`);
      return existing;
    }
    if(notify)ui.notifications.info(`${entry.name} is already on ${actor.name}.`);
    return existing;
  }
  const [created]=await actor.createEmbeddedDocuments('Item',[data]);
  if(notify)ui.notifications.info(`${entry.name} added to ${actor.name}.`);
  return created;
}

export async function addCoreItemById(actor,catalogId,options={}){
  const catalog=await loadCoreCatalog();
  const entry=catalog.items.find(item=>item.id===catalogId||item.system?.catalogId===catalogId);
  if(!entry)throw new Error(`Core item ${catalogId} was not found.`);
  return addCatalogItemToActor(actor,entry,options);
}

export async function createWorldCoreItem(entry,{notify=true}={}){
  if(!game.user.isGM)throw new Error('Only the GM can create world Items.');
  const data=catalogItemData(entry),catalogId=String(data.system.catalogId||entry.id||'');
  const existing=game.items.find(item=>catalogId&&itemCatalogId(item)===catalogId);
  if(existing){if(notify)ui.notifications.info(`${entry.name} already exists in the world Items directory.`);return existing;}
  const created=await CONFIG.Item.documentClass.create(data,{renderSheet:false});
  if(notify)ui.notifications.info(`${entry.name} created in the world Items directory.`);
  return created;
}

export async function createCoreVehicle(entry,{notify=true}={}){
  if(!game.user.isGM)throw new Error('Only the GM can create Vehicle Actors.');
  if(!entry?.name||entry.type!=='vehicle')throw new Error('Invalid Core Library vehicle record.');
  const marker=String(entry.id||'');
  const existing=game.actors.find(actor=>actor.type==='vehicle'&&(actor.getFlag?.(SYS,'coreCatalogId')===marker||(!actor.getFlag?.(SYS,'coreCatalogId')&&actor.name===entry.name)));
  if(existing){if(notify)ui.notifications.info(`${entry.name} already exists in the Actors directory.`);return existing;}
  const data={name:entry.name,type:'vehicle',system:clone(entry.system||{}),flags:{[SYS]:{coreCatalogId:marker,sourceBook:'Altered Carbon RPG Core Rulebook (2020)',sourcePage:entry.sourcePage||0}}};
  const created=await CONFIG.Actor.documentClass.create(data,{renderSheet:false});
  if(notify)ui.notifications.info(`${entry.name} created in the Actors directory.`);
  return created;
}

export async function installCoreLibraryToWorld(){
  if(!game.user.isGM)throw new Error('Only the GM can install the Core Library into a world.');
  const catalog=await loadCoreCatalog();
  const missing=catalog.items.filter(entry=>!game.items.some(item=>itemCatalogId(item)===(entry.system?.catalogId||entry.id)));
  const createdItems=[];
  for(const entry of missing)createdItems.push(await createWorldCoreItem(entry,{notify:false}));
  const createdVehicles=[];
  for(const entry of catalog.vehicles){
    const existing=game.actors.some(actor=>actor.type==='vehicle'&&(actor.getFlag?.(SYS,'coreCatalogId')===entry.id||(!actor.getFlag?.(SYS,'coreCatalogId')&&actor.name===entry.name)));
    if(!existing)createdVehicles.push(await createCoreVehicle(entry,{notify:false}));
  }
  ui.notifications.info(`Core Library ready: ${createdItems.length} Items and ${createdVehicles.length} Vehicle Actors created; existing catalog records were preserved.`);
  return {createdItems,createdVehicles};
}

function itemFacts(entry){
  const s=entry.system||{},facts=[];
  if(Number.isFinite(Number(s.priceLevel)))facts.push(`Price ${Number(s.priceLevel)}`);
  if(Number(s.capacity||0)>0)facts.push(`CAP ${Number(s.capacity)}`);
  if(Number(s.techPoints||0)>0)facts.push(`Q ${Number(s.techPoints)}`);
  if(s.damage)facts.push(`DMG ${s.damage}`);
  if(s.compatibleWith)facts.push(s.compatibleWith);
  if(s.administration)facts.push(s.administration);
  if(s.prerequisites)facts.push(s.prerequisites);
  return facts.slice(0,4).join(' · ');
}

export class ACCoreLibrary extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
  static DEFAULT_OPTIONS={
    id:'ac-core-library',classes:['altered-carbon','ac-core-library-window'],window:{title:'Altered Carbon — Core Equipment Library'},position:{width:1120,height:860},
    actions:{addToActor:this._addToActor,createWorldItem:this._createWorldItem,createVehicle:this._createVehicle,installAll:this._installAll}
  };
  static PARTS={main:{template:'systems/altered-carbon-rpg/templates/core-library.hbs'}};
  constructor(options={}){super(options);this.actorId=options.actorId||null;}
  async _prepareContext(options){
    const context=await super._prepareContext(options),catalog=await loadCoreCatalog();
    const actor=game.actors.get(this.actorId)||null;
    const actorCatalogIds=new Set(actor?.items?.map(item=>item.system?.catalogId).filter(Boolean)||[]);
    const isGM=game.user.isGM;
    const groups=catalog.groups.map(group=>({label:group.label,count:group.items.length,items:group.items.map(entry=>({...entry,facts:itemFacts(entry),onActor:actorCatalogIds.has(entry.system?.catalogId||entry.id),canAdd:Boolean(actor),canCreate:isGM}))}));
    const vehicles=catalog.vehicles.map(entry=>({...entry,canCreate:isGM}));
    return {...context,actor,isGM,groups,vehicles,upgrades:catalog.upgrades,itemCount:catalog.items.length,vehicleCount:catalog.vehicles.length,upgradeCount:catalog.upgrades.length};
  }
  async _onRender(context,options){
    await super._onRender(context,options);
    const root=this.element,search=root?.querySelector('[name="coreSearch"]'),type=root?.querySelector('[name="coreType"]');
    const apply=()=>{
      const q=norm(search?.value),filter=String(type?.value||'all');
      for(const card of root?.querySelectorAll('[data-core-card]')||[]){
        const hay=norm(card.dataset.search),cardType=card.dataset.type||'';
        card.hidden=Boolean((q&&!hay.includes(q))||(filter!=='all'&&cardType!==filter));
      }
      for(const group of root?.querySelectorAll('[data-core-group]')||[]){group.hidden=![...(group.querySelectorAll('[data-core-card]')||[])].some(card=>!card.hidden);}
    };
    search?.addEventListener('input',apply);type?.addEventListener('change',apply);apply();
  }
  static async _addToActor(event,target){
    const actor=game.actors.get(this.actorId);if(!actor)return ui.notifications.warn('Open the Core Library from a character sheet to add equipment directly.');
    const catalog=await loadCoreCatalog(),entry=catalog.items.find(item=>item.id===target.dataset.catalogId);if(!entry)return;
    try{await addCatalogItemToActor(actor,entry);this.render({force:true});}catch(error){ui.notifications.error(error.message);}
  }
  static async _createWorldItem(event,target){
    const catalog=await loadCoreCatalog(),entry=catalog.items.find(item=>item.id===target.dataset.catalogId);if(!entry)return;
    try{await createWorldCoreItem(entry);}catch(error){ui.notifications.error(error.message);}
  }
  static async _createVehicle(event,target){
    const catalog=await loadCoreCatalog(),entry=catalog.vehicles.find(item=>item.id===target.dataset.catalogId);if(!entry)return;
    try{await createCoreVehicle(entry);}catch(error){ui.notifications.error(error.message);}
  }
  static async _installAll(){
    if(!game.user.isGM)return ui.notifications.warn('Only the GM can install the Core Library into the world directories.');
    const ok=await foundry.applications.api.DialogV2.confirm({window:{title:'Install Core Equipment Library'},content:'<p>Create any missing official 2020 Core equipment records as world Items, plus the three example Vehicle Actors?</p><p class="hint">Existing records with the same Core catalog ID are left untouched. This does not delete or overwrite your customized Items.</p>'});
    if(!ok)return;
    try{await installCoreLibraryToWorld();this.render({force:true});}catch(error){console.error(error);ui.notifications.error(error.message);}
  }
}

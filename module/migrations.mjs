/** Conservative, idempotent, non-deleting world-data migration planner.
 * All mutation APIs live in applyWorldMigration (GM-confirmed UI only).
 */
export const SCHEMA_VERSION=190;
export const NS='altered-carbon-rpg';
const GEAR_TYPES=new Set(['weapon','ammunition','armour','equipment','software','drug','augmentation']);
const resourceNames=['health','ego','wounds','stackPoints','influence'];
const runningWorldMigrations=new WeakSet();
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sourceData=doc=>doc?._source||doc||{};
const defined=(obj,key)=>Object.prototype.hasOwnProperty.call(obj||{},key);
const safeNumber=n=>{
  if(n===null||n===undefined||typeof n==='boolean'||(typeof n==='string'&&!n.trim()))return null;
  if(!['string','number'].includes(typeof n))return null;
  const value=Number(n);return Number.isSafeInteger(value)&&value>=0?value:null;
};

export function planDocMigration(source,{kind='Item'}={}){
 const d=sourceData(source),s=d.system||{},flag=d.flags?.[NS]||{};
 if(Number(flag.schemaVersion||0)>=SCHEMA_VERSION)return {updates:{},reasons:[],changed:false,alreadyMigrated:true};
 const updates={},reasons=[];
 const add=(field,value,reason)=>{updates[field]=value;reasons.push(reason);};
 if(kind==='Actor'){
   for(const name of resourceNames){const raw=s.resources?.[name];if(raw!==undefined&&!isRecord(raw)){
     const n=safeNumber(raw);if(n!==null)add(`system.resources.${name}`,{value:n,max:n},`Legacy ${name} resource -> value/max`);
   }}
   if(d.type==='vehicle'){
     for(const resource of ['structure','fuel']){
       const v=s.vehicle?.[resource];if(v!==undefined&&!isRecord(v)){
         const n=safeNumber(v);if(n!==null)add(`system.vehicle.${resource}`,{value:n,max:n},`Vehicle ${resource} -> value/max`);
       }
     }
     if(!defined(s.vehicle,'crewAssignments'))add('system.vehicle.crewAssignments','[]','Initialize vehicle crew assignments');
   }
 }else if(kind==='Item'){
   if(GEAR_TYPES.has(d.type)){
     if(!defined(s,'equipState')){
       const equip=Boolean(s.equipped||s.isEquipped||s.worn);
       const state=!equip?'carried':d.type==='armour'||s.worn?'worn':'equipped';
       add('system.equipState',state,'Preserve legacy equipped/worn state');
     }
     if(!defined(s,'baseTechPoints')&&safeNumber(s.techPoints)!==null){
       add('system.baseTechPoints',Number(s.techPoints),'Preserve original Tech Point capacity');
       if(!defined(s,'chassisBaseRecorded'))add('system.chassisBaseRecorded',true,'Mark recorded chassis baseline');
     }
   }
   if(d.type==='drug'){
     if(!defined(s,'drugPhase'))add('system.drugPhase',s.active?'influence':'inactive','Initialize drug lifecycle from prior active flag');
     if(!defined(s,'metabolismSuccesses'))add('system.metabolismSuccesses',0,'Initialize metabolization counter');
   }
   if(!defined(s,'catalogId')&&flag.catalogId)add('system.catalogId',String(flag.catalogId),'Copy existing source catalogue identifier');
 }
 if(!defined(flag,'schemaVersion')||Number(flag.schemaVersion)<SCHEMA_VERSION)add(`flags.${NS}.schemaVersion`,SCHEMA_VERSION,'Record versioned migration marker');
 return {updates,reasons,changed:reasons.length>0,alreadyMigrated:false};
}

export function migrationPreview(actors=[],items=[]){
 const planned=[];
 for(const actor of actors){const a=planDocMigration(actor,{kind:'Actor'});if(a.changed)planned.push({document:actor,kind:'Actor',scope:'world',...a});
   for(const item of (actor.items?.contents||[])){const p=planDocMigration(item,{kind:'Item'});if(p.changed)planned.push({document:item,parent:actor,kind:'Item',scope:'embedded',...p});}}
 for(const item of items){const p=planDocMigration(item,{kind:'Item'});if(p.changed)planned.push({document:item,kind:'Item',scope:'world',...p});}
 return {entries:planned,actors:planned.filter(x=>x.kind==='Actor').length,items:planned.filter(x=>x.kind==='Item').length,changedFields:planned.reduce((n,x)=>n+Object.keys(x.updates).length,0),schemaVersion:SCHEMA_VERSION};
}
/** Updates each document, never deletes, and only raises world marker after full success. */
export async function applyWorldMigration({gameInstance=globalThis.game,onProgress}={}){
 if(!gameInstance?.user?.isGM)throw new Error('Only the GM may migrate world data.');
 if(runningWorldMigrations.has(gameInstance))throw new Error('World migration is already running in this client.');
 runningWorldMigrations.add(gameInstance);
 try{
 const all=migrationPreview(gameInstance.actors?.contents||[],gameInstance.items?.contents||[]);
 let migrated=0;const failures=[];
 for(const entry of all.entries){try{
   // Replan on the latest persisted source. Prevent overwriting a concurrent GM change.
   const current=planDocMigration(entry.document,{kind:entry.kind});
   if(current.changed){await entry.document.update(current.updates);migrated++;}
   onProgress?.({migrated,total:all.entries.length,name:entry.document.name});
 }catch(error){failures.push({name:entry.document.name,id:entry.document.id,error:String(error?.message||error)});}}
 if(!failures.length)await gameInstance.settings.set(NS,'schemaVersion',SCHEMA_VERSION);
 return {migrated,planned:all.entries.length,failures,completed:failures.length===0,version:SCHEMA_VERSION};
 }finally{runningWorldMigrations.delete(gameInstance);}
}

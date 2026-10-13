/** Cold Storage 1.9.0: single access point for Altered Carbon RPG 2.4.0 helpers.
 * The module reuses the system's own creator, Trait automation, Baggage workflow and
 * adversary builders so imported Actors match characters made with the system tools.
 * Paths are relative to this file so Foundry route prefixes and The Forge resolve them.
 */
export const SYS='altered-carbon-rpg';
export const REQUIRED_SYSTEM='2.4.0';
let importer=path=>import(`../../systems/${SYS}/module/${path}`);
const cache=new Map();
/** Test seam only: replace how system ES modules are loaded. */
export function setSystemImporter(fn){importer=fn;cache.clear();}
export async function systemModule(path){
 if(!cache.has(path))cache.set(path,importer(path).catch(error=>{cache.delete(path);throw error;}));
 return cache.get(path);
}
async function optionalModule(path){try{return await systemModule(path);}catch(error){console.warn(`Cold Storage | Optional system helper ${path} unavailable`,error);return null;}}
const parts=v=>String(v||'0').split('.').map(n=>Number(n)||0);
export function versionAtLeast(version,minimum=REQUIRED_SYSTEM){const a=parts(version),b=parts(minimum);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;}
export function systemVersion(){return game.system?.version||game.alteredCarbon?.version||'0';}
export function assertSystem(){
 if(game.system?.id!==SYS)throw new Error('Cold Storage requires the Altered Carbon RPG system.');
 if(!versionAtLeast(systemVersion()))throw new Error(`Cold Storage 1.9 requires Altered Carbon RPG ${REQUIRED_SYSTEM} or newer (installed: ${systemVersion()}). Update the system first.`);
}
/** Same commonality rule as the system Character Creator (variants, Praxis, archetype trees).
 * Core 2020 Ch.2: a Civilian's Citizenship *branch* is Common. In the 2.4.0 catalog Citizenship is a
 * branch of the Law and Government tree, so the branch is checked here as well as the tree. */
export async function commonality(archetype,tree,age,variant='standard',branch=''){
 if(archetype==='Civilian'&&variant!=='religious'&&String(branch).toLowerCase()==='citizenship')return'common';
 const m=await optionalModule('creator-build.mjs');
 if(m?.creatorCommonality)return m.creatorCommonality(archetype,tree,age,variant);
 const common={Criminal:'Crime',Official:'Law and Government',Socialite:'Business and Society',Soldier:'Combat',Technician:'Technology'};
 const anomaly={Criminal:'Law and Government',Official:'Crime',Socialite:'Survival',Soldier:'Business and Society',Technician:'Combat'};
 if(archetype==='Civilian'&&tree==='Citizenship')return'common';if(tree==='Praxis'&&Number(age)>100)return'common';
 if(common[archetype]===tree)return'common';if(anomaly[archetype]===tree)return'anomaly';return'uncommon';
}
/** Automated Trait rule elements, exactly as the Character Creator stores them. */
export async function traitRuleElements(id){const m=await optionalModule('core-trait-effects.mjs');return m?.serializedCoreTraitRules?m.serializedCoreTraitRules(id):'';}
export async function creatorBuild(){return systemModule('creator-build.mjs');}
export async function baggageWorkflow(){return systemModule('baggage-workflow.mjs');}
export async function rolls(){return systemModule('rolls.mjs');}
export function gmContent(){const m=game.alteredCarbon?.GMContent;if(!m?.adversaryDocuments)throw new Error(`Altered Carbon RPG ${REQUIRED_SYSTEM} GM content is unavailable.`);return m;}
export function sleeveLimits(type){return game.alteredCarbon?.Rules?.SLEEVE_LIMITS?.[type]||null;}

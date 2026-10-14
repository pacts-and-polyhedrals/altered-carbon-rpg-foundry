// Core set: Bay City Commoners compendium, built with the system's own adversary builder.
// Usage: node commonerpack.mjs SYSTEM_DIR PACK_DIR
import {ClassicLevel} from 'classic-level';import fs from 'fs';import path from 'path';import crypto from 'crypto';
const [B,PACK]=process.argv.slice(2);const SYS='altered-carbon-rpg';
const J=f=>JSON.parse(fs.readFileSync(path.join(B,'data',f),'utf8'));
const gm=await import(path.join(B,'module/gm-content.mjs'));
const skills=J('core-skills.json'),catalog=J('item-catalog.json').items,recs=J('commoner-catalog.json').records;
const VERSION=JSON.parse(fs.readFileSync(path.join(B,'system.json'))).version;
const stats={coreVersion:'14.359',systemId:SYS,systemVersion:VERSION,createdTime:1792000000000,modifiedTime:1792000000000,lastModifiedBy:null};
const id=s=>crypto.createHash('sha1').update('commoner:'+s).digest('hex').slice(0,16);
const slug=n=>n.toLowerCase().split('').map(c=>/[a-z0-9]/.test(c)?c:'-').join('').replace(/^-+|-+$/g,'').replace(/--/g,'-');
fs.rmSync(PACK,{recursive:true,force:true});
const db=new ClassicLevel(PACK,{valueEncoding:'json'});const batch=db.batch();
recs.forEach((r,n)=>{
  const {actor,items}=gm.adversaryDocuments(r,skills,{});
  for(const g of r.equipment){const rec=catalog.find(i=>i.name===g);if(!rec)throw new Error('missing gear '+g);
    items.push({name:rec.name,type:rec.type,system:{...structuredClone(rec.system),equipState:rec.type==='armour'?'worn':['weapon','equipment'].includes(rec.type)?'equipped':'carried'},flags:{[SYS]:{coreCatalog:true,catalogId:rec.id,commonerGear:true}}});}
  const tok=`systems/${SYS}/assets/tokens/people/npc-${slug(r.name)}.webp`;
  const aid=id(r.id);
  const a={...actor,_id:aid,folder:null,sort:(n+1)*1000,img:tok,ownership:{default:0},effects:[],_stats:stats,
    prototypeToken:{name:r.name,displayName:20,actorLink:false,disposition:0,width:1,height:1,lockRotation:false,texture:{src:tok,fit:'contain',scaleX:1,scaleY:1},bar1:{attribute:'resources.health'},sight:{enabled:false}},
    system:{...actor.system,identity:{...actor.system.identity,publicName:r.name,archetype:r.category},tactics:r.gmNotes,notes:`<p>${r.gmNotes}</p><p>${r.nonCombatant?'Non-combatant: avoids fights, calls for help, flees.':'Will fight if cornered or paid to.'}${r.minionBonus?` Minion option: +${r.minionBonus} Wounds per extra member in a crowd.`:''}</p>`},
    flags:{[SYS]:{...(actor.flags?.[SYS]||{}),commonerId:r.id,catalogId:r.id,compendiumSource:'core-commoners'}},items:[]};
  items.forEach((it,i)=>{const iid=crypto.createHash('sha1').update(aid+':'+i+':'+it.name).digest('hex').slice(0,16);a.items.push(iid);
    batch.put(`!actors.items!${aid}.${iid}`,JSON.parse(JSON.stringify({_id:iid,...it,effects:[],folder:null,sort:i*100,ownership:{default:0},flags:it.flags||{},_stats:stats})));});
  batch.put(`!actors!${aid}`,a);
});
await batch.write();await db.compactRange('\x00','\xff');await db.close();
for(const f of fs.readdirSync(PACK))if(f==='LOCK'||f.startsWith('LOG'))fs.rmSync(path.join(PACK,f));
console.log(recs.length,'commoners');

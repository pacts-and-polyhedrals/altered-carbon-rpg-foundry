// Build a JournalEntry compendium (LevelDB, embedded pages as their own keys).
import { ClassicLevel } from 'classic-level'; import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
const [jsonPath,dir,version,tag]=process.argv.slice(2);const NS='altered-carbon-rpg';
const entries=JSON.parse(fs.readFileSync(jsonPath,'utf8'));
fs.rmSync(dir,{recursive:true,force:true});
const db=new ClassicLevel(dir,{valueEncoding:'json'});const batch=db.batch();
const hid=s=>crypto.createHash('sha1').update(s).digest('hex').slice(0,16);
let sort=0;
for(const e of entries){
  const _id=hid(`${tag}-${e.name}`);const pages=[];
  e.pages.forEach((p,i)=>{const pid=hid(`${tag}-${e.name}-${p.name}-${i}`);pages.push(pid);
    batch.put(`!journal.pages!${_id}.${pid}`,{_id:pid,name:p.name,type:'text',sort:(i+1)*100000,title:{show:true,level:1},
      text:{format:1,content:`<section class="ac-directory-page ac-oneshot-page">${p.html}</section>`},ownership:{default:-1},flags:p.flags||{},system:{}});});
  batch.put(`!journal!${_id}`,{_id,name:e.name,pages,folder:null,sort:(sort+=100000),ownership:{default:0},categories:[],
    flags:{[NS]:{compendiumSource:tag,directoryVersion:version,...((e.flags||{})[NS]||{})}},_stats:{coreVersion:'14.359',systemId:NS,systemVersion:version,createdTime:Date.now(),modifiedTime:Date.now(),lastModifiedBy:null}});
}
await batch.write();await db.compactRange('\x00','\xff');await db.close();
for(const f of fs.readdirSync(dir))if(f==='LOCK'||f.startsWith('LOG'))fs.rmSync(path.join(dir,f));
console.log('journal entries',entries.length);

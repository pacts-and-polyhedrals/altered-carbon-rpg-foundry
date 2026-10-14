// Book journal compendium: explicit ids (so pages can link to each other), raw case-file HTML, flags kept.
import { ClassicLevel } from 'classic-level'; import fs from 'fs'; import path from 'path';
const [jsonPath,dir,version,tag]=process.argv.slice(2);const NS='altered-carbon-rpg';
const entries=JSON.parse(fs.readFileSync(jsonPath,'utf8'));
fs.rmSync(dir,{recursive:true,force:true});
const db=new ClassicLevel(dir,{valueEncoding:'json'});const batch=db.batch();
const stats={coreVersion:'14.359',systemId:NS,systemVersion:version,createdTime:1792000000000,modifiedTime:1792000000000,lastModifiedBy:null};
let sort=0;
for(const e of entries){
  const pages=[];
  e.pages.forEach((p,i)=>{pages.push(p._id);
    batch.put(`!journal.pages!${e._id}.${p._id}`,{_id:p._id,name:p.name,type:'text',sort:(i+1)*100000,title:{show:false,level:1},
      text:{format:1,content:p.html},ownership:{default:-1},flags:p.flags||{},system:{},_stats:stats});});
  batch.put(`!journal!${e._id}`,{_id:e._id,name:e.name,pages,folder:null,sort:(sort+=100000),ownership:{default:0},categories:[],
    flags:{...(e.flags||{}),[NS]:{compendiumSource:tag,directoryVersion:version,...((e.flags||{})[NS]||{})}},_stats:stats});
}
await batch.write();await db.compactRange('\x00','\xff');await db.close();
for(const f of fs.readdirSync(dir))if(f==='LOCK'||f.startsWith('LOG'))fs.rmSync(path.join(dir,f));
console.log('journal entries',entries.length);

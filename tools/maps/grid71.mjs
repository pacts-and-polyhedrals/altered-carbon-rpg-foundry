import { ClassicLevel } from 'classic-level'; import fs from 'fs'; import path from 'path';
const dir=process.argv[2];const db=new ClassicLevel(dir,{valueEncoding:'json'});const batch=db.batch();
for await (const [k,v] of db.iterator()){ if(!/^!scenes![^.!]+$/.test(k))continue;
 const id=v.flags?.['altered-carbon-rpg']?.streetAtlas?.id;
 if(!id||v.width!==4200)continue; v.grid.size=71; batch.put(k,v); console.log(v.name,id,'→ 71');}
await batch.write();await db.compactRange('\x00','\xff');await db.close();
for(const f of fs.readdirSync(dir))if(f==='LOCK'||f.startsWith('LOG'))fs.rmSync(path.join(dir,f));

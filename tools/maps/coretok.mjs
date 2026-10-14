import { ClassicLevel } from 'classic-level'; import fs from 'fs'; import path from 'path';
const dir=process.argv[2];const db=new ClassicLevel(dir,{valueEncoding:'json'});const batch=db.batch();
const ART={'Airbike':'airbike','Aircar':'aircar','Ground Car':'ground-car'};
for await (const [k,v] of db.iterator()){ if(!k.startsWith('!actors!')||!ART[v.name])continue;
 v.prototypeToken.texture={...(v.prototypeToken.texture||{}),src:`systems/altered-carbon-rpg/assets/tokens/vehicles/${ART[v.name]}.webp`,fit:'contain'};
 batch.put(k,v);console.log(v.name,'→',v.prototypeToken.texture.src);}
await batch.write();await db.compactRange('\x00','\xff');await db.close();
for(const f of fs.readdirSync(dir))if(f==='LOCK'||f.startsWith('LOG'))fs.rmSync(path.join(dir,f));

import { ClassicLevel } from 'classic-level'; import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
const [jsonPath,dir,version]=process.argv.slice(2);const NS='altered-carbon-rpg';
const data=JSON.parse(fs.readFileSync(jsonPath,'utf8'));
fs.rmSync(dir,{recursive:true,force:true});
const db=new ClassicLevel(dir,{valueEncoding:'json'});const batch=db.batch();
const hid=s=>crypto.createHash('sha1').update(s).digest('hex').slice(0,16);
let sort=0;
for(const v of data.vehicles){
  const _id=hid('ac-street-vehicle-'+v.id);
  const actor={_id,name:v.name,type:'vehicle',system:v.system,items:[],effects:[],folder:null,sort:(sort+=100000),ownership:{default:0},
    img:v.img,
    prototypeToken:{name:v.name,displayName:20,actorLink:false,width:v.token.width,height:v.token.height,lockRotation:false,rotation:0,
      texture:{src:v.tokenImg,fit:'contain',scaleX:1,scaleY:1},disposition:0,bar1:{attribute:null},bar2:{attribute:null},sight:{enabled:false}},
    flags:{[NS]:{catalogId:v.id,compendiumSource:'street-vehicles',vehicleClass:v.kind}},
    _stats:{coreVersion:'14.359',systemId:NS,systemVersion:version,createdTime:Date.now(),modifiedTime:Date.now(),lastModifiedBy:null}};
  batch.put(`!actors!${_id}`,actor);
}
await batch.write();await db.compactRange('\x00','\xff');await db.close();
for(const f of fs.readdirSync(dir))if(f==='LOCK'||f.startsWith('LOG'))fs.rmSync(path.join(dir,f));
console.log('street vehicles',data.vehicles.length);

// Build a Scene compendium in both v13 (background) and v14 (levels/initialLevel) formats.
import { ClassicLevel } from 'classic-level'; import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
const [jsonPath,dir,kind,prefix,version]=process.argv.slice(2);const NS='altered-carbon-rpg';
const data={maps:jsonPath.split(',').flatMap(p=>JSON.parse(fs.readFileSync(p,'utf8')).maps)};
fs.rmSync(dir,{recursive:true,force:true});
const db=new ClassicLevel(dir,{valueEncoding:'json'});const batch=db.batch();
const hid=s=>crypto.createHash('sha1').update(s).digest('hex').slice(0,16);
let sort=0;
for(const m of data.maps){
  const _id=hid('ac-'+kind+'-'+m.id),lvl=hid('ac-level-'+m.id),src=`systems/${NS}/assets/maps/${m.file}`;
  const flags={zoneGraph:{zones:m.zones.map(z=>({id:z.id,name:z.name,adjacent:z.adjacent,rect:z.rect}))}};
  if(kind==='streets')flags.streetAtlas={id:m.id,code:m.code,col:m.col,row:m.row,district:m.district,src,links:m.links};
  else flags.bayCityMap={id:m.id,code:m.code,district:m.district,exits:m.exits,src,links:m.links||[]};
  const scene={_id,name:`${prefix}${m.name}`,active:false,navigation:false,navOrder:0,navName:'',
   background:{src,tint:'#ffffff',alphaThreshold:0,offsetX:0,offsetY:0,fit:'fill',scaleX:1,scaleY:1,rotation:0},
   levels:[{_id:lvl,name:'Street',background:{src},foreground:{src:null},elevation:{bottom:0,top:20},sort:0,flags:{}}],initialLevel:lvl,
   thumb:src,width:m.width,height:m.height,padding:0,initial:null,backgroundColor:'#05080a',
   grid:{type:0,size:m.gridSize,style:'solidLines',thickness:1,color:'#000000',alpha:0,distance:1,units:'zone'},
   tokenVision:false,fog:{exploration:false},environment:{darknessLevel:0,globalLight:{enabled:true}},
   drawings:[],tokens:[],lights:[],notes:[],sounds:[],regions:[],templates:[],tiles:[],walls:[],
   playlist:null,playlistSound:null,journal:null,journalEntryPage:null,weather:'',folder:null,sort:(sort+=100000),ownership:{default:0},
   flags:{[NS]:flags},_stats:{coreVersion:'14.359',systemId:NS,systemVersion:version,createdTime:Date.now(),modifiedTime:Date.now(),lastModifiedBy:null}};
  const level=scene.levels[0];scene.levels=[lvl];   // LevelDB packs keep embedded documents as their own entries
  batch.put(`!scenes!${_id}`,scene);
  batch.put(`!scenes.levels!${_id}.${lvl}`,level);
}
await batch.write();await db.compactRange('\x00','\xff');await db.close();
for(const f of fs.readdirSync(dir))if(f==='LOCK'||f.startsWith('LOG'))fs.rmSync(path.join(dir,f));
console.log(kind,data.maps.length,'scenes');

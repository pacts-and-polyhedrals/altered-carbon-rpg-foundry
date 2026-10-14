// Party at an exit (v2.6.0)
// When every player character on a Bay City / Cold Storage map is gathered at an exit (or at a spot
// several exits share), the GM is asked where the party goes: one button per destination, showing
// the map and the zone they will arrive in. Choosing one moves the whole party (vehicles with their
// riders; into a building the car is parked outside and the riders walk in) and switches everyone
// to that scene. Nothing moves until the GM chooses.
import {mapLinks,mapOf,transfer,linkId,isStreetMapId} from './map-transit.mjs';
const NS='altered-carbon-rpg',CS='cold-storage';
const esc=v=>foundry.utils.escapeHTML(String(v??''));
const leaderGM=()=>game.users.activeGM??game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]??null;
const isLeader=()=>leaderGM()?.id===game.user.id;
const seatOf=t=>t?.getFlag?.(NS,'vehicleSeat')||null;

/* ------------------------------------------------------------------ pure helpers */
/** Player characters on a scene: character Actors with a non-GM owner, not hidden. */
export function partyTokens(scene,users=game.users){
  const players=users.filter(u=>!u.isGM);
  return (scene?.tokens?.contents??scene?.tokens??[]).filter(t=>!t.hidden&&t.actor?.type==='character'&&players.some(u=>t.actor.testUserPermission?.(u,'OWNER')));
}
/** The exits whose area (the exit strip plus `pad` squares around it) holds every party token. */
export function gatheredExits(scene,party,links=mapLinks(scene),pad=2){
  if(!party.length)return [];
  const g=scene?.grid?.size||100,P=pad*g;
  const centre=t=>[Number(t.x)+Number(t.width||1)*g/2,Number(t.y)+Number(t.height||1)*g/2];
  return links.filter(l=>l.to&&l.kind!=='district'&&party.every(t=>{const [x,y]=centre(t);return x>=l.rect[0]-P&&x<=l.rect[0]+l.rect[2]+P&&y>=l.rect[1]-P&&y<=l.rect[1]+l.rect[3]+P;}));
}
/** One option per distinct destination (same map and landing spot). */
export function destinationOptions(links){
  const seen=new Map();
  for(const l of links){const k=`${l.to}|${Array.isArray(l.land)?l.land.join(','):l.edge}`;if(!seen.has(k))seen.set(k,l);}
  return [...seen.values()];
}
/** Zone name at a point on a map, from the bundled map data. */
export function zoneAtPoint(zones,p){
  return (zones||[]).find(z=>p[0]>=z.rect[0]&&p[0]<=z.rect[0]+z.rect[2]&&p[1]>=z.rect[1]&&p[1]<=z.rect[1]+z.rect[3])?.name||'';
}

/* ------------------------------------------------------------------ map data (names and zones) */
let index=null;
async function mapIndex(){
  if(index)return index;index=new Map();
  const load=async u=>{try{const r=await fetch(u);return r.ok?await r.json():null;}catch(_e){return null;}};
  for(const f of ['bay-city-street-atlas.json','bay-city-maps.json','bay-city-places.json','bay-city-street-overview.json']){
    const d=await load(`systems/${NS}/data/${f}`);for(const m of d?.maps||[])index.set(m.id,{name:m.name,zones:m.zones||[]});
  }
  if(game.modules?.get?.(CS)?.active){const d=await load(`modules/${CS}/content-src/maps.json`);for(const m of d?.maps||[])index.set(m.id,{name:m.name,zones:m.zones||[]});}
  return index;
}
async function describe(link){
  const i=await mapIndex(),m=i.get(link.to);const name=m?.name||link.toName||link.to;
  if(link.edge)return {name,arrive:`the matching ${({N:'south',S:'north',E:'west',W:'east'})[link.edge]} edge`};
  return {name,arrive:Array.isArray(link.land)?zoneAtPoint(m?.zones,link.land)||'the entrance':'the entrance'};
}

/* ------------------------------------------------------------------ moving the party */
export async function movePartyThrough(scene,link){
  const party=partyTokens(scene);if(!party.length)throw new Error('No player characters on this map.');
  const vehicles=new Map(),walkers=[];
  for(const t of party){const s=seatOf(t);const vt=s&&scene.tokens.get(s.vehicleTokenId);if(vt)vehicles.set(vt.id,vt);else walkers.push(t);}
  let result=null;
  for(const vt of vehicles.values())result=await transfer(scene,vt,link,{user:game.user})||result;
  if(walkers.length)result=await transfer(scene,walkers[0],link,{user:game.user,companions:walkers.slice(1)})||result;
  const target=result?.scene;
  if(target){await target.activate?.();await target.view?.();}
  return result;
}

/* ------------------------------------------------------------------ the GM prompt */
const prompted=new Map();   // scene id -> signature of the exits already asked about
let pending=null;
function enabled(){try{return game.settings.get(NS,'partyExitPrompt')!==false;}catch(_e){return true;}}
async function check(scene){
  if(!scene||!enabled()||!isLeader()||!mapOf(scene))return;
  const party=partyTokens(scene);const here=gatheredExits(scene,party);
  const sig=destinationOptions(here).map(linkId).sort().join(';');
  if(!sig){prompted.delete(scene.id);return;}
  if(prompted.get(scene.id)===sig)return;
  prompted.set(scene.id,sig);
  const options=destinationOptions(here);
  const described=await Promise.all(options.map(describe));
  const buttons=options.map((l,i)=>({action:`go-${i}`,label:`${described[i].name} — arrive: ${described[i].arrive}`,icon:isStreetMapId(l.to)?'fa-solid fa-road':'fa-solid fa-door-open'}));
  buttons.push({action:'stay',label:'Not yet',icon:'fa-solid fa-hand',default:true});
  const names=party.map(t=>esc(t.name)).join(', ');
  const choice=await foundry.applications.api.DialogV2.wait({window:{title:'The party is at an exit',icon:'fa-solid fa-route'},
    content:`<p><strong>${names}</strong> ${party.length>1?'are all':'is'} at ${options.length>1?'exits leading to':'the way to'} ${options.length>1?`${options.length} places`:`<strong>${esc(described[0].name)}</strong>`} on <em>${esc(scene.name)}</em>.</p><p>Choose where they go. Everyone moves together and the scene changes for all players.</p>`,
    buttons,rejectClose:false}).catch(()=>null);
  if(!choice||choice==='stay')return;
  const link=options[Number(String(choice).slice(3))];if(!link)return;
  try{await movePartyThrough(scene,link);prompted.delete(scene.id);}catch(error){ui.notifications.warn(error.message);}
}
export function installPartyExits(){
  try{game.settings.register(NS,'partyExitPrompt',{name:'Ask the GM when the party reaches an exit',hint:'When every player character on a Bay City or Cold Storage map is gathered at an exit, the GM chooses where they go and the scene changes for everyone.',scope:'world',config:true,type:Boolean,default:true});}catch(_e){}
  Hooks.on('updateToken',(doc,changes,options)=>{
    if(options?.acTransit||!(('x' in changes)||('y' in changes))||!isLeader())return;
    clearTimeout(pending);pending=setTimeout(()=>check(doc.parent).catch(error=>console.warn('Altered Carbon | party exit',error)),400);
  });
}
export const _check=check; // for tests

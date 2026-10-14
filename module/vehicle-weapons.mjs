// Mounted vehicle weapons (v2.6.2)
// A vehicle's Weapon Items (dragged onto the vehicle, or the built-in roof turret) are fired by
// whoever sits in a Gunner seat. The attack is the gunner's own weapon Skill Check through the
// normal Tactical Attack dialog, with the vehicle's Fire Control as a Gear Bonus (reduced by 1 for
// every point of lost Structure, Core vehicle rules). Available from the vehicle sheet and from the
// token HUD (right-click the vehicle or the gunner) only while someone is manning the gun.
import {seatLayout} from './vehicle-seat-math.mjs';
import {hasAbility,seatInfo} from './vehicle-abilities.mjs';
import {parseCrew} from './vehicle-operations.mjs';

const NS='altered-carbon-rpg',SOCKET=`system.${NS}`,OCC='vehicleOccupants';
const esc=v=>foundry.utils.escapeHTML(String(v??''));
const leaderGM=()=>game.users.activeGM??game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]??null;
const isLeader=()=>leaderGM()?.id===game.user.id;

/** The roof turret fitted to vehicles with the Roof turret ability (the CTAC Rhino). */
export const TURRET_WEAPON=Object.freeze({
  name:'Roof Turret Railgun',type:'weapon',
  img:'systems/altered-carbon-rpg/assets/emblems/items/ctac-praetorian-railgun.svg',
  system:{catalogId:'vehicle.weapon.roof-turret-railgun',category:'Vehicle Weapons',
    description:'Remote roof turret: a CTAC rail cannon on a powered ring mount, fired from the Gunner seat.',
    skill:'firearms',skillCheck:'Firearms — Railgun (vehicle mount)',capacity:60,damage:'2d10',damageType:'Piercing',
    depletion:0,depletionMode:'check',depletionFormula:'1',exhausted:false,range:'All Zones',gearBonus:0,bonusDice:'',bonusDiceCount:0,
    accuracy:1,armorPiercing:true,deadly:0,firingMode:'semi-automatic',powered:true,heavy:0,bodySlots:'Vehicle mount',quantity:1,
    equipState:'equipped',standardIssue:'CTAC',
    specialRules:'Vehicle-mounted: fired only by a character in the Gunner seat. The vehicle\'s Fire Control is a Gear Bonus (−1 per lost Structure). Armor Piercing; Magazine; Powered.',
    triggeredEffects:'<ul><li>Hit (+): damage; Accuracy 1.</li><li>Reload (Speed): the gunner clears DP from the turret magazine.</li></ul>'}
});

/* ------------------------------------------------------------------ pure helpers */
/** Fire Control after Structure damage: each lost Structure reduces it by 1. */
export function effectiveFireControl(vehicle={}){
  const lost=Math.max(0,Number(vehicle.structure?.max||0)-Number(vehicle.structure?.value||0));
  return Math.max(0,Number(vehicle.fireControl||0)-lost);
}
/** Weapon Items carried by the vehicle Actor. */
export function vehicleWeapons(actor){return (actor?.items?.contents??[...(actor?.items??[])]).filter(i=>i.type==='weapon');}
/** Can this vehicle mount a gun at all: it has Weapon Items or the Roof turret ability. */
export function hasMountedWeapons(actor){return vehicleWeapons(actor).length>0||hasAbility(actor,'turret');}
/** Gunner seat ids for this vehicle. */
export function gunnerSeatIds(actor){return seatLayout(actor).filter(s=>s.role==='gunner').map(s=>s.id);}
/** Tokens sitting in a Gunner seat of this vehicle token. */
export function mannedGunners(vt){
  const seats=new Set(gunnerSeatIds(vt?.actor));const raw=vt?.getFlag?.(NS,OCC);
  return (Array.isArray(raw)?raw:[]).filter(o=>seats.has(o?.seatId)).map(o=>vt.parent?.tokens?.get(o.tokenId)).filter(t=>t?.actor);
}
/** Gunners from the vehicle's crew roster (used when the vehicle is not on a scene). */
export function rosterGunners(actor,actors=game.actors){
  return parseCrew(actor?.system?.vehicle?.crewAssignments||'[]').filter(c=>c.role==='gunner').map(c=>actors.get(c.actorId)).filter(Boolean);
}
const canFireAs=(actor,user=game.user)=>Boolean(user?.isGM||actor?.testUserPermission?.(user,'OWNER')||actor?.isOwner);

/* ------------------------------------------------------------------ GM-side work (socket) */
const waiting=new Map();
const ACTIONS={
  async fit({vehicleUuid}){
    const actor=await fromUuid(vehicleUuid);if(!actor)throw new Error('Vehicle not found.');
    if(vehicleWeapons(actor).length||!hasAbility(actor,'turret'))return true;
    await actor.createEmbeddedDocuments('Item',[foundry.utils.deepClone(TURRET_WEAPON)]);return true;
  },
  async deplete({weaponUuid,options}){
    const weapon=await fromUuid(weaponUuid);if(!weapon)throw new Error('Weapon not found.');
    const r=await weapon.useDepletion(options||{});
    return {skipped:r.skipped,reason:r.reason,depletion:r.depletion,capacity:r.capacity,added:r.added,rollResult:r.rollResult??null,tr:r.tr??null,passed:r.passed??null,exhausted:r.exhausted};
  }
};
async function request(type,data){
  if(isLeader()||game.user.isGM)return ACTIONS[type](data);
  if(!leaderGM())throw new Error('A GM must be connected.');
  const reqId=foundry.utils.randomID();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{waiting.delete(reqId);reject(new Error('The GM did not answer in time.'));},8000);
    waiting.set(reqId,{resolve,reject,timer});
    game.socket.emit(SOCKET,{type:`acWeapon.${type}`,data:{...data,reqId,userId:game.user.id}});
  });
}

/* ------------------------------------------------------------------ firing */
/** A weapon the gunner can fire. If they do not own the vehicle, the GM applies its Depletion. */
function firingProxy(weapon){
  if(weapon.isOwner)return weapon;
  return new Proxy(weapon,{get(target,key){
    if(key==='useDepletion')return options=>request('deplete',{weaponUuid:target.uuid,options});
    const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v;
  }});
}
async function pick(title,label,choices){
  if(choices.length<2)return choices[0]??null;
  const form=await foundry.applications.api.DialogV2.input({window:{title},content:`<label><span>${esc(label)}</span><select name="pick">${choices.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join('')}</select></label>`});
  return form?choices[Number(form.pick)]??null:null;
}
/**
 * Fire one of the vehicle's mounted weapons.
 * @param {TokenDocument|null} vt   the vehicle token (null when firing from a sheet off-scene)
 * @param {Actor} vehicle           the vehicle Actor
 */
export async function fireMountedWeapon(vt,vehicle=vt?.actor,{weaponId=null,gunnerTokenId=null}={}){
  if(!vehicle)throw new Error('Vehicle not found.');
  if(!hasMountedWeapons(vehicle))throw new Error(`${vehicle.name} has no mounted weapons. Drag a Weapon Item onto the vehicle to fit one.`);
  if(!gunnerSeatIds(vehicle).length)throw new Error(`${vehicle.name} has no Gunner seat (raise Full crew and Fire Control on the sheet).`);
  // Who is on the gun.
  let gunners=vt?mannedGunners(vt).map(t=>({name:t.name,actor:t.actor,token:t})):rosterGunners(vehicle).map(a=>({name:a.name,actor:a,token:null}));
  if(!gunners.length)throw new Error(`Nobody is manning the gun on the ${vehicle.name}. Put someone in the Gunner seat first.`);
  const mine=gunners.filter(g=>canFireAs(g.actor));
  if(!mine.length)throw new Error(`Only ${gunners.map(g=>g.name).join(' or ')}'s player or the GM can fire the ${vehicle.name}'s gun.`);
  const gunner=gunnerTokenId?mine.find(g=>g.token?.id===gunnerTokenId):await pick(`${vehicle.name}: who fires`,'Gunner',mine);if(!gunner)return null;
  // Which gun.
  if(!vehicleWeapons(vehicle).length)await request('fit',{vehicleUuid:vehicle.uuid});
  const weapons=vehicleWeapons(vehicle);if(!weapons.length)throw new Error('The turret could not be fitted. Ask the GM to try again.');
  const weapon=weaponId?weapons.find(w=>w.id===weaponId):await pick(`${vehicle.name}: weapon`,'Weapon',weapons);if(!weapon)return null;
  if(weapon.system.exhausted)throw new Error(`${weapon.name} is Exhausted: reload it (remove Depletion) on the vehicle sheet.`);
  // The gunner aims from their seat, so their token is the attacker.
  if(gunner.token?.object&&!gunner.token.object.controlled)gunner.token.object.control({releaseOthers:true});
  const fc=effectiveFireControl(vehicle.system?.vehicle);
  const {startWeaponAttack}=await import('./weapon-ui.mjs');const {checkOptionsDialog}=await import('./sheets.mjs');
  const withFireControl=(skill,defaults={})=>checkOptionsDialog(skill,{...defaults,gearBonus:Math.max(Number(defaults.gearBonus||0),fc)});
  return startWeaponAttack(gunner.actor,firingProxy(weapon),withFireControl);
}

/* ------------------------------------------------------------------ install */
function hudButton(icon,title,fn){const b=document.createElement('button');b.type='button';b.className='control-icon ac-weapon-hud';b.title=title;b.dataset.tooltip=title;b.setAttribute('aria-label',title);b.innerHTML=`<i class="${icon}" inert></i>`;
  b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();Promise.resolve().then(fn).catch(error=>ui.notifications.warn(error.message));});return b;}
export function installVehicleWeapons(){
  game.socket.on(SOCKET,async payload=>{
    const type=String(payload?.type||'');
    if(type==='acWeapon.reply'){const w=waiting.get(payload.data?.reqId);if(!w||payload.data?.userId!==game.user.id)return;clearTimeout(w.timer);waiting.delete(payload.data.reqId);payload.data.error?w.reject(new Error(payload.data.error)):w.resolve(payload.data.result);return;}
    if(!type.startsWith('acWeapon.')||!isLeader())return;
    const fn=ACTIONS[type.slice(9)];if(!fn)return;const d=payload.data||{};
    let result=null,error=null;try{result=await fn(d);}catch(e){error=e.message;}
    game.socket.emit(SOCKET,{type:'acWeapon.reply',data:{reqId:d.reqId,userId:d.userId,result,error}});
  });
  Hooks.on('renderTokenHUD',(hud,html)=>{
    try{
      const root=html instanceof HTMLElement?html:html?.[0];const doc=hud.document??hud.object?.document;if(!root||!doc)return;
      const col=root.querySelector('.col.right')||root.querySelector('.right');if(!col||col.querySelector('.ac-weapon-hud'))return;
      let vt=null,gunnerTokenId=null;
      if(doc.actor?.type==='vehicle')vt=doc;
      else{const info=seatInfo(doc);if(info&&gunnerSeatIds(info.vehicle).includes(info.seatId)){vt=info.vt;gunnerTokenId=doc.id;}}
      if(!vt||!hasMountedWeapons(vt.actor))return;
      const manned=mannedGunners(vt).filter(t=>canFireAs(t.actor));if(!manned.length)return;
      col.append(hudButton('fa-solid fa-crosshairs',`Fire the ${vt.name}'s weapon (target first)`,()=>fireMountedWeapon(vt,vt.actor,{gunnerTokenId})));
    }catch(error){console.warn('Altered Carbon | weapon HUD',error);}
  });
}
export const _actions=ACTIONS; // for tests

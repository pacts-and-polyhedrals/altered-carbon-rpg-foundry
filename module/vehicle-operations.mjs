/** Typed, safe vehicle resource/crew helpers. No implicit vehicle action or fuel rules. */
const int=(n,min,max)=>Number.isSafeInteger(Number(n))&&Number(n)>=min&&Number(n)<=max;
export const CREW_ROLES=Object.freeze(['pilot','gunner','operator','passenger']);
export function resourceAdjustment(resource,delta){
 const max=Number(resource?.max),current=Number(resource?.value),diff=Number(delta);
 if(!int(max,0,100000)||!int(current,0,max)||!int(diff,-100000,100000))throw new Error('Vehicle resource and adjustment must be whole numbers within their limits.');
 return {before:current,after:Math.max(0,Math.min(max,current+diff)),max,delta:diff};
}
export function parseCrew(raw){let items;
 try{items=typeof raw==='string'?JSON.parse(raw||'[]'):raw;}catch{throw new Error('Vehicle crew JSON is not valid.');}
 if(!Array.isArray(items))throw new Error('Vehicle crew must be a JSON array.');
 const ids=new Set(),pilots=new Set();
 return items.map((c,i)=>{if(!c||typeof c!=='object')throw new Error(`Crew assignment ${i+1} is invalid.`);
  const actorId=String(c.actorId||'').trim(),role=String(c.role||'passenger');
  if(!/^[a-zA-Z0-9]{1,32}$/.test(actorId)||!CREW_ROLES.includes(role))throw new Error(`Crew assignment ${i+1} needs a valid Actor and role.`);
  if(ids.has(actorId))throw new Error('An Actor cannot occupy two vehicle crew positions.');ids.add(actorId);
  if(role==='pilot')pilots.add(actorId);
  return {actorId,role};
 });
}
export function crewProfile(vehicle,raw){const assigned=parseCrew(raw??vehicle.crewAssignments??'[]');const required=Number(vehicle.crewSkeleton||0),standard=Number(vehicle.crewStandard||0),full=Number(vehicle.crewFull||0),passengers=Number(vehicle.passengers||0);
 if(![required,standard,full,passengers].every(x=>int(x,0,1000)))throw new Error('Vehicle crew limits must be valid whole numbers.');
 const crew=assigned.filter(x=>x.role!=='passenger'),passengerList=assigned.filter(x=>x.role==='passenger');
 const limit=full||Math.max(required,standard);
 return {assigned,crewCount:crew.length,passengerCount:passengerList.length,required,standard,full:limit,passengerLimit:passengers,hasPilot:crew.some(x=>x.role==='pilot'),shortCrew:crew.length<required,overCrew:limit>0&&crew.length>limit,overPassengers:passengerList.length>passengers,
  ready:crew.length>=required&&!(limit>0&&crew.length>limit)&&passengerList.length<=passengers&&crew.some(x=>x.role==='pilot')};
}
export function validateCrewAssignment(vehicle,raw,{actorIds=null}={}){
 const p=crewProfile(vehicle,raw);
 if(p.overCrew)throw new Error(`Maximum operational crew is ${p.full}.`);
 if(p.overPassengers)throw new Error(`Maximum listed passengers is ${p.passengerLimit}.`);
 if(actorIds){const valid=new Set(actorIds);for(const c of p.assigned)if(!valid.has(c.actorId))throw new Error('A crew assignment refers to a missing Actor.');}
 return p;
}

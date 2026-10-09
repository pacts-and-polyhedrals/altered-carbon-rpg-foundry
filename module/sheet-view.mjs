/** Read-only sheet view-model. Never writes Actor documents during render. */
export function percentage(value,max){const n=Number(value),m=Number(max);return m>0&&Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n/m*100))):0;}
export function summarizeResources(system={},ac={}){
 const r=system.resources||{};const one=(resource,label)=>({label,value:Number(resource?.value||0),max:Number(resource?.max||0),pct:percentage(resource?.value,resource?.max)});
 return {health:one(r.health,'Health'),ego:one(r.ego,'Ego'),wounds:{label:'Wounds',value:Number(r.wounds?.value||0),max:Number(ac.damageThreshold||0),pct:percentage(r.wounds?.value,ac.damageThreshold)},stackPoints:one(r.stackPoints,'Stack Points'),influence:one(r.influence,'Influence')};
}
export function actorAlerts({system={},resources={},injuries=[],conditions=[],equipment=[],pendingDamageCount=0,armour={issues:[]},load={}}={}){
 const alerts=[];const push=(level,label,detail)=>alerts.push({level,label,detail,isDanger:level==='danger',isWarning:level==='warning'});
 if(system.stackState==='damaged'||system.stackState==='destroyed')push('danger','Stack integrity',String(system.stackState));
 if(system.sleeveState==='dying'||system.sleeveState==='dead')push('danger','Sleeve at risk',String(system.sleeveState));
 if(resources.ego?.max&&resources.ego.value<=Math.floor(resources.ego.max*.25))push('danger','Critical Ego',`${resources.ego.value} EP remaining`);
 if(resources.health?.max&&resources.health.value<=Math.floor(resources.health.max*.25))push('warning','Low health',`${resources.health.value} HP remaining`);
 if(pendingDamageCount>0)push('warning','Wounds awaiting resolution',`${pendingDamageCount} incoming attack${pendingDamageCount===1?'':'s'}`);
 if(conditions.length)push('warning','Active conditions',`${conditions.length} condition${conditions.length===1?'':'s'}`);
 if(injuries.length)push('warning','Injuries',`${injuries.length} recorded`);
 if(load?.encumbered)push('warning','Overburdened',`Encumbrance ${load.level}`);
 if(armour?.issues?.length)push('warning','Armour conflict',`${armour.issues.length} issue${armour.issues.length===1?'':'s'}`);
 if(equipment.some(e=>e.isDrug&&e.system?.addicted))push('warning','Addiction check','Review Clinical Console');
 return alerts;
}
const KEY_SKILLS=['Firearms','Detection','Discipline','Composure','Investigation','Read Person','Brawl','Melee Combat','Digital Networking','Data Engineering','Athletics','Medicine'];
export function quickSkills(items=[],limit=8){const keys=KEY_SKILLS.map(x=>x.toLowerCase());return items.filter(i=>i.type==='skill').sort((a,b)=>{const ai=keys.indexOf(a.name.toLowerCase()),bi=keys.indexOf(b.name.toLowerCase());return (ai<0?999:ai)-(bi<0?999:bi)||a.name.localeCompare(b.name);}).slice(0,Math.max(0,limit));}
export function quickLoadout(items=[],limit=4){return items.filter(e=>['weapon','armour','drug','equipment','software'].includes(e.type)&&['equipped','worn'].includes(e.system?.equipState)).slice(0,limit);}

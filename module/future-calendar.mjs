/** A projected Gregorian-style display driven by the player's real clock and selected IANA zone.
 * This is not Foundry's campaign time and does not modify game.time.worldTime.
 */
export const CLOCK_ZONES=Object.freeze([
 {id:'world',label:'World default'}, {id:'UTC',label:'UTC / Orbital Standard'},
 {id:'America/Los_Angeles',label:'Bay City · Pacific'},
 {id:'America/New_York',label:'New York · Eastern'},
 {id:'America/Mexico_City',label:'Mexico City'},
 {id:'America/Guatemala',label:'Guatemala'},
 {id:'America/Chicago',label:'Chicago · Central'},
 {id:'America/Denver',label:'Denver · Mountain'},
 {id:'Europe/London',label:'London'},
 {id:'Europe/Paris',label:'Paris'},
 {id:'Asia/Tokyo',label:'Tokyo'},
 {id:'Asia/Singapore',label:'Singapore'},
 {id:'Australia/Sydney',label:'Sydney'}
]);
export function timeZoneValid(zone){try{new Intl.DateTimeFormat('en-US',{timeZone:zone}).format(new Date());return true;}catch{return false;}}
export function effectiveZone(client='world',world='America/Los_Angeles'){const selected=client==='world'?world:client;return timeZoneValid(selected)?selected:'UTC';}
export function futureYear(realYear,{anchorReal=2026,anchorFuture=2384}={}){
 if(!Number.isInteger(realYear)||!Number.isInteger(anchorReal)||!Number.isInteger(anchorFuture)||anchorFuture<100||anchorFuture>9999)throw new Error('Clock anchor years must be valid integers.');
 const result=anchorFuture+(realYear-anchorReal);if(result<1||result>9999)throw new Error('Projected year exceeds display limits.');return result;
}
export function clockParts(instant=new Date(),{zone='America/Los_Angeles',anchorReal=2026,anchorFuture=2384}={}){
 const at=instant instanceof Date?instant:new Date(instant);if(Number.isNaN(at.getTime()))throw new Error('Invalid real-world timestamp.');
 if(!timeZoneValid(zone))throw new Error('Invalid IANA time zone.');
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZoneName:'short'}).formatToParts(at).map(p=>[p.type,p.value]));
 const year=Number(parts.year),month=Number(parts.month),day=Number(parts.day),hour=Number(parts.hour);
 return {realYear:year,year:futureYear(year,{anchorReal,anchorFuture}),month,day,hour,minute:Number(parts.minute),second:Number(parts.second),weekday:parts.weekday,zone,zoneShort:parts.timeZoneName};
}
const MONTHS=Object.freeze(['January','February','March','April','May','June','July','August','September','October','November','December']);
const DAY_NAMES=Object.freeze(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);
export function clockDisplay(instant=new Date(),settings={}){
 const p=clockParts(instant,settings),pad=n=>String(n).padStart(2,'0');
 return {...p,date:`${p.weekday} ${pad(p.day)} ${MONTHS[p.month-1]} ${p.year}`,time:`${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`,short:`${pad(p.day)} ${MONTHS[p.month-1].slice(0,3).toUpperCase()} ${p.year} · ${pad(p.hour)}:${pad(p.minute)} ${p.zoneShort}`};
}
/** Real month grid, projected year caption. Day-of-week always follows the real calendar. */
export function calendarMonth(instant=new Date(),settings={},offset=0){
 const p=clockParts(instant,settings);const first=new Date(Date.UTC(p.realYear,p.month-1+Math.trunc(Number(offset)||0),1));
 const realYear=first.getUTCFullYear(),month=first.getUTCMonth()+1,dayCount=new Date(Date.UTC(realYear,month,0)).getUTCDate();
 const leading=(first.getUTCDay()+6)%7;
 const cells=Array.from({length:Math.ceil((leading+dayCount)/7)*7},(_,i)=>{const day=i-leading+1;return {day:day>=1&&day<=dayCount?day:null,isToday:realYear===p.realYear&&month===p.month&&day===p.day,key:`${realYear}-${month}-${day}`};});
 return {title:`${MONTHS[month-1]} ${futureYear(realYear,settings)}`,realYear,month,days:DAY_NAMES,cells,today:p.day,zone:p.zone};
}

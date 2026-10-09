import {CLOCK_ZONES,effectiveZone,clockDisplay,calendarMonth,timeZoneValid} from './future-calendar.mjs';
const NS='altered-carbon-rpg';
function getSetting(name,fallback){try{return game.settings.get(NS,name)??fallback;}catch{return fallback;}}
export function clockSettings(){const world=getSetting('clockTimeZone','America/Los_Angeles'),client=getSetting('clockClientZone','world');return {zone:effectiveZone(client,world),worldZone:world,clientZone:client,anchorReal:Number(getSetting('clockAnchorReal',2026)),anchorFuture:Number(getSetting('clockAnchorFuture',2384))};}
export function futureClockLabel(instant=new Date()){return clockDisplay(instant,clockSettings()).short;}
export function registerFutureClockSettings(){
 game.settings.register(NS,'clockTimeZone',{name:'Future Clock — World Time Zone',hint:'An IANA time zone, e.g. America/Los_Angeles (Bay City). Overrides can be set per player.',scope:'world',config:true,type:String,default:'America/Los_Angeles',onChange:()=>refreshClockDisplays()});
 game.settings.register(NS,'clockAnchorReal',{name:'Future Clock — Real-World Anchor Year',hint:'The real calendar year that maps to the setting year below.',scope:'world',config:true,type:Number,default:2026,onChange:()=>refreshClockDisplays()});
 game.settings.register(NS,'clockAnchorFuture',{name:'Future Clock — Fictional Anchor Year',hint:'2026 → 2384 by default. Month/day/weekday/time follow the real calendar in the selected time zone.',scope:'world',config:true,type:Number,default:2384,onChange:()=>refreshClockDisplays()});
 game.settings.register(NS,'clockClientZone',{name:'Future Clock — Your Display Time Zone',hint:'Select your personal IANA display zone or use the GM world default.',scope:'client',config:false,type:String,default:'world',onChange:()=>refreshClockDisplays()});
 game.settings.registerMenu(NS,'futureCalendar',{name:'Altered Carbon — Future Calendar & Time Zone',label:'Open Future Calendar',hint:'Live real-world date/time projected into the chosen future year, with individual time zone display.',icon:'fa-solid fa-calendar-days',type:ACFutureCalendar,restricted:false});
}
export function refreshClockDisplays(){if(typeof document==='undefined')return;let short;try{short=futureClockLabel();}catch{return;}document.querySelectorAll('[data-ac-world-clock]').forEach(el=>{el.textContent=short;el.setAttribute('datetime',new Date().toISOString());});}
let ticking=null;
export function startWorldClockTicker(){if(ticking!=null||typeof window==='undefined')return;refreshClockDisplays();ticking=window.setInterval(refreshClockDisplays,1000);}
export function stopWorldClockTicker(){if(ticking!=null&&typeof window!=='undefined')window.clearInterval(ticking);ticking=null;}
export class ACFutureCalendar extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
 static DEFAULT_OPTIONS={id:'ac-future-calendar',classes:['altered-carbon','ac-calendar-window'],window:{title:'Altered Carbon · Temporal Uplink'},position:{width:730,height:670},actions:{previous:this._previous,next:this._next,today:this._today,worldOptions:this._worldOptions}};
 static PARTS={main:{template:'systems/altered-carbon-rpg/templates/future-calendar.hbs'}};
 _offset=0;_ticker=null;
 async _prepareContext(options){const c=await super._prepareContext(options),settings=clockSettings(),now=new Date(),display=clockDisplay(now,settings),calendar=calendarMonth(now,settings,this._offset);
  const zoneOptions=CLOCK_ZONES.map(z=>({...z,selected:z.id===settings.clientZone}));if(!zoneOptions.some(z=>z.selected))zoneOptions.push({id:settings.clientZone,label:settings.clientZone,selected:true});
  return {...c,display,calendar,zoneOptions,gm:game.user.isGM,worldZone:settings.worldZone,clockSettings:settings};
 }
 async _onRender(context,options){await super._onRender(context,options);const root=this.element;root?.querySelector('[data-ac-calendar-zone]')?.addEventListener('change',async event=>{const zone=String(event.target.value);if(zone!=='world'&&!timeZoneValid(zone))return ui.notifications.error('Invalid time zone.');await game.settings.set(NS,'clockClientZone',zone);this.render({force:true});});
  this._updateTick();if(this._ticker==null&&typeof window!=='undefined')this._ticker=window.setInterval(()=>this._updateTick(),1000);
 }
 _updateTick(){if(!this.element)return;try{const d=clockDisplay(new Date(),clockSettings());const t=this.element.querySelector('[data-ac-clock-time]');if(t)t.textContent=d.time;const date=this.element.querySelector('[data-ac-clock-date]');if(date)date.textContent=d.date;const z=this.element.querySelector('[data-ac-clock-zone]');if(z)z.textContent=d.zoneShort;}catch{} }
 async _onClose(options){if(this._ticker!=null&&typeof window!=='undefined')window.clearInterval(this._ticker);this._ticker=null;return super._onClose(options);}
 static async _previous(){this._offset-=1;this.render({force:true});}
 static async _next(){this._offset+=1;this.render({force:true});}
 static async _today(){this._offset=0;this.render({force:true});}
 static async _worldOptions(){if(!game.user.isGM)return;const cfg=clockSettings();const content=`<p>All players see the same fictional year. Each can choose their display time zone independently.</p><label>World IANA Time Zone<input type="text" name="worldZone" value="${foundry.utils.escapeHTML(cfg.worldZone)}"></label><label>Real-world base year<input type="number" name="anchorReal" min="1900" max="9999" value="${cfg.anchorReal}"></label><label>In-world base year<input type="number" name="anchorFuture" min="100" max="9999" value="${cfg.anchorFuture}"></label>`;const form=await foundry.applications.api.DialogV2.input({window:{title:'Configure World Calendar'},content});if(!form)return;const get=k=>form instanceof FormData?form.get(k):form[k];const z=String(get('worldZone')||'UTC'),real=Number(get('anchorReal')),future=Number(get('anchorFuture'));if(!timeZoneValid(z)||!Number.isInteger(real)||real<1900||real>9999||!Number.isInteger(future)||future<100||future>9999)return ui.notifications.error('Enter a valid IANA zone and integer base years.');for(const [key,v] of [['clockTimeZone',z],['clockAnchorReal',real],['clockAnchorFuture',future]])await game.settings.set(NS,key,v);this.render({force:true});}
}

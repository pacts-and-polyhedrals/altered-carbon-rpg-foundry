import {readFile} from 'node:fs/promises';
export const dialogs=[],dice=[],notifications=[];
export class Collection extends Array {get contents(){return this;}get(id){return this.find(x=>x.id===id);} }
const clone=x=>JSON.parse(JSON.stringify(x));
export function get(object,path){return String(path).split('.').reduce((v,k)=>v?.[k],object);}
export function set(object,path,value){const parts=path.split('.');let target=object;for(const part of parts.slice(0,-1))target=target[part]??={};target[parts.at(-1)]=value;}
export function flatten(object,prefix='',out={}){for(const [key,value] of Object.entries(object||{})){const path=prefix?prefix+'.'+key:key;if(value&&typeof value==='object'&&!Array.isArray(value))flatten(value,path,out);else out[path]=value;}return out;}
export function expand(object){const out={};for(const [key,value] of Object.entries(object))set(out,key,value);return out;}
const hookMap=new Map();
export const Hooks=globalThis.Hooks={on:(name,fn)=>{const list=hookMap.get(name)||[];list.push(fn);hookMap.set(name,list);},once:(name,fn)=>{Hooks.on(name,fn);},call:async(name,...args)=>{for(const fn of hookMap.get(name)||[])await fn(...args);}};
let sequence=0;
export class Document {
 constructor(data={}){Object.assign(this,clone({...data,items:undefined}));this.id=data._id||data.id||'doc'+(++sequence);this.flags=data.flags||{};this.isOwner=true;this.effects=new Collection();this._source=clone({...data,items:undefined});}
 getFlag(ns,key){return this.flags?.[ns]?.[key];}
 async setFlag(ns,key,value){this.flags[ns]??={};this.flags[ns][key]=value;return this;}
 async unsetFlag(ns,key){delete this.flags?.[ns]?.[key];return this;}
 async update(data){for(const [key,value] of Object.entries(flatten(data)))set(this,key,value);for(const [key,value] of Object.entries(flatten(data)))set(this._source,key,value);return this;}
 testUserPermission(user){return Boolean(user?.isGM||this.isOwner);}
 prepareDerivedData(){}
 getActiveTokens(){return [];}
}
class ActorBase extends Document {
 constructor(data){super(data);this.uuid='Actor.'+this.id;this.items=new Collection();}
 async deleteEmbeddedDocuments(type,ids){const target=type==='ActiveEffect'?this.effects:this.items;for(const id of ids){const i=target.findIndex(x=>x.id===id);if(i>=0)target.splice(i,1);}return ids;}
 async createEmbeddedDocuments(type,list){return list.map(data=>{const item=new Document(data);item.uuid=this.uuid+'.Item.'+item.id;item.parent=this;item.system??={};item.delete=()=>this.deleteEmbeddedDocuments('Item',[item.id]);this.items.push(item);return item;});}
 async updateEmbeddedDocuments(type,list){for(const data of list)await this.items.get(data._id)?.update(data);}
}
class ItemBase extends Document {constructor(data){super(data);this.uuid='Item.'+this.id;}}
class Application {static DEFAULT_OPTIONS={};constructor(options={}){Object.assign(this,options);this.actor=options.actor;this._editMode=false;}async _prepareContext(){return {};}async _onRender(){}async _processSubmitData(event,form,data){await this.actor.update(data);return {updated:this.actor};}render(){} }
class Field {constructor(options={}){this.options=options;}}
class SchemaField extends Field {constructor(fields,opts){super(opts);this.fields=fields;}}
const applications={api:{ApplicationV2:Application,HandlebarsApplicationMixin:x=>x,DialogV2:{input:async()=>dialogs.shift()||null,confirm:async()=>dialogs.length?dialogs.shift():true,prompt:async()=>dialogs.shift()},DocumentSheetV2:Application},sheets:{ActorSheetV2:Application,ItemSheetV2:Application}};
globalThis.foundry={applications,utils:{escapeHTML:value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),deepClone:clone,getProperty:get,setProperty:set,flattenObject:flatten,expandObject:expand,randomID:()=>String(++sequence).padStart(16,'0'),isNewerVersion:(a,b)=>a!==b},abstract:{TypeDataModel:class {}},data:{fields:{BooleanField:Field,HTMLField:Field,NumberField:Field,SchemaField,StringField:Field}}};
globalThis.Actor=ActorBase;globalThis.Item=ItemBase;globalThis.CONFIG={Actor:{documentClass:ActorBase,dataModels:{}},Item:{documentClass:ItemBase,dataModels:{}}};
globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{NONE:0,OBSERVER:2}};
globalThis.ui={notifications:{warn:x=>notifications.push(x),info:x=>notifications.push(x),error:x=>notifications.push(x)},windows:{}};
globalThis.canvas={scene:null,tokens:{controlled:[]}};
const registry=new Map();
globalThis.fromUuid=async uuid=>registry.get(uuid)||null;
export function register(doc){registry.set(doc.uuid,doc);return doc;}
export class MockRoll {
 constructor(formula){this.formula=formula;this.dice=[];}
 async evaluate({maximize=false}={}){const replaced=String(this.formula).replace(/(\d*)d(\d+)/gi,(_,count,faces)=>{const n=Number(count||1),sides=Number(faces);const die={faces:sides,results:[]};this.dice.push(die);let total=0;for(let i=0;i<n;i++){const result=maximize?sides:dice.length?dice.shift():Math.ceil(sides/2);if(result<1||result>sides)throw new Error('Fixture die value out of range');die.results.push({result,active:true});total+=result;}return String(total);});if(!/^[\d()+\-\s]+$/.test(replaced))throw new Error('Unsupported fixture formula '+this.formula);this.total=Function('"use strict";return ('+replaced+')')();return this;}
}
globalThis.Roll=MockRoll;
const gm={id:'gm',isGM:true,active:true},player={id:'player',isGM:false,active:true};
export const game=globalThis.game={user:gm,users:new Collection(gm,player),system:{id:'altered-carbon-rpg',version:'2.5.1'},actors:new Collection(),items:new Collection(),journal:new Collection(),messages:new Collection(),combats:new Collection(),combat:null,modules:new Collection(),settings:{get:(ns,key)=>key==='traitAdjudicationMode'?'off':undefined},socket:{emit(){},on(){}},time:{}};game.users.get=id=>game.users.find(u=>u.id===id);gm.targets=new Set();player.targets=new Set();
export const ChatMessage=globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor?.id}),getWhisperRecipients:()=>[gm],implementation:{create:async data=>{const m=new Document(data);m.author=game.user;m.rolls=data.rolls||[];m.user=game.user;game.messages.push(m);await Hooks.call('createChatMessage',m);return m;}}};
export const originalFetch=globalThis.fetch;
globalThis.fetch=async path=>{const normalized=String(path).replace(/^systems\/altered-carbon-rpg\//,'');const bytes=await readFile(new URL('../'+normalized,import.meta.url));return {ok:true,json:async()=>JSON.parse(bytes),text:async()=>bytes.toString()};};
const {AlteredCarbonActor,AlteredCarbonItem}=await import('../module/documents.mjs');
export function actor(name='Test PC',system={}){const base={identity:{variant:'standard',dhfAge:50},attributes:{strength:40,perception:40,empathy:40,willpower:40,acuity:40,intelligence:40},resources:{health:{value:20,max:20},ego:{value:30,max:30},wounds:{value:0,max:40},influence:{value:3,max:3},stackPoints:{value:50,max:50}},wealth:2,economy:{debt:false,deferral:0},virtualSession:{active:false},sleeveState:'healthy',stackState:'intact',egoState:'stable',egoPermanentLoss:0};const a=register(new AlteredCarbonActor({name,type:'character',system:{...base,...system}}));a.prepareDerivedData();game.actors.push(a);return a;}
export function item(parent,data){const i=new AlteredCarbonItem(data);i.parent=parent;i.uuid=parent.uuid+'.Item.'+i.id;i.delete=()=>parent.deleteEmbeddedDocuments('Item',[i.id]);parent.items.push(i);register(i);return i;}
export function skill(parent,name='Firearms',attribute='perception',level=3){return item(parent,{name,type:'skill',system:{catalogId:name.toLowerCase(),attribute,level,trainingBonus:0,specialisations:'',ruleElements:''}});}
export function weapon(parent,system={}){return item(parent,{name:'Test Sidearm',type:'weapon',system:{skill:'Firearms',damage:'1d6+PB',damageType:'Piercing',capacity:0,depletion:0,depletionMode:'none',firingMode:'single',accuracy:1,deadly:0,exhausted:false,equipState:'equipped',ruleElements:'',...system}});}
export function combatFor(actors,results=[1,3,6]){const combat=new Document({_id:'combat',flags:{'altered-carbon-rpg':{state:{phase:'check',turn:1,round:1,intentKey:'turn1',commitmentsRevealed:true}}}});combat.combatants=new Collection();for(const a of actors){const c=new Document({name:a.name,flags:{'altered-carbon-rpg':{speed:{total:results.length,results:[...results],spentIndexes:[],revealedActiveIndexes:[0],rolled:true,submitted:true}}}});c.actor=a;c.parent=combat;combat.combatants.push(c);}combat.updateEmbeddedDocuments=async(type,updates)=>{for(const update of updates)await combat.combatants.get(update._id).update(update);};game.combat=combat;game.combats.push(combat);return combat;}
export function reset(){dialogs.length=0;dice.length=0;notifications.length=0;game.actors.length=0;game.items.length=0;game.messages.length=0;game.journal.length=0;game.combats.length=0;registry.clear();game.combat=null;game.user=gm;gm.targets.clear();player.targets.clear();}

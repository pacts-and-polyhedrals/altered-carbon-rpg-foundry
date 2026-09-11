import fs from 'node:fs';
const root=new URL('../../',import.meta.url);
const clone=structuredClone;
export const manifest=JSON.parse(fs.readFileSync(new URL('system.json',root)));
export const state={};
export class Collection extends Array {
  static get [Symbol.species](){return Array;}
  get contents(){return this;}
  get(id){return this.find(value=>value.id===id);}
}
export function setPath(target,path,value){
  const parts=path.split('.');let node=target;
  for(const key of parts.slice(0,-1))node=node[key]??={};
  const last=parts.at(-1);
  if(last.startsWith('-='))delete node[last.slice(2)];else node[last]=clone(value);
}
class App {async _prepareContext(){return {};}async _onRender(){}render(){this.rendered=true;return this;}}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
globalThis.foundry={utils:{deepClone:clone,escapeHTML:esc,randomID:()=>`id${++state.serial}`},applications:{api:{ApplicationV2:App,HandlebarsApplicationMixin:cls=>cls,DialogV2:{confirm:async()=>false}},instances:new Map()}};
globalThis.CONST={DOCUMENT_OWNERSHIP_LEVELS:{OWNER:3}};
globalThis.Hooks={on:(event,fn)=>{const list=state.hooks.get(event)||[];list.push(fn);state.hooks.set(event,list);}};
globalThis.ui={notifications:Object.fromEntries(['info','warn','error'].map(kind=>[kind,text=>state.notifications.push({kind,text})]))};
globalThis.fetch=async url=>{
  const relative=String(url).replace(/^.*systems\/altered-carbon-rpg\//,'');
  const file=new URL(relative,root);
  return{ok:fs.existsSync(file),json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))};
};

export function makeActor(id,name,owner='p1',level=3){
  const actor={id,uuid:`Actor.${id}`,name,type:'character',owners:[owner],flags:{},
    system:{identity:{publicName:name},attributes:{perception:30,acuity:30,willpower:30},resources:{health:{value:7,max:18},ego:{value:20,max:30},stackPoints:{value:20}}},
    ac:{cargo:{level:0}},items:new Collection()};
  Object.defineProperty(actor,'isOwner',{get:()=>game.user.isGM||actor.owners.includes(game.user.id)});
  actor.testUserPermission=user=>user.isGM||actor.owners.includes(user.id);
  actor.getFlag=(scope,key)=>actor.flags?.[scope]?.[key];
  actor.update=async patch=>{if(actor.failUpdate)throw new Error('simulated update failure');state.updates.push({id,patch:clone(patch)});for(const[key,value]of Object.entries(patch))setPath(actor,key,value);return actor;};
  actor.createEmbeddedDocuments=async(type,rows)=>{if(type!=='Item')throw new Error('Unexpected embedded type');return rows.map(row=>{if(!CONFIG.Item.documentClass.TYPES.includes(row.type))throw new Error(`${row.type} is not a valid type`);const item={...clone(row),id:`embedded${++state.serial}`};item.update=async patch=>{for(const[key,value]of Object.entries(patch))setPath(item,key,value);return item;};actor.items.push(item);return item;});};
  for(const [index,skill]of ['Detection','Search','Discipline'].entries())actor.items.push({id:`s${index}`,uuid:`Actor.${id}.Item.s${index}`,name:skill,type:'skill',system:{attribute:'perception',level,trainingBonus:0}});
  return actor;
}

export function resetFoundry(){
  Object.assign(state,{serial:0,rollValues:[],rollFormulas:[],rollError:false,rollWait:null,notifications:[],updates:[],messages:[],itemCreates:0,actorCreates:0,hooks:new Map(),socketHandlers:[],emitted:[],settings:new Map()});
  const users=new Collection({id:'gm',name:'GM',isGM:true,active:true},{id:'p1',name:'Alice',isGM:false,active:true},{id:'p2',name:'Ben',isGM:false,active:true},{id:'p3',name:'Other',isGM:false,active:true});
  users.activeGM=users[0];
  globalThis.game={user:users[0],users,system:clone(manifest),actors:new Collection(),items:new Collection(),messages:new Collection(),
    settings:{register:(scope,key,data)=>state.settings.set(`${scope}.${key}`,clone(data.default)),get:(scope,key)=>state.settings.get(`${scope}.${key}`),set:async(scope,key,value)=>{state.settings.set(`${scope}.${key}`,clone(value));return value;}},
    socket:{on:(_channel,fn)=>state.socketHandlers.push(fn),emit:(channel,payload)=>state.emitted.push({channel,payload})}};
  class ItemDoc {static TYPES=Object.keys(manifest.documentTypes.Item);static async create(data){state.itemCreates++;if(!this.TYPES.includes(data.type))throw new Error('invalid Item type');const item={...clone(data),id:`item${++state.serial}`};game.items.push(item);return item;}}
  class ActorDoc {static TYPES=Object.keys(manifest.documentTypes.Actor);static async create(data){state.actorCreates++;const actor={...clone(data),id:`vehicle${++state.serial}`,getFlag(scope,key){return this.flags?.[scope]?.[key];}};game.actors.push(actor);return actor;}}
  globalThis.CONFIG={Item:{documentClass:ItemDoc,dataModels:Object.fromEntries(ItemDoc.TYPES.map(type=>[type,{}]))},Actor:{documentClass:ActorDoc,dataModels:Object.fromEntries(ActorDoc.TYPES.map(type=>[type,{}]))}};
  globalThis.Roll=class {
    constructor(formula){this.formula=formula;}
    async evaluate(){state.rollFormulas.push(this.formula);if(state.rollWait)await state.rollWait;if(state.rollError)throw new Error('simulated dice failure');this.total=state.rollValues.shift()??3;this.dice=[{results:[{result:this.total}]}];return this;}
  };
  globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor.id}),getWhisperRecipients:()=>[users[0]],implementation:{create:async data=>{
    const message={...clone(data),id:`message${++state.serial}`,author:game.user,getFlag(scope,key){return this.flags?.[scope]?.[key];},async update(patch){await Promise.resolve();for(const[key,value]of Object.entries(patch))setPath(this,key,value);return this;}};
    state.messages.push(message);game.messages.push(message);return message;
  }}};
  const a=makeActor('a','Nia Calder','p1',3),b=makeActor('b','Sam Voss','p2',4);game.actors.push(a,b);
  return {a,b};
}

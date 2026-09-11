const SYS='altered-carbon-rpg';
async function loadJSON(path){const r=await fetch(`systems/${SYS}/data/${path}`);if(!r.ok)throw new Error(`Unable to load ${path}`);return r.json();}
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
export class ACRulesBrowser extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={id:'ac-rules-browser',window:{title:'Altered Carbon — 2020 Rules Reference'},position:{width:940,height:820},actions:{add:this._add}};
 static PARTS={main:{template:'systems/altered-carbon-rpg/templates/rules-browser.hbs'}};
 constructor(options={}){super(options);this.actorId=options.actorId||null;}
 async _prepareContext(options){
   const context=await super._prepareContext(options);
   const [skills,traits,baggage,mechanics,sleeveRef,equipmentRef,gmRef]=await Promise.all([
     loadJSON('core-skills.json'),loadJSON('trait-catalog.json'),loadJSON('baggage-catalog.json'),loadJSON('mechanics-reference.json'),loadJSON('sleeve-reference-pages.json'),loadJSON('equipment-reference-pages.json'),loadJSON('gm-reference-pages.json')
   ]);
   const actor=game.actors.get(this.actorId)||null;
   return {...context,actor,isGM:game.user.isGM,skills,traits:traits.traits,baggage:baggage.entries,mechanics,conditions:mechanics.conditions,injuries:mechanics.injuries,scandals:mechanics.scandals,gearRules:mechanics.gearRules,sleeveReference:sleeveRef.pages,equipmentReference:equipmentRef.pages,gmReference:gmRef.pages};
 }
 static async _add(event,target){
   const actor=game.actors.get(this.actorId);if(!actor)return ui.notifications.warn('Open the Rules Reference from an Actor sheet to add entries.');
   const type=target.dataset.type,id=target.dataset.id;const [traits,baggage,mechanics]=await Promise.all([loadJSON('trait-catalog.json'),loadJSON('baggage-catalog.json'),loadJSON('mechanics-reference.json')]);let data=null;
   if(type==='trait'){const t=traits.traits.find(x=>x.id===id);if(t)data={name:t.name,type:'trait',system:{catalogId:t.id,tree:t.tree,branch:t.branch,tier:t.tier,commonality:t.commonality||'uncommon',spCost:t.spCost||0,effect:t.effect||'',description:t.effect||'',rulesRef:t.rulesRef||'Core Rulebook, Chapter 5'}};}
   if(type==='baggage'){const b=baggage.entries.find(x=>x.id===id);if(b)data={name:b.name,type:'baggage',system:{catalogId:b.id,rollMin:b.min,rollMax:Number.isFinite(b.max)?b.max:999,severity:b.severity||0,description:b.effect||'',rulesRef:'Core Rulebook, Baggage'}};}
   if(type==='condition'){const x=mechanics.conditions.find(x=>x.id===id);if(x)data={name:x.name,type:'condition',system:{catalogId:x.id,key:x.id,description:x.effect,rulesRef:'Core Rulebook, Status Effects'}};}
   if(type==='injury'){const x=mechanics.injuries.find(x=>x.id===id);if(x)data={name:x.name,type:'injury',system:{catalogId:x.id,key:x.id,recoveryRate:x.recoveryRate||'',description:x.effect,rulesRef:'Core Rulebook, Injuries'}};}
   if(type==='scandal'){const x=mechanics.scandals.find(x=>x.id===id);if(x)data={name:x.name,type:'scandal',system:{catalogId:x.id,key:x.id,description:x.effect,rulesRef:'Core Rulebook, Scandals'}};}
   if(data){await actor.createEmbeddedDocuments('Item',[data]);ui.notifications.info(`${data.name} added to ${actor.name}.`);}
 }
}

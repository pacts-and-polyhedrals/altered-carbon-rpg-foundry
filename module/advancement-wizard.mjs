import {advancementSnapshot,quoteAdvancement,applyAdvancement,canAdvance,attributeLimit,attributeValue,ATTRIBUTES,commonalityFor,SYS} from './advancement.mjs';
import {skillDie,skillUpgradeCost,specializationCost} from './rules-engine.mjs';
import {dedupeSheetRecords} from './sheet-record-utils.mjs';
const apps=new Map();
const escape=s=>foundry.utils.escapeHTML(String(s??''));
export class ACAdvancementWizard extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
  static DEFAULT_OPTIONS={classes:['altered-carbon','ac-advancement-window'],window:{title:'Altered Carbon - Level Up'},position:{width:1000,height:800},actions:{setSection:this._setSection,buySkill:this._buySkill,buyAttribute:this._buyAttribute,buySpecialisation:this._buySpecialisation,buyTrait:this._buyTrait,refresh:this._refresh}};
  static PARTS={main:{template:'systems/altered-carbon-rpg/templates/advancement-wizard.hbs'}};
  constructor(options={}){super(options);this.actor=options.actor;this._section='skills';this._commonality='uncommon';this._busy=false;}
  async _prepareContext(options){
    const context=await super._prepareContext(options);
    if(!canAdvance(this.actor))throw new Error('You no longer have permission to advance this character.');
    if(!this._traits){const response=await fetch(`systems/${SYS}/data/trait-catalog.json`);if(!response.ok)throw new Error('Cannot load the installed Trait catalog.');this._traits=(await response.json()).traits;}
    const state=advancementSnapshot(this.actor),sp=Number(state.system.resources.stackPoints.value),all=dedupeSheetRecords(state.items);
    const availability=request=>{try{const q=quoteAdvancement(state,[request],{traits:this._traits});return {cost:q.total,available:true,explanation:''};}catch(e){return {available:false,explanation:e.message};}};
    const skills=all.filter(i=>i.type==='skill').sort((a,b)=>a.name.localeCompare(b.name)).map(i=>({id:i._id??i.id,name:i.name,level:i.system.level,die:skillDie(i.system.level),nextDie:i.system.level<5?skillDie(i.system.level+1):null,nextCost:skillUpgradeCost(i.system.level),...availability({kind:'skill',itemId:i._id??i.id})}));
    const attributes=ATTRIBUTES.map(key=>({key,name:key[0].toUpperCase()+key.slice(1),value:attributeValue(state,key),cap:attributeLimit(state,key),physical:['strength','perception'].includes(key),...availability({kind:'attribute',attribute:key,sp:1})}));
    const traits=this._traits.map(t=>{const c=commonalityFor(state.system.identity,t.tree,state.flags[SYS]?.traitCommonality??{});return {...t,commonality:c??this._commonality,customCommonality:!c,...availability({kind:'trait',catalogId:t.id,commonality:this._commonality,confirmCommonality:true})};});
    const history=[...(state.flags[SYS]?.advancementHistory??[])].reverse().map(h=>({...h,when:new Date(h.at).toLocaleString(),steps:h.steps.map(s=>({...s,hasRoll:s.kind==='attribute'}))}));
    return {...context,actor:this.actor,sp,skills,attributes,traits,history,busy:this._busy,isCivilian:state.system.identity.archetype==='Civilian',commonality:this._commonality,
      sections:[['skills','Skills'],['attributes','Attributes'],['specialisations','Specialisations'],['traits','Traits'],['history','History']].map(([id,label])=>({id,label,active:this._section===id})),
      isSkills:this._section==='skills',isAttributes:this._section==='attributes',isSpecialisations:this._section==='specialisations',isTraits:this._section==='traits',isHistory:this._section==='history'};
  }
  async _onRender(context,options){
    await super._onRender(context,options);
    const root=this.element;
    root.querySelector('[name="traitSearch"]')?.addEventListener('input',event=>{const q=event.target.value.toLowerCase();root.querySelectorAll('[data-trait-search]').forEach(row=>row.hidden=!row.dataset.traitSearch.toLowerCase().includes(q));});
    const common=root.querySelector('[name="commonality"]');if(common){common.value=this._commonality;common.addEventListener('change',async()=>{this._commonality=common.value;await this.render({force:true});});}
  }
  async _purchase(request){
    if(this._busy)return;
    this._busy=true;
    try{
      if(!canAdvance(this.actor))throw new Error('Only an owner or GM may advance this character.');
      const quote=quoteAdvancement(advancementSnapshot(this.actor),[request],{traits:this._traits});
      const details=request.kind==='attribute'?'<p>Attribute dice are rolled only after confirmation. Gains stop at the displayed cap; excess rolled points are lost. This does not reroll Health or refill any resources.</p>':'';
      const traitNote=request.kind==='trait'?'<p>The Trait record and SP cost are applied. Narrative permissions, chosen benefits and prose-only Trait effects still require the table to resolve them.</p>':'';
      const accepted=await foundry.applications.api.DialogV2.confirm({window:{title:'Confirm Level Up'},content:`<p><strong>${escape(this.actor.name)}</strong>: ${escape(quote.steps[0].label)}</p><p>Spend <strong>${quote.total} SP</strong>. Balance: <strong>${quote.before} to ${quote.after} SP</strong>.</p>${details}${traitNote}`,rejectClose:false});
      if(!accepted)return;
      const reason=this.element?.querySelector('[name="advancementReason"]')?.value??'';
      const {entry}=await applyAdvancement(this.actor,[request],{traits:this._traits,reason,expectedFingerprint:quote.fingerprint});
      const result=entry.steps[0],gain=result.kind==='attribute'?` Rolled ${result.rolled}; ${result.attribute} ${result.from} to ${result.to}.`:'';
      ui.notifications.info(`${this.actor.name}: spent ${entry.spent} SP; ${entry.after} SP remain.${gain}`);
      this.actor.sheet?.render({force:true});
      await this.render({force:true});
    }catch(error){console.error('Altered Carbon | Advancement',error);ui.notifications.error(error.message);}
    finally{this._busy=false;}
  }
  static async _setSection(event,target){this._section=target.dataset.section;await this.render({force:true});}
  static async _refresh(){await this.render({force:true});}
  static async _buySkill(event,target){await this._purchase({kind:'skill',itemId:target.dataset.itemId});}
  static async _buyAttribute(event,target){const row=target.closest('[data-attribute-row]');await this._purchase({kind:'attribute',attribute:target.dataset.attribute,sp:Number(row.querySelector('[name="attributeSP"]').value)});}
  static async _buySpecialisation(){const root=this.element;await this._purchase({kind:'specialisation',itemId:root.querySelector('[name="specialisationSkill"]')?.value,name:root.querySelector('[name="specialisationName"]')?.value,missingDifficulty:Number(root.querySelector('[name="missingDifficulty"]')?.value??0)});}
  static async _buyTrait(event,target){await this._purchase({kind:'trait',catalogId:target.dataset.catalogId,commonality:this._commonality,confirmCommonality:Boolean(this.element.querySelector('[name="confirmCommonality"]')?.checked)});}
}
export function openAdvancement(actor){
  if(!canAdvance(actor)){ui.notifications.warn('Select a character you own to use Level Up.');return null;}
  const key=actor.uuid??actor.id;let app=apps.get(key);
  if(!app){app=new ACAdvancementWizard({actor,id:`ac-level-up-${String(key).replace(/[^a-z0-9]/gi,'-')}`});apps.set(key,app);}else app.actor=actor;
  app.render({force:true});app.bringToFront();return app;
}

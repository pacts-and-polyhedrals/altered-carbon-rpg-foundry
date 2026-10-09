import {serializedCoreTraitRules} from './core-trait-effects.mjs';
import {SLEEVE_LIMITS,sleeveHealthFormula,damageThresholdFromStrength,baggageEntryForTotal} from './rules-engine.mjs';
import {dedupeUniqueSheetRecords} from './sheet-record-utils.mjs';
import {
  CREATOR_ATTRIBUTES,baseCreationAttributes,creatorCommonality,resolvePackageTrait,
  evaluateCreationLedger,packageEntitlements,validateEntitlementChoices,
  compileStartingPackage,validateVariantChoices,entitlementChoiceKey,RELIGIOUS_BENEFITS,ENVOY_BENEFITS,envoyConditioningBranches,envoyFreeTraits
} from './creator-build.mjs';

const SYS='altered-carbon-rpg';
async function loadJSON(path){const response=await fetch(`systems/${SYS}/data/${path}`);if(!response.ok)throw new Error(`Unable to load ${path}`);return response.json();}
const safe=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
async function rollTotal(formula){if(!formula||formula==='0')return 0;return Number((await new Roll(formula).evaluate()).total||0);}

const VARIANTS=[
  {id:'standard',name:'Standard DHF',tag:'Baseline',description:'Standard human DHF. No additional variant selection required.'},
  {id:'ai',name:'Artificial Intelligence',tag:'Digital Native',description:'Requires a compatible synthetic sleeve in this creator and an explicit GM-established SP/IP budget.'},
  {id:'religious',name:'Religious Coding',tag:'Continuity Restricted',description:'Record the Core benefit you chose; religious continuity restrictions continue to apply.'},
  {id:'envoy',name:'Envoy',tag:'Conditioned Operative',description:'Select two distinct Core Envoy conditioning benefits, preserving your chosen text.'},
  {id:'meth',name:'Meth',tag:'Ultra-Wealthy',description:'Uses the Core Meth Influence and lower-tier DHF backup provisions.'}
];
const SLEEVE_DESCRIPTIONS={
  birth:'Original biological body.',natal:'Naturally grown biological sleeve.',clone:'Clone body.',
  'synthetic-low':'Low-grade synthetic body.','synthetic-mid':'Mid-grade synthetic body.','synthetic-high':'Premium synthetic body.'
};
const ATTRIBUTE_HELP=[
  {id:'strength',code:'STR',name:'Strength',class:'physical',description:'Physical Attribute of the active sleeve; sets Damage Threshold.'},
  {id:'perception',code:'PER',name:'Perception',class:'physical',description:'Physical Attribute of the active sleeve; determines natural Speed Dice.'},
  {id:'empathy',code:'EMP',name:'Empathy',class:'mental',description:'Persistent DHF Attribute for social actions and starting Influence.'},
  {id:'willpower',code:'WIL',name:'Willpower',class:'mental',description:'Persistent DHF Attribute contributing to Ego.'},
  {id:'acuity',code:'ACU',name:'Acuity',class:'mental',description:'Persistent DHF Attribute; creator freezes starting SP before purchases.'},
  {id:'intelligence',code:'INT',name:'Intelligence',class:'mental',description:'Persistent DHF Attribute used for knowledge and technical skills.'}
];
const STEP_LABELS=['Identity','Archetype','Variant','Sleeve','Attributes','Resources','Review'];

export class ACCharacterCreator extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
  static DEFAULT_OPTIONS={
    id:'ac-character-creator',classes:['altered-carbon','ac-creator-window'],
    window:{title:'Altered Carbon — Guided Character Creator'},position:{width:1060,height:900},
    actions:{create:this._create,nextStep:this._nextStep,prevStep:this._prevStep,jumpStep:this._jumpStep,
      rollAttribute:this._rollAttribute,undoAttribute:this._undoAttribute,
      addSpecialisation:this._addSpecialisation,removeSpecialisation:this._removeSpecialisation,
      addTrait:this._addTrait,removeTrait:this._removeTrait,
      rollBaggage:this._rollBaggage,rerollBaggage:this._rerollBaggage}
  };
  static PARTS={main:{template:'systems/altered-carbon-rpg/templates/character-creator.hbs'}};
  _step=0;
  _creating=false;
  _draft={attributeRolls:[],specialisations:[],traitIds:[],baggageEvents:[],choices:{},skillLevels:{}};

  async _prepareContext(options){
    const context=await super._prepareContext(options);
    const [reference,skills,presets,traits,catalog,baggage]=await Promise.all([
      loadJSON('archetype-reference.json'),loadJSON('core-skills.json'),loadJSON('archetype-skills.json'),
      loadJSON('trait-catalog.json'),loadJSON('item-catalog.json'),loadJSON('baggage-catalog.json')
    ]);
    this._source={reference,skills,presets,traits:traits.traits,catalog,baggage};
    const archetypes=Object.entries(reference.archetypes).map(([name,data])=>({name,defaultSleeve:data.defaultSleeve,wealth:data.wealth,features:data.features||[],packages:Object.keys(data.packages||{})}));
    const packageOptions=[];
    for(const [archetype,data] of Object.entries(reference.archetypes))for(const p of Object.keys(data.packages))packageOptions.push({value:`${archetype}::${p}`,archetype,label:p});
    const sleeveTypes=Object.keys(SLEEVE_LIMITS).filter(x=>x!=='other'&&x!=='organic').map(id=>({id,label:id.replaceAll('-',' ').replace(/\b\w/g,m=>m.toUpperCase()),description:SLEEVE_DESCRIPTIONS[id]||'',limits:SLEEVE_LIMITS[id]}));
    const civilian=new Map(presets.archetypes.Civilian.map(s=>[s.id,s.level]));
    const variantSkills=skills.filter(s=>['empathy','willpower'].includes(s.attribute));
    const sortedTraits=[...traits.traits].sort((a,b)=>a.tree.localeCompare(b.tree)||a.branch.localeCompare(b.branch)||a.tier-b.tier||a.name.localeCompare(b.name));
    return{...context,archetypes,variants:VARIANTS,sleeveTypes,packageOptions,attributeHelp:ATTRIBUTE_HELP,
      skillRows:skills.map(s=>({id:s.id,name:s.name,level:civilian.get(s.id)||1})),traitsOptions:sortedTraits,
      religiousBenefits:RELIGIOUS_BENEFITS,envoyBenefits:ENVOY_BENEFITS,envoyBranches:envoyConditioningBranches(traits.traits).map(value=>({value,label:value.replace('::',' / ')})),variantSkills,
      steps:STEP_LABELS.map((label,index)=>({label,index,number:index+1}))};
  }

  async _onRender(context,options){
    await super._onRender(context,options);
    this._wireWizard();this._showStep(this._step);
  }
  _field(name){return this.element?.querySelector(`[name="${CSS.escape(name)}"]`);}
  _value(name){return this._field(name)?.value??'';}
  _mode(){return this._value('creationMode')||'standard';}
  _archetype(){return this._value('archetype')||'Civilian';}
  _variant(){return this._value('variant')||'standard';}
  _package(){return this._value('package')?.split('::')[1]||'';}
  _baseSkillLevels(){
    const entries=this._source.presets.archetypes[this._archetype()]||[];
    const levels=Object.fromEntries(entries.map(e=>[e.id,e.level]));
    // Core Convert: religious characters <=80 may upgrade one Skill assigned
    // to Empathy or Willpower without expending SP.
    const selected=this._value('religiousSkill');
    if(this._variant()==='religious' && Number(this._value('age')||30)<=80 &&
      this._source.skills.some(s=>s.id===selected && ['empathy','willpower'].includes(s.attribute)) && levels[selected]<5)levels[selected]+=1;
    return levels;
  }
  _selectedPackageTraits(){const archetype=this._source.reference.archetypes[this._archetype()];const choice=archetype?.packages?.[this._package()];return (choice?.traits||[]).map(spec=>resolvePackageTrait(this._source.traits,spec)).filter(Boolean);}
  _freeTraits(){
    const extra=this._variant()==='envoy'?envoyFreeTraits(this._source.traits,this._variantChoices()):[];
    return [...new Map([...this._selectedPackageTraits(),...extra].map(t=>[t.id,t])).values()];
  }
  _packageEntitlements(){return packageEntitlements(this._archetype(),this._package(),this._source.reference,this._source.catalog);}
  _variantChoices(){return{
    religiousBenefit:this._value('religiousBenefit'),envoyOne:this._value('envoyOne'),envoyTwo:this._value('envoyTwo'),
    aiLicence:this._value('aiLicence'),methNotes:this._value('methNotes'),religiousSkill:this._value('religiousSkill'),
    envoyBranchOne:this._value('envoyBranchOne'),envoyBranchTwo:this._value('envoyBranchTwo')
  };}
  _baggageEvents(){return this._draft.baggageEvents;}
  _collectChoices(){const out={...this._draft.choices};
    this.element?.querySelectorAll('[data-entitlement-id]').forEach(node=>{out[node.dataset.entitlementId]=node.value;});
    this._draft.choices=out;return out;
  }
  _ledger(){
    const levels={};for(const entry of this._source.skills)levels[entry.id]=Number(this._value(`skill.${entry.id}`)||this._baseSkillLevels()[entry.id]||1);
    return evaluateCreationLedger({age:Number(this._value('age')||30),variant:this._variant(),archetype:this._archetype(),
      sleeveType:this._value('sleeveType')||'birth',mode:this._mode(),
      manualSP:this._value('manualSP')===''?null:Number(this._value('manualSP')),
      manualIP:this._value('manualIP')===''?null:Number(this._value('manualIP')),
      attributeRolls:this._draft.attributeRolls,skillLevels:levels,startingSkillLevels:this._baseSkillLevels(),
      specialisations:this._draft.specialisations,traitIds:this._draft.traitIds,traitCatalog:this._source.traits,variantChoices:this._variantChoices(),
      packageTraitIds:this._freeTraits().map(t=>t.id),baggageEvents:this._baggageEvents()});
  }
  _validation({full=true}={}){
    const ledger=this._ledger(),errors=[...ledger.errors];
    if(!this._value('name').trim())errors.push('The DHF must have a true name.');
    if(!this._package())errors.push('Choose one of the 30 published Starting Packages.');
    if(this._value('package')?.split('::')[0]!==this._archetype())errors.push('Starting Package belongs to a different Archetype.');
    if(this._value('wealth')!==''&&(!Number.isInteger(Number(this._value('wealth')))||Number(this._value('wealth'))<0||Number(this._value('wealth'))>6))errors.push('Wealth override must be 0–6.');
    if(full){
      errors.push(...validateVariantChoices(this._variant(),this._variantChoices(),this._source.traits,this._source.skills,Number(this._value('age')||30)));
      errors.push(...validateEntitlementChoices(this._packageEntitlements(),this._collectChoices()));
      if(this._baggageEvents().length<ledger.lifeEventRolls || this._baggageEvents().slice(0,ledger.lifeEventRolls).some(b=>!Array.isArray(b?.rolls)||!b.rolls.length))errors.push('Resolve each age-based Baggage event before creating.');
    }
    return{ledger,errors};
  }
  _wireWizard(){
    const root=this.element;if(!root)return;
    root.querySelectorAll('input,select,textarea').forEach(el=>el.addEventListener('input',()=>this._refreshDynamicGuidance()));
    root.querySelector('[name="archetype"]')?.addEventListener('change',()=>{
      const a=this._archetype();const opt=[...root.querySelector('[name="archetype"]').options].find(x=>x.value===a);
      if(opt?.dataset.defaultSleeve)this._field('sleeveType').value=opt.dataset.defaultSleeve;
      this._field('package').value='';this._clearPurchases();this._resetSkillInputs();this._renderPackageChoices();this._syncSleeveLimits();this._refreshDynamicGuidance();
    });
    root.querySelector('[name="package"]')?.addEventListener('change',()=>{this._draft.traitIds=[];this._draft.choices={};this._renderPackageChoices();this._refreshDynamicGuidance();});
    root.querySelector('[name="variant"]')?.addEventListener('change',()=>{
      if(this._variant()==='ai'&&!this._value('sleeveType').startsWith('synthetic-'))this._field('sleeveType').value='synthetic-mid';
      this._draft.baggageEvents=[];this._draft.traitIds=[];this._draft.specialisations=[];this._resetSkillInputs();this._syncSleeveLimits();this._renderBaggage();this._refreshDynamicGuidance();
    });
    root.querySelector('[name="sleeveType"]')?.addEventListener('change',()=>{this._draft.attributeRolls=[];this._syncSleeveLimits();this._refreshDynamicGuidance();});
    root.querySelector('[name="creationMode"]')?.addEventListener('change',()=>{
      if(this._mode()==='expedited'){this._clearPurchases();this._resetSkillInputs();}
      this._refreshDynamicGuidance();
    });
    root.querySelector('[name="age"]')?.addEventListener('change',()=>{this._draft.baggageEvents=[];this._resetSkillInputs();this._renderBaggage();this._refreshDynamicGuidance();});
    for(const field of ['religiousBenefit','religiousSkill','envoyOne','envoyTwo','envoyBranchOne','envoyBranchTwo']){
      root.querySelector(`[name="${field}"]`)?.addEventListener('change',()=>{
        if(field==='religiousBenefit'){this._draft.baggageEvents=[];this._renderBaggage();}
        if(field==='religiousSkill')this._resetSkillInputs();
        if(field.startsWith('envoy'))this._draft.traitIds=[];
        this._refreshDynamicGuidance();
      });
    }
    root.querySelector('[name="newTrait"]')?.addEventListener('change',()=>this._refreshDynamicGuidance());
    this._syncSleeveLimits();this._resetSkillInputs();this._renderPackageChoices();this._renderBaggage();this._refreshDynamicGuidance();
  }
  _clearPurchases(){this._draft.attributeRolls=[];this._draft.specialisations=[];this._draft.traitIds=[];}
  _resetSkillInputs(){const starting=this._baseSkillLevels();for(const [id,level] of Object.entries(starting)){const el=this._field(`skill.${id}`);if(el){el.min=String(level);el.value=String(level);}}}
  _syncSleeveLimits(){
    const sleeve=this._value('sleeveType')||'birth',limits=SLEEVE_LIMITS[sleeve];if(!limits)return;
    const base=baseCreationAttributes(sleeve);for(const key of CREATOR_ATTRIBUTES){const input=this._field(key);if(!input)continue;input.value=String(base[key]);input.min=String(base[key]);input.max=String(limits[key]?.[1]??50);input.readOnly=true;}
  }
  _showStep(step){
    this._step=Math.max(0,Math.min(STEP_LABELS.length-1,Number(step)||0));
    const root=this.element;if(!root)return;
    root.querySelectorAll('[data-wizard-step]').forEach(el=>el.classList.toggle('active',Number(el.dataset.wizardStep)===this._step));
    root.querySelectorAll('[data-step-index]').forEach(el=>{const n=Number(el.dataset.stepIndex);el.classList.toggle('active',n===this._step);el.classList.toggle('complete',n<this._step);});
    const bar=root.querySelector('.ac-wizard-progress-fill');if(bar)bar.style.width=`${(this._step+1)/STEP_LABELS.length*100}%`;
    const count=root.querySelector('[data-step-counter]');if(count)count.textContent=`${String(this._step+1).padStart(2,'0')} / 07`;
    const prev=root.querySelector('[data-action="prevStep"]');if(prev)prev.disabled=this._step===0;
    const next=root.querySelector('[data-action="nextStep"]');if(next)next.hidden=this._step===6;
    const create=root.querySelector('[data-action="create"]');if(create)create.hidden=this._step!==6;
    this._refreshDynamicGuidance();root.querySelector('.ac-wizard-stage')?.scrollTo({top:0,behavior:'smooth'});
  }
  _renderPackageChoices(){
    const container=this.element?.querySelector('[data-package-choices]');if(!container)return;
    const entries=this._packageEntitlements();
    if(!entries.length){container.innerHTML='<p>Select a published Starting Package to configure its gear, Credits and Networks.</p>';return;}
    const previous=this._draft.choices;
    container.innerHTML=entries.map(e=>{
      const label=`<span class="ac-entitlement-source">${safe(e.source)}</span>`;
      if(e.kind==='catalog-choice'){
        return Array.from({length:e.quantity},(_,i)=>{const id=entitlementChoiceKey(e,i);return `<label class="ac-entitlement ac-select-field">${label}${e.quantity>1?`<small>Selection ${i+1} of ${e.quantity}</small>`:''}<select data-entitlement-id="${safe(id)}" aria-label="${safe(e.source)} ${i+1}"><option value="">Choose canonical Core Item…</option>${e.candidates.map(c=>`<option value="${safe(c.id)}" ${previous[id]===c.id?'selected':''}>${safe(c.name)}</option>`).join('')}</select><small>Source notation is preserved. Check the item's configuration and quality against the Core.</small></label>`;}).join('');
      }
      if(e.kind==='network-choice')return `<label class="ac-entitlement ac-select-field">${label}<select data-entitlement-id="${safe(e.id)}"><option value="">Choose Network…</option>${e.options.map(x=>`<option value="${safe(x)}" ${previous[e.id]===x?'selected':''}>${safe(x)}</option>`).join('')}</select></label>`;
      if(e.kind==='manual-choice')return Array.from({length:e.quantity},(_,i)=>{const id=entitlementChoiceKey(e,i);return `<label class="ac-entitlement ac-select-field">${label}${e.quantity>1?`<small>Selection ${i+1} of ${e.quantity}</small>`:''}<input data-entitlement-id="${safe(id)}" value="${safe(previous[id]||'')}" maxlength="120" placeholder="Enter Core-approved selection"/><small>Not uniquely represented by Chapter 6's 95-item catalogue. A typed provisional Item will be marked for GM review.</small></label>`;}).join('');
      const lookup=e.kind==='catalog-fixed'?this._source.catalog.items.find(i=>i.id===e.itemId)?.name:e.kind==='credits'?`${e.quantity} × Credits Lv.${e.level}`:e.kind==='network'||e.kind==='networks'?`${e.organisation||e.organisations.join(' and ')} Network`:e.kind==='influence'?`+${e.quantity} Influence Points`:e.source;
      return `<div class="ac-entitlement"><span>${safe(e.source)}</span><strong>${safe(lookup||e.source)}</strong></div>`;
    }).join('');
    container.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',()=>this._refreshDynamicGuidance()));
  }
  _renderBaggage(){
    const container=this.element?.querySelector('[data-baggage-events]');if(!container)return;
    const ledger=this._ledger();
    const amount=ledger.lifeEventRolls;
    if(!amount){container.innerHTML='<p>No age-based Baggage rolls are required for this build.</p>';return;}
    container.innerHTML=Array.from({length:amount},(_,index)=>{
      const event=this._draft.baggageEvents[index],rolls=event?.rolls||[];
      return `<div class="ac-entitlement"><span>Life event ${index+1}: ${ledger.baggageDice}d6</span><strong>${rolls.length?`Current total ${rolls.at(-1)} · ${rolls.length-1} paid rerolls`:'Not rolled'}</strong><div class="ac-actions"><button type="button" data-action="rollBaggage" data-event-index="${index}" ${rolls.length?'disabled':''}>Roll</button><button type="button" data-action="rerollBaggage" data-event-index="${index}" ${rolls.length?'':'disabled'}>Reroll (SP)</button></div></div>`;
    }).join('');
  }
  _refreshDynamicGuidance(){
    const root=this.element;if(!root||!this._source)return;
    const archetype=this._archetype(),variant=this._variant(),sleeve=this._value('sleeveType')||'birth',expedited=this._mode()==='expedited';
    root.querySelectorAll('[data-archetype-panel]').forEach(el=>el.hidden=el.dataset.archetypePanel!==archetype);
    root.querySelectorAll('[data-variant-panel]').forEach(el=>el.hidden=el.dataset.variantPanel!==variant);
    root.querySelectorAll('[data-sleeve-panel]').forEach(el=>el.hidden=el.dataset.sleevePanel!==sleeve);
    root.querySelectorAll('[data-ai-only]').forEach(el=>el.hidden=variant!=='ai');
    root.querySelectorAll('[data-religious-only]').forEach(el=>el.hidden=variant!=='religious');
    root.querySelectorAll('[data-envoy-only]').forEach(el=>el.hidden=variant!=='envoy');
    root.querySelectorAll('[data-religious-convert]').forEach(el=>el.hidden=variant!=='religious'||Number(this._value('age')||30)>80);
    root.querySelectorAll('[data-envoy-combat]').forEach(el=>el.hidden=variant!=='envoy'||![this._value('envoyOne'),this._value('envoyTwo')].includes('combat-conditioning'));
    root.querySelectorAll('[data-meth-only]').forEach(el=>el.hidden=variant!=='meth');
    root.querySelectorAll('[data-standard-only]').forEach(el=>el.hidden=expedited);
    const pkg=this._field('package');if(pkg){for(const option of [...pkg.options])if(option.value)option.hidden=option.dataset.archetype!==archetype;
      if(pkg.selectedOptions[0]?.dataset.archetype&&pkg.selectedOptions[0].dataset.archetype!==archetype)pkg.value='';}
    const {ledger,errors}=this._validation();
    for(const key of CREATOR_ATTRIBUTES){const input=this._field(key);if(input)input.value=String(ledger.attributes[key]??30);}
    const set=(key,value)=>{const el=root.querySelector(`[data-summary="${key}"]`);if(el)el.textContent=String(value??'—');};
    set('name',this._value('name')||'—');set('publicName',this._value('publicName')||this._value('name')||'—');
    set('age',variant==='ai'?'AI (no age table)':`${this._value('age')||30} years`);
    set('archetype',archetype);set('package',this._package()||'Select a package');
    set('variant',VARIANTS.find(v=>v.id===variant)?.name||variant);
    set('sleeve',sleeve.replaceAll('-',' '));
    set('attributes',`STR ${ledger.attributes.strength} · PER ${ledger.attributes.perception} · EMP ${ledger.attributes.empathy} · WIL ${ledger.attributes.willpower} · ACU ${ledger.attributes.acuity} · INT ${ledger.attributes.intelligence}`);
    set('wealth',this._value('wealth')||this._source.reference.archetypes[archetype]?.wealth||1);
    set('spStarted',ledger.startingSP);set('spSpent',ledger.spentSP);set('spRemaining',ledger.remainingSP);
    set('ledgerErrors',errors.length?errors.join(' · '):'Ready: budget and selected choices are valid.');
    const list=root.querySelector('[data-ledger-lines]');if(list)list.replaceChildren(...ledger.entries.map(entry=>{
      const row=document.createElement('div');row.className='ac-review-row';
      const label=document.createElement('span');label.textContent=entry.label;
      const amount=document.createElement('strong');amount.textContent=`−${entry.cost} SP`;row.append(label,amount);return row;
    }));
    const create=root.querySelector('[data-action="create"]');if(create)create.disabled=Boolean(errors.length)||this._creating;
    this._renderPurchaseLists(ledger);
  }
  _renderPurchaseLists(ledger){
    const root=this.element, exp=this._mode()==='expedited';
    for(const button of root.querySelectorAll('[data-action="rollAttribute"],[data-action="addSpecialisation"],[data-action="addTrait"]'))button.disabled=exp;
    const attrLogs=root.querySelector('[data-attribute-log]');if(attrLogs){attrLogs.innerHTML=this._draft.attributeRolls.map((r,index)=>`<div class="ac-review-row"><span>${safe(r.attribute)}: ${r.sp}d4 [${r.faces.join(', ')}]</span><button type="button" data-action="undoAttribute" data-index="${index}">Undo</button></div>`).join('');}
    const specLogs=root.querySelector('[data-specialisation-log]');if(specLogs){specLogs.innerHTML=this._draft.specialisations.map((r,index)=>`<div class="ac-review-row"><span>${safe(this._source.skills.find(s=>s.id===r.skillId)?.name||r.skillId)} — ${safe(r.name)}</span><button type="button" data-action="removeSpecialisation" data-index="${index}">Remove</button></div>`).join('');}
    const traitLogs=root.querySelector('[data-trait-log]');if(traitLogs){traitLogs.innerHTML=this._draft.traitIds.map((id,index)=>`<div class="ac-review-row"><span>${safe(this._source.traits.find(t=>t.id===id)?.name||id)}</span><button type="button" data-action="removeTrait" data-index="${index}">Remove</button></div>`).join('');}
    const ledgerStatus=root.querySelector('[data-creation-status]');if(ledgerStatus){ledgerStatus.classList.toggle('success',this._validation().errors.length===0);ledgerStatus.classList.toggle('error',this._validation().errors.length>0);}
  }
  static async _nextStep(){
    const {ledger}=this._validation({full:false});
    let error='';
    if(this._step===0&&(!this._value('name').trim()||(!Number.isSafeInteger(Number(this._value('age')))||Number(this._value('age'))<18||Number(this._value('age'))>99999)))error='Enter a true DHF name and an age of 18–99999.';
    if(this._step===1&&!this._package())error='Select a published Starting Package.';
    if(this._step===2){error=validateVariantChoices(this._variant(),this._variantChoices(),this._source.traits,this._source.skills,Number(this._value('age')||30))[0]||'';}
    if(this._step===3&&!ledger.valid&&ledger.errors.some(e=>e.includes('sleeve')||e.includes('STR/PER')))error=ledger.errors[0];
    if(this._step===4&&!ledger.valid){error=ledger.errors.find(e=>!(this._variant()==='ai'&&e.startsWith('AI SP and IP')))||'';}
    if(this._step===5)error=this._validation().errors[0]||'';
    if(error)return ui.notifications.warn(error);
    this._showStep(this._step+1);
  }
  static async _prevStep(){this._showStep(this._step-1);}
  static async _jumpStep(event,target){const goal=Number(target.dataset.stepIndex)||0;if(goal<=this._step)this._showStep(goal);else ui.notifications.info('Use Continue to validate each stage first.');}
  static async _rollAttribute(event,target){
    if(this._mode()==='expedited')return;
    const attribute=target.dataset.attribute,sp=Number(this._value(`spDice.${attribute}`)||0);
    if(!CREATOR_ATTRIBUTES.includes(attribute)||!Number.isSafeInteger(sp)||sp<1||sp>30)return ui.notifications.warn('Enter 1–30 SP for an Attribute roll.');
    if(sp>this._ledger().remainingSP)return ui.notifications.warn('Not enough unspent Stack Points.');
    const result=await new Roll(`${sp}d4`).evaluate();
    const faces=result.dice?.flatMap(d=>d.results.map(x=>x.result))||[];
    if(faces.length!==sp||faces.some(f=>!Number.isInteger(f)||f<1||f>4))return ui.notifications.error('Failed to capture all Attribute dice. SP was not deducted.');
    this._draft.attributeRolls.push({attribute,sp,faces});
    this._refreshDynamicGuidance();
  }
  static async _undoAttribute(event,target){this._draft.attributeRolls.splice(Number(target.dataset.index),1);this._refreshDynamicGuidance();}
  static async _addSpecialisation(){
    if(this._mode()==='expedited')return;
    const skillId=this._value('newSpecSkill'),name=this._value('newSpecName').trim();
    if(!skillId||!name)return ui.notifications.warn('Choose a Skill and enter a Specialisation name.');
    const next=[...this._draft.specialisations,{skillId,name}];const old=this._draft.specialisations;this._draft.specialisations=next;
    const ledger=this._ledger();if(!ledger.valid){this._draft.specialisations=old;return ui.notifications.warn(ledger.errors[0]);}
    this._field('newSpecName').value='';this._refreshDynamicGuidance();
  }
  static async _removeSpecialisation(event,target){this._draft.specialisations.splice(Number(target.dataset.index),1);this._refreshDynamicGuidance();}
  static async _addTrait(){
    if(this._mode()==='expedited')return;
    const id=this._value('newTrait');if(!id)return ui.notifications.warn('Select an official Trait first.');
    this._draft.traitIds.push(id);const ledger=this._ledger();if(!ledger.valid){this._draft.traitIds.pop();return ui.notifications.warn(ledger.errors[0]);}
    this._refreshDynamicGuidance();
  }
  static async _removeTrait(event,target){this._draft.traitIds.splice(Number(target.dataset.index),1);this._refreshDynamicGuidance();}
  async _doBaggage(index,reroll=false){
    const before=this._ledger();if(!Number.isSafeInteger(index)||index<0||index>=before.lifeEventRolls)return;
    const existing=this._draft.baggageEvents[index]||{rolls:[]};
    if(reroll&&!existing.rolls.length)return ui.notifications.warn('Roll Baggage first.');
    if(!reroll&&existing.rolls.length)return ui.notifications.warn('Baggage was already rolled. Use Reroll and pay SP.');
    if(reroll){const number=before.rerollCount;const cost=(number+1)*5;if(before.remainingSP<cost)return ui.notifications.warn(`A Baggage reroll costs ${cost} SP; insufficient balance.`);}
    const total=await rollTotal(`${before.baggageDice}d6`);
    existing.rolls.push(total);this._draft.baggageEvents[index]=existing;
    this._renderBaggage();this._refreshDynamicGuidance();
  }
  static async _rollBaggage(event,target){await this._doBaggage(Number(target.dataset.eventIndex),false);}
  static async _rerollBaggage(event,target){await this._doBaggage(Number(target.dataset.eventIndex),true);}

  static async _create(){
    if(this._creating)return;
    const validation=this._validation();if(validation.errors.length)return ui.notifications.error(validation.errors[0]);
    this._creating=true;this._refreshDynamicGuidance();
    let actor=null;
    try{
      const q=n=>this._value(n),ledger=validation.ledger;
      const trueName=q('name').trim(),publicName=q('publicName').trim()||trueName,pronouns=q('pronouns').trim();
      const archetype=this._archetype(),variant=this._variant(),age=variant==='ai'?0:Number(q('age'));
      const sleeveType=q('sleeveType')||'birth',packageName=this._package(),source=this._source;
      const compiled=compileStartingPackage(this._packageEntitlements(),this._collectChoices(),source.catalog);
      const archetypeData=source.reference.archetypes[archetype];
      const extraEP={Civilian:'1d6',Criminal:'1d8',Soldier:'1d10'}[archetype];
      const hp=await rollTotal(sleeveHealthFormula(sleeveType,ledger.attributes.strength)),threshold=damageThresholdFromStrength(ledger.attributes.strength);
      const ep=ledger.egoPoints+(extraEP?await rollTotal(extraEP):0);
      let ip=ledger.influencePoints+compiled.influenceBonus;
      if(variant==='religious'&&this._value('religiousBenefit')==='close-knit-community')ip+=1;
      if(archetype==='Official')ip+=1;if(archetype==='Socialite')ip+=2;if(variant==='meth')ip+=2;
      const wealth=q('wealth')===''?archetypeData.wealth:Number(q('wealth'));
      const backup=variant==='meth'?{enabled:true,priceLevel:4,routine:false,notes:'Core Meth starting lower-tier backup; update the backup state during play.'}:undefined;
      const variantChoices=this._variantChoices();
      const flags={[SYS]:{creation:{schema:1,mode:this._mode(),archetype,packageName,variant,
        ledger:{...ledger,entries:ledger.entries.map(e=>({...e}))},variantChoices,
        packageEntitlements:this._packageEntitlements().map(e=>({id:e.id,source:e.source,kind:e.kind,selections:Array.from({length:e.quantity},(_,i)=>this._draft.choices[entitlementChoiceKey(e,i)]||'')})),requiresGMReview:compiled.requiresReview,
        source:'Core Rulebook 2020, Chapter 2',creatorVersion:'1.5.0'}}};
      actor=await Actor.create({name:publicName,type:variant==='ai'?'ai':'character',ownership:{default:0,[game.user.id]:3},flags,
        system:{identity:{trueName,publicName,pronouns,dhfAge:age,storageYears:0,archetype,variant,variantChoices:Object.entries(variantChoices).filter(([,v])=>String(v||'').trim()).map(([k,v])=>`${k}: ${v}`).join('\n')},
          attributes:ledger.attributes,resources:{health:{value:hp,max:hp},ego:{value:ep,max:ep},wounds:{value:0,max:threshold},
          stackPoints:{value:ledger.remainingSP,max:ledger.startingSP},influence:{value:ip,max:ip}},wealth,stackState:'intact',sleeveState:'healthy',...(backup?{backup}:{})}});
      const skillLevels=ledger.finalSkills;
      const items=[{name:`${publicName} — Starting Sleeve`,type:'sleeve',system:{status:'active',sleeveType,
        strength:ledger.attributes.strength,perception:ledger.attributes.perception,healthMax:hp,damageThreshold:threshold,
        techCapacity:SLEEVE_LIMITS[sleeveType].techCapacity,geoRestricted:variant==='ai',rulesRef:'Core Rulebook 2020, Chapter 2: Sleeves'}},
        ...source.skills.map(s=>({name:s.name,type:'skill',system:{catalogId:s.id,attribute:s.attribute,level:skillLevels[s.id]??1,rulesRef:s.rulesRef,rulesText:s.rulesText||''}})),
        ...compiled.items];
      if(variant==='religious'&&this._value('religiousBenefit')==='close-knit-community')items.push({name:'Religious Community Contact',type:'network',system:{organization:'Religious Community',level:1,description:'Core 2020 p.80: religious community is an available starting Contact, with extra Contact resource die when developing community contacts.',rulesRef:'Core 2020 p.80: Close-knit Community'},flags:{[SYS]:{variantFeature:'close-knit-community',requiresGMReview:false}}});
      for(const t of this._freeTraits())items.push({name:t.name,type:'trait',system:{catalogId:t.id,tree:t.tree,branch:t.branch,tier:t.tier,
        commonality:creatorCommonality(archetype,t.tree,age,variant),spCost:0,ruleElements:serializedCoreTraitRules(t.id),effect:t.effect,description:t.effect,rulesRef:t.rulesRef},flags:{[SYS]:{freeCreationTrait:true,variantGrant:variant==='envoy'&&envoyFreeTraits(source.traits,variantChoices).some(f=>f.id===t.id)?'combat-conditioning':null}}});
      for(const feature of (variant==='envoy'?[variantChoices.envoyOne,variantChoices.envoyTwo]:variant==='religious'?[variantChoices.religiousBenefit]:[])){
        if(!feature)continue;
        const name=variant==='envoy'?ENVOY_BENEFITS.find(f=>f.id===feature)?.label:RELIGIOUS_BENEFITS.find(f=>f.id===feature)?.label;
        const notes={
          'perfect-recall':'Investigation/History +2 when relying on firsthand knowledge. Optional automatic success costs 1d4 Ego Points.',
          're-sleeving':'+2 Save Throw to prevent resleeving Ego Point loss.',
          'the-wolf-pack':'Restore/gain 1 Influence on entering a new town, world, organization or developing a Contact (temporary overflow must be spent within session).',
          'resourceful':'May restore one Influence Point by spending 10 SP instead of 15.',
          'combat-conditioning':`Gain all free Traits from: ${variantChoices.envoyBranchOne} and ${variantChoices.envoyBranchTwo}.`,
          'control-the-construct':'Virtual Construct: Strength and Perception penalties reduced to -1.',
          'close-knit-community':'Gain +1 starting IP, an available religious community Contact and extra Contact resource die for new community contacts.',
          'ego-barrier':'Halve Ego Point losses from viral attacks and gain +3 Save Throw to resist those attacks.',
          'eschew-virtual':'No projection to virtual simulspace, making virtual interrogation/training unavailable.',
          'spotless-soul':'Reduce Baggage life-event rolls and dice under the Core caps.'
        };
        items.push({name:`${variant==='envoy'?'Envoy':'Religious Coding'} — ${name}`,type:'trait',system:{description:notes[feature]||'',effect:notes[feature]||'',rulesRef:`Core 2020 pp. ${variant==='envoy'?'82':'80-81'}`},flags:{[SYS]:{variantFeature:feature,requiresGMReview:['perfect-recall','re-sleeving','the-wolf-pack','resourceful','ego-barrier','eschew-virtual'].includes(feature)}}});
      }
      for(const id of this._draft.traitIds){const t=source.traits.find(t=>t.id===id);if(!t)throw new Error(`Selected Trait vanished from catalog: ${id}`);
        items.push({name:t.name,type:'trait',system:{catalogId:t.id,tree:t.tree,branch:t.branch,tier:t.tier,
          commonality:creatorCommonality(archetype,t.tree,age,variant),spCost:ledger.entries.find(e=>e.kind==='trait'&&e.label.startsWith(`${t.name} (`))?.cost||0,
          ruleElements:serializedCoreTraitRules(t.id),effect:t.effect,description:t.effect,rulesRef:t.rulesRef}});
      }
      for(const spec of this._draft.specialisations){const skill=source.skills.find(x=>x.id===spec.skillId);if(!skill)throw new Error('Chosen Skill no longer exists.');
        items.push({name:spec.name,type:'specialisation',system:{skill:skill.name,description:`Chosen during creation for ${safe(skill.name)}.`,rulesRef:'Core Rulebook 2020, Chapter 2: Specialisations'}});
      }
      for(let index=0;index<ledger.lifeEventRolls;index++){
        const history=this._draft.baggageEvents[index]?.rolls||[];if(!history.length)throw new Error(`Baggage event ${index+1} was not rolled.`);
        const roll=history.at(-1),b=baggageEntryForTotal(source.baggage,roll);
        if(b)items.push({name:`Life Event ${index+1} — ${b.name}`,type:'baggage',flags:{[SYS]:{lifeEvent:index+1,rolls:history,requiresGMReview:b.min>3,mechanicalResolutionPending:b.min>3}},system:{catalogId:b.id,rollMin:b.min,rollMax:Number.isFinite(b.max)?b.max:999,
          appliesTo:b.sleeveOrStack?'Sleeve or Stack':'Narrative',description:b.effect,rulesRef:b.rulesRef}});
      }
      await actor.createEmbeddedDocuments('Item',dedupeUniqueSheetRecords(items));
      const baggageReview=items.filter(i=>i.type==='baggage'&&i.flags?.[SYS]?.requiresGMReview).length;
      ui.notifications.info(`${publicName} created — ${ledger.remainingSP}/${ledger.startingSP} SP left, ${ep} EP, ${ip} IP. GM review: ${compiled.requiresReview} provisional equipment records and ${baggageReview} narrative Baggage results.`);
      actor.sheet?.render(true);this.close();
    }catch(error){
      if(actor){try{await actor.delete();}catch(cleanupError){console.error(`${SYS}: failed to roll back unsuccessful creation`,cleanupError);}}
      console.error(`${SYS}: character creation failed`,error);
      ui.notifications.error(`Character creation failed: ${error.message||String(error)}. No partial character was intentionally retained.`);
    }finally{this._creating=false;this._refreshDynamicGuidance();}
  }
}

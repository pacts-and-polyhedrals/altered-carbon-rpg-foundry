import {ageResources,validateSleeveAttributes,SLEEVE_LIMITS,sleeveHealthFormula,damageThresholdFromStrength,baggageEntryForTotal} from './rules-engine.mjs';

const SYS='altered-carbon-rpg';
async function loadJSON(path){const r=await fetch(`systems/${SYS}/data/${path}`);if(!r.ok)throw new Error(`Unable to load ${path}`);return r.json();}
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
function commonalityFor(archetype,tree,age){const common={Criminal:'Crime',Official:'Law and Government',Socialite:'Business and Society',Soldier:'Combat',Technician:'Technology'};const anomaly={Criminal:'Law and Government',Official:'Crime',Socialite:'Survival',Soldier:'Business and Society',Technician:'Combat'};if(tree==='Praxis'&&Number(age)>100)return'common';if(common[archetype]===tree)return'common';if(anomaly[archetype]===tree)return'anomaly';return'uncommon';}
function findTrait(catalog,[branch,name]){const b=norm(branch),n=norm(name);return catalog.find(t=>norm(t.branch)===b&&norm(t.name)===n)||catalog.find(t=>norm(t.name)===n&&(norm(t.branch).includes(b)||b.includes(norm(t.branch))));}
async function rollTotal(formula){if(!formula||formula==='0')return 0;return Number((await new Roll(formula).evaluate()).total||0);}

const VARIANTS=[
  {id:'standard',name:'Standard DHF',tag:'Baseline',description:'The standard human DHF rules. Best for a first character because no extra variant procedures are added.'},
  {id:'ai',name:'Artificial Intelligence',tag:'Digital Native',description:'An AI may inhabit compatible synthetic hardware and uses special realspace, Virtual and Network rules. AI cannot use the Soldier Archetype.'},
  {id:'religious',name:'Religious Coding',tag:'Continuity Restricted',description:'Religious coding changes resleeving and continuity assumptions and can add source-defined benefits. Some choices remain deliberately player/GM selected.'},
  {id:'envoy',name:'Envoy',tag:'Conditioned Operative',description:'Envoy conditioning changes several social, Virtual and resource interactions. Choice-based benefits remain explicit selections rather than being invented by the wizard.'},
  {id:'meth',name:'Meth',tag:'Ultra-Wealthy',description:'Meth characters begin with the source-defined additional Influence and a lower-tier backup, while other Meth-specific rules continue to apply during play.'}
];

const SLEEVE_DESCRIPTIONS={
  birth:'Your original biological body. Standard organic limits and the normal birth-sleeve Health formula.',
  natal:'A naturally grown biological sleeve. Uses the standard organic Attribute limits and Health formula.',
  clone:'A clone sleeve. Rules can distinguish a preferred clone of the DHF’s own birth sleeve during resleeving.',
  'synthetic-low':'Low-grade synthetic hardware. Lower Perception ceiling and a smaller Health die than better synthetic sleeves.',
  'synthetic-mid':'Mid-grade synthetic hardware with increased Strength potential and standard mid-tier synthetic Health.',
  'synthetic-high':'Premium synthetic hardware with the highest Strength/Perception ceilings and larger Health dice.'
};

const ATTRIBUTE_HELP=[
  {id:'strength',code:'STR',name:'Strength',class:'physical',description:'Physical power of the active sleeve. Damage Threshold is derived from Strength.'},
  {id:'perception',code:'PER',name:'Perception',class:'physical',description:'Sensory capability of the active sleeve. Its Attribute Bonus is the basis of natural Speed Dice.'},
  {id:'empathy',code:'EMP',name:'Empathy',class:'mental',description:'A persistent DHF Attribute used by socially and emotionally focused Skills and several resource procedures.'},
  {id:'willpower',code:'WIL',name:'Willpower',class:'mental',description:'A persistent DHF Attribute representing mental resilience. It is also important to Ego and Virtual procedures.'},
  {id:'acuity',code:'ACU',name:'Acuity',class:'mental',description:'A persistent DHF Attribute used for rapid cognitive processing and several perception-adjacent or Virtual procedures.'},
  {id:'intelligence',code:'INT',name:'Intelligence',class:'mental',description:'A persistent DHF Attribute used for reasoning, knowledge and technical Skills.'}
];

const STEP_LABELS=['Identity','Archetype','Variant','Sleeve','Attributes','Resources','Review'];

export class ACCharacterCreator extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
  static DEFAULT_OPTIONS={
    id:'ac-character-creator',
    classes:['altered-carbon','ac-creator-window'],
    window:{title:'Altered Carbon — Guided Character Creator'},
    position:{width:980,height:840},
    actions:{create:this._create,nextStep:this._nextStep,prevStep:this._prevStep,jumpStep:this._jumpStep}
  };
  static PARTS={main:{template:'systems/altered-carbon-rpg/templates/character-creator.hbs'}};
  _step=0;

  async _prepareContext(options){
    const context=await super._prepareContext(options),ref=await loadJSON('archetype-reference.json');
    const archetypes=Object.entries(ref.archetypes).map(([name,data])=>({name,defaultSleeve:data.defaultSleeve,wealth:data.wealth,features:data.features||[],packages:Object.keys(data.packages||{})}));
    const packageOptions=[];
    for(const [a,data] of Object.entries(ref.archetypes))for(const p of Object.keys(data.packages))packageOptions.push({value:`${a}::${p}`,archetype:a,label:p});
    const sleeveTypes=Object.keys(SLEEVE_LIMITS).filter(x=>x!=='other').map(id=>({id,label:id.replaceAll('-',' ').replace(/\b\w/g,m=>m.toUpperCase()),description:SLEEVE_DESCRIPTIONS[id]||'',limits:SLEEVE_LIMITS[id]}));
    return{...context,archetypes,variants:VARIANTS,sleeveTypes,packageOptions,attributeHelp:ATTRIBUTE_HELP,steps:STEP_LABELS.map((label,index)=>({label,index,number:index+1}))};
  }

  async _onRender(context,options){
    await super._onRender(context,options);
    this._wireWizard();
    this._showStep(this._step);
    this._refreshDynamicGuidance();
  }

  _wireWizard(){
    const root=this.element;
    if(!root)return;
    for(const el of root.querySelectorAll('input,select,textarea'))el.addEventListener('input',()=>this._refreshDynamicGuidance());
    root.querySelector('[name="archetype"]')?.addEventListener('change',()=>{
      const archetype=root.querySelector('[name="archetype"]')?.value||'Civilian';
      const option=root.querySelector(`[name="archetype"] option[value="${CSS.escape(archetype)}"]`);
      const sleeve=root.querySelector('[name="sleeveType"]');
      if(sleeve&&option?.dataset.defaultSleeve)sleeve.value=option.dataset.defaultSleeve;
      this._syncSleeveLimits();
      this._refreshDynamicGuidance();
    });
    root.querySelector('[name="variant"]')?.addEventListener('change',()=>{
      const variant=root.querySelector('[name="variant"]')?.value;
      const sleeve=root.querySelector('[name="sleeveType"]');
      if(variant==='ai'&&sleeve&&!String(sleeve.value).startsWith('synthetic-'))sleeve.value='synthetic-mid';
      this._syncSleeveLimits();
      this._refreshDynamicGuidance();
    });
    root.querySelector('[name="sleeveType"]')?.addEventListener('change',()=>{this._syncSleeveLimits();this._refreshDynamicGuidance();});
    this._syncSleeveLimits();
  }


  _syncSleeveLimits(){
    const sleeve=this._value('sleeveType')||'birth',limits=SLEEVE_LIMITS[sleeve];if(!limits)return;
    for(const [key,range] of [['strength',limits.strength],['perception',limits.perception]]){const input=this._field(key);if(!input)continue;input.min=String(range[0]);input.max=String(range[1]);const current=Number(input.value||30);if(current<range[0])input.value=String(range[0]);if(current>range[1])input.value=String(range[1]);}
    for(const key of ['empathy','willpower','acuity','intelligence']){const input=this._field(key);if(!input)continue;input.min='30';input.max='50';}
  }

  _field(name){return this.element?.querySelector(`[name="${name}"]`);}
  _value(name){return this._field(name)?.value??'';}

  _showStep(step){
    const max=STEP_LABELS.length-1;
    this._step=Math.max(0,Math.min(max,Number(step)||0));
    const root=this.element;if(!root)return;
    root.querySelectorAll('[data-wizard-step]').forEach(el=>el.classList.toggle('active',Number(el.dataset.wizardStep)===this._step));
    root.querySelectorAll('[data-step-index]').forEach(el=>{const n=Number(el.dataset.stepIndex);el.classList.toggle('active',n===this._step);el.classList.toggle('complete',n<this._step);});
    const progress=root.querySelector('.ac-wizard-progress-fill');if(progress)progress.style.width=`${((this._step+1)/STEP_LABELS.length)*100}%`;
    const counter=root.querySelector('[data-step-counter]');if(counter)counter.textContent=`${String(this._step+1).padStart(2,'0')} / ${String(STEP_LABELS.length).padStart(2,'0')}`;
    const prev=root.querySelector('[data-action="prevStep"]');if(prev)prev.disabled=this._step===0;
    const next=root.querySelector('[data-action="nextStep"]');if(next)next.hidden=this._step===max;
    const create=root.querySelector('[data-action="create"]');if(create)create.hidden=this._step!==max;
    this._refreshDynamicGuidance();
    root.querySelector('.ac-wizard-stage')?.scrollTo({top:0,behavior:'smooth'});
  }

  _refreshDynamicGuidance(){
    const root=this.element;if(!root)return;
    const archetype=this._value('archetype')||'Civilian',variant=this._value('variant')||'standard',sleeve=this._value('sleeveType')||'birth';
    root.querySelectorAll('[data-archetype-panel]').forEach(el=>el.hidden=el.dataset.archetypePanel!==archetype);
    root.querySelectorAll('[data-variant-panel]').forEach(el=>el.hidden=el.dataset.variantPanel!==variant);
    root.querySelectorAll('[data-sleeve-panel]').forEach(el=>el.hidden=el.dataset.sleevePanel!==sleeve);
    root.querySelectorAll('[data-ai-only]').forEach(el=>el.hidden=variant!=='ai');

    const pkg=this._field('package');
    if(pkg){
      for(const option of [...pkg.options])if(option.value)option.hidden=option.dataset.archetype!==archetype;
      if(pkg.selectedOptions[0]?.dataset.archetype&&pkg.selectedOptions[0].dataset.archetype!==archetype)pkg.value='';
    }

    const set=(key,value)=>{const el=root.querySelector(`[data-summary="${key}"]`);if(el)el.textContent=value||'—';};
    set('name',this._value('name')||'New DHF');
    set('publicName',this._value('publicName')||this._value('name')||'New DHF');
    set('age',variant==='ai'?'N/A — AI':`${this._value('age')||30} years`);
    set('archetype',archetype);
    set('package',this._value('package')?.split('::')[1]||'Custom / choose later');
    set('variant',VARIANTS.find(v=>v.id===variant)?.name||variant);
    set('sleeve',sleeve.replaceAll('-',' '));
    set('attributes',`STR ${this._value('strength')||30} · PER ${this._value('perception')||30} · EMP ${this._value('empathy')||30} · WIL ${this._value('willpower')||30} · ACU ${this._value('acuity')||30} · INT ${this._value('intelligence')||30}`);
    set('wealth',this._value('wealth')||'Archetype default');
  }

  static async _nextStep(){this._showStep(this._step+1);}
  static async _prevStep(){this._showStep(this._step-1);}
  static async _jumpStep(event,target){this._showStep(Number(target.dataset.stepIndex)||0);}

  static async _create(){
    const q=n=>this.element.querySelector(`[name="${n}"]`)?.value;
    const name=q('name')?.trim()||'New DHF',publicName=q('publicName')?.trim()||name,pronouns=q('pronouns')?.trim()||'',archetype=q('archetype')||'Civilian',variant=q('variant')||'standard',age=variant==='ai'?0:Math.max(18,Number(q('age')||30)),sleeveType=q('sleeveType')||'birth',packageChoice=q('package')||'';
    if(packageChoice&&packageChoice.split('::')[0]!==archetype)return ui.notifications.error('The selected Starting Package must belong to the selected Archetype.');
    if(variant==='ai'&&archetype==='Soldier')return ui.notifications.error('AI characters cannot use the Soldier Archetype under the 2020 Core rules.');
    if(variant==='ai'&&!String(sleeveType).startsWith('synthetic-'))return ui.notifications.error('The guided AI creator requires a synthetic sleeve. AI may otherwise operate from a building/mainframe, but that is created manually as an AI Actor.');
    const attrs={strength:Number(q('strength')||30),perception:Number(q('perception')||30),empathy:Number(q('empathy')||30),willpower:Number(q('willpower')||30),acuity:Number(q('acuity')||30),intelligence:Number(q('intelligence')||30)};
    const validation=validateSleeveAttributes(sleeveType,attrs);if(!validation.valid)return ui.notifications.error(`Sleeve attributes outside ${sleeveType} limits: STR ${validation.limits.strength.join('–')}, PER ${validation.limits.perception.join('–')}.`);
    if(['empathy','willpower','acuity','intelligence'].some(k=>attrs[k]<30||attrs[k]>50))return ui.notifications.error('Starting Stack Attributes must be between 30 and 50 before cap-altering Traits. Values above 30 are treated as a pre-generated/GM-authored final allocation; use the Actor advancement API for rolled SP increases during play.');
    let starting=variant==='ai'?null:ageResources(age,attrs);if(variant==='ai'){const spRaw=q('manualSP'),ipRaw=q('manualIP');if(spRaw===''||ipRaw==='')return ui.notifications.error('The 2020 Core gives AI no age-based starting SP/IP row. Enter explicit AI Stack Points and Influence Points rather than using an invented default.');starting={stackPoints:Math.max(0,Number(spRaw)),egoPoints:attrs.willpower,influencePoints:Math.max(0,Number(ipRaw)),baggageDice:0,lifeEventRolls:0};}if(variant==='religious'&&age<=40)starting.stackPoints+=25;
    const [skills,presets,archetypeRef,traitsData,baggageData]=await Promise.all([loadJSON('core-skills.json'),loadJSON('archetype-skills.json'),loadJSON('archetype-reference.json'),loadJSON('trait-catalog.json'),loadJSON('baggage-catalog.json')]);
    const preset=presets.archetypes[archetype]||presets.archetypes.Civilian,levelById=new Map(preset.map(x=>[x.id,x.level]));
    const hp=await rollTotal(sleeveHealthFormula(sleeveType,attrs.strength)),threshold=damageThresholdFromStrength(attrs.strength);let ep=starting.egoPoints,ip=starting.influencePoints;
    const extra={Civilian:'1d6',Criminal:'1d8',Soldier:'1d10'}[archetype];if(extra)ep+=await rollTotal(extra);if(archetype==='Official')ip+=1;if(archetype==='Socialite')ip+=2;if(variant==='meth')ip+=2;
    const archetypeData=archetypeRef.archetypes[archetype],wealth=Number(q('wealth')||archetypeData?.wealth||1);
    const actorType=variant==='ai'?'ai':'character';const backup=variant==='meth'?{enabled:true,priceLevel:4,routine:false,notes:'Meth starting backup — lower-tier source default.'}:undefined;
    const actor=await Actor.create({name:publicName,type:actorType,ownership:{default:0,[game.user.id]:3},system:{identity:{trueName:name,publicName,pronouns,dhfAge:age,storageYears:0,archetype,variant},attributes:attrs,resources:{health:{value:hp,max:hp},ego:{value:ep,max:ep},wounds:{value:0,max:threshold},stackPoints:{value:starting.stackPoints,max:starting.stackPoints},influence:{value:ip,max:ip}},wealth,stackState:'intact',sleeveState:'healthy',...(backup?{backup}:{})}});
    const items=[{name:`${publicName} — Starting Sleeve`,type:'sleeve',system:{status:'active',sleeveType,strength:attrs.strength,perception:attrs.perception,healthMax:hp,damageThreshold:threshold,techCapacity:validation.limits.techCapacity,geoRestricted:variant==='ai',rulesRef:'Core Rulebook 2020, Chapter 2: Sleeves'}},...skills.map(s=>({name:s.name,type:'skill',system:{catalogId:s.id,attribute:s.attribute,level:levelById.get(s.id)||1,rulesRef:s.rulesRef,rulesText:s.rulesText||''}}))];
    if(packageChoice){const packageName=packageChoice.split('::')[1],pkg=archetypeData.packages[packageName];for(const spec of pkg.traits||[]){const t=findTrait(traitsData.traits,spec);if(!t)continue;const commonality=commonalityFor(archetype,t.tree,age);items.push({name:t.name,type:'trait',system:{catalogId:t.id,tree:t.tree,branch:t.branch,tier:t.tier,commonality,spCost:0,effect:t.effect,description:t.effect,rulesRef:t.rulesRef}});}items.push({name:`Starting Package — ${packageName}`,type:'equipment',system:{description:`<p>${pkg.gear}</p>`,rulesRef:'Core Rulebook 2020, Archetype Starting Package'}});}
    if(variant!=='standard')items.push({name:`Variant — ${variant}`,type:'equipment',system:{description:'<p>Advanced variant selected. Open the 2020 Rules Reference for all mandatory rules and choice-based benefits. Runtime-enforced invariants are applied where deterministic; choice-based Traits/benefits remain explicit player/GM selections.</p>',rulesRef:'Core Rulebook 2020, Variant Characters'}});
    for(let i=0;i<starting.lifeEventRolls;i++){const roll=await new Roll(`${starting.baggageDice}d6`).evaluate(),b=baggageEntryForTotal(baggageData,roll.total);if(b)items.push({name:b.name,type:'baggage',system:{catalogId:b.id,rollMin:b.min,rollMax:Number.isFinite(b.max)?b.max:999,appliesTo:b.sleeveOrStack?'Sleeve or Stack':'Narrative',description:b.effect,rulesRef:b.rulesRef}});}
    await actor.createEmbeddedDocuments('Item',items);
    ui.notifications.info(`${publicName} created: ${starting.stackPoints} SP, ${ep} EP, ${ip} IP, ${hp} HP; ${starting.lifeEventRolls} Baggage roll(s) resolved.`);
    actor.sheet.render(true);this.close();
  }
}

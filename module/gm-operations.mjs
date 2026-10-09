import {adversaryDocuments,networkDocument,contactProfile,CONTACT_AFFILIATIONS,campaignAdvance} from './gm-content.mjs';
import {createOfficialAdversary,addNetwork,installOfficialNetworkLibrary,addContact,resolveNetworkRequest,useGeneralModifiers,restoreNetwork,contactVirtueFlaw} from './gm-workflows.mjs';

const NS='altered-carbon-rpg';
const {api}=foundry.applications;
const esc=v=>foundry.utils.escapeHTML(String(v??''));
const options=(values,selected=null)=>values.map(x=>`<option value="${esc(x.value)}"${x.value===selected?' selected':''}>${esc(x.label)}</option>`).join('');
const get=(form,key)=>form instanceof FormData?form.get(key):form?.[key];
const checked=(form,key)=>form instanceof FormData?form.has(key):Boolean(form?.[key]);
const getAll=(form,key)=>form instanceof FormData?form.getAll(key):(form?.[key]||[]);
const sourceActors=()=>game.actors.filter(a=>['character','ai'].includes(a.type));
const itemOptions=actor=>(actor?.items||[]).filter(i=>['weapon','armour','equipment','software','resourceEntry'].includes(i.type)).map(i=>({value:i.id,label:`${i.name} (DP ${i.system.depletion||0})`}));
const selected=actor=>[...(actor?.items||[])].filter(i=>['contact','network'].includes(i.type)).map(i=>({value:i.id,label:`${i.name} · ${i.type} · ${i.system.exhausted?'EXHAUSTED':'Available'}`}));
const number=(n,min,max,label)=>{const v=Number(n);if(!Number.isSafeInteger(v)||v<min||v>max)throw new Error(`${label} must be ${min}–${max}.`);return v;};
const rollFaces=async(sides,count=1)=>{const r=await new Roll(`${count}d${sides}`).evaluate();return (r.dice||[]).flatMap(d=>(d.results||[]).map(x=>Number(x.result)));};
const whisperGMs=()=>game.users.filter(u=>u.isGM).map(u=>u.id);
async function gmNotice(title,details){return ChatMessage.implementation.create({speaker:{alias:'GM Campaign Generator'},content:`<section class="ac-chat-card ac-gm-operations-log"><header class="ac-chat-card-header"><strong>${esc(title)}</strong></header><p>${esc(details)}</p></section>`,whisper:whisperGMs()});}
async function fetchJSON(name){const r=await fetch(`systems/${NS}/data/${name}`);if(!r.ok)throw new Error(`Cannot open ${name}`);return r.json();}
export function registerGMCampaignSetting(){game.settings.register(NS,'gmCampaignState',{name:'GM Campaign Generator State',hint:'World-scoped Noir/Action campaign progress and dice log.',scope:'world',config:false,type:Object,default:{title:'',genre:'noir',mode:'roll-all',dice:[],total:0,events:[]}});}

export class ACGMOperations extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
 static DEFAULT_OPTIONS={
  id:'ac-gm-operations',classes:['altered-carbon','ac-gm-window','ac-gm-operations'],window:{title:'Altered Carbon — GM Operations / Chapter 7'},position:{width:1100,height:860},
  actions:{createAdversary:this._createAdversary,addNetwork:this._addNetwork,installNetworks:this._installNetworks,createContact:this._createContact,startCampaign:this._startCampaign,advanceCampaign:this._advanceCampaign,supportingCast:this._supportingCast,makeRequest:this._makeRequest,restoreSource:this._restoreSource,generalModifiers:this._generalModifiers,virtueIP:this._virtueIP,flawIP:this._flawIP}
 };
 static PARTS={main:{template:'systems/altered-carbon-rpg/templates/gm-operations.hbs'}};
 _actorId='';
 async _prepareContext(options){
  if(!game.user.isGM)throw new Error('GM only.');
  const context=await super._prepareContext(options);
  const [adversaries,networks,skills,table]=await Promise.all([fetchJSON('adversary-catalog.json'),fetchJSON('network-catalog.json'),fetchJSON('core-skills.json'),fetchJSON('campaign-prompts.json')]);
  const actors=sourceActors(),current=actors.find(a=>a.id===this._actorId)||actors[0]||null;this._actorId=current?.id||'';
  const state=game.settings.get(NS,'gmCampaignState')||{};
  return {...context,actors:actors.map(a=>({id:a.id,name:a.name,selected:a.id===this._actorId})),hasActor:Boolean(current),sources:selected(current),gear:itemOptions(current),actorSkills:[...(current?.items||[])].filter(i=>i.type==='skill').map(i=>({id:i.id,name:i.name})),adversaries:adversaries.records.map(a=>({...a,eligibleMinion:!!a.minionBonus})),networks:networks.records,affiliations:Object.keys(CONTACT_AFFILIATIONS).map(x=>({id:x,title:x})),genres:['noir','action'],campaign:state,hasCampaign:Boolean(state.title),recentEvents:[...(state.events||[])].slice(-8).reverse(),campaignTitle:state.title||'No campaign started',sourceCount:selected(current).length,actorName:current?.name||'',roleCounts:Object.fromEntries(Object.entries(table.supportRoles).map(([k,v])=>[k,v.length]))};
 }
 async _onRender(context,options){await super._onRender(context,options);const select=this.element?.querySelector('select[name="gmOpsActor"]');select?.addEventListener('change',event=>{this._actorId=event.currentTarget.value;this.render({force:true});});}
 actor(){const actor=game.actors.get(this._actorId);if(!actor)throw new Error('Choose a character in the Target Actor selector first.');return actor;}
 async _do(callback){if(!game.user.isGM)return ui.notifications.warn('GM only.');try{const out=await callback();this.render({force:true});return out;}catch(e){console.error('Altered Carbon | GM Operations failed',e);ui.notifications.error(e.message||'GM operation failed.');return null;}}
 static async _createAdversary(event,target){return this._do(async()=>{
  const data=await fetchJSON('adversary-catalog.json'),entry=data.records.find(e=>e.id===target.dataset.id);if(!entry)throw new Error('Adversary not found.');
  const optionsHtml=options([{value:'',label:'Core baseline'},...['Consummate Warrior','Escape Artist','Signature Weapon','Juggernaut','Mastermind','Psy-Op','Well Connected'].filter(x=>!entry.nonCombatant||['Mastermind','Psy-Op'].includes(x)).map(x=>({value:x,label:x}))]);
  const form=await api.DialogV2.input({window:{title:`Create Official Adversary — ${entry.name}`},content:`<p>2020 Core Ch.7, ${esc(entry.category)}. Creates a ready-to-roll Threat Actor with 32 Skill records and the printed numerical baseline. When selected, only unambiguous official gear is equipped; variants and narrative upgrades require review.</p><label>World Actor name</label><input name="name" value="${esc(entry.name)}" maxlength="120"><label><input name="includeGear" type="checkbox" checked> Equip unambiguous gear from the canonical Core Item library</label><label><input name="minion" type="checkbox" ${entry.minionBonus?'':'disabled'}> Use printed Minion variant${entry.minionBonus?` (+${entry.minionBonus} Wounds threshold)`:''}</label><label>Nemesis feature (optional)</label><select name="nemesis">${optionsHtml}</select><p class="hint">Nemesis narrative abilities and the published optional equipment are reference-only unless explicitly supported by the combat system.</p>`});if(!form)return;
  const [skills,items]=await Promise.all([fetchJSON('core-skills.json'),fetchJSON('item-catalog.json')]);const actor=await createOfficialAdversary(entry,skills,{name:String(get(form,'name')||''),minion:checked(form,'minion'),nemesisAbility:String(get(form,'nemesis')||''),includeGear:checked(form,'includeGear'),canonicalItems:items.items});actor.sheet?.render({force:true});ui.notifications.info(`Created ${actor.name}.`);
 });}
 static async _addNetwork(event,target){return this._do(async()=>{
  const data=await fetchJSON('network-catalog.json'),entry=data.records.find(e=>e.id===target.dataset.id);if(!entry)throw new Error('Network template not found.');
  const form=await api.DialogV2.input({window:{title:`Add Core Network: ${entry.name}`},content:`<p>General Network categories need a real world organization, not a fictional default.</p><label>Specific organization or individual</label><input name="org" value="${esc(entry.organization)}"><label>Request Level (1–5)</label><input name="level" type="number" min="1" max="5" value="1">`});if(!form)return;
  const item=await addNetwork(this.actor(),entry,{organization:get(form,'org'),level:number(get(form,'level'),1,5,'Network Level')});ui.notifications.info(`Network created on ${this.actor().name}: ${item.name}`);
 });}
 static async _installNetworks(){return this._do(async()=>{const entries=(await fetchJSON('network-catalog.json')).records;const result=await installOfficialNetworkLibrary(entries);ui.notifications.info(`Core Networks: ${result.created} created, ${result.refreshed} refreshed.`);});}
 static async _createContact(){return this._do(async()=>{
  const actor=this.actor();const npcOptions=options([{value:'',label:'No linked NPC Actor'},...game.actors.filter(a=>a.id!==actor.id&&['npc','threat','ai'].includes(a.type)).map(a=>({value:a.id,label:a.name}))]);
  const affOptions=options(Object.keys(CONTACT_AFFILIATIONS).map(x=>({value:x,label:`${x} · SP${CONTACT_AFFILIATIONS[x].sp} · ${CONTACT_AFFILIATIONS[x].dice}d6`})),'casual');
  const form=await api.DialogV2.input({window:{title:`Generate Contact for ${actor.name}`},content:`<div class="ac-gm-form-grid"><label>Contact identity</label><input name="name" maxlength="120" required placeholder="Name this NPC"><label>Existing NPC Actor (optional)</label><select name="linkedNpc">${npcOptions}</select><label>Affiliation</label><select name="affiliation">${affOptions}</select><fieldset><legend>Contact services</legend><label><input type="checkbox" name="categories" value="informant" checked> Informant</label><label><input type="checkbox" name="categories" value="supplier"> Supplier</label><label><input type="checkbox" name="categories" value="mercenary"> Mercenary</label></fieldset><label><input type="checkbox" name="desperation"> Desperation Contact: 0 SP, forced Scandal and one-use contact</label><label><input type="checkbox" name="chargeSP" checked> Charge the published affiliation SP cost now</label><label><input type="checkbox" name="chargeDevelopmentSP"> Charge additional social-standing SP to develop this NPC</label><label><input type="checkbox" name="applyInfluence" checked> Apply the NPC Resource Table Influence reward</label><p>Social standing, history, Virtue/Flaw and resource dice are generated using the published tables. The GM previews results before writing the Contact.</p></div>`});if(!form)return;
  const aff=String(get(form,'affiliation')||'casual'),profileAff=CONTACT_AFFILIATIONS[aff];if(!profileAff)throw new Error('Invalid Contact affiliation.');
  const standing=(await rollFaces(10))[0],history=(await rollFaces(10))[0],virtue=(await rollFaces(12))[0],flaw=(await rollFaces(12))[0];
  const extraFlaw=standing===1?(await rollFaces(12))[0]:null;
  const resourceDice=await rollFaces(6,profileAff.dice);
  const profile=contactProfile({name:get(form,'name'),standingRoll:standing,historyRoll:history,virtueRoll:virtue,flawRoll:flaw,extraFlawRoll:extraFlaw,affiliation:aff,categories:getAll(form,'categories'),resourceDice,linkedActorId:get(form,'linkedNpc'),desperation:checked(form,'desperation')});
  const charge=checked(form,'chargeSP')&&!profile.requiresScandal;const chargeDevelopment=checked(form,'chargeDevelopmentSP')&&!profile.requiresScandal;const applyInfluence=checked(form,'applyInfluence');
  const confirmed=await api.DialogV2.confirm({window:{title:`Confirm Contact: ${profile.name}`},content:`<p><b>Social standing:</b> ${esc(profile.standing.name)} (d10=${standing})</p><p><b>History:</b> ${esc(profile.history.name)} (d10=${history})</p><p><b>Virtue / Flaw:</b> ${esc(profile.virtue)} / ${esc(profile.flaws.join(', '))}</p><p><b>Resources:</b> ${esc(resourceDice.join('+'))} ${profile.standing.modifier<0?'':'+'}${profile.standing.modifier} ${profile.history.modifier<0?'':'+'}${profile.history.modifier} = ${profile.resourceScore} · Catalogue Lv.${profile.resources.tier} · maximum Request Lv.${profile.resources.maxRequestLevel}</p><p><b>Affiliation cost:</b> SP${profile.spCost}${charge?' (deducted now)':' (GM waived / cost separate)'}; developing this NPC further may require additional SP${profile.developmentSP}${chargeDevelopment?' (deducted now)':' (GM review / not yet paid)'} per the social-standing table. <b>Influence:</b> ${esc(profile.resources.influence)} IP1 (${applyInfluence?'apply if possible':'GM deferred'}).</p>${profile.requiresScandal?'<p>Desperation adds a custom Scandal and the Contact is one-use.</p>':''}`});if(!confirmed)return;
  const item=await addContact(actor,profile,{chargeSP:charge,chargeDevelopmentSP:chargeDevelopment,applyInfluence});ui.notifications.info(`Contact ${item.name} created.`);
 });}
 static async _startCampaign(){return this._do(async()=>{
  const old=game.settings.get(NS,'gmCampaignState');if(old?.events?.length){const replace=await api.DialogV2.confirm({window:{title:'Reset Campaign Log?'},content:'A GM campaign is already underway. Starting another replaces its local world campaign log. Continue?'});if(!replace)return;}
  const form=await api.DialogV2.input({window:{title:'New Noir / Action Campaign'},content:`<label>Campaign title</label><input name="title" maxlength="120" placeholder="Casefile name"><label>Mode</label><select name="genre"><option value="noir">Noir / conspiracy</option><option value="action">Action</option></select><label>Progress math</label><select name="mode"><option value="roll-all">Roll every collected Campaign Die each session</option><option value="running">Add each new roll to the running total (shorter campaign)</option></select><p>The GM chooses the Campaign Die based on how the last session went: d4 very good, d12 extremely bad.</p>`});if(!form)return;
  const title=String(get(form,'title')||'').trim();if(!title||title.length>120)throw new Error('Enter a campaign title.');
  const genre=String(get(form,'genre')),mode=String(get(form,'mode'));if(!['noir','action'].includes(genre)||!['roll-all','running'].includes(mode))throw new Error('Invalid campaign mode.');
  await game.settings.set(NS,'gmCampaignState',{title,genre,mode,dice:[],total:0,events:[]});ui.notifications.info(`Campaign ${title} created.`);
 });}
 static async _advanceCampaign(){return this._do(async()=>{
  const state=game.settings.get(NS,'gmCampaignState');if(!state?.title)throw new Error('Start a campaign first.');
  const form=await api.DialogV2.input({window:{title:`Advance: ${state.title}`},content:`<p>Result dice are cumulative. This mode: ${esc(state.mode==='running'?'add to running total':'roll every accumulated die')}.</p><label>How did the session go?</label><select name="sides"><option value="4">d4 — Extremely good</option><option value="6">d6 — Good</option><option value="8" selected>d8 — Poor</option><option value="10">d10 — Bad</option><option value="12">d12 — Extremely bad</option></select><label>GM progress notes</label><textarea name="notes" rows="2" placeholder="What happened, what might come next?"></textarea>`});if(!form)return;
  const sides=number(get(form,'sides'),4,12,'Campaign Die');if(![4,6,8,10,12].includes(sides))throw new Error('Campaign die must be d4/d6/d8/d10/d12.');
  const diceToRoll=state.mode==='running'?[sides]:[...(state.dice||[]),sides];const rolled=[];for(const die of diceToRoll)rolled.push((await rollFaces(die))[0]);
  const table=await fetchJSON('campaign-prompts.json'),r=campaignAdvance({previous:state,dieSides:sides,rolls:rolled,genre:state.genre,table});
  const event={session:r.session,die:sides,rolls:r.rolls,total:r.total,title:r.band.title,progress:r.band.progress,result:r.band.result,finale:r.band.finale||'',rewardSP:r.rewardSP,notes:String(get(form,'notes')||'').slice(0,1200)};
  await game.settings.set(NS,'gmCampaignState',{...state,total:r.total,dice:r.dice,events:[...(state.events||[]),event]});
  await gmNotice(`Session ${event.session} — ${event.title}`,`Campaign: ${state.title} (${state.genre}). Progress: ${event.total}. Dice: ${event.rolls.join(', ')}. Scenario: ${event.progress}. Next consideration: ${event.result}. ${event.finale?`Optional finale: ${event.finale}`:''} Suggested SP per participant: ${event.rewardSP} (GM may override). Notes: ${event.notes}`);
  ui.notifications.info(`Campaign progress total ${r.total}. ${r.band.title}.`);
 });}
 static async _supportingCast(){return this._do(async()=>{
  const table=await fetchJSON('campaign-prompts.json'),genre=game.settings.get(NS,'gmCampaignState')?.genre||'noir',list=table.supportRoles[genre]||table.supportRoles.noir;
  const die=(await rollFaces(list.length))[0],role=list[die-1];
  const form=await api.DialogV2.input({window:{title:`Supporting Cast — ${role}`},content:`<p>The Chapter 7 supporting-cast guidance suggests <b>${esc(role)}</b>. Treat this as an archetypal story role, not a compulsory character behavior.</p><label>NPC name (optional)</label><input name="name" maxlength="120" placeholder="Unknown NPC"><label>Role note</label><textarea name="notes" rows="3" placeholder="Their objective, stake and connection to the crew"></textarea><label><input type="checkbox" name="create"> Create an NPC Actor shell (no invented game statistics)</label>`});if(!form)return;
  const name=String(get(form,'name')||'').trim()||'Unnamed supporting character';const notes=String(get(form,'notes')||'').slice(0,1200);
  if(checked(form,'create'))await foundry.documents.Actor.implementation.create({name,type:'npc',system:{identity:{archetype:`Supporting cast — ${role}`},notes},flags:{[NS]:{gmSupportingRole:role,generatedFrom:'Chapter 7 GM prompt'}}});
  await gmNotice(`Supporting role: ${role}`,`NPC: ${name}. ${notes}`);
 });}
 static async _makeRequest(){return this._do(async()=>{
  const actor=this.actor(),sources=selected(actor),skills=[...actor.items].filter(i=>i.type==='skill');if(!sources.length||!skills.length)throw new Error('Choose an Actor with a Contact/Network and Skill.');
  const form=await api.DialogV2.input({window:{title:`Core Request — ${actor.name}`},content:`<label>Contact / Network</label><select name="source">${options(sources)}</select><label>Procedure</label><select name="kind"><option value="favor">Normal favor</option><option value="material">Material support (mission-bound)</option><option value="resupply">Resupply / DP restoration</option><option value="general">General Request modifier pool (Contact)</option><option value="work-for-hire">Work for Hire / Bribery</option></select><label>Request Level</label><select name="level">${options([1,2,3,4,5].map(n=>({value:String(n),label:`Lv.${n}`})))}</select><label>Requested Skill</label><select name="skill">${options(skills.map(s=>({value:s.id,label:s.name})))}</select><label>Resupply Item (only if Resupply)</label><select name="gear"><option value="">Choose gear</option>${options(itemOptions(actor))}</select><label><input type="checkbox" name="urban"> GM confirms this Request takes place in an urban environment (e.g. Underground Trait)</label><label><input type="checkbox" name="paid"> For Work for Hire, GM has resolved the equivalent Price Level monetary purchase / Deferral</label><p><b>IP:</b> normal, material, general and resupply Requests cost IP1. Paid assistance costs no IP. Spending IP can leverage success even after a failed check, but the source may be exhausted.</p>`});if(!form)return;
  const outcome=await resolveNetworkRequest({actor,sourceId:get(form,'source'),skillId:get(form,'skill'),level:number(get(form,'level'),1,5,'Request level'),kind:get(form,'kind'),gearId:get(form,'gear'),paidConfirmed:checked(form,'paid'),environment:checked(form,'urban')?'urban':''});
  ui.notifications.info(outcome.exhaust.exhausted?'Request resolved; source exhausted.':'Request resolved; source available.');
 });}
 static async _restoreSource(){return this._do(async()=>{
  const actor=this.actor(),sources=selected(actor);if(!sources.length)throw new Error('No Contact/Network records.');
  const form=await api.DialogV2.input({window:{title:'Restore exhausted Network'},content:`<label>Source</label><select name="source">${options(sources)}</select><label>Method</label><select name="method"><option value="ip">Spend IP1 to restore</option><option value="narrative">GM confirms Deferral / narrative restoration</option></select><label>Reason for narrative restoration</label><textarea name="reason" rows="2" placeholder="How was trust recovered?"></textarea>`});if(!form)return;
  await restoreNetwork(actor,get(form,'source'),{spendIP:get(form,'method')==='ip',reason:get(form,'reason')});ui.notifications.info('Contact/Network restored.');
 });}
 static async _generalModifiers(){return this._do(async()=>{
  const actor=this.actor(),sources=selected(actor).filter(s=>actor.items.get(s.value).type==='contact'),skills=[...actor.items].filter(i=>i.type==='skill');if(!sources.length)throw new Error('No Contact with generated General Request modifiers.');
  const form=await api.DialogV2.input({window:{title:'Spend General Request Modifiers'},content:`<label>Contact</label><select name="source">${options(sources)}</select><label>Skill</label><select name="skill">${options(skills.map(s=>({value:s.id,label:s.name})))}</select><label>Modifiers applied (up to +5 per check)</label><input type="number" min="1" max="5" name="count" value="1">`});if(!form)return;
  await useGeneralModifiers({actor,sourceId:get(form,'source'),skillId:get(form,'skill'),points:number(get(form,'count'),1,5,'Bonus')});ui.notifications.info('General modifiers spent.');
 });}
 static async _virtueIP(){return this._contactInfluence(true);}
 static async _flawIP(){return this._contactInfluence(false);}
 async _contactInfluence(virtue){return this._do(async()=>{
  const actor=this.actor(),sources=selected(actor).filter(s=>actor.items.get(s.value).type==='contact');if(!sources.length)throw new Error('No Contacts on this character.');
  const form=await api.DialogV2.input({window:{title:`Contact ${virtue?'Virtue':'Flaw'} → Influence`},content:`<label>Contact</label><select name="source">${options(sources)}</select><label><input type="checkbox" name="confirmed"> GM confirms that the character ${virtue?'demonstrated the Contact’s Virtue':'indulged the Contact’s Flaw'} in a significant scene</label><p>Core Ch.7: a Virtue can gain IP1; appealing to a Flaw can restore IP1 to the normal maximum. This is a narrative reward, not an automatic farming action.</p>`});if(!form)return;
  await contactVirtueFlaw(actor,get(form,'source'),{virtue,gmConfirmed:checked(form,'confirmed')});ui.notifications.info('Influence recorded.');
 });}
}

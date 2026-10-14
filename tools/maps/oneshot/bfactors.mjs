// Build the Butterfly Cut actor compendium (pregens + NPCs) with the system's own rules helpers.
// Usage: node bfactors.mjs SYSTEM_DIR PACKS_DIR  -> PACKS_DIR/oneshot-butterfly-pregens and PACKS_DIR/oneshot-butterfly-npcs
import {ClassicLevel} from 'classic-level';import fs from 'fs';import path from 'path';import crypto from 'crypto';
const [B,PACKS]=process.argv.slice(2);
const J=f=>JSON.parse(fs.readFileSync(path.join(B,'data',f),'utf8'));
const rules=await import(path.join(B,'module/rules-engine.mjs'));
const build=await import(path.join(B,'module/creator-build.mjs'));
const gm=await import(path.join(B,'module/gm-content.mjs'));
const traitFx=await import(path.join(B,'module/core-trait-effects.mjs'));
const data=J('oneshot-butterfly-cut.json'),skills=J('core-skills.json'),preset=J('archetype-skills.json'),ref=J('archetype-reference.json');
const traits=J('trait-catalog.json').traits,baggage=J('baggage-catalog.json').entries,catalog=J('item-catalog.json'),adv=J('adversary-catalog.json').records;
const SYS='altered-carbon-rpg',VERSION=JSON.parse(fs.readFileSync(path.join(B,'system.json'))).version;
const TOK=n=>`systems/${SYS}/assets/tokens/people/npc-${n.toLowerCase().split('').map(c=>/[a-z0-9]/.test(c)?c:'-').join('').replace(/^-+|-+$/g,'').replace(/--/g,'-')}.webp`;
const id=s=>crypto.createHash('sha1').update('butterfly:'+s).digest('hex').slice(0,16);
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const stats={coreVersion:'14.359',systemId:SYS,systemVersion:VERSION,createdTime:1792000000000,modifiedTime:1792000000000,lastModifiedBy:null};
const findTrait=([branch,name])=>traits.find(t=>norm(t.branch)===norm(branch)&&norm(t.name)===norm(name))||traits.find(t=>norm(t.name)===norm(name)&&(norm(t.branch).includes(norm(branch))||norm(branch).includes(norm(t.branch))));
const ARCH_EP={Civilian:4,Criminal:5,Soldier:6},ARCH_IP={Official:1,Socialite:2};
const CHOICES={
 PG01:{'ent-0-pistolsmallarmsqq':'WPN008','ent-2-pistolsmallarmsmagazine':'BCPD .357 speed-loaders (two)'},
 PG02:{'ent-1-deviceqq':'BCPD-issue ONI handset','ent-2-investigationtoolkit1qq':'BCPD forensic field kit (+1)','ent-3-pistolsmallarmsqq':'WPN011'},
 PG03:{'ent-2-scienceinvestigationtoolkit1':'Portable tox analyser (+1)'},
 PG04:{'ent-2-programsdriversqq':'BCPD intrusion suite with cracked Protectorate drivers'},
 PG05:{'ent-1-deviceqq':'Burner handset with forty numbers','ent-3-criminalorganizationorcorporatio':'criminal organization','ent-4-sleeveaugmentqqorless':'AUG008'},
 PG06:{'ent-0-directedenergyweaponq':'WPN020','ent-1-stealthsurvivaltoolkit1':'Lockpicks, bug sweeper and burner (+1)'},
 PG07:{'ent-2-deviceqq':'Gold-cased ONI handset','ent-4-drugqqq:1':'DRG003','ent-4-drugqqq:2':'DRG003'},
 PG08:{'ent-1-deviceqqq':'Broadcast camera rig with live uplink'}
};
const CREDENTIAL={PG05:['Confidential Informant Card','A BCPD confidential-informant card. Showing it to the wrong person ends your career, or your life.'],
 PG07:['Task Force Donor Pass','Civic donor credentials: access to the BCPD task force bullpen and its overtime budget.'],
 PG08:['BCPD Tip-Line Press Pass','A press pass for the BCPD tip-line partnership. Opens doors with cops, closes them with crews.']};
const docs=[],folders=[];
const folder=(name,sort)=>{const f={_id:id('folder:'+name),name,type:'Actor',folder:null,sorting:'a',sort,color:'#ff7fb0',flags:{},_stats:stats,description:''};folders.push(f);return f._id;};
const fPC=null,fNPC=null; // pregens and NPCs are separate compendiums, so no folders inside them
function actorDoc(base,items){const a={...base,items:[],effects:[],sort:base.sort||0,_stats:stats};const out=[];
 for(const [n,it] of items.entries()){const iid=id(base._id+':item:'+n+':'+it.name);a.items.push(iid);out.push({_id:iid,...it,effects:it.effects||[],folder:null,sort:n*100,ownership:{default:0},flags:it.flags||{},_stats:stats,img:it.img||undefined});}
 return {actor:a,items:out};}
const thread=t=>data.threads.find(x=>x.id===t);
const placeName=pid=>data.places.find(p=>p.id===pid)?.name||pid;

/* ------------------------------------------------------------------ pregens */
data.pregens.forEach((g,n)=>{
 const start=rules.ageResources(g.age,g.attrs);const ep=start.egoPoints+(ARCH_EP[g.archetype]||0);
 const pk=ref.archetypes[g.archetype].packages[g.package];
 const ents=build.packageEntitlements(g.archetype,g.package,ref,catalog.items);
 const compiled=build.compileStartingPackage(ents,CHOICES[g.id]||{},catalog);
 const ip=start.influencePoints+(ARCH_IP[g.archetype]||0)+compiled.influenceBonus;
 const sb=Math.floor(g.attrs.strength/10),health=9+sb;
 const tech=rules.SLEEVE_LIMITS[g.sleeve.type]?.techCapacity||0;
 const levels=new Map((preset.archetypes[g.archetype]||preset.archetypes.Civilian).map(x=>[x.id,x.level]));
 const items=[];
 items.push({name:`${g.name} — Current Sleeve`,type:'sleeve',img:TOK(g.name),system:{status:'active',sleeveType:g.sleeve.type,strength:g.attrs.strength,perception:g.attrs.perception,healthMax:health,damageThreshold:g.attrs.strength,techCapacity:tech,appearance:`<p>${esc(g.sleeve.concept)}</p>`,rulesRef:'Core Rulebook 2020, Chapter 2: Sleeves'},flags:{[SYS]:{oneshot:'butterfly-cut'}}});
 for(const sk of skills){const authored=g.skills[sk.name];const level=Math.max(levels.get(sk.id)||1,authored||0);
  items.push({name:sk.name,type:'skill',system:{catalogId:sk.id,attribute:sk.attribute,level,rulesRef:sk.rulesRef,rulesText:sk.rulesText||''},flags:{[SYS]:{oneshot:'butterfly-cut',authoredSpeciality:Boolean(authored&&authored>(levels.get(sk.id)||1))}}});}
 for(const spec of pk.traits||[]){const t=findTrait(spec);if(!t){console.warn('trait not found',g.id,spec);continue;}
  items.push({name:t.name,type:'trait',system:{catalogId:t.id,tree:t.tree,branch:t.branch,tier:t.tier,commonality:build.creatorCommonality(g.archetype,t.tree,g.age,'standard'),spCost:0,ruleElements:traitFx.serializedCoreTraitRules?traitFx.serializedCoreTraitRules(t.id):'',effect:t.effect,description:t.effect,rulesRef:t.rulesRef},flags:{[SYS]:{freeCreationTrait:true,oneshot:'butterfly-cut'}}});}
 g.baggage.forEach((bid,i)=>{const b=baggage.find(x=>x.id===bid);if(!b)return;
  items.push({name:`Life Event ${i+1} — ${b.name}`,type:'baggage',system:{catalogId:b.id,rollMin:b.min,rollMax:Number.isFinite(b.max)?b.max:999,appliesTo:b.sleeveOrStack?'Sleeve or Stack':'Narrative',description:b.effect,rulesRef:b.rulesRef},flags:{[SYS]:{lifeEvent:i+1,requiresGMReview:b.min>3,oneshot:'butterfly-cut'}}});});
 for(const it of compiled.items)items.push({...it,flags:{...(it.flags||{}),[SYS]:{...(it.flags?.[SYS]||{}),oneshot:'butterfly-cut',startingPackage:g.package}}});
 const [cname,cdesc]=CREDENTIAL[g.id]||['BCPD Task Force Credentials','Badge and warrant card for the BCPD Narcotics Task Force (Licktown). Valid until someone upstairs decides otherwise.'];
 items.push({name:cname,type:'equipment',system:{description:`<p>${esc(cdesc)}</p>`,quantity:1,rulesRef:'The Butterfly Cut'},flags:{[SYS]:{oneshot:'butterfly-cut'}}});
 const th=thread(g.thread);
 const bio=`<h2>${esc(g.rank?g.rank+' ':'')}${esc(g.name)}</h2><p><em>${esc(g.role)}</em> · ${esc(g.archetype)} / ${esc(g.package)} · age ${g.age}</p>
<h3>Your hook</h3><p>${esc(g.hook)}</p><h3>Your goal tonight</h3><p>${esc(g.goal)}</p>
<h3>Where you'd start</h3><ul>${g.leads.map(l=>`<li>${esc(placeName(l))}</li>`).join('')}</ul>
<h3>Your thread: ${esc(th.name)}</h3><p>${esc(th.question)}</p>
<h3>Your personal domino <small>(secret — yours to reveal)</small></h3><p>${esc(g.domino)}</p>`;
 const base={_id:id('pc:'+g.id),name:g.name,type:'character',folder:fPC,sort:(n+1)*1000,img:TOK(g.name),ownership:{default:0},
  prototypeToken:{name:g.name,displayName:30,actorLink:true,disposition:1,width:1,height:1,lockRotation:false,texture:{src:TOK(g.name),fit:'contain',scaleX:1,scaleY:1},bar1:{attribute:'resources.health'},bar2:{attribute:'resources.ego'},sight:{enabled:true}},
  system:{biography:bio,identity:{trueName:g.name,publicName:g.name,dhfAge:g.age,storageYears:0,archetype:g.archetype,variant:'standard',currentObjective:g.goal},
   attributes:{...g.attrs},resources:{health:{value:health,max:health},ego:{value:ep,max:ep},wounds:{value:0,max:g.attrs.strength},stackPoints:{value:start.stackPoints,max:start.stackPoints},influence:{value:ip,max:ip}},
   wealth:Number(ref.archetypes[g.archetype].wealth||1),stackState:'intact',sleeveState:'healthy',notes:`The Butterfly Cut pregen. Thread: ${th.name}.`},
  flags:{[SYS]:{oneshot:'butterfly-cut',pregenId:g.id,thread:g.thread,creation:{schema:1,mode:'pregen',archetype:g.archetype,variant:'standard',source:'The Butterfly Cut pregenerated character: Core Rulebook 2020 Chapter 2 starting rules (age resources, archetype skill table, package traits and gear), plus authored signature Skills.',creatorVersion:`altered-carbon-rpg-${VERSION}`}}}};
 docs.push(actorDoc(base,items));
});

/* ------------------------------------------------------------------ NPCs */
data.npcs.forEach((p,n)=>{
 const bio=`<h2>${esc(p.name)}</h2><p><em>${esc(p.role)}</em> · found at ${esc(placeName(p.place))}</p><p><strong>Look:</strong> ${esc(p.look)}</p><p><strong>Wants:</strong> ${esc(p.wants)}</p><p><strong>How they play:</strong> ${esc(p.tactic)}</p><p><strong>Secret (GM):</strong> ${esc(p.secret)}</p>`;
 const tok={name:p.name,displayName:20,actorLink:false,disposition:p.kind==='threat'?-1:0,width:1,height:1,lockRotation:false,texture:{src:TOK(p.name),fit:'contain',scaleX:1,scaleY:1},bar1:{attribute:'resources.health'},sight:{enabled:false}};
 const flags={[SYS]:{oneshot:'butterfly-cut',npcId:p.id,thread:p.thread,place:p.place}};
 if(p.kind==='threat'&&p.base){
  const entry=adv.find(a=>a.id===p.base);const built=gm.adversaryDocuments(entry,skills,{includeGear:true,canonicalItems:catalog.items});
  const a={...built.actor,_id:id('npc:'+p.id),name:p.name,folder:fNPC,sort:(n+1)*1000,img:TOK(p.name),ownership:{default:0},prototypeToken:tok};
  a.system={...a.system,identity:{...a.system.identity,publicName:p.name},tactics:`${p.tactic} ${a.system.tactics||''}`.trim(),notes:bio};
  a.flags={...(a.flags||{}),[SYS]:{...(a.flags?.[SYS]||{}),...flags[SYS]}};
  docs.push(actorDoc(a,built.items));
 }else{
  const a={_id:id('npc:'+p.id),name:p.name,type:'npc',folder:fNPC,sort:(n+1)*1000,img:TOK(p.name),ownership:{default:0},prototypeToken:tok,
   system:{biography:bio,identity:{trueName:p.name,publicName:p.name,dhfAge:0,storageYears:0,archetype:'NPC'},attributes:{strength:30,perception:35,empathy:35,willpower:35,acuity:35,intelligence:35},
    resources:{health:{value:10,max:10},ego:{value:20,max:20},wounds:{value:0,max:30},stackPoints:{value:0,max:0},influence:{value:0,max:0}},stackState:'intact',sleeveState:p.id==='NPC-HALLORAN'||p.id==='NPC-CASPIAN'||p.id==='NPC-MOTH'?'healthy':'healthy',
    secrets:{trueIdentity:p.name,actualAllegiance:'',presentedAllegiance:p.role,agenda:`<p>${esc(p.wants)}</p><p>${esc(p.secret)}</p>`,recognitionState:'unknown'},notes:p.tactic},flags};
  const items=skills.map(sk=>({name:sk.name,type:'skill',system:{catalogId:sk.id,attribute:sk.attribute,level:2,rulesRef:sk.rulesRef,rulesText:''},flags:{}}));
  docs.push(actorDoc(a,items));
 }
});

/* ------------------------------------------------------------------ write */
async function writePack(name,list){
 const PACK=path.join(PACKS,name);fs.rmSync(PACK,{recursive:true,force:true});
 const db=new ClassicLevel(PACK,{valueEncoding:'json'});const batch=db.batch();
 for(const {actor,items} of list){actor.flags[SYS].compendiumSource=name;batch.put(`!actors!${actor._id}`,actor);for(const it of items){const clean=JSON.parse(JSON.stringify(it));batch.put(`!actors.items!${actor._id}.${it._id}`,clean);}}
 await batch.write();await db.compactRange('\x00','\xff');await db.close();
 for(const f of fs.readdirSync(PACK))if(f==='LOCK'||f.startsWith('LOG'))fs.rmSync(path.join(PACK,f));
 console.log(name,list.length,'actors');
}
await writePack('oneshot-butterfly-pregens',docs.filter(d=>d.actor.flags?.[SYS]?.pregenId));
await writePack('oneshot-butterfly-npcs',docs.filter(d=>!d.actor.flags?.[SYS]?.pregenId));
console.log(docs.length,'actors,',docs.reduce((n,d)=>n+d.items.length,0),'items');
for(const {actor} of docs.slice(0,8))console.log(actor.name,'EP',actor.system.resources.ego.max,'IP',actor.system.resources.influence.max,'SP',actor.system.resources.stackPoints.max,'HP',actor.system.resources.health.max);

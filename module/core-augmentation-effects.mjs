/** 2020 Core Ch.6 pp.262-267: conservative, opt-in numeric effects for
 * official Sleeve Augments. Source IDs, not Item names, control the mapping.
 * Contextual manoeuvres deliberately require caller-supplied activation contexts.
 */
const effect=(key,value,when={},mode='add',label='Official sleeve augment')=>({key,mode,value,when,label});
const check=(skill,value,when={},mode='add')=>effect('check.gear',value,{skill,...when},mode);
const attr=(name,value)=>effect(`attribute.${name}`,value);
const protection=(value,damageType='')=>effect('armor.protection',value,damageType?{damageType}:{});
const damage=(value,when={})=>effect('damage.bonus',value,when);
const skillSet=(names,value,when={})=>names.map(n=>check(n,value,when));
const map={
 AUG002:[effect('damageThreshold.bonus',5,{installation:'full'}),effect('defense',1,{installation:'full'}),protection(3,'bludgeoning'),damage(1,{skill:'brawl',installation:['full','arm']}),effect('check.unarmedPenalty',0,{skill:'brawl',itemTag:'unarmed'},'min')],
 AUG003:[...skillSet(['brawl','athletics','melee-combat'],1),damage(2,{itemTag:['melee','unarmed']}),effect('check.unarmedPenalty',0,{skill:'brawl',itemTag:'unarmed'},'min')],
 AUG004:skillSet(['digital-networking','data-analysis','data-engineering'],2,{activity:'biojack-direct'}),
 AUG005:[protection(2),attr('empathy',-1)],
 AUG006:[attr('strength',15),attr('empathy',-1),damage(3,{skill:'brawl'}),effect('check.unarmedPenalty',0,{skill:'brawl',itemTag:'unarmed'},'min')],
 AUG007:[attr('strength',15),attr('perception',15),attr('empathy',-2),check('intimidation',1)],
 AUG008:[effect('check.gear',3,{skill:'stealth',activity:'conceal-small'})],
 AUG009:[effect('check.gear',1,{itemTag:'deck',activity:'data-coil'})],
 AUG010:skillSet(['composure','discipline'],2,{isSave:true,against:'dhf'}),
 AUG011:skillSet(['digital-networking','navigation','history'],2,{activity:'oni-netrunning'}),
 AUG012:[effect('damageThreshold.bonus',-2),effect('resource.health.max',-5),...skillSet(['expression','diplomacy'],2,{activity:'polymorph-identified'}),...skillSet(['expression','intimidation','stealth'],1,{activity:'polymorph-minor'})],
 AUG013:[effect('damageThreshold.bonus',-2),effect('resource.health.max',-5),...skillSet(['expression','intimidation','stealth'],1,{activity:'polymorph-minor'})],
 AUG014:[effect('damageThreshold.bonus',-3),effect('resource.health.max',-5),...skillSet(['stealth','expression','diplomacy'],4,{activity:'body-double'}),...skillSet(['expression','diplomacy'],3,{activity:'polymorph-advanced'})],
 AUG015:[effect('armor.protection',1),effect('damageThreshold.bonus',10)],
 AUG016:[attr('acuity',5),attr('intelligence',5)],
 AUG017:[attr('strength',5),attr('perception',5)],
 AUG018:[attr('empathy',5),attr('willpower',5)],
 AUG019:[protection(3,'poison'),...skillSet(['endurance','discipline'],2,{isSave:true,activity:'metabolize'})],
 AUG020:[attr('strength',10),attr('perception',10)],
 AUG021:[check('athletics',2,{isSave:true})],
 AUG022:[effect('speed.modifier',1)]
};
/** Full skeleton and localised versions cannot share every effect. */
export function augmentationRules(item){
 const s=item?.system||{},id=String(s.catalogId||'').toUpperCase();
 if(id==='AUG001'){
   const lv=Number(s.priceLevel||0);
   if(lv<1||lv>4)return [];
   const a=[...skillSet(lv>=4?['detect','search','throw','firearms','directed-energy-weapons']:['detect','search'],1,{activity:'optic-magnification'})];
   if(lv>=2)a.push(attr('perception',lv===2?10:lv===3?15:20));
   return a;
 }
 if(id==='AUG002'){
   const location=String(s.installation||'').toLowerCase();
   if(!['full','arm','leg','torso'].includes(location))return []; // explicit installation required
   if(location==='full')return map.AUG002;
   if(location==='arm')return [damage(1,{skill:'brawl',itemTag:'unarmed'}),effect('check.unarmedPenalty',0,{skill:'brawl',itemTag:'unarmed'},'min')];
   if(location==='leg')return [check('athletics',1,{specialisation:['jump','swim']}),damage(2,{skill:'brawl',activity:'kick'}),effect('check.unarmedPenalty',0,{skill:'brawl',itemTag:'unarmed'},'min')];
   return [effect('damageThreshold.bonus',2)];
 }
 return (map[id]||[]).filter(r=>!(id==='AUG007'&&r.key==='attribute.empathy'&&s.bestialPenaltyOverride===true));
}
export const AUGMENTED_IDS=Object.freeze(Array.from({length:22},(_,i)=>`AUG${String(i+1).padStart(3,'0')}`));
export function augmentImplementationCoverage(){return AUGMENTED_IDS.map(id=>({id,numeric: id==='AUG001'||id==='AUG002'||Boolean(map[id]?.length),requiresContext:['AUG001','AUG002','AUG004','AUG009','AUG010','AUG011','AUG012','AUG013','AUG014','AUG019','AUG021'].includes(id)}));}

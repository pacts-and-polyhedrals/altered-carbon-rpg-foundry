/** Core 2020 Ch.5: source-verified deterministic components only.
 * Complex triggered effects are represented in the printed Trait descriptions
 * and require explicit player/GM resolution, never implicit resource spending.
 * The contextual engine FAILS CLOSED unless the named situation is supplied.
 */
const catalogue={};
const effect=(key,value,when={},mode='add')=>({key,mode,value,when,label:'2020 Core Trait'});
const add=(id,...rules)=>{const key=`trait-${String(id).padStart(3,'0')}`;catalogue[key]=(catalogue[key]||[]).concat(rules.flat());};
const train=(skill,value,when={})=>effect('check.training',value,{skill,...when});
const gear=(skill,value,when={})=>effect('check.gear',value,{skill,...when});
const bonus=(n,when={})=>effect('check.extraBonusDice',n,when);
const damage=(n,when={})=>effect('damage.bonus',n,when);
const request=(key,n,when={})=>effect(`request.${key}`,n,when);
const wealth=n=>effect('resource.wealth.delta',n);
// Combat, weapons, Armor, Larceny and physical Skill branches.
add(31,train('melee-combat',1,{specialisation:'one-handed'}));
add(34,damage(1,{itemTag:'one-handed'}));
add(35,bonus(1,{itemTag:'melee'}));
add(36,train('melee-combat',1,{specialisation:'two-handed'}));
add(38,damage(2,{itemTag:'two-handed',activity:'mighty-strike'}));
add(40,bonus(1,{itemTag:'two-handed'}));
add(41,train('firearms',1,{specialisation:'pistol'}));
add(43,damage(2,{itemTag:'small-arms',range:'shared',activity:'focus-fire'}));
add(44,effect('weapon.efficiency',1,{itemTag:'small-arms'}));
add(45,bonus(1,{itemTag:'small-arms'}));
add(46,train('firearms',1,{specialisation:'long-gun'}));
add(47,train('firearms',1,{itemTag:'long-guns'}));
add(48,effect('weapon.efficiency',1,{itemTag:'long-guns'}));
add(49,damage(1,{itemTag:'long-guns'}));
add(50,bonus(1,{itemTag:'long-guns'}));
add(52,train('directed-energy-weapons',1));
add(53,effect('weapon.efficiency',1,{itemTag:['rail','directed-energy']}));
add(54,damage(2,{itemTag:'directed-energy',targetCount:1}));
add(55,bonus(1,{itemTag:['directed-energy','hybrid']}));
add(56,effect('check.unarmedPenalty',1,{skill:'brawl',itemTag:'unarmed'},'min'));
add(57,effect('check.unarmedPenalty',0,{skill:'brawl',itemTag:'unarmed'},'min'));
add(58,damage(2,{itemTag:'unarmed'}));
// Martial Arts Weapons' extra die must not stack with other Bonus Dice.
add(59,effect('check.nonStackingBonusDice',1,{itemTag:'martial-arts-weapon'}));
add(60,bonus(1,{itemTag:['unarmed','melee']}));
add(61,train('throw',1));
add(62,train('throw',2,{specialisation:'grenades'}));
add(63,train('throw',2,{specialisation:'knives'}));
// Rapid Throwing penalises the target's Dodge, not its owner. The target must
// resolve this as an opposed context; no beneficial modifier is applied here.
add(65,bonus(1,{itemTag:'thrown'}));
add(70,effect('armor.protection',1));
add(71,train('stealth',1,{activity:'pickpocket'}));
add(72,train('detect',1,{activity:'detect-security'}),train('search',1,{activity:'detect-security'}));
add(73,train('engineering',1,{activity:'hotwire'}),train('digital-networking',1,{activity:'hotwire'}));
add(74,train('engineering',1,{activity:'restraints'}),damage(2,{itemTag:'stun'}));
// Social and professional gains are NOT automatically added to persistent IP:
// permanent one-time rewards must be purchased/GM confirmed, preventing reload farming.
// Donor's access to unowned Professional Networks requires GM source selection; not treated as an automatic discount.
add(3,request('ipCostDelta',-1,{activity:'request-low'}));
add(16,request('modifier',2,{activity:'general-request'}));
add(23,train('expression',2,{environment:'public'}),effect('check.difficulty',1,{skill:'stealth',environment:'public'}));
add(30,request('ipCostDelta',-1,{against:'corporation'}));
add(81,train('intimidation',1,{activity:'threaten-violence'}));
add(82,wealth(1));
// These source Wealth guarantees apply as derived minimums, not repeated permanent bonuses.
for(const [id,level] of [[6,2],[7,2],[8,3],[9,3],[10,4],[76,2]])add(id,effect('resource.wealth.delta',level,{},'max'));
// Wealth obtained with advanced Celebrity/Professional/National ranks is derived,
// while one-time Influence and Credit rewards still require explicit GM confirmation.
for(const id of [20,25,30,120,125,130])add(id,wealth(1));
add(83,train('engineering',2,{activity:'thermal-demolition'}));
add(84,...['intimidation','expression','discipline'].map(s=>train(s,1,{activity:'interrogation'})));
add(85,train('firearms',2,{activity:'hitman-marked',targetAware:false}),train('firearms',1,{activity:'hitman-marked',targetAware:true}));
add(87,train('diplomacy',2,{specialisation:'criminal-organization'}));
add(89,train('bureaucracy',2,{against:'criminal-organization'}),train('diplomacy',2,{against:'criminal-organization'}));
add(90,...['intimidation','bureaucracy','culture'].map(s=>train(s,1)),request('modifier',1,{against:'criminal-organization'}));
add(91,train('stealth',2,{activity:'conceal-security'}));
add(92,request('levelDelta',-1,{activity:'saferoom'}));
add(93,...['read-person','survival','stealth'].map(s=>train(s,1,{activity:'tailing'})));
add(94,train('stealth',2,{activity:'disguise'}));
add(96,train('expression',2,{activity:'forge-physical'}),train('engineering',2,{activity:'forge-physical'}));
add(99,train('data-engineering',2,{activity:'forge-digital'}),train('digital-networking',2,{activity:'forge-digital'}));
add(107,...['composure','bureaucracy','culture'].map(s=>train(s,1,{isSave:true,against:'law-enforcement'})));
add(108,request('ipCostDelta',-1,{against:'law-enforcement',activity:'request-official'}));
add(109,train('investigation',2));
add(111,...['diplomacy','bureaucracy'].map(s=>train(s,1,{against:'law-enforcement'})));
add(122,train('diplomacy',2));
add(124,effect('check.training',1,{itemTag:['weapon','recon']}));
add(126,...['expression','culture','history'].map(s=>train(s,2,{environment:'urban',specialisation:'urban'})));
add(128,...['navigation','stealth'].map(s=>train(s,2,{environment:'urban'})));
add(131,effect('check.training',1,{attribute:['perception','acuity'],isSave:true}));
add(132,train('navigation',1,{itemTag:['recon','survival']}));
add(133,train('survival',2,{itemTag:['tool','survival']}));
add(134,train('investigation',1,{activity:'tracking'}),train('search',1,{activity:'tracking'}));
add(136,train('survival',1));
add(137,train('medicine',2,{environment:'wilderness'}));
add(138,train('survival',2,{activity:'shelter'}));
add(139,train('survival',2));
add(142,train('medicine',2,{activity:'stabilize'}));
add(144,train('medicine',2));
add(146,effect('check.training',1,{itemTag:'deck'}));
add(147,effect('check.training',1,{itemTag:'deck'}));
add(148,effect('check.training',1,{itemTag:'deck'}));
add(149,effect('check.training',2,{activity:'mask-oni',itemTag:'deck'}));
add(150,bonus(1,{itemTag:'deck'}));
add(151,effect('check.training',1,{itemTag:'medical'}));
add(152,effect('check.training',1,{itemTag:'medical',virtual:false}));
add(153,effect('check.training',1,{itemTag:'medical',virtual:true}));
add(154,effect('check.training',1,{itemTag:'medical'}));
add(155,bonus(1,{itemTag:'medical'}));
for(const t of [156,157,158,159])add(t,effect('check.training',1,{itemTag:'medical'}));
add(166,train('science',1),train('data-analysis',1));
add(167,effect('check.gear',1,{itemTag:'science-kit'}));
add(168,train('search',1,{activity:'forensics'}),train('investigation',1,{activity:'forensics'}));
add(169,train('science',1,{activity:'field-expertise'}),train('data-analysis',1,{activity:'field-expertise'}));
add(171,effect('check.training',2,{itemTag:'explosive'}));
add(172,damage(2,{itemTag:'explosive',targetType:['building','vehicle']}));
add(173,damage(2,{itemTag:'mine'}));
// PRAxis mastery: a tier owned adds +10 to its *cap*, not current Attributes.
for(let id=181;id<=235;id++){
 let attribute='acuity';
 if([186,187,188,189,190,206,207,208,209,210].includes(id))attribute='empathy';
 else if(id>=196&&id<=200)attribute='strength';
 else if(id>=201&&id<=205)attribute='perception';
 else if((id>=211&&id<=215)||(id>=226&&id<=230))attribute='intelligence';
 else if((id>=221&&id<=225)||(id>=231&&id<=235))attribute='willpower';
 add(id,effect(`attribute.${attribute}.cap`,10));
}
// Ego branch: each tier increases the ceiling by 10+WB (computed in Actor preparation);
// the higher save modifier REPLACES lower tiers, it does not add 1+2+3+4+5.
for(let id=236;id<=240;id++)add(id,effect('check.egoSave',id-235,{},'max'));
// v2.3: audited additions from the 79 previously unmapped Core Traits.
// These are narrowly typed effects. One-time Influence awards, permits,
// purchases and triggered costs remain GM-confirmed through adjudication cards.
add(2,wealth(-1)); // Benefactor: Wealth -1, IP1 is a one-time GM award.
add(19,wealth(-1)); // Major Donor: Wealth -1, conditional IP award is one-time.
add(24,wealth(1),effect('resource.wealth.cap',4,{},'min')); // Superstar max Lv.4.
// Thief enhances the *Training Value from specific owned prerequisite Traits*;
// it does not grant four unrelated bonuses in the absence of those Traits.
add(75,
 train('stealth',1,{activity:'pickpocket',hasTrait:'trait-071'}),
 train('detect',1,{activity:'detect-security',hasTrait:'trait-072'}),
 train('search',1,{activity:'detect-security',hasTrait:'trait-072'}),
 train('engineering',1,{activity:'hotwire',hasTrait:'trait-073'}),
 train('digital-networking',1,{activity:'hotwire',hasTrait:'trait-073'}),
 train('engineering',1,{activity:'abduction',hasTrait:'trait-074'}),
 effect('check.extraBonusDice',1,{itemTag:'larceny-tool',skill:['stealth','data-engineering','search'],activity:['thievery','pickpocket','hotwire']}));
add(113,wealth(1)); // Ranking Officer: ongoing Wealth increase.
add(140,effect('check.gear',2,{itemTag:'survival-tool'})); // Bushmaster kit +2.
add(176,effect('check.gear',1,{itemTag:'polymorph'})); // Morph Polymorph bonus.
// 127 Urban Underground requires GM verification of an urban Request context.
add(127,effect('request.bonusDieSteps',1,{environment:'urban'}));
// 141 Basic First Aid: applies only to Medicine first-aid wound removal
// without any injuries on the target. Clinical workflow uses this value.
add(141,effect('medical.woundsPerDegree',1,{activity:'first-aid',skill:'medicine',targetType:'uninjured'}));

// Remove template data errors: positive bonuses stored with negative values always apply
// as penalties, but Training Value stacking differs from Difficulty penalties. The
// roll adapter translates negative Training Values as Check difficulty where needed.
export const CORE_TRAIT_RULE_ELEMENTS=Object.freeze(Object.fromEntries(Object.entries(catalogue).map(([k,v])=>[k,Object.freeze(v)])));
export function serializedCoreTraitRules(id){return JSON.stringify(CORE_TRAIT_RULE_ELEMENTS[String(id)]||[]);}
export function hasCoreTraitRules(id){return Object.hasOwn(CORE_TRAIT_RULE_ELEMENTS,String(id));}
export const CORE_TRAIT_IMPLEMENTED_COUNT=Object.keys(CORE_TRAIT_RULE_ELEMENTS).length;

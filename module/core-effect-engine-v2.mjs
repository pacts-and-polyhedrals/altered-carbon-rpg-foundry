/** Canonical context normalisation for Gear, Skill and Trait executable modifiers.
 * No Foundry dependency. Keys correspond to authored 2020-Core conditions.
 */
export function slug(s=''){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
export function equipmentTags(item){
 if(!item)return [];
 const s=item.system||{},type=item.type;
 const fields=[item.name,s.specialisation,s.skill,s.damageType,s.specialRules,s.category].map(slug).join(' ');
 const out=new Set([type]);
 if(type==='weapon'){
  out.add('weapon');
  if(/pistol|small-arms|sidearm|revolver/.test(fields))out.add('small-arms');
  if(/long-gun|rifle|shotgun|sniper|carbine|submachine/.test(fields))out.add('long-guns');
  if(/directed-energy|energy-weapon|laser|beam/.test(fields))out.add('directed-energy');
  if(/rail/.test(fields))out.add('rail');
  if(/melee-combat|melee|sword|blade|club|baton|staff/.test(fields))out.add('melee');
  if(/two-handed|2-handed|2-handed|two-hand/.test(fields))out.add('two-handed');
  if(/one-handed|1-handed|one-hand/.test(fields))out.add('one-handed');
  if(/throw|grenade/.test(fields))out.add('thrown');
  if(/grenade|blast|explosive/.test(fields))out.add('explosive');
  if(/stun|subdual/.test(fields))out.add('stun');
 }
 if(/medic|bio-welder|autosurgeon|med-tech/.test(fields))out.add('medical');
 if(/deck|terminal|processor/.test(fields))out.add('deck');
 if(/science|laboratory/.test(fields))out.add('science-kit');
 if(/recon/.test(fields))out.add('recon');
 if(/survival/.test(fields))out.add('survival');
 if(/tool/.test(fields))out.add('tool');
 if(/survival/.test(fields)&&/tool/.test(fields))out.add('survival-tool');
 if(/polymorph/.test(fields))out.add('polymorph');
 if(/larceny|lockpick|pickpocket|security-tool|stealth-tool|theft-tool/.test(fields)){out.add('larceny-tool');out.add('tool');}
 return [...out];
}
/** Skill check uses proper specialisation keys rather than guessing a player's choice. */
export function specializationContext(actor,skill,selected=''){
 const norm=slug(selected),skillName=slug(skill?.name||skill);
 if(!norm)return {selected:'',known:false};
 const standalone=(actor?.items?.contents||[...(actor?.items||[])]).some(i=>i.type==='specialisation'&&slug(i.system?.skill)===skillName&&slug(i.name)===norm);
 const inline=(skill?.system?.specialisations||'').split(/[,;]/).map(slug).includes(norm);
 return {selected:norm,known:standalone||inline};
}

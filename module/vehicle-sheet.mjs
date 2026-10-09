import {resourceAdjustment,parseCrew,crewProfile,validateCrewAssignment,CREW_ROLES} from './vehicle-operations.mjs';
import {rollSkill} from './rolls.mjs';
const {api,sheets}=foundry.applications;
const esc=value=>foundry.utils.escapeHTML(String(value??''));
export class ACVehicleSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2){
 static DEFAULT_OPTIONS={classes:['altered-carbon','vehicle-sheet','actor-sheet'],position:{width:1000,height:780},form:{closeOnSubmit:false,submitOnChange:true},actions:{toggleVehicleEdit:this._toggleEdit,adjustStructure:this._adjustStructure,adjustFuel:this._adjustFuel,assignCrew:this._assignCrew,pilotCheck:this._pilotCheck,openItem:this._openItem,openCombatConsole:this._openCombatConsole}};
 static PARTS={main:{template:'systems/altered-carbon-rpg/templates/vehicle-sheet.hbs'}};
 _editMode=false;
 get canEdit(){return Boolean(game.user?.isGM||this.actor?.isOwner);}
 async _prepareContext(opts){const ctx=await super._prepareContext(opts),actor=this.actor,v=actor.system.vehicle;
  const crew=crewProfile(v,v.crewAssignments),actors=(game.actors?.contents||[]),roster=crew.assigned.map(entry=>({...entry,name:actors.find(a=>a.id===entry.actorId)?.name||'[Actor missing]'}));
  const items=(actor.items?.contents||[]).map(i=>({id:i.id,name:i.name,type:i.type,capacity:i.system.capacity,depletion:i.system.depletion}));
  return {...ctx,actor,v,canEdit:this.canEdit,editMode:this._editMode,crew,roster,items,hasItems:items.length>0,structurePct:v.structure.max?100*v.structure.value/v.structure.max:0,fuelPct:v.fuel.max?100*v.fuel.value/v.fuel.max:0};
 }
 async _onRender(ctx,opts){await super._onRender(ctx,opts);const editable=this._editMode&&this.canEdit;
  this.element?.querySelectorAll('input[name],textarea[name],select[name]').forEach(el=>{el.disabled=!editable;});
 }
 static async _toggleEdit(){if(!this.canEdit)return ui.notifications.warn('No permission to edit this vehicle.');if(this._editMode)await this.submit();this._editMode=!this._editMode;this.render({force:true});}
 async adjust(name){if(!this.canEdit)throw new Error('You cannot change this vehicle.');const v=this.actor.system.vehicle;
  const form=await api.DialogV2.input({window:{title:`${name==='fuel'?'Fuel':'Structure'} Adjustment — ${this.actor.name}`},content:`<label>Change (negative for loss, positive for recovery)</label><input type="number" name="delta" step="1" value="-1" aria-label="Whole number resource adjustment"><p>Current ${esc(v[name].value)} / ${esc(v[name].max)}. GM confirms repair, travel or damage costs before applying.</p>`});
  if(!form)return;const delta=Number(form instanceof FormData?form.get('delta'):form?.delta);const value=resourceAdjustment(v[name],delta);
  await this.actor.update({[`system.vehicle.${name}.value`]:value.after});ui.notifications.info(`${this.actor.name}: ${name} ${value.before} → ${value.after}`);this.render({force:true});}
 static async _adjustStructure(){try{await this.adjust('structure');}catch(e){ui.notifications.error(e.message);}}
 static async _adjustFuel(){try{await this.adjust('fuel');}catch(e){ui.notifications.error(e.message);}}
 static async _assignCrew(){if(!this.canEdit)return ui.notifications.warn('No permission to assign crew.');
  const v=this.actor.system.vehicle,actors=game.actors.contents.filter(a=>a.id!==this.actor.id&&a.type!=='vehicle');const assigned=parseCrew(v.crewAssignments);
  const roles=CREW_ROLES.map(role=>`<option value="${role}">${role}</option>`).join('');
  const rows=assigned.map(c=>`<li>${esc(actors.find(a=>a.id===c.actorId)?.name||c.actorId)} · ${esc(c.role)}</li>`).join('')||'<li>None assigned</li>';
  const options=actors.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('');
  const form=await api.DialogV2.input({window:{title:'Vehicle Crew Roster'},content:`<p>Current crew:</p><ul>${rows}</ul><p>Choose an Actor and role. A role can be updated by selecting the same Actor. Select Remove to unassign.</p><label>Actor</label><select name="actorId">${options}</select><label>Role</label><select name="role">${roles}<option value="remove">Remove Actor</option></select>`});if(!form)return;
  const val=k=>form instanceof FormData?form.get(k):form?.[k],actorId=String(val('actorId')||''),role=String(val('role')||'');
  if(!actorId||!actors.some(a=>a.id===actorId))return ui.notifications.warn('Choose a valid Actor.');
  const proposed=assigned.filter(x=>x.actorId!==actorId);if(role!=='remove')proposed.push({actorId,role});
  try{validateCrewAssignment(v,proposed,{actorIds:actors.map(a=>a.id)});await this.actor.update({'system.vehicle.crewAssignments':JSON.stringify(proposed)});this.render({force:true});}catch(error){ui.notifications.error(error.message);}
 }
 static async _pilotCheck(){const v=this.actor.system.vehicle,p=crewProfile(v,v.crewAssignments),assignment=p.assigned.find(x=>x.role==='pilot');
  if(!assignment)return ui.notifications.warn('Assign a pilot first.');const pilot=game.actors.get(assignment.actorId);if(!pilot)return ui.notifications.warn('Assigned pilot Actor is not available.');
  const skill=pilot.items.find(i=>i.type==='skill'&&i.name.toLowerCase()==='pilot');if(!skill)return ui.notifications.warn(`${pilot.name} needs a Pilot Skill record.`);
  if(!(game.user.isGM||pilot.isOwner))return ui.notifications.warn('You do not have permission to roll for the assigned pilot.');
  const form=await api.DialogV2.input({window:{title:`Pilot Check — ${pilot.name}`},content:`<label>GM-set Difficulty</label><input type="number" name="difficulty" value="0"><p>Vehicle Handling ${esc(v.handling)}. Select appropriate Pilot Specialisation in the pilot's sheet if required.</p>`});if(!form)return;
  const difficulty=Number(form instanceof FormData?form.get('difficulty'):form?.difficulty);if(!Number.isSafeInteger(difficulty)||Math.abs(difficulty)>30)return ui.notifications.error('Difficulty must be a whole number between -30 and 30.');
  try{await rollSkill(pilot,skill,{difficulty,contextLabel:`Pilot — ${this.actor.name}`,chat:true});}catch(error){ui.notifications.error(error.message);}
 }
 static async _openItem(event,target){this.actor.items.get(target.dataset.itemId)?.sheet?.render({force:true});}
 static _openCombatConsole(){game.alteredCarbon?.openCombatConsole?.();}
}

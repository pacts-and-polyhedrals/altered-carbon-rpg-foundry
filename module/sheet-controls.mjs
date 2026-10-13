/** Current counters are operational; base values and descriptors require Edit Sheet. */
import {egoResourceChange} from './drug-medical-virtual.mjs';
export const LIVE_SHEET_FIELDS=new Set(['system.resources.health.value','system.resources.wounds.value','system.resources.ego.value','system.resources.stackPoints.value','system.resources.influence.value','system.economy.deferral','system.economy.debt']);
export function sheetFieldEditable(path,{owner=false,editMode=false}={}){return Boolean(owner&&(editMode||LIVE_SHEET_FIELDS.has(path)));}
export function resourceUpdate(actor,key,value){
  if(!['health','wounds','ego','stackPoints','influence'].includes(key))throw new Error('Unknown resource.');
  const amount=Number(value);
  if(!Number.isInteger(amount)||amount<0)throw new Error('Enter a whole, non-negative current value.');
  const r=actor.system?.resources?.[key]||{};
  const maximum=key==='ego'?Math.max(0,Number(r.max||0)-Number(actor.system?.egoPermanentLoss||0)):Number(r.max||0);
  if(['health','ego'].includes(key)&&amount>maximum)throw new Error(`Current ${key} cannot exceed its available maximum (${maximum}).`);
  const update={[`system.resources.${key}.value`]:amount};
  if(key==='ego')update['system.egoState']=egoResourceChange({current:amount,maximum:r.max,permanentLoss:actor.system?.egoPermanentLoss}).egoState;
  if(key==='health')update['system.sleeveState']=amount===0?'dead':Number(actor.system?.resources?.wounds?.value||0)>=Number(actor.ac?.damageThreshold||r.max)?'dying':'healthy';
  if(key==='wounds'&&Number(actor.system?.resources?.health?.value||0)>0)update['system.sleeveState']=amount>=Number(actor.ac?.damageThreshold??actor.system?.resources?.wounds?.max??0)?'dying':'healthy';
  return update;
}

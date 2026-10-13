/** One condition identity across Items, token effects, and managed clinical aliases. */
export function conditionKey(value=''){
  const key=String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return key==='under-the-influence'?'under-influence':key;
}
export function conditionKeys(actor){
  const keys=new Set();
  for(const item of actor?.items||[])if(item.type==='condition'&&item.system?.active!==false)keys.add(conditionKey(item.system?.key||item.system?.catalogId||item.name));
  for(const effect of actor?.effects||[])if(!effect.disabled&&!effect.isSuppressed)for(const status of effect.statuses||[])keys.add(conditionKey(status));
  return keys;
}
export function conditionRows(actor){
  const rows=new Map();
  for(const item of actor?.items||[])if(item.type==='condition'&&item.system?.active!==false){
    const key=conditionKey(item.system?.key||item.system?.catalogId||item.name);
    const row=rows.get(key)||{key,name:item.name,description:item.system?.description||'',duration:item.system?.duration||'',itemIds:[],effectIds:[]};row.itemIds.push(item.id);rows.set(key,row);
  }
  for(const effect of actor?.effects||[])if(!effect.disabled&&!effect.isSuppressed){
    const statuses=[...(effect.statuses||[])];const key=conditionKey(statuses[0]||effect.name||effect.id);
    const row=rows.get(key)||{key,name:effect.name||key,description:effect.description||'',duration:'',itemIds:[],effectIds:[]};row.effectIds.push(effect.id);rows.set(key,row);
  }
  return [...rows.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
export async function removeCondition(actor,key){
  if(!globalThis.game?.user?.isGM&&!actor?.isOwner)throw new Error('Only this character’s owner or the GM can clear a condition.');
  key=conditionKey(key);const row=conditionRows(actor).find(r=>r.key===key);if(!row)return false;
  // Managed conditions must use the workflow that owns the underlying state.
  if(key==='virtual'&&actor.system?.virtualSession?.active){const {exitVirtual}=await import('./clinical-workflow.mjs');await exitVirtual(actor);}
  if(key==='under-influence'&&actor.items.some(i=>i.type==='drug'&&i.system?.active))throw new Error('Use Clinical → Metabolize / End Encounter to end the active drug effect.');
  if(row.itemIds.length)await actor.deleteEmbeddedDocuments('Item',row.itemIds.filter(id=>actor.items.get(id)));
  if(row.effectIds.length)await actor.deleteEmbeddedDocuments('ActiveEffect',row.effectIds);
  if(key==='stable'&&actor.system?.sleeveState==='stable')await actor.update({'system.sleeveState':'dying'});
  if(key==='debt')await actor.update({'system.economy.debt':false});
  if(key==='deferral')await actor.update({'system.economy.deferral':0});
  return true;
}

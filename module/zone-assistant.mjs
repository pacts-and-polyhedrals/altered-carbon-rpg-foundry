/** GM-authored zone graph; no assumption about physical canvas distance. */
import {getZoneGraph,rangeBetweenTokens,NS} from './combat-workflow.mjs';
import {zoneDistance} from './combat-equipment.mjs';
const API=foundry.applications.api;
const esc=s=>foundry.utils.escapeHTML(String(s??''));
const input=(form,key)=>form instanceof FormData?form.get(key):form?.[key];
export class ACZoneAssistant extends API.HandlebarsApplicationMixin(API.ApplicationV2){
 static DEFAULT_OPTIONS={id:'altered-carbon-zone-assistant',classes:['altered-carbon','ac-zone-assistant'],window:{title:'Altered Carbon — Zone Assistant'},position:{width:780,height:680},actions:{addZone:this._addZone,connect:this._connect,assign:this._assign,remove:this._remove,clearAssignment:this._clearAssignment}};
 static PARTS={main:{template:'systems/altered-carbon-rpg/templates/zone-assistant.hbs'}};
 async _prepareContext(o){const context=await super._prepareContext(o),scene=canvas?.scene;
   const zones=getZoneGraph(scene).zones,tokens=(scene?.tokens?.contents||[]).map(t=>({id:t.id,name:t.name,zone:t.getFlag(NS,'zone')||'',choices:zones.map(z=>({id:z.id,name:z.name,selected:z.id===t.getFlag(NS,'zone')}))}));
   let distance=null;const origin=canvas?.tokens?.controlled?.[0],target=[...game.user.targets][0];if(origin&&target)distance=rangeBetweenTokens(origin,target,scene);
   return {...context,scene:scene?.name||'',hasScene:Boolean(scene),zones:zones.map(z=>({...z,links:(z.adjacent||[]).map(id=>zones.find(n=>n.id===id)?.name||id).join(', ')})),tokens,distance,gm:game.user.isGM};
 }
 static async _addZone(){if(!game.user.isGM)return;const form=await API.DialogV2.input({window:{title:'Add a Zone'},content:'<div class="form-group"><label>Zone label</label><input type="text" name="name" maxlength="70" required placeholder="Lobby"></div>'});
   const name=String(input(form,'name')||'').trim();if(!name)return;
   const graph=getZoneGraph(),zones=graph.zones;if(zones.some(z=>z.name.toLowerCase()===name.toLowerCase()))return ui.notifications.warn('Zone name already exists.');
   zones.push({id:foundry.utils.randomID(),name,adjacent:[]});await canvas.scene.setFlag(NS,'zoneGraph',{zones});this.render({force:true});}
 static async _connect(){if(!game.user.isGM)return;const zones=getZoneGraph().zones;if(zones.length<2)return ui.notifications.warn('Create at least two Zones.');
   const choices=zones.map(z=>`<option value="${esc(z.id)}">${esc(z.name)}</option>`).join('');const form=await API.DialogV2.input({window:{title:'Connect adjacent Zones'},content:`<p>Connecting is bidirectional. Only adjacent Zones should be connected directly.</p><label>Zone A</label><select name="a">${choices}</select><label>Zone B</label><select name="b">${choices}</select><label><input name="disconnect" type="checkbox"> Disconnect instead</label>`});
   if(!form)return;const a=zones.find(z=>z.id===input(form,'a')),b=zones.find(z=>z.id===input(form,'b'));if(!a||!b||a===b)return ui.notifications.warn('Choose two different Zones.');
   const remove=input(form,'disconnect')==='on'||input(form,'disconnect')===true;for(const [x,y] of [[a,b],[b,a]])x.adjacent=remove?(x.adjacent||[]).filter(id=>id!==y.id):[...new Set([...(x.adjacent||[]),y.id])];
   await canvas.scene.setFlag(NS,'zoneGraph',{zones});this.render({force:true});}
 static async _assign(event,target){if(!game.user.isGM)return;const token=canvas.scene?.tokens.get(target.dataset.tokenId),select=this.element.querySelector(`[data-zone-assignment="${target.dataset.tokenId}"]`);if(!token||!select)return;
   const zone=select.value;if(zone&&!getZoneGraph().zones.some(z=>z.id===zone))return ui.notifications.warn('Unknown Zone.');await token.setFlag(NS,'zone',zone);this.render({force:true});}
 static async _clearAssignment(event,target){if(!game.user.isGM)return;const token=canvas.scene?.tokens.get(target.dataset.tokenId);if(token)await token.unsetFlag(NS,'zone');this.render({force:true});}
 static async _remove(event,target){if(!game.user.isGM)return;const id=target.dataset.zoneId;const confirmed=await API.DialogV2.confirm({window:{title:'Remove Zone'},content:'<p>Remove this Zone and disconnect it from all other Zones? Assigned tokens will become unassigned.</p>'});if(!confirmed)return;
   const graph=getZoneGraph();graph.zones=graph.zones.filter(z=>z.id!==id).map(z=>({...z,adjacent:(z.adjacent||[]).filter(x=>x!==id)}));
   for(const token of canvas.scene.tokens.contents)if(token.getFlag(NS,'zone')===id)await token.unsetFlag(NS,'zone');await canvas.scene.setFlag(NS,'zoneGraph',graph);this.render({force:true});}
}

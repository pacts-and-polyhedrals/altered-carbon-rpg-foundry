import * as Combat from './combat.mjs';
const NS='altered-carbon-rpg';
export class ACCombatConsole extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
 static DEFAULT_OPTIONS={id:'altered-carbon-combat-console',window:{title:'Altered Carbon — Combat Console'},position:{width:780,height:700},actions:{beginIntent:this._beginIntent,submit:this._submit,reveal:this._reveal,advance:this._advance,resolution:this._resolution,spendDie:this._spendDie,next:this._next}};
 static PARTS={main:{template:'systems/altered-carbon-rpg/templates/combat-console.hbs'}};
 async _prepareContext(options){const context=await super._prepareContext(options);const combat=game.combat;if(!combat)return{...context,combat:null};const st=combat.getFlag(NS,'state')||{};const combatants=combat.combatants.map(c=>{const s=c.getFlag(NS,'speed')||{};return{id:c.id,name:c.name,owned:game.user.isGM||c.actor?.isOwner,submitted:s.submitted||false,results:(s.results||[]).map((r,i)=>({index:i,result:r,spent:(s.spentIndexes||[]).includes(i),active:(s.revealedActiveIndexes||[]).includes(i)})),activeTotal:(s.revealedActiveIndexes||[]).reduce((n,i)=>n+Number(s.results?.[i]||0),0),isCurrent:st.activeCombatantId===c.id};});return{...context,combat,gm:game.user.isGM,state:st,combatants};}
 static async _beginIntent(){if(!game.combat)return ui.notifications.warn('Create/activate a Combat first.');await Combat.beginIntent(game.combat);await this.render({force:true});}
 static async _submit(event,target){const c=game.combat?.combatants.get(target.dataset.combatantId);if(!c)return;const indexes=[...this.element.querySelectorAll(`[data-speed-for="${c.id}"]:checked`)].map(x=>Number(x.value));try{await Combat.submitSpeedCommitment(c,indexes);ui.notifications.info('Active Speed Dice locked privately.');await this.render({force:true});}catch(e){ui.notifications.error(e.message);}}
 static async _reveal(){await Combat.revealCommitments(game.combat);await this.render({force:true});}
 static async _advance(){await Combat.advanceToCheck(game.combat);await this.render({force:true});}
 static async _resolution(){await Combat.setResolution(game.combat);await this.render({force:true});}
 static async _spendDie(event,target){const c=game.combat?.combatants.get(target.dataset.combatantId);await Combat.resolveActiveDice(game.combat,c,[Number(target.dataset.index)]);await this.render({force:true});}
 static async _next(){await Combat.nextResolution(game.combat);await this.render({force:true});}
}

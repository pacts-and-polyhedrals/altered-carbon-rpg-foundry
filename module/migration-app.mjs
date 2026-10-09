import {SCHEMA_VERSION,migrationPreview,applyWorldMigration} from './migrations.mjs';
const NS='altered-carbon-rpg';
const {api}=foundry.applications;
export function registerMigrationSettings(){game.settings.register(NS,'schemaVersion',{name:'Altered Carbon World Data Schema',scope:'world',config:false,type:Number,default:0});}
export class ACMigrationApp extends api.HandlebarsApplicationMixin(api.ApplicationV2){
 static DEFAULT_OPTIONS={id:'ac-migrations',classes:['altered-carbon','ac-migration-app'],window:{title:'Altered Carbon — World Data Migration'},position:{width:780,height:660},actions:{runMigration:this._runMigration,refreshPreview:this._refreshPreview}};
 static PARTS={main:{template:'systems/altered-carbon-rpg/templates/migration-app.hbs'}};
 _busy=false;_lastResult=null;
 async _prepareContext(options){const c=await super._prepareContext(options);if(!game.user.isGM)throw new Error('GM only.');const preview=migrationPreview(game.actors.contents,game.items.contents);
 return {...c,version:SCHEMA_VERSION,current:game.settings.get(NS,'schemaVersion'),count:preview.entries.length,canApply:preview.entries.length>0||Number(game.settings.get(NS,'schemaVersion')||0)<SCHEMA_VERSION,actors:preview.actors,items:preview.items,fields:preview.changedFields,busy:this._busy,result:this._lastResult,
  examples:preview.entries.slice(0,25).map(e=>({name:e.document.name,kind:e.kind,scope:e.scope,reasons:e.reasons.filter(x=>x!=='Record versioned migration marker').join('; ')||'Version stamp only'}))};}
 static async _refreshPreview(){await this.render({force:true});}
 static async _runMigration(){if(this._busy||!game.user.isGM)return;
  const confirm=await api.DialogV2.confirm({window:{title:'Confirm non-destructive migration'},content:'<p>Back up or duplicate your Foundry world before continuing. This process adds compatibility fields and version flags to existing documents. It does not delete or replace Actors or Items, but all world changes should be backed up before a major version upgrade.</p><p>Continue with the migration?</p>'});
  if(!confirm)return;this._busy=true;await this.render({force:true});
  try{const result=await applyWorldMigration({gameInstance:game});this._lastResult=result;
   if(result.completed)ui.notifications.info(`Altered Carbon: migrated ${result.migrated} documents. Schema v${result.version}.`);
   else ui.notifications.error(`Migration partial: ${result.failures.length} failures. Retry is safe; see results.`);
  }catch(error){this._lastResult={completed:false,failures:[{name:'Migration',error:error.message}]};ui.notifications.error(error.message);}
  finally{this._busy=false;await this.render({force:true});}
 }
}

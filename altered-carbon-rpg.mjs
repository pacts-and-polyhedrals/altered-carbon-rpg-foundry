import * as Models from './module/data-models.mjs';
import {AlteredCarbonActor,AlteredCarbonItem} from './module/documents.mjs';
import {ACActorSheet,ACItemSheet} from './module/sheets.mjs';
import * as Rules from './module/rules-engine.mjs';
import * as Combat from './module/combat.mjs';
import {ACCombatConsole} from './module/combat-app.mjs';
import {ACCharacterCreator} from './module/character-creator.mjs';
import {ACRulesBrowser} from './module/rules-browser.mjs';
import * as Opposed from './module/opposed.mjs';
import * as ChatActions from './module/chat-actions.mjs';

Hooks.once('init',()=>{
  console.log('Altered Carbon RPG | Initializing v1.1.0');
  CONFIG.Actor.documentClass=AlteredCarbonActor;CONFIG.Item.documentClass=AlteredCarbonItem;
  Object.assign(CONFIG.Actor.dataModels,{character:Models.CharacterModel,npc:Models.NPCModel,threat:Models.ThreatModel,ai:Models.AIModel,vehicle:Models.VehicleModel});
  Object.assign(CONFIG.Item.dataModels,{sleeve:Models.SleeveModel,archivedSleeve:Models.ArchivedSleeveModel,skill:Models.SkillModel,trait:Models.TraitModel,specialisation:Models.SpecialisationModel,weapon:Models.WeaponModel,armour:Models.ArmourModel,equipment:Models.EquipmentModel,augmentation:Models.AugmentationModel,baggage:Models.BaggageModel,condition:Models.ConditionModel,injury:Models.InjuryModel,scandal:Models.ScandalModel,network:Models.NetworkModel,resourceEntry:Models.ResourceEntryModel,relationship:Models.RelationshipModel,clue:Models.ClueModel,memory:Models.MemoryModel,creditSet:Models.CreditSetModel,software:Models.SoftwareModel,virtualConstruct:Models.VirtualConstructModel});
  CONFIG.Actor.trackableAttributes={character:{bar:['resources.health','resources.ego','resources.wounds'],value:['resources.stackPoints.value','resources.influence.value']},npc:{bar:['resources.health','resources.ego'],value:[]},threat:{bar:['resources.health','resources.ego'],value:[]},vehicle:{bar:['vehicle.structure','vehicle.fuel'],value:[]}};
  const DSC=foundry.applications.apps.DocumentSheetConfig;
  DSC.registerSheet(foundry.documents.Actor,game.system.id,ACActorSheet,{makeDefault:true});DSC.registerSheet(foundry.documents.Item,game.system.id,ACItemSheet,{makeDefault:true});
  if(!Handlebars.helpers.json)Handlebars.registerHelper('json',value=>JSON.stringify(value,null,2));
  game.settings.registerMenu(game.system.id,'characterCreator',{name:'AC Character Creator',label:'Create Character',hint:'2020 character creation: archetype, package, sleeve, Health, age resources, Skills and Baggage.',icon:'fa-solid fa-user-plus',type:ACCharacterCreator,restricted:false});
  game.settings.registerMenu(game.system.id,'rulesBrowser',{name:'AC 2020 Rules Reference',label:'Open Rules Reference',hint:'Browse structured mechanics, Skills, Traits, Baggage, conditions, gear rules, Requests, Virtual and vehicles from the supplied 2020 Core Rulebook.',icon:'fa-solid fa-book',type:ACRulesBrowser,restricted:false});
  game.alteredCarbon={Rules,Combat,Opposed,ChatActions,version:'1.1.0',openCombatConsole:()=>new ACCombatConsole().render({force:true}),openCharacterCreator:()=>new ACCharacterCreator().render({force:true}),openRules:actor=>new ACRulesBrowser({actorId:actor?.id}).render({force:true})};
  Opposed.installOpposedHooks();
  ChatActions.installChatActionHooks();
});
Hooks.once('ready',()=>{Combat.installSocket();console.log('Altered Carbon RPG | Ready');});

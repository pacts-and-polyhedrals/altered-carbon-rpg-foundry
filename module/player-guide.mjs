/** Public, spoiler-free sheet journal. Preserve all unflagged campaign notes. */
const NS='altered-carbon-rpg';
export const PLAYER_GUIDE_VERSION='2.5.1';
export async function buildPlayerGuide(){
  const response=await fetch(`systems/${NS}/data/player-sheet-guide.json`);if(!response.ok)throw new Error('Player sheet guide could not be loaded.');
  const data=await response.json();
  return {name:data.title,ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER},flags:{[NS]:{playerSheetGuide:true,guideVersion:PLAYER_GUIDE_VERSION}},pages:data.pages.map((p,index)=>({name:p.name,type:'text',sort:(index+1)*100000,text:{format:1,content:p.content},flags:{[NS]:{playerSheetGuidePage:true}}}))};
}
let updating=null;
async function updatePlayerGuide({refresh=false,open=false}={}){
  let journal=game.journal.find(j=>j.getFlag(NS,'playerSheetGuide'));
  if(game.user.isGM){
    const data=await buildPlayerGuide();
    if(!journal)journal=await foundry.documents.JournalEntry.implementation.create(data);
    else if(refresh||journal.getFlag(NS,'guideVersion')!==PLAYER_GUIDE_VERSION){
      const generated=[...journal.pages].filter(p=>p.getFlag(NS,'playerSheetGuidePage')).map(p=>p.id);
      if(generated.length)await journal.deleteEmbeddedDocuments('JournalEntryPage',generated);
      await journal.createEmbeddedDocuments('JournalEntryPage',data.pages);
      await journal.update({name:data.name,[`flags.${NS}.guideVersion`]:PLAYER_GUIDE_VERSION});
    }
  }
  if(!journal){ui.notifications.warn('The GM creates the player guide when the updated world opens.');return null;}
  if(open)await journal.sheet.render({force:true});
  return journal;
}
export async function ensurePlayerGuide(options={}){
  if(updating){const journal=await updating;if(options.open&&journal)await journal.sheet.render({force:true});return journal;}
  updating=updatePlayerGuide(options);try{return await updating;}finally{updating=null;}
}

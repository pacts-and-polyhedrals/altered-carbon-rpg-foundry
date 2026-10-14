// PC vision (v2.7.2): every player character (and AI character) has token vision switched on,
// on the Actor's prototype token and on every token of it already placed on a scene.
// New characters get it when created; existing worlds are fixed once by the GM on load.
const NS='altered-carbon-rpg';
export const PC_TYPES=Object.freeze(['character','ai']);
/** Pure: the prototype-token changes a new PC needs (vision on, linked, friendly unless set). */
export function pcTokenDefaults(data={}){
  const t=data.prototypeToken||{};const u={'prototypeToken.sight.enabled':true};
  if(t.actorLink===undefined)u['prototypeToken.actorLink']=true;
  if(t.disposition===undefined)u['prototypeToken.disposition']=1;
  return u;
}
/** Pure: does this actor/token data still have vision off? */
export const visionOff=tokenData=>tokenData?.sight?.enabled!==true;
export async function enablePCVision({notify=false}={}){
  if(!game.user?.isGM)return {actors:0,tokens:0};
  const actors=game.actors.filter(a=>PC_TYPES.includes(a.type)&&visionOff(a.prototypeToken));
  if(actors.length)await Actor.updateDocuments(actors.map(a=>({_id:a.id,'prototypeToken.sight.enabled':true})));
  let tokens=0;
  for(const scene of game.scenes){
    const ups=scene.tokens.filter(t=>PC_TYPES.includes(t.actor?.type)&&visionOff(t)).map(t=>({_id:t.id,'sight.enabled':true}));
    if(ups.length){await scene.updateEmbeddedDocuments('Token',ups);tokens+=ups.length;}
  }
  if(notify||actors.length||tokens)console.log(`Altered Carbon | vision switched on for ${actors.length} PC actor(s) and ${tokens} placed token(s)`);
  return {actors:actors.length,tokens};
}
export function installPCVision(){
  Hooks.on('preCreateActor',(doc,data)=>{try{if(PC_TYPES.includes(data.type??doc.type))doc.updateSource(pcTokenDefaults(data));}catch(error){console.warn('Altered Carbon | PC vision',error);}});
  // A PC token dropped from an Actor whose prototype predates this fix still gets vision.
  Hooks.on('preCreateToken',(doc,data)=>{try{if(PC_TYPES.includes(doc.actor?.type)&&visionOff(data))doc.updateSource({'sight.enabled':true});}catch(_e){}});
  Hooks.once('ready',()=>{const leader=game.users.activeGM??null;if(game.user.isGM&&(!leader||leader.id===game.user.id))enablePCVision().catch(error=>console.warn('Altered Carbon | PC vision',error));});
}

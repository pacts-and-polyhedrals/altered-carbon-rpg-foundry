/** Actor creation belongs in the Actors sidebar (including its popout). */
let installed=false;
export function canCreateCharacters(){return Boolean(game.user?.isGM||game.user?.can?.('ACTOR_CREATE'));}
export function addCharacterCreatorButton(app,html){
  const root=html?.querySelector?html:html?.[0]??app?.element;
  if(!root?.querySelector||root.querySelector('[data-ac-character-creator]'))return;
  if(!canCreateCharacters())return;
  const doc=root.ownerDocument??document;
  const button=doc.createElement('button');
  button.type='button';button.className='ac-directory-creator';button.dataset.acCharacterCreator='true';
  button.title='Create a new Altered Carbon character. Advance existing characters from their Level Up button.';
  button.innerHTML='<i class="fa-solid fa-user-plus" aria-hidden="true"></i> Character Creator';
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();game.alteredCarbon.openCharacterCreator();});
  const footer=root.querySelector('.directory-footer');
  const header=root.querySelector('.directory-header');
  if(footer)footer.append(button);else if(header)header.append(button);else root.prepend(button);
}
export function isActorDirectory(app){
  const Directory=foundry.applications.sidebar?.tabs?.ActorDirectory;
  return Boolean((Directory&&app instanceof Directory)||app?.tabName==='actors'||app?.constructor?.tabName==='actors');
}
export function installCharacterDirectoryHooks(){
  if(installed)return;installed=true;
  Hooks.on('renderActorDirectory',addCharacterCreatorButton);
  // Public generic hook also handles subclasses and detached v14 sidebars.
  Hooks.on('renderApplicationV2',(app,html)=>{if(isActorDirectory(app))addCharacterCreatorButton(app,html);});
}

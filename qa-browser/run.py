import json, time
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).resolve().parent;results=[]
(out/'screenshots').mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1360,'height':980},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 import re
 repo=out.parent
 root=out
 sources={str(p.relative_to(root)):p.read_text() for p in root.glob('*.mjs')}
 sources.update({'systems/altered-carbon-rpg/'+str(p.relative_to(repo)):p.read_text() for p in repo.rglob('*.mjs') if 'dist' not in p.parts})
 assets={'systems/altered-carbon-rpg/'+str(p.relative_to(repo)):p.read_text() for folder in ['data','templates'] for p in (repo/folder).rglob('*') if p.is_file()}
 html=(root/'index.html').read_text()
 html=re.sub(r'<link[^>]+href="([^"]+)"[^>]*>',lambda m:'<style>'+(repo/m[1].removeprefix('systems/altered-carbon-rpg/')).read_text()+'</style>',html)
 html=re.sub(r'<script[^>]*>[\s\S]*?</script>','',html)
 page.set_content(html)
 page.evaluate(r"""async ({sources,assets})=>{
   window.fetch=async p=>{const value=assets[String(p).replace(/^\//,'')];return{ok:value!==undefined,status:value===undefined?404:200,text:async()=>value,json:async()=>JSON.parse(value)};};
   const cache=new Map();
   function resolve(base,path){const parts=(base.substring(0,base.lastIndexOf('/')+1)+path).split('/'),out=[];for(const p of parts){if(p==='..')out.pop();else if(p!=='.'&&p!=='')out.push(p);}return out.join('/');}
   function build(path){if(cache.has(path))return cache.get(path);let src=sources[path];if(!src)throw Error('Missing module '+path);src=src.replace(/((?:from\s*|import\s*\()\s*['"])([^'"]+)(['"])/g,(all,a,dep,b)=>a+build(resolve(path,dep))+b);const url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));cache.set(path,url);return url;}
   await import(build('harness.mjs'));
 }""",{'sources':sources,'assets':assets})
 try:page.wait_for_function('window.ready===true',timeout=5000)
 except Exception:
  print('INITIAL ERRORS',errors);print(page.locator('body').inner_text()[:2000]);raise
 def record(name,ok):
  assert ok,name;results.append(name)
 record('Sidebar hook excludes actor sheets, includes Actors directory and is idempotent',page.evaluate('checkDirectoryHooks()'))
 record('All 32 skills have Roll on their collapsed summary',page.locator('summary [data-action="rollSkill"]').count()==32)
 record('Character Creator is absent from the sheet',page.locator('#app').get_by_text('Character Creator',exact=True).count()==0)
 record('Level Up is available on the sheet',page.locator('#app [data-action="openAdvancement"]').count()==1)
 page.screenshot(path=str(out/'screenshots/01-skill-rolls.png'))
 page.locator('summary [data-action="rollSkill"]').first.click();page.wait_for_timeout(100)
 record('Roll opens its existing options dialog with description still collapsed',page.evaluate('results.dialogs.length===1 && document.querySelector("summary [data-action=rollSkill]").closest("details").open===false'))
 record('Cancelled skill dialog does not post a roll',page.evaluate('results.messages.length===0'))
 page.evaluate('window.dialogInput={difficulty:0};');page.locator('summary [data-action="rollSkill"]').first.click();page.wait_for_timeout(100)
 record('Confirmed direct Roll posts a skill check',page.evaluate('results.messages.length===1'))
 page.evaluate("show('advancement','skills')")
 page.locator('[data-action="buySkill"]').first.click();page.wait_for_timeout(100)
 record('Cancelled advancement preserves SP and skill',page.evaluate('actor.system.resources.stackPoints.value===200 && actor.items[0].system.level===1'))
 page.evaluate('window.acceptConfirm=true');page.locator('[data-action="buySkill"]').first.click();page.wait_for_timeout(150)
 record('Confirmed advancement spends SP and records history without resetting health',page.evaluate('actor.system.resources.stackPoints.value===180 && actor.system.resources.health.value===7 && actor.flags["altered-carbon-rpg"].advancementHistory.length===1'))
 page.screenshot(path=str(out/'screenshots/02-level-up-skills.png'))
 page.evaluate("show('advancement','attributes')");page.screenshot(path=str(out/'screenshots/03-level-up-attributes.png'))
 page.evaluate("show('advancement','traits')");page.locator('[name="traitSearch"]').fill('nonexistent-trait-name');record('Trait filter hides nonmatching rows',page.locator('[data-trait-search]:visible').count()==0)
 page.locator('[name="traitSearch"]').fill('');page.screenshot(path=str(out/'screenshots/04-level-up-traits.png'))
 page.evaluate("show('advancement','specialisations')");page.screenshot(path=str(out/'screenshots/05-level-up-specialisations.png'))
 page.evaluate("show('advancement','history')");record('History shows confirmed spend', '20 SP' in page.locator('#app').inner_text())
 page.evaluate("show('creator')");page.screenshot(path=str(out/'screenshots/06-creator-level-up.png'))
 record('Creator renders exactly eight stages and shows Level Up step',page.locator('[data-wizard-step]').count()==8 and page.locator('[data-wizard-step="6"]').is_visible())
 page.locator('[data-action="queueSkill"]').click();page.wait_for_timeout(100)
 record('Creator prevents unaffordable starting Skill upgrade',page.evaluate('current._creationRequests.length===0'))
 page.locator('[data-action="queueAttribute"]').click();page.wait_for_timeout(100)
 record('Starting SP queue plans one real purchase without rolling',page.evaluate('current._creationRequests.length===1 && current._creationQuote().total===1'))
 page.screenshot(path=str(out/'screenshots/06-creator-level-up.png'))
 page.locator('[data-action="clearQueued"]').click();record('Starting SP plan can be cleared without creating an Actor',page.evaluate('current._creationRequests.length===0 && game.actors.length===1'))
 page.evaluate("show('book')");page.screenshot(path=str(out/'screenshots/07-book-console.png'))
 record('GM book console renders all 30 chapters',page.locator('[data-action="open"][data-source^="G"]').count()==30)
 record('No uncaught browser exceptions',not errors)
 browser.close()
(out/'browser-results.json').write_text(json.dumps({'environment':'Chromium, mock Foundry APIs, QA-only subset template renderer; NOT live Foundry or full Handlebars','passed':len(results),'checks':results,'errors':errors},indent=2))
print(json.dumps({'passed':len(results),'checks':results},indent=2))

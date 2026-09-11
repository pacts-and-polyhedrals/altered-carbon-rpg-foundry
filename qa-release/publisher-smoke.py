from pathlib import Path
import tempfile, shutil, subprocess, os, json
src=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='ac-release-smoke-') as td:
 r=Path(td)/'repo'; shutil.copytree(src,r)
 for args in [['git','init','-q'],['git','config','user.name','Offline Test'],['git','config','user.email','test@example.invalid'],['git','add','.'],['git','commit','-qm','Offline release test']]:
  subprocess.run(args,cwd=r,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=r,text=True).strip()
 fakebin=Path(td)/'bin';fakebin.mkdir()
 gh=fakebin/'gh'
 gh.write_text('''#!/usr/bin/env python3
import os,sys,json
from pathlib import Path
args=sys.argv[1:];cfg=json.loads(Path(os.environ['SMOKE_STATE']).read_text())
with open(os.environ['SMOKE_LOG'],'a') as f: f.write(json.dumps(args)+'\\n')
if args[:2]==['repo','view']: print(cfg.get('visibility','PUBLIC'));sys.exit(0)
if args[0]=='api':
 for row in cfg.get('history',[]): print('\\t'.join(str(x).lower() if isinstance(x,bool) else x for x in row))
 sys.exit(0)
if args[:2]==['release','view']:
 if not cfg.get('draft'): sys.exit(1)
 print('true' if '--jq' in args else '{"isDraft":true}');sys.exit(0)
if args[:2]==['release','create']:
 cfg['draft']=True;Path(os.environ['SMOKE_STATE']).write_text(json.dumps(cfg));sys.exit(0)
if args[:2]==['release','upload']:
 if cfg.get('upload_fail'): sys.exit(2)
 sys.exit(0)
if args[:2]==['release','edit']: sys.exit(0)
raise SystemExit('Unexpected fake GH invocation: '+repr(args))
''');gh.chmod(0o755)
 fetch=Path(td)/'mock-fetch.mjs'
 fetch.write_text('''import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('dist/system.json','utf8'));
globalThis.fetch=async url=>{
 if(url===manifest.manifest)return {ok:true,json:async()=>manifest};
 if(url===manifest.download)return {ok:true,headers:new Headers(),arrayBuffer:async()=>fs.readFileSync(`dist/altered-carbon-rpg-v${manifest.version}.zip`)};
 throw new Error('Unexpected network request blocked by offline smoke test: '+url);
};
''')
 outcomes=[]
 cases=[
 ('successful publication sequence',{},0,None),
 ('private repo blocked',{'visibility':'PRIVATE'},1,'cannot install private'),
 ('older version not promoted',{'history':[['v1.5.0',False,False]]},1,'Refusing to mark an older'),
 ('published version not overwritten',{'history':[['v1.4.2',False,False]]},1,'already published'),
 ('failed upload never publishes',{'upload_fail':True},2,None),
 ('mismatched pushed tag blocked',{},1,'Tag and manifest do not match')
 ]
 for name,cfg,expected,text in cases:
  state=Path(td)/'state.json';state.write_text(json.dumps(cfg))
  log=Path(td)/'gh.log';log.write_text('')
  env={**os.environ,'PATH':str(fakebin)+':'+os.environ['PATH'],'SMOKE_STATE':str(state),'SMOKE_LOG':str(log),'GITHUB_REPOSITORY':'pacts-and-polyhedrals/altered-carbon-rpg-foundry','GITHUB_SHA':sha,'NODE_OPTIONS':'--import='+str(fetch)}
  env.pop('GITHUB_REF_TYPE',None);env.pop('GITHUB_REF_NAME',None);env.pop('GITHUB_STEP_SUMMARY',None)
  if name=='mismatched pushed tag blocked':env.update(GITHUB_REF_TYPE='tag',GITHUB_REF_NAME='v1.4.0')
  proc=subprocess.run(['bash','scripts/publish-release.sh'],cwd=r,env=env,capture_output=True,text=True)
  assert proc.returncode==expected,(name,proc.returncode,proc.stdout,proc.stderr)
  if text:assert text in proc.stdout+proc.stderr,(name,proc.stderr)
  calls=[json.loads(line) for line in log.read_text().splitlines()]
  writes=[args[1] for args in calls if args[0]=='release' and args[1] in ['create','upload','edit']]
  if name=='successful publication sequence':
   assert writes==['create','upload','edit'],writes
   assert 'PUBLIC RELEASE VERIFIED' in proc.stdout
  elif name=='failed upload never publishes':assert writes==['create','upload'],writes
  else:assert writes==[],(name,writes)
  outcomes.append({'case':name,'passed':True,'release_writes':writes})
 report={'mode':'offline simulated gh and HTTP; no real API calls or publication','checks':outcomes}
 (src/'qa-release'/'publisher-smoke-results.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2))

/** Real local HTTP, real JSON and ZIP bytes. NOT a Foundry/Forge or public-host test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {releaseConfig} from '../../scripts/release-config.mjs';
import {verifyPublished} from '../../scripts/verify-published.mjs';
const manifest=JSON.parse(fs.readFileSync('system.json','utf8'));
const config=releaseConfig('pacts-and-polyhedrals/altered-carbon-rpg-foundry',manifest.version);

async function exercise(overrides={}) {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ac-chain-'));
  let server;
  try {
    const zip=path.join(tmp,'release.zip');
    execFileSync('python3',['scripts/build-runtime.py',zip],{encoding:'utf8'});
    const archive=fs.readFileSync(zip);
    const routes=new Map([
      [config.manifest,{content:JSON.stringify(manifest),type:'application/json'}],
      [config.releaseManifest,{content:JSON.stringify(manifest),type:'application/json'}],
      [config.legacyManifest,{content:JSON.stringify(manifest),type:'application/json'}],
      [config.download,{content:archive,type:'application/zip'}]
    ]);
    for(const [key,value] of Object.entries(overrides)) routes.set(config[key],value);
    server=http.createServer((request,response)=>{
      const route=routes.get(new URL(request.url,'http://localhost').searchParams.get('url'));
      response.statusCode=route?.status||200;
      response.setHeader('Content-Type',route?.type||'text/plain');
      response.end(route?.content||'Not available');
    });
    server.listen(0,'127.0.0.1'); await once(server,'listening');
    const local=`http://127.0.0.1:${server.address().port}`;
    return await verifyPublished({manifest,archive,fetchImpl:(url,options)=>fetch(`${local}/?url=${encodeURIComponent(url)}`,options)});
  } finally {
    if(server){server.closeAllConnections(); await new Promise(resolve=>server.close(resolve));}
    fs.rmSync(tmp,{recursive:true,force:true});
  }
}
test('local HTTP chain verifies original manifest, both bridges, and real runtime ZIP',async()=>{
  const result=await exercise();
  assert.equal(result.version,manifest.version);
  assert.equal(result.checkedManifests.length,3);
});
test('local HTTP chain catches stale main despite current release assets',async()=>{
  await assert.rejects(()=>exercise({manifest:{content:JSON.stringify({...manifest,version:'1.3.0'}),type:'application/json'}}),/Canonical main manifest serves v1\.3\.0/);
});
test('local HTTP chain catches missing download rather than reporting an installable release',async()=>{
  await assert.rejects(()=>exercise({download:{status:404,content:'Missing release'}}),/HTTP 404/);
});
test('local HTTP chain catches wrong bytes even when download returns HTTP 200',async()=>{
  await assert.rejects(()=>exercise({download:{content:'<html>Login required</html>',type:'text/html'}}),/ZIP does not match/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseConfig} from '../../scripts/release-config.mjs';
import {verifyPublished} from '../../scripts/verify-published.mjs';
const cfg=releaseConfig('example/project','1.4.2');
const manifest={id:'altered-carbon-rpg',version:cfg.version,url:cfg.url,manifest:cfg.manifest,download:cfg.download,documentTypes:{Item:{ammunition:{},drug:{}}}};
const archive=Buffer.from('synthetic ZIP bytes for network-boundary tests');
const mock=({remote=manifest,zip=archive,manifestStatus=200,zipStatus=200}={}) => async (url,options) => {
  assert.equal(options.headers,undefined,'Verifier must not leak GitHub credentials');
  assert.equal(options.redirect,'follow');
  if ([cfg.manifest,cfg.releaseManifest,cfg.legacyManifest].includes(url)) return {ok:manifestStatus===200,status:manifestStatus,json:async()=>remote};
  assert.equal(url,manifest.download);
  return {ok:zipStatus===200,status:zipStatus,headers:new Headers(),arrayBuffer:async()=>zip};
};
test('public verifier accepts matching manifest and exact ZIP bytes',async()=> {
  const result=await verifyPublished({manifest,archive,fetchImpl:mock()});
  assert.equal(result.version,'1.4.2'); assert.match(result.sha256,/^[0-9a-f]{64}$/);
});
test('public verifier rejects a stale canonical main manifest',async()=> {
  await assert.rejects(()=>verifyPublished({manifest,archive,fetchImpl:mock({remote:{...manifest,version:'1.4.1'}})}),/serves v1\.4\.1/);
});
test('public verifier rejects a previous-version download link',async()=> {
  await assert.rejects(()=>verifyPublished({manifest,archive,fetchImpl:mock({remote:{...manifest,download:releaseConfig('example/project','1.4.1').download}})}),/download mismatch/);
});
test('public verifier rejects a changed document schema even with matching version',async()=> {
  await assert.rejects(()=>verifyPublished({manifest,archive,fetchImpl:mock({remote:{...manifest,documentTypes:{Item:{}}}})}),/differs from the tested/);
});
for (const status of [404,403,500]) test(`public verifier reports manifest HTTP ${status}`,async()=> {
  await assert.rejects(()=>verifyPublished({manifest,archive,fetchImpl:mock({manifestStatus:status})}),new RegExp(`HTTP ${status}`));
});
test('public verifier rejects a missing release ZIP',async()=> {
  await assert.rejects(()=>verifyPublished({manifest,archive,fetchImpl:mock({zipStatus:404})}),/HTTP 404/);
});
test('public verifier rejects HTML/wrong content masquerading as a successful ZIP download',async()=> {
  await assert.rejects(()=>verifyPublished({manifest,archive,fetchImpl:mock({zip:Buffer.from('<html>Not a ZIP</html>')})}),/ZIP does not match/);
});
test('public verifier reports unparseable manifest content',async()=> {
  await assert.rejects(()=>verifyPublished({manifest,archive,fetchImpl:async()=>({ok:true,json:async()=>{throw new Error('HTML login page')}})}),/manifest could not be read: HTML login page/);
});

test('stale main is rejected even when both release-asset manifests are correct', async () => {
  const fetchImpl=async (url,options) => url===cfg.manifest
    ? {ok:true,json:async()=>({...manifest,version:'1.3.0'})} : mock()(url,options);
  await assert.rejects(()=>verifyPublished({manifest,archive,fetchImpl}),/Canonical main manifest serves v1\.3\.0/);
});
test('full verification checks canonical, pinned bridge, latest bridge, then the exact ZIP', async () => {
  const calls=[];
  const result=await verifyPublished({manifest,archive,fetchImpl:async(url,options)=>{
    calls.push(url); return mock()(url,options);
  }});
  assert.deepEqual(calls,[cfg.manifest,cfg.releaseManifest,cfg.legacyManifest,cfg.download]);
  assert.deepEqual(result.checkedManifests,calls.slice(0,3));
});
test('a missing compatibility bridge is reported distinctly from a bad canonical URL', async () => {
  const fetchImpl=async(url,options)=>url===cfg.legacyManifest
    ? {ok:false,status:404} : mock()(url,options);
  await assert.rejects(()=>verifyPublished({manifest,archive,fetchImpl}),/Legacy latest bridge manifest could not be read.*HTTP 404/);
});
test('a stale version-pinned manifest fails even with a matching canonical manifest', async () => {
  const fetchImpl=async(url,options)=>url===cfg.releaseManifest
    ? {ok:true,json:async()=>({...manifest,version:'1.3.0'})} : mock()(url,options);
  await assert.rejects(()=>verifyPublished({manifest,archive,fetchImpl}),/Versioned release manifest serves v1\.3\.0/);
});
test('canonical-only verification remains usable for the original single-asset deployment', async () => {
  const calls=[];
  const result=await verifyPublished({manifest,archive,checkLegacy:false,fetchImpl:async(url,options)=>{
    calls.push(url); return mock()(url,options);
  }});
  assert.deepEqual(calls,[cfg.manifest,cfg.download]);
  assert.equal(result.version,manifest.version);
});

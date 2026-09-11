import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {releaseConfig, repositoryFromManifest, validateReleaseConfig, compareStableVersions} from '../../scripts/release-config.mjs';

const makeManifest = (repository = 'example/actual-project', version = '1.4.2') => {
  const c = releaseConfig(repository, version);
  return {id:'altered-carbon-rpg',version:c.version,url:c.url,manifest:c.manifest,download:c.download};
};
test('original raw-main manifest is stable and its archive is version-pinned', () => {
  const old = releaseConfig('example/project', '1.4.1'), current = releaseConfig('example/project', '1.4.2');
  assert.equal(old.manifest, current.manifest);
  assert.notEqual(old.download, current.download);
  assert.equal(current.download, 'https://github.com/example/project/releases/download/v1.4.2/altered-carbon-rpg-v1.4.2.zip');
  assert.equal(current.manifest, 'https://raw.githubusercontent.com/example/project/main/system.json');
  assert.equal(current.legacyManifest, 'https://github.com/example/project/releases/latest/download/system.json');
  assert.equal(current.releaseManifest, 'https://github.com/example/project/releases/download/v1.4.2/system.json');
});
test('arbitrary actual repository is accepted rather than a hardcoded organisation', () => {
  const manifest=makeManifest('actual-owner/real-repo');
  assert.equal(validateReleaseConfig(manifest,{repository:'actual-owner/real-repo'}).repository,'actual-owner/real-repo');
  assert.equal(repositoryFromManifest(manifest),'actual-owner/real-repo');
});
for (const invalid of ['', 'https://github.com/a/b', 'a/b/main', 'a/b/', 'a/..', 'a/b?ref=old']) {
  test(`invalid repository input rejected: ${invalid}`,()=>assert.throws(()=>releaseConfig(invalid,'1.4.2')));
}
for (const invalid of ['v1.4.2','1.4','1.4.2-beta','01.4.2','1.4.2/evil']) {
  test(`invalid stable version rejected: ${invalid}`,()=>assert.throws(()=>releaseConfig('a/b',invalid)));
}
test('validator prevents silently migrating away from the original raw-main path',()=> {
  const manifest=makeManifest(); manifest.manifest='https://github.com/example/actual-project/releases/latest/download/system.json';
  assert.throws(()=>validateReleaseConfig(manifest),/manifest mismatch/);
});
test('validator catches a ZIP that points to the previous version',()=> {
  const manifest=makeManifest(); manifest.download=releaseConfig('example/actual-project','1.4.1').download;
  assert.throws(()=>validateReleaseConfig(manifest),/download mismatch/);
});
test('validator catches a mismatched owner during CI',()=> {
  assert.throws(()=>validateReleaseConfig(makeManifest(),{repository:'someone-else/repository'}),/url mismatch/);
});
test('validator rejects a moving latest ZIP',()=> {
  const manifest=makeManifest(); manifest.download=manifest.url+'/releases/latest/download/altered-carbon-rpg.zip';
  assert.throws(()=>validateReleaseConfig(manifest),/download mismatch/);
});
test('numeric version comparison handles 1.10 greater than 1.9 and equality',()=> {
  assert.equal(compareStableVersions('1.10.0','1.9.9'),1);
  assert.equal(compareStableVersions('1.4.2','1.4.2'),0);
  assert.equal(compareStableVersions('1.4.2','1.5.0'),-1);
});
test('preparation binds actual repository and all runtime labels without touching game data',()=> {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'ac-release-'));
  try {
    for (const dir of ['scripts','module','templates','data']) fs.mkdirSync(path.join(root,dir));
    for (const name of ['scripts/prepare-release.mjs','scripts/release-config.mjs','altered-carbon-rpg.mjs','module/system-health.mjs','module/gm-tools.mjs','module/gm-guide.mjs','templates/gm-panel.hbs','system.json','package.json']) fs.copyFileSync(name,path.join(root,name));
    fs.writeFileSync(path.join(root,'data/sentinel.json'),'[{"unchanged":"1.4.2"}]');
    execFileSync(process.execPath,['scripts/prepare-release.mjs','--version','1.5.0'],{cwd:root,env:{...process.env,GITHUB_REPOSITORY:'real-owner/custom-system'}});
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'system.json'),'utf8'));
    assert.equal(manifest.version,'1.5.0'); assert.equal(manifest.url,'https://github.com/real-owner/custom-system');
    validateReleaseConfig(manifest,{repository:'real-owner/custom-system'});
    assert.equal(JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,'1.5.0');
    for (const name of ['altered-carbon-rpg.mjs','module/system-health.mjs','module/gm-tools.mjs','module/gm-guide.mjs','templates/gm-panel.hbs']) {
      const text=fs.readFileSync(path.join(root,name),'utf8'); assert.ok(text.includes('1.5.0')); assert.ok(!text.includes('1.4.2'));
    }
    assert.equal(fs.readFileSync(path.join(root,'data/sentinel.json'),'utf8'),'[{"unchanged":"1.4.2"}]');
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test('release workflow is explicit, uploads a standalone manifest, and verifies after publication',()=> {
  const workflow=fs.readFileSync('.github/workflows/release.yml','utf8');
  assert.match(workflow,/workflow_dispatch:/); assert.match(workflow,/contents: write/);
  assert.doesNotMatch(workflow,/npm run prepare:release/); assert.match(workflow,/npm run release:check/);
  assert.doesNotMatch(workflow,/^  push:/m);
  assert.match(workflow,/git diff --exit-code/);
  assert.match(workflow,/refs\/heads\/main/);
  const script=fs.readFileSync('scripts/publish-release.sh','utf8');
  assert.match(script,/"dist\/system.json"/);
  assert.ok(script.indexOf('node scripts/verify-published.mjs --root-only')<script.indexOf('gh release create'));
  assert.ok(script.indexOf('gh release upload')<script.indexOf('gh release edit'));
  assert.ok(script.indexOf('gh release edit')<script.lastIndexOf('node scripts/verify-published.mjs'));
  assert.match(script,/--draft=false --prerelease=false --latest/);
  assert.match(script,/Refusing to mark an older build latest/);
  assert.match(script,/Refusing to overwrite a published release/);
});

test('CI validates committed files without rewriting source URLs or versions', () => {
  const ci=fs.readFileSync('.github/workflows/ci.yml','utf8');
  assert.doesNotMatch(ci,/prepare:release/);
  assert.match(ci,/git diff --exit-code/);
});
test('missing update metadata is rejected rather than breaking automatic updates', () => {
  for (const field of ['manifest','download']) {
    const m=makeManifest(); delete m[field];
    assert.throws(()=>validateReleaseConfig(m),new RegExp(field+' mismatch'));
  }
});

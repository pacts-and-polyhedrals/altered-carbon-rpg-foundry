import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';

const builder=path.resolve('scripts/build-runtime.py');
function fixture() {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ac-zip-'));
  fs.writeFileSync(path.join(dir,'system.json'),'{"id":"altered-carbon-rpg","version":"1.4.3"}\n');
  fs.writeFileSync(path.join(dir,'altered-carbon-rpg.mjs'),'// entry\n');
  for (const name of ['module','data','lang','styles','templates']) {
    fs.mkdirSync(path.join(dir,name)); fs.writeFileSync(path.join(dir,name,'example.txt'),name+'\n');
  }
  return dir;
}
const build=(dir,name)=>execFileSync('python3',[builder,name],{cwd:dir,encoding:'utf8'});
test('runtime ZIP stays flat and excludes repository, docs, tests, and nested bundles',()=>{
  const dir=fixture();
  try {
    fs.writeFileSync(path.join(dir,'README.md'),'not runtime');
    fs.mkdirSync(path.join(dir,'.github')); fs.writeFileSync(path.join(dir,'.github','test.yml'),'not runtime');
    build(dir,'first.zip');
    const files=execFileSync('unzip',['-Z1',path.join(dir,'first.zip')],{encoding:'utf8'}).trim().split('\n');
    assert.equal(files.filter(f=>f==='system.json').length,1);
    assert.equal(files.length,7);
    assert.ok(!files.some(f=>/README|github|\.zip$|^altered-carbon-rpg\//.test(f)));
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('ZIP bytes do not depend on source timestamps or filesystem mode',()=>{
  const dir=fixture();
  try {
    build(dir,'first.zip');
    for (const file of ['system.json','altered-carbon-rpg.mjs','module/example.txt']) {
      fs.utimesSync(path.join(dir,file),1234567890,1234567890);
      fs.chmodSync(path.join(dir,file),0o600);
    }
    build(dir,'second.zip');
    assert.deepEqual(fs.readFileSync(path.join(dir,'first.zip')),fs.readFileSync(path.join(dir,'second.zip')));
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('changed runtime content changes the ZIP bytes',()=>{
  const dir=fixture();
  try {
    build(dir,'first.zip'); fs.writeFileSync(path.join(dir,'module/example.txt'),'different\n'); build(dir,'second.zip');
    assert.notDeepEqual(fs.readFileSync(path.join(dir,'first.zip')),fs.readFileSync(path.join(dir,'second.zip')));
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('runtime symlinks are rejected instead of copying unrelated files',()=>{
  const dir=fixture();
  try {
    fs.symlinkSync('../system.json',path.join(dir,'module','link.json'));
    assert.throws(()=>build(dir,'bad.zip'),/Symlinks are not allowed/);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

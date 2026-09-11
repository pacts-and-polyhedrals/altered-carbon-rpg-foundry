import fs from 'node:fs';
import path from 'node:path';
import {validateReleaseConfig} from './release-config.mjs';

const root = process.cwd();
const manifestPath = path.join(root, 'system.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
validateReleaseConfig(manifest, {repository: process.env.GITHUB_REPOSITORY || undefined});

const fail = message => { throw new Error(message); };
if (manifest.id !== 'altered-carbon-rpg') fail('system.json id must be altered-carbon-rpg');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (manifest.version !== pkg.version) fail(`system.json version ${manifest.version} must match package.json ${pkg.version}`);
if (String(manifest.compatibility?.minimum) !== '14') fail('minimum Foundry version must be 14');
if (manifest.compatibility?.verified) fail('Do not claim a live verified version without live QA.');

for (const rel of [...(manifest.esmodules ?? []), ...(manifest.styles ?? []), ...(manifest.languages ?? []).map(x => x.path)]) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) fail(`manifest references missing file: ${rel}`);
}

const required = ['altered-carbon-rpg.mjs', 'module', 'data', 'lang', 'styles', 'templates'];
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) fail(`missing required package path: ${rel}`);

for (const dir of ['data', 'lang']) {
  for (const name of fs.readdirSync(path.join(root, dir), {recursive:true})) {
    if (!name.endsWith('.json')) continue;
    JSON.parse(fs.readFileSync(path.join(root, dir, name), 'utf8'));
  }
}

console.log(`Validated ${manifest.title} v${manifest.version}`);
console.log(`Manifest: ${manifest.manifest}`);
console.log(`Download: ${manifest.download}`);

const main = fs.readFileSync('altered-carbon-rpg.mjs', 'utf8');
const models = fs.readFileSync('module/data-models.mjs', 'utf8');
for (const documentName of ['Actor', 'Item']) {
  const start = main.indexOf(`Object.assign(CONFIG.${documentName}.dataModels,{`);
  if (start < 0) fail(`Missing ${documentName} data model registration`);
  const registration = main.slice(start, main.indexOf('});', start));
  const registered = new Map([...registration.matchAll(/([a-zA-Z][a-zA-Z0-9]*):Models\.([a-zA-Z0-9]+)/g)].map(m => [m[1], m[2]]));
  for (const type of Object.keys(manifest.documentTypes?.[documentName] || {})) {
    if (!registered.has(type)) fail(`Manifest ${documentName}.${type} has no registered data model`);
    if (!models.includes(`export class ${registered.get(type)} `)) fail(`Missing model class for ${documentName}.${type}`);
  }
  for (const type of registered.keys()) if (!Object.hasOwn(manifest.documentTypes[documentName], type)) fail(`Data model ${documentName}.${type} is undeclared in system.json`);
}
for (const name of fs.readdirSync('data').filter(n => n.startsWith('core-') && n.endsWith('.json'))) {
  const catalog = JSON.parse(fs.readFileSync(path.join('data', name), 'utf8'));
  for (const [documentName, entries] of [['Item', catalog.items || []], ['Actor', catalog.actors || []]]) {
    for (const entry of entries) if (!Object.hasOwn(manifest.documentTypes[documentName], entry.type)) fail(`${name}: undeclared ${documentName} type ${entry.type}`);
  }
}
if (!fs.readFileSync('module/system-health.mjs', 'utf8').includes(`BUILD_VERSION = '${manifest.version}'`)) fail('System health build version does not match manifest');
console.log('All catalog types, manifest declarations, model registrations and build versions agree.');

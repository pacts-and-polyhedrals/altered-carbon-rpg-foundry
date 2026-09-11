import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'system.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const expectedRepo = 'https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry';
const expectedManifest = 'https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json';
const expectedDownload = `${expectedRepo}/releases/download/v${manifest.version}/altered-carbon-rpg-v${manifest.version}.zip`;

const fail = message => { throw new Error(message); };
if (manifest.id !== 'altered-carbon-rpg') fail('system.json id must be altered-carbon-rpg');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (manifest.version !== pkg.version) fail(`system.json version ${manifest.version} must match package.json ${pkg.version}`);
if (String(manifest.compatibility?.minimum) !== '14') fail('minimum Foundry version must be 14');
if (String(manifest.compatibility?.verified) !== '14') fail('verified Foundry version must be 14');
if (manifest.url !== expectedRepo) fail('repository URL mismatch');
if (manifest.manifest !== expectedManifest) fail('stable manifest URL mismatch');
if (manifest.download !== expectedDownload) fail('release download URL mismatch');

for (const rel of [...(manifest.esmodules ?? []), ...(manifest.styles ?? []), ...(manifest.languages ?? []).map(x => x.path)]) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) fail(`manifest references missing file: ${rel}`);
}

const required = ['altered-carbon-rpg.mjs', 'module', 'data', 'lang', 'styles', 'templates'];
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) fail(`missing required package path: ${rel}`);

for (const dir of ['data', 'lang']) {
  for (const name of fs.readdirSync(path.join(root, dir))) {
    if (!name.endsWith('.json')) continue;
    JSON.parse(fs.readFileSync(path.join(root, dir, name), 'utf8'));
  }
}

console.log(`Validated ${manifest.title} v${manifest.version}`);
console.log(`Manifest: ${manifest.manifest}`);
console.log(`Download: ${manifest.download}`);

import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const manifest = JSON.parse(fs.readFileSync('system.json', 'utf8'));
const zip = `dist/altered-carbon-rpg-v${manifest.version}.zip`;
if (!fs.existsSync(zip)) throw new Error(`Missing ${zip}`);
const listing = execFileSync('unzip', ['-Z1', zip], {encoding: 'utf8'}).trim().split(/\r?\n/);
if (!listing.includes('system.json')) throw new Error('Release ZIP does not contain system.json at ZIP root');
if (listing.some(x => x.startsWith('altered-carbon-rpg/'))) throw new Error('Release ZIP is incorrectly nested under altered-carbon-rpg/');
for (const required of ['altered-carbon-rpg.mjs', 'module/', 'data/', 'lang/', 'styles/', 'templates/']) {
  if (!listing.some(x => x === required || x.startsWith(required))) throw new Error(`Release ZIP missing ${required}`);
}
for (const required of [
  'module/gm-bonus-dice.mjs', 'module/gm-roll-options.mjs', 'module/system-health.mjs',
  'module/advancement.mjs', 'module/advancement-wizard.mjs', 'module/actor-directory.mjs',
  'module/adventure-book.mjs', 'templates/advancement-wizard.hbs', 'templates/adventure-book.hbs',
  'styles/adventure-book.css', 'data/cold-storage/journals.json', 'data/cold-storage/book-index.json',
  'module/core-content.mjs', 'templates/core-library.hbs',
  'data/core-weapons.json', 'data/core-ammunition.json', 'data/core-armour.json',
  'data/core-equipment.json', 'data/core-software.json', 'data/core-drugs.json',
  'data/core-augmentations.json', 'data/core-vehicles.json', 'data/core-upgrades.json'
]) {
  if (!listing.includes(required)) throw new Error(`Release ZIP missing required integration/Core file: ${required}`);
}
console.log(`Release ZIP verified: ${zip}`);

const packagedManifest = JSON.parse(execFileSync('unzip', ['-p', zip, 'system.json'], {encoding:'utf8'}));
if (JSON.stringify(packagedManifest) !== JSON.stringify(manifest)) throw new Error('Release ZIP contains a stale or different system.json');
for (const type of ['ammunition', 'drug']) if (!packagedManifest.documentTypes.Item[type]) throw new Error(`Release manifest omits ${type}`);
console.log('Release ZIP manifest is identical to source and declares ammunition and drug.');

// Validate the actual standalone update manifest, not just the copy inside the ZIP.
const {validateReleaseConfig} = await import('./release-config.mjs');
validateReleaseConfig(manifest, {repository: process.env.GITHUB_REPOSITORY || undefined});
if (!fs.existsSync('dist/system.json')) throw new Error('Missing standalone system.json release asset');
if (fs.readFileSync('dist/system.json', 'utf8') !== fs.readFileSync('system.json', 'utf8')) throw new Error('Standalone release manifest differs from source');
const {createHash} = await import('node:crypto');
const sums = fs.readFileSync('dist/SHA256SUMS.txt', 'utf8');
for (const name of ['system.json', `altered-carbon-rpg-v${manifest.version}.zip`]) {
  const digest = createHash('sha256').update(fs.readFileSync(`dist/${name}`)).digest('hex');
  if (!sums.includes(`${digest}  ${name}\n`)) throw new Error(`Missing or incorrect checksum: ${name}`);
}
console.log('Standalone manifest, immutable download path and release asset checksums agree.');

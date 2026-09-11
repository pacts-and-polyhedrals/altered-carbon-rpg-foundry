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
console.log(`Release ZIP verified: ${zip}`);

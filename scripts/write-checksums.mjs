import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validateReleaseConfig} from './release-config.mjs';
const manifest = JSON.parse(fs.readFileSync('system.json', 'utf8'));
const {asset} = validateReleaseConfig(manifest);
const names = ['system.json', asset];
fs.writeFileSync('dist/SHA256SUMS.txt', names.map(name => `${createHash('sha256').update(fs.readFileSync(`dist/${name}`)).digest('hex')}  ${name}`).join('\n') + '\n');

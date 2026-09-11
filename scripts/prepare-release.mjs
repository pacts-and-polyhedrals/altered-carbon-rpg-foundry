import fs from 'node:fs';
import {releaseConfig, repositoryFromManifest} from './release-config.mjs';

const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--repository', '--version'].includes(args[i]) || !args[i + 1]) throw new Error('Usage: npm run prepare:release -- [--repository OWNER/REPO] [--version X.Y.Z]');
  options[args[i].slice(2)] = args[i + 1];
}
const manifest = JSON.parse(fs.readFileSync('system.json', 'utf8'));
const previousVersion = manifest.version, previousUrl = manifest.url;
const config = releaseConfig(options.repository || process.env.GITHUB_REPOSITORY || repositoryFromManifest(manifest), options.version || previousVersion);
for (const key of ['version', 'url', 'manifest', 'download']) manifest[key] = config[key];
for (const author of manifest.authors || []) if (author.url === previousUrl) author.url = config.url;
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); pkg.version = config.version;
// Keep runtime version labels in sync; never touch adventure or equipment JSON.
for (const name of ['altered-carbon-rpg.mjs', 'module/system-health.mjs', 'module/gm-tools.mjs', 'module/gm-guide.mjs', 'templates/gm-panel.hbs']) {
  const old = fs.readFileSync(name, 'utf8');
  fs.writeFileSync(name, old.split(previousVersion).join(config.version));
}
fs.writeFileSync('system.json', JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log(`Prepared ${config.tag} for ${config.repository}. Nothing has been published.`);
console.log(`Update manifest: ${config.manifest}\nRelease archive: ${config.download}`);

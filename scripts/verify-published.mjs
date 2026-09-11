/** Unauthenticated verification of the ORIGINAL raw-main manifest and its exact ZIP.
 * The two release-asset manifests bridge installs diverted by v1.4.2.
 * Local tests inject HTTP responses and never establish a public release exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {validateReleaseConfig} from './release-config.mjs';

const MAX_BYTES = 64 * 1024 * 1024;
async function get(url, fetchImpl) {
  const response = await fetchImpl(url, {redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(25000)});
  if (!response.ok) throw new Error(`Public release URL returned HTTP ${response.status}: ${url}`);
  return response;
}

export async function verifyManifestRoute({manifest, url, label, fetchImpl = globalThis.fetch}) {
  const config = validateReleaseConfig(manifest);
  let remote;
  try { remote = await (await get(url, fetchImpl)).json(); }
  catch (error) { throw new Error(`${label} manifest could not be read: ${error.message}`); }
  if (remote?.version !== manifest.version) throw new Error(`${label} manifest serves v${remote?.version}; expected v${manifest.version}. URL: ${url}`);
  validateReleaseConfig(remote, {repository: config.repository});
  if (!isDeepStrictEqual(remote, manifest)) throw new Error(`${label} public manifest differs from the tested release manifest. URL: ${url}`);
  return remote;
}

export async function verifyPublished({manifest, archive, checkLegacy = true, fetchImpl = globalThis.fetch}) {
  const config = validateReleaseConfig(manifest);
  const remote = await verifyManifestRoute({manifest, url: config.manifest, label: 'Canonical main', fetchImpl});
  const checkedManifests = [config.manifest];
  if (checkLegacy) {
    for (const [label, url] of [['Versioned release', config.releaseManifest], ['Legacy latest bridge', config.legacyManifest]]) {
      await verifyManifestRoute({manifest, url, label, fetchImpl});
      checkedManifests.push(url);
    }
  }
  const response = await get(remote.download, fetchImpl);
  if (Number(response.headers?.get?.('content-length')) > MAX_BYTES) throw new Error('Unexpectedly large release archive.');
  const downloaded = Buffer.from(await response.arrayBuffer());
  if (downloaded.length > MAX_BYTES) throw new Error('Unexpectedly large release archive.');
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  if (digest(downloaded) !== digest(archive)) throw new Error('Public ZIP does not match the archive built and tested for this release.');
  return {version: remote.version, manifest: config.manifest, download: remote.download,
    checkedManifests, sha256: digest(downloaded)};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--canonical-only', '--root-only'].includes(arg))) throw new Error('Usage: node scripts/verify-published.mjs [--canonical-only | --root-only]');
  const manifest = JSON.parse(fs.readFileSync('dist/system.json', 'utf8'));
  const config = validateReleaseConfig(manifest);
  if (args.includes('--root-only')) {
    await verifyManifestRoute({manifest, url:config.manifest, label:'Canonical main', fetchImpl:globalThis.fetch});
    console.log(`PUBLIC ROOT MANIFEST VERIFIED: ${config.manifest}`);
  } else {
    const archive = fs.readFileSync(`dist/${config.asset}`);
    const result = await verifyPublished({manifest, archive, checkLegacy:!args.includes('--canonical-only')});
    console.log(`PUBLIC RELEASE VERIFIED: v${result.version}\nManifest: ${result.manifest}\nZIP: ${result.download}\nSHA-256: ${result.sha256}`);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## Public Foundry release verified: v${result.version}\n\nInstall/update manifest:\n\n\`${result.manifest}\`\n\nPinned ZIP:\n\n\`${result.download}\`\n\nZIP SHA-256: \`${result.sha256}\`\n`);
  }
}

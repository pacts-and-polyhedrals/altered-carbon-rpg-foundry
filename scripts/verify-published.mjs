/** Public, unauthenticated end-to-end verification. Never reports a local build as published. */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {validateReleaseConfig} from './release-config.mjs';

export async function verifyPublished({manifest, archive, fetchImpl = globalThis.fetch}) {
  const config = validateReleaseConfig(manifest);
  const get = async url => {
    const response = await fetchImpl(url, {redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(25000)});
    if (!response.ok) throw new Error(`Public release URL returned HTTP ${response.status}: ${url}`);
    return response;
  };
  let remote;
  try { remote = await (await get(config.manifest)).json(); }
  catch (error) { throw new Error(`Latest manifest could not be read: ${error.message}`); }
  if (remote.version !== manifest.version) throw new Error(`Latest manifest serves v${remote.version}; expected v${manifest.version}.`);
  validateReleaseConfig(remote, {repository: config.repository});
  if (!isDeepStrictEqual(remote, manifest)) throw new Error('Public manifest differs from the tested release manifest.');
  const response = await get(remote.download);
  if (Number(response.headers?.get?.('content-length')) > 64 * 1024 * 1024) throw new Error('Unexpectedly large release archive.');
  const downloaded = Buffer.from(await response.arrayBuffer());
  if (downloaded.length > 64 * 1024 * 1024) throw new Error('Unexpectedly large release archive.');
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  if (digest(downloaded) !== digest(archive)) throw new Error('Public ZIP does not match the archive built and tested for this release.');
  return {version: remote.version, manifest: config.manifest, download: remote.download, sha256: digest(downloaded)};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const manifest = JSON.parse(fs.readFileSync('dist/system.json', 'utf8'));
  const {asset} = validateReleaseConfig(manifest);
  const archive = fs.readFileSync(`dist/${asset}`);
  let result, lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try { result = await verifyPublished({manifest, archive}); break; }
    catch (error) { lastError = error; console.error(`Public verification ${attempt}/4 failed: ${error.message}`); if (attempt < 4) await new Promise(resolve => setTimeout(resolve, 4000)); }
  }
  if (!result) throw lastError;
  console.log(`PUBLIC RELEASE VERIFIED: v${result.version}\nManifest: ${result.manifest}\nZIP: ${result.download}\nSHA-256: ${result.sha256}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## Public Foundry release verified: v${result.version}\n\nInstall/update manifest:\n\n\`${result.manifest}\`\n\nPinned ZIP:\n\n\`${result.download}\`\n\nZIP SHA-256: \`${result.sha256}\`\n`);
}

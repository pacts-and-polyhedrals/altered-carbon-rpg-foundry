/** Single release URL contract, shared by preparation and validation. */
export function releaseConfig(repository, version) {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(String(repository || '')) || repository.split('/')[1] === '..') {
    throw new Error('Repository must be OWNER/REPO, without a URL, branch or trailing slash.');
  }
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(String(version))) {
    throw new Error('Stable release version must be MAJOR.MINOR.PATCH, for example 1.4.2.');
  }
  const url = `https://github.com/${repository}`;
  const tag = `v${version}`;
  const asset = `altered-carbon-rpg-${tag}.zip`;
  return {repository, version, url, tag, asset,
    manifest: `${url}/releases/latest/download/system.json`,
    download: `${url}/releases/download/${tag}/${asset}`};
}

export function repositoryFromManifest(manifest) {
  const match = /^https:\/\/github\.com\/([^/]+\/[^/]+)$/.exec(manifest.url || '');
  if (!match) throw new Error('system.json url must be the GitHub repository root.');
  return match[1];
}

export function validateReleaseConfig(manifest, {repository} = {}) {
  if (manifest.id !== 'altered-carbon-rpg') throw new Error('Wrong system id.');
  const config = releaseConfig(repository || repositoryFromManifest(manifest), manifest.version);
  for (const key of ['url', 'manifest', 'download']) {
    if (manifest[key] !== config[key]) throw new Error(`Release ${key} mismatch: expected ${config[key]}, found ${manifest[key]}`);
  }
  return config;
}

export function compareStableVersions(a, b) {
  releaseConfig('example/repository', a); releaseConfig('example/repository', b);
  const left = a.split('.').map(BigInt), right = b.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}

/** Checks the loaded server manifest and the public Document.TYPES registry.
 * Never patch the client registry to disguise an unregistered server-side type.
 */
export const BUILD_VERSION = '1.4.3';
const NS = 'altered-carbon-rpg';
export const REQUIRED_CORE_ITEM_TYPES = Object.freeze(['weapon', 'ammunition', 'armour', 'equipment', 'software', 'drug', 'augmentation']);

function registeredTypes(documentName) {
  const config = globalThis.CONFIG?.[documentName];
  const types = config?.documentClass?.TYPES ?? globalThis.game?.documentTypes?.[documentName];
  if (Array.isArray(types)) return types;
  if (types instanceof Set) return [...types];
  return null;
}

export function getSystemHealth({itemTypes = REQUIRED_CORE_ITEM_TYPES, actorTypes = [], diskManifest = null} = {}) {
  const loadedVersion = String(globalThis.game?.system?.version || 'unknown');
  const issues = [], missing = [];
  if (loadedVersion !== BUILD_VERSION) issues.push(`Loaded manifest is v${loadedVersion}; running code is v${BUILD_VERSION}.`);
  for (const [documentName, requested] of [['Item', itemTypes], ['Actor', actorTypes]]) {
    if (!requested.length) continue;
    const registered = registeredTypes(documentName);
    if (!registered) issues.push(`${documentName}.TYPES could not be read; registration cannot be verified.`);
    else {
      const absent = [...new Set(requested)].filter(type => !registered.includes(type));
      if (absent.length) { missing.push(...absent.map(type => `${documentName}.${type}`));
        issues.push(`Foundry has not registered ${documentName} types: ${absent.join(', ')}.`); }
    }
    const models = globalThis.CONFIG?.[documentName]?.dataModels;
    const noModel = models ? [...new Set(requested)].filter(type => !models[type]) : [];
    if (noModel.length) issues.push(`Missing ${documentName} data models: ${noModel.join(', ')}.`);
  }
  if (diskManifest && diskManifest.version !== BUILD_VERSION) issues.push(`system.json served from disk is v${diskManifest.version}; expected v${BUILD_VERSION}.`);
  if (diskManifest) for (const [documentName, requested] of [['Item', itemTypes], ['Actor', actorTypes]]) {
    const absent = requested.filter(type => !Object.hasOwn(diskManifest.documentTypes?.[documentName] || {}, type));
    if (absent.length) issues.push(`The installed system.json lacks ${documentName} declarations: ${absent.join(', ')}.`);
  }
  return {ok: issues.length === 0, buildVersion: BUILD_VERSION, loadedVersion,
    diskVersion: diskManifest?.version ?? null, missing, issues,
    summary: issues.length ? issues.join(' ') : `v${BUILD_VERSION}: Core Item types are registered.`,
    remedy: `Stop the Foundry game/server, replace the complete altered-carbon-rpg system folder including system.json with v${BUILD_VERSION}, restart the game/server, and reload every browser client. Updating only JavaScript or refreshing the browser cannot repair a stale server manifest. Then retry the Core Library import; existing catalog records are kept.`};
}

export function assertRegisteredDocumentTypes({itemTypes = [], actorTypes = []} = {}) {
  const health = getSystemHealth({itemTypes, actorTypes});
  if (!health.ok) {
    const error = new Error(`Altered Carbon installation mismatch. ${health.summary} ${health.remedy}`);
    error.name = 'ACSystemInstallationError';
    error.health = health;
    throw error;
  }
  return health;
}

export async function diagnoseSystem({notify = false} = {}) {
  let diskManifest = null;
  try {
    const response = await fetch(`systems/${NS}/system.json`, {cache: 'no-store'});
    if (response.ok) diskManifest = await response.json();
  } catch (error) { console.warn('Altered Carbon | Could not inspect installed system.json', error); }
  const health = getSystemHealth({diskManifest});
  if (notify) {
    if (health.ok) ui.notifications.info(health.summary);
    else ui.notifications.error(`${health.summary} ${health.remedy}`, {permanent: true});
  }
  console[health.ok ? 'info' : 'warn']('Altered Carbon | System registration check', health);
  return health;
}

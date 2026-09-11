/**
 * Presentation helpers for Actor-sheet embedded records.
 *
 * Two layers of duplicate protection are used:
 * 1) Logically singular records (Skills, Traits, Specialisations, Conditions,
 *    Scandals and Networks) are deduplicated by semantic identity.
 * 2) Every record type is protected from literal cloned documents on the
 *    character sheet. Baggage and inventory/resource rows also receive a
 *    presentation identity that ignores mutable state such as Depletion,
 *    Exhausted, Credits spent, or Baggage resolved-state. This prevents a
 *    doubled import from reappearing just because one copy was used/edited.
 */

export const UNIQUE_SHEET_RECORD_TYPES = new Set([
  'skill',
  'trait',
  'specialisation',
  'condition',
  'scandal',
  'network'
]);

/**
 * Records which should collapse to one visible row on the character sheet even
 * if a mutable field (for example Depletion or Baggage resolved-state) differs
 * between two accidentally doubled documents. This is presentation-only; no
 * world documents are deleted.
 */
export const DISPLAY_SEMANTIC_RECORD_TYPES = new Set([
  ...UNIQUE_SHEET_RECORD_TYPES,
  'baggage',
  'weapon',
  'armour',
  'equipment',
  'augmentation',
  'software',
  'creditSet',
  'virtualConstruct',
  'resourceEntry'
]);

export function normalizeRecordToken(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function sys(record) {
  return record?.system ?? {};
}

function plainSystem(record) {
  if (!record) return {};
  try {
    const source = record.toObject?.();
    if (source?.system) return source.system;
  } catch (_error) {}
  try {
    if (typeof record.system?.toObject === 'function') return record.system.toObject();
  } catch (_error) {}
  return record.system ?? {};
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

function fingerprint(value) {
  try { return JSON.stringify(canonicalize(value)); }
  catch (_error) { return String(value ?? ''); }
}

/** Return a stable semantic identity for a logically singular record. */
export function stableRecordKey(record) {
  if (!record) return '';
  const type = String(record.type ?? '');
  const system = sys(record);
  const catalogId = normalizeRecordToken(system.catalogId);
  const key = normalizeRecordToken(system.key);
  const name = normalizeRecordToken(record.name);

  if (catalogId) return `${type}:catalog:${catalogId}`;

  switch (type) {
    case 'skill':
      return `${type}:name:${name}`;
    case 'trait':
      return `${type}:trait:${name}:${normalizeRecordToken(system.tree)}:${normalizeRecordToken(system.branch)}:${Number(system.tier || 0)}`;
    case 'specialisation':
      return `${type}:spec:${normalizeRecordToken(system.skill)}:${name}`;
    case 'condition':
    case 'scandal':
      return `${type}:key:${key || name}`;
    case 'network':
      return `${type}:network:${normalizeRecordToken(system.organization)}:${name}`;
    default:
      return `${type}:id:${record.id ?? record._id ?? name}`;
  }
}

/** Return a stable presentation identity for rows that should never double-render. */
export function displayRecordKey(record) {
  if (!record) return '';
  const type = String(record.type ?? '');
  const system = sys(record);
  const catalogId = normalizeRecordToken(system.catalogId);
  const name = normalizeRecordToken(record.name);

  // Logically singular rule records prefer their source catalog identity.
  if (UNIQUE_SHEET_RECORD_TYPES.has(type) && catalogId) return `${type}:catalog:${catalogId}`;

  switch (type) {
    case 'baggage':
      return `${type}:baggage:${name}:${fingerprint({rollMin:system.rollMin,rollMax:system.rollMax,severity:system.severity,appliesTo:system.appliesTo})}`;
    case 'weapon':
      return `${type}:gear:${name}:${fingerprint({skill:system.skill,damage:system.damage,damageType:system.damageType,complexity:system.complexity,range:system.range,priceLevel:system.priceLevel,techPoints:system.techPoints,techUsed:system.techUsed,cargoUnits:system.cargoUnits,heavy:system.heavy,bodySlots:system.bodySlots,powered:system.powered,specialRules:system.specialRules,capacity:system.capacity,depletionMode:system.depletionMode,depletionFormula:system.depletionFormula,gearBonus:system.gearBonus,bonusDice:system.bonusDice,accuracy:system.accuracy,armorPiercing:system.armorPiercing,deadly:system.deadly,firingMode:system.firingMode,triggeredEffects:system.triggeredEffects,upgrades:system.upgrades})}`;
    case 'armour':
      return `${type}:gear:${name}:${fingerprint({priceLevel:system.priceLevel,techPoints:system.techPoints,techUsed:system.techUsed,cargoUnits:system.cargoUnits,heavy:system.heavy,bodySlots:system.bodySlots,powered:system.powered,specialRules:system.specialRules,defense:system.defense,protection:system.protection,damageTypes:system.damageTypes,layering:system.layering,battleArmor:system.battleArmor,upgrades:system.upgrades})}`;
    case 'equipment':
      return `${type}:gear:${name}:${fingerprint({priceLevel:system.priceLevel,techPoints:system.techPoints,techUsed:system.techUsed,cargoUnits:system.cargoUnits,heavy:system.heavy,bodySlots:system.bodySlots,powered:system.powered,specialRules:system.specialRules,capacity:system.capacity,depletionMode:system.depletionMode,depletionFormula:system.depletionFormula,gearBonus:system.gearBonus,bonusDice:system.bonusDice,upgrades:system.upgrades})}`;
    case 'software':
      return `${type}:gear:${name}:${fingerprint({priceLevel:system.priceLevel,techPoints:system.techPoints,techUsed:system.techUsed,cargoUnits:system.cargoUnits,heavy:system.heavy,bodySlots:system.bodySlots,powered:system.powered,specialRules:system.specialRules,capacity:system.capacity,depletionMode:system.depletionMode,depletionFormula:system.depletionFormula,triggeredEffects:system.triggeredEffects})}`;
    case 'augmentation':
      return `${type}:gear:${name}:${fingerprint({priceLevel:system.priceLevel,techCost:system.techCost,techPoints:system.techPoints,techUsed:system.techUsed,cargoUnits:system.cargoUnits,heavy:system.heavy,bodySlots:system.bodySlots,powered:system.powered,specialRules:system.specialRules,upgrades:system.upgrades})}`;
    case 'creditSet':
      return `${type}:credit:${name}:${fingerprint({value:system.value,untraceable:system.untraceable})}`;
    case 'virtualConstruct':
      return `${type}:construct:${name}:${fingerprint({integrity:system.integrity,accessLevel:system.accessLevel,firewallClass:system.firewallClass,virusClass:system.virusClass})}`;
    case 'resourceEntry':
      return `${type}:resource:${normalizeRecordToken(system.itemName || record.name)}:${fingerprint({priceLevel:system.priceLevel,capacity:system.capacity,rare:system.rare,regulated:system.regulated,unregistered:system.unregistered,grayMarket:system.grayMarket,blackMarket:system.blackMarket})}`;
    default:
      return stableRecordKey(record);
  }
}

/**
 * Return an identity for a literal cloned embedded record. Document ids,
 * ownership and sort order are intentionally ignored; the actual rule/item
 * data must match for this key to collide.
 */
export function exactRecordKey(record) {
  if (!record) return '';
  const type = String(record.type ?? '');
  const name = normalizeRecordToken(record.name);
  let payload = '';
  try { payload = JSON.stringify(canonicalize(plainSystem(record))); }
  catch (_error) { payload = String(plainSystem(record)); }
  return `${type}:exact:${name}:${payload}`;
}

/**
 * Deduplicate only record types whose semantics are singular. This helper is
 * also used by creation workflows where repeatable records may legitimately
 * occur more than once.
 */
export function dedupeUniqueSheetRecords(records = []) {
  const seen = new Set();
  const output = [];
  for (const record of records) {
    if (!UNIQUE_SHEET_RECORD_TYPES.has(record?.type)) {
      output.push(record);
      continue;
    }
    const key = stableRecordKey(record);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    output.push(record);
  }
  return output;
}

/**
 * Full character-sheet presentation dedupe. Literal clones of any embedded
 * Item are hidden, while singular record types receive the stronger semantic
 * dedupe above. This is intentionally non-destructive: it does not delete the
 * underlying documents from existing worlds.
 */
export function dedupeSheetRecords(records = []) {
  const exactSeen = new Set();
  const semanticSeen = new Set();
  const output = [];
  for (const record of records) {
    const exact = exactRecordKey(record);
    if (exact && exactSeen.has(exact)) continue;
    if (exact) exactSeen.add(exact);

    if (DISPLAY_SEMANTIC_RECORD_TYPES.has(record?.type)) {
      const semantic = displayRecordKey(record);
      if (semantic && semanticSeen.has(semantic)) continue;
      if (semantic) semanticSeen.add(semantic);
    }
    output.push(record);
  }
  return output;
}

export function hasEquivalentUniqueRecord(records = [], candidate) {
  if (!candidate || !UNIQUE_SHEET_RECORD_TYPES.has(candidate.type)) return false;
  const key = stableRecordKey(candidate);
  return Boolean(key && records.some(record => record?.type === candidate.type && stableRecordKey(record) === key));
}

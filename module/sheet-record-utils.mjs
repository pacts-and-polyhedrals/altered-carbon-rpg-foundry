/**
 * Presentation helpers for Actor-sheet embedded records.
 *
 * Some record types are logically unique on an Altered Carbon character.
 * For example, the same Trait or core Skill should not render twice just
 * because two import paths created equivalent Item documents. Collections
 * where repetition can be meaningful (gear, Baggage, memories, relationships,
 * injuries, sleeves) are deliberately NOT deduplicated here.
 */

export const UNIQUE_SHEET_RECORD_TYPES = new Set([
  'skill',
  'trait',
  'specialisation',
  'condition',
  'scandal',
  'network'
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

/** Return a stable semantic identity for a record. */
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

/**
 * Deduplicate only record types whose semantics are singular. The first
 * document wins, preserving the Actor's source order and all user-authored
 * collections where duplicate names may be intentional.
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

export function hasEquivalentUniqueRecord(records = [], candidate) {
  if (!candidate || !UNIQUE_SHEET_RECORD_TYPES.has(candidate.type)) return false;
  const key = stableRecordKey(candidate);
  return Boolean(key && records.some(record => record?.type === candidate.type && stableRecordKey(record) === key));
}

/** Shared validation for GM requests and assigned Bonus Dice. No Foundry globals. */
export const BONUS_DIE_SIDES = Object.freeze([4, 6, 8, 10, 12, 20]);
export const MAX_BONUS_DICE = 10;

function integer(value, fallback, name, min, max) {
  const number = value === '' || value == null ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`${name} must be a whole number from ${min} to ${max}.`);
  }
  return number;
}

export function normalizeBonusDie(value = 'skill') {
  if (value === 'skill') return 'skill';
  const number = Number(value);
  if (!BONUS_DIE_SIDES.includes(number)) throw new Error('Choose the Skill die, d4, d6, d8, d10, d12 or d20.');
  return number;
}

export function makeBonusDice(count = 0, die = 'skill') {
  count = integer(count, 0, 'Bonus Dice count', 0, MAX_BONUS_DICE);
  return Array(count).fill(normalizeBonusDie(die));
}

export function normalizeBonusDice(dice = []) {
  if (!Array.isArray(dice) || dice.length > MAX_BONUS_DICE) {
    throw new Error(`Use an array of at most ${MAX_BONUS_DICE} Bonus Dice.`);
  }
  return dice.map(normalizeBonusDie);
}

export function resolveBonusDice(dice, skillSides) {
  return normalizeBonusDice(dice).map(die => die === 'skill' ? Number(skillSides) : die);
}

export function describeBonusDice(dice = []) {
  const counts = new Map();
  for (const die of normalizeBonusDice(dice)) counts.set(die, (counts.get(die) || 0) + 1);
  return [...counts].map(([die, count]) => die === 'skill'
    ? `${count} Skill-size Bonus ${count === 1 ? 'Die' : 'Dice'}`
    : `${count}d${die} Bonus ${count === 1 ? 'Die' : 'Dice'}`).join(' + ');
}

export function normalizeRollOptions(values = {}) {
  return {
    difficulty: integer(values.difficulty, 0, 'Difficulty', 0, 100),
    bonus: integer(values.bonus, 0, 'TR modifier', -100, 100),
    baseTR: values.baseTR == null || String(values.baseTR).trim() === '' ? null
      : integer(values.baseTR, 0, 'Base TR', -100, 100),
    bonusDice: values.bonusDice == null
      ? makeBonusDice(values.bonusDiceCount ?? 0, values.bonusDie ?? 'skill')
      : normalizeBonusDice(values.bonusDice),
    sightReliant: Boolean(values.sightReliant),
    sightOnly: Boolean(values.sightOnly)
  };
}

export function mergePreset(preset, override = {}) {
  const options = normalizeRollOptions({...preset, ...override});
  return {...preset, ...options, title: preset.title || preset.label || preset.skill};
}

import {normalizeBonusDice, describeBonusDice, resolveBonusDice} from './gm-roll-options.mjs';

const NS = 'altered-carbon-rpg';
const FLAG = 'gmBonusDice';
const norm = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const clone = value => foundry.utils.deepClone(value);

/** Awards are separate keyed flags so spending one cannot overwrite a new award. */
export function getBonusDiceAwards(actor) {
  const stored = actor?.getFlag?.(NS, FLAG) ?? actor?.flags?.[NS]?.[FLAG] ?? {};
  return Object.entries(stored).flatMap(([id, award]) => {
    try {
      if (!award || !['next', 'persistent'].includes(award.duration)) return [];
      const dice = normalizeBonusDice(award.dice);
      if (!dice.length) return [];
      return [{...award, id, dice, description: describeBonusDice(dice),
        scopeLabel: award.skill || 'Any Skill',
        durationLabel: award.duration === 'next' ? 'Next matching check' : 'Until removed'}];
    } catch (_error) { return []; }
  });
}

export function matchingBonusDiceAwards(actor, skill) {
  return getBonusDiceAwards(actor).filter(award => !award.skill || norm(award.skill) === norm(skill.name));
}

export function awardedDiceForRoll(awards, skillSides) {
  return awards.flatMap(award => resolveBonusDice(award.dice, skillSides));
}

function requireGM() {
  if (!game.user.isGM) throw new Error('Only a GM can assign or remove Bonus Dice.');
}
function selectedActors(actorIds) {
  const ids = [...new Set(actorIds)];
  if (!ids.length) throw new Error('Select at least one character.');
  return ids.map(id => {
    const actor = game.actors.get(id);
    if (!actor) throw new Error(`Selected character ${id} no longer exists.`);
    return actor;
  });
}

export async function grantBonusDice({actorIds = [], dice = ['skill'], duration = 'next', skill = '', label = ''} = {}) {
  requireGM();
  dice = normalizeBonusDice(dice);
  if (!dice.length) throw new Error('Assign at least one Bonus Die.');
  if (!['next', 'persistent'].includes(duration)) throw new Error('Choose next matching check or until removed.');
  const actors = selectedActors(actorIds);
  const id = foundry.utils.randomID();
  const award = {id, dice, duration, skill: String(skill).trim(), label: String(label || 'GM Bonus Dice').trim(),
    createdBy: game.user.id, createdAt: Date.now()};
  const granted = [], failed = [];
  for (const actor of actors) {
    try {
      if (getBonusDiceAwards(actor).length >= 20) throw new Error('Remove some existing awards first (20 active awards maximum).');
      await actor.update({[`flags.${NS}.${FLAG}.${id}`]: clone(award)});
      granted.push({actorId: actor.id, actorName: actor.name, award: clone(award)});
    } catch (error) { failed.push({actorId: actor.id, actorName: actor.name, reason: error.message}); }
  }
  return {granted, failed};
}

/** Called only after the check has actually resolved, never on dialog cancellation. */
export async function consumeBonusDiceAwards(actor, awards) {
  const live = new Set(getBonusDiceAwards(actor).map(award => award.id));
  const spent = awards.filter(award => award.duration === 'next' && live.has(award.id));
  if (!spent.length) return [];
  if (!game.user.isGM && !actor.isOwner) throw new Error('You do not own that character.');
  await actor.update(Object.fromEntries(spent.map(award => [`flags.${NS}.${FLAG}.-=${award.id}`, null])));
  return spent.map(award => award.id);
}

export async function removeBonusDiceAward(actorId, awardId) {
  requireGM();
  const [actor] = selectedActors([actorId]);
  if (!getBonusDiceAwards(actor).some(award => award.id === awardId)) return false;
  await actor.update({[`flags.${NS}.${FLAG}.-=${awardId}`]: null});
  return true;
}

export async function clearBonusDiceAwards(actorIds) {
  requireGM();
  const cleared = [], failed = [];
  for (const actor of selectedActors(actorIds)) {
    try {
      const awards = getBonusDiceAwards(actor);
      if (awards.length) await actor.update(Object.fromEntries(awards.map(award => [`flags.${NS}.${FLAG}.-=${award.id}`, null])));
      cleared.push(actor.id);
    } catch (error) { failed.push({actorId: actor.id, actorName: actor.name, reason: error.message}); }
  }
  return {cleared, failed};
}

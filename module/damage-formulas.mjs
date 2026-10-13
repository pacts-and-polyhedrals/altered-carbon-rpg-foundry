/** 2020 Core p.198 Accuracy: each paid resolution repeats the FULL Triggered Effect.
 * No eval: this helper constructs a Roll formula from an existing validated formula.
 * Bonus damage granted outside the Triggered Effect is applied once by the caller.
 */
import {damageFormula} from './attack-rules.mjs';
export function repeatTriggeredDamageFormula(formula,repetitions=1){
  const source=String(formula??'').trim();
  const repeats=Number(repetitions);
  if(!source||!Number.isInteger(repeats)||repeats<1||repeats>50)throw new Error('A damage formula and 1–50 complete Triggered Effect resolutions are required.');
  if(!damageFormula(source))throw new Error('Damage formula must contain dice and/or numeric constants only.');
  const terms=Array.from({length:repeats},()=>`(${source})`);
  return terms.join('+');
}
export function damageDieCount(formula){
  return [...String(formula??'').matchAll(/(\d*)d(\d+)/gi)].reduce((sum,m)=>sum+Number(m[1]||1),0);
}

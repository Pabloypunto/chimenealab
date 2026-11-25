import { positive } from './units.js';
/** Darcy friction factor, not Fanning. */
export function darcyFrictionFactor({ reynolds, roughnessM, diameterM }) {
  positive(reynolds, 'Número de Reynolds'); positive(roughnessM, 'Rugosidad', true); positive(diameterM, 'Diámetro');
  if (reynolds < 2300) return 64 / reynolds;
  if (reynolds <= 4000) throw new RangeError('Régimen transitorio: no se devuelve un factor de fricción único fiable.');
  const relativeRoughness = roughnessM / diameterM;
  const denominator = Math.log10(relativeRoughness / 3.7 + 5.74 / Math.pow(reynolds, 0.9));
  return 0.25 / (denominator * denominator);
}
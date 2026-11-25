import { positive } from './units.js';
export function dynamicPressure({ densityKgM3, velocityMS }) { positive(densityKgM3, 'Densidad'); positive(velocityMS, 'Velocidad', true); return 0.5 * densityKgM3 * velocityMS * velocityMS; }
export function distributedPressureLoss({ frictionFactor, lengthM, diameterM, densityKgM3, velocityMS }) {
  positive(frictionFactor, 'Factor de fricción'); positive(lengthM, 'Longitud'); positive(diameterM, 'Diámetro');
  return frictionFactor * (lengthM / diameterM) * dynamicPressure({ densityKgM3, velocityMS });
}
export function localPressureLoss({ lossCoefficient, densityKgM3, velocityMS }) { positive(lossCoefficient, 'Coeficiente K', true); return lossCoefficient * dynamicPressure({ densityKgM3, velocityMS }); }
export function sumLocalLosses({ fittings, densityKgM3, velocityMS }) {
  if (!Array.isArray(fittings)) throw new TypeError('Los accesorios deben ser una lista.');
  return fittings.reduce((sum, fitting) => sum + localPressureLoss({ lossCoefficient: fitting.k, densityKgM3, velocityMS }), 0);
}
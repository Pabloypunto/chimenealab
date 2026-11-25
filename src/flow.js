import { circularArea } from './geometry.js';
import { positive } from './units.js';
export function volumetricFlowRate(massFlowKgS, densityKgM3) { positive(massFlowKgS, 'Caudal másico'); positive(densityKgM3, 'Densidad'); return massFlowKgS / densityKgM3; }
export function gasVelocity({ massFlowKgS, densityKgM3, diameterM }) { const areaM2 = circularArea(diameterM); return massFlowKgS / (densityKgM3 * areaM2); }
export function reynoldsNumber({ densityKgM3, velocityMS, hydraulicDiameterM, dynamicViscosityPas }) {
  positive(densityKgM3, 'Densidad'); positive(velocityMS, 'Velocidad', true); positive(hydraulicDiameterM, 'Diámetro hidráulico'); positive(dynamicViscosityPas, 'Viscosidad dinámica');
  return densityKgM3 * velocityMS * hydraulicDiameterM / dynamicViscosityPas;
}
export function classifyReynolds(reynolds) { positive(reynolds, 'Número de Reynolds', true); if (reynolds < 2300) return 'laminar'; if (reynolds <= 4000) return 'transitorio'; return 'turbulento'; }
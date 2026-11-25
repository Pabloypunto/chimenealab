import { positive } from './units.js';
export function cylindricalLayerResistancePerLength({ innerRadiusM, outerRadiusM, conductivityWmK }) {
  positive(innerRadiusM, 'Radio interior'); positive(outerRadiusM, 'Radio exterior'); positive(conductivityWmK, 'Conductividad térmica');
  if (outerRadiusM <= innerRadiusM) throw new RangeError('El radio exterior debe superar al interior.');
  return Math.log(outerRadiusM / innerRadiusM) / (2 * Math.PI * conductivityWmK);
}
export function cylindricalFilmResistancePerLength({ radiusM, heatTransferCoefficientWm2K }) {
  positive(radiusM, 'Radio'); positive(heatTransferCoefficientWm2K, 'Coeficiente de transferencia');
  return 1 / (heatTransferCoefficientWm2K * 2 * Math.PI * radiusM);
}
export function overallLinearConductance({ innerRadiusM, innerFilmCoefficientWm2K, layers, outerFilmCoefficientWm2K }) {
  positive(innerRadiusM, 'Radio interior'); positive(innerFilmCoefficientWm2K, 'Coeficiente película interior'); positive(outerFilmCoefficientWm2K, 'Coeficiente película exterior');
  if (!Array.isArray(layers)) throw new TypeError('Las capas deben ser una lista.');
  let resistance = cylindricalFilmResistancePerLength({ radiusM: innerRadiusM, heatTransferCoefficientWm2K: innerFilmCoefficientWm2K });
  let previousRadius = innerRadiusM;
  for (const layer of layers) {
    const nextRadius = layer.outerRadiusM;
    resistance += cylindricalLayerResistancePerLength({ innerRadiusM: previousRadius, outerRadiusM: nextRadius, conductivityWmK: layer.conductivityWmK });
    previousRadius = nextRadius;
  }
  resistance += cylindricalFilmResistancePerLength({ radiusM: previousRadius, heatTransferCoefficientWm2K: outerFilmCoefficientWm2K });
  return { totalResistanceKmW: resistance, linearConductanceWmK: 1 / resistance };
}
export function linearConductanceFromOverallU({ overallU_Wm2K, innerDiameterM }) { positive(overallU_Wm2K, 'Coeficiente global U'); positive(innerDiameterM, 'Diámetro interior'); return overallU_Wm2K * Math.PI * innerDiameterM; }
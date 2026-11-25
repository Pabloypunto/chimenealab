import { G, positive } from './units.js';
export function theoreticalDraft({ heightM, outsideDensityKgM3, segmentGasDensities }) {
  positive(heightM, 'Altura efectiva'); positive(outsideDensityKgM3, 'Densidad exterior');
  if (!Array.isArray(segmentGasDensities) || segmentGasDensities.length === 0) throw new TypeError('Se necesitan densidades medias de gases por tramo.');
  let buoyancyIntegral = 0, summedHeight = 0;
  for (const segment of segmentGasDensities) {
    positive(segment.verticalRiseM, 'Desnivel vertical del tramo', true); positive(segment.gasDensityKgM3, 'Densidad de gases');
    summedHeight += segment.verticalRiseM; buoyancyIntegral += segment.verticalRiseM * (outsideDensityKgM3 - segment.gasDensityKgM3);
  }
  const tolerance = Math.max(0.01, heightM * 1e-4);
  if (Math.abs(summedHeight - heightM) > tolerance) throw new RangeError('La suma de los desniveles verticales por tramo debe coincidir con la altura efectiva.');
  return G * buoyancyIntegral;
}
export function availableDraft({ theoreticalDraftPa, distributedLossPa, localLossPa, roomDepressionPa = 0, windContributionPa = 0 }) {
  for (const [name, value] of Object.entries({ theoreticalDraftPa, distributedLossPa, localLossPa, roomDepressionPa, windContributionPa })) if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} debe ser finito.`);
  positive(distributedLossPa, 'Pérdidas distribuidas', true); positive(localLossPa, 'Pérdidas localizadas', true); positive(roomDepressionPa, 'Depresión del recinto', true);
  return theoreticalDraftPa - distributedLossPa - localLossPa - roomDepressionPa + windContributionPa;
}
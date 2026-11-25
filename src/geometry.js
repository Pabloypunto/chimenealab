import { positive, finiteNumber } from './units.js';
export function circularArea(diameterM) { positive(diameterM, 'Diámetro interior'); return Math.PI * diameterM * diameterM / 4; }
export function hydraulicDiameter({ areaM2, wettedPerimeterM }) { positive(areaM2, 'Área'); positive(wettedPerimeterM, 'Perímetro mojado'); return 4 * areaM2 / wettedPerimeterM; }
export function validateSegment(segment, index = 0) {
  const prefix = `Tramo ${index + 1}`;
  positive(segment.lengthM, `${prefix}: longitud`); positive(segment.diameterM, `${prefix}: diámetro interior`); positive(segment.roughnessM, `${prefix}: rugosidad`, true);
  finiteNumber(segment.verticalRiseM, `${prefix}: desnivel vertical`);
  if (segment.verticalRiseM < 0) throw new RangeError(`${prefix}: el desnivel vertical no puede ser negativo en esta versión.`);
  return { ...segment };
}
export function validateInstallation(segments) {
  if (!Array.isArray(segments) || segments.length === 0) throw new TypeError('La instalación debe contener al menos un tramo.');
  return segments.map(validateSegment);
}
export function totalVerticalHeight(segments) { return validateInstallation(segments).reduce((sum, segment) => sum + segment.verticalRiseM, 0); }
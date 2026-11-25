import { positive, finiteNumber, celsiusToKelvin } from './units.js';
export function coolGasThroughSegment({ inletTemperatureK, ambientTemperatureK, lengthM, massFlowKgS, cpJkgK, linearConductanceWmK }) {
  positive(inletTemperatureK, 'Temperatura de entrada'); positive(ambientTemperatureK, 'Temperatura ambiente'); positive(lengthM, 'Longitud'); positive(massFlowKgS, 'Caudal másico'); positive(cpJkgK, 'Calor específico'); positive(linearConductanceWmK, 'Conductancia térmica lineal', true);
  const ntu = linearConductanceWmK * lengthM / (massFlowKgS * cpJkgK);
  const deltaIn = inletTemperatureK - ambientTemperatureK;
  const attenuation = ntu === 0 ? 1 : Math.exp(-ntu);
  const outletTemperatureK = ambientTemperatureK + deltaIn * attenuation;
  const meanFactor = ntu === 0 ? 1 : -Math.expm1(-ntu) / ntu;
  const meanTemperatureK = ambientTemperatureK + deltaIn * meanFactor;
  if (!(outletTemperatureK > 0) || !(meanTemperatureK > 0)) throw new RangeError('El modelo térmico ha producido una temperatura absoluta no válida.');
  return { ntu, outletTemperatureK, meanTemperatureK };
}
export function linearConductanceFromU({ overallU_Wm2K, innerDiameterM }) { positive(overallU_Wm2K, 'Coeficiente global U'); positive(innerDiameterM, 'Diámetro interior'); return overallU_Wm2K * Math.PI * innerDiameterM; }
export function ambientTemperatureFromCelsius(temperatureC) { finiteNumber(temperatureC, 'Temperatura ambiente'); return celsiusToKelvin(temperatureC); }
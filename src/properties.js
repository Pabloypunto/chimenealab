import { R_AIR, celsiusToKelvin, positive, finiteNumber } from './units.js';
export function idealGasDensity({ pressurePa, temperatureK, specificGasConstant }) {
  positive(pressurePa, 'Presión absoluta'); positive(temperatureK, 'Temperatura absoluta'); positive(specificGasConstant, 'Constante específica del gas');
  return pressurePa / (specificGasConstant * temperatureK);
}
export function dryAirDensity({ pressurePa = 101325, temperatureC }) {
  return idealGasDensity({ pressurePa, temperatureK: celsiusToKelvin(temperatureC), specificGasConstant: R_AIR });
}
export function dryAirDynamicViscosity(temperatureK) {
  positive(temperatureK, 'Temperatura absoluta');
  const mu0 = 1.716e-5, t0 = 273.15, s = 111;
  return mu0 * Math.pow(temperatureK / t0, 1.5) * ((t0 + s) / (temperatureK + s));
}
export function validateGasProperties(properties, label = 'Gas') {
  if (!properties || typeof properties !== 'object') throw new TypeError(`${label}: faltan propiedades.`);
  positive(properties.specificGasConstant, `${label}: R específica`); positive(properties.cp, `${label}: calor específico`); positive(properties.dynamicViscosity, `${label}: viscosidad dinámica`);
  return { ...properties };
}
export function constantCp(cp) { positive(cp, 'Calor específico'); return () => cp; }
export function constantViscosity(mu) { positive(mu, 'Viscosidad dinámica'); return () => mu; }
export function kelvinFromCelsius(celsius) { finiteNumber(celsius, 'Temperatura'); return celsiusToKelvin(celsius); }
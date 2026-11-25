export const G = 9.80665;
export const R_AIR = 287.05;
export const P_ATM = 101325;
export const C_TO_K = 273.15;

export function celsiusToKelvin(celsius) {
  finiteNumber(celsius, 'Temperatura');
  const kelvin = celsius + C_TO_K;
  if (kelvin <= 0) throw new RangeError('La temperatura absoluta debe ser superior a 0 K.');
  return kelvin;
}
export function finiteNumber(value, name = 'Valor') {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} debe ser un número finito.`);
  return value;
}
export function positive(value, name = 'Valor', allowZero = false) {
  finiteNumber(value, name);
  if (allowZero ? value < 0 : value <= 0) throw new RangeError(`${name} debe ser ${allowZero ? 'mayor o igual que cero' : 'mayor que cero'}.`);
  return value;
}
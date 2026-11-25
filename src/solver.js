import { dryAirDensity, idealGasDensity } from './properties.js';
import { gasVelocity, reynoldsNumber } from './flow.js';
import { darcyFrictionFactor } from './friction.js';
import { distributedPressureLoss, sumLocalLosses } from './losses.js';
import { availableDraft } from './draft.js';
import { validateInstallation, totalVerticalHeight } from './geometry.js';
import { coolGasThroughSegment, ambientTemperatureFromCelsius } from './thermal.js';
import { positive } from './units.js';

export function solveInstallation(input) {
  const { segments: rawSegments, massFlowKgS, inletGasTemperatureC, ambientTemperatureC, pressurePa = 101325, gas, roomDepressionPa = 0, windContributionPa = 0 } = input ?? {};
  positive(massFlowKgS, 'Caudal másico'); positive(pressurePa, 'Presión absoluta');
  if (!gas) throw new TypeError('Faltan las propiedades del gas.');
  positive(gas.specificGasConstant, 'Constante específica del gas'); positive(gas.cpJkgK, 'Calor específico'); positive(gas.dynamicViscosityPas, 'Viscosidad dinámica');
  const segments = validateInstallation(rawSegments);
  const ambientK = ambientTemperatureFromCelsius(ambientTemperatureC);
  let currentTemperatureK = ambientTemperatureFromCelsius(inletGasTemperatureC);
  const outsideDensity = dryAirDensity({ pressurePa, temperatureC: ambientTemperatureC });
  const results = [];
  let totalDistributedLossPa = 0, totalLocalLossPa = 0, buoyancyIntegral = 0;
  segments.forEach((segment, index) => {
    positive(segment.linearConductanceWmK, `Tramo ${index + 1}: conductancia térmica lineal`, true);
    const thermal = coolGasThroughSegment({ inletTemperatureK: currentTemperatureK, ambientTemperatureK: ambientK, lengthM: segment.lengthM, massFlowKgS, cpJkgK: gas.cpJkgK, linearConductanceWmK: segment.linearConductanceWmK });
    const gasDensity = idealGasDensity({ pressurePa, temperatureK: thermal.meanTemperatureK, specificGasConstant: gas.specificGasConstant });
    const velocity = gasVelocity({ massFlowKgS, densityKgM3: gasDensity, diameterM: segment.diameterM });
    const reynolds = reynoldsNumber({ densityKgM3: gasDensity, velocityMS: velocity, hydraulicDiameterM: segment.diameterM, dynamicViscosityPas: gas.dynamicViscosityPas });
    const frictionFactor = darcyFrictionFactor({ reynolds, roughnessM: segment.roughnessM, diameterM: segment.diameterM });
    const distributedLoss = distributedPressureLoss({ frictionFactor, lengthM: segment.lengthM, diameterM: segment.diameterM, densityKgM3: gasDensity, velocityMS: velocity });
    const localLoss = sumLocalLosses({ fittings: segment.fittings ?? [], densityKgM3: gasDensity, velocityMS: velocity });
    totalDistributedLossPa += distributedLoss; totalLocalLossPa += localLoss;
    buoyancyIntegral += segment.verticalRiseM * (outsideDensity - gasDensity);
    results.push({ index:index+1, inletTemperatureK:currentTemperatureK, outletTemperatureK:thermal.outletTemperatureK, meanTemperatureK:thermal.meanTemperatureK, meanTemperatureC:thermal.meanTemperatureK-273.15, gasDensityKgM3:gasDensity, velocityMS:velocity, reynolds, frictionFactorDarcy:frictionFactor, distributedLossPa:distributedLoss, localLossPa:localLoss, verticalRiseM:segment.verticalRiseM });
    currentTemperatureK = thermal.outletTemperatureK;
  });
  const heightM = totalVerticalHeight(segments);
  const theoreticalDraftPa = 9.80665 * buoyancyIntegral;
  const availableDraftPa = availableDraft({ theoreticalDraftPa, distributedLossPa:totalDistributedLossPa, localLossPa:totalLocalLossPa, roomDepressionPa, windContributionPa });
  return {
    model:'steady-1d-known-mass-flow',
    assumptions:['Caudal másico conocido y constante en todos los tramos.','Presión de los gases aproximada por la presión atmosférica introducida.','Temperatura ambiente constante por tramo.','Conductancia térmica lineal U prima suministrada por el usuario o una fuente documentada.','Propiedades del gas constantes salvo la densidad, que se actualiza con la temperatura media.','No se modelan viento ni infiltraciones salvo que se introduzcan como presión diferencial externa.'],
    outsideDensityKgM3:outsideDensity, heightM, outletGasTemperatureC:currentTemperatureK-273.15, theoreticalDraftPa, distributedLossPa:totalDistributedLossPa, localLossPa:totalLocalLossPa, roomDepressionPa, windContributionPa, availableDraftPa, segments:results
  };
}
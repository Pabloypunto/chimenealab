import { solveInstallation } from './solver.js';
import { positive } from './units.js';
export function applianceRequiredDraft({ massFlowKgS, curve }) {
  positive(massFlowKgS, 'Caudal másico');
  if (!curve || typeof curve !== 'object') throw new TypeError('Falta la curva de tiro requerido del aparato.');
  if (curve.type === 'quadratic-required-draft') {
    positive(curve.baseRequiredDraftPa, 'Tiro requerido base', true); positive(curve.resistancePaPerKgS2, 'Coeficiente de resistencia del aparato', true);
    return curve.baseRequiredDraftPa + curve.resistancePaPerKgS2 * massFlowKgS ** 2;
  }
  if (curve.type === 'tabulated-required-draft') {
    if (!Array.isArray(curve.points) || curve.points.length < 2) throw new TypeError('La curva tabulada necesita al menos dos puntos caudal-tiro.');
    const points = curve.points;
    for (let i=0;i<points.length;i++) {
      positive(points[i].massFlowKgS, `Punto ${i+1}: caudal`); positive(points[i].requiredDraftPa, `Punto ${i+1}: tiro requerido`, true);
      if (i>0 && points[i].massFlowKgS<=points[i-1].massFlowKgS) throw new RangeError('Los caudales de la curva tabulada deben estar estrictamente ordenados de menor a mayor.');
    }
    if (massFlowKgS<points[0].massFlowKgS || massFlowKgS>points[points.length-1].massFlowKgS) throw new RangeError('El caudal está fuera del rango de la curva tabulada; no se permite extrapolar.');
    for (let i=0;i<points.length-1;i++) {
      const a=points[i], b=points[i+1];
      if (massFlowKgS>=a.massFlowKgS && massFlowKgS<=b.massFlowKgS) {
        const fraction=(massFlowKgS-a.massFlowKgS)/(b.massFlowKgS-a.massFlowKgS);
        return a.requiredDraftPa+fraction*(b.requiredDraftPa-a.requiredDraftPa);
      }
    }
  }
  throw new TypeError('Tipo de curva no admitido: usa quadratic-required-draft o tabulated-required-draft.');
}
function evaluateAtFlow({ massFlowKgS, installation, applianceCurve }) {
  const chimney=solveInstallation({ ...installation, massFlowKgS });
  const applianceRequiredDraftPa=applianceRequiredDraft({ massFlowKgS, curve:applianceCurve });
  return { massFlowKgS, chimney, applianceRequiredDraftPa, residualPa:chimney.availableDraftPa-applianceRequiredDraftPa };
}
export function solveOperatingPoint({ installation, applianceCurve, massFlowBoundsKgS, massFlowToleranceKgS=1e-7, pressureTolerancePa=0.01, maxIterations=100, scanIntervals=100 }) {
  if (!installation || typeof installation!=='object') throw new TypeError('Faltan los datos de la instalación.');
  if (!massFlowBoundsKgS || typeof massFlowBoundsKgS!=='object') throw new TypeError('Faltan los límites de búsqueda del caudal.');
  const minFlow=positive(massFlowBoundsKgS.min,'Caudal mínimo'), maxFlow=positive(massFlowBoundsKgS.max,'Caudal máximo');
  if (maxFlow<=minFlow) throw new RangeError('El caudal máximo debe ser mayor que el mínimo.');
  positive(massFlowToleranceKgS,'Tolerancia de caudal'); positive(pressureTolerancePa,'Tolerancia de presión'); positive(maxIterations,'Máximo de iteraciones'); positive(scanIntervals,'Intervalos de exploración');
  if (!Number.isInteger(maxIterations)||!Number.isInteger(scanIntervals)) throw new TypeError('Las iteraciones e intervalos deben ser enteros.');
  applianceRequiredDraft({ massFlowKgS:minFlow, curve:applianceCurve });
  const samples=[]; let bracket=null, previous=null;
  for (let i=0;i<=scanIntervals;i++) {
    const flow=minFlow+(maxFlow-minFlow)*i/scanIntervals; let point;
    try { point=evaluateAtFlow({massFlowKgS:flow,installation,applianceCurve}); }
    catch(error) {
      if (String(error?.message??'').includes('Régimen transitorio')) throw new RangeError(`No se puede resolver con fiabilidad: el intervalo de búsqueda atraviesa un régimen transitorio de Reynolds (caudal ${flow.toFixed(6)} kg/s). Ajusta los límites o aporta un modelo validado para esa zona.`);
      throw error;
    }
    samples.push({massFlowKgS:flow,residualPa:point.residualPa});
    if (Math.abs(point.residualPa)<=pressureTolerancePa) return formatResult(point,{iterations:0,samples,convergedBy:'pressure-tolerance'});
    if (previous && previous.residualPa*point.residualPa<0) { bracket={low:previous,high:point}; break; }
    previous=point;
  }
  if (!bracket) {
    const first=samples[0], last=samples[samples.length-1];
    throw new RangeError(`No se encontró equilibrio dentro del intervalo ${minFlow}–${maxFlow} kg/s. Residuo en el mínimo: ${first.residualPa.toFixed(3)} Pa; en el máximo: ${last.residualPa.toFixed(3)} Pa. Amplía/revisa el intervalo o la curva del aparato.`);
  }
  let low=bracket.low, high=bracket.high, midpoint;
  for (let iteration=1;iteration<=maxIterations;iteration++) {
    const midFlow=(low.massFlowKgS+high.massFlowKgS)/2;
    midpoint=evaluateAtFlow({massFlowKgS:midFlow,installation,applianceCurve});
    samples.push({massFlowKgS:midFlow,residualPa:midpoint.residualPa});
    if (Math.abs(midpoint.residualPa)<=pressureTolerancePa || (high.massFlowKgS-low.massFlowKgS)<=massFlowToleranceKgS) return formatResult(midpoint,{iterations:iteration,samples,convergedBy:'bisection'});
    if (low.residualPa*midpoint.residualPa>0) low=midpoint; else high=midpoint;
  }
  throw new Error(`El cálculo del punto de funcionamiento no ha convergido en ${maxIterations} iteraciones.`);
}
function formatResult(point,metadata) {
  return {
    model:'steady-1d-operating-point-quadratic-appliance-curve', converged:true, massFlowKgS:point.massFlowKgS, massFlowKgH:point.massFlowKgS*3600,
    chimneyAvailableDraftPa:point.chimney.availableDraftPa, applianceRequiredDraftPa:point.applianceRequiredDraftPa, pressureResidualPa:point.residualPa,
    iterations:metadata.iterations, convergedBy:metadata.convergedBy, searchSamples:metadata.samples, installation:point.chimney,
    assumptions:['Régimen estacionario y caudal másico constante en todos los tramos.','Curva del aparato representada mediante una ley cuadrática explícita o interpolación lineal de datos tabulados.','Los coeficientes de la curva del aparato deben proceder del fabricante, mediciones o un modelo validado.','No se infiere el caudal a partir de la potencia nominal del aparato.','No se certifica conformidad con UNE-EN 13384-1.']
  };
}
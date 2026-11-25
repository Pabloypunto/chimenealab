import { solveInstallation } from './solver.js';
import { applianceRequiredDraft } from './operating-point.js';
import { positive } from './units.js';
export function sampleOperatingCurves({ installation, applianceCurve, massFlowBoundsKgS, points=41 }) {
  const min=positive(massFlowBoundsKgS?.min,'Caudal mínimo'), max=positive(massFlowBoundsKgS?.max,'Caudal máximo');
  if (max<=min) throw new RangeError('El caudal máximo debe superar al mínimo.');
  positive(points,'Número de puntos');
  if (!Number.isInteger(points)||points<2||points>1001) throw new RangeError('El número de puntos debe ser un entero entre 2 y 1001.');
  const rows=[];
  for (let i=0;i<points;i++) {
    const massFlowKgS=min+(max-min)*i/(points-1), chimney=solveInstallation({...installation,massFlowKgS}), requiredDraftPa=applianceRequiredDraft({massFlowKgS,curve:applianceCurve});
    rows.push({massFlowKgS,massFlowKgH:massFlowKgS*3600,chimneyAvailableDraftPa:chimney.availableDraftPa,applianceRequiredDraftPa:requiredDraftPa,residualPa:chimney.availableDraftPa-requiredDraftPa});
  }
  return {model:'sampled-steady-operating-curves',units:{flow:'kg/s',pressure:'Pa'},points:rows,note:'Muestras estacionarias del modelo; no son mediciones ni garantizan estabilidad dinámica.'};
}
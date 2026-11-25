import { solveOperatingPoint } from './operating-point.js';
import { positive, finiteNumber } from './units.js';
function clone(value){return structuredClone(value);}
function readPath(object,path){return path.split('.').reduce((v,key)=>v?.[key],object);}
function writePath(object,path,value){const keys=path.split('.'),leaf=keys.pop(),target=keys.reduce((v,key)=>v[key],object);if(!target||!(leaf in target))throw new RangeError(`Parámetro no encontrado: ${path}`);target[leaf]=value;}
export function analyzeSensitivity({operatingPointInput,parameters,relativeStep=0.05}) {
  if(!Array.isArray(parameters)||parameters.length===0)throw new TypeError('Indica al menos un parámetro para el análisis.');
  positive(relativeStep,'Paso relativo');if(relativeStep>=1)throw new RangeError('El paso relativo debe ser inferior a 1.');
  const baseline=solveOperatingPoint(operatingPointInput);
  const rows=parameters.map(spec=>{
    if(!spec||typeof spec.path!=='string')throw new TypeError('Cada parámetro necesita una ruta path.');
    const original=readPath(operatingPointInput,spec.path);finiteNumber(original,`Valor de ${spec.path}`);
    let step;
    if(spec.absolute===true)step=positive(spec.step,`Paso de ${spec.path}`);
    else {const localRelativeStep=positive(spec.step??relativeStep,`Paso relativo de ${spec.path}`);if(localRelativeStep>=1)throw new RangeError(`El paso relativo de ${spec.path} debe ser inferior a 1.`);step=Math.abs(original)*localRelativeStep;}
    if(!(step>0))throw new RangeError(`El paso de ${spec.path} debe ser positivo; usa absolute:true si el valor base es cero.`);
    const run=value=>{const input=clone(operatingPointInput);writePath(input,spec.path,value);try{const result=solveOperatingPoint(input);return{converged:true,massFlowKgS:result.massFlowKgS,massFlowKgH:result.massFlowKgH,availableDraftPa:result.chimneyAvailableDraftPa,requiredDraftPa:result.applianceRequiredDraftPa};}catch(error){return{converged:false,error:error.message};}};
    const minusValue=original-step,plusValue=original+step,minus=run(minusValue),plus=run(plusValue);
    const sensitivity=minus.converged&&plus.converged?(plus.massFlowKgS-minus.massFlowKgS)/(plusValue-minusValue):null;
    const elasticity=sensitivity!==null&&baseline.massFlowKgS!==0?sensitivity*original/baseline.massFlowKgS:null;
    return{path:spec.path,baselineValue:original,minusValue,plusValue,minus,plus,derivativeKgSPerUnit:sensitivity,elasticity,elasticityMeaning:'Variación porcentual aproximada del caudal por variación porcentual del parámetro.'};
  });
  return{model:'one-at-a-time-local-sensitivity',baseline:{massFlowKgS:baseline.massFlowKgS,massFlowKgH:baseline.massFlowKgH,availableDraftPa:baseline.chimneyAvailableDraftPa,requiredDraftPa:baseline.applianceRequiredDraftPa},relativeStep,results:rows,limitations:['Análisis local de un parámetro cada vez; no captura interacciones entre variables.','Los resultados dependen de la curva del aparato y de las propiedades introducidas.','Un caso sin convergencia se devuelve como tal y no se sustituye por una extrapolación.']};
}
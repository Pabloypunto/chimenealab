import { positive, finiteNumber } from './units.js';
const FLOW_FACTORS = { 'kg/s':1, 'kg/h':1/3600, 'g/s':1/1000 };
export function massFlowToKgS(value,unit='kg/s') { positive(value,'Caudal másico'); const factor=FLOW_FACTORS[unit]; if(!factor)throw new RangeError(`Unidad de caudal no admitida: ${unit}. Usa kg/s, kg/h o g/s.`); return value*factor; }
export function createManufacturerRecord(input) {
  if(!input||typeof input!=='object')throw new TypeError('Faltan los datos del fabricante.');
  const {manufacturer,model,source,fuel,ratedPowerKW,flueGasTemperatureC,flueGasMassFlow,requiredDraftPa,outletDiameterMm,operatingCurve,testStandard,notes=''}=input;
  if(typeof manufacturer!=='string'||!manufacturer.trim())throw new TypeError('Indica el fabricante.');
  if(typeof model!=='string'||!model.trim())throw new TypeError('Indica el modelo del aparato.');
  if(!source||typeof source!=='object'||typeof source.reference!=='string'||!source.reference.trim())throw new TypeError('Indica la fuente trazable: ficha técnica, manual, informe de ensayo o medición.');
  if(source.url!==undefined&&typeof source.url!=='string')throw new TypeError('La URL de la fuente debe ser texto.');
  if(fuel!==undefined&&(typeof fuel!=='string'||!fuel.trim()))throw new TypeError('El combustible debe ser texto.');
  if(ratedPowerKW!==undefined)positive(ratedPowerKW,'Potencia nominal');
  if(flueGasTemperatureC!==undefined)finiteNumber(flueGasTemperatureC,'Temperatura de humos');
  if(requiredDraftPa!==undefined)positive(requiredDraftPa,'Tiro requerido',true);
  if(outletDiameterMm!==undefined)positive(outletDiameterMm,'Diámetro de salida');
  let normalizedFlow;
  if(flueGasMassFlow!==undefined) {
    if(!flueGasMassFlow||typeof flueGasMassFlow!=='object')throw new TypeError('El caudal másico debe incluir value y unit.');
    normalizedFlow={value:positive(flueGasMassFlow.value,'Caudal másico'),unit:flueGasMassFlow.unit,massFlowKgS:massFlowToKgS(flueGasMassFlow.value,flueGasMassFlow.unit)};
  }
  if(operatingCurve!==undefined)validateManufacturerCurve(operatingCurve);
  return Object.freeze({recordType:'chimney-appliance-manufacturer-data-v1',manufacturer:manufacturer.trim(),model:model.trim(),fuel:fuel?.trim()??null,source:Object.freeze({reference:source.reference.trim(),url:source.url?.trim()??null,documentDate:source.documentDate??null,page:source.page??null,testStandard:testStandard??source.testStandard??null}),ratedPowerKW:ratedPowerKW??null,flueGasTemperatureC:flueGasTemperatureC??null,flueGasMassFlow:normalizedFlow??null,requiredDraftPa:requiredDraftPa??null,outletDiameterMm:outletDiameterMm??null,operatingCurve:operatingCurve?structuredClone(operatingCurve):null,notes:String(notes)});
}
export function validateManufacturerCurve(curve) {
  if(!curve||!Array.isArray(curve.points)||curve.points.length<2)throw new TypeError('La curva del fabricante necesita al menos dos puntos.');
  const seen=new Set();
  curve.points.forEach((point,i)=>{positive(point.massFlowKgS,`Curva punto ${i+1}: caudal`);positive(point.requiredDraftPa,`Curva punto ${i+1}: tiro`,true);if(i&&point.massFlowKgS<=curve.points[i-1].massFlowKgS)throw new RangeError('Los caudales de la curva deben estar ordenados estrictamente.');const key=String(point.massFlowKgS);if(seen.has(key))throw new RangeError('La curva contiene caudales duplicados.');seen.add(key);});
  return true;
}
export function manufacturerRecordToApplianceCurve(record) {
  if(!record||record.recordType!=='chimney-appliance-manufacturer-data-v1')throw new TypeError('Registro de fabricante no reconocido.');
  if(!record.operatingCurve)throw new TypeError('El registro no contiene una curva de funcionamiento; un único tiro nominal no define una curva.');
  validateManufacturerCurve(record.operatingCurve);
  return{type:'tabulated-required-draft',points:record.operatingCurve.points.map(p=>({...p})),source:record.source,manufacturer:record.manufacturer,model:record.model};
}
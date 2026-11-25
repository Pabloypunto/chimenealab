import {
  solveOperatingPoint,
  sampleOperatingCurves,
  analyzeSensitivity,
  getManufacturerCatalog
} from './src/index.js';

const $ = (id) => document.getElementById(id);
const number = (id) => Number($(id).value);
const fmt = (value, digits = 2) => Number(value).toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
let lastInput = null;
let lastResult = null;
let lastCurves = null;
let toastTimer;

function readCurve() {
  const flows = [...document.querySelectorAll('.flow-point')].map(el => Number(el.value) / 1000);
  const drafts = [...document.querySelectorAll('.draft-point')].map(el => Number(el.value));
  if (flows.length < 2 || flows.length !== drafts.length) throw new Error('La curva necesita al menos dos puntos completos.');
  const points = flows.map((massFlowKgS, i) => ({ massFlowKgS, requiredDraftPa: drafts[i] }));
  points.forEach((point, i) => {
    if (!(point.massFlowKgS > 0) || !(point.requiredDraftPa >= 0)) throw new Error(`Revisa el punto ${i + 1} de la curva.`);
    if (i && point.massFlowKgS <= points[i - 1].massFlowKgS) throw new Error('Ordena los puntos de la curva por caudal, de menor a mayor.');
  });
  return points;
}

function readInput() {
  const curvePoints = readCurve();
  const installation = {
    segments: [{
      lengthM: number('length'), verticalRiseM: number('height'), diameterM: number('diameter'),
      roughnessM: number('roughness') / 1000, linearConductanceWmK: number('conductance'),
      fittings: number('k-loss') > 0 ? [{ k: number('k-loss') }] : []
    }],
    inletGasTemperatureC: number('gas-temp'), ambientTemperatureC: number('ambient-temp'),
    pressurePa: number('pressure'), roomDepressionPa: number('room-depression'),
    windContributionPa: number('wind'),
    gas: { specificGasConstant: number('gas-r'), cpJkgK: number('gas-cp'), dynamicViscosityPas: number('gas-mu') }
  };
  const curveSource = $('curve-source').value.trim();
  if (!curveSource) throw new Error('Indica la procedencia de la curva del aparato.');
  return {
    curveSource,
    installation,
    applianceCurve: { type: 'tabulated-required-draft', points: curvePoints },
    massFlowBoundsKgS: { min: curvePoints[0].massFlowKgS, max: curvePoints[curvePoints.length - 1].massFlowKgS },
    pressureTolerancePa: 0.01,
    scanIntervals: 100
  };
}

function toast(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
}

function chartSvg(rows) {
  const width = 520, height = 190, left = 43, right = 12, top = 12, bottom = 32;
  const plotW = width - left - right, plotH = height - top - bottom;
  const xs = rows.map(r => r.massFlowKgH);
  const ys = rows.flatMap(r => [r.chimneyAvailableDraftPa, r.applianceRequiredDraftPa]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(0, ...ys), maxY = Math.max(...ys) * 1.12;
  const x = v => left + (v - minX) / (maxX - minX) * plotW;
  const y = v => top + plotH - (v - minY) / (maxY - minY || 1) * plotH;
  const path = key => rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.massFlowKgH).toFixed(1)},${y(r[key]).toFixed(1)}`).join(' ');
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const val = minY + (maxY - minY) * i / 4, yy = y(val);
    grid += `<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}" stroke="#ffffff1b"/><text x="${left-8}" y="${yy+3}" text-anchor="end" fill="#87978a" font-size="9" font-family="DM Mono">${val.toFixed(0)}</text>`;
  }
  for (let i = 0; i <= 4; i++) {
    const val = minX + (maxX - minX) * i / 4, xx = x(val);
    grid += `<text x="${xx}" y="${height-9}" text-anchor="middle" fill="#87978a" font-size="9" font-family="DM Mono">${val.toFixed(0)}</text>`;
  }
  const pointX = lastResult.massFlowKgH, pointY = lastResult.chimneyAvailableDraftPa;
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Curvas de tiro disponible y requerido en función del caudal">${grid}<path d="${path('chimneyAvailableDraftPa')}" fill="none" stroke="#9bb89c" stroke-width="2.5"/><path d="${path('applianceRequiredDraftPa')}" fill="none" stroke="#e69a6d" stroke-width="2.5"/><line x1="${x(pointX)}" y1="${top}" x2="${x(pointX)}" y2="${top+plotH}" stroke="#f0eee2" stroke-dasharray="3 4" opacity=".65"/><circle cx="${x(pointX)}" cy="${y(pointY)}" r="4.5" fill="#f0eee2" stroke="#1d2b24" stroke-width="2"/><text x="${width/2}" y="${height-1}" text-anchor="middle" fill="#a8b5a7" font-size="8" font-family="DM Mono">CAUDAL · kg/h</text></svg>`;
}

function renderResult(result, curves) {
  $('empty-result').hidden = true; $('result-content').hidden = false;
  $('result-status').textContent = 'CONVERGIDO'; $('result-status').className = 'status-pill ok';
  $('out-flow').textContent = fmt(result.massFlowKgH, 1);
  $('out-flow-gs').textContent = `${fmt(result.massFlowKgS * 1000, 2)} g/s`;
  $('out-available').textContent = fmt(result.chimneyAvailableDraftPa, 2);
  $('out-required').textContent = fmt(result.applianceRequiredDraftPa, 2);
  $('out-temp').textContent = fmt(result.installation.outletGasTemperatureC, 1);
  $('out-velocity').textContent = fmt(result.installation.segments[0].velocityMS, 2);
  $('out-residual').textContent = `${fmt(result.pressureResidualPa, 3)} Pa`;
  $('balance-fill').style.width = `${Math.max(2, Math.min(100, 100 - Math.abs(result.pressureResidualPa) * 10))}%`;
  $('curve-chart').innerHTML = chartSvg(curves.points);
  const seg = result.installation.segments[0];
  $('details-content').innerHTML = `<table class="detail-table"><tbody>
    <tr><td>Tiro teórico</td><td>${fmt(result.installation.theoreticalDraftPa, 2)} Pa</td></tr>
    <tr><td>Pérdidas distribuidas</td><td>${fmt(result.installation.distributedLossPa, 2)} Pa</td></tr>
    <tr><td>Pérdidas localizadas</td><td>${fmt(result.installation.localLossPa, 2)} Pa</td></tr>
    <tr><td>Depresión del recinto</td><td>${fmt(result.installation.roomDepressionPa, 2)} Pa</td></tr>
    <tr><td>Contribución del viento</td><td>${fmt(result.installation.windContributionPa, 2)} Pa</td></tr>
    <tr><td>Temperatura media de gases</td><td>${fmt(seg.meanTemperatureC, 1)} °C</td></tr>
    <tr><td>Reynolds</td><td>${Math.round(seg.reynolds).toLocaleString('es-ES')}</td></tr>
    <tr><td>Factor Darcy</td><td>${fmt(seg.frictionFactorDarcy, 4)}</td></tr>
    <tr><td>Iteraciones de bisección</td><td>${result.iterations}</td></tr>
    <tr><td>Fuente de la curva</td><td>${lastInput.curveSource.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</td></tr>
    </tbody></table>`;
  $('sensitivity-content').innerHTML = '<button type="button" id="sensitivity-button" class="button button-outline">Analizar influencia de parámetros</button>';
  $('comparison-content').innerHTML = '<button type="button" id="comparison-button" class="button button-outline">Comparar Ø 130 · 150 · 180 mm</button>';
  $('details-content').hidden = true; $('details-toggle').setAttribute('aria-expanded', 'false'); $('details-toggle').querySelector('span').textContent = '＋';
}

function calculate(event) {
  event?.preventDefault();
  try {
    lastInput = readInput();
    lastResult = solveOperatingPoint(lastInput);
    lastCurves = sampleOperatingCurves({ ...lastInput, points: 41 });
    renderResult(lastResult, lastCurves);
    $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    toast('Cálculo completado. Revisa también las hipótesis y advertencias.');
  } catch (error) {
    $('result-status').textContent = 'REVISAR DATOS'; $('result-status').className = 'status-pill error';
    toast(error.message || 'No se ha podido resolver el cálculo.');
  }
}

function renderComparison() {
  if (!lastInput) return;
  const button = $('comparison-button'); if (button) { button.disabled = true; button.textContent = 'Comparando…'; }
  const options = [0.13, 0.15, 0.18];
  const rows = options.map(diameterM => {
    const input = structuredClone(lastInput);
    input.installation.segments[0].diameterM = diameterM;
    try { const result = solveOperatingPoint(input); return { diameterM, result, error: null }; }
    catch (error) { return { diameterM, result: null, error: error.message }; }
  });
  $('comparison-content').innerHTML = `<table class="detail-table"><tbody><tr><td>Diámetro</td><td>Caudal</td><td>Tiro útil</td></tr>${rows.map(row => row.result
    ? `<tr><td>${Math.round(row.diameterM*1000)} mm</td><td>${fmt(row.result.massFlowKgH,1)} kg/h</td><td>${fmt(row.result.chimneyAvailableDraftPa,2)} Pa</td></tr>`
    : `<tr><td>${Math.round(row.diameterM*1000)} mm</td><td colspan="2">Sin solución en rango</td></tr>`).join('')}</tbody></table><p class="helper" style="color:#87978a;margin-top:10px">Comparación manteniendo constantes los demás datos. No implica que un diámetro sea admisible ni recomendable; faltan comprobaciones normativas y del fabricante.</p>`;
}

function renderSensitivity() {
  if (!lastInput) return;
  const btn = $('sensitivity-button'); if (btn) { btn.disabled = true; btn.textContent = 'Calculando…'; }
  try {
    const report = analyzeSensitivity({ operatingPointInput: lastInput, parameters: [
      { path: 'installation.ambientTemperatureC' },
      { path: 'installation.segments.0.diameterM' },
      { path: 'installation.segments.0.linearConductanceWmK' },
      { path: 'installation.inletGasTemperatureC' }
    ] });
    const labels = {
      'installation.ambientTemperatureC': 'Temperatura exterior',
      'installation.segments.0.diameterM': 'Diámetro interior',
      'installation.segments.0.linearConductanceWmK': 'Conductancia térmica',
      'installation.inletGasTemperatureC': 'Temperatura de entrada de humos'
    };
    $('sensitivity-content').innerHTML = `<div class="sensitivity-list">${report.results.map(row => {
      const pct = row.elasticity === null ? '—' : `${row.elasticity > 0 ? '+' : ''}${fmt(row.elasticity, 3)}`;
      const low = row.minus.converged ? `${fmt(row.minus.massFlowKgH, 1)} kg/h` : 'sin solución';
      const high = row.plus.converged ? `${fmt(row.plus.massFlowKgH, 1)} kg/h` : 'sin solución';
      return `<div class="sensitivity-row"><span>${labels[row.path]}</span><strong>${pct}</strong><small>Caudal con −5 %: ${low} · con +5 %: ${high}</small></div>`;
    }).join('')}</div><p class="helper" style="color:#87978a;margin-top:12px">Elasticidad local de un parámetro cada vez. No representa incertidumbre estadística ni interacciones entre variables.</p>`;
  } catch (error) { toast(`Sensibilidad: ${error.message}`); if (btn) { btn.disabled = false; btn.textContent = 'Reintentar análisis'; } }
}

function renderCatalog() {
  const catalog = getManufacturerCatalog();
  $('catalog-grid').innerHTML = catalog.map(item => `<article class="catalog-card"><div class="catalog-card-top"><div><div class="catalog-brand">${item.manufacturer}</div><div class="catalog-model">${item.model}</div></div><span class="nominal-tag">PUNTO NOMINAL</span></div><div class="catalog-stats">
    <div><strong>${item.ratedPowerKW ?? '—'}</strong><span>Potencia · kW</span></div>
    <div><strong>${item.flueGasTemperatureC ?? '—'}°</strong><span>Humos · °C</span></div>
    <div><strong>${item.flueGasMassFlow?.value ?? '—'} ${item.flueGasMassFlow?.unit ?? ''}</strong><span>Caudal</span></div>
    <div><strong>${item.requiredDraftPa ?? '—'} Pa</strong><span>Tiro mínimo</span></div>
    <div><strong>${item.outletDiameterMm ?? '—'} mm</strong><span>Salida</span></div>
    <div><strong>${item.fuel ?? '—'}</strong><span>Combustible</span></div>
    </div><div class="catalog-source"><small>${item.source.reference}</small><a href="${item.source.url}" target="_blank" rel="noopener">Ver manual ↗</a></div></article>`).join('');
}

$('calc-form').addEventListener('submit', calculate);
$('reset-button').addEventListener('click', () => { $('calc-form').reset(); $('appliance-name').value = 'Estufa de leña · ejemplo'; $('curve-source').value = 'Curva sintética de demostración — sustituir por fuente real'; $('empty-result').hidden = false; $('result-content').hidden = true; $('result-status').textContent = 'PENDIENTE'; $('result-status').className = 'status-pill'; lastInput = lastResult = lastCurves = null; toast('Se han restablecido los valores demostrativos.'); });
$('details-toggle').addEventListener('click', () => { const open = $('details-content').hidden; $('details-content').hidden = !open; $('details-toggle').setAttribute('aria-expanded', String(open)); $('details-toggle').querySelector('span').textContent = open ? '−' : '＋'; });
document.addEventListener('click', (event) => { if (event.target?.id === 'sensitivity-button') renderSensitivity(); if (event.target?.id === 'comparison-button') renderComparison(); });
renderCatalog();

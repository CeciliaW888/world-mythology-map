// ============================================================
// globe.js — globe.gl 3D Globe with myth markers
// ============================================================

import { state, emit } from './app.js';

let globe = null;

function tryGlobe(container, rendererConfig) {
  return Globe({ rendererConfig })(container);
}

export function initGlobe(container) {
  // Detect WebGL availability before attempting globe init
  const probe = document.createElement('canvas');
  const hasWebGL = !!(probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl'));
  console.log('[globe] WebGL available:', hasWebGL);
  if (!hasWebGL) {
    throw new Error('WebGL unavailable — enable hardware acceleration: chrome://settings/system');
  }

  // Try progressively less-demanding renderer configs to handle Chrome WebGL restrictions
  const configs = [
    { antialias: true,  alpha: true, stencil: false },
    { antialias: false, alpha: true, stencil: false },
    { antialias: false, alpha: false },
    {},
  ];
  let lastErr = null;
  for (const cfg of configs) {
    try { globe = tryGlobe(container, cfg); lastErr = null; break; } catch (e) { lastErr = e; globe = null; }
  }
  if (!globe) throw lastErr || new Error('Error creating WebGL context.');

  globe
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-day.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundColor('rgba(0,0,0,0)')
    .atmosphereColor('#d4a96a')
    .atmosphereAltitude(0.18)
    .enablePointerInteraction(true)
    .width(container.clientWidth || window.innerWidth - 300)
    .height(container.clientHeight || window.innerHeight);

  // Warm antique sepia — matches reference aesthetic
  globe.renderer().domElement.style.filter =
    'sepia(0.45) saturate(0.8) brightness(0.97) contrast(1.05)';

  // Orbit controls
  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.35;
  globe.controls().enableZoom = true;
  globe.controls().minDistance = 180;
  globe.controls().maxDistance = 500;

  // Start view centered on Asia/Middle East where many myths originate
  globe.pointOfView({ lat: 25, lng: 60, altitude: 2.2 }, 0);

  window.addEventListener('resize', () => {
    globe
      .width(container.clientWidth || window.innerWidth - 300)
      .height(container.clientHeight || window.innerHeight);
  });

  // Load country borders + names (Natural Earth 110m, ~100KB GeoJSON)
  loadCountryBorders();
}

let countryFeatures = null;     // cached after first load
async function loadCountryBorders() {
  try {
    const res = await fetch('https://cdn.jsdelivr.net/gh/datasets/geo-countries@main/data/countries.geojson');
    const geo = await res.json();
    countryFeatures = (geo.features || []).filter(f => f.properties.ISO_A2 !== 'AQ'); // drop Antarctica
    if (state.showBorders) renderBorders(true);
  } catch (err) {
    console.warn('[globe] country borders failed to load:', err);
  }
}

export function renderBorders(show) {
  if (!globe) return;
  if (!show || !countryFeatures) {
    globe.polygonsData([]);
    return;
  }
  globe
    .polygonsData(countryFeatures)
    .polygonAltitude(0.006)
    .polygonCapColor(() => 'rgba(255, 220, 160, 0.04)')      // very faint warm fill
    .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
    .polygonStrokeColor(() => 'rgba(212, 160, 103, 0.65)')   // gold borders
    .polygonLabel(d => `<div class="country-tooltip">${d.properties.ADMIN || d.properties.NAME}</div>`);
}

// Spread myths that share a small lat/lng cell into a ring so the markers don't
// stack on top of each other. Returns each myth with `displayLat` / `displayLng`
// populated; the original `lat`/`lng` are preserved for things like flyTo.
function spreadOverlapping(myths) {
  const cellSize = 2.0;       // myths within ~2° are considered overlapping
  const baseRadius = 1.6;     // visual offset in degrees
  const cells = new Map();
  myths.forEach(m => {
    const key = `${Math.round(m.lat / cellSize)}_${Math.round(m.lng / cellSize)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(m);
  });
  const out = myths.map(m => ({ ...m, displayLat: m.lat, displayLng: m.lng }));
  const byId = new Map(out.map(m => [m.id, m]));
  cells.forEach(group => {
    if (group.length < 2) return;
    const cx = group.reduce((s, m) => s + m.lat, 0) / group.length;
    const cy = group.reduce((s, m) => s + m.lng, 0) / group.length;
    const r = baseRadius + (group.length - 2) * 0.4;
    const lonScale = 1 / Math.max(0.2, Math.cos(cx * Math.PI / 180));
    group.forEach((m, i) => {
      const a = (i / group.length) * Math.PI * 2;
      const d = byId.get(m.id);
      d.displayLat = cx + Math.sin(a) * r;
      d.displayLng = cy + Math.cos(a) * r * lonScale;
    });
  });
  return out;
}

export function renderMarkers(myths, countries) {
  if (!globe) return;

  const countryColorMap = {};
  countries.forEach(c => { countryColorMap[c.name] = c.color; });

  const spread = spreadOverlapping(myths);

  // Replace dots with circular myth-image markers anchored at each myth's lat/lng.
  // globe.gl's htmlElementsData fades elements behind the globe automatically.
  globe
    .pointsData([])      // hide old dots
    .htmlElementsData(spread)
    .htmlLat(d => d.displayLat)
    .htmlLng(d => d.displayLng)
    .htmlAltitude(0.005)
    .htmlElement(d => {
      const color = countryColorMap[d.country] || '#d5ab5b';
      const el = document.createElement('div');
      el.className = 'myth-marker';
      el.title = `${d.name} · ${d.en}`;
      el.style.cssText = [
        'width:28px', 'height:28px',
        'border-radius:50%',
        `background-image:url('${d.img}')`,
        'background-size:cover',
        'background-position:center',
        `border:2px solid ${color}`,
        'box-shadow:0 0 6px rgba(0,0,0,0.55)',
        'cursor:pointer',
        'transform:translate(-50%,-50%)',
        'transition:transform 0.18s ease, box-shadow 0.18s ease',
        'pointer-events:auto',
      ].join(';');
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'translate(-50%,-50%) scale(1.7)';
        el.style.boxShadow = `0 0 14px ${color}, 0 0 4px rgba(0,0,0,0.6)`;
        el.style.zIndex = '100';
        globe.controls().autoRotate = false;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(-50%,-50%) scale(1)';
        el.style.boxShadow = '0 0 6px rgba(0,0,0,0.55)';
        el.style.zIndex = '';
        globe.controls().autoRotate = true;
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        emit('markerClick', { mythId: d.id, country: d.country });
      });
      return el;
    });

  if (state.showLabels) {
    globe
      .labelsData(spread)
      .labelLat(d => d.displayLat)
      .labelLng(d => d.displayLng)
      .labelText(d => state.lang === 'zh' ? d.name : (d.en || d.name))
      .labelSize(0.5)
      .labelColor(() => 'rgba(245,230,200,0.75)')
      .labelResolution(2)
      .labelAltitude(0.02);
  } else {
    globe.labelsData([]);
  }
}

export function renderConnections(myths) {
  if (!globe) return;

  if (!state.showLines) {
    globe.arcsData([]);
    return;
  }

  const arcs = [];
  const drawn = new Set();
  myths.forEach(myth => {
    if (!myth.related) return;
    myth.related.forEach(rid => {
      const key = [Math.min(myth.id, rid), Math.max(myth.id, rid)].join('-');
      if (drawn.has(key)) return;
      drawn.add(key);
      const target = state.allMyths.find(m => m.id === rid);
      if (!target || !myths.includes(target)) return;
      arcs.push({
        startLat: myth.lat, startLng: myth.lng,
        endLat: target.lat, endLng: target.lng,
      });
    });
  });

  globe
    .arcsData(arcs)
    .arcStartLat(d => d.startLat)
    .arcStartLng(d => d.startLng)
    .arcEndLat(d => d.endLat)
    .arcEndLng(d => d.endLng)
    .arcColor(() => ['rgba(255,215,0,0.08)', 'rgba(255,215,0,0.55)'])
    .arcStroke(0.3)
    .arcAltitude(0.15)
    .arcDashLength(0.5)
    .arcDashGap(0.15)
    .arcDashAnimateTime(2000);
}

export function flyTo(lat, lng) {
  if (!globe) return;
  globe.controls().autoRotate = false;
  globe.pointOfView({ lat, lng, altitude: 1.8 }, 800);
}

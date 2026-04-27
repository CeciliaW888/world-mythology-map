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
}

export function renderMarkers(myths, countries) {
  if (!globe) return;

  const countryColorMap = {};
  countries.forEach(c => { countryColorMap[c.name] = c.color; });

  globe
    .pointsData(myths)
    .pointLat(d => d.lat)
    .pointLng(d => d.lng)
    .pointColor(d => countryColorMap[d.country] || '#d5ab5b')
    .pointRadius(0.35)
    .pointAltitude(0.01)
    .pointResolution(12)
    .onPointClick((point) => {
      emit('markerClick', { mythId: point.id, country: point.country });
    })
    .onPointHover((point) => {
      // Pause auto-rotate while hovering
      globe.controls().autoRotate = !point;
    });

  if (state.showLabels) {
    globe
      .labelsData(myths)
      .labelLat(d => d.lat)
      .labelLng(d => d.lng)
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

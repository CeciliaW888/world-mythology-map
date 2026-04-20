// ============================================================
// globe.js — Three.js 3D Globe with myth markers
// ============================================================

import { state, emit } from './app.js';

let scene, camera, renderer, globe, markers = [], labelSprites = [];
let raycaster, mouse;
let isDragging = false, prevMouse = { x: 0, y: 0 };
let targetRotation = null;
let autoRotate = true;
let stars;

const GLOBE_RADIUS = 5;
const MARKER_SIZE = 0.13;

export function initGlobe(canvas) {
  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.z = 14;

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xb8dcf0, 1);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
  sunLight.position.set(5, 3, 5);
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0x88ccff, 0.4);
  rimLight.position.set(-5, -2, -5);
  scene.add(rimLight);

  // Starfield
  createStarfield();

  // Globe
  createGlobe();

  // Raycaster for click detection
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Events
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: true });
  canvas.addEventListener('click', onClick);

  // Touch events
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);

  window.addEventListener('resize', onResize);

  // Start render loop
  animate();
}

function createStarfield() {
  const starsGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(3000 * 3);
  const sizes = new Float32Array(3000);

  for (let i = 0; i < 3000; i++) {
    const r = 50 + Math.random() * 100;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = Math.random() * 2 + 0.5;
  }

  starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starsGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const starsMat = new THREE.PointsMaterial({
    color: 0xf5e6c8,
    size: 0.15,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true
  });

  stars = new THREE.Points(starsGeo, starsMat);
  scene.add(stars);
}

function createGlobe() {
  // Earth sphere with a dark, elegant texture
  const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);

  // Ocean-blue globe
  const material = new THREE.MeshPhongMaterial({
    color: 0x1a78c2,
    emissive: 0x0a3a6a,
    specular: 0x88ccff,
    shininess: 40,
    transparent: true,
    opacity: 0.97,
  });

  globe = new THREE.Mesh(geometry, material);
  scene.add(globe);

  // Atmosphere glow
  const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.02, 64, 64);
  const atmosMat = new THREE.MeshBasicMaterial({
    color: 0x64b5f6,
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide
  });
  const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
  scene.add(atmosphere);

  // Grid lines (latitude/longitude)
  addGridLines();
}

function addGridLines() {
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.25
  });

  // Latitude lines
  for (let lat = -60; lat <= 60; lat += 30) {
    const phi = (90 - lat) * Math.PI / 180;
    const points = [];
    for (let lng = 0; lng <= 360; lng += 5) {
      const theta = lng * Math.PI / 180;
      const r = GLOBE_RADIUS * 1.001;
      points.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, lineMaterial);
    globe.add(line);
  }

  // Longitude lines
  for (let lng = 0; lng < 360; lng += 30) {
    const theta = lng * Math.PI / 180;
    const points = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      const phi = (90 - lat) * Math.PI / 180;
      const r = GLOBE_RADIUS * 1.001;
      points.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, lineMaterial);
    globe.add(line);
  }
}

// Convert lat/lng to 3D position on globe
export function latLngToVector3(lat, lng, radius) {
  const r = radius || GLOBE_RADIUS;
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

// Place myth markers on globe
export function renderMarkers(myths, countries) {
  // Clear existing markers
  markers.forEach(m => globe.remove(m));
  labelSprites.forEach(l => globe.remove(l));
  markers = [];
  labelSprites = [];

  const countryColorMap = {};
  countries.forEach(c => { countryColorMap[c.name] = c.color; });

  myths.forEach(myth => {
    const pos = latLngToVector3(myth.lat, myth.lng, GLOBE_RADIUS * 1.005);
    const color = countryColorMap[myth.country] || '#d5ab5b';

    // Glowing marker dot
    const geo = new THREE.SphereGeometry(MARKER_SIZE, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.9
    });
    const marker = new THREE.Mesh(geo, mat);
    marker.position.copy(pos);
    marker.userData = { mythId: myth.id, country: myth.country };
    globe.add(marker);
    markers.push(marker);

    // Glow ring
    const ringGeo = new THREE.RingGeometry(MARKER_SIZE * 1.2, MARKER_SIZE * 2, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    globe.add(ring);
    markers.push(ring);

    // Label (if enabled)
    if (state.showLabels) {
      const canvas2d = document.createElement('canvas');
      const ctx = canvas2d.getContext('2d');
      canvas2d.width = 256;
      canvas2d.height = 48;
      ctx.font = '20px Georgia, serif';
      ctx.fillStyle = 'rgba(245,230,200,0.7)';
      ctx.textAlign = 'left';
      ctx.fillText(myth.name, 4, 30);

      const texture = new THREE.CanvasTexture(canvas2d);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.6 });
      const sprite = new THREE.Sprite(spriteMat);
      const labelPos = latLngToVector3(myth.lat, myth.lng, GLOBE_RADIUS * 1.04);
      sprite.position.copy(labelPos);
      sprite.scale.set(1.2, 0.22, 1);
      globe.add(sprite);
      labelSprites.push(sprite);
    }
  });
}

// Render connection lines between related myths
export function renderConnections(myths) {
  // Remove existing
  globe.children.filter(c => c.userData && c.userData.isConnection).forEach(c => globe.remove(c));

  if (!state.showLines) return;

  const drawn = new Set();
  myths.forEach(myth => {
    if (!myth.related) return;
    myth.related.forEach(rid => {
      const key = [Math.min(myth.id, rid), Math.max(myth.id, rid)].join('-');
      if (drawn.has(key)) return;
      drawn.add(key);

      const target = state.allMyths.find(m => m.id === rid);
      if (!target) return;
      if (!myths.includes(target)) return;

      // Great circle arc
      const start = latLngToVector3(myth.lat, myth.lng, GLOBE_RADIUS * 1.003);
      const end = latLngToVector3(target.lat, target.lng, GLOBE_RADIUS * 1.003);
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS * 1.15);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(30);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.5
      });
      const line = new THREE.Line(geo, mat);
      line.userData = { isConnection: true };
      globe.add(line);
    });
  });
}

// Rotate globe to face a specific lat/lng
export function flyTo(lat, lng) {
  autoRotate = false;
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  targetRotation = {
    x: phi - Math.PI / 2,
    y: -(theta - Math.PI)
  };
}

// Mouse interaction
function onMouseDown(e) {
  isDragging = true;
  autoRotate = false;
  prevMouse = { x: e.clientX, y: e.clientY };
}

function onMouseMove(e) {
  if (!isDragging) return;
  const dx = e.clientX - prevMouse.x;
  const dy = e.clientY - prevMouse.y;
  globe.rotation.y += dx * 0.005;
  globe.rotation.x += dy * 0.005;
  globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
  prevMouse = { x: e.clientX, y: e.clientY };
  targetRotation = null;
}

function onMouseUp() {
  isDragging = false;
}

function onClick(e) {
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(markers.filter(m => m.userData.mythId));

  if (intersects.length > 0) {
    const mythId = intersects[0].object.userData.mythId;
    const country = intersects[0].object.userData.country;
    emit('markerClick', { mythId, country });
  }
}

function onWheel(e) {
  camera.position.z += e.deltaY * 0.005;
  camera.position.z = Math.max(8, Math.min(25, camera.position.z));
}

// Touch events
let touchStart = null;
function onTouchStart(e) {
  if (e.touches.length === 1) {
    isDragging = true;
    autoRotate = false;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
}
function onTouchMove(e) {
  if (!isDragging || !touchStart) return;
  e.preventDefault();
  const dx = e.touches[0].clientX - touchStart.x;
  const dy = e.touches[0].clientY - touchStart.y;
  globe.rotation.y += dx * 0.005;
  globe.rotation.x += dy * 0.005;
  globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globe.rotation.x));
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  targetRotation = null;
}
function onTouchEnd() {
  isDragging = false;
  touchStart = null;
}

function onResize() {
  const canvas = renderer.domElement;
  const container = canvas.parentElement || document.body;
  const w = container.clientWidth || (window.innerWidth - 300);
  const h = container.clientHeight || window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

// Smooth rotation toward target
function animate() {
  requestAnimationFrame(animate);

  if (autoRotate) {
    globe.rotation.y += 0.001;
  } else if (targetRotation) {
    globe.rotation.x += (targetRotation.x - globe.rotation.x) * 0.04;
    globe.rotation.y += (targetRotation.y - globe.rotation.y) * 0.04;
  }

  // Subtle star twinkle
  if (stars) {
    stars.rotation.y += 0.0001;
  }

  // Pulse markers
  const time = Date.now() * 0.002;
  markers.forEach((m, i) => {
    if (m.geometry && m.geometry.type === 'RingGeometry') {
      m.material.opacity = 0.1 + Math.sin(time + i) * 0.08;
    }
  });

  renderer.render(scene, camera);
}

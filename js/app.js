// ============================================================
// app.js — Main entry point, state management, event bus
// ============================================================

// --- Shared State ---
export const state = {
  allMyths: [],
  allCountries: [],
  filteredMyths: [],
  selectedCountry: null,
  selectedMyth: null,
  activeThemes: [],
  activeEra: null,
  showLabels: false,
  showLines: true,
  searchQuery: '',
  lang: 'zh',        // current display language: 'zh' or 'en'
  audioPlaying: false,
  currentAudioCountry: null
};

// --- Event Bus ---
const listeners = {};

export function on(event, fn) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(fn);
}

export function emit(event, data) {
  if (listeners[event]) {
    listeners[event].forEach(fn => fn(data));
  }
}

// --- Data Loading ---
async function loadData() {
  try {
    const [mythsRes, countriesRes] = await Promise.all([
      fetch('./data/myths.json'),
      fetch('./data/countries.json')
    ]);
    if (!mythsRes.ok) throw new Error(`myths.json: ${mythsRes.status}`);
    if (!countriesRes.ok) throw new Error(`countries.json: ${countriesRes.status}`);
    state.allMyths = await mythsRes.json();
    state.allCountries = await countriesRes.json();
    state.filteredMyths = [...state.allMyths];
    console.log(`Loaded ${state.allMyths.length} myths, ${state.allCountries.length} countries`);
  } catch (err) {
    console.error('Failed to load data:', err);
    throw err;
  }
}

// --- Filter Logic ---
export function applyFilters() {
  let result = [...state.allMyths];

  // Country filter
  if (state.selectedCountry) {
    result = result.filter(m => m.country === state.selectedCountry);
  }

  // Theme filter
  if (state.activeThemes.length > 0) {
    result = result.filter(m =>
      m.themes && m.themes.some(t => state.activeThemes.includes(t))
    );
  }

  // Era filter
  if (state.activeEra) {
    result = result.filter(m => m.era === state.activeEra);
  }

  // Search filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    result = result.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.en.toLowerCase().includes(q) ||
      m.country.toLowerCase().includes(q)
    );
  }

  state.filteredMyths = result;
  emit('filterChange', result);
}

// --- Hide loading screen (call on success or failure) ---
function hideLoading(error) {
  const loadingEl = document.querySelector('.loading-screen');
  if (!loadingEl) return;
  if (error) {
    const sub = loadingEl.querySelector('.loading-sub');
    const spinner = loadingEl.querySelector('.loading-spinner');
    if (sub) sub.textContent = 'Error: ' + error.message;
    if (spinner) spinner.style.display = 'none';
    return; // keep visible so user sees the error
  }
  setTimeout(() => {
    loadingEl.classList.add('fade-out');
    setTimeout(() => loadingEl.remove(), 700);
  }, 600);
}

// --- Initialisation ---
export async function initApp() {
  try {
    // Load data
    await loadData();

    // Wait for THREE.js to be available (loaded via <script> tag)
    if (typeof THREE === 'undefined') {
      throw new Error('Three.js not loaded — check network connection');
    }

    // Import modules dynamically to avoid circular deps
    const { initGlobe, renderMarkers, renderConnections } = await import('./globe.js');
    const { initSidebar } = await import('./sidebar.js');
    const { initPanel } = await import('./panel.js');
    const { initFilters } = await import('./filters.js');
    const { initAudio } = await import('./audio.js');

    // Init globe
    const canvas = document.getElementById('globe-canvas');
    initGlobe(canvas);

    // Init UI components
    initSidebar();
    initPanel();
    initFilters();
    initAudio();

    // Initial render
    renderMarkers(state.filteredMyths, state.allCountries);
    renderConnections(state.filteredMyths);

    // Update header stats
    updateHeaderStats();

    // Listen for filter changes to re-render
    on('filterChange', (myths) => {
      renderMarkers(myths, state.allCountries);
      renderConnections(myths);
      updateHeaderStats();
    });

    // Listen for country selection
    on('countrySelect', (countryName) => {
      state.selectedCountry = countryName;
      applyFilters();

      const display = document.querySelector('.country-display');
      const country = state.allCountries.find(c => c.name === countryName);
      if (display && country) {
        display.textContent = `${country.zh} · ${country.name}`;
        display.classList.add('visible');
      }
    });

    // Listen for country deselect
    on('countryDeselect', () => {
      state.selectedCountry = null;
      const display = document.querySelector('.country-display');
      if (display) {
        display.textContent = '';
        display.classList.remove('visible');
      }
      applyFilters();
    });

    // Listen for marker clicks on globe
    on('markerClick', ({ mythId, country }) => {
      const myth = state.allMyths.find(m => m.id === mythId);
      if (myth) {
        emit('mythSelect', myth);
      }
    });

    console.log('App initialized successfully');
    hideLoading();

  } catch (err) {
    console.error('App init failed:', err);
    hideLoading(err);
  }
}

function updateHeaderStats() {
  const statsEl = document.querySelector('.header .stats');
  if (statsEl) {
    const countries = new Set(state.filteredMyths.map(m => m.country)).size;
    statsEl.textContent = `${state.filteredMyths.length} stories · ${countries} countries`;
  }
}

// Boot
document.addEventListener('DOMContentLoaded', initApp);

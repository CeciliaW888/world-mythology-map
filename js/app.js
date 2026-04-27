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

    // Wait for globe.gl to be available (loaded via <script> tag)
    if (typeof Globe === 'undefined') {
      throw new Error('globe.gl not loaded — check network connection');
    }

    // Import modules dynamically to avoid circular deps
    const { initGlobe, renderMarkers, renderConnections } = await import('./globe.js');
    const { initSidebar, updateSidebarLang } = await import('./sidebar.js');
    const { initPanel } = await import('./panel.js');
    const { initFilters, updateFilterLang } = await import('./filters.js');
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
    updateHeaderLang();

    // Language toggle button
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        state.lang = state.lang === 'zh' ? 'en' : 'zh';
        langBtn.textContent = state.lang === 'zh' ? '中' : 'EN';
        updateHeaderLang();
        updateHeaderStats();
        updateFilterLang();
        updateSidebarLang();
        emit('langChange', state.lang); // panel + audio listen to this
      });
    }

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
      updateCountryDisplay();
    });

    // Listen for country deselect
    on('countryDeselect', () => {
      state.selectedCountry = null;
      const display = document.querySelector('.country-display');
      if (display) { display.textContent = ''; display.classList.remove('visible'); }
      applyFilters();
    });

    on('langChange', () => updateCountryDisplay());

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
  if (!statsEl) return;
  const count = state.filteredMyths.length;
  const countries = new Set(state.filteredMyths.map(m => m.country)).size;
  statsEl.textContent = state.lang === 'zh'
    ? `${count} 个故事 · ${countries} 个国家`
    : `${count} stories · ${countries} countries`;
}

function updateHeaderLang() {
  const h1 = document.querySelector('.header h1');
  if (h1) h1.textContent = state.lang === 'zh' ? '世界神话地图' : 'World Mythology Map';
}

function updateCountryDisplay() {
  const display = document.querySelector('.country-display');
  if (!display || !state.selectedCountry) return;
  const country = state.allCountries.find(c => c.name === state.selectedCountry);
  if (country) {
    display.textContent = state.lang === 'zh' ? country.zh : country.name;
    display.classList.add('visible');
  }
}

// Boot
document.addEventListener('DOMContentLoaded', initApp);

// ============================================================
// filters.js — Filter bar: themes, eras, toggles
// ============================================================

import { state, emit, on, applyFilters } from './app.js';
import { renderConnections } from './globe.js';

const ALL_THEMES = ['fire', 'flood', 'love', 'sun', 'moon', 'dragon'];
const ALL_ERAS = ['ancient', 'classical', 'medieval', 'modern'];

const THEME_LABELS = {
  zh: { fire: '火', flood: '水', love: '爱', sun: '日', moon: '月', dragon: '龙' },
  en: { fire: 'Fire', flood: 'Water', love: 'Love', sun: 'Sun', moon: 'Moon', dragon: 'Dragon' }
};
const ERA_LABELS = {
  zh: { ancient: '上古', classical: '古典', medieval: '中世纪', modern: '近代' },
  en: { ancient: 'Ancient', classical: 'Classical', medieval: 'Medieval', modern: 'Modern' }
};

export function initFilters() {
  renderFilterButtons();
  setupToggles();
  on('langChange', () => rerenderLabels());
}

function renderFilterButtons() {
  const themeRow = document.getElementById('theme-filters');
  const eraRow = document.getElementById('era-filters');
  if (!themeRow || !eraRow) return;

  ALL_THEMES.forEach(theme => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.theme = theme;
    btn.textContent = THEME_LABELS[state.lang][theme];
    if (state.activeThemes.includes(theme)) btn.classList.add('active');
    btn.addEventListener('click', () => {
      const idx = state.activeThemes.indexOf(theme);
      if (idx >= 0) { state.activeThemes.splice(idx, 1); btn.classList.remove('active'); }
      else { state.activeThemes.push(theme); btn.classList.add('active'); }
      applyFilters();
    });
    themeRow.appendChild(btn);
  });

  ALL_ERAS.forEach(era => {
    const btn = document.createElement('button');
    btn.className = 'era-btn';
    btn.dataset.era = era;
    btn.textContent = ERA_LABELS[state.lang][era];
    if (state.activeEra === era) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (state.activeEra === era) {
        state.activeEra = null;
        btn.classList.remove('active');
      } else {
        state.activeEra = era;
        eraRow.querySelectorAll('.era-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      applyFilters();
    });
    eraRow.appendChild(btn);
  });
}

function rerenderLabels() {
  document.querySelectorAll('.filter-btn[data-theme]').forEach(btn => {
    btn.textContent = THEME_LABELS[state.lang][btn.dataset.theme];
  });
  document.querySelectorAll('.era-btn[data-era]').forEach(btn => {
    btn.textContent = ERA_LABELS[state.lang][btn.dataset.era];
  });
  const toggleLabels = document.querySelectorAll('.toggle-label');
  const labels = state.lang === 'zh' ? ['标签', '连线'] : ['Labels', 'Lines'];
  toggleLabels.forEach((el, i) => { if (labels[i]) el.textContent = labels[i]; });
}

function setupToggles() {
  const labelsToggle = document.getElementById('toggle-labels');
  const linesToggle = document.getElementById('toggle-lines');
  if (labelsToggle) {
    labelsToggle.checked = state.showLabels;
    labelsToggle.addEventListener('change', () => { state.showLabels = labelsToggle.checked; applyFilters(); });
  }
  if (linesToggle) {
    linesToggle.checked = state.showLines;
    linesToggle.addEventListener('change', () => { state.showLines = linesToggle.checked; renderConnections(state.filteredMyths); });
  }
}

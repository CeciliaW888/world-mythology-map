// ============================================================
// filters.js — Filter bar: themes, eras, toggles
// ============================================================

import { state, emit, applyFilters } from './app.js';
import { renderConnections } from './globe.js';

const ALL_THEMES = ['fire', 'flood', 'love', 'sun', 'moon', 'dragon'];
const ALL_ERAS = ['ancient', 'classical', 'medieval', 'modern'];

const THEME_LABELS = {
  fire: '火 Fire',
  flood: '水 Water',
  love: '爱 Love',
  sun: '日 Sun',
  moon: '月 Moon',
  dragon: '龙 Dragon'
};

const ERA_LABELS = {
  ancient: '上古 Ancient',
  classical: '古典 Classical',
  medieval: '中世纪 Medieval',
  modern: '近代 Modern'
};

export function initFilters() {
  renderFilterButtons();
  setupToggles();
}

function renderFilterButtons() {
  const themeRow = document.getElementById('theme-filters');
  const eraRow = document.getElementById('era-filters');

  if (!themeRow || !eraRow) return;

  // Theme buttons
  ALL_THEMES.forEach(theme => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = THEME_LABELS[theme];
    btn.setAttribute('data-theme', theme);

    btn.addEventListener('click', () => {
      const idx = state.activeThemes.indexOf(theme);
      if (idx >= 0) {
        state.activeThemes.splice(idx, 1);
        btn.classList.remove('active');
      } else {
        state.activeThemes.push(theme);
        btn.classList.add('active');
      }
      applyFilters();
    });

    themeRow.appendChild(btn);
  });

  // Era buttons
  ALL_ERAS.forEach(era => {
    const btn = document.createElement('button');
    btn.className = 'era-btn';
    btn.textContent = ERA_LABELS[era];
    btn.setAttribute('data-era', era);

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

function setupToggles() {
  const labelsToggle = document.getElementById('toggle-labels');
  const linesToggle = document.getElementById('toggle-lines');

  if (labelsToggle) {
    labelsToggle.checked = state.showLabels;
    labelsToggle.addEventListener('change', () => {
      state.showLabels = labelsToggle.checked;
      applyFilters(); // re-render markers with/without labels
    });
  }

  if (linesToggle) {
    linesToggle.checked = state.showLines;
    linesToggle.addEventListener('change', () => {
      state.showLines = linesToggle.checked;
      renderConnections(state.filteredMyths);
    });
  }
}

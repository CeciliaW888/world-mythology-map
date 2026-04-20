// ============================================================
// sidebar.js — Right sidebar: search, country info, story grid
// ============================================================

import { state, emit, on, applyFilters } from './app.js';

export function updateSidebarLang() {
  renderStoryCards(state.filteredMyths);
  updateCountrySection();
  updateSidebarStaticText();
}

export function initSidebar() {
  const searchInput = document.querySelector('.sidebar-search');
  const storyGrid = document.querySelector('.story-grid');
  const countrySection = document.querySelector('.sidebar-country');
  const backBtn = document.querySelector('.sidebar-back');

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      applyFilters();
    });
  }

  // Back button
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      emit('countryDeselect');
    });
  }

  on('filterChange', (myths) => { renderStoryCards(myths); updateCountrySection(); });
  on('countrySelect', () => updateCountrySection());
  on('countryDeselect', () => updateCountrySection());

  renderStoryCards(state.filteredMyths);
  updateCountrySection();
}

function updateSidebarStaticText() {
  const search = document.querySelector('.sidebar-search');
  if (search) search.placeholder = state.lang === 'zh' ? '搜索神话...' : 'Search myths...';
  const backBtn = document.querySelector('.sidebar-back');
  if (backBtn) backBtn.textContent = state.lang === 'zh' ? '← 全部' : '← All';
  document.querySelectorAll('.sidebar-stat .label').forEach(el => {
    if (el.textContent === 'Myths' || el.textContent === '神话') el.textContent = state.lang === 'zh' ? '神话' : 'Myths';
    if (el.textContent === 'Themes' || el.textContent === '主题') el.textContent = state.lang === 'zh' ? '主题' : 'Themes';
  });
}

function updateCountrySection() {
  const section = document.querySelector('.sidebar-country');
  if (!section) return;

  if (state.selectedCountry) {
    section.style.display = 'block';
    const country = state.allCountries.find(c => c.name === state.selectedCountry);
    const nameEl = section.querySelector('.sidebar-country-name');
    if (nameEl && country) {
      nameEl.textContent = state.lang === 'zh' ? country.zh : country.name;
    }

    const countryMyths = state.allMyths.filter(m => m.country === state.selectedCountry);
    const themes = new Set();
    countryMyths.forEach(m => m.themes && m.themes.forEach(t => themes.add(t)));

    const numEl = section.querySelector('.myth-count');
    const themeEl = section.querySelector('.theme-count');
    if (numEl) numEl.textContent = countryMyths.length;
    if (themeEl) themeEl.textContent = themes.size;
  } else {
    section.style.display = 'none';
  }
}

function renderStoryCards(myths) {
  const grid = document.querySelector('.story-grid');
  if (!grid) return;

  grid.innerHTML = '';

  myths.forEach(myth => {
    const card = document.createElement('div');
    card.className = 'story-card';
    card.setAttribute('data-myth-id', myth.id);

    // Image or placeholder
    let imgHTML;
    if (myth.img) {
      imgHTML = `<img class="story-card-img" src="${myth.img}" alt="${myth.en}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="story-card-placeholder" style="display:none;">${myth.name.charAt(0)}</div>`;
    } else {
      imgHTML = `<div class="story-card-placeholder">${myth.name.charAt(0)}</div>`;
    }

    card.innerHTML = `
      ${imgHTML}
      <div class="story-card-title">${state.lang === 'zh' ? myth.name : myth.en}</div>
    `;

    card.addEventListener('click', () => {
      emit('mythSelect', myth);

      // Also select country and fly to location
      if (!state.selectedCountry || state.selectedCountry !== myth.country) {
        emit('countrySelect', myth.country);
      }
    });

    grid.appendChild(card);
  });
}

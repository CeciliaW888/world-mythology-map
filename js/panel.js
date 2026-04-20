// ============================================================
// panel.js — Bottom story detail panel
// ============================================================

import { state, emit, on } from './app.js';
import { flyTo } from './globe.js';

let currentMyth = null;

export function initPanel() {
  const panel = document.querySelector('.story-panel');
  const closeBtn = document.querySelector('.story-panel-close');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
      currentMyth = null;
      state.selectedMyth = null;
    });
  }

  // Listen for myth selection
  on('mythSelect', (myth) => {
    currentMyth = myth;
    state.selectedMyth = myth;
    showPanel(myth);
    flyTo(myth.lat, myth.lng);
  });
}

function showPanel(myth) {
  const panel = document.querySelector('.story-panel');
  if (!panel) return;

  // Image
  const imgContainer = panel.querySelector('.story-panel-img-container');
  if (imgContainer) {
    if (myth.img) {
      imgContainer.innerHTML = `<img class="story-panel-img" src="${myth.img}" alt="${myth.en}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'story-panel-img-placeholder\\'>${myth.name.charAt(0)}</div>';">`;
    } else {
      imgContainer.innerHTML = `<div class="story-panel-img-placeholder">${myth.name.charAt(0)}</div>`;
    }
  }

  // Title
  const titleEl = panel.querySelector('.story-panel-title');
  if (titleEl) {
    titleEl.textContent = `${myth.name} · ${myth.en}`;
  }

  // Tags
  const tagsEl = panel.querySelector('.story-panel-tags');
  if (tagsEl) {
    const country = state.allCountries.find(c => c.name === myth.country);
    const color = country ? country.color : '#d5ab5b';
    let tagsHTML = `<span class="story-panel-tag"><span class="dot" style="background:${color}"></span>${myth.country}</span>`;
    if (myth.era) {
      tagsHTML += `<span class="story-panel-tag">${myth.era}</span>`;
    }
    if (myth.type) {
      tagsHTML += `<span class="story-panel-tag">${myth.type}</span>`;
    }
    if (myth.themes) {
      myth.themes.forEach(t => {
        tagsHTML += `<span class="story-panel-tag">#${t}</span>`;
      });
    }
    tagsEl.innerHTML = tagsHTML;
  }

  // Story text
  const textEl = panel.querySelector('.story-panel-text');
  if (textEl) {
    textEl.textContent = state.lang === 'zh' ? myth.zh : myth.en2;
  }

  // Language buttons
  const langsEl = panel.querySelector('.story-panel-langs');
  if (langsEl) {
    langsEl.innerHTML = '';
    const langs = myth.langs || ['中文', 'English'];
    langs.forEach(lang => {
      const btn = document.createElement('button');
      btn.className = 'lang-btn';
      btn.textContent = lang;

      const isZh = lang === '中文';
      if ((isZh && state.lang === 'zh') || (!isZh && state.lang === 'en')) {
        btn.classList.add('active');
      }

      btn.addEventListener('click', () => {
        state.lang = isZh ? 'zh' : 'en';
        // Update text
        if (textEl) {
          textEl.textContent = state.lang === 'zh' ? myth.zh : myth.en2;
        }
        if (titleEl) {
          titleEl.textContent = `${myth.name} · ${myth.en}`;
        }
        // Update active states
        langsEl.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Refresh sidebar cards with new language
        emit('filterChange', state.filteredMyths);
      });
      langsEl.appendChild(btn);
    });
  }

  panel.classList.add('open');
}

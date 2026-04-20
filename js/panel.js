// ============================================================
// panel.js — Bottom story detail panel + narration controls
// ============================================================

import { state, emit, on } from './app.js';
import { flyTo } from './globe.js';

let currentMyth = null;
let narrationState = 'idle'; // idle | playing | paused | ended

export function initPanel() {
  const panel = document.querySelector('.story-panel');
  const closeBtn = document.querySelector('.story-panel-close');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
      emit('narrationStop');
      currentMyth = null;
      state.selectedMyth = null;
    });
  }

  // Listen for myth selection
  on('mythSelect', (myth) => {
    currentMyth = myth;
    state.selectedMyth = myth;
    narrationState = 'idle';
    showPanel(myth);
    flyTo(myth.lat, myth.lng);
  });

  // Listen for narration state changes
  on('narrationStateChange', ({ state: nState }) => {
    narrationState = nState;
    updateNarrationUI();
  });

  // Listen for narration progress
  on('narrationProgress', (pct) => {
    const bar = document.querySelector('.narration-progress-fill');
    if (bar) bar.style.width = pct + '%';
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
    if (myth.era) tagsHTML += `<span class="story-panel-tag">${myth.era}</span>`;
    if (myth.type) tagsHTML += `<span class="story-panel-tag">${myth.type}</span>`;
    if (myth.themes) {
      myth.themes.forEach(t => { tagsHTML += `<span class="story-panel-tag">#${t}</span>`; });
    }
    tagsEl.innerHTML = tagsHTML;
  }

  // Story text
  const textEl = panel.querySelector('.story-panel-text');
  if (textEl) {
    textEl.textContent = state.lang === 'zh' ? myth.zh : myth.en2;
  }

  // Narration player
  renderNarrationPlayer(panel, myth);

  // Language buttons + narration play
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
        if (textEl) textEl.textContent = state.lang === 'zh' ? myth.zh : myth.en2;
        if (titleEl) titleEl.textContent = `${myth.name} · ${myth.en}`;
        langsEl.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Stop narration on language switch
        emit('narrationStop');
        narrationState = 'idle';
        updateNarrationUI();
        emit('filterChange', state.filteredMyths);
      });
      langsEl.appendChild(btn);
    });
  }

  panel.classList.add('open');
}

function renderNarrationPlayer(panel, myth) {
  let player = panel.querySelector('.narration-player');
  if (!player) {
    // Create the player element if it doesn't exist
    player = document.createElement('div');
    player.className = 'narration-player';
    // Insert before the language buttons
    const langs = panel.querySelector('.story-panel-langs');
    if (langs) {
      langs.parentElement.insertBefore(player, langs);
    } else {
      panel.querySelector('.story-panel-content').appendChild(player);
    }
  }

  player.innerHTML = `
    <button class="narration-play-btn" title="Listen to this story">
      <span class="narration-icon">&#9654;</span>
      <span class="narration-label">Listen</span>
    </button>
    <div class="narration-progress">
      <div class="narration-progress-fill" style="width:0%"></div>
    </div>
    <span class="narration-status"></span>
  `;

  const playBtn = player.querySelector('.narration-play-btn');
  playBtn.addEventListener('click', () => {
    if (narrationState === 'playing') {
      emit('narrationPause');
    } else if (narrationState === 'paused') {
      emit('narrationResume');
    } else {
      emit('narrationPlay', currentMyth);
    }
  });
}

function updateNarrationUI() {
  const icon = document.querySelector('.narration-icon');
  const label = document.querySelector('.narration-label');
  const statusEl = document.querySelector('.narration-status');
  const btn = document.querySelector('.narration-play-btn');
  if (!icon || !label) return;

  switch (narrationState) {
    case 'playing':
      icon.innerHTML = '&#10074;&#10074;';  // pause icon
      label.textContent = 'Pause';
      if (statusEl) statusEl.textContent = '';
      if (btn) btn.classList.add('active');
      break;
    case 'paused':
      icon.innerHTML = '&#9654;';  // play icon
      label.textContent = 'Resume';
      if (statusEl) statusEl.textContent = 'paused';
      if (btn) btn.classList.remove('active');
      break;
    case 'ended':
      icon.innerHTML = '&#8635;';  // replay icon
      label.textContent = 'Replay';
      if (statusEl) statusEl.textContent = '';
      if (btn) btn.classList.remove('active');
      break;
    case 'error':
    case 'unavailable':
      icon.innerHTML = '&#9654;';
      label.textContent = 'Listen';
      if (statusEl) statusEl.textContent = 'unavailable';
      if (btn) btn.classList.remove('active');
      break;
    default:
      icon.innerHTML = '&#9654;';
      label.textContent = 'Listen';
      if (statusEl) statusEl.textContent = '';
      if (btn) btn.classList.remove('active');
  }
}

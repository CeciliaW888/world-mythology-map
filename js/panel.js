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

  on('mythSelect', (myth) => {
    currentMyth = myth;
    state.selectedMyth = myth;
    narrationState = 'idle';
    showPanel(myth);
    flyTo(myth.lat, myth.lng);
  });

  on('langChange', () => {
    if (currentMyth) {
      const textEl = document.querySelector('.story-panel-text');
      if (textEl) textEl.textContent = state.lang === 'zh' ? currentMyth.zh : currentMyth.en2;
      emit('narrationStop');
      narrationState = 'idle';
      updateNarrationUI();
    }
  });

  on('narrationStateChange', ({ state: nState }) => {
    narrationState = nState;
    updateNarrationUI();
  });

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

  // Title — both scripts
  const titleEl = panel.querySelector('.story-panel-title');
  if (titleEl) {
    titleEl.innerHTML = `<span class="title-zh">${myth.name}</span><span class="title-sep"> · </span><span class="title-en">${myth.en}</span>`;
  }

  // Tags
  const tagsEl = panel.querySelector('.story-panel-tags');
  if (tagsEl) {
    const country = state.allCountries.find(c => c.name === myth.country);
    const color = country ? country.color : '#4a90d9';
    let tagsHTML = `<span class="story-panel-tag"><span class="dot" style="background:${color}"></span>${myth.country}</span>`;
    if (myth.era) tagsHTML += `<span class="story-panel-tag">${myth.era}</span>`;
    if (myth.type) tagsHTML += `<span class="story-panel-tag">${myth.type}</span>`;
    if (myth.themes) {
      myth.themes.forEach(t => { tagsHTML += `<span class="story-panel-tag">#${t}</span>`; });
    }
    tagsEl.innerHTML = tagsHTML;
  }

  // Story text — follows global language
  const textEl = panel.querySelector('.story-panel-text');
  if (textEl) textEl.textContent = state.lang === 'zh' ? myth.zh : myth.en2;

  // Narration player
  renderNarrationPlayer(panel, myth);

  panel.classList.add('open');
}


function renderNarrationPlayer(panel, myth) {
  let player = panel.querySelector('.narration-player');
  if (!player) {
    player = document.createElement('div');
    player.className = 'narration-player';
    const content = panel.querySelector('.story-panel-content');
    if (content) content.appendChild(player);
  }

  player.innerHTML = `
    <button class="narration-play-btn" title="Listen to this story">
      <span class="narration-icon">&#9654;</span>
      <span class="narration-label">Listen</span>
    </button>
    <div class="narration-progress">
      <div class="narration-progress-fill" style="width:0%"></div>
    </div>
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
  const player = document.querySelector('.narration-player');
  if (!player) return;

  const icon = document.querySelector('.narration-icon');
  const label = document.querySelector('.narration-label');
  const btn = document.querySelector('.narration-play-btn');

  if (!icon || !label) return;

  btn.classList.remove('active');
  switch (narrationState) {
    case 'playing':
      icon.innerHTML = '&#10074;&#10074;';
      label.textContent = 'Pause';
      btn.classList.add('active');
      break;
    case 'paused':
      icon.innerHTML = '&#9654;';
      label.textContent = 'Resume';
      break;
    case 'ended':
      icon.innerHTML = '&#8635;';
      label.textContent = 'Replay';
      break;
    default:
      icon.innerHTML = '&#9654;';
      label.textContent = 'Listen';
  }
}

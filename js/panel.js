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

  // Bilingual story text — always show both
  const textEl = panel.querySelector('.story-panel-text');
  if (textEl) {
    textEl.innerHTML = '';

    if (myth.zh) {
      const zhBlock = document.createElement('div');
      zhBlock.className = 'story-text-block story-text-zh';
      zhBlock.innerHTML = `<span class="story-lang-label">中文</span><p>${myth.zh}</p>`;
      textEl.appendChild(zhBlock);
    }

    if (myth.en2) {
      const enBlock = document.createElement('div');
      enBlock.className = 'story-text-block story-text-en';
      enBlock.innerHTML = `<span class="story-lang-label">English</span><p>${myth.en2}</p>`;
      textEl.appendChild(enBlock);
    }
  }

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
    <span class="narration-read-label">Read aloud:</span>
    <button class="narration-play-btn" data-lang="zh" title="Listen in Chinese">
      <span class="narration-icon">&#9654;</span> 中文
    </button>
    <button class="narration-play-btn" data-lang="en" title="Listen in English">
      <span class="narration-icon">&#9654;</span> English
    </button>
    <div class="narration-progress">
      <div class="narration-progress-fill" style="width:0%"></div>
    </div>
  `;

  player.querySelectorAll('.narration-play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;

      if (narrationState === 'playing' && state.lang === lang) {
        emit('narrationPause');
      } else if (narrationState === 'paused' && state.lang === lang) {
        emit('narrationResume');
      } else {
        state.lang = lang;
        emit('narrationStop');
        narrationState = 'idle';
        updateNarrationUI();
        emit('narrationPlay', currentMyth);
      }
    });
  });
}

function updateNarrationUI() {
  const player = document.querySelector('.narration-player');
  if (!player) return;

  const btns = player.querySelectorAll('.narration-play-btn');
  const bar = player.querySelector('.narration-progress-fill');

  btns.forEach(btn => {
    const isActive = btn.dataset.lang === state.lang;
    const icon = btn.querySelector('.narration-icon');

    btn.classList.remove('active');
    if (icon) icon.innerHTML = '&#9654;';

    if (isActive) {
      switch (narrationState) {
        case 'playing':
          btn.classList.add('active');
          if (icon) icon.innerHTML = '&#10074;&#10074;';
          break;
        case 'paused':
          if (icon) icon.innerHTML = '&#9654;';
          break;
        case 'ended':
          if (icon) icon.innerHTML = '&#8635;';
          break;
      }
    }
  });

  if (bar && narrationState === 'idle') bar.style.width = '0%';
}

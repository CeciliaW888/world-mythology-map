// ============================================================
// audio.js — Background music + per-myth narration player
// ============================================================

import { state, on, emit } from './app.js';

// --- Background music state ---
let bgAudio = null;
let isMuted = false;

// --- Web Audio API for ambient tones ---
let audioCtx = null;
let toneOsc = null;
let toneGain = null;
let toneNoteInterval = null;

// --- Narration state ---
let narrationAudio = null;
let narrationUtterance = null;
let isNarrating = false;
let narrationProgress = 0;
let progressInterval = null;

// Cultural scale mappings (Hz)
const SCALES = {
  China:        [262, 294, 330, 392, 440],
  Japan:        [262, 277, 330, 392, 415],
  Greece:       [262, 277, 330, 349, 392, 415, 494],
  Egypt:        [262, 277, 330, 370, 392, 415, 494],
  India:        [262, 294, 330, 370, 392, 440, 494],
  Norway:       [262, 294, 330, 370, 392, 440, 494],
  Iraq:         [262, 277, 330, 370, 392, 415, 494],
  Turkey:       [262, 277, 330, 370, 392, 415, 494],
  'Saudi Arabia': [262, 277, 330, 370, 392, 415, 494],
  default:      [262, 294, 330, 392, 440],
};

export function initAudio() {
  setupMusicControls();
  setupNarrationListeners();
}

// ============================================================
// BACKGROUND MUSIC (country-level)
// ============================================================

function setupMusicControls() {
  const playBtn = document.querySelector('.audio-btn');
  const infoEl = document.querySelector('.audio-info');

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (bgAudio && state.audioPlaying) {
        stopMusic();
      } else if (state.currentAudioCountry) {
        playCountryMusic(state.currentAudioCountry);
      }
    });
  }

  on('countrySelect', (countryName) => {
    state.currentAudioCountry = countryName;
    const country = state.allCountries.find(c => c.name === countryName);
    if (country && infoEl) {
      infoEl.textContent = `${country.instrument} · ${country.zh}`;
    }
    if (!isMuted) playAmbientTone(countryName);
  });

  on('countryDeselect', () => {
    stopMusic();
    stopAmbientTone();
    if (infoEl) infoEl.textContent = '';
    state.currentAudioCountry = null;
  });

  on('mythSelect', (myth) => {
    if (state.currentAudioCountry !== myth.country) {
      state.currentAudioCountry = myth.country;
      const country = state.allCountries.find(c => c.name === myth.country);
      if (country && infoEl) {
        infoEl.textContent = `${country.instrument} · ${country.zh}`;
      }
      if (!isMuted) playAmbientTone(myth.country);
    }
  });
}

function playAmbientTone(countryName) {
  stopAmbientTone();

  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const scale = SCALES[countryName] || SCALES.default;

    toneGain = audioCtx.createGain();
    toneGain.gain.setValueAtTime(0, audioCtx.currentTime);
    toneGain.gain.linearRampToValueAtTime(0.07, audioCtx.currentTime + 1.5);
    toneGain.connect(audioCtx.destination);

    toneOsc = audioCtx.createOscillator();
    toneOsc.type = 'sine';
    toneOsc.frequency.setValueAtTime(scale[0], audioCtx.currentTime);
    toneOsc.connect(toneGain);
    toneOsc.start();

    let noteIndex = 0;
    toneNoteInterval = setInterval(() => {
      noteIndex = (noteIndex + 1) % scale.length;
      if (toneOsc) {
        toneOsc.frequency.setTargetAtTime(scale[noteIndex], audioCtx.currentTime, 0.4);
      }
    }, 2200);

    state.audioPlaying = true;
    const playBtn = document.querySelector('.audio-btn');
    if (playBtn) { playBtn.classList.add('playing'); playBtn.innerHTML = '◼'; }
  } catch (err) {
    console.warn('Ambient tone failed:', err);
  }
}

function stopAmbientTone() {
  if (toneNoteInterval) { clearInterval(toneNoteInterval); toneNoteInterval = null; }
  if (toneOsc) {
    try {
      if (toneGain && audioCtx) {
        toneGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
        toneOsc.stop(audioCtx.currentTime + 0.8);
      } else {
        toneOsc.stop();
      }
    } catch (_) {}
    toneOsc = null;
  }
  toneGain = null;
}

async function playCountryMusic(countryName) {
  const country = state.allCountries.find(c => c.name === countryName);
  if (!country || !country.musicUrl) return;

  // Fade out current
  if (bgAudio) {
    fadeOutAudio(bgAudio, 1.0);
  }

  try {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = country.musicUrl;
    audio.loop = true;
    audio.volume = 0;

    await new Promise((resolve, reject) => {
      audio.addEventListener('canplaythrough', resolve, { once: true });
      audio.addEventListener('error', reject, { once: true });
      audio.load();
      setTimeout(resolve, 5000);
    });

    await audio.play();
    fadeInAudio(audio, 0.3, 1.5);

    bgAudio = audio;
    state.audioPlaying = true;

    const playBtn = document.querySelector('.audio-btn');
    if (playBtn) {
      playBtn.classList.add('playing');
      playBtn.innerHTML = '◼';
    }
  } catch (err) {
    console.warn('Music failed for', countryName, err);
  }
}

function stopMusic() {
  if (bgAudio) {
    fadeOutAudio(bgAudio, 0.5);
    bgAudio = null;
  }
  stopAmbientTone();
  state.audioPlaying = false;
  const playBtn = document.querySelector('.audio-btn');
  if (playBtn) {
    playBtn.classList.remove('playing');
    playBtn.innerHTML = '♪';
  }
}

// ============================================================
// NARRATION (per-myth)
// ============================================================

function setupNarrationListeners() {
  // When narration play is requested
  on('narrationPlay', (myth) => {
    playNarration(myth);
  });

  on('narrationPause', () => {
    pauseNarration();
  });

  on('narrationResume', () => {
    resumeNarration();
  });

  on('narrationStop', () => {
    stopNarration();
  });

  // Stop narration when panel closes or new myth selected
  on('mythSelect', () => {
    stopNarration();
  });
}

function playNarration(myth) {
  stopNarration();

  const text = state.lang === 'zh' ? myth.zh : myth.en2;
  if (!text) return;

  if (bgAudio) fadeInAudio(bgAudio, 0.08, 0.8);

  // Start TTS immediately — preserves iOS user-gesture context
  playNarrationWithSpeech(text, myth);

  // Silently try pre-generated MP3 in background.
  // If it loads, cancel TTS and switch to the higher-quality file.
  const lang = state.lang === 'zh' ? 'zh' : 'en';
  const url = `audio/narration/${myth.id}_${lang}.mp3`;
  const probe = new Audio();
  probe.src = url;
  probe.addEventListener('canplaythrough', async () => {
    if (!isNarrating) return; // narration already stopped
    window.speechSynthesis.cancel();
    narrationUtterance = null;
    narrationAudio = probe;
    try {
      await probe.play();
      isNarrating = true;
      startProgressTracking();
      emit('narrationStateChange', { state: 'playing', myth });
      probe.addEventListener('ended', () => {
        isNarrating = false;
        emit('narrationStateChange', { state: 'ended', myth });
        stopProgressTracking();
        if (bgAudio) fadeInAudio(bgAudio, 0.3, 1.0);
      }, { once: true });
    } catch (_) {}
  }, { once: true });
  // 404 errors on probe are silently ignored — TTS is already running
}

function playNarrationWithSpeech(text, myth) {
  if (!('speechSynthesis' in window)) {
    console.warn('Web Speech API not available');
    emit('narrationStateChange', { state: 'unavailable', myth });
    return;
  }

  // Cancel any existing speech
  window.speechSynthesis.cancel();

  narrationUtterance = new SpeechSynthesisUtterance(text);

  // Pick appropriate voice
  const lang = state.lang === 'zh' ? 'zh-CN' : 'en-US';
  narrationUtterance.lang = lang;
  narrationUtterance.rate = state.lang === 'zh' ? 0.9 : 0.85;
  narrationUtterance.pitch = 1.0;
  narrationUtterance.volume = 1.0;

  // Try to find a good voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.lang.startsWith(lang.split('-')[0]) && (v.name.includes('Natural') || v.name.includes('Enhanced') || v.name.includes('Premium'))
  ) || voices.find(v => v.lang.startsWith(lang.split('-')[0]));

  if (preferred) {
    narrationUtterance.voice = preferred;
  }

  narrationUtterance.onstart = () => {
    isNarrating = true;
    emit('narrationStateChange', { state: 'playing', myth });
    // Simulate progress for TTS (estimate ~5 chars/sec for zh, ~15 chars/sec for en)
    startTTSProgressEstimate(text);
  };

  narrationUtterance.onend = () => {
    isNarrating = false;
    emit('narrationStateChange', { state: 'ended', myth });
    stopProgressTracking();
    if (bgAudio) fadeInAudio(bgAudio, 0.3, 1.0);
  };

  narrationUtterance.onerror = (e) => {
    console.warn('Speech synthesis error:', e);
    isNarrating = false;
    emit('narrationStateChange', { state: 'error', myth });
    stopProgressTracking();
    if (bgAudio) fadeInAudio(bgAudio, 0.3, 1.0);
  };

  window.speechSynthesis.speak(narrationUtterance);
}

function pauseNarration() {
  if (narrationAudio && isNarrating) {
    narrationAudio.pause();
    isNarrating = false;
    emit('narrationStateChange', { state: 'paused' });
    stopProgressTracking();
  } else if (narrationUtterance && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    isNarrating = false;
    emit('narrationStateChange', { state: 'paused' });
    stopProgressTracking();
  }
}

function resumeNarration() {
  if (narrationAudio && narrationAudio.paused && narrationAudio.src) {
    narrationAudio.play();
    isNarrating = true;
    emit('narrationStateChange', { state: 'playing' });
    startProgressTracking();
  } else if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    isNarrating = true;
    emit('narrationStateChange', { state: 'playing' });
  }
}

function stopNarration() {
  if (narrationAudio) {
    narrationAudio.pause();
    narrationAudio.src = '';
    narrationAudio = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  narrationUtterance = null;
  isNarrating = false;
  stopProgressTracking();

  // Restore background music
  if (bgAudio) fadeInAudio(bgAudio, 0.3, 1.0);
}

// --- Progress tracking ---

function startProgressTracking() {
  stopProgressTracking();
  progressInterval = setInterval(() => {
    if (narrationAudio && narrationAudio.duration) {
      const pct = (narrationAudio.currentTime / narrationAudio.duration) * 100;
      emit('narrationProgress', pct);
    }
  }, 200);
}

function startTTSProgressEstimate(text) {
  stopProgressTracking();
  const charsPerSec = state.lang === 'zh' ? 4 : 12;
  const estimatedDuration = text.length / charsPerSec;
  const startTime = Date.now();

  progressInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const pct = Math.min((elapsed / estimatedDuration) * 100, 95);
    emit('narrationProgress', pct);
  }, 200);
}

function stopProgressTracking() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
  emit('narrationProgress', 0);
}

// ============================================================
// SHARED UTILITIES
// ============================================================

function fadeInAudio(audio, targetVolume, duration) {
  const steps = 20;
  const stepTime = (duration * 1000) / steps;
  const startVol = audio.volume;
  const diff = targetVolume - startVol;
  let step = 0;

  const interval = setInterval(() => {
    step++;
    audio.volume = Math.max(0, Math.min(1, startVol + (diff * step / steps)));
    if (step >= steps) clearInterval(interval);
  }, stepTime);
}

function fadeOutAudio(audio, duration) {
  const steps = 20;
  const stepTime = (duration * 1000) / steps;
  const startVol = audio.volume;
  let step = 0;

  const interval = setInterval(() => {
    step++;
    audio.volume = Math.max(0, startVol * (1 - step / steps));
    if (step >= steps) {
      clearInterval(interval);
      audio.pause();
      audio.src = '';
    }
  }, stepTime);
}

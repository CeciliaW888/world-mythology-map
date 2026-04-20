// ============================================================
// audio.js — Country music playback with Web Audio API
// ============================================================

import { state, on } from './app.js';

let audioContext = null;
let currentAudio = null;
let currentSource = null;
let gainNode = null;
let isMuted = false;

export function initAudio() {
  const playBtn = document.querySelector('.audio-btn');
  const infoEl = document.querySelector('.audio-info');

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 0.4;
      }

      if (state.audioPlaying) {
        stopAudio();
        playBtn.classList.remove('playing');
        playBtn.innerHTML = '♪';
        if (infoEl) infoEl.textContent = '';
      } else if (state.currentAudioCountry) {
        playCountryMusic(state.currentAudioCountry);
      }
    });
  }

  // When a country is selected, prepare its music
  on('countrySelect', (countryName) => {
    state.currentAudioCountry = countryName;
    const country = state.allCountries.find(c => c.name === countryName);
    if (country && infoEl) {
      infoEl.textContent = `${country.instrument} · ${country.zh}`;
    }
    // Auto-play on country select
    if (audioContext && !isMuted) {
      playCountryMusic(countryName);
    }
  });

  on('countryDeselect', () => {
    stopAudio();
    if (infoEl) infoEl.textContent = '';
    state.currentAudioCountry = null;
  });

  // Also play music when a myth is selected
  on('mythSelect', (myth) => {
    if (state.currentAudioCountry !== myth.country) {
      state.currentAudioCountry = myth.country;
      const country = state.allCountries.find(c => c.name === myth.country);
      if (country && infoEl) {
        infoEl.textContent = `${country.instrument} · ${country.zh}`;
      }
      if (audioContext && !isMuted) {
        playCountryMusic(myth.country);
      }
    }
  });
}

async function playCountryMusic(countryName) {
  const country = state.allCountries.find(c => c.name === countryName);
  if (!country || !country.musicUrl) return;

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.4;
  }

  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  // Crossfade: fade out current
  if (currentAudio) {
    fadeOut(currentAudio, 1.0);
  }

  try {
    // Use HTML5 Audio for streaming (more reliable with Wikimedia)
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = country.musicUrl;
    audio.loop = true;
    audio.volume = 0;

    await new Promise((resolve, reject) => {
      audio.addEventListener('canplaythrough', resolve, { once: true });
      audio.addEventListener('error', reject, { once: true });
      audio.load();
      // Timeout fallback
      setTimeout(resolve, 5000);
    });

    await audio.play();

    // Fade in
    fadeIn(audio, 0.4, 1.5);

    currentAudio = audio;
    state.audioPlaying = true;

    const playBtn = document.querySelector('.audio-btn');
    if (playBtn) {
      playBtn.classList.add('playing');
      playBtn.innerHTML = '◼';
    }
  } catch (err) {
    console.warn('Audio playback failed for', countryName, err);
    // Fallback: generate ambient tone in cultural scale
    playFallbackTone(countryName);
  }
}

function fadeIn(audio, targetVolume, duration) {
  const steps = 20;
  const stepTime = (duration * 1000) / steps;
  const increment = targetVolume / steps;
  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;
    audio.volume = Math.min(increment * currentStep, targetVolume);
    if (currentStep >= steps) clearInterval(interval);
  }, stepTime);
}

function fadeOut(audio, duration) {
  const steps = 20;
  const stepTime = (duration * 1000) / steps;
  const startVolume = audio.volume;
  const decrement = startVolume / steps;
  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;
    audio.volume = Math.max(startVolume - decrement * currentStep, 0);
    if (currentStep >= steps) {
      clearInterval(interval);
      audio.pause();
      audio.src = '';
    }
  }, stepTime);
}

function stopAudio() {
  if (currentAudio) {
    fadeOut(currentAudio, 0.5);
    currentAudio = null;
  }
  state.audioPlaying = false;

  const playBtn = document.querySelector('.audio-btn');
  if (playBtn) {
    playBtn.classList.remove('playing');
    playBtn.innerHTML = '♪';
  }
}

// Fallback: simple ambient tone using cultural scales
function playFallbackTone(countryName) {
  if (!audioContext) return;

  // Cultural scale mappings (frequencies in Hz)
  const scales = {
    China:       [262, 294, 330, 392, 440],       // Pentatonic C D E G A
    Japan:       [262, 277, 330, 392, 415],       // In scale
    Greece:      [262, 277, 330, 349, 392, 415, 494], // Phrygian
    Egypt:       [262, 277, 330, 370, 392, 415, 494], // Hijaz
    India:       [262, 294, 330, 370, 392, 440, 494], // Raga-like
    Norway:      [262, 294, 330, 370, 392, 440, 494], // Lydian
    Iraq:        [262, 277, 330, 370, 392, 415, 494], // Maqam
    default:     [262, 294, 330, 392, 440]            // Pentatonic
  };

  const scale = scales[countryName] || scales.default;
  const osc = audioContext.createOscillator();
  const oscGain = audioContext.createGain();

  osc.type = 'sine';
  osc.frequency.value = scale[0];
  oscGain.gain.value = 0;

  osc.connect(oscGain);
  oscGain.connect(audioContext.destination);
  osc.start();

  // Fade in
  oscGain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 1);

  // Play a gentle arpeggio
  let noteIndex = 0;
  const noteInterval = setInterval(() => {
    noteIndex = (noteIndex + 1) % scale.length;
    osc.frequency.setTargetAtTime(scale[noteIndex], audioContext.currentTime, 0.3);
  }, 2000);

  // Store reference for cleanup
  currentSource = { osc, gain: oscGain, interval: noteInterval };
  state.audioPlaying = true;
}

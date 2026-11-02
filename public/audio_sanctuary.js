// audio_sanctuary.js - Child-Safe Calm Oceanic, Nature Soundscapes & Brain/Chakra Frequencies
// Uses Web Audio API for 100% offline synthesis with volume limiting for young children's delicate ears.

const LittleAudio = (() => {
  let audioCtx = null;
  let masterGain = null;
  let currentSound = null;
  let timerInterval = null;
  let remainingSeconds = 0;
  let isPlaying = false;

  // Safe volume limit: Max 0.45 to prevent loud playback for kids
  const MAX_SAFE_VOLUME = 0.45;
  let currentVolume = 0.22; // default gentle whisper level

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function setVolume(val) {
    const floatVal = parseFloat(val);
    currentVolume = Math.min(MAX_SAFE_VOLUME, Math.max(0, floatVal));
    if (masterGain && audioCtx) {
      masterGain.gain.setTargetAtTime(currentVolume, audioCtx.currentTime, 0.05);
    }
  }

  function stop() {
    if (currentSound && typeof currentSound.stop === 'function') {
      try {
        currentSound.stop();
      } catch (e) {
        console.warn('Error stopping sound:', e);
      }
    }
    currentSound = null;
    isPlaying = false;
    clearInterval(timerInterval);
    timerInterval = null;
    updateUI();
  }

  // 1. Ocean Waves Synthesizer
  function createOceanWaves(ctx) {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    // Generate Pink Noise for soft water roar
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter to simulate ocean surf depth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, ctx.currentTime);

    // LFO for wave swelling cycle (~8 seconds per wave)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(220, ctx.currentTime);
    lfo.connect(filter.frequency);

    // Wave swell amplitude gain
    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.35, ctx.currentTime);

    const ampLfo = ctx.createOscillator();
    ampLfo.type = 'sine';
    ampLfo.frequency.setValueAtTime(0.12, ctx.currentTime);
    const ampLfoGain = ctx.createGain();
    ampLfoGain.gain.setValueAtTime(0.25, ctx.currentTime);

    ampLfo.connect(waveGain.gain);

    noise.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(masterGain);

    noise.start();
    lfo.start();
    ampLfo.start();

    return {
      stop: () => {
        try {
          waveGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
          setTimeout(() => {
            noise.stop();
            lfo.stop();
            ampLfo.stop();
            noise.disconnect();
            filter.disconnect();
          }, 500);
        } catch (_) {}
      }
    };
  }

  // 2. Gentle Forest Stream & Breeze
  function createForestStream(ctx) {
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Bandpass filter for running brook water
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, ctx.currentTime);
    filter.Q.setValueAtTime(1.4, ctx.currentTime);

    // Soft flutter
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.4, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(150, ctx.currentTime);
    lfo.connect(filter.frequency);

    // Gentle wind tone
    const breezeOsc = ctx.createOscillator();
    breezeOsc.type = 'sine';
    breezeOsc.frequency.setValueAtTime(180, ctx.currentTime);
    const breezeGain = ctx.createGain();
    breezeGain.gain.setValueAtTime(0.04, ctx.currentTime);

    noise.connect(filter);
    filter.connect(masterGain);
    breezeOsc.connect(breezeGain);
    breezeGain.connect(masterGain);

    noise.start();
    lfo.start();
    breezeOsc.start();

    return {
      stop: () => {
        try {
          noise.stop();
          lfo.stop();
          breezeOsc.stop();
        } catch (_) {}
      }
    };
  }

  // 3. Gentle Soft Rain
  function createGentleRain(ctx) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.95 * b1 + white * 0.1;
      b2 = 0.85 * b2 + white * 0.25;
      data[i] = (b0 + b1 + b2) * 0.2;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);

    noise.connect(filter);
    filter.connect(masterGain);
    noise.start();

    return {
      stop: () => {
        try {
          noise.stop();
        } catch (_) {}
      }
    };
  }

  // 4. Pure Chakra Resonant Tone Synthesizer
  function createChakraTone(ctx, baseFreq) {
    // Primary pure healing sine tone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);

    // Gentle octave harmonic for warmth and resonance
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.28, ctx.currentTime);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.06, ctx.currentTime); // very soft harmonic

    // Gentle calm tremolo for soothing brain relaxation
    const tremolo = ctx.createOscillator();
    tremolo.type = 'sine';
    tremolo.frequency.setValueAtTime(0.25, ctx.currentTime); // 4-second breath cycle

    const tremoloGain = ctx.createGain();
    tremoloGain.gain.setValueAtTime(0.04, ctx.currentTime);
    tremolo.connect(tremoloGain);
    tremoloGain.connect(gain1.gain);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(masterGain);
    gain2.connect(masterGain);

    osc1.start();
    osc2.start();
    tremolo.start();

    return {
      stop: () => {
        try {
          gain1.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
          gain2.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
          setTimeout(() => {
            osc1.stop();
            osc2.stop();
            tremolo.stop();
            osc1.disconnect();
            osc2.disconnect();
          }, 400);
        } catch (_) {}
      }
    };
  }

  // 5. Brainwave Binaural Pulse (Alpha: 10Hz, Theta: 6Hz)
  function createBrainwavePulse(ctx, pulseHz, carrierHz = 216) {
    // Left ear carrier
    const oscLeft = ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(carrierHz, ctx.currentTime);

    // Right ear carrier offset by pulseHz for gentle neuron entrainment
    const oscRight = ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(carrierHz + pulseHz, ctx.currentTime);

    const merger = ctx.createChannelMerger(2);
    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(0.22, ctx.currentTime);

    oscLeft.connect(merger, 0, 0); // Left channel
    oscRight.connect(merger, 0, 1); // Right channel
    merger.connect(toneGain);
    toneGain.connect(masterGain);

    oscLeft.start();
    oscRight.start();

    return {
      stop: () => {
        try {
          toneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
          setTimeout(() => {
            oscLeft.stop();
            oscRight.stop();
            oscLeft.disconnect();
            oscRight.disconnect();
          }, 400);
        } catch (_) {}
      }
    };
  }

  // Play a specific audio soundscape or frequency
  function play(type, param = null, durationMinutes = 10) {
    stop();
    const ctx = getAudioContext();

    if (type === 'ocean') {
      currentSound = createOceanWaves(ctx);
    } else if (type === 'stream') {
      currentSound = createForestStream(ctx);
    } else if (type === 'rain') {
      currentSound = createGentleRain(ctx);
    } else if (type === 'chakra') {
      const freq = parseFloat(param || 528);
      currentSound = createChakraTone(ctx, freq);
    } else if (type === 'brainwave') {
      const pulse = parseFloat(param || 10);
      currentSound = createBrainwavePulse(ctx, pulse);
    }

    isPlaying = true;

    // Setup timer if specified
    if (durationMinutes && durationMinutes > 0) {
      remainingSeconds = durationMinutes * 60;
      timerInterval = setInterval(() => {
        remainingSeconds--;
        if (remainingSeconds <= 0) {
          stop();
        } else {
          updateTimerDisplay();
        }
      }, 1000);
    } else {
      remainingSeconds = 0;
    }

    updateUI(type, param);
  }

  function updateTimerDisplay() {
    const el = document.getElementById('soundTimerRemaining');
    if (!el) return;
    if (remainingSeconds > 0) {
      const m = Math.floor(remainingSeconds / 60);
      const s = remainingSeconds % 60;
      el.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    } else {
      el.textContent = 'Continuous';
    }
  }

  function updateUI(activeType = null, activeParam = null) {
    document.querySelectorAll('.sound-chip').forEach(btn => {
      btn.classList.remove('active');
    });

    const statusEl = document.getElementById('soundPlayingStatus');
    if (statusEl) {
      if (isPlaying) {
        statusEl.innerHTML = `🟢 <strong>Now Playing Calm Soundscape</strong> (Safe Volume Limit Active)`;
      } else {
        statusEl.innerHTML = `⚪ Audio Idle (Choose a soothing sound below)`;
      }
    }

    const stopBtn = document.getElementById('soundStopBtn');
    if (stopBtn) {
      stopBtn.style.display = isPlaying ? 'inline-flex' : 'none';
    }

    if (activeType) {
      const activeBtn = document.querySelector(`[data-sound-type="${activeType}"][data-sound-param="${activeParam || ''}"]`);
      if (activeBtn) activeBtn.classList.add('active');
    }

    updateTimerDisplay();
  }

  return {
    play,
    stop,
    setVolume,
    isPlaying: () => isPlaying
  };
})();

window.LittleAudio = LittleAudio;

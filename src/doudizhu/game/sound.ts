let audioContext: AudioContext | null = null;
let soundEnabled = true;
let bgmSource: AudioBufferSourceNode | null = null;
let bgmGain: GainNode | null = null;
let bgmType: string | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  if (!enabled) {
    stopBGM();
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function playTone(freq: number, duration: number, volume: number, type: OscillatorType = 'sine', attack: number = 0.005) {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume: number, filterFreq: number, filterEndFreq?: number) {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(filterEndFreq || filterFreq * 0.2, ctx.currentTime + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(ctx.currentTime);
  source.stop(ctx.currentTime + duration);
}

function playCardSlide() {
  playNoise(0.08, 0.15, 3000, 1500);
}

export function playDealSound() {
  if (!soundEnabled) return;

  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      playCardSlide();
      playTone(800 + Math.random() * 200, 0.03, 0.08, 'sine');
    }, i * 35);
  }
}

export function playPlaySound() {
  if (!soundEnabled) return;

  playCardSlide();
  setTimeout(() => {
    playTone(440, 0.08, 0.2, 'triangle');
    playTone(660, 0.06, 0.12, 'sine');
  }, 30);
}

export function playPassSound() {
  if (!soundEnabled) return;

  playTone(300, 0.1, 0.15, 'sine');
  setTimeout(() => playTone(220, 0.12, 0.12, 'sine'), 50);
}

export function playBombSound() {
  if (!soundEnabled) return;

  playNoise(0.5, 0.5, 800, 100);

  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);

  setTimeout(() => {
    playTone(100, 0.2, 0.3, 'sine');
  }, 50);
}

export function playRocketSound() {
  if (!soundEnabled) return;

  playNoise(0.8, 0.6, 1200, 150);

  const ctx = getAudioContext();
  if (!ctx) return;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(80, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.6);

  osc2.type = 'square';
  osc2.frequency.setValueAtTime(120, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1500, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.7);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.35, ctx.currentTime + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.8);
  osc2.stop(ctx.currentTime + 0.8);

  setTimeout(() => {
    playTone(200, 0.3, 0.25, 'sine');
    playTone(300, 0.25, 0.2, 'triangle');
  }, 100);
}

export function playStraightSound() {
  if (!soundEnabled) return;

  const notes = [262, 294, 330, 349, 392, 440, 494, 523];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.08, 0.2, 'triangle');
    }, i * 50);
  });
}

export function playDoubleStraightSound() {
  if (!soundEnabled) return;

  const notes = [262, 330, 294, 349, 330, 392, 392, 523];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.1, 0.22, 'triangle');
    }, i * 60);
  });
}

export function playTripleStraightSound() {
  if (!soundEnabled) return;

  playNoise(0.3, 0.2, 2000, 500);
  const notes = [196, 262, 196, 294, 220, 330, 247, 392];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.12, 0.25, 'triangle');
    }, i * 70);
  });
}

export function playWinSound() {
  if (!soundEnabled) return;

  const melody = [
    { freq: 523, dur: 0.15 },
    { freq: 659, dur: 0.15 },
    { freq: 784, dur: 0.2 },
    { freq: 1047, dur: 0.4 },
    { freq: 784, dur: 0.15 },
    { freq: 1047, dur: 0.5 },
  ];

  let time = 0;
  melody.forEach(({ freq, dur }) => {
    setTimeout(() => {
      playTone(freq, dur, 0.25, 'triangle');
      playTone(freq * 2, dur * 0.8, 0.1, 'sine');
    }, time);
    time += dur * 1000;
  });
}

export function playLoseSound() {
  if (!soundEnabled) return;

  const melody = [
    { freq: 392, dur: 0.2 },
    { freq: 349, dur: 0.2 },
    { freq: 330, dur: 0.25 },
    { freq: 294, dur: 0.3 },
    { freq: 262, dur: 0.5 },
  ];

  let time = 0;
  melody.forEach(({ freq, dur }) => {
    setTimeout(() => {
      playTone(freq, dur, 0.2, 'triangle');
    }, time);
    time += dur * 1000;
  });
}

export function playBidSound(level: number = 1) {
  if (!soundEnabled) return;

  const baseFreq = 440 + (level - 1) * 110;
  playTone(baseFreq, 0.1, 0.2, 'triangle');
  setTimeout(() => playTone(baseFreq * 1.25, 0.12, 0.18, 'sine'), 80);
  setTimeout(() => playTone(baseFreq * 1.5, 0.15, 0.15, 'sine'), 160);
}

export function playNoBidSound() {
  if (!soundEnabled) return;

  playTone(300, 0.15, 0.15, 'sine');
  setTimeout(() => playTone(220, 0.2, 0.12, 'sine'), 100);
}

export function playCountdownSound() {
  playTone(880, 0.05, 0.15, 'sine');
}

function createBgmBuffer(type: string): AudioBuffer | null {
  const ctx = getAudioContext();
  if (!ctx) return null;

  const bpm = type === 'exciting' ? 120 : type === 'win' ? 100 : type === 'lose' ? 80 : 100;
  const beatDur = 60 / bpm;
  const totalBeats = type === 'normal' ? 16 : type === 'exciting' ? 16 : type === 'win' ? 8 : type === 'lose' ? 8 : 16;
  const totalDuration = beatDur * totalBeats;

  const buffer = ctx.createBuffer(2, Math.floor(ctx.sampleRate * totalDuration), ctx.sampleRate);
  const leftData = buffer.getChannelData(0);
  const rightData = buffer.getChannelData(1);

  interface Note {
    freq: number;
    start: number;
    dur: number;
    vol: number;
    type: string;
  }

  const melodies: Note[] = [];

  if (type === 'normal') {
    const c = 262, e = 330, g = 392, a = 440, b = 494;
    const c5 = 523;
    const bassC = 131, bassG = 196, bassA = 220, bassF = 175;

    const phrase1 = [
      [g, 0, 0.5], [a, 0.5, 0.5], [b, 1, 0.5], [c5, 1.5, 1],
      [b, 2.5, 0.5], [a, 3, 0.5], [g, 3.5, 1],
    ];
    const phrase2 = [
      [c5, 4, 0.5], [b, 4.5, 0.5], [a, 5, 0.5], [g, 5.5, 1],
      [e, 6.5, 0.5], [g, 7, 0.5], [c, 7.5, 1],
    ];

    [...phrase1, ...phrase2].forEach(([freq, start, dur]) => {
      melodies.push({ freq: freq as number, start: (start as number) * beatDur, dur: (dur as number) * beatDur * 0.9, vol: 0.08, type: 'triangle' });
    });

    const bassPattern = [
      [bassC, 0], [bassG, 1], [bassA, 2], [bassG, 3],
      [bassF, 4], [bassC, 5], [bassG, 6], [bassC, 7],
    ];
    bassPattern.forEach(([freq, start]) => {
      melodies.push({ freq: freq as number, start: (start as number) * beatDur, dur: beatDur * 0.8, vol: 0.06, type: 'sine' });
    });
  } else if (type === 'exciting') {
    const c = 262, e = 330, g = 392, a = 440, c5 = 523, d5 = 587, e5 = 659;

    const phrase = [
      [e5, 0, 0.25], [d5, 0.25, 0.25], [c5, 0.5, 0.5],
      [e5, 1, 0.25], [d5, 1.25, 0.25], [c5, 1.5, 0.5],
      [g, 2, 0.5], [a, 2.5, 0.5], [c5, 3, 1],
      [e, 4, 0.25], [g, 4.25, 0.25], [c5, 4.5, 0.5],
      [g, 5, 0.25], [e, 5.25, 0.25], [c, 5.5, 1],
    ];

    phrase.forEach(([freq, start, dur]) => {
      melodies.push({ freq: freq as number, start: (start as number) * beatDur, dur: (dur as number) * beatDur * 0.9, vol: 0.1, type: 'triangle' });
    });

    for (let i = 0; i < 8; i++) {
      melodies.push({ freq: 131, start: i * beatDur * 2, dur: beatDur * 0.6, vol: 0.05, type: 'sine' });
    }
  } else if (type === 'welcome') {
    const c = 262, g = 392, a = 440, c5 = 523, e5 = 659, g5 = 784;

    const phrase = [
      [c5, 0, 0.5], [e5, 0.5, 0.5], [g5, 1, 1],
      [e5, 2, 0.5], [c5, 2.5, 0.5], [g, 3, 1],
      [a, 4, 0.5], [c5, 4.5, 0.5], [e5, 5, 1],
      [g, 6, 0.5], [c, 6.5, 0.5], [c, 7, 1],
    ];

    phrase.forEach(([freq, start, dur]) => {
      melodies.push({ freq: freq as number, start: (start as number) * beatDur, dur: (dur as number) * beatDur * 0.9, vol: 0.09, type: 'triangle' });
    });

    for (let i = 0; i < 8; i++) {
      melodies.push({ freq: 131 + (i % 2) * 65, start: i * beatDur, dur: beatDur * 0.7, vol: 0.05, type: 'sine' });
    }
  } else if (type === 'win') {
    const c5 = 523, e5 = 659, g5 = 784;

    const phrase = [
      [c5, 0, 0.3], [e5, 0.3, 0.3], [g5, 0.6, 0.6],
      [e5, 1.2, 0.3], [g5, 1.5, 0.9],
    ];

    phrase.forEach(([freq, start, dur]) => {
      melodies.push({ freq: freq as number, start: (start as number) * beatDur, dur: (dur as number) * beatDur * 0.9, vol: 0.12, type: 'triangle' });
      melodies.push({ freq: (freq as number) * 2, start: (start as number) * beatDur, dur: (dur as number) * beatDur * 0.8, vol: 0.04, type: 'sine' });
    });
  } else if (type === 'lose') {
    const c = 262, d = 294, e = 330, g = 392;

    const phrase = [
      [g, 0, 0.5], [e, 0.5, 0.5], [d, 1, 0.5], [c, 1.5, 1],
    ];

    phrase.forEach(([freq, start, dur]) => {
      melodies.push({ freq: freq as number, start: (start as number) * beatDur, dur: (dur as number) * beatDur * 0.9, vol: 0.1, type: 'triangle' });
    });
  }

  melodies.forEach(({ freq, start, dur, vol, type }) => {
    const startSample = Math.floor(start * ctx.sampleRate);
    const durSample = Math.floor(dur * ctx.sampleRate);
    const attackSample = Math.floor(0.02 * ctx.sampleRate);
    const releaseSample = Math.floor(0.05 * ctx.sampleRate);

    for (let i = 0; i < durSample && startSample + i < buffer.length; i++) {
      const t = i / ctx.sampleRate;
      let sample = 0;

      if (type === 'triangle') {
        const phase = (t * freq) % 1;
        sample = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
      } else {
        sample = Math.sin(2 * Math.PI * freq * t);
      }

      let env = 1;
      if (i < attackSample) {
        env = i / attackSample;
      } else if (i > durSample - releaseSample) {
        env = (durSample - i) / releaseSample;
      }

      const idx = startSample + i;
      if (idx < buffer.length) {
        leftData[idx] += sample * vol * env;
        rightData[idx] += sample * vol * env;
      }
    }
  });

  return buffer;
}

export function playBGM(type: 'welcome' | 'normal' | 'exciting' | 'win' | 'lose' = 'normal') {
  if (!soundEnabled) return;
  if (bgmType === type && bgmSource) return;

  stopBGM();

  const ctx = getAudioContext();
  if (!ctx) return;

  const buffer = createBgmBuffer(type);
  if (!buffer) return;

  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.5;
  bgmGain.connect(ctx.destination);

  bgmSource = ctx.createBufferSource();
  bgmSource.buffer = buffer;
  bgmSource.loop = true;
  bgmSource.connect(bgmGain);
  bgmSource.start(0);

  bgmType = type;
}

export function stopBGM() {
  if (bgmSource) {
    try {
      bgmSource.stop();
    } catch (e) {}
    bgmSource = null;
  }
  if (bgmGain) {
    bgmGain = null;
  }
  bgmType = null;
}

export function setBGMVolume(volume: number) {
  if (bgmGain) {
    bgmGain.gain.value = Math.max(0, Math.min(1, volume));
  }
}

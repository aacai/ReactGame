let audioContext: AudioContext | null = null;
let soundEnabled = true;

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
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function playWoodBlock(frequency: number = 180, duration: number = 0.08, volume: number = 0.4) {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(frequency, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(frequency * 0.5, ctx.currentTime + duration);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(frequency * 2.5, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(frequency * 0.8, ctx.currentTime + duration * 0.5);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + duration);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + duration + 0.02);
  osc2.stop(ctx.currentTime + duration + 0.02);
}

function playClick(freq: number = 800, dur: number = 0.04, vol: number = 0.15) {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

export function playMoveSound() {
  playWoodBlock(200, 0.08, 0.35);
  setTimeout(() => playClick(500, 0.03, 0.08), 1);
}

export function playCaptureSound() {
  playWoodBlock(140, 0.12, 0.45);
  setTimeout(() => playWoodBlock(100, 0.15, 0.3), 20);
  setTimeout(() => playClick(300, 0.05, 0.1), 2);
}

export function playCheckSound() {
  playWoodBlock(440, 0.08, 0.35);
  setTimeout(() => playWoodBlock(550, 0.1, 0.4), 80);
  setTimeout(() => playWoodBlock(660, 0.15, 0.45), 180);
  setTimeout(() => playWoodBlock(220, 0.25, 0.5), 350);
  setTimeout(() => playWoodBlock(110, 0.3, 0.4), 600);
}

export function playWinSound() {
  const notes = [262, 330, 392, 523];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playWoodBlock(freq, 0.18, 0.35);
    }, i * 130);
  });
}

export function playLoseSound() {
  const notes = [220, 185, 155, 130];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playWoodBlock(freq, 0.22, 0.3);
    }, i * 160);
  });
}

export function playClickSound() {
  playClick(1200, 0.03, 0.1);
}

export function playInvalidSound() {
  playClick(150, 0.1, 0.12);
  setTimeout(() => playClick(120, 0.12, 0.1), 60);
}

export function playHintSound() {
  playClick(880, 0.05, 0.1);
  setTimeout(() => playClick(1100, 0.06, 0.1), 50);
  setTimeout(() => playClick(1320, 0.08, 0.08), 100);
}

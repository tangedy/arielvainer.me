import { game } from "./engine.js";

let ctx;
let mutedWas;
let music;
let musicListenerAdded = false;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function beep(freq, dur = 0.08, type = "square", vol = 0.05) {
  if (game.muted) return;
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

function noise(dur = 0.12, vol = 0.03, cutoff = 1400) {
  if (game.muted) return;
  const a = ac();
  const length = Math.max(1, Math.floor(a.sampleRate * dur));
  const buffer = a.createBuffer(1, length, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const source = a.createBufferSource();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(vol, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(a.destination);
  source.start();
}

function planeWhoosh() {
  if (game.muted) return;
  const a = ac();
  const now = a.currentTime;
  const rumble = a.createOscillator();
  const engine = a.createOscillator();
  const rumbleGain = a.createGain();
  const engineGain = a.createGain();
  rumble.type = "sawtooth";
  engine.type = "triangle";
  rumble.frequency.setValueAtTime(78, now);
  rumble.frequency.exponentialRampToValueAtTime(32, now + 4.2);
  engine.frequency.setValueAtTime(220, now);
  engine.frequency.exponentialRampToValueAtTime(70, now + 4.2);
  rumbleGain.gain.setValueAtTime(0.0001, now);
  rumbleGain.gain.exponentialRampToValueAtTime(0.05, now + 0.18);
  rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);
  engineGain.gain.setValueAtTime(0.0001, now);
  engineGain.gain.exponentialRampToValueAtTime(0.03, now + 0.12);
  engineGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);
  rumble.connect(rumbleGain);
  engine.connect(engineGain);
  rumbleGain.connect(a.destination);
  engineGain.connect(a.destination);
  rumble.start(now);
  engine.start(now);
  rumble.stop(now + 4.2);
  engine.stop(now + 4.2);
  noise(1.1, 0.08, 900);
  setTimeout(() => noise(2.8, 0.045, 420), 400);
  if (music) {
    music.volume = 0.05;
    setTimeout(() => {
      if (music) music.volume = 0.2;
    }, 4300);
  }
}

export const sfx = {
  ok: () => beep(660, 0.07),
  good: () => {
    if (game.muted) return;
    beep(523, 0.08);
    setTimeout(() => beep(784, 0.1), 70);
  },
  bad: () => beep(140, 0.18, "sawtooth", 0.04),
  tick: () => beep(880, 0.03, "square", 0.03),
  win: () => {
    if (game.muted) return;
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.12), i * 90));
  },
  start: () => beep(392, 0.12),
  splash: () => beep(220, 0.1, "triangle", 0.06),
  drop: () => beep(280, 0.09, "triangle", 0.045),
  lift: () => beep(540, 0.08, "square", 0.035),
  burner: () => {
    if (game.muted) return;
    noise(0.55, 0.055, 900);
    beep(95, 0.35, "sawtooth", 0.018);
    setTimeout(() => beep(180, 0.1, "triangle", 0.025), 80);
  },
  flip: () => {
    if (game.muted) return;
    beep(420, 0.06, "square", 0.035);
    setTimeout(() => beep(620, 0.07, "square", 0.03), 55);
  },
  sizzle: () => beep(85 + Math.random() * 35, 0.045, "sawtooth", 0.012),
  card: () => {
    noise(0.07, 0.022, 2300);
    beep(300, 0.04, "triangle", 0.02);
  },
  cardFlip: () => {
    noise(0.13, 0.035, 1800);
    beep(460, 0.07, "triangle", 0.025);
  },
  planeAway: planeWhoosh,
};

export function unlockAudio() {
  if (mutedWas === game.muted) return;
  mutedWas = game.muted;
  if (!game.muted) ac();
}

export function startMusic(url) {
  if (!music) {
    music = new Audio(url);
    music.loop = true;
    music.volume = 0.2;
    music.preload = "auto";
  }
  music.muted = game.muted;
  music.play().catch(() => {
    // A Start click normally authorizes this; a later sound toggle can retry if needed.
  });
  if (!musicListenerAdded) {
    musicListenerAdded = true;
    window.addEventListener("game-mute-changed", () => {
      if (!music) return;
      music.muted = game.muted;
      if (!game.muted && music.paused) music.play().catch(() => {});
    });
  }
}

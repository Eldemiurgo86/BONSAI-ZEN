'use client';
import { useSettings } from '@/store/settings';

let ctx: AudioContext | null = null;

/** Tono corto generado con WebAudio (sin archivos de audio). Respeta el interruptor de sonido. */
function tone(freq: number, duration = 0.1, type: OscillatorType = 'sine', volume = 0.04, delay = 0) {
  if (typeof window === 'undefined' || !useSettings.getState().sound) return;
  try {
    ctx ??= new AudioContext();
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  } catch {
    // Sin audio disponible: se ignora en silencio.
  }
}

export const sfx = {
  swap: () => tone(330, 0.08, 'triangle'),
  invalid: () => tone(140, 0.12, 'square', 0.02),
  match: (cascade: number) => tone(520 + Math.min(cascade, 6) * 60, 0.12, 'sine', 0.05),
  booster: () => tone(880, 0.18, 'triangle', 0.05),
  end: (won: boolean) => {
    if (won) [523, 659, 784].forEach((f, i) => tone(f, 0.22, 'sine', 0.05, i * 0.12));
    else [392, 330].forEach((f, i) => tone(f, 0.3, 'sine', 0.04, i * 0.2));
  },
  achievement: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.2, 'sine', 0.04, i * 0.09)),
};

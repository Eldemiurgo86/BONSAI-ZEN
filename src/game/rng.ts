/**
 * Generador pseudoaleatorio determinista (mulberry32). El estado es un entero
 * de 32 bits que se devuelve junto al valor, así el motor sigue siendo puro y
 * una partida se puede reproducir a partir de su semilla.
 */

/** Devuelve un número en [0, 1) y el nuevo estado de la semilla. */
export function nextFloat(seed: number): [value: number, seed: number] {
  const s = (seed + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, s];
}

/** Entero uniforme en [0, max). */
export function nextInt(seed: number, max: number): [value: number, seed: number] {
  const [v, s] = nextFloat(seed);
  return [Math.min(max - 1, Math.floor(v * max)), s];
}

/** Semilla nueva a partir de una fuente externa (p. ej. Date.now) — solo para iniciar partidas. */
export function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

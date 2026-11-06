/**
 * Vidas del modo gratis. Se regeneran una a una con el tiempo. Funciones puras:
 * el servidor es quien las calcula y descuenta (no confiar en el cliente).
 */

export const MAX_LIVES = 5;
export const LIFE_REGEN_MS = 30 * 60 * 1000;

export interface LivesSnapshot {
  readonly lives: number;
  /** Momento desde el que cuenta la próxima regeneración. */
  readonly anchorMs: number;
  /** Momento en que se regenera la siguiente vida, o null si está llena. */
  readonly nextRegenAt: number | null;
}

/** Vidas disponibles en `nowMs` a partir del valor guardado y su ancla temporal. */
export function computeLives(stored: number, anchorMs: number, nowMs: number): LivesSnapshot {
  const base = Math.max(0, Math.min(MAX_LIVES, Math.floor(stored)));
  if (base >= MAX_LIVES) {
    return { lives: MAX_LIVES, anchorMs: nowMs, nextRegenAt: null };
  }
  const elapsed = Math.max(0, nowMs - anchorMs);
  const gained = Math.floor(elapsed / LIFE_REGEN_MS);
  const lives = Math.min(MAX_LIVES, base + gained);
  if (lives >= MAX_LIVES) {
    return { lives, anchorMs: nowMs, nextRegenAt: null };
  }
  const newAnchor = anchorMs + gained * LIFE_REGEN_MS;
  return { lives, anchorMs: newAnchor, nextRegenAt: newAnchor + LIFE_REGEN_MS };
}

export type ConsumeResult = LivesSnapshot & { readonly ok: boolean };

/** Gasta una vida si hay alguna disponible. */
export function consumeLife(stored: number, anchorMs: number, nowMs: number): ConsumeResult {
  const current = computeLives(stored, anchorMs, nowMs);
  if (current.lives <= 0) return { ...current, ok: false };

  const wasFull = current.lives >= MAX_LIVES;
  const lives = current.lives - 1;
  const anchor = wasFull ? nowMs : current.anchorMs;
  return {
    ok: true,
    lives,
    anchorMs: anchor,
    nextRegenAt: lives < MAX_LIVES ? anchor + LIFE_REGEN_MS : null,
  };
}

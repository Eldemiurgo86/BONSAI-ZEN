import type { Booster } from '@/game/types';

/** Precio de los boosters en monedas del juego (compartido por la tienda y el servidor). */
export const BOOSTER_PRICES: Record<Booster, number> = { scissors: 60, rain: 80, fertilizer: 50 };

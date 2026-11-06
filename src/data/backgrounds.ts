/** Fondos de la app. Los marcados como `premium` solo se pueden elegir con cuenta Premium. */
import type { BackgroundId } from '@/store/settings';

export interface BackgroundDef {
  readonly id: BackgroundId;
  readonly premium: boolean;
  readonly name: { readonly es: string; readonly en: string };
  readonly className: string;
}

export const BACKGROUNDS: readonly BackgroundDef[] = [
  { id: 'jardin', premium: false, name: { es: 'Jardín de cerezos', en: 'Cherry garden' }, className: 'bg-jardin' },
  { id: 'bambu', premium: false, name: { es: 'Bosque de bambú', en: 'Bamboo grove' }, className: 'bg-bambu' },
  { id: 'luna', premium: true, name: { es: 'Luna de otoño', en: 'Autumn moon' }, className: 'bg-luna' },
  { id: 'templo', premium: true, name: { es: 'Templo nevado', en: 'Snowy temple' }, className: 'bg-templo' },
];

/** Devuelve el fondo elegido, o el predeterminado si el usuario no tiene acceso a él. */
export function resolveBackground(id: BackgroundId, premium: boolean): BackgroundDef {
  const def = BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
  return def.premium && !premium ? BACKGROUNDS[0] : def;
}

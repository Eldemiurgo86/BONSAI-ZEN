/**
 * Modelo procedural del bonsái: ramas y follaje a partir de una semilla.
 * Funciones puras (sin Three.js); el componente 3D solo pinta el modelo.
 */
import { nextFloat } from './rng';
import type { BonsaiStage } from './progression';
import type { BonsaiStyle } from './types';

export type Vec3 = readonly [number, number, number];

export interface Branch {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly radius: number;
  readonly depth: number;
}

export interface Foliage {
  readonly position: Vec3;
  readonly radius: number;
  /** Variación de tono en [0, 1) para dar color orgánico a cada hoja. */
  readonly tone: number;
}

export interface TreeModel {
  readonly branches: readonly Branch[];
  readonly foliage: readonly Foliage[];
}

interface StageParams {
  readonly depth: number;
  readonly trunkLength: number;
  readonly leavesPerTip: number;
  readonly foliageRadius: number;
}

export const STAGE_PARAMS: Record<BonsaiStage, StageParams> = {
  semilla: { depth: 0, trunkLength: 0.3, leavesPerTip: 1, foliageRadius: 0.14 },
  brote: { depth: 1, trunkLength: 0.7, leavesPerTip: 2, foliageRadius: 0.22 },
  juvenil: { depth: 2, trunkLength: 1.0, leavesPerTip: 3, foliageRadius: 0.3 },
  maduro: { depth: 3, trunkLength: 1.2, leavesPerTip: 4, foliageRadius: 0.36 },
  obra: { depth: 4, trunkLength: 1.35, leavesPerTip: 5, foliageRadius: 0.4 },
};

/** Sesgo de crecimiento de las ramas según el estilo del nivel. */
const STYLE_BIAS: Record<BonsaiStyle, { bias: Vec3; spread: number; lean: number }> = {
  cascada: { bias: [0.55, -0.45, 0], spread: 0.6, lean: 0.45 },
  japones: { bias: [0, 0.15, 0], spread: 0.85, lean: 0.12 },
  vertical: { bias: [0, 0.7, 0], spread: 0.35, lean: 0 },
};

const TRUNK_RADIUS = 0.09;
const BRANCH_LENGTH_FACTOR = 0.7;
const BRANCH_RADIUS_FACTOR = 0.62;

function norm(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

/** Genera el bonsái para una etapa y estilo. Misma semilla → mismo árbol. */
export function buildTree(stage: BonsaiStage, style: BonsaiStyle, seed: number): TreeModel {
  const params = STAGE_PARAMS[stage];
  const styleParams = STYLE_BIAS[style];
  let s = seed >>> 0;
  const rnd = (): number => {
    const [v, next] = nextFloat(s);
    s = next;
    return v;
  };
  const signed = (): number => rnd() * 2 - 1;

  const branches: Branch[] = [];
  const foliage: Foliage[] = [];

  const addFoliage = (tip: Vec3, depth: number) => {
    for (let k = 0; k < params.leavesPerTip; k++) {
      const offset: Vec3 = [signed() * 0.22, signed() * 0.16, signed() * 0.22];
      const r = params.foliageRadius * (0.8 + rnd() * 0.4) * (1 - depth * 0.04);
      foliage.push({ position: add(tip, offset), radius: r, tone: rnd() });
    }
  };

  const grow = (from: Vec3, dir: Vec3, length: number, radius: number, depth: number) => {
    const to = add(from, scale(dir, length));
    branches.push({ from, to, radius, depth });

    if (depth >= params.depth) {
      addFoliage(to, depth);
      return;
    }

    const children = depth === 0 ? 3 : 2;
    for (let i = 0; i < children; i++) {
      const jitter: Vec3 = [signed() * styleParams.spread, signed() * 0.5, signed() * styleParams.spread];
      const childDir = norm(add(add(scale(dir, 0.55), styleParams.bias), jitter));
      grow(to, childDir, length * BRANCH_LENGTH_FACTOR, radius * BRANCH_RADIUS_FACTOR, depth + 1);
    }
  };

  const trunkDir = norm([styleParams.lean, 1, 0]);
  grow([0, 0, 0], trunkDir, params.trunkLength, TRUNK_RADIUS, 0);

  return { branches, foliage };
}

/** Altura aproximada del modelo (para encuadrar la cámara). */
export function treeHeight(model: TreeModel): number {
  let max = 0;
  for (const b of model.branches) max = Math.max(max, b.to[1]);
  return max;
}

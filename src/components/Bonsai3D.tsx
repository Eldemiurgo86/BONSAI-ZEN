'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildTree, type Branch, type Foliage, type TreeModel } from '@/game/bonsai';
import type { BonsaiStage } from '@/game/progression';
import type { BonsaiStyle, Season } from '@/game/types';

export interface BonsaiProps {
  stage: BonsaiStage;
  style: BonsaiStyle;
  seed: number;
  season: Season;
  /** Balanceo suave con el viento. Se desactiva con movimiento reducido. */
  animate: boolean;
  /** Brillo dorado al alcanzar un logro. */
  glow?: boolean;
}

const PALETTE: Record<Season, { leaves: string[]; blossom?: string; snow?: boolean }> = {
  primavera: { leaves: ['#7fd46b', '#5cc26a', '#9be37f'], blossom: '#ffb7cf' },
  verano: { leaves: ['#2e9e5b', '#3cb371', '#238a4f'] },
  otono: { leaves: ['#e0572b', '#f0a53a', '#c94a2b', '#f4c04a'] },
  invierno: { leaves: ['#8fb59a', '#a7c4b0', '#6f9b82'], snow: true },
};

const BARK_COLOR = '#8a6240';
const POT_COLOR = '#c86b3c';
const SOIL_COLOR = '#4a3426';

/** Textura procedural de corteza (lienzo 2D; sin archivos de imagen). */
function makeBarkTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#7a5538';
  ctx.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 280; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(40,25,15,0.35)' : 'rgba(180,140,100,0.22)';
    ctx.fillRect(x, y, 1 + Math.random() * 3, 10 + Math.random() * 60);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function BranchMesh({ branch, material }: { branch: Branch; material: THREE.Material }) {
  const { position, quaternion, length } = useMemo(() => {
    const from = new THREE.Vector3(...branch.from);
    const to = new THREE.Vector3(...branch.to);
    const dir = to.clone().sub(from);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { position: from.clone().add(to).multiplyScalar(0.5), quaternion: q, length: len };
  }, [branch]);
  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <cylinderGeometry args={[branch.radius * 0.7, branch.radius, length, 7]} />
    </mesh>
  );
}

function Canopy({ foliage, season }: { foliage: readonly Foliage[]; season: Season }) {
  const palette = PALETTE[season];
  const leafMats = useMemo(
    () => palette.leaves.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, flatShading: true })),
    [palette],
  );
  const blossomMat = useMemo(
    () => (palette.blossom ? new THREE.MeshStandardMaterial({ color: palette.blossom, roughness: 0.6 }) : null),
    [palette],
  );
  const snowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), []);

  return (
    <>
      {foliage.map((f, i) => (
        <group key={i}>
          <mesh position={f.position} material={leafMats[Math.floor(f.tone * leafMats.length) % leafMats.length]}>
            <sphereGeometry args={[f.radius, 10, 8]} />
          </mesh>
          {blossomMat && i % 2 === 0 && (
            <mesh position={[f.position[0] + f.radius * 0.6, f.position[1] + f.radius * 0.4, f.position[2] + f.radius * 0.3]} material={blossomMat}>
              <sphereGeometry args={[f.radius * 0.28, 8, 6]} />
            </mesh>
          )}
          {palette.snow && (
            <mesh position={[f.position[0], f.position[1] + f.radius * 0.55, f.position[2]]} material={snowMat}>
              <sphereGeometry args={[f.radius * 0.7, 10, 8]} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

/** Escena del bonsái. Debe renderizarse dentro de un <Canvas>. */
function BonsaiScene({ model, season, animate, glow }: { model: TreeModel } & Omit<BonsaiProps, 'seed' | 'stage' | 'style'>) {
  const group = useRef<THREE.Group>(null);
  const grow = useRef(animate ? 0 : 1);
  const glowLight = useRef<THREE.PointLight>(null);
  const bark = useMemo(makeBarkTexture, []);
  const barkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: bark ?? undefined, color: BARK_COLOR, roughness: 0.92 }),
    [bark],
  );

  useEffect(() => () => {
    barkMat.dispose();
    bark?.dispose();
  }, [barkMat, bark]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    // Crecimiento: escala con un rebote suave hasta 1.
    grow.current = Math.min(1, grow.current + dt * 1.4);
    const k = grow.current;
    const eased = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
    g.scale.setScalar(Math.max(0.001, eased));
    g.rotation.z = animate ? Math.sin(state.clock.elapsedTime * 0.8) * 0.03 : 0;
    if (glowLight.current) {
      glowLight.current.intensity = glow ? 1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.4 : 0;
    }
  });

  return (
    <group ref={group} position={[0, -0.7, 0]}>
      {/* Maceta y sustrato */}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.6, 0.42, 0.42, 28]} />
        <meshStandardMaterial color={POT_COLOR} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.56, 28]} />
        <meshStandardMaterial color={SOIL_COLOR} roughness={1} />
      </mesh>
      {model.branches.map((b, i) => (
        <BranchMesh key={i} branch={b} material={barkMat} />
      ))}
      <Canopy foliage={model.foliage} season={season} />
      <pointLight ref={glowLight} position={[0, 2.2, 1.2]} color="#ffd23f" distance={6} intensity={0} />
    </group>
  );
}

/** Bonsái 3D completo: lienzo, luces y escena. Se carga solo en el cliente. */
export default function BonsaiCanvas({ stage, style, seed, season, animate, glow = false }: BonsaiProps) {
  const model = useMemo(() => buildTree(stage, style, seed), [stage, style, seed]);
  return (
    <Canvas
      camera={{ position: [0, 1.3, 9.2], fov: 32 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      aria-label="Bonsái 3D"
      role="img"
    >
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#ffffff', '#6b8f5a', 0.6]} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <BonsaiScene model={model} season={season} animate={animate} glow={glow} />
    </Canvas>
  );
}

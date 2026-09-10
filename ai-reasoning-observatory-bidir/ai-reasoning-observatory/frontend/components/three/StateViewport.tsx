"use client";
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { LatentStep } from "@/lib/types";

/**
 * SRS Section 11 constraints this component is built to respect:
 * - every visible transition must be driven by an event or state update
 *   (no random particles / arbitrary "neuron" networks)
 * - camera movement stays restrained and purposeful
 * - a 2D/text fallback must exist if WebGL performs poorly -- callers
 *   should keep the numeric rows visible alongside this, never in
 *   place of them.
 *
 * The BDH-CQ side reuses the visual language of the DataForge classic
 * app's latent-state animation: a fixed-size wireframe "chamber" sphere
 * and a fixed-size cloud of particles whose *activity pattern* shifts
 * with each state update. The count never changes — that is the O(1)
 * point. Particles activate deterministically (seeded per index + step,
 * threshold driven by the real state norm), colored per pass
 * (forward = teal, backward = amber, combined = violet).
 */

const PARTICLE_COUNT = 60;

/** Deterministic pseudo-random so particle positions are stable across re-renders. */
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function SlowSpin({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.12; // gentle, constant, purposeful
  });
  return <group ref={group}>{children}</group>;
}

/** Conventional side: a growing row of bars, one per token that has
 * actually arrived (prompt tokens + streamed output tokens so far).
 * The newest bars glow brighter to make growth visceral for judges. */
function TokenSequence({ count }: { count: number }) {
  const bars = useMemo(() => Array.from({ length: Math.min(count, 48) }), [count]);
  const recentCutoff = Math.max(0, bars.length - 4); // last 4 bars glow
  return (
    <SlowSpin>
      {bars.map((_, i) => {
        const x = (i - bars.length / 2) * 0.34;
        const h = 0.4 + ((i * 37) % 11) / 11 * 0.5;
        const isNew = i >= recentCutoff;
        return (
          <mesh key={i} position={[x, h / 2 - 0.6, 0]}>
            <boxGeometry args={[0.22, h, 0.22]} />
            <meshStandardMaterial
              color={isNew ? "#ffb454" : "#f59e3c"}
              emissive={isNew ? "#ff8c00" : "#f59e3c"}
              emissiveIntensity={isNew ? 1.2 : 0.2}
            />
          </mesh>
        );
      })}
      <mesh position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[bars.length * 0.36 + 1, 1.4]} />
        <meshStandardMaterial color="#1c2023" />
      </mesh>
    </SlowSpin>
  );
}

const PASS_COLOR: Record<string, { chamber: string; active: string; glow: string; dim: string }> = {
  forward: { chamber: "#2dd4bf", active: "#99f6e4", glow: "#14b8a6", dim: "#134e4a" },
  backward: { chamber: "#f59e3c", active: "#ffd29d", glow: "#f97316", dim: "#7c2d12" },
  combined: { chamber: "#a78bfa", active: "#ddd6fe", glow: "#8b5cf6", dim: "#3b0764" },
};

/** BDH-CQ side — the DataForge classic "latent chamber": a fixed-size
 * wireframe sphere + fixed-size particle cloud. Only the *activity
 * pattern* changes between state updates; the chamber never resizes. */
function LatentChamber({
  steps,
  pass,
  maxSteps,
}: {
  steps: LatentStep[];
  pass: string;
  maxSteps: number;
}) {
  const colors = PASS_COLOR[pass] ?? PASS_COLOR.forward;

  const basePositions = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        // r=1.45: active dots are 0.09 radius → outermost surface 1.54,
        // well inside the chamber wireframe at r=1.9. Dim dots (0.035)
        // also stay inside. Previously r=1.6 let large active dots poke out.
        const r = 1.45;
        const theta = seeded(i, 1) * Math.PI * 2;
        const phi = seeded(i, 2) * Math.PI;
        return new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
      }),
    []
  );

  const currentStep = steps.length;
  const last = steps[steps.length - 1];
  // Drive how many particles light up from the REAL state norm, so the
  // animation responds to the actual computation, not a fixed pattern.
  const norm = last ? Math.min(last.state_norm, 3) : 0;
  const activeThreshold = Math.min(Math.max(0.12 + norm * 0.2, 0.05), 0.85);

  return (
    <group>
      {/* Fixed-size chamber boundary — never grows */}
      <SlowSpin>
        <mesh>
          <sphereGeometry args={[1.9, 24, 24]} />
          <meshBasicMaterial color={colors.chamber} wireframe transparent opacity={0.22} />
        </mesh>
        {basePositions.map((pos, i) => {
          // Activation is seeded by (index, current step): stable across
          // re-renders, shifts deterministically with each state update,
          // count always PARTICLE_COUNT.
          const activation = seeded(i, currentStep + 10);
          const isActive = activation < activeThreshold;
          return (
            <mesh key={i} position={pos}>
              <sphereGeometry args={[isActive ? 0.09 : 0.035, 10, 10]} />
              <meshStandardMaterial
                color={isActive ? colors.active : colors.dim}
                emissive={isActive ? colors.glow : "#000000"}
                emissiveIntensity={isActive ? 0.8 : 0}
              />
            </mesh>
          );
        })}

        {/* Short trail of the last few state norms, pinned around the floor */}
        {steps.slice(-8).map((s, i) => {
          const angle = (i / 8) * Math.PI * 2;
          // r=1.55: trail dots (max size ~0.1) stay inside the chamber (r=1.9).
          // Previously r=2.35 placed them well outside the wireframe.
          const r = 1.55;
          return (
            <mesh
              key={`trail-${s.step}`}
              position={[Math.cos(angle) * r, -1.1, Math.sin(angle) * r]}
            >
              <sphereGeometry args={[0.05 + Math.min(s.state_norm, 3) * 0.025, 10, 10]} />
              <meshStandardMaterial color={colors.active} emissive={colors.glow} emissiveIntensity={0.45} />
            </mesh>
          );
        })}
      </SlowSpin>
      <pointLight position={[5, 5, 5]} intensity={0.9} />
      {/* Floor disc so the chamber reads as sitting in space */}
      <mesh position={[0, -2.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.6, 32]} />
        <meshBasicMaterial color="#0b0f14" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export default function StateViewport({
  mode,
  tokenCount,
  latentSteps,
  pass = "forward",
  maxSteps = 0,
}: {
  mode: "conventional" | "bdh_cq";
  tokenCount: number;
  latentSteps: LatentStep[];
  pass?: string;
  maxSteps?: number;
}) {
  const total = Math.max(maxSteps, latentSteps.length);
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-lg border border-graphite-600 bg-graphite-950/60">
      <Canvas camera={{ position: [0, 0.4, 6], fov: 50 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 2]} intensity={0.8} />
        {mode === "conventional" ? (
          <TokenSequence count={tokenCount} />
        ) : (
          <LatentChamber steps={latentSteps} pass={pass} maxSteps={total} />
        )}
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
      {mode === "bdh_cq" && (
        <div className="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] text-paper/50">
          {`${pass} · state update ${latentSteps.length}/${total} — fixed-size chamber, only activity shifts (O(1))`}
        </div>
      )}
    </div>
  );
}
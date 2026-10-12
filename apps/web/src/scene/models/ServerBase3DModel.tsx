/**
 * @file scene/models/ServerBase3DModel.tsx
 * @description 3D Client Server Base model matching Image 2:
 * 4-legged lattice steel transmission tower, summit mast, side transceivers,
 * animated pulsating blue radio wave arcs, and high-definition texture integration.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NETWORK_TEXTURES } from '../textures';

interface ServerBase3DModelProps {
  isSelected: boolean;
  hovered: boolean;
  online: boolean;
  isRoot?: boolean;
}

export const ServerBase3DModel: React.FC<ServerBase3DModelProps> = ({
  isSelected,
  hovered,
  online,
  isRoot
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftWave1Ref = useRef<THREE.Mesh>(null);
  const leftWave2Ref = useRef<THREE.Mesh>(null);
  const rightWave1Ref = useRef<THREE.Mesh>(null);
  const rightWave2Ref = useRef<THREE.Mesh>(null);
  const beaconLightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Pulsating electromagnetic radio wave animation
    if (online) {
      const pulse1 = (t * 2.2) % 1;
      const pulse2 = ((t * 2.2) + 0.5) % 1;

      if (leftWave1Ref.current && rightWave1Ref.current) {
        const s1 = 0.8 + pulse1 * 0.5;
        leftWave1Ref.current.scale.set(s1, s1, s1);
        rightWave1Ref.current.scale.set(s1, s1, s1);
        const mat1 = leftWave1Ref.current.material as THREE.MeshBasicMaterial;
        const matR1 = rightWave1Ref.current.material as THREE.MeshBasicMaterial;
        if (mat1) mat1.opacity = (1 - pulse1) * 0.9;
        if (matR1) matR1.opacity = (1 - pulse1) * 0.9;
      }

      if (leftWave2Ref.current && rightWave2Ref.current) {
        const s2 = 0.8 + pulse2 * 0.5;
        leftWave2Ref.current.scale.set(s2, s2, s2);
        rightWave2Ref.current.scale.set(s2, s2, s2);
        const mat2 = leftWave2Ref.current.material as THREE.MeshBasicMaterial;
        const matR2 = rightWave2Ref.current.material as THREE.MeshBasicMaterial;
        if (mat2) mat2.opacity = (1 - pulse2) * 0.9;
        if (matR2) matR2.opacity = (1 - pulse2) * 0.9;
      }

      if (beaconLightRef.current) {
        beaconLightRef.current.intensity = 0.8 + Math.sin(t * 6) * 0.4;
      }
    }
  });

  const towerColor = online ? '#A78D78' : '#BEB5A9';
  const footingColor = online ? '#E1D4C2' : '#D0C4B2';
  const waveColor = '#6E473B';

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 1. Base Drop Shadow / Transmission Ground Ring */}
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[0.5, 1.4, 32]} />
        <meshBasicMaterial
          color={online ? '#A78D78' : '#BEB5A9'}
          transparent
          opacity={online ? 0.25 : 0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Four Base Footings / Concrete Foundation Blocks */}
      <mesh position={[-0.45, -0.45, 0.06]}>
        <boxGeometry args={[0.22, 0.22, 0.12]} />
        <meshStandardMaterial color={footingColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.45, -0.45, 0.06]}>
        <boxGeometry args={[0.22, 0.22, 0.12]} />
        <meshStandardMaterial color={footingColor} roughness={0.7} />
      </mesh>
      <mesh position={[-0.45, 0.45, 0.06]}>
        <boxGeometry args={[0.22, 0.22, 0.12]} />
        <meshStandardMaterial color={footingColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.45, 0.45, 0.06]}>
        <boxGeometry args={[0.22, 0.22, 0.12]} />
        <meshStandardMaterial color={footingColor} roughness={0.7} />
      </mesh>

      {/* 3. Four Tapering Main Lattice Legs */}
      {/* Leg 1: Front-Left */}
      <mesh position={[-0.24, -0.24, 0.7]} rotation={[Math.PI / 2 + 0.13, -0.13, 0]}>
        <cylinderGeometry args={[0.045, 0.065, 1.4, 12]} />
        <meshStandardMaterial color={towerColor} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Leg 2: Front-Right */}
      <mesh position={[0.24, -0.24, 0.7]} rotation={[Math.PI / 2 + 0.13, 0.13, 0]}>
        <cylinderGeometry args={[0.045, 0.065, 1.4, 12]} />
        <meshStandardMaterial color={towerColor} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Leg 3: Back-Left */}
      <mesh position={[-0.24, 0.24, 0.7]} rotation={[Math.PI / 2 - 0.13, -0.13, 0]}>
        <cylinderGeometry args={[0.045, 0.065, 1.4, 12]} />
        <meshStandardMaterial color={towerColor} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Leg 4: Back-Right */}
      <mesh position={[0.24, 0.24, 0.7]} rotation={[Math.PI / 2 - 0.13, 0.13, 0]}>
        <cylinderGeometry args={[0.045, 0.065, 1.4, 12]} />
        <meshStandardMaterial color={towerColor} roughness={0.3} metalness={0.7} />
      </mesh>

      {/* 4. Horizontal and Diagonal Lattice Braces (X-Trusses) */}
      {/* Tier 1 Horizontal Ring */}
      <mesh position={[0, -0.32, 0.45]}>
        <boxGeometry args={[0.68, 0.045, 0.045]} />
        <meshStandardMaterial color={towerColor} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.32, 0.45]}>
        <boxGeometry args={[0.68, 0.045, 0.045]} />
        <meshStandardMaterial color={towerColor} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Tier 2 Horizontal Ring */}
      <mesh position={[0, -0.18, 0.95]}>
        <boxGeometry args={[0.38, 0.04, 0.04]} />
        <meshStandardMaterial color={towerColor} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.18, 0.95]}>
        <boxGeometry args={[0.38, 0.04, 0.04]} />
        <meshStandardMaterial color={towerColor} roughness={0.3} metalness={0.7} />
      </mesh>

      {/* 5. Central Mast & Summit Antenna Dome */}
      <mesh position={[0, 0, 1.55]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.75, 16]} />
        <meshStandardMaterial color={towerColor} roughness={0.25} metalness={0.8} />
      </mesh>
      {/* Summit Dome Cap */}
      <mesh position={[0, 0, 1.95]}>
        <capsuleGeometry args={[0.09, 0.18, 12, 16]} />
        <meshStandardMaterial
          color={towerColor}
          emissive={online ? '#C07A48' : '#BEB5A9'}
          emissiveIntensity={online ? 0.6 : 0}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Dual Transceiver Pods on Mast */}
      <mesh position={[-0.18, 0, 1.35]}>
        <capsuleGeometry args={[0.07, 0.28, 12, 16]} />
        <meshStandardMaterial color={towerColor} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0.18, 0, 1.35]}>
        <capsuleGeometry args={[0.07, 0.28, 12, 16]} />
        <meshStandardMaterial color={towerColor} roughness={0.3} metalness={0.7} />
      </mesh>

      {/* 6. Pulsing 3D Radio Waves (Curved Arcs emitting from transceiver) */}
      {online && (
        <group position={[0, 0, 1.8]}>
          {/* Left Radio Waves */}
          <mesh
            ref={leftWave1Ref}
            position={[-0.45, 0, 0]}
            rotation={[Math.PI / 2, 0, Math.PI / 2]}
          >
            <torusGeometry args={[0.32, 0.038, 12, 24, Math.PI * 0.65]} />
            <meshBasicMaterial color={waveColor} transparent opacity={0.8} />
          </mesh>
          <mesh
            ref={leftWave2Ref}
            position={[-0.68, 0, 0]}
            rotation={[Math.PI / 2, 0, Math.PI / 2]}
          >
            <torusGeometry args={[0.48, 0.042, 12, 24, Math.PI * 0.65]} />
            <meshBasicMaterial color={waveColor} transparent opacity={0.6} />
          </mesh>

          {/* Right Radio Waves */}
          <mesh
            ref={rightWave1Ref}
            position={[0.45, 0, 0]}
            rotation={[Math.PI / 2, 0, -Math.PI / 2]}
          >
            <torusGeometry args={[0.32, 0.038, 12, 24, Math.PI * 0.65]} />
            <meshBasicMaterial color={waveColor} transparent opacity={0.8} />
          </mesh>
          <mesh
            ref={rightWave2Ref}
            position={[0.68, 0, 0]}
            rotation={[Math.PI / 2, 0, -Math.PI / 2]}
          >
            <torusGeometry args={[0.48, 0.042, 12, 24, Math.PI * 0.65]} />
            <meshBasicMaterial color={waveColor} transparent opacity={0.6} />
          </mesh>

          {/* Transmitter Glow Light */}
          <pointLight
            ref={beaconLightRef}
            position={[0, 0, 0.2]}
            color="#C07A48"
            intensity={1.2}
            distance={4.0}
          />
        </group>
      )}

      {/* 7. High-Resolution Textured Billboard Plate (Image 2 Artwork) */}
      {/* Upright and facing camera angle for flawless visual representation */}
      <mesh position={[0, -0.05, 1.25]} rotation={[Math.PI / 3.2, 0, 0]}>
        <planeGeometry args={[2.1, 2.1]} />
        <meshBasicMaterial
          map={NETWORK_TEXTURES.serverBase}
          transparent
          alphaTest={0.1}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

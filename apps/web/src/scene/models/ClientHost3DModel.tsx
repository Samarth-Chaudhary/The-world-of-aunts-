/**
 * @file scene/models/ClientHost3DModel.tsx
 * @description 3D Client Host model matching Shinchan:
 * Iconic animated Buri Buri dance wiggle, 3D blue shorts/buns, cyan shirt,
 * peach cartoon head, white socks, green shoes, target destination halo,
 * and high-definition texture integration.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NETWORK_TEXTURES } from '../textures';

interface ClientHost3DModelProps {
  isSelected: boolean;
  isTarget: boolean;
  hovered: boolean;
  online: boolean;
}

export const ClientHost3DModel: React.FC<ClientHost3DModelProps> = ({
  isSelected,
  isTarget,
  hovered,
  online
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const targetBeaconRef = useRef<THREE.Group>(null);
  const characterGroupRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (online) {
      // Shinchan's iconic Buri Buri dance wiggle speed
      const danceFreq = isTarget ? 11 : 6.5;
      const wiggleAngle = Math.sin(t * danceFreq) * (isTarget ? 0.22 : 0.12);
      const hopBounce = Math.abs(Math.sin(t * danceFreq)) * 0.06;

      // Hips / rear wiggle left and right
      if (hipsRef.current) {
        hipsRef.current.rotation.z = wiggleAngle;
        hipsRef.current.rotation.y = Math.cos(t * danceFreq) * 0.08;
      }

      // Entire character subtle bounce and sway
      if (characterGroupRef.current) {
        characterGroupRef.current.position.z = hopBounce;
        if (hovered || isSelected) {
          characterGroupRef.current.rotation.z = Math.sin(t * 4) * 0.08;
        } else {
          characterGroupRef.current.rotation.z = 0;
        }
      }
    }

    // Rotating and pulsing target beacon ring
    if (targetBeaconRef.current && isTarget) {
      targetBeaconRef.current.rotation.z += 0.02;
      const s = 1.0 + Math.sin(t * 4) * 0.12;
      targetBeaconRef.current.scale.set(s, s, 1);
    }
  });

  const shortsColor = online ? '#2563eb' : '#8C7360';
  const shirtColor = online ? '#7dd3fc' : '#BEB5A9';
  const skinColor = online ? '#fed7aa' : '#E1D4C2';
  const hairColor = '#6E473B';
  const shoeColor = online ? '#86efac' : '#BEB5A9';

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 1. Ground Drop Shadow / Target Halo Ring */}
      <mesh position={[0, -0.05, 0.01]}>
        <circleGeometry args={[0.75, 32]} />
        <meshBasicMaterial
          color="#A78D78"
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      {/* Target Destination Beacon Ring */}
      {isTarget && (
        <group ref={targetBeaconRef} position={[0, 0, 0.02]}>
          <mesh>
            <ringGeometry args={[0.95, 1.2, 32]} />
            <meshBasicMaterial
              color="#9E4338"
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh>
            <ringGeometry args={[1.3, 1.42, 32]} />
            <meshBasicMaterial
              color="#B93838"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Destination Beacon Light */}
          <pointLight color="#9E4338" intensity={1.8} distance={3.5} position={[0, 0, 0.6]} />
        </group>
      )}

      {/* 2. Animated Shinchan Character 3D Geometry */}
      <group ref={characterGroupRef}>
        {/* Legs & Feet (Stationary base on ground) */}
        {/* Left Leg & Shoe */}
        <mesh position={[-0.1, 0.04, 0.12]}>
          <cylinderGeometry args={[0.045, 0.045, 0.22, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <mesh position={[-0.1, 0.02, 0.04]}>
          <boxGeometry args={[0.09, 0.14, 0.07]} />
          <meshStandardMaterial color={shoeColor} roughness={0.4} />
        </mesh>

        {/* Right Leg & Shoe */}
        <mesh position={[0.1, 0.04, 0.12]}>
          <cylinderGeometry args={[0.045, 0.045, 0.22, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <mesh position={[0.1, 0.02, 0.04]}>
          <boxGeometry args={[0.09, 0.14, 0.07]} />
          <meshStandardMaterial color={shoeColor} roughness={0.4} />
        </mesh>

        {/* Wiggling Hips & Blue Shorts Group */}
        <group ref={hipsRef} position={[0, 0.1, 0.58]}>
          {/* Left Cheek */}
          <mesh position={[-0.18, 0.05, 0.12]}>
            <sphereGeometry args={[0.26, 20, 20]} />
            <meshStandardMaterial color={shortsColor} roughness={0.35} metalness={0.1} />
          </mesh>
          {/* Right Cheek */}
          <mesh position={[0.18, 0.05, 0.12]}>
            <sphereGeometry args={[0.26, 20, 20]} />
            <meshStandardMaterial color={shortsColor} roughness={0.35} metalness={0.1} />
          </mesh>
          {/* Central Shorts Connection */}
          <mesh position={[0, 0.02, 0.1]}>
            <boxGeometry args={[0.38, 0.28, 0.32]} />
            <meshStandardMaterial color={shortsColor} roughness={0.35} metalness={0.1} />
          </mesh>
        </group>

        {/* Bent Forward Upper Torso & Cyan Shirt */}
        <mesh position={[0, -0.16, 0.52]} rotation={[0.4, 0, 0]}>
          <capsuleGeometry args={[0.18, 0.28, 12, 16]} />
          <meshStandardMaterial color={shirtColor} roughness={0.4} />
        </mesh>

        {/* Head & Face Group */}
        <group position={[-0.18, -0.34, 0.56]} rotation={[0, 0, -0.2]}>
          {/* Head Sphere */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
          {/* Hair Cap */}
          <mesh position={[0.04, 0.06, 0.08]}>
            <sphereGeometry args={[0.21, 16, 16]} />
            <meshStandardMaterial color={hairColor} roughness={0.6} />
          </mesh>
          {/* Ear */}
          <mesh position={[-0.14, 0.02, 0]}>
            <capsuleGeometry args={[0.04, 0.08, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
          {/* Open Laughing Mouth */}
          <mesh position={[-0.04, -0.18, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.02, 12]} />
            <meshStandardMaterial color="#991b1b" />
          </mesh>
        </group>

        {/* 3. High-Resolution Textured Billboard Plate (Shinchan Artwork) */}
        {/* Tilted to face the isometric camera angle for perfect, flawless likeness */}
        <mesh position={[0, -0.05, 0.82]} rotation={[Math.PI / 3.2, 0, 0]}>
          <planeGeometry args={[1.85, 1.85]} />
          <meshBasicMaterial
            map={NETWORK_TEXTURES.clientHost}
            transparent
            alphaTest={0.1}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
};

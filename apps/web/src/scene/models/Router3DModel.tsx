/**
 * @file scene/models/Router3DModel.tsx
 * @description 3D Wi-Fi Router model matching Image 1:
 * Rounded matte charcoal casing, dual vertical antennas, front buttons,
 * glowing cyan LED button, and high-definition texture integration.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NETWORK_TEXTURES } from '../textures';

interface Router3DModelProps {
  isSelected: boolean;
  hovered: boolean;
  online: boolean;
}

export const Router3DModel: React.FC<Router3DModelProps> = ({
  isSelected,
  hovered,
  online
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftAntennaRef = useRef<THREE.Group>(null);
  const rightAntennaRef = useRef<THREE.Group>(null);
  const ledRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Subtle antenna wobble on hover/selection
    if (leftAntennaRef.current && rightAntennaRef.current) {
      const wiggle = hovered || isSelected ? Math.sin(t * 4) * 0.05 : 0;
      leftAntennaRef.current.rotation.x = wiggle;
      rightAntennaRef.current.rotation.x = -wiggle;
    }

    // Cyan LED pulsing glow
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        if (!online) {
          mat.emissiveIntensity = 0.0;
        } else {
          mat.emissiveIntensity = 1.2 + Math.sin(t * 5) * 0.6;
        }
      }
    }
  });

  const casingColor = online ? '#E1D4C2' : '#D0C4B2';
  const antennaColor = online ? '#A78D78' : '#BEB5A9';
  const buttonColor = online ? '#BEB5A9' : '#D5C8B6';
  const ledColor = online ? '#6E473B' : '#A78D78';
  const ledEmissive = online ? '#C07A48' : '#E1D4C2';

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 1. Base Drop Shadow / Ground Contact Ring */}
      <mesh position={[0, -0.05, 0.01]}>
        <planeGeometry args={[1.6, 1.4]} />
        <meshBasicMaterial
          color="#A78D78"
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Main Router Body Chassis */}
      {/* Central main body slab */}
      <mesh position={[0, 0, 0.22]}>
        <boxGeometry args={[1.35, 1.0, 0.36]} />
        <meshStandardMaterial
          color={casingColor}
          roughness={0.4}
          metalness={0.25}
        />
      </mesh>

      {/* Beveled curved side caps for rounded 3D look */}
      <mesh position={[-0.675, 0, 0.22]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.36, 16, 1, false, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={casingColor} roughness={0.4} metalness={0.25} />
      </mesh>
      <mesh position={[0.675, 0, 0.22]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.36, 16, 1, false, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={casingColor} roughness={0.4} metalness={0.25} />
      </mesh>

      {/* 3. Dual Rear Antennas */}
      {/* Left Antenna */}
      <group ref={leftAntennaRef} position={[-0.46, 0.42, 0.3]}>
        {/* Swivel Collar Base */}
        <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.085, 0.12, 16]} />
          <meshStandardMaterial color={antennaColor} roughness={0.35} metalness={0.3} />
        </mesh>
        {/* Antenna Mast Tube */}
        <mesh position={[0, 0, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.048, 0.052, 0.82, 16]} />
          <meshStandardMaterial color={antennaColor} roughness={0.35} metalness={0.3} />
        </mesh>
        {/* Antenna Top Dome Cap */}
        <mesh position={[0, 0, 0.93]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={antennaColor} roughness={0.35} metalness={0.3} />
        </mesh>
      </group>

      {/* Right Antenna */}
      <group ref={rightAntennaRef} position={[0.46, 0.42, 0.3]}>
        {/* Swivel Collar Base */}
        <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.085, 0.12, 16]} />
          <meshStandardMaterial color={antennaColor} roughness={0.35} metalness={0.3} />
        </mesh>
        {/* Antenna Mast Tube */}
        <mesh position={[0, 0, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.048, 0.052, 0.82, 16]} />
          <meshStandardMaterial color={antennaColor} roughness={0.35} metalness={0.3} />
        </mesh>
        {/* Antenna Top Dome Cap */}
        <mesh position={[0, 0, 0.93]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={antennaColor} roughness={0.35} metalness={0.3} />
        </mesh>
      </group>

      {/* 4. Front Panel Buttons (Facing -Y towards camera) */}
      {/* Button 1 */}
      <mesh position={[-0.42, -0.51, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.04, 16]} />
        <meshStandardMaterial color={buttonColor} roughness={0.5} />
      </mesh>
      {/* Button 2 */}
      <mesh position={[-0.24, -0.51, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.04, 16]} />
        <meshStandardMaterial color={buttonColor} roughness={0.5} />
      </mesh>
      {/* Button 3 */}
      <mesh position={[-0.06, -0.51, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.04, 16]} />
        <meshStandardMaterial color={buttonColor} roughness={0.5} />
      </mesh>

      {/* Cyan Glowing Power / WPS Button on Front Right */}
      <mesh ref={ledRef} position={[0.34, -0.51, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 16]} />
        <meshStandardMaterial
          color={ledColor}
          emissive={ledEmissive}
          emissiveIntensity={1.5}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* Local Cyan Point Light for WPS LED */}
      {online && (
        <pointLight
          position={[0.34, -0.7, 0.25]}
          color="#C07A48"
          intensity={0.6}
          distance={1.5}
        />
      )}

      {/* 5. High-Resolution Textured Billboard Plate (Image 1 Artwork) */}
      {/* Angled facing the isometric camera (-Y, +Z) for razor-sharp visual fidelity */}
      <mesh position={[0, -0.05, 0.58]} rotation={[Math.PI / 3.2, 0, 0]}>
        <planeGeometry args={[1.7, 1.7]} />
        <meshBasicMaterial
          map={NETWORK_TEXTURES.router}
          transparent
          alphaTest={0.1}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

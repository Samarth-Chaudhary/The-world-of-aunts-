/**
 * @file scene/NetworkPacket3D.tsx
 * @description 3D in-flight packet animation matching Image 4:
 * Detailed document folder model with papers sticking out, frosted glass front pocket,
 * orientation aligned with the transit velocity vector, luminous trail, and high-definition texture.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SimulationPacket, NetworkNode } from '@nexus/shared';
import { NETWORK_TEXTURES } from './textures';

interface NetworkPacket3DProps {
  packet: SimulationPacket;
  nodesMap: Map<string, NetworkNode>;
}

export const NetworkPacket3D: React.FC<NetworkPacket3DProps> = ({ packet, nodesMap }) => {
  const groupRef = useRef<THREE.Group>(null);
  const u = packet.route[packet.currentHopIndex];
  const v = packet.route[packet.currentHopIndex + 1];
  const nodeU = nodesMap.get(u);
  const nodeV = nodesMap.get(v);

  // Calculate current interpolated position and heading angle
  const { position, headingAngle } = useMemo(() => {
    if (!nodeU || !nodeV) {
      return { position: new THREE.Vector3(0, 0, -100), headingAngle: 0 };
    }

    const t = Math.max(0, Math.min(1, packet.progress));
    const dx = nodeV.x - nodeU.x;
    const dy = nodeV.y - nodeU.y;
    const x = nodeU.x + dx * t;
    const y = nodeU.y + dy * t;
    // Parabolic arc above the edge line
    const z = 0.45 + Math.sin(t * Math.PI) * 0.35;

    // Angle of motion in XY plane
    const angle = Math.atan2(dy, dx);

    return {
      position: new THREE.Vector3(x, y, z),
      headingAngle: angle
    };
  }, [nodeU, nodeV, packet.progress]);

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle in-flight bobbing and banking
      groupRef.current.position.set(position.x, position.y, position.z);
      // Orient facing the movement direction and angled towards camera
      const progressT = Math.max(0, Math.min(1, packet.progress));
      const pitchArc = (0.5 - progressT) * 0.35;
      groupRef.current.rotation.set(Math.PI / 3.2 + pitchArc, 0, headingAngle - Math.PI / 2);
    }
  });

  if (!nodeU || !nodeV || packet.status !== 'in_transit') {
    return null;
  }

  const isDup = packet.isDuplicate;
  const glowColor = isDup ? '#B45309' : '#6E473B';

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      {/* 1. Point Light for Packet Illumination */}
      <pointLight color={glowColor} intensity={2.0} distance={4.0} />

      {/* 2. Document Folder 3D Geometry */}
      <group scale={isDup ? 0.95 : 1.15}>
        {/* Back Folder Plate */}
        <mesh position={[0, 0, -0.04]}>
          <boxGeometry args={[0.82, 0.62, 0.05]} />
          <meshStandardMaterial
            color="#A78D78"
            roughness={0.4}
            metalness={0.15}
          />
        </mesh>

        {/* Tab on Back Folder */}
        <mesh position={[-0.22, 0.34, -0.04]}>
          <boxGeometry args={[0.34, 0.1, 0.05]} />
          <meshStandardMaterial color="#A78D78" roughness={0.4} />
        </mesh>

        {/* Three White Document Papers sticking out at angles */}
        {/* Paper 1 (Leftmost, taller) */}
        <mesh position={[-0.14, 0.1, 0.0]}>
          <boxGeometry args={[0.48, 0.52, 0.02]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        {/* Paper 2 (Middle) */}
        <mesh position={[0.07, 0.06, 0.025]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.44, 0.48, 0.02]} />
          <meshStandardMaterial color="#FAF7F2" roughness={0.2} />
        </mesh>
        {/* Paper 3 (Rightmost) */}
        <mesh position={[0.18, 0.03, 0.04]} rotation={[0, 0, 0.14]}>
          <boxGeometry args={[0.38, 0.42, 0.02]} />
          <meshStandardMaterial color="#F4EFEB" roughness={0.2} />
        </mesh>

        {/* Translucent Frosted Glass Front Pocket */}
        <mesh position={[0, -0.1, 0.07]}>
          <boxGeometry args={[0.84, 0.42, 0.04]} />
          <meshPhysicalMaterial
            color="#BEB5A9"
            transparent
            opacity={0.65}
            roughness={0.25}
            metalness={0.1}
            transmission={0.65}
            ior={1.4}
          />
        </mesh>

        {/* 3. High-Resolution Textured Billboard Plate (Image 4 Packet Artwork) */}
        <mesh position={[0, 0, 0.09]}>
          <planeGeometry args={[1.05, 1.05]} />
          <meshBasicMaterial
            map={NETWORK_TEXTURES.packet}
            transparent
            alphaTest={0.1}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>

        {/* Glowing Energy Aura Disk */}
        <mesh position={[0, 0, -0.07]}>
          <circleGeometry args={[0.65, 24]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
};

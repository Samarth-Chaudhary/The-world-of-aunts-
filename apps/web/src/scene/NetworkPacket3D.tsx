/**
 * @file scene/NetworkPacket3D.tsx
 * @description 3D in-flight packet animation rendered along network edge vectors.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SimulationPacket, NetworkNode } from '@nexus/shared';

interface NetworkPacket3DProps {
  packet: SimulationPacket;
  nodesMap: Map<string, NetworkNode>;
}

export const NetworkPacket3D: React.FC<NetworkPacket3DProps> = ({ packet, nodesMap }) => {
  const u = packet.route[packet.currentHopIndex];
  const v = packet.route[packet.currentHopIndex + 1];
  const nodeU = nodesMap.get(u);
  const nodeV = nodesMap.get(v);

  const position = useMemo(() => {
    if (!nodeU || !nodeV) return new THREE.Vector3(0, 0, -100);

    const t = Math.max(0, Math.min(1, packet.progress));
    const x = nodeU.x + (nodeV.x - nodeU.x) * t;
    const y = nodeU.y + (nodeV.y - nodeU.y) * t;
    const z = 0.35 + Math.sin(t * Math.PI) * 0.25; // Gentle arc above the line

    return new THREE.Vector3(x, y, z);
  }, [nodeU, nodeV, packet.progress]);

  if (!nodeU || !nodeV || packet.status !== 'in_transit') {
    return null;
  }

  const color = packet.isDuplicate ? '#f59e0b' : '#38bdf8';
  const emissive = packet.isDuplicate ? '#d97706' : '#0284c7';

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Glowing Packet Core */}
      <mesh scale={packet.isDuplicate ? 0.28 : 0.35}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={1.5}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Point Light for Local Illumination */}
      <pointLight color={color} intensity={0.6} distance={2.5} />
    </group>
  );
};

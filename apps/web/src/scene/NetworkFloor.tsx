/**
 * @file scene/NetworkFloor.tsx
 * @description Perspective grid and simulation ground boundary for NEXUS.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';

export const NetworkFloor: React.FC = () => {
  const boundaryGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(30, 26, 0.05);
    return new THREE.EdgesGeometry(box);
  }, []);

  return (
    <group position={[0, 0, -0.05]}>
      {/* Primary perspective grid rotated into XY plane */}
      <gridHelper
        args={[36, 36, '#0284c7', '#0f2942']}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Planar boundary frame */}
      <lineSegments geometry={boundaryGeometry}>
        <lineBasicMaterial color="#1e3a5f" transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
};

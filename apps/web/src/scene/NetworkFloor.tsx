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
        args={[36, 36, '#A78D78', '#D8CEBF']}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Planar boundary frame */}
      <lineSegments geometry={boundaryGeometry}>
        <lineBasicMaterial color="#A78D78" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
};

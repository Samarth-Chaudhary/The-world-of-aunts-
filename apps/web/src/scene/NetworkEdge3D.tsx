/**
 * @file scene/NetworkEdge3D.tsx
 * @description 3D Network Edge rendering lines with distinct states:
 * candidate, forwarding, blocked/alternate, and failed.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import { NetworkNode, NetworkEdge, LinkVisualState } from '@nexus/shared';

interface NetworkEdge3DProps {
  edge: NetworkEdge;
  sourceNode: NetworkNode;
  targetNode: NetworkNode;
  visualState: LinkVisualState;
  showCost: boolean;
}

export const NetworkEdge3D: React.FC<NetworkEdge3DProps> = ({
  edge,
  sourceNode,
  targetNode,
  visualState,
  showCost
}) => {
  const points = useMemo(() => {
    return [
      new THREE.Vector3(sourceNode.x, sourceNode.y, 0.1),
      new THREE.Vector3(targetNode.x, targetNode.y, 0.1)
    ];
  }, [sourceNode.x, sourceNode.y, targetNode.x, targetNode.y]);

  const midPoint = useMemo(() => {
    return new THREE.Vector3(
      (sourceNode.x + targetNode.x) / 2,
      (sourceNode.y + targetNode.y) / 2,
      0.2
    );
  }, [sourceNode.x, sourceNode.y, targetNode.x, targetNode.y]);

  // Visual styling according to state language
  const { color, opacity, isDashed, lineWidth } = useMemo(() => {
    if (!edge.online || visualState === 'failed') {
      return { color: '#ef4444', opacity: 0.35, isDashed: true, lineWidth: 1.5 };
    }
    switch (visualState) {
      case 'forwarding':
        return { color: '#10b981', opacity: 0.95, isDashed: false, lineWidth: 3.5 };
      case 'blocked':
        return { color: '#f43f5e', opacity: 0.85, isDashed: true, lineWidth: 2.0 };
      case 'transitioning':
        return { color: '#f59e0b', opacity: 0.75, isDashed: true, lineWidth: 2.5 };
      case 'candidate':
      default:
        return { color: '#475569', opacity: 0.45, isDashed: false, lineWidth: 1.2 };
    }
  }, [visualState, edge.online]);

  return (
    <group>
      {/* 3D Line with custom width and dash support */}
      <Line
        points={points}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
        dashed={isDashed}
        dashScale={2}
        dashSize={0.4}
        gapSize={0.25}
      />

      {/* Midpoint badge for edge cost and blocked state */}
      <Html position={[midPoint.x, midPoint.y, midPoint.z]} center pointerEvents="none">
        <div className="flex items-center gap-1 select-none pointer-events-none">
          {visualState === 'blocked' && (
            <span className="px-1 py-0.2 bg-rose-950/90 text-rose-300 border border-rose-500 rounded text-[10px] font-mono font-bold shadow">
              BLK
            </span>
          )}
          {showCost && (
            <span className="px-1.5 py-0.2 bg-slate-900/80 text-slate-300 border border-slate-700 rounded text-[10px] font-mono">
              w:{edge.cost}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
};

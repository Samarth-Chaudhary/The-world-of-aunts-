/**
 * @file scene/NetworkNode3D.tsx
 * @description 3D Network Node component using custom high-fidelity 3D models:
 * Image 1: Wi-Fi Router (role: router / bridge)
 * Image 2: Client Server Base / Cell Tower (role: gateway)
 * Image 3: Client Host mascot (role: endpoint / target destination)
 */

import React, { useRef, useState, useMemo } from 'react';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { NetworkNode } from '@nexus/shared';
import { useNetworkStore } from '../state/networkStore';
import { Router3DModel } from './models/Router3DModel';
import { ServerBase3DModel } from './models/ServerBase3DModel';
import { ClientHost3DModel } from './models/ClientHost3DModel';

interface NetworkNode3DProps {
  node: NetworkNode;
  isSelected: boolean;
  isTarget: boolean;
  isRoot: boolean;
}

export const NetworkNode3D: React.FC<NetworkNode3DProps> = ({
  node,
  isSelected,
  isTarget,
  isRoot
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const { selectNode, moveNode } = useNetworkStore();
  const { camera, raycaster } = useThree();

  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Proximity Ring Circle geometry
  const ringGeometry = useMemo(() => {
    return new THREE.RingGeometry(node.radius - 0.05, node.radius + 0.05, 64);
  }, [node.radius]);

  // Accent color for auras
  const auraColor = useMemo(() => {
    if (!node.online) return '#A78D78';
    if (node.role === 'gateway') return '#6E473B';
    if (node.role === 'endpoint') return isTarget ? '#9E4338' : '#8C7360';
    return '#C07A48';
  }, [node.role, node.online, isTarget]);

  // Pointer drag handling in XY plane (Z = 0)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const planeIntersect = useMemo(() => new THREE.Vector3(), []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    selectNode(node.id);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    try {
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    } catch (_) {}
    setIsDragging(false);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();

    // Raycast onto the XY plane
    raycaster.setFromCamera(e.pointer, camera);
    if (raycaster.ray.intersectPlane(plane, planeIntersect)) {
      moveNode(node.id, planeIntersect.x, planeIntersect.y);
    }
  };

  return (
    <group
      ref={meshRef}
      position={[node.x, node.y, 0]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* 1. Proximity Wireless Aura Ring */}
      <mesh geometry={ringGeometry} position={[0, 0, -0.02]}>
        <meshBasicMaterial
          color={auraColor}
          transparent
          opacity={hovered || isSelected ? 0.35 : 0.18}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Selection Ring Indicator */}
      {isSelected && (
        <mesh position={[0, 0, -0.01]}>
          <ringGeometry args={[1.1, 1.35, 32]} />
          <meshBasicMaterial color="#6E473B" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Target Marker Ring */}
      {isTarget && (
        <mesh position={[0, 0, -0.01]}>
          <ringGeometry args={[1.4, 1.65, 32]} />
          <meshBasicMaterial color="#9E4338" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Root Bridge Crown Marker */}
      {isRoot && (
        <mesh position={[0, 0, 0.05]}>
          <ringGeometry args={[1.2, 1.35, 24]} />
          <meshBasicMaterial color="#2D6A4F" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 3. Role-Specific High-Fidelity 3D Models */}
      <group scale={1.25}>
        {node.role === 'gateway' ? (
          // Client Server Base (Cell Tower / Base Station - Image 2)
          <ServerBase3DModel
            isSelected={isSelected}
            hovered={hovered}
            online={node.online}
            isRoot={isRoot}
          />
        ) : node.role === 'endpoint' ? (
          // Client Host (Furry Creature Mascot / Destination - Image 3)
          <ClientHost3DModel
            isSelected={isSelected}
            isTarget={isTarget}
            hovered={hovered}
            online={node.online}
          />
        ) : (
          // Routers (Wi-Fi Router with dual antennas & glowing button - Image 1)
          <Router3DModel
            isSelected={isSelected}
            hovered={hovered}
            online={node.online}
          />
        )}
      </group>

      {/* 4. DOM Label Overlay */}
      <Html position={[0, -1.35, 0]} center pointerEvents="none">
        <div className={`px-2.5 py-1 rounded text-xs font-mono font-medium whitespace-nowrap shadow select-none flex items-center gap-1.5 transition-all ${
          !node.online
            ? 'bg-slate-900/90 text-slate-500 border border-slate-700 line-through'
            : isSelected
            ? 'bg-cyan-950/95 text-cyan-200 border border-cyan-400 font-bold scale-105'
            : 'bg-slate-900/85 text-slate-200 border border-slate-800'
        }`}>
          {/* Role Thumbnail / Icon Badge */}
          <img
            src={
              node.role === 'gateway'
                ? '/assets/server_base.png'
                : node.role === 'endpoint'
                ? '/assets/client_host.png'
                : '/assets/router.png'
            }
            alt=""
            className="w-4 h-4 object-contain"
          />

          <span>{node.name}</span>

          {isRoot && (
            <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-1 py-0.5 rounded font-bold border border-emerald-600">
              ROOT
            </span>
          )}

          {isTarget && (
            <span className="text-[10px] bg-pink-900/80 text-pink-300 px-1 py-0.5 rounded font-bold border border-pink-600 animate-pulse">
              DESTINATION
            </span>
          )}
        </div>
      </Html>
    </group>
  );
};

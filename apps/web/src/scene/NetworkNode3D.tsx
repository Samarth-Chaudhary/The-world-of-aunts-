/**
 * @file scene/NetworkNode3D.tsx
 * @description 3D Network Node component with proximity ring, role meshes,
 * selection glow, and interactive pointer dragging.
 */

import React, { useRef, useState, useMemo } from 'react';
import { ThreeEvent, useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { NetworkNode } from '@nexus/shared';
import { useNetworkStore } from '../state/networkStore';

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
  const roleMeshRef = useRef<THREE.Mesh>(null);
  const { selectNode, moveNode, reducedMotion } = useNetworkStore();
  const { camera, raycaster, gl } = useThree();

  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Proximity Ring Circle geometry
  const ringGeometry = useMemo(() => {
    return new THREE.RingGeometry(node.radius - 0.05, node.radius + 0.05, 64);
  }, [node.radius]);

  // Mesh color and shape depending on role and status
  const roleColors = useMemo(() => {
    if (!node.online) return { base: '#475569', emissive: '#1e293b' };
    switch (node.role) {
      case 'gateway':
        return { base: '#38bdf8', emissive: '#0284c7' };
      case 'bridge':
        return { base: '#10b981', emissive: '#059669' };
      case 'router':
        return { base: '#f59e0b', emissive: '#d97706' };
      case 'endpoint':
        return { base: '#818cf8', emissive: '#4f46e5' };
      default:
        return { base: '#94a3b8', emissive: '#334155' };
    }
  }, [node.role, node.online]);

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

  useFrame((_, delta) => {
    if (!reducedMotion && roleMeshRef.current && (node.role === 'gateway' || isRoot)) {
      roleMeshRef.current.rotation.z += delta * 0.7;
    }
  });

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
      {/* 1. Simulated Proximity Ring */}
      <mesh geometry={ringGeometry} position={[0, 0, -0.02]}>
        <meshBasicMaterial
          color={roleColors.base}
          transparent
          opacity={hovered || isSelected ? 0.35 : 0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Selection Ring Indicator */}
      {isSelected && (
        <mesh position={[0, 0, -0.01]}>
          <ringGeometry args={[0.9, 1.15, 32]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Target Marker */}
      {isTarget && (
        <mesh position={[0, 0, -0.01]}>
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial color="#ec4899" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Root Bridge Crown Marker */}
      {isRoot && (
        <mesh position={[0, 0, 0.85]}>
          <ringGeometry args={[0.3, 0.45, 24]} />
          <meshBasicMaterial color="#10b981" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 3. Role-Specific 3D Geometry */}
      {node.role === 'gateway' ? (
        // Gateway: Octahedron / Diamond
        <mesh ref={roleMeshRef} position={[0, 0, 0.4]} scale={0.7}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={roleColors.base}
            emissive={roleColors.emissive}
            emissiveIntensity={isSelected ? 0.8 : 0.3}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      ) : node.role === 'bridge' ? (
        // Bridge: Rounded Cube / Cylinder
        <mesh ref={roleMeshRef} position={[0, 0, 0.3]} scale={0.65}>
          <boxGeometry args={[1, 1, 0.8]} />
          <meshStandardMaterial
            color={roleColors.base}
            emissive={roleColors.emissive}
            emissiveIntensity={isSelected ? 0.8 : 0.3}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      ) : (
        // Endpoint / Host: Sphere
        <mesh position={[0, 0, 0.3]} scale={0.55}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshStandardMaterial
            color={roleColors.base}
            emissive={roleColors.emissive}
            emissiveIntensity={isSelected ? 0.8 : 0.3}
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>
      )}

      {/* 4. DOM Label Overlay */}
      <Html position={[0, -1.0, 0]} center pointerEvents="none">
        <div className={`px-2 py-0.5 rounded text-xs font-mono font-medium whitespace-nowrap shadow select-none ${
          !node.online
            ? 'bg-slate-900/90 text-slate-500 border border-slate-700 line-through'
            : isSelected
            ? 'bg-cyan-950/90 text-cyan-200 border border-cyan-400 font-bold'
            : 'bg-slate-900/80 text-slate-200 border border-slate-800'
        }`}>
          {node.name}
          {isRoot && <span className="ml-1 text-emerald-400 font-bold">[ROOT]</span>}
          {isTarget && <span className="ml-1 text-pink-400 font-bold">[TARGET]</span>}
        </div>
      </Html>
    </group>
  );
};

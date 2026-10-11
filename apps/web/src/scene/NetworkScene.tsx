/**
 * @file scene/NetworkScene.tsx
 * @description Main 3D Canvas Scene for NEXUS Command Center using React Three Fiber.
 * Renders nodes, edges, in-flight packets, and runs the simulation clock ticker.
 */

import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import { LinkVisualState, STPResult, DijkstraResult, MSTResult } from '@nexus/shared';
import { useNetworkStore } from '../state/networkStore';
import { NetworkFloor } from './NetworkFloor';
import { NetworkNode3D } from './NetworkNode3D';
import { NetworkEdge3D } from './NetworkEdge3D';
import { NetworkPacket3D } from './NetworkPacket3D';

const SimulationTicker: React.FC = () => {
  const stepSimulation = useNetworkStore((state) => state.stepSimulation);
  useFrame((_, delta) => {
    // Cap step at 100ms to avoid tunneling during frame drops
    stepSimulation(Math.min(100, delta * 1000));
  });
  return null;
};

interface CameraControllerProps {
  preset: 'iso' | 'top' | 'side';
}

const CameraController: React.FC<CameraControllerProps> = ({ preset }) => {
  const { camera } = useThree();

  React.useEffect(() => {
    if (preset === 'top') {
      camera.position.set(0, -0.01, 24);
      camera.lookAt(0, 0, 0);
    } else if (preset === 'side') {
      camera.position.set(16, -14, 12);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(0, -18, 18);
      camera.lookAt(0, 0, 0);
    }
  }, [preset, camera]);

  return null;
};

export const NetworkScene: React.FC = () => {
  const {
    nodes,
    edges,
    packets,
    algorithmMode,
    activeResult,
    selectedNodeId,
    targetEndpointId,
    rootPinnedId
  } = useNetworkStore();

  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'side'>('iso');

  const nodeMap = useMemo(() => {
    const map = new Map();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  // Determine visual state for each edge according to active algorithm
  const getEdgeVisualState = (edgeId: string): LinkVisualState => {
    if (!activeResult) return 'candidate';

    if (algorithmMode === 'STP') {
      const stp = activeResult as STPResult;
      if (stp.blockedEdgeIds?.includes(edgeId)) return 'blocked';
      if (stp.forwardingEdgeIds?.includes(edgeId)) return 'forwarding';
      return 'candidate';
    }

    if (algorithmMode === 'DIJKSTRA') {
      const dij = activeResult as DijkstraResult;
      if (dij.pathEdgeIds?.includes(edgeId)) return 'forwarding';
      return 'candidate';
    }

    if (algorithmMode === 'MST') {
      const mst = activeResult as MSTResult;
      if (mst.selectedEdgeIds?.includes(edgeId)) return 'forwarding';
      return 'candidate';
    }

    if (algorithmMode === 'STORM') {
      return 'transitioning';
    }

    return 'candidate';
  };

  const stpRootId =
    algorithmMode === 'STP' && activeResult
      ? (activeResult as STPResult).rootBridgeId
      : rootPinnedId;

  return (
    <div className="w-full h-full relative bg-slate-950 overflow-hidden select-none">
      <Canvas
        camera={{ position: [0, -18, 18], fov: 45, up: [0, 0, 1] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#070a10']} />
        <fog attach="fog" args={['#070a10', 25, 65]} />

        {/* Ambient & directional lighting */}
        <ambientLight intensity={0.65} />
        <directionalLight position={[10, 10, 20]} intensity={1.1} />
        <pointLight position={[0, 0, 12]} intensity={0.5} />

        <CameraController preset={cameraPreset} />

        {/* Camera Map Controls (Pan, Zoom, Orbit) */}
        <MapControls
          enableRotate={true}
          enableDamping={true}
          dampingFactor={0.12}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={50}
        />

        {/* Ground perspective grid */}
        <NetworkFloor />

        {/* Simulation Clock Runner */}
        <SimulationTicker />

        {/* Network Edges */}
        <group>
          {edges.map((edge) => {
            const src = nodeMap.get(edge.sourceId);
            const tgt = nodeMap.get(edge.targetId);
            if (!src || !tgt) return null;

            return (
              <NetworkEdge3D
                key={edge.id}
                edge={edge}
                sourceNode={src}
                targetNode={tgt}
                visualState={getEdgeVisualState(edge.id)}
                showCost={true}
              />
            );
          })}
        </group>

        {/* In-Flight 3D Packets */}
        <group>
          {packets.map((pkt) => (
            <NetworkPacket3D key={pkt.id} packet={pkt} nodesMap={nodeMap} />
          ))}
        </group>

        {/* Network Nodes */}
        <group>
          {nodes.map((node) => (
            <NetworkNode3D
              key={node.id}
              node={node}
              isSelected={node.id === selectedNodeId}
              isTarget={node.id === targetEndpointId}
              isRoot={node.id === stpRootId}
            />
          ))}
        </group>
      </Canvas>

      {/* Canvas Viewport Overlay Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded shadow text-xs font-mono text-slate-300">
          <span className="text-cyan-400 font-bold">NEXUS 3D VIEWPORT</span> • Click & drag nodes to adjust topology
        </div>

        {/* Camera Angles Selector */}
        <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur border border-slate-800 p-1 rounded shadow text-[11px] font-mono w-fit">
          <span className="text-slate-400 px-1">Camera:</span>
          <button
            onClick={() => setCameraPreset('iso')}
            className={`px-2 py-0.5 rounded transition-colors ${
              cameraPreset === 'iso' ? 'bg-cyan-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Isometric
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className={`px-2 py-0.5 rounded transition-colors ${
              cameraPreset === 'top' ? 'bg-cyan-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Top-Down
          </button>
          <button
            onClick={() => setCameraPreset('side')}
            className={`px-2 py-0.5 rounded transition-colors ${
              cameraPreset === 'side' ? 'bg-cyan-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Perspective
          </button>
        </div>
      </div>
    </div>
  );
};

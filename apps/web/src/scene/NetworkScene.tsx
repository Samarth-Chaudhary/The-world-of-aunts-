/**
 * @file scene/NetworkScene.tsx
 * @description Main 3D Canvas Scene for NEXUS Command Center using React Three Fiber.
 * Renders nodes, edges, in-flight packets, and provides both Tabletop and Free 360° Camera controls
 * allowing full spherical orbit from every angle, screen-space panning, infinite zoom, and WASD fly navigation.
 */

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { LinkVisualState, STPResult, DijkstraResult, MSTResult } from '@nexus/shared';
import { useNetworkStore } from '../state/networkStore';
import { NetworkFloor } from './NetworkFloor';
import { NetworkNode3D } from './NetworkNode3D';
import { NetworkEdge3D } from './NetworkEdge3D';
import { NetworkPacket3D } from './NetworkPacket3D';
import {
  Rotate3d,
  Compass,
  Move,
  Crosshair,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export type CameraMode = 'free' | 'tabletop';
export type AnglePreset = 'iso' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';

const SimulationTicker: React.FC = () => {
  const stepSimulation = useNetworkStore((state) => state.stepSimulation);
  useFrame((_, delta) => {
    // Cap step at 100ms to avoid tunneling during frame drops
    stepSimulation(Math.min(100, delta * 1000));
  });
  return null;
};

interface CameraControllerProps {
  controlsRef: React.RefObject<OrbitControlsImpl>;
  cameraMode: CameraMode;
  targetPreset: { name: AnglePreset; id: number } | null;
  nudgeSignal: { x: number; y: number; z: number; id: number } | null;
  focusTarget: [number, number, number] | null;
  focusSignalId: number;
}

const CameraController: React.FC<CameraControllerProps> = ({
  controlsRef,
  cameraMode,
  targetPreset,
  nudgeSignal,
  focusTarget,
  focusSignalId
}) => {
  const { camera } = useThree();
  const keysPressed = useRef<Set<string>>(new Set());

  // Listen for WASD / QE / Arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      keysPressed.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    const handleBlur = () => {
      keysPressed.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Preset angle snap
  useEffect(() => {
    if (!targetPreset || !controlsRef.current) return;
    const controls = controlsRef.current;
    const target = controls.target;
    const dist = 24;

    switch (targetPreset.name) {
      case 'top':
        camera.position.set(target.x, target.y - 0.01, target.z + dist);
        break;
      case 'bottom':
        // Full view from underneath looking up at the nodes and models
        camera.position.set(target.x, target.y + 0.01, target.z - dist);
        break;
      case 'front':
        camera.position.set(target.x, target.y - dist, target.z + 1);
        break;
      case 'back':
        camera.position.set(target.x, target.y + dist, target.z + 1);
        break;
      case 'left':
        camera.position.set(target.x - dist, target.y, target.z + 1);
        break;
      case 'right':
        camera.position.set(target.x + dist, target.y, target.z + 1);
        break;
      case 'iso':
      default:
        camera.position.set(target.x + 13, target.y - 15, target.z + 14);
        break;
    }
    camera.lookAt(target);
    controls.update();
  }, [targetPreset, camera, controlsRef]);

  // Focus on node / target
  useEffect(() => {
    if (focusSignalId === 0 || !controlsRef.current) return;
    const controls = controlsRef.current;
    const [tx, ty, tz] = focusTarget ?? [0, 0, 0];
    const dx = tx - controls.target.x;
    const dy = ty - controls.target.y;
    const dz = tz - controls.target.z;

    camera.position.x += dx;
    camera.position.y += dy;
    camera.position.z += dz;
    controls.target.set(tx, ty, tz);
    controls.update();
  }, [focusSignalId, focusTarget, camera, controlsRef]);

  // Manual Nudge (D-Pad)
  useEffect(() => {
    if (!nudgeSignal || !controlsRef.current) return;
    const controls = controlsRef.current;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const up = camera.up.clone().normalize();

    const move = new THREE.Vector3()
      .addScaledVector(forward, nudgeSignal.y)
      .addScaledVector(right, nudgeSignal.x)
      .addScaledVector(up, nudgeSignal.z);

    camera.position.add(move);
    controls.target.add(move);
    controls.update();
  }, [nudgeSignal, camera, controlsRef]);

  // Continuous WASD Flight Frame Ticker (in free mode)
  useFrame((_, delta) => {
    if (cameraMode !== 'free' || !controlsRef.current) return;
    const keys = keysPressed.current;
    if (keys.size === 0) return;

    const speed = 18 * Math.min(delta, 0.1);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    const up = camera.up.clone().normalize();
    const deltaMove = new THREE.Vector3();

    if (keys.has('KeyW') || keys.has('ArrowUp')) deltaMove.addScaledVector(forward, speed);
    if (keys.has('KeyS') || keys.has('ArrowDown')) deltaMove.addScaledVector(forward, -speed);
    if (keys.has('KeyD') || keys.has('ArrowRight')) deltaMove.addScaledVector(right, speed);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) deltaMove.addScaledVector(right, -speed);
    if (keys.has('KeyE') || keys.has('Space') || keys.has('PageUp')) deltaMove.addScaledVector(up, speed);
    if (keys.has('KeyQ') || keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('PageDown')) deltaMove.addScaledVector(up, -speed);

    if (deltaMove.lengthSq() > 0) {
      camera.position.add(deltaMove);
      controlsRef.current.target.add(deltaMove);
      controlsRef.current.update();
    }
  });

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

  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Default to Free 360° Cam for unrestricted multi-angle navigation
  const [cameraMode, setCameraMode] = useState<CameraMode>('free');
  const [activePreset, setActivePreset] = useState<AnglePreset>('iso');
  const [targetPreset, setTargetPreset] = useState<{ name: AnglePreset; id: number } | null>(null);
  const [nudgeSignal, setNudgeSignal] = useState<{ x: number; y: number; z: number; id: number } | null>(null);
  const [focusSignalId, setFocusSignalId] = useState(0);
  const [showDpad, setShowDpad] = useState(false);

  const nodeMap = useMemo(() => {
    const map = new Map();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  // Selected node coordinates for Focus button
  const focusTarget = useMemo<[number, number, number] | null>(() => {
    if (selectedNodeId && nodeMap.has(selectedNodeId)) {
      const n = nodeMap.get(selectedNodeId);
      return [n.x, n.y, 0];
    }
    return [0, 0, 0];
  }, [selectedNodeId, nodeMap]);

  // Determine visual state for each edge according to Dijkstra shortest path
  const getEdgeVisualState = (edgeId: string): LinkVisualState => {
    if (!activeResult) return 'candidate';
    const dij = activeResult as DijkstraResult;
    if (dij.pathEdgeIds?.includes(edgeId)) return 'forwarding';
    return 'candidate';
  };

  const triggerPreset = (name: AnglePreset) => {
    setActivePreset(name);
    setTargetPreset({ name, id: Date.now() });
  };

  const triggerNudge = (x: number, y: number, z: number) => {
    setNudgeSignal({ x, y, z, id: Date.now() });
  };

  const triggerFocus = () => {
    setFocusSignalId(Date.now());
  };

  const triggerResetCenter = () => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.object.position.set(13, -15, 14);
      controlsRef.current.object.lookAt(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="w-full h-full relative bg-slate-950 overflow-hidden select-none">
      <Canvas
        camera={{ position: [13, -15, 14], fov: 42, up: [0, 0, 1] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#EAE2D5']} />
        <fog attach="fog" args={['#EAE2D5', 30, 85]} />

        {/* Ambient & directional lighting with warm tint */}
        <ambientLight intensity={0.95} color="#FFFDF7" />
        <directionalLight position={[10, 10, 20]} intensity={1.25} color="#FFFFFF" />
        <pointLight position={[0, 0, 12]} intensity={0.4} color="#FFFDF7" />

        {/* Bottom fill lighting for viewing from underneath every angle */}
        <directionalLight position={[-10, -10, -20]} intensity={0.75} color="#FFFDF7" />
        <pointLight position={[0, 0, -12]} intensity={0.35} color="#FFFDF7" />

        <CameraController
          controlsRef={controlsRef}
          cameraMode={cameraMode}
          targetPreset={targetPreset}
          nudgeSignal={nudgeSignal}
          focusTarget={focusTarget}
          focusSignalId={focusSignalId}
        />

        {/* Orbit / Map Controls configured for current camera mode */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableRotate={true}
          enablePan={true}
          enableZoom={true}
          enableDamping={true}
          dampingFactor={cameraMode === 'free' ? 0.08 : 0.12}
          minPolarAngle={0}
          maxPolarAngle={cameraMode === 'free' ? Math.PI : Math.PI / 2.1}
          minDistance={cameraMode === 'free' ? 0.5 : 4}
          maxDistance={cameraMode === 'free' ? 120 : 50}
          screenSpacePanning={cameraMode === 'free'}
          mouseButtons={
            cameraMode === 'free'
              ? {
                  LEFT: THREE.MOUSE.ROTATE,
                  MIDDLE: THREE.MOUSE.DOLLY,
                  RIGHT: THREE.MOUSE.PAN
                }
              : {
                  LEFT: THREE.MOUSE.PAN,
                  MIDDLE: THREE.MOUSE.DOLLY,
                  RIGHT: THREE.MOUSE.ROTATE
                }
          }
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
          {nodes.map((node) => {
            const hasPeersInRange = edges.some(
              (e) => e.online && (e.sourceId === node.id || e.targetId === node.id)
            );
            return (
              <NetworkNode3D
                key={node.id}
                node={node}
                isSelected={node.id === selectedNodeId}
                isTarget={node.id === targetEndpointId}
                isRoot={false}
                hasPeersInRange={hasPeersInRange}
              />
            );
          })}
        </group>
      </Canvas>

      {/* Canvas Viewport Overlay Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 max-w-xl">
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded shadow text-xs font-mono text-slate-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">NEXUS 3D VIEWPORT</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Click & drag nodes to position</span>
          </div>
          {cameraMode === 'free' && (
            <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-600/60 px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse">
              FREE 360° ACTIVE
            </span>
          )}
        </div>

        {/* Camera Mode & Angles Selector Bar */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 p-1.5 rounded-lg shadow-lg text-[11px] font-mono">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950/80 rounded p-0.5 border border-slate-800">
            <button
              onClick={() => setCameraMode('free')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                cameraMode === 'free'
                  ? 'bg-cyan-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Unrestricted 360° Sphere Orbit, Underneath View, Screen Pan, & WASD Flight"
            >
              <Rotate3d className="w-3.5 h-3.5" />
              <span>Free 360°</span>
            </button>
            <button
              onClick={() => setCameraMode('tabletop')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                cameraMode === 'tabletop'
                  ? 'bg-amber-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Constrained desk / tabletop view locked to upper hemisphere"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Tabletop</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-800" />

          {/* Quick Angle Presets */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => triggerPreset('iso')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activePreset === 'iso' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Isometric angle"
            >
              Iso
            </button>
            <button
              onClick={() => triggerPreset('top')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activePreset === 'top' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Zenith view looking straight down"
            >
              Top
            </button>
            <button
              onClick={() => triggerPreset('bottom')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activePreset === 'bottom' ? 'bg-emerald-700 text-white font-bold' : 'text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/60'
              }`}
              title="Nadir view looking straight up from underneath"
            >
              Bottom
            </button>
            <button
              onClick={() => triggerPreset('front')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activePreset === 'front' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Front elevation"
            >
              Front
            </button>
            <button
              onClick={() => triggerPreset('back')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activePreset === 'back' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Back elevation"
            >
              Back
            </button>
            <button
              onClick={() => triggerPreset('left')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activePreset === 'left' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Left profile"
            >
              Left
            </button>
            <button
              onClick={() => triggerPreset('right')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activePreset === 'right' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Right profile"
            >
              Right
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-800" />

          {/* Action Targets */}
          <div className="flex items-center gap-1">
            <button
              onClick={triggerFocus}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 transition-colors"
              title="Center camera pivot on selected node"
            >
              <Crosshair className="w-3 h-3 text-cyan-400" />
              <span>Focus</span>
            </button>
            <button
              onClick={triggerResetCenter}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
              title="Reset camera to center origin"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowDpad(!showDpad)}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                showDpad ? 'bg-cyan-700 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle On-Screen Navigation D-Pad"
            >
              <Compass className="w-3 h-3" />
              <span>D-Pad</span>
            </button>
          </div>
        </div>

        {/* Free Mode Interactive Cheat Sheet Strip */}
        {cameraMode === 'free' && (
          <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 px-2.5 py-1 rounded text-[10px] font-mono text-slate-400 flex items-center gap-2">
            <span className="text-cyan-300 font-semibold">Left Drag:</span> Orbit Any Angle
            <span className="text-slate-600">•</span>
            <span className="text-cyan-300 font-semibold">Right Drag:</span> Pan
            <span className="text-slate-600">•</span>
            <span className="text-cyan-300 font-semibold">Wheel:</span> Zoom
            <span className="text-slate-600">•</span>
            <span className="text-cyan-300 font-semibold">WASD / QE:</span> Fly Cam
          </div>
        )}
      </div>

      {/* Floating On-Screen Directional D-Pad (collapsible) */}
      {showDpad && (
        <div className="absolute bottom-6 left-4 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl shadow-2xl flex flex-col items-center gap-1.5 select-none font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between w-full px-1 text-[10px] text-slate-400 font-bold border-b border-slate-800 pb-1">
            <span>NAV CONTROLLER</span>
            <button onClick={() => setShowDpad(false)} className="hover:text-slate-200">✕</button>
          </div>

          {/* D-Pad Buttons */}
          <div className="grid grid-cols-3 gap-1 pt-1">
            <div />
            <button
              onClick={() => triggerNudge(0, 3, 0)}
              className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 rounded text-slate-200 flex items-center justify-center transition-colors"
              title="Move Forward"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <div />

            <button
              onClick={() => triggerNudge(-3, 0, 0)}
              className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 rounded text-slate-200 flex items-center justify-center transition-colors"
              title="Strafe Left"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={triggerResetCenter}
              className="p-2 bg-cyan-900/60 hover:bg-cyan-800 active:bg-cyan-600 border border-cyan-700/60 rounded text-cyan-200 flex items-center justify-center transition-colors font-bold text-[10px]"
              title="Center"
            >
              ⊙
            </button>
            <button
              onClick={() => triggerNudge(3, 0, 0)}
              className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 rounded text-slate-200 flex items-center justify-center transition-colors"
              title="Strafe Right"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div />
            <button
              onClick={() => triggerNudge(0, -3, 0)}
              className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 rounded text-slate-200 flex items-center justify-center transition-colors"
              title="Move Backward"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <div />
          </div>

          {/* Elevation & Zoom Controls */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80 w-full justify-center">
            <button
              onClick={() => triggerNudge(0, 0, 3)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 rounded text-[10px] font-bold"
              title="Elevate Up"
            >
              ↑ Up
            </button>
            <button
              onClick={() => triggerNudge(0, 0, -3)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 rounded text-[10px] font-bold"
              title="Descend Down"
            >
              ↓ Down
            </button>
            <button
              onClick={() => triggerNudge(0, 4, 0)}
              className="p-1 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => triggerNudge(0, -4, 0)}
              className="p-1 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

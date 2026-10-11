/**
 * @file components/Fallback2DView.tsx
 * @description Accessible 2D interactive canvas/SVG fallback when WebGL is unavailable or reduced-motion is requested.
 */

import React, { useRef, useState } from 'react';
import { useNetworkStore } from '../state/networkStore';
import { STPResult, DijkstraResult, MSTResult } from '@nexus/shared';

export const Fallback2DView: React.FC = () => {
  const {
    nodes,
    edges,
    selectedNodeId,
    targetEndpointId,
    rootPinnedId,
    algorithmMode,
    activeResult,
    selectNode,
    moveNode
  } = useNetworkStore();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Coordinate conversion:
  // Math plane: X in [-15, 15], Y in [-12, 12]
  // SVG viewbox: 0 to 800 width, 0 to 600 height
  const toSvgX = (x: number) => 400 + (x / 15) * 360;
  const toSvgY = (y: number) => 300 - (y / 12) * 260; // Invert Y for screen coords

  const toMathX = (svgX: number) => ((svgX - 400) / 360) * 15;
  const toMathY = (svgY: number) => -((svgY - 300) / 260) * 12;

  const handlePointerDown = (nodeId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    selectNode(nodeId);
    setDraggingNodeId(nodeId);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingNodeId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 800;
    const svgY = ((e.clientY - rect.top) / rect.height) * 600;
    moveNode(draggingNodeId, toMathX(svgX), toMathY(svgY));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
  };

  // Determine edge styling based on active algorithm
  const getEdgeStyle = (edgeId: string, sourceId: string, targetId: string) => {
    if (algorithmMode === 'STP' && activeResult) {
      const stp = activeResult as STPResult;
      const isBlocked = stp.blockedEdgeIds.includes(edgeId);
      const isForwarding = stp.forwardingEdgeIds.includes(edgeId);

      if (isBlocked) {
        return { stroke: '#f43f5e', strokeDasharray: '6,6', strokeWidth: 2, label: 'BLK' };
      }
      if (isForwarding) {
        return { stroke: '#10b981', strokeDasharray: 'none', strokeWidth: 3, label: 'FWD' };
      }
    }

    if (algorithmMode === 'DIJKSTRA' && activeResult) {
      const dij = activeResult as DijkstraResult;
      if (dij.pathEdgeIds.includes(edgeId)) {
        return { stroke: '#06b6d4', strokeDasharray: 'none', strokeWidth: 3.5, label: 'PATH' };
      }
    }

    if (algorithmMode === 'MST' && activeResult) {
      const mst = activeResult as MSTResult;
      if (mst.selectedEdgeIds.includes(edgeId)) {
        return { stroke: '#38bdf8', strokeDasharray: 'none', strokeWidth: 3, label: 'MST' };
      }
    }

    return { stroke: '#475569', strokeDasharray: '3,3', strokeWidth: 1.5, label: '' };
  };

  return (
    <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden select-none">
      <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded text-xs font-mono text-cyan-300 z-10">
        2D Fallback Mode (Accessible SVG Network Plane)
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 800 600"
        className="w-full h-full max-w-5xl"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Subtle Background Grid */}
        <defs>
          <pattern id="grid2d" width="40" height="40" patternUnits="userSpace">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="800" height="600" fill="url(#grid2d)" />

        {/* Proximity Auras (Rings) */}
        {nodes.map((node) => {
          if (!node.online) return null;
          const cx = toSvgX(node.x);
          const cy = toSvgY(node.y);
          const r = (node.radius / 15) * 360;
          return (
            <circle
              key={`aura-${node.id}`}
              cx={cx}
              cy={cy}
              r={r}
              fill="rgba(6, 182, 212, 0.04)"
              stroke="rgba(6, 182, 212, 0.2)"
              strokeDasharray="4,4"
              strokeWidth="1"
            />
          );
        })}

        {/* Candidate & Algorithmic Edges */}
        {edges.map((edge) => {
          const src = nodes.find((n) => n.id === edge.sourceId);
          const tgt = nodes.find((n) => n.id === edge.targetId);
          if (!src || !tgt) return null;

          const x1 = toSvgX(src.x);
          const y1 = toSvgY(src.y);
          const x2 = toSvgX(tgt.x);
          const y2 = toSvgY(tgt.y);
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          const style = getEdgeStyle(edge.id, edge.sourceId, edge.targetId);

          return (
            <g key={edge.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                strokeDasharray={style.strokeDasharray}
              />
              {/* Cost Badge */}
              <rect
                x={midX - 18}
                y={midY - 9}
                width="36"
                height="18"
                rx="4"
                fill="#0f172a"
                stroke={style.stroke}
                strokeWidth="1"
              />
              <text
                x={midX}
                y={midY + 3.5}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {style.label ? `${style.label}:${edge.cost.toFixed(0)}` : edge.cost.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const cx = toSvgX(node.x);
          const cy = toSvgY(node.y);
          const isSelected = node.id === selectedNodeId;
          const isTarget = node.id === targetEndpointId;
          const isPinnedRoot = node.id === rootPinnedId;

          let nodeFill = '#38bdf8';
          if (!node.online) nodeFill = '#64748b';
          else if (node.role === 'gateway') nodeFill = '#06b6d4';
          else if (node.role === 'bridge') nodeFill = '#10b981';
          else if (node.role === 'router') nodeFill = '#f59e0b';
          else nodeFill = '#818cf8';

          return (
            <g
              key={node.id}
              className="cursor-move"
              onPointerDown={(e) => handlePointerDown(node.id, e)}
            >
              {/* Selection Ring */}
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="26"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="4,2"
                />
              )}

              {/* Node Body */}
              <circle
                cx={cx}
                cy={cy}
                r="18"
                fill={nodeFill}
                stroke="#0f172a"
                strokeWidth="3"
                className="transition-transform hover:scale-110"
              />

              {/* Node Label */}
              <text
                x={cx}
                y={cy + 32}
                textAnchor="middle"
                fill="#f8fafc"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {node.name}
              </text>

              {/* Status Tags */}
              {isPinnedRoot && (
                <text
                  x={cx}
                  y={cy - 24}
                  textAnchor="middle"
                  fill="#f59e0b"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  [ROOT PIN]
                </text>
              )}
              {isTarget && (
                <text
                  x={cx}
                  y={cy - 24}
                  textAnchor="middle"
                  fill="#ec4899"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  [TARGET]
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

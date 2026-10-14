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
    packets,
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

  // Determine edge styling based on Dijkstra shortest path
  const getEdgeStyle = (edgeId: string, _sourceId: string, _targetId: string) => {
    if (activeResult) {
      const dij = activeResult as DijkstraResult;
      if (dij.pathEdgeIds?.includes(edgeId)) {
        return { stroke: '#06b6d4', strokeDasharray: 'none', strokeWidth: 3.5, label: 'SHORTEST' };
      }
    }

    return { stroke: '#475569', strokeDasharray: '3,3', strokeWidth: 1.5, label: '' };
  };

  return (
    <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden select-none">
      <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded text-xs font-mono text-cyan-300 z-10 shadow-sm">
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
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D8CEBF" strokeWidth="0.8" />
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
              fill="rgba(167, 141, 120, 0.08)"
              stroke="rgba(167, 141, 120, 0.4)"
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
                fill="#FAF7F2"
                stroke={style.stroke}
                strokeWidth="1"
              />
              <text
                x={midX}
                y={midY + 3.5}
                textAnchor="middle"
                fill="#291C0E"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {style.label ? `${style.label}:${edge.cost.toFixed(0)}` : edge.cost.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* In-Flight 2D Packets (Image 4) */}
        {packets.map((pkt) => {
          if (pkt.status !== 'in_transit') return null;
          const u = pkt.route[pkt.currentHopIndex];
          const v = pkt.route[pkt.currentHopIndex + 1];
          const nodeU = nodes.find((n) => n.id === u);
          const nodeV = nodes.find((n) => n.id === v);
          if (!nodeU || !nodeV) return null;

          const t = Math.max(0, Math.min(1, pkt.progress));
          const px = toSvgX(nodeU.x + (nodeV.x - nodeU.x) * t);
          const py = toSvgY(nodeU.y + (nodeV.y - nodeU.y) * t);

          return (
            <g key={`2d-pkt-${pkt.id}`}>
              <circle
                cx={px}
                cy={py}
                r="18"
                fill={pkt.isDuplicate ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)'}
              />
              <image
                href="/assets/packet.png"
                x={px - 16}
                y={py - 16}
                width="32"
                height="32"
                className="pointer-events-none drop-shadow"
              />
            </g>
          );
        })}

        {/* Nodes (Image 1 Router, Image 2 Server Base, Image 3 Client Host) */}
        {nodes.map((node) => {
          const cx = toSvgX(node.x);
          const cy = toSvgY(node.y);
          const isSelected = node.id === selectedNodeId;
          const isTarget = node.id === targetEndpointId;
          const isPinnedRoot = node.id === rootPinnedId;

          const imgSrc =
            node.role === 'gateway'
              ? '/assets/server_base.png'
              : node.role === 'endpoint'
              ? '/assets/client_host.png'
              : '/assets/router.png';

          return (
            <g
              key={node.id}
              className="cursor-move"
              onPointerDown={(e) => handlePointerDown(node.id, e)}
            >
              {/* Ground Glow Disk */}
              <circle
                cx={cx}
                cy={cy}
                r="26"
                fill={
                  node.role === 'gateway'
                    ? 'rgba(110, 71, 59, 0.15)'
                    : isTarget
                    ? 'rgba(158, 67, 56, 0.18)'
                    : 'rgba(167, 141, 120, 0.15)'
                }
              />

              {/* Selection Ring */}
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="30"
                  fill="none"
                  stroke="#6E473B"
                  strokeWidth="2.5"
                  strokeDasharray="4,2"
                />
              )}

              {/* Target Indicator Ring */}
              {isTarget && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="34"
                  fill="none"
                  stroke="#9E4338"
                  strokeWidth="2"
                  strokeDasharray="3,3"
                />
              )}

              {/* Node Image (Image 1, 2, or 3) */}
              <image
                href={imgSrc}
                x={cx - 24}
                y={cy - 24}
                width="48"
                height="48"
                className="transition-transform hover:scale-110 pointer-events-none drop-shadow-sm"
              />

              {/* Node Label */}
              <text
                x={cx}
                y={cy + 36}
                textAnchor="middle"
                fill="#291C0E"
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
                  y={cy - 28}
                  textAnchor="middle"
                  fill="#6E473B"
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
                  y={cy - 28}
                  textAnchor="middle"
                  fill="#9E4338"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  [FINAL DESTINATION]
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

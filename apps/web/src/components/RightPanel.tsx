/**
 * @file components/RightPanel.tsx
 * @description Compact, sleek Dijkstra Path Justification Inspector.
 * Formatted with high density to maximize screen estate for the central 3D network view.
 */

import React, { useState } from 'react';
import { useNetworkStore } from '../state/networkStore';
import { DijkstraResult } from '@nexus/shared';
import {
  Route,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calculator,
  ShieldCheck,
  PanelRightClose,
  CornerDownRight
} from 'lucide-react';

interface RightPanelProps {
  onClose?: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ onClose }) => {
  const {
    activeResult,
    selectedNodeId,
    targetEndpointId,
    selectNode,
    setTargetEndpoint,
    nodes,
    edges
  } = useNetworkStore();

  const [activeTab, setActiveTab] = useState<'why' | 'alts' | 'trace' | 'proof'>('why');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const dijkstra = activeResult as DijkstraResult | null;
  const sourceNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const targetNode = nodes.find((n) => n.id === targetEndpointId) || nodes[nodes.length - 1];

  const sourceHasPeersInRange = edges.some(
    (edge) =>
      edge.online &&
      (edge.sourceId === sourceNode.id || edge.targetId === sourceNode.id)
  );

  const getEdgeCost = (u: string, v: string): number => {
    const e = edges.find(
      (edge) =>
        (edge.sourceId === u && edge.targetId === v) ||
        (edge.sourceId === v && edge.targetId === u)
    );
    return e ? e.cost : 0;
  };

  return (
    <aside className="w-64 bg-slate-900/95 backdrop-blur border-l border-slate-800 flex flex-col h-full flex-shrink-0 select-none overflow-hidden text-slate-200 shadow-xl transition-all duration-150">
      {/* Header */}
      <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Route className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <div className="truncate">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-100 block truncate">
              Why This Path?
            </span>
            <span className="text-[9px] font-mono text-cyan-400 block truncate">
              Dijkstra Shortest Path
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-0.5">
            <ShieldCheck className="w-2.5 h-2.5" />
            OPT
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Collapse Right Sidebar"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Compact Endpoints Selector */}
      <div className="p-2 bg-slate-950/70 border-b border-slate-800/80 space-y-1.5 flex-shrink-0">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold">
          <span>ENDPOINTS</span>
          <span className="text-[9px] text-slate-500">Pick in 3D / dropdown</span>
        </div>
        <div className="space-y-1 text-[11px] font-mono">
          <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            <span className="text-[9px] text-cyan-400 font-bold w-7">SRC:</span>
            <select
              value={selectedNodeId || ''}
              onChange={(e) => selectNode(e.target.value)}
              className="w-full bg-transparent text-slate-200 text-[10px] focus:outline-none truncate"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id} className="bg-slate-900 text-slate-200">
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            <span className="text-[9px] text-emerald-400 font-bold w-7">DST:</span>
            <select
              value={targetEndpointId || ''}
              onChange={(e) => setTargetEndpoint(e.target.value)}
              className="w-full bg-transparent text-slate-200 text-[10px] focus:outline-none truncate"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id} className="bg-slate-900 text-slate-200">
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Primary Result Banner */}
      <div className="p-2 bg-slate-950 border-b border-slate-800 flex-shrink-0">
        {dijkstra && dijkstra.reachable ? (
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span className="text-slate-400 font-bold">CHOSEN PATH:</span>
              <span className="text-cyan-300 font-bold">
                Cost: {dijkstra.totalCost.toFixed(1)} ({dijkstra.hopCount}h)
              </span>
            </div>

            {/* Compact Visual Path Strip */}
            <div className="bg-slate-900 p-1.5 rounded border border-cyan-900/60 flex items-center gap-1 flex-wrap text-[10px] font-mono">
              {dijkstra.pathNodeIds.map((nodeId, idx, arr) => {
                const isSrc = idx === 0;
                const isDst = idx === arr.length - 1;
                return (
                  <React.Fragment key={nodeId}>
                    <span
                      className={`px-1 py-0.2 rounded font-bold ${
                        isSrc
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/80'
                          : isDst
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80'
                          : 'bg-slate-800 text-slate-300 border border-slate-700/80'
                      }`}
                      title={nodeId}
                    >
                      {nodeId}
                    </span>
                    {idx < arr.length - 1 && (
                      <ArrowRight className="w-2.5 h-2.5 text-cyan-500 flex-shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ) : !sourceHasPeersInRange ? (
          <div className="p-2 bg-rose-950/70 border border-rose-800 rounded space-y-1 font-mono text-[10px]">
            <div className="flex items-center gap-1.5 font-bold text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span>NO FLOW: OUT OF RANGE</span>
            </div>
            <p className="text-slate-300 leading-snug">
              <strong>{sourceNode.name}</strong> has no peers in its {sourceNode.radius.toFixed(1)}m range.
            </p>
            <p className="text-amber-300/90 leading-snug text-[9px]">
              Drag {sourceNode.name} closer to a router to create a link.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-1.5 bg-rose-950/40 border border-rose-900/80 rounded text-rose-300 font-mono text-[10px]">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <span>Target disconnected or offline.</span>
          </div>
        )}
      </div>

      {/* Sub-Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/80 text-[10px] font-mono flex-shrink-0">
        <button
          onClick={() => setActiveTab('why')}
          className={`flex-1 py-1.5 text-center font-bold border-b-2 transition-colors ${
            activeTab === 'why'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Why
        </button>
        <button
          onClick={() => setActiveTab('alts')}
          className={`flex-1 py-1.5 text-center font-bold border-b-2 transition-colors ${
            activeTab === 'alts'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Alts ({dijkstra?.alternativePaths.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('trace')}
          className={`flex-1 py-1.5 text-center font-bold border-b-2 transition-colors ${
            activeTab === 'trace'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Trace
        </button>
        <button
          onClick={() => setActiveTab('proof')}
          className={`flex-1 py-1.5 text-center font-bold border-b-2 transition-colors ${
            activeTab === 'proof'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Proof
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 font-mono text-[10px]">
        {/* =================================================================== */}
        {/* TAB 1: WHY */}
        {/* =================================================================== */}
        {activeTab === 'why' && (
          <div className="space-y-2">
            {!sourceHasPeersInRange ? (
              <div className="bg-rose-950/40 p-2 rounded border border-rose-800/80 space-y-1.5">
                <div className="flex items-center gap-1 font-bold text-rose-300">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>TRANSMISSION RANGE BLOCKED</span>
                </div>
                <p className="text-slate-300 leading-snug">
                  Wireless link requirement: $distance(A, B) \le radius(A) + radius(B)$.
                </p>
                <p className="text-slate-400 leading-snug">
                  Currently, no routers or peer nodes are within the {sourceNode.radius.toFixed(1)}m transmission radius of <strong>{sourceNode.name}</strong>.
                </p>
                <p className="text-amber-300/90 leading-snug">
                  Dijkstra terminates immediately because the candidate graph contains 0 outbound links from the source.
                </p>
              </div>
            ) : (
              <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1">
                <div className="flex items-center gap-1 font-bold text-cyan-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>WHY THIS ROUTE WON</span>
                </div>
                <p className="text-slate-300 leading-snug">
                  Dijkstra guarantees that this path has the <strong>strictly lowest accumulated metric sum ({dijkstra?.totalCost.toFixed(1)})</strong> from {sourceNode.name} to {targetNode.name}.
                </p>
              </div>
            )}

            <div className="bg-slate-950/80 p-2 rounded border border-slate-800 space-y-1">
              <div className="flex items-center gap-1 font-bold text-slate-200">
                <Calculator className="w-3 h-3 text-cyan-400" />
                <span>End-to-End Metric Sum</span>
              </div>
              <p className="text-slate-400 leading-tight">
                Optimizes total link cost (distance/delay) rather than just hop count.
              </p>
            </div>

            <div className="bg-slate-950/80 p-2 rounded border border-slate-800 space-y-1">
              <div className="flex items-center gap-1 font-bold text-slate-200">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Greedy Invariant</span>
              </div>
              <p className="text-slate-400 leading-tight">
                Once a vertex is settled, its shortest path is mathematically finalized because all weights are positive.
              </p>
            </div>

            {dijkstra && dijkstra.alternativePaths.length > 1 && (
              <div className="bg-slate-950/80 p-2 rounded border border-slate-800 space-y-1">
                <span className="text-slate-200 font-bold block">
                  Competing Routes Rejected:
                </span>
                <p className="text-slate-400 leading-tight">
                  Evaluated {dijkstra.alternativePaths.length} routes; all {dijkstra.alternativePaths.length - 1} alternative(s) were rejected due to higher accumulated cost.
                </p>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: ALTS */}
        {/* =================================================================== */}
        {activeTab === 'alts' && (
          <div className="space-y-1.5">
            <div className="text-[9px] text-slate-400 font-bold">
              COMPETING PATHWAYS:
            </div>

            {dijkstra?.alternativePaths.map((alt, idx) => {
              const isChosen = alt.status === 'chosen';
              return (
                <div
                  key={idx}
                  className={`p-2 rounded border transition-all ${
                    isChosen
                      ? 'bg-emerald-950/40 border-emerald-700/80'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                        isChosen
                          ? 'bg-emerald-800 text-emerald-100'
                          : 'bg-rose-950 text-rose-300 border border-rose-900/60'
                      }`}
                    >
                      {isChosen ? '✓ CHOSEN' : `✗ REJECTED (+${alt.costDifference.toFixed(1)})`}
                    </span>
                    <span className="font-bold text-slate-200">
                      Cost: {alt.totalCost.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 text-[9px] my-1 flex-wrap">
                    {alt.pathNodeIds.map((nodeId, nIdx, arr) => (
                      <React.Fragment key={nodeId}>
                        <span className={isChosen ? 'text-emerald-300 font-bold' : 'text-slate-300'}>
                          {nodeId}
                        </span>
                        {nIdx < arr.length - 1 && (
                          <ArrowRight className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="text-[8px] text-slate-400 leading-tight pt-1 border-t border-slate-800/80">
                    {alt.rejectionReason}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: TRACE */}
        {/* =================================================================== */}
        {activeTab === 'trace' && (
          <div className="space-y-1.5">
            <div className="text-[9px] text-slate-400 font-bold">
              SETTLEMENT TRACE ({dijkstra?.steps.length} steps):
            </div>

            {dijkstra?.steps.map((step) => {
              const isExpanded = expandedStep === step.stepNumber;
              const isTargetSettled = step.settledNodeId === targetEndpointId;

              return (
                <div
                  key={step.stepNumber}
                  className={`border rounded overflow-hidden ${
                    isTargetSettled
                      ? 'bg-slate-950 border-emerald-700/80'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : step.stepNumber)}
                    className="w-full p-1.5 flex items-center justify-between text-left hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-4 h-4 rounded-full bg-slate-800 text-cyan-300 flex items-center justify-center font-bold text-[8px] flex-shrink-0">
                        {step.stepNumber}
                      </span>
                      <span className="font-bold text-slate-200 truncate">
                        Settle '{step.settledNodeId}'
                      </span>
                      <span className="text-[9px] text-cyan-400">
                        ({step.settledCost.toFixed(1)})
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="p-1.5 pt-0 border-t border-slate-800/80 bg-slate-900/50 space-y-1 mt-1 text-[9px]">
                      {step.relaxations.length === 0 ? (
                        <div className="text-slate-500 italic">No unvisited neighbors.</div>
                      ) : (
                        step.relaxations.map((rel, rIdx) => {
                          const isRelaxed = rel.action === 'relaxed';
                          return (
                            <div
                              key={rIdx}
                              className={`p-1 rounded border ${
                                isRelaxed
                                  ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
                                  : 'bg-slate-950 border-slate-800 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span>➔ {rel.neighborId} (wt: {rel.edgeCost.toFixed(1)})</span>
                                <span className={isRelaxed ? 'text-emerald-400' : 'text-slate-500'}>
                                  {isRelaxed ? 'RELAXED' : 'REJECTED'}
                                </span>
                              </div>
                              <div className="text-[8px] leading-tight text-slate-400 mt-0.5">
                                {rel.reason}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: PROOF */}
        {/* =================================================================== */}
        {activeTab === 'proof' && (
          <div className="space-y-2">
            <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1 font-bold text-cyan-300 text-[10px]">
                <CornerDownRight className="w-3 h-3 text-cyan-400" />
                <span>PREDECESSOR BACKTRACKING</span>
              </div>
              <p className="text-[9px] text-slate-400 leading-tight">
                Trace from destination back to origin via recorded optimal predecessors:
              </p>

              <div className="space-y-1 mt-1">
                {dijkstra?.pathNodeIds
                  .slice()
                  .reverse()
                  .map((nodeId, idx, arr) => {
                    const nextNodeId = arr[idx + 1];
                    const isTarget = idx === 0;
                    const isSource = idx === arr.length - 1;

                    return (
                      <div
                        key={nodeId}
                        className="bg-slate-900 p-1 rounded border border-slate-800 flex items-center justify-between text-[9px]"
                      >
                        <div className="flex items-center gap-1 truncate">
                          <span
                            className={`font-bold ${
                              isTarget
                                ? 'text-emerald-400'
                                : isSource
                                ? 'text-cyan-400'
                                : 'text-slate-200'
                            }`}
                          >
                            {nodeId}
                          </span>
                          {nextNodeId && (
                            <span className="text-slate-500 truncate">
                              ➔ pred: <strong className="text-slate-300">{nextNodeId}</strong>
                            </span>
                          )}
                        </div>
                        <span className="text-cyan-400 font-bold flex-shrink-0">
                          d:{dijkstra.allDistances[nodeId]?.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1">
              <div className="flex items-center gap-1 font-bold text-slate-200 text-[10px]">
                <Calculator className="w-3 h-3 text-amber-400" />
                <span>INVARIANT THEOREM</span>
              </div>
              <div className="text-[9px] text-slate-400 space-y-1 leading-snug">
                <div>
                  <strong>Inductive Step:</strong> Vertices settled in monotonic order of distance; non-negative edge weights preserve optimality.
                </div>
                <div>
                  <strong>Triangle Inequality:</strong> $dist[v] \le dist[u] + w(u, v)$ holds for all edges $(u, v)$ on the shortest path.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

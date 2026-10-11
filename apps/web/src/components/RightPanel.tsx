/**
 * @file components/RightPanel.tsx
 * @description Right analytical panel showing active algorithm state, port tables,
 * scenario learning goals, educational "Why?" explanations, and networking glossary.
 */

import React, { useState } from 'react';
import { useNetworkStore } from '../state/networkStore';
import {
  STPResult,
  DijkstraResult,
  MSTResult,
  StormResult,
  CLASSROOM_SCENARIOS
} from '@nexus/shared';
import {
  Info,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookMarked,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';

const GLOSSARY_TERMS: Record<string, string> = {
  'Node': 'A virtual device (bridge, router, or host endpoint) with coordinates and proximity aura.',
  'Edge': 'A physical or simulated communications channel formed when two nodes enter proximity range.',
  'Weight (Cost)': 'Configured link metric (e.g., distance or capacity delay) used by routing algorithms.',
  'Cycle (Loop)': 'A closed path where frames circulate endlessly if loop-prevention is absent.',
  'Root Bridge': 'The central reference bridge in STP with the lowest bridge priority/ID.',
  'Root Port (RP)': 'The single port on each non-root bridge offering lowest path cost to the Root.',
  'Designated Port (DP)': 'The port on each segment forwarding traffic away from the Root.',
  'Blocked/Alternate Port': 'A redundant port placed in non-forwarding state to prevent broadcast loops.',
  'Shortest Path': 'The route between two points minimizing total cumulative metric cost.',
  'Spanning Tree': 'A loop-free subgraph connecting all bridges with exactly V - 1 links.',
  'MST': 'Minimum Spanning Tree: minimizes global construction cost across all links in the network.',
  'Latency': 'Time required for a frame to traverse hops from source to destination.',
  'Packet Loss': 'Packets dropped due to link failures, partitioned networks, or blocked ports.',
  'Congestion': 'Traffic volume exceeding buffer capacity, causing delays and buffer drops.',
  'Topology Revision': 'Monotonically increasing sequence number ensuring state convergence.',
  'Partition': 'Separation of the network into two or more completely disconnected components.'
};

export const RightPanel: React.FC = () => {
  const {
    algorithmMode,
    activeResult,
    selectedNodeId,
    targetEndpointId,
    activeScenarioId,
    nodes
  } = useNetworkStore();

  const [showGlossary, setShowGlossary] = useState(false);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const targetNode = nodes.find((n) => n.id === targetEndpointId);
  const activeScenario = CLASSROOM_SCENARIOS.find((s) => s.id === activeScenarioId);

  return (
    <aside className="w-84 bg-slate-900 border-l border-slate-800 flex flex-col h-full flex-shrink-0 select-none overflow-hidden text-slate-200">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider font-mono">
            {algorithmMode} Protocol Inspector
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
          CONVERGED
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {/* Active Scenario Card (if active) */}
        {activeScenario && (
          <div className="bg-slate-950 p-2.5 rounded border border-cyan-800/80 shadow">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 mb-1">
              <Award className="w-3.5 h-3.5" />
              <span>ACTIVE LESSON</span>
            </div>
            <div className="text-xs font-semibold text-slate-200">{activeScenario.name}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1 leading-snug">
              {activeScenario.learningGoal}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STP MODE RESULTS */}
        {/* ================================================================= */}
        {algorithmMode === 'STP' && activeResult && (
          <div className="space-y-3">
            {/* Root Bridge Card */}
            <div className="bg-slate-950 p-2.5 rounded border border-emerald-800/80">
              <div className="text-[11px] text-slate-400 font-mono">ELECTED ROOT BRIDGE:</div>
              <div className="text-sm font-bold font-mono text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{(activeResult as STPResult).rootBridgeId}</span>
              </div>
            </div>

            {/* STP Port Decision Table */}
            <div>
              <div className="text-xs font-mono font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>PORT ROLES & STATES</span>
                <span className="text-[10px] text-slate-500 font-normal">Per-Segment</span>
              </div>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {Object.entries((activeResult as STPResult).ports).map(([portKey, decision]) => {
                  const isBlocked = decision.state === 'blocking';
                  return (
                    <div
                      key={portKey}
                      className={`p-2 rounded text-xs font-mono border ${
                        isBlocked
                          ? 'bg-rose-950/40 border-rose-900/80 text-rose-200'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-0.5">
                        <span>
                          {decision.nodeId} ➔ {decision.neighborId}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                            isBlocked
                              ? 'bg-rose-900 text-rose-100'
                              : 'bg-emerald-900 text-emerald-100'
                          }`}
                        >
                          {decision.role} ({decision.state})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight">
                        {decision.reason}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* DIJKSTRA MODE RESULTS */}
        {/* ================================================================= */}
        {algorithmMode === 'DIJKSTRA' && activeResult && (
          <div className="space-y-3">
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <div className="text-[11px] text-slate-400 font-mono mb-1">
                ROUTE: {selectedNode?.name} ➔ {targetNode?.name}
              </div>
              {(activeResult as DijkstraResult).reachable ? (
                <div>
                  <div className="text-base font-bold font-mono text-cyan-300 flex items-center gap-1.5">
                    <span>Cost: {(activeResult as DijkstraResult).totalCost.toFixed(1)}</span>
                    <span className="text-xs text-slate-400">
                      ({(activeResult as DijkstraResult).hopCount} hops)
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-mono text-slate-300 flex items-center gap-1 flex-wrap bg-slate-900 p-2 rounded border border-slate-800">
                    {(activeResult as DijkstraResult).pathNodeIds.map((nodeId, idx, arr) => (
                      <React.Fragment key={nodeId}>
                        <span className="font-bold text-cyan-400">{nodeId}</span>
                        {idx < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-rose-400 font-mono text-xs mt-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>No physical path available (Disconnected partition)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MST MODE RESULTS */}
        {/* ================================================================= */}
        {algorithmMode === 'MST' && activeResult && (
          <div className="space-y-3">
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <div className="text-[11px] text-slate-400 font-mono mb-1">INFRASTRUCTURE WEIGHT:</div>
              <div className="text-base font-bold font-mono text-cyan-300">
                Total Cost: {(activeResult as MSTResult).totalWeight.toFixed(1)}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                {(activeResult as MSTResult).isForest
                  ? `Spanning Forest (${(activeResult as MSTResult).componentCount} disconnected trees)`
                  : 'Single Spanning Tree (Zero loops)'}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STORM MODE RESULTS */}
        {/* ================================================================= */}
        {algorithmMode === 'STORM' && activeResult && (
          <div className="space-y-3">
            <div className="bg-amber-950/40 p-3 rounded border border-amber-800/80">
              <div className="text-[11px] text-amber-300 font-mono font-bold">
                LOOP PREVENTION DISABLED
              </div>
              <div className="text-sm font-bold font-mono text-amber-400 mt-1">
                {(activeResult as StormResult).activeLoopsCount} Redundant Cyclic Loops Detected
              </div>
              <div className="text-xs text-slate-300 mt-1">
                All bridge ports set to unconditional forwarding. Broadcast frames replicate indefinitely.
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* "WHY?" EDUCATIONAL EXPLANATIONS SECTION */}
        {/* ================================================================= */}
        <div className="bg-slate-950/90 p-3 rounded border border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-cyan-300 border-b border-slate-800 pb-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>ALGORITHM REASONING ("WHY?")</span>
          </div>
          <ul className="space-y-1 text-[11px] font-mono text-slate-300 leading-relaxed list-disc list-inside">
            {activeResult?.explanation.map((fact, idx) => (
              <li key={idx} className="text-slate-300">
                {fact}
              </li>
            ))}
          </ul>
        </div>

        {/* ================================================================= */}
        {/* BEGINNER-FRIENDLY NETWORKING GLOSSARY */}
        {/* ================================================================= */}
        <div className="bg-slate-950/90 p-2.5 rounded border border-slate-800">
          <button
            onClick={() => setShowGlossary(!showGlossary)}
            className="w-full flex items-center justify-between text-xs font-bold font-mono text-slate-300 hover:text-cyan-300 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <BookMarked className="w-3.5 h-3.5 text-cyan-400" />
              <span>NETWORKING GLOSSARY (16)</span>
            </div>
            {showGlossary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showGlossary && (
            <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5 max-h-48 overflow-y-auto pr-1 text-[11px] font-mono">
              {Object.entries(GLOSSARY_TERMS).map(([term, def]) => (
                <div key={term} className="bg-slate-900/60 p-1.5 rounded">
                  <span className="font-bold text-cyan-300">{term}:</span>{' '}
                  <span className="text-slate-400">{def}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

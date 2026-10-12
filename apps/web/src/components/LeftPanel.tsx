/**
 * @file components/LeftPanel.tsx
 * @description Left sidebar for node management, role assignments, and target selection.
 */

import React from 'react';
import { useNetworkStore } from '../state/networkStore';
import { Power, Pin, Target, Sliders } from 'lucide-react';

export const LeftPanel: React.FC = () => {
  const {
    nodes,
    selectedNodeId,
    targetEndpointId,
    rootPinnedId,
    algorithmMode,
    selectNode,
    setTargetEndpoint,
    togglePinRoot,
    toggleNodeOnline,
    updateNodeRadius,
    setNodeRole,
    setBridgePriority,
    participantCount
  } = useNetworkStore();

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full flex-shrink-0 select-none overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono block">
            Topology Nodes ({nodes.length})
          </span>
          <span className="text-[10px] text-cyan-400 font-mono">
            {participantCount} {participantCount === 1 ? 'client' : 'clients'} connected
          </span>
        </div>
        <span className="text-[11px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
          {nodes.filter(n => n.online).length} online
        </span>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {nodes.map(node => {
          const isSelected = node.id === selectedNodeId;
          const isTarget = node.id === targetEndpointId;
          const isPinnedRoot = node.id === rootPinnedId;

          return (
            <div
              key={node.id}
              onClick={() => selectNode(node.id)}
              className={`p-2.5 rounded border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 border-cyan-500 shadow'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Node Title & Role Dropdown */}
              <div className="flex items-center justify-between mb-1.5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    node.online ? 'bg-emerald-400' : 'bg-rose-500'
                  }`} />
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
                  <span className="font-mono text-xs font-bold text-slate-200">
                    {node.name}
                  </span>
                </div>
                <select
                  value={node.role}
                  onChange={e => setNodeRole(node.id, e.target.value as any)}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold bg-slate-950 border border-slate-700 text-cyan-300 focus:outline-none"
                  title="Assign Device Role"
                >
                  <option value="gateway">Base Station</option>
                  <option value="router">Router</option>
                  <option value="bridge">Bridge</option>
                  <option value="endpoint">Client Host</option>
                </select>
              </div>

              {/* Coordinates & Bridge Priority Controls */}
              <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between mb-2">
                <span>Pos: ({node.x.toFixed(1)}, {node.y.toFixed(1)})</span>
                {node.bridgePriority !== undefined && (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <span className="text-amber-300">Prio: {node.bridgePriority}</span>
                    <button
                      onClick={() => setBridgePriority(node.id, Math.max(0, (node.bridgePriority ?? 32768) - 4096))}
                      className="px-1 bg-slate-800 hover:bg-slate-700 rounded text-[9px] text-emerald-300"
                      title="Lower Priority (Win Election)"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setBridgePriority(node.id, Math.min(61440, (node.bridgePriority ?? 32768) + 4096))}
                      className="px-1 bg-slate-800 hover:bg-slate-700 rounded text-[9px] text-rose-300"
                      title="Raise Priority (Lose Election)"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Range Radius Slider */}
              <div className="mb-2" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Proximity Radius:</span>
                  <span className="text-cyan-400 font-bold">{node.radius.toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="0.5"
                  value={node.radius}
                  onChange={e => updateNodeRadius(node.id, parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/80" onClick={e => e.stopPropagation()}>
                {/* Power Toggle */}
                <button
                  onClick={() => toggleNodeOnline(node.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] font-mono transition-colors ${
                    node.online
                      ? 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-900/60'
                      : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-900/60'
                  }`}
                  title={node.online ? 'Simulate Node Failure (Turn Offline)' : 'Restore Node'}
                >
                  <Power className="w-3 h-3" />
                  <span>{node.online ? 'Fail' : 'Restore'}</span>
                </button>

                {/* Pin as Root (for STP) */}
                {node.role !== 'endpoint' && (
                  <button
                    onClick={() => togglePinRoot(node.id)}
                    className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 border transition-colors ${
                      isPinnedRoot
                        ? 'bg-amber-600 text-white border-amber-500 font-bold'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                    title="Force as Root Bridge for Demonstration"
                  >
                    <Pin className="w-3 h-3" />
                    <span>Root</span>
                  </button>
                )}

                {/* Set as Target (for Dijkstra) */}
                <button
                  onClick={() => setTargetEndpoint(node.id)}
                  className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 border transition-colors ${
                    isTarget
                      ? 'bg-pink-600 text-white border-pink-500 font-bold'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title="Set as Target Endpoint for Dijkstra Path"
                >
                  <Target className="w-3 h-3" />
                  <span>Dest</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

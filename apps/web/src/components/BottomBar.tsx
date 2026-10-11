/**
 * @file components/BottomBar.tsx
 * @description Bottom analytical bar displaying live graph metrics, packet transmission
 * statistics, simulated route delay, and protocol event log.
 */

import React, { useState } from 'react';
import { useNetworkStore } from '../state/networkStore';
import {
  Activity,
  Layers,
  Share2,
  GitCommit,
  Terminal,
  ChevronUp,
  ChevronDown,
  Send,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Percent
} from 'lucide-react';

export const BottomBar: React.FC = () => {
  const { metrics, packetMetrics, eventLogs } = useNetworkStore();
  const [isLogExpanded, setIsLogExpanded] = useState(false);

  return (
    <footer className="bg-slate-900 border-t border-slate-800 flex flex-col flex-shrink-0 z-20 transition-all duration-200">
      {/* Top Metrics Row */}
      <div className="h-12 px-4 flex items-center justify-between gap-3 overflow-x-auto">
        {/* Topology Metric Badges */}
        <div className="flex items-center gap-2.5 overflow-x-auto py-1">
          {/* Nodes */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs font-mono flex-shrink-0">
            <span className="text-slate-500 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>NODES:</span>
            </span>
            <span className="font-bold text-slate-200">{metrics.nodeCount}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">({metrics.onlineNodes} ON)</span>
          </div>

          {/* Forwarding Edges */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs font-mono flex-shrink-0">
            <span className="text-slate-500 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>FWD LINKS:</span>
            </span>
            <span className="font-bold text-emerald-300">{metrics.forwardingEdges}</span>
            <span className="text-[10px] text-slate-500">/ {metrics.candidateEdges} cand</span>
          </div>

          {/* Components */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs font-mono flex-shrink-0">
            <span className="text-slate-500 flex items-center gap-1">
              <GitCommit className="w-3.5 h-3.5 text-amber-400" />
              <span>COMPONENTS:</span>
            </span>
            <span className={`font-bold ${metrics.connectedComponents > 1 ? 'text-rose-400' : 'text-slate-200'}`}>
              {metrics.connectedComponents}
            </span>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 mx-1 flex-shrink-0" />

          {/* Packet Engine Metrics */}
          {/* Delivered Packets */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs font-mono flex-shrink-0">
            <span className="text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>DELIVERED:</span>
            </span>
            <span className="font-bold text-emerald-300">{packetMetrics.deliveredCount}</span>
            <span className="text-[10px] text-slate-500">({packetMetrics.totalGenerated} gen)</span>
          </div>

          {/* Dropped Packets */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs font-mono flex-shrink-0">
            <span className="text-slate-500 flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              <span>DROPPED:</span>
            </span>
            <span className={`font-bold ${packetMetrics.droppedCount > 0 ? 'text-rose-300' : 'text-slate-400'}`}>
              {packetMetrics.droppedCount}
            </span>
          </div>

          {/* Success Rate % */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs font-mono flex-shrink-0">
            <span className="text-slate-500 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-cyan-400" />
              <span>SUCCESS:</span>
            </span>
            <span className="font-bold text-cyan-300">{packetMetrics.deliverySuccessRate}%</span>
          </div>

          {/* In-Flight & Storm Duplicate Packets */}
          {packetMetrics.duplicateForwardsCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800 text-xs font-mono flex-shrink-0 text-amber-300">
              <span className="font-bold">STORM FORWARDS: {packetMetrics.duplicateForwardsCount}</span>
            </div>
          )}
        </div>

        {/* Event Log Expand Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsLogExpanded(!isLogExpanded)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono transition-colors ${
              isLogExpanded
                ? 'bg-cyan-950/80 border-cyan-700 text-cyan-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Toggle Protocol Event Log"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Event Log ({eventLogs.length})</span>
            {isLogExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Protocol Event Log */}
      {isLogExpanded && (
        <div className="h-40 bg-slate-950 border-t border-slate-800 p-2 overflow-y-auto font-mono text-[11px] space-y-1">
          {eventLogs.length === 0 ? (
            <div className="text-slate-500 italic p-2 text-center">No protocol events logged yet.</div>
          ) : (
            eventLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 px-2 py-0.5 rounded hover:bg-slate-900/60"
              >
                <span className="text-slate-500 flex-shrink-0">[{log.timestamp}]</span>
                <span
                  className={`flex-shrink-0 uppercase font-bold text-[9px] px-1 py-0.2 rounded ${
                    log.type === 'success'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : log.type === 'warn'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  }`}
                >
                  {log.type}
                </span>
                <span
                  className={`${
                    log.type === 'success'
                      ? 'text-emerald-200'
                      : log.type === 'warn'
                      ? 'text-amber-200'
                      : 'text-slate-300'
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </footer>
  );
};

/**
 * @file components/StudentView.tsx
 * @description Dedicated mobile-first interface for students in the classroom network.
 */

import React, { useState } from 'react';
import { useNetworkStore } from '../state/networkStore';
import {
  Smartphone,
  Wifi,
  WifiOff,
  User,
  Shield,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Info,
  Radio,
  Sliders,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { DijkstraResult } from '@nexus/shared';

export const StudentView: React.FC = () => {
  const {
    sessionCode,
    nodes,
    edges,
    algorithmMode,
    activeResult,
    moveNode,
    updateNodeRadius
  } = useNetworkStore();

  // Student identity state (default to ep_1 Host-Client or sw_1)
  const [studentNodeId, setStudentNodeId] = useState<string>('ep_1');
  const [nickname, setNickname] = useState<string>('Student-Ada');
  const [isConnected, setIsConnected] = useState<boolean>(true);

  const myNode = nodes.find((n) => n.id === studentNodeId) || nodes[0];

  // Identify candidate neighbors of this student node
  const myEdges = edges.filter(
    (e) => e.sourceId === myNode.id || e.targetId === myNode.id
  );

  const neighbors = myEdges.map((e) => {
    const neighborId = e.sourceId === myNode.id ? e.targetId : e.sourceId;
    const neighborNode = nodes.find((n) => n.id === neighborId);
    let portStatus = 'Candidate';
    let isBlocked = false;

    if (activeResult) {
      const dij = activeResult as DijkstraResult;
      const onPath = dij.pathEdgeIds?.includes(e.id);
      if (onPath) {
        portStatus = 'On Shortest Path';
      } else if (e.online) {
        portStatus = 'Alternative Link';
      } else {
        portStatus = 'Link Down';
      }
    } else if (e.online) {
      portStatus = 'Connected';
    } else {
      portStatus = 'Link Down';
    }

    return {
      id: neighborId,
      node: neighborNode,
      edge: e,
      portStatus,
      isBlocked
    };
  });

  const handleNudge = (dx: number, dy: number) => {
    moveNode(myNode.id, myNode.x + dx, myNode.y + dy);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-y-auto max-w-md mx-auto w-full border-x border-slate-800 shadow-2xl">
      {/* Top Mobile Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold font-mono tracking-wide flex items-center gap-1">
              <span>NEXUS STUDENT</span>
              <span className="text-[10px] text-cyan-400">[{sessionCode}]</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Role: <span className="text-amber-300 font-semibold uppercase">{myNode.role}</span>
            </div>
          </div>
        </div>

        {/* Connection status toggle for testing disconnect/reconnect */}
        <button
          onClick={() => setIsConnected(!isConnected)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
            isConnected
              ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
              : 'bg-rose-950/80 border-rose-700 text-rose-300 animate-pulse'
          }`}
          title="Click to simulate mobile signal drop and recovery"
        >
          {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span>{isConnected ? 'SYNCED' : 'OFFLINE'}</span>
        </button>
      </div>

      {/* Disconnect Warning Banner */}
      {!isConnected && (
        <div className="bg-rose-950/90 border-b border-rose-800 px-3 py-2 text-rose-200 text-xs font-mono flex items-center justify-between">
          <span>Connection dropped. Reconnecting to gateway...</span>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-300" />
        </div>
      )}

      <div className="p-4 space-y-4 flex-1">
        {/* Participant Identity Card */}
        <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold font-mono text-slate-300">YOUR ASSIGNED NODE</span>
            </div>
            <select
              value={studentNodeId}
              onChange={(e) => setStudentNodeId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-cyan-300 text-xs font-mono rounded px-2 py-0.5"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.role})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Node Identifier:</span>
              <span className="text-slate-100 font-bold">{myNode.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Classroom Nickname:</span>
              <span className="text-cyan-300">{nickname}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Virtual Position:</span>
              <span className="text-slate-200">({myNode.x.toFixed(1)}, {myNode.y.toFixed(1)})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Simulated Aura Radius:</span>
              <span className="text-cyan-400 font-bold">{myNode.radius.toFixed(1)}m</span>
            </div>
          </div>
        </div>

        {/* Interactive Virtual Movement Pad */}
        <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 shadow">
          <div className="text-xs font-bold font-mono text-slate-300 mb-2 flex items-center justify-between">
            <span>MOVE NODE IN SIMULATED SPACE</span>
            <span className="text-[10px] text-slate-500 font-normal">Step: 1.0m</span>
          </div>

          {/* D-Pad controls */}
          <div className="flex flex-col items-center justify-center gap-1.5 py-2">
            <button
              onClick={() => handleNudge(0, 1)}
              className="w-12 h-10 bg-slate-800 hover:bg-slate-700 active:bg-cyan-700 rounded border border-slate-700 flex items-center justify-center text-slate-200 transition-colors"
              title="Move Up"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNudge(-1, 0)}
                className="w-12 h-10 bg-slate-800 hover:bg-slate-700 active:bg-cyan-700 rounded border border-slate-700 flex items-center justify-center text-slate-200 transition-colors"
                title="Move Left"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-cyan-950/70 border border-cyan-800 flex items-center justify-center font-mono text-[10px] text-cyan-300 font-bold">
                RADAR
              </div>
              <button
                onClick={() => handleNudge(1, 0)}
                className="w-12 h-10 bg-slate-800 hover:bg-slate-700 active:bg-cyan-700 rounded border border-slate-700 flex items-center justify-center text-slate-200 transition-colors"
                title="Move Right"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => handleNudge(0, -1)}
              className="w-12 h-10 bg-slate-800 hover:bg-slate-700 active:bg-cyan-700 rounded border border-slate-700 flex items-center justify-center text-slate-200 transition-colors"
              title="Move Down"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>

          {/* Radius Adjustment Slider */}
          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Proximity Range Aura:</span>
              <span className="text-cyan-400 font-bold">{myNode.radius.toFixed(1)}m</span>
            </div>
            <input
              type="range"
              min="2"
              max="10"
              step="0.5"
              value={myNode.radius}
              onChange={(e) => updateNodeRadius(myNode.id, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Local Neighbors & Links */}
        <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 shadow">
          <div className="text-xs font-bold font-mono text-slate-300 mb-2 flex items-center justify-between">
            <span>PROXIMITY NEIGHBORS ({neighbors.length})</span>
            <span className="text-[10px] text-slate-500 font-normal">Active Protocol: {algorithmMode}</span>
          </div>

          {neighbors.length === 0 ? (
            <div className="text-xs font-mono text-amber-300 bg-amber-950/40 p-2.5 rounded border border-amber-800/80">
              No neighbors in proximity range. Move closer to other bridges or gateways to form candidate links!
            </div>
          ) : (
            <div className="space-y-1.5">
              {neighbors.map(({ id, node, edge, portStatus, isBlocked }) => (
                <div
                  key={id}
                  className={`p-2 rounded border font-mono text-xs flex items-center justify-between ${
                    isBlocked
                      ? 'bg-rose-950/40 border-rose-900/80 text-rose-200'
                      : 'bg-slate-950 border-slate-800 text-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{node?.name || id}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({node?.role})</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Link Cost: {edge.cost.toFixed(1)}
                    </div>
                  </div>
                  <div
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      isBlocked
                        ? 'bg-rose-900 text-rose-100'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {portStatus}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Educational Role Context */}
        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-1 text-slate-400">
          <div className="font-bold text-slate-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>ROLE INSTRUCTION</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            {myNode.role === 'gateway' &&
              'You are the network gateway and primary packet distributor. In STP mode, you often act as the designated root.'}
            {myNode.role === 'bridge' &&
              'You are a network bridge/switch. In STP mode, you participate in BPDU message exchange and block redundant loop ports.'}
            {myNode.role === 'router' &&
              'You are an IP router node. In Dijkstra mode, you forward along the computed shortest weighted path.'}
            {myNode.role === 'endpoint' &&
              'You are an end-host client device attached to the local bridge network.'}
          </p>
        </div>
      </div>
    </div>
  );
};

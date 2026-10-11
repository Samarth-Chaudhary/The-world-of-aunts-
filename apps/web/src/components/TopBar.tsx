/**
 * @file components/TopBar.tsx
 * @description Top navigation bar for NEXUS Command Center with packet controls,
 * classroom scenario selector, and distinct reset actions.
 */

import React, { useState } from 'react';
import { useNetworkStore } from '../state/networkStore';
import { AlgorithmMode, CostModel, CLASSROOM_SCENARIOS, ScenarioId } from '@nexus/shared';
import {
  Network,
  Send,
  Play,
  Square,
  RotateCcw,
  Monitor,
  Smartphone,
  BookOpen,
  Wifi,
  WifiOff,
  ChevronDown,
  QrCode,
  Activity
} from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';

export const TopBar: React.FC = () => {
  const {
    sessionCode,
    algorithmMode,
    costModel,
    isInstructorView,
    isConnected,
    isContinuousPackets,
    packetRatePerSec,
    activeScenarioId,
    setAlgorithmMode,
    setCostModel,
    setInstructorView,
    sendSinglePacket,
    toggleContinuousPackets,
    setPacketRate,
    loadScenario,
    resetScenario,
    resetNetwork,
    resetEntireSession,
    reducedMotion,
    toggleReducedMotion
  } = useNetworkStore();

  const [showResetMenu, setShowResetMenu] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  return (
    <>
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-3 flex-shrink-0 z-20">
        {/* Brand & Identity */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold tracking-wider text-base">
            <Network className="w-5 h-5 text-cyan-400" />
            <span>NEXUS</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden xl:inline border-l border-slate-700 pl-2.5">
            Distributed Network Lab
          </span>
        </div>

        {/* Room Code & Real-Time Socket Connection */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded text-xs font-mono">
            <span className="text-slate-400">ROOM:</span>
            <span className="text-cyan-300 font-bold">{sessionCode}</span>
            <button
              onClick={() => setShowQRModal(true)}
              className="ml-1 px-1.5 py-0.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded text-[10px] font-mono flex items-center gap-1 transition-colors"
              title="Show Classroom QR Code & Mobile Join Link"
            >
              <QrCode className="w-3 h-3 text-cyan-400" />
              <span>Invite</span>
            </button>
          </div>
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${
              isConnected
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-amber-950/60 border-amber-800 text-amber-300 animate-pulse'
            }`}
            title={isConnected ? 'Connected to Socket.IO Session Server' : 'Connecting/Reconnecting...'}
          >
            {isConnected ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
            <span>{isConnected ? 'LIVE' : 'SYNCING'}</span>
          </div>
        </div>

      {/* Classroom Scenario Preset Selector */}
      <div className="hidden lg:flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
        <select
          value={activeScenarioId || ''}
          onChange={(e) => {
            if (e.target.value) {
              loadScenario(e.target.value as ScenarioId);
            }
          }}
          className="bg-slate-950 border border-slate-700 text-cyan-300 rounded text-xs font-mono px-2 py-1 max-w-[210px] truncate focus:outline-none focus:border-cyan-500"
          title="Select from 12 Preloaded Classroom Scenarios"
        >
          <option value="">Preset Scenarios (12)...</option>
          {CLASSROOM_SCENARIOS.map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Mode Controls */}
      <div className="flex items-center gap-1.5">
        {/* Algorithm Mode Switcher */}
        <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded border border-slate-800">
          {(['STP', 'DIJKSTRA', 'MST', 'STORM', 'MANUAL'] as AlgorithmMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setAlgorithmMode(mode)}
              className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors ${
                algorithmMode === mode
                  ? 'bg-cyan-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Cost Model */}
        <select
          value={costModel}
          onChange={(e) => setCostModel(e.target.value as CostModel)}
          className="bg-slate-800 border border-slate-700 text-slate-200 rounded text-xs font-mono px-2 py-1 focus:outline-none focus:border-cyan-500 hidden sm:inline"
          title="Edge Cost Metric"
        >
          <option value="distance">Metric: Distance</option>
          <option value="capacity">Metric: Capacity</option>
          <option value="manual">Metric: Manual</option>
        </select>
      </div>

      {/* Packet Injection Controls */}
      <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded border border-slate-800">
        <button
          onClick={sendSinglePacket}
          className="flex items-center gap-1 bg-cyan-700 hover:bg-cyan-600 text-white px-2 py-1 rounded text-xs font-mono font-semibold transition-colors"
          title="Inject a Single Demonstration Packet"
        >
          <Send className="w-3 h-3" />
          <span className="hidden md:inline">Send 1</span>
        </button>

        <button
          onClick={toggleContinuousPackets}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-semibold transition-colors ${
            isContinuousPackets
              ? 'bg-rose-700 hover:bg-rose-600 text-white animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title={isContinuousPackets ? 'Stop Packet Generation' : 'Start Continuous Packet Flow'}
        >
          {isContinuousPackets ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          <span className="hidden md:inline">{isContinuousPackets ? 'Stop' : 'Stream'}</span>
        </button>

        {isContinuousPackets && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 pl-1 hidden sm:flex">
            <span>{packetRatePerSec}p/s</span>
          </div>
        )}
      </div>

      {/* Right Actions: Reset Menu & View Switcher */}
      <div className="flex items-center gap-2">
        {/* Reset Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowResetMenu(!showResetMenu)}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 text-xs font-mono transition-colors"
            title="Reset Options"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showResetMenu && (
            <div
              className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-700 rounded shadow-xl py-1 z-30 font-mono text-xs"
              onMouseLeave={() => setShowResetMenu(false)}
            >
              <button
                onClick={() => {
                  resetScenario();
                  setShowResetMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 block"
              >
                Reset Scenario
              </button>
              <button
                onClick={() => {
                  resetNetwork();
                  setShowResetMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 block"
              >
                Reset Network
              </button>
              <button
                onClick={() => {
                  resetEntireSession();
                  setShowResetMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-950 text-rose-300 border-t border-slate-800 block"
              >
                Reset Entire Session
              </button>
            </div>
          )}
        </div>

        {/* Reduced Motion Toggle */}
        <button
          onClick={toggleReducedMotion}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border transition-colors ${
            reducedMotion
              ? 'bg-amber-950/80 border-amber-700 text-amber-300'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
          }`}
          title={reducedMotion ? 'Reduced Motion: ON (No continuous pulses)' : 'Reduced Motion: OFF'}
        >
          <Activity className="w-3 h-3 text-cyan-400" />
          <span className="hidden xl:inline">{reducedMotion ? 'Static' : 'Motion'}</span>
        </button>

        {/* View Switcher */}
        <button
          onClick={() => setInstructorView(!isInstructorView)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors ${
            isInstructorView
              ? 'bg-indigo-950/80 border-indigo-700 text-indigo-300'
              : 'bg-amber-950/80 border-amber-700 text-amber-300'
          }`}
          title="Switch view"
        >
          {isInstructorView ? (
            <>
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Instructor</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Student</span>
            </>
          )}
        </button>
      </div>
    </header>

    {/* Classroom QR Code Modal */}
    <QRCodeModal
      sessionCode={sessionCode}
      isOpen={showQRModal}
      onClose={() => setShowQRModal(false)}
    />
  </>
);
};

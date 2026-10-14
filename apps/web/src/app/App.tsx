/**
 * @file app/App.tsx
 * @description Root application shell for NEXUS — Distributed Network Lab.
 */

import React, { useState, useEffect } from 'react';
import { TopBar } from '../components/TopBar';
import { LeftPanel } from '../components/LeftPanel';
import { RightPanel } from '../components/RightPanel';
import { BottomBar } from '../components/BottomBar';
import { StudentView } from '../components/StudentView';
import { NetworkScene } from '../scene/NetworkScene';
import { Fallback2DView } from '../components/Fallback2DView';
import { useNetworkStore } from '../state/networkStore';
import { Maximize, Minimize, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Eye, Tv } from 'lucide-react';

export const App: React.FC = () => {
  const { isInstructorView, reducedMotion, initializeSocket } = useNetworkStore();
  const [use2DFallback, setUse2DFallback] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [projectorMode, setProjectorMode] = useState(false);

  // Initialize real-time Socket and check WebGL availability on mount
  useEffect(() => {
    initializeSocket();

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('WebGL not available in environment. Activating 2D Fallback view.');
        setUse2DFallback(true);
      }
    } catch (err) {
      setUse2DFallback(true);
    }
  }, [initializeSocket]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none ${
      projectorMode ? 'projector-mode' : ''
    }`}>
      {/* Top Command Bar */}
      <TopBar />

      {/* Main Interactive Stage */}
      {isInstructorView ? (
        <div className="flex flex-1 min-h-0 relative">
          {/* Collapsible Left Panel */}
          {showLeftPanel && <LeftPanel />}

          {/* Center 3D / 2D Canvas */}
          <main className="flex-1 relative h-full w-full bg-slate-950 overflow-hidden">
            {/* Presentation Controls Overlay */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur border border-slate-800 p-1 rounded-md shadow-lg">
              <button
                onClick={() => setUse2DFallback(!use2DFallback)}
                className={`px-2 py-1 rounded text-xs font-mono font-medium flex items-center gap-1 transition-colors ${
                  use2DFallback
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Toggle 3D WebGL vs 2D Planar SVG view"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{use2DFallback ? '2D View' : '3D View'}</span>
              </button>

              <button
                onClick={() => setProjectorMode(!projectorMode)}
                className={`px-2 py-1 rounded text-xs font-mono font-medium flex items-center gap-1 transition-colors ${
                  projectorMode
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Toggle Large Venue Projector Scaling"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Projector</span>
              </button>

              <button
                onClick={() => setShowLeftPanel(!showLeftPanel)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                title={showLeftPanel ? 'Collapse Left Panel' : 'Open Left Panel'}
              >
                {showLeftPanel ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setShowRightPanel(!showRightPanel)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                title={showRightPanel ? 'Collapse Right Panel' : 'Open Right Panel'}
              >
                {showRightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                title="Toggle Fullscreen Mode"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick reopen button if right panel is hidden */}
            {!showRightPanel && (
              <button
                onClick={() => setShowRightPanel(true)}
                className="absolute top-14 right-3 z-10 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-slate-700 px-2 py-1 rounded shadow-lg text-[10px] font-mono flex items-center gap-1 transition-all"
                title="Open Dijkstra Path Justification Panel"
              >
                <PanelRightOpen className="w-3.5 h-3.5" />
                <span>Path Proof</span>
              </button>
            )}

            {/* Rendering Viewport */}
            {use2DFallback ? <Fallback2DView /> : <NetworkScene />}
          </main>

          {/* Collapsible Right Analytical Panel */}
          {showRightPanel && <RightPanel onClose={() => setShowRightPanel(false)} />}
        </div>
      ) : (
        /* Mobile Student View */
        <div className="flex-1 flex overflow-hidden">
          <StudentView />
        </div>
      )}

      {/* Bottom Metrics and Log Bar (in instructor mode) */}
      {isInstructorView && <BottomBar />}
    </div>
  );
};

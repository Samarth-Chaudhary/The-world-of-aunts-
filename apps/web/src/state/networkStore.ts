/**
 * @file state/networkStore.ts
 * @description Central reactive client-side store for NEXUS topology, algorithms,
 * packet simulation engine, and real-time multiplayer Socket.IO synchronization.
 */

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import {
  NetworkNode,
  NetworkEdge,
  AlgorithmMode,
  CostModel,
  AlgorithmResult,
  GraphMetrics,
  SimulationPacket,
  PacketMetrics,
  PacketSimulationEngine,
  ScenarioId,
  ScenarioDefinition,
  CLASSROOM_SCENARIOS,
  SOCKET_EVENTS,
  buildCandidateGraph,
  calculateGraphMetrics,
  computeSTP,
  computeDijkstra,
  computeMST,
  computeStormModel,
  computeManualModel,
  STPResult,
  DijkstraResult,
  MSTResult
} from '@nexus/shared';

const INITIAL_NODES: NetworkNode[] = [
  { id: 'gw_1', name: 'Server-Base', role: 'gateway', x: 0, y: -2, radius: 5.5, online: true, bridgePriority: 4096, bridgeId: '00:0a:01' },
  { id: 'r_1', name: 'Router-Alpha', role: 'router', x: -4.5, y: 2.5, radius: 5.0, online: true, bridgePriority: 32768, bridgeId: '00:0a:02' },
  { id: 'r_2', name: 'Router-Beta', role: 'router', x: 4.5, y: 2.5, radius: 5.0, online: true, bridgePriority: 32768, bridgeId: '00:0a:03' },
  { id: 'r_3', name: 'Router-Gamma', role: 'router', x: 0, y: 6.5, radius: 5.0, online: true, bridgePriority: 32768, bridgeId: '00:0a:04' },
  { id: 'ep_1', name: 'Client-Host-1', role: 'endpoint', x: -7.0, y: -1.0, radius: 4.0, online: true },
  { id: 'ep_2', name: 'Client-Host-Final', role: 'endpoint', x: 7.0, y: -1.0, radius: 4.0, online: true }
];

interface NetworkStoreState {
  // Topology State
  revision: number;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  costModel: CostModel;
  algorithmMode: AlgorithmMode;
  selectedNodeId: string | null;
  targetEndpointId: string | null;
  rootPinnedId: string | null;
  activeResult: AlgorithmResult | null;
  metrics: GraphMetrics;
  eventLogs: Array<{ id: string; timestamp: string; message: string; type: 'info' | 'warn' | 'success' }>;

  // Packet Engine State
  packets: SimulationPacket[];
  packetMetrics: PacketMetrics;
  isContinuousPackets: boolean;
  packetRatePerSec: number;

  // Real-Time Session & Socket
  sessionCode: string;
  hostSecret: string | null;
  socket: Socket | null;
  isConnected: boolean;
  participantId: string | null;
  assignedNodeId: string | null;
  participantCount: number;

  // Active Scenario
  activeScenarioId: ScenarioId | null;

  // UI State
  isInstructorView: boolean;
  isDraggingNode: boolean;
  reducedMotion: boolean;

  // Actions
  initializeSocket: () => void;
  setSessionCode: (code: string) => void;
  setInstructorView: (isInstructor: boolean) => void;
  selectNode: (id: string | null) => void;
  setTargetEndpoint: (id: string) => void;
  setAlgorithmMode: (mode: AlgorithmMode, emitSocket?: boolean) => void;
  setCostModel: (model: CostModel) => void;
  togglePinRoot: (nodeId: string) => void;
  toggleNodeOnline: (nodeId: string) => void;
  toggleEdgeOnline: (edgeId: string) => void;
  moveNode: (id: string, x: number, y: number, emitSocket?: boolean) => void;
  updateNodeRadius: (id: string, radius: number) => void;

  // Packet Engine Actions
  sendSinglePacket: () => void;
  toggleContinuousPackets: () => void;
  setPacketRate: (rate: number) => void;
  stepSimulation: (deltaTimeMs: number) => void;
  resetPackets: () => void;

  // Scenario & Reset Actions
  loadScenario: (scenarioId: ScenarioId) => void;
  resetScenario: () => void;
  resetNetwork: () => void;
  resetEntireSession: () => void;

  toggleReducedMotion: () => void;
  setBridgePriority: (nodeId: string, priority: number) => void;
  setNodeRole: (nodeId: string, role: any) => void;

  recompute: () => void;
  addLog: (message: string, type?: 'info' | 'warn' | 'success') => void;
}

// Global pure packet engine instance
const packetEngine = new PacketSimulationEngine();
let lastMoveEmissionTime = 0;

function runActiveAlgorithm(
  mode: AlgorithmMode,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  rootPinnedId: string | null,
  selectedNodeId: string | null,
  targetEndpointId: string | null,
  revision: number
): { result: AlgorithmResult; activeForwardingEdgesCount: number } {
  if (mode === 'STP') {
    const stp = computeSTP(nodes, edges, rootPinnedId, revision);
    return { result: stp, activeForwardingEdgesCount: stp.forwardingEdgeIds.length };
  }
  if (mode === 'DIJKSTRA') {
    const src = selectedNodeId || 'gw_1';
    const tgt = targetEndpointId || 'ep_2';
    const dij = computeDijkstra(nodes, edges, src, tgt, revision);
    return { result: dij, activeForwardingEdgesCount: dij.pathEdgeIds.length };
  }
  if (mode === 'MST') {
    const mst = computeMST(nodes, edges, revision);
    return { result: mst, activeForwardingEdgesCount: mst.selectedEdgeIds.length };
  }
  if (mode === 'STORM') {
    const storm = computeStormModel(nodes, edges, revision);
    return { result: storm, activeForwardingEdgesCount: edges.filter(e => e.online).length };
  }
  const man = computeManualModel(nodes, edges, revision);
  return { result: man, activeForwardingEdgesCount: edges.filter(e => e.online).length };
}

export const useNetworkStore = create<NetworkStoreState>((set, get) => {
  const initialEdges = buildCandidateGraph(INITIAL_NODES, 'distance');
  const initialAlgo = runActiveAlgorithm('STP', INITIAL_NODES, initialEdges, null, 'gw_1', 'ep_2', 1);
  const initialMetrics = calculateGraphMetrics(INITIAL_NODES, initialEdges, initialAlgo.activeForwardingEdgesCount);

  return {
    revision: 1,
    nodes: INITIAL_NODES,
    edges: initialEdges,
    costModel: 'distance',
    algorithmMode: 'STP',
    selectedNodeId: 'gw_1',
    targetEndpointId: 'ep_2',
    rootPinnedId: null,
    activeResult: initialAlgo.result,
    metrics: initialMetrics,
    eventLogs: [
      { id: '1', timestamp: new Date().toLocaleTimeString(), message: 'NEXUS Network Lab initialized with standard 6-node test topology.', type: 'info' },
      { id: '2', timestamp: new Date().toLocaleTimeString(), message: 'STP converged: elected Gateway-Core as Root Bridge.', type: 'success' }
    ],

    // Packet state
    packets: [],
    packetMetrics: packetEngine.getMetrics(),
    isContinuousPackets: false,
    packetRatePerSec: 2,

    // Real-Time Socket
    sessionCode: 'DEMO',
    hostSecret: 'demo-host-secret',
    socket: null,
    isConnected: false,
    participantId: null,
    assignedNodeId: 'ep_1',
    participantCount: 1,

    // Scenario state
    activeScenarioId: null,

    // UI state
    isInstructorView: true,
    isDraggingNode: false,
    reducedMotion: false,

    initializeSocket: () => {
      if (get().socket) return;
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
      const socket = io(serverUrl, {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });

      socket.on('connect', () => {
        set({ isConnected: true, socket });
        get().addLog(`Connected to real-time session server [${socket.id}].`, 'success');

        // Join default session
        const { sessionCode, isInstructorView, hostSecret } = get();
        socket.emit(
          SOCKET_EVENTS.SESSION_JOIN,
          {
            sessionCode,
            nickname: isInstructorView ? 'Instructor' : 'Student-Live',
            role: isInstructorView ? 'instructor' : 'student',
            hostSecret: isInstructorView ? hostSecret || 'demo-host-secret' : undefined
          },
          (res: any) => {
            if (res && res.success) {
              set({
                participantId: res.participantId,
                assignedNodeId: res.assignedNodeId || get().assignedNodeId,
                hostSecret: res.hostSecret || get().hostSecret
              });
              get().addLog(`Joined session ${sessionCode} as ${res.role}. Assigned node: ${res.assignedNodeId || 'all'}`, 'info');
            }
          }
        );
      });

      socket.on('disconnect', () => {
        set({ isConnected: false });
        get().addLog('Disconnected from session server. Attempting reconnect...', 'warn');
      });

      // Synchronize remote participant movement
      socket.on(SOCKET_EVENTS.PARTICIPANT_MOVE, (payload: any) => {
        const { nodeId, x, y, revision } = payload;
        const currentNodes = get().nodes;
        const existingNode = currentNodes.find(n => n.id === nodeId);
        if (existingNode && (existingNode.x !== x || existingNode.y !== y)) {
          get().moveNode(nodeId, x, y, false); // Don't re-emit remote updates
        }
      });

      // Synchronize remote algorithm mode change
      socket.on(SOCKET_EVENTS.ALGORITHM_SELECT, (payload: any) => {
        if (payload.mode && payload.mode !== get().algorithmMode) {
          get().setAlgorithmMode(payload.mode, false);
        }
      });

      // Handle presence updates
      socket.on(SOCKET_EVENTS.PARTICIPANT_PRESENCE, (payload: any) => {
        if (payload.totalParticipants !== undefined) {
          set({ participantCount: payload.totalParticipants });
        }
      });

      set({ socket });
    },

    setSessionCode: (code) => set({ sessionCode: code.toUpperCase() }),
    setInstructorView: (isInstructor) => set({ isInstructorView: isInstructor }),
    selectNode: (id) => {
      set({ selectedNodeId: id });
      get().recompute();
    },
    setTargetEndpoint: (id) => {
      set({ targetEndpointId: id });
      get().recompute();
    },

    setAlgorithmMode: (mode, emitSocket = true) => {
      set({ algorithmMode: mode });
      get().recompute();
      get().addLog(`Algorithm mode switched to ${mode}.`, 'info');

      if (emitSocket && get().socket && get().hostSecret) {
        get().socket?.emit(SOCKET_EVENTS.ALGORITHM_SELECT, {
          sessionCode: get().sessionCode,
          mode,
          hostSecret: get().hostSecret
        });
      }
    },

    setCostModel: (model) => {
      const { nodes, edges } = get();
      const updatedEdges = buildCandidateGraph(nodes, model, edges);
      set({ costModel: model, edges: updatedEdges });
      get().recompute();
      get().addLog(`Cost model updated to '${model}'.`, 'info');
    },

    togglePinRoot: (nodeId) => {
      const current = get().rootPinnedId;
      const next = current === nodeId ? null : nodeId;
      set({ rootPinnedId: next });
      get().recompute();
      get().addLog(next ? `Root pinned to node '${nodeId}'.` : 'Root unpinned. Returning to automatic election.', 'info');
    },

    toggleNodeOnline: (nodeId) => {
      const nodes = get().nodes.map(n => n.id === nodeId ? { ...n, online: !n.online } : n);
      const edges = buildCandidateGraph(nodes, get().costModel, get().edges);
      set({ nodes, edges });
      get().recompute();
      const node = nodes.find(n => n.id === nodeId);
      get().addLog(`Node '${nodeId}' toggled to ${node?.online ? 'ONLINE' : 'OFFLINE'}.`, node?.online ? 'success' : 'warn');
    },

    toggleEdgeOnline: (edgeId) => {
      const edges = get().edges.map(e => e.id === edgeId ? { ...e, online: !e.online } : e);
      set({ edges });
      get().recompute();
      const edge = edges.find(e => e.id === edgeId);
      get().addLog(`Edge '${edgeId}' toggled to ${edge?.online ? 'ONLINE' : 'FAILED'}.`, edge?.online ? 'info' : 'warn');
    },

    moveNode: (id, x, y, emitSocket = true) => {
      // Clamping within simulation boundary [-14, 14] x [-12, 12]
      const clampedX = Math.max(-14, Math.min(14, Number(x.toFixed(2))));
      const clampedY = Math.max(-12, Math.min(12, Number(y.toFixed(2))));

      const nodes = get().nodes.map(n => n.id === id ? { ...n, x: clampedX, y: clampedY } : n);
      const prevEdgeIds = new Set(get().edges.map(e => e.id));
      const newEdges = buildCandidateGraph(nodes, get().costModel, get().edges);

      // Check if edges changed to notify event log
      const newEdgeIds = new Set(newEdges.map(e => e.id));
      for (const edge of newEdges) {
        if (!prevEdgeIds.has(edge.id)) {
          get().addLog(`Proximity link formed: ${edge.sourceId} ⇄ ${edge.targetId}`, 'info');
        }
      }
      for (const edge of get().edges) {
        if (!newEdgeIds.has(edge.id)) {
          get().addLog(`Proximity link broken: ${edge.sourceId} ⇄ ${edge.targetId}`, 'warn');
        }
      }

      set({ nodes, edges: newEdges, revision: get().revision + 1 });
      get().recompute();

      // Throttled socket emission (~25 updates/sec)
      if (emitSocket && get().socket && get().isConnected) {
        const now = Date.now();
        if (now - lastMoveEmissionTime > 40) {
          lastMoveEmissionTime = now;
          get().socket?.emit(SOCKET_EVENTS.PARTICIPANT_MOVE, {
            sessionCode: get().sessionCode,
            nodeId: id,
            x: clampedX,
            y: clampedY,
            revision: get().revision
          });
        }
      }
    },

    updateNodeRadius: (id, radius) => {
      const nodes = get().nodes.map(n => n.id === id ? { ...n, radius: Math.max(1, radius) } : n);
      const edges = buildCandidateGraph(nodes, get().costModel, get().edges);
      set({ nodes, edges, revision: get().revision + 1 });
      get().recompute();
    },

    // =========================================================================
    // PACKET SIMULATION ENGINE CONTROLS
    // =========================================================================
    sendSinglePacket: () => {
      const { selectedNodeId, targetEndpointId, activeResult, algorithmMode, nodes, edges } = get();
      const src = selectedNodeId || 'gw_1';
      const dst = targetEndpointId || 'ep_2';

      let route: string[] = [];
      let edgeIds: string[] = [];

      if (algorithmMode === 'DIJKSTRA' && activeResult && (activeResult as DijkstraResult).reachable) {
        const dij = activeResult as DijkstraResult;
        route = dij.pathNodeIds;
        edgeIds = dij.pathEdgeIds;
      } else {
        // Compute path via Dijkstra
        const dij = computeDijkstra(nodes, edges, src, dst);
        if (dij.reachable) {
          route = dij.pathNodeIds;
          edgeIds = dij.pathEdgeIds;
        } else {
          get().addLog(`Packet send aborted: no valid route between ${src} and ${dst}.`, 'warn');
          return;
        }
      }

      const pkt = packetEngine.sendPacket(src, dst, route, edgeIds);
      if (pkt) {
        set({ packets: packetEngine.getPackets(), packetMetrics: packetEngine.getMetrics() });
        get().addLog(`Packet injected: ${src} ➔ ${dst} (${route.length - 1} hops).`, 'info');
      }
    },

    toggleContinuousPackets: () => {
      const running = get().isContinuousPackets;
      if (running) {
        packetEngine.stop();
        set({ isContinuousPackets: false });
        get().addLog('Continuous packet generation stopped.', 'info');
      } else {
        const src = get().selectedNodeId || 'gw_1';
        const dst = get().targetEndpointId || 'ep_2';
        packetEngine.startContinuous(src, dst, get().packetRatePerSec);
        set({ isContinuousPackets: true });
        get().addLog(`Continuous packet generation started at ${get().packetRatePerSec} pkts/sec.`, 'success');
      }
    },

    setPacketRate: (rate) => {
      packetEngine.setConfig({ generationRatePerSec: rate });
      set({ packetRatePerSec: rate });
    },

    stepSimulation: (deltaTimeMs) => {
      const { nodes, edges, activeResult, selectedNodeId, targetEndpointId } = get();
      const routeProvider = (src: string, dst: string) => {
        const dij = computeDijkstra(nodes, edges, src, dst);
        return { route: dij.pathNodeIds, edgeIds: dij.pathEdgeIds };
      };

      const step = packetEngine.step(deltaTimeMs, nodes, edges, activeResult, routeProvider);

      if (step.deliveredEvents.length > 0) {
        for (const d of step.deliveredEvents) {
          get().addLog(`Packet ${d.id} successfully delivered at destination '${d.destinationId}'.`, 'success');
        }
      }
      if (step.droppedEvents.length > 0) {
        for (const drop of step.droppedEvents) {
          get().addLog(`Packet ${drop.id} dropped: reason '${drop.dropReason}'.`, 'warn');
        }
      }

      set({ packets: step.packets, packetMetrics: step.metrics });
    },

    resetPackets: () => {
      packetEngine.reset();
      set({ packets: [], packetMetrics: packetEngine.getMetrics(), isContinuousPackets: false });
      get().addLog('Packet simulation reset.', 'info');
    },

    // =========================================================================
    // SCENARIO ENGINE CONTROLS (PHASE 8)
    // =========================================================================
    loadScenario: (scenarioId) => {
      const scenario = CLASSROOM_SCENARIOS.find(s => s.id === scenarioId);
      if (!scenario) return;

      packetEngine.reset();
      const edges = buildCandidateGraph(scenario.initialNodes, scenario.initialCostModel);
      const algo = runActiveAlgorithm(
        scenario.initialMode,
        scenario.initialNodes,
        edges,
        scenario.rootPinnedId ?? null,
        scenario.sourceId,
        scenario.targetId,
        1
      );
      const metrics = calculateGraphMetrics(scenario.initialNodes, edges, algo.activeForwardingEdgesCount);

      set({
        activeScenarioId: scenarioId,
        nodes: scenario.initialNodes,
        edges,
        costModel: scenario.initialCostModel,
        algorithmMode: scenario.initialMode,
        selectedNodeId: scenario.sourceId,
        targetEndpointId: scenario.targetId,
        rootPinnedId: scenario.rootPinnedId ?? null,
        activeResult: algo.result,
        metrics,
        packets: [],
        packetMetrics: packetEngine.getMetrics(),
        isContinuousPackets: false,
        revision: get().revision + 1
      });

      get().addLog(`Loaded Classroom Scenario: ${scenario.name}`, 'info');
      get().addLog(`Scenario Goal: ${scenario.learningGoal}`, 'info');
    },

    resetScenario: () => {
      const currentId = get().activeScenarioId;
      if (currentId) {
        get().loadScenario(currentId);
      } else {
        get().resetNetwork();
      }
    },

    resetNetwork: () => {
      packetEngine.reset();
      const edges = buildCandidateGraph(INITIAL_NODES, 'distance');
      const algo = runActiveAlgorithm('STP', INITIAL_NODES, edges, null, 'gw_1', 'ep_2', 1);
      const metrics = calculateGraphMetrics(INITIAL_NODES, edges, algo.activeForwardingEdgesCount);

      set({
        activeScenarioId: null,
        nodes: INITIAL_NODES,
        edges,
        costModel: 'distance',
        algorithmMode: 'STP',
        rootPinnedId: null,
        selectedNodeId: 'gw_1',
        targetEndpointId: 'ep_2',
        activeResult: algo.result,
        metrics,
        packets: [],
        packetMetrics: packetEngine.getMetrics(),
        isContinuousPackets: false,
        revision: get().revision + 1
      });
      get().addLog('Network topology reset to initial state.', 'info');
    },

    resetEntireSession: () => {
      packetEngine.reset();
      get().resetNetwork();
      set({ eventLogs: [] });
      get().addLog('Entire session state, metrics, and event log reset atomically.', 'success');
    },

    toggleReducedMotion: () => {
      set(state => ({ reducedMotion: !state.reducedMotion }));
    },

    setBridgePriority: (nodeId: string, priority: number) => {
      const nodes = get().nodes.map(n => n.id === nodeId ? { ...n, bridgePriority: priority } : n);
      set({ nodes, revision: get().revision + 1 });
      get().recompute();
      get().addLog(`Bridge '${nodeId}' priority set to ${priority}. STP recomputing...`, 'info');
    },

    setNodeRole: (nodeId: string, role: any) => {
      const nodes = get().nodes.map(n => n.id === nodeId ? { ...n, role } : n);
      const edges = buildCandidateGraph(nodes, get().costModel, get().edges);
      set({ nodes, edges, revision: get().revision + 1 });
      get().recompute();
      get().addLog(`Node '${nodeId}' role changed to '${role}'.`, 'info');
    },

    recompute: () => {
      const { algorithmMode, nodes, edges, rootPinnedId, selectedNodeId, targetEndpointId, revision } = get();
      const algo = runActiveAlgorithm(algorithmMode, nodes, edges, rootPinnedId, selectedNodeId, targetEndpointId, revision + 1);
      const metrics = calculateGraphMetrics(nodes, edges, algo.activeForwardingEdgesCount);
      set({ activeResult: algo.result, metrics, revision: revision + 1 });
    },

    addLog: (message, type = 'info') => {
      const newLog = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
      };
      set(state => ({ eventLogs: [newLog, ...state.eventLogs.slice(0, 49)] }));
    }
  };
});

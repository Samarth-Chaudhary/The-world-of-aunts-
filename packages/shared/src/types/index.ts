/**
 * @file types/index.ts
 * @description Canonical network and graph type definitions for NEXUS Distributed Network Lab.
 */

export type NodeRole = 'gateway' | 'bridge' | 'router' | 'endpoint';

export interface NetworkNode {
  id: string;
  name: string;
  role: NodeRole;
  x: number;
  y: number;
  radius: number;
  online: boolean;
  bridgePriority?: number; // lower means higher priority in STP (e.g., 32768, 4096)
  bridgeId?: string;       // deterministic identifier for tie breaking (e.g. MAC / node ID)
  ipAddress?: string;
  participantId?: string;
}

export interface NetworkEdge {
  id: string;
  sourceId: string;
  targetId: string;
  cost: number;
  online: boolean;
  manualCost?: number;
}

export type CostModel = 'distance' | 'manual' | 'capacity';

export type AlgorithmMode =
  | 'STP'      // Mode A: STP-inspired loop prevention
  | 'DIJKSTRA' // Mode B: Dijkstra shortest path
  | 'MST'      // Mode C: Minimum spanning tree
  | 'STORM'    // Mode D: Loop-prevention-disabled storm demonstration
  | 'MANUAL';  // Mode E: Manual graph exploration

export type LinkVisualState =
  | 'candidate'
  | 'forwarding'
  | 'blocked'
  | 'failed'
  | 'transitioning';

export type STPPortRole = 'root' | 'designated' | 'alternate' | 'disabled';
export type STPPortState = 'forwarding' | 'blocking' | 'disabled';

export interface STPPortDecision {
  nodeId: string;
  neighborId: string;
  edgeId: string;
  role: STPPortRole;
  state: STPPortState;
  reason: string;
  pathCostToRoot: number;
}

export interface STPResult {
  mode: 'STP';
  rootBridgeId: string;
  rootPathCosts: Record<string, number>;
  ports: Record<string, STPPortDecision>; // key: `${nodeId}->${neighborId}`
  forwardingEdgeIds: string[];
  blockedEdgeIds: string[];
  explanation: string[];
  topologyRevision: number;
}

export interface DijkstraResult {
  mode: 'DIJKSTRA';
  sourceId: string;
  targetId: string;
  pathNodeIds: string[];
  pathEdgeIds: string[];
  totalCost: number;
  hopCount: number;
  reachable: boolean;
  explanation: string[];
  allDistances: Record<string, number>;
  topologyRevision: number;
}

export interface MSTResult {
  mode: 'MST';
  selectedEdgeIds: string[];
  totalWeight: number;
  isForest: boolean; // true if graph has multiple connected components
  componentCount: number;
  explanation: string[];
  topologyRevision: number;
}

export interface StormResult {
  mode: 'STORM';
  duplicateEventsCount: number;
  activeLoopsCount: number;
  explanation: string[];
  topologyRevision: number;
}

export interface ManualGraphResult {
  mode: 'MANUAL';
  connectedComponents: string[][];
  cyclesFound: string[][];
  explanation: string[];
  topologyRevision: number;
}

export type AlgorithmResult =
  | STPResult
  | DijkstraResult
  | MSTResult
  | StormResult
  | ManualGraphResult;

export interface GraphMetrics {
  nodeCount: number;
  onlineNodeCount: number;
  edgeCount: number;
  connectedComponentCount: number;
  meanDegree: number;
  activeForwardingEdgesCount: number;
  diameter?: number;

  // Convenience aliases for UI components
  onlineNodes: number;
  candidateEdges: number;
  forwardingEdges: number;
  connectedComponents: number;
  averageDegree: number;
}

export interface TopologyState {
  revision: number;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  costModel: CostModel;
  algorithmMode: AlgorithmMode;
  selectedNodeId: string | null;
  targetEndpointId: string | null;
  rootPinnedId: string | null;
  activeResult?: AlgorithmResult;
  metrics: GraphMetrics;
}

export interface SessionInfo {
  code: string;
  instructorConnected: boolean;
  participantCount: number;
  createdTime: number;
}

// ============================================================================
// PACKET ENGINE SIMULATION TYPES (PHASE 5)
// ============================================================================

export type PacketStatus =
  | 'created'
  | 'queued'
  | 'in_transit'
  | 'delivered'
  | 'dropped'
  | 'interrupted';

export type PacketDropReason =
  | 'blocked_port'
  | 'link_down'
  | 'node_down'
  | 'no_route'
  | 'ttl_expired'
  | 'hop_limit_reached'
  | 'storm_budget_exceeded'
  | 'partitioned';

export interface SimulationPacket {
  id: string;
  sourceId: string;
  destinationId: string;
  route: string[];          // sequence of node IDs [u1, u2, ...]
  edgeIds: string[];        // sequence of edge IDs
  currentHopIndex: number;  // index in route
  status: PacketStatus;
  progress: number;         // 0.0 to 1.0 along current hop
  createdAt: number;
  completedAt?: number;
  dropReason?: PacketDropReason;
  simulatedDelayMs: number;
  ttl: number;
  isDuplicate?: boolean;    // for broadcast storm replication
  stormHopLimit?: number;
}

export interface PacketMetrics {
  totalGenerated: number;
  deliveredCount: number;
  droppedCount: number;
  inFlightCount: number;
  duplicateForwardsCount: number;
  deliverySuccessRate: number; // percentage 0 - 100
  averageHops: number;
  simulatedAverageDelayMs: number;
  measuredSocketLatencyMs?: number;
}

export interface PacketEngineConfig {
  generationRatePerSec: number;
  hopDurationMs: number;
  maxInFlight: number;
  stormMaxPackets: number;
  stormMaxHops: number;
  stormTtlMs: number;
}

export type PacketCommandAction =
  | 'send_one'
  | 'start_continuous'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'reset'
  | 'set_rate';

export interface PacketCommandPayload {
  action: PacketCommandAction;
  ratePerSec?: number;
  sourceId?: string;
  destinationId?: string;
}

// ============================================================================
// SCENARIO AND FAILURE TYPES (PHASE 8)
// ============================================================================

export type ScenarioId =
  | 'simple_chain'
  | 'triangle_cycle'
  | 'dense_mesh'
  | 'alternative_route'
  | 'critical_bridge_failure'
  | 'network_partition'
  | 'dijkstra_comparison'
  | 'mst_comparison'
  | 'broadcast_storm'
  | 'congestion'
  | 'root_election'
  | 'equal_cost_paths';

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  category: 'STP' | 'DIJKSTRA' | 'MST' | 'STORM' | 'GENERAL';
  description: string;
  learningGoal: string;
  initialNodes: NetworkNode[];
  initialCostModel: CostModel;
  initialMode: AlgorithmMode;
  sourceId: string;
  targetId: string;
  rootPinnedId?: string | null;
  expectedOutcome: string;
}

// ============================================================================
// CENTRALIZED SOCKET EVENT NAMES & CONTRACTS (PHASE 6 & 7)
// ============================================================================

export const SOCKET_EVENTS = {
  // Session Lifecycle
  SESSION_CREATE: 'session:create',
  SESSION_JOIN: 'session:join',
  SESSION_SNAPSHOT: 'session:snapshot',
  SESSION_SNAPSHOT_REQUEST: 'session:snapshot_request',
  SESSION_ERROR: 'session:error',

  // Participants & Movement
  PARTICIPANT_MOVE: 'participant:move',
  PARTICIPANT_PRESENCE: 'participant:presence',
  ROLE_UPDATE: 'role:update',

  // Topology & Algorithms
  TOPOLOGY_UPDATE: 'topology:update',
  ALGORITHM_SELECT: 'algorithm:select',
  ALGORITHM_RESULT: 'algorithm:result',

  // Packet & Scenario Controls
  PACKET_COMMAND: 'packet:command',
  PACKET_STATE: 'packet:state',
  SCENARIO_COMMAND: 'scenario:command',
  SIMULATION_RESET: 'simulation:reset'
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

export interface ParticipantPresence {
  id: string;
  nickname: string;
  role: 'instructor' | 'student';
  assignedNodeId?: string;
  status: 'connected' | 'reconnecting' | 'disconnected';
  lastSeen: number;
}

export interface SessionSnapshot {
  sessionCode: string;
  revision: number;
  hostId: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  costModel: CostModel;
  algorithmMode: AlgorithmMode;
  activeResult?: AlgorithmResult;
  metrics: GraphMetrics;
  participants: ParticipantPresence[];
  packets: SimulationPacket[];
  packetMetrics: PacketMetrics;
}


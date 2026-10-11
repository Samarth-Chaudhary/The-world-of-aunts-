/**
 * @file scenarios/scenarioDefinitions.ts
 * @description 12 preloaded classroom scenarios for NEXUS — Distributed Network Lab.
 * All presets define real topology, coordinates, roles, algorithm configuration,
 * target endpoints, expected outcomes, and educational walkthrough goals.
 */

import { ScenarioDefinition } from '../types/index.js';

export const CLASSROOM_SCENARIOS: ScenarioDefinition[] = [
  // 1. Simple Chain
  {
    id: 'simple_chain',
    name: '1. Simple Chain: Linear Forwarding',
    category: 'GENERAL',
    description: 'A straight 3-node linear topology with one obvious forwarding path.',
    learningGoal: 'Demonstrate basic hop-by-hop packet forwarding along a linear segment with zero redundant cycles.',
    initialMode: 'DIJKSTRA',
    initialCostModel: 'distance',
    sourceId: 'gw_1',
    targetId: 'ep_1',
    initialNodes: [
      { id: 'gw_1', name: 'Gateway', role: 'gateway', x: -6, y: 0, radius: 5, online: true, bridgePriority: 4096, bridgeId: '00:01' },
      { id: 'r_1', name: 'Router-Mid', role: 'router', x: 0, y: 0, radius: 5, online: true },
      { id: 'ep_1', name: 'Client-Target', role: 'endpoint', x: 6, y: 0, radius: 5, online: true }
    ],
    expectedOutcome: 'Packets traverse Gateway ➔ Router-Mid ➔ Client-Target with 2 hops and 100% delivery rate.'
  },

  // 2. Triangle Cycle
  {
    id: 'triangle_cycle',
    name: '2. Triangle Cycle: Loop Prevention',
    category: 'STP',
    description: 'Three bridges connected in a cycle; STP must elect a root and block one redundant port.',
    learningGoal: 'Visualize why layer-2 bridges require loop prevention and how redundant ports block without removing physical links.',
    initialMode: 'STP',
    initialCostModel: 'distance',
    sourceId: 'gw_1',
    targetId: 'sw_2',
    initialNodes: [
      { id: 'gw_1', name: 'Root-Bridge', role: 'gateway', x: 0, y: -3, radius: 6, online: true, bridgePriority: 4096, bridgeId: '00:00' },
      { id: 'sw_1', name: 'Switch-Alpha', role: 'bridge', x: -4, y: 3, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:0A' },
      { id: 'sw_2', name: 'Switch-Beta', role: 'bridge', x: 4, y: 3, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:0B' }
    ],
    expectedOutcome: 'Root elects gw_1. sw_1 and sw_2 elect Root Ports facing gw_1. Link sw_1 ⇄ sw_2 has one Designated Port and one Blocked Port (BLK).'
  },

  // 3. Dense Mesh
  {
    id: 'dense_mesh',
    name: '3. Dense Mesh vs Spanning Tree',
    category: 'STP',
    description: 'A 5-node interconnected mesh with multiple cyclic cross-links.',
    learningGoal: 'Observe how STP prunes a highly cyclic physical mesh into a loop-free active forwarding tree.',
    initialMode: 'STP',
    initialCostModel: 'distance',
    sourceId: 'gw_1',
    targetId: 'sw_4',
    initialNodes: [
      { id: 'gw_1', name: 'Gateway-Core', role: 'gateway', x: 0, y: -4, radius: 6, online: true, bridgePriority: 4096, bridgeId: '00:01' },
      { id: 'sw_1', name: 'Switch-A', role: 'bridge', x: -5, y: 0, radius: 6, online: true, bridgePriority: 32768, bridgeId: '00:02' },
      { id: 'sw_2', name: 'Switch-B', role: 'bridge', x: 5, y: 0, radius: 6, online: true, bridgePriority: 32768, bridgeId: '00:03' },
      { id: 'sw_3', name: 'Switch-C', role: 'bridge', x: -3, y: 5, radius: 6, online: true, bridgePriority: 32768, bridgeId: '00:04' },
      { id: 'sw_4', name: 'Switch-D', role: 'bridge', x: 3, y: 5, radius: 6, online: true, bridgePriority: 32768, bridgeId: '00:05' }
    ],
    expectedOutcome: 'Exactly 4 forwarding links form the active spanning tree; all redundant cross-links are placed in Alternate/Blocked state.'
  },

  // 4. Alternative Route (Dynamic Failover)
  {
    id: 'alternative_route',
    name: '4. Alternative Route: Self-Healing Failover',
    category: 'STP',
    description: 'Primary link fails and previously blocked alternate link automatically transitions to Forwarding.',
    learningGoal: 'Understand dynamic self-healing layer-2 convergence when primary infrastructure fails.',
    initialMode: 'STP',
    initialCostModel: 'distance',
    sourceId: 'gw_1',
    targetId: 'sw_2',
    initialNodes: [
      { id: 'gw_1', name: 'Gateway', role: 'gateway', x: 0, y: -3, radius: 6, online: true, bridgePriority: 4096, bridgeId: '00:01' },
      { id: 'sw_1', name: 'Switch-A', role: 'bridge', x: -4, y: 2, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:02' },
      { id: 'sw_2', name: 'Switch-B', role: 'bridge', x: 4, y: 2, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:03' }
    ],
    expectedOutcome: 'Toggling gw_1 ⇄ sw_2 off causes the blocked port on sw_1 ⇄ sw_2 to immediately transition to Root Port/Forwarding.'
  },

  // 5. Critical Bridge Failure
  {
    id: 'critical_bridge_failure',
    name: '5. Critical Bridge Failure & Re-Election',
    category: 'STP',
    description: 'The active root bridge goes offline, triggering a new root election among surviving bridges.',
    learningGoal: 'Examine root election survivability: when the root dies, surviving bridges elect the next lowest priority bridge.',
    initialMode: 'STP',
    initialCostModel: 'distance',
    sourceId: 'sw_1',
    targetId: 'sw_3',
    initialNodes: [
      { id: 'gw_1', name: 'Primary-Root', role: 'gateway', x: 0, y: -3, radius: 6, online: true, bridgePriority: 4096, bridgeId: '00:01' },
      { id: 'sw_1', name: 'Backup-Root', role: 'bridge', x: -4, y: 2, radius: 6, online: true, bridgePriority: 8192, bridgeId: '00:02' },
      { id: 'sw_2', name: 'Switch-South', role: 'bridge', x: 4, y: 2, radius: 6, online: true, bridgePriority: 32768, bridgeId: '00:03' },
      { id: 'sw_3', name: 'Switch-North', role: 'bridge', x: 0, y: 6, radius: 6, online: true, bridgePriority: 32768, bridgeId: '00:04' }
    ],
    expectedOutcome: 'Failing Primary-Root triggers instant election of Backup-Root (priority 8192) as the new Root Bridge.'
  },

  // 6. Network Partition
  {
    id: 'network_partition',
    name: '6. Network Partition: Unreachable Island',
    category: 'DIJKSTRA',
    description: 'A disconnected sub-network creates an unreachable target endpoint.',
    learningGoal: 'Verify how Dijkstra and packet engines safely report "No route available" without crashing or hanging.',
    initialMode: 'DIJKSTRA',
    initialCostModel: 'distance',
    sourceId: 'gw_1',
    targetId: 'ep_island',
    initialNodes: [
      { id: 'gw_1', name: 'Main-Gateway', role: 'gateway', x: -6, y: 0, radius: 4, online: true },
      { id: 'sw_1', name: 'Main-Switch', role: 'router', x: -2, y: 0, radius: 4, online: true },
      { id: 'sw_island', name: 'Island-Router', role: 'router', x: 6, y: 0, radius: 3, online: true },
      { id: 'ep_island', name: 'Island-Target', role: 'endpoint', x: 9, y: 0, radius: 3, online: true }
    ],
    expectedOutcome: 'Components count = 2. Dijkstra reports reachable: false, cost: Infinity. Packets drop with partition reason.'
  },

  // 7. Dijkstra Route Comparison
  {
    id: 'dijkstra_comparison',
    name: '7. Dijkstra Route Comparison: Hops vs Cost',
    category: 'DIJKSTRA',
    description: 'A 1-hop high-cost path versus a 2-hop low-cost path.',
    learningGoal: 'Demonstrate that shortest path minimizes cumulative metric cost, not merely raw hop count.',
    initialMode: 'DIJKSTRA',
    initialCostModel: 'capacity',
    sourceId: 'gw_1',
    targetId: 'ep_target',
    initialNodes: [
      { id: 'gw_1', name: 'Source', role: 'gateway', x: -6, y: 0, radius: 9, online: true },
      { id: 'r_fast', name: 'High-Speed-Relay', role: 'router', x: 0, y: 2, radius: 6, online: true },
      { id: 'ep_target', name: 'Destination', role: 'endpoint', x: 6, y: 0, radius: 9, online: true }
    ],
    expectedOutcome: 'Dijkstra selects the 2-hop high-speed path over the long 1-hop bottleneck link.'
  },

  // 8. MST Infrastructure Comparison
  {
    id: 'mst_comparison',
    name: '8. MST Comparison: Total Weight vs Shortest Route',
    category: 'MST',
    description: 'Kruskal MST connects all nodes with minimum total edge weight, discarding redundant links.',
    learningGoal: 'Understand why MST is unrooted and distinct from point-to-point shortest path routing.',
    initialMode: 'MST',
    initialCostModel: 'distance',
    sourceId: 'gw_1',
    targetId: 'ep_2',
    initialNodes: [
      { id: 'gw_1', name: 'Node-1', role: 'bridge', x: -4, y: -2, radius: 6, online: true },
      { id: 'sw_1', name: 'Node-2', role: 'bridge', x: 0, y: -2, radius: 6, online: true },
      { id: 'sw_2', name: 'Node-3', role: 'bridge', x: 4, y: -2, radius: 6, online: true },
      { id: 'ep_1', name: 'Node-4', role: 'bridge', x: -2, y: 3, radius: 6, online: true },
      { id: 'ep_2', name: 'Node-5', role: 'bridge', x: 2, y: 3, radius: 6, online: true }
    ],
    expectedOutcome: 'Kruskal selects exactly 4 minimal weight edges connecting all 5 vertices with zero loops.'
  },

  // 9. Broadcast Storm (Loop Prevention Disabled)
  {
    id: 'broadcast_storm',
    name: '9. Broadcast Storm: Unchecked Frame Multiplication',
    category: 'STORM',
    description: 'Loop prevention is disabled in a cyclic topology, demonstrating bounded frame multiplication.',
    learningGoal: 'Experience why broadcast storms paralyze networks without STP, with safety limits preventing browser freezing.',
    initialMode: 'STORM',
    initialCostModel: 'distance',
    sourceId: 'gw_1',
    targetId: 'sw_3',
    initialNodes: [
      { id: 'gw_1', name: 'Storm-Bridge-1', role: 'bridge', x: -3, y: -2, radius: 6, online: true },
      { id: 'sw_1', name: 'Storm-Bridge-2', role: 'bridge', x: 3, y: -2, radius: 6, online: true },
      { id: 'sw_2', name: 'Storm-Bridge-3', role: 'bridge', x: 3, y: 3, radius: 6, online: true },
      { id: 'sw_3', name: 'Storm-Bridge-4', role: 'bridge', x: -3, y: 3, radius: 6, online: true }
    ],
    expectedOutcome: 'Packets replicate across active cyclic loops; duplicate forwards counter increases rapidly until budget cap.'
  },

  // 10. Network Congestion
  {
    id: 'congestion',
    name: '10. Network Congestion & Queue Bottlenecks',
    category: 'GENERAL',
    description: 'High packet generation rate simulates bottleneck queue utilization and synthetic delay.',
    learningGoal: 'Observe how queuing delay and utilization increase as traffic approaches channel capacity.',
    initialMode: 'DIJKSTRA',
    initialCostModel: 'capacity',
    sourceId: 'gw_1',
    targetId: 'ep_1',
    initialNodes: [
      { id: 'gw_1', name: 'Traffic-Source', role: 'gateway', x: -5, y: 0, radius: 6, online: true },
      { id: 'r_choke', name: 'Choke-Point-Router', role: 'router', x: 0, y: 0, radius: 6, online: true },
      { id: 'ep_1', name: 'Traffic-Sink', role: 'endpoint', x: 5, y: 0, radius: 6, online: true }
    ],
    expectedOutcome: 'Continuous high-rate packet stream demonstrates queue buffer utilization and simulated route delay.'
  },

  // 11. Root Election Priority Manipulation
  {
    id: 'root_election',
    name: '11. Root Election: Priority Manipulation',
    category: 'STP',
    description: 'Two core switches with different configured bridge priorities.',
    learningGoal: 'Observe how network engineers manipulate bridge priority (e.g. 4096 vs 8192 vs 32768) to control root placement.',
    initialMode: 'STP',
    initialCostModel: 'distance',
    sourceId: 'sw_primary',
    targetId: 'sw_access',
    initialNodes: [
      { id: 'sw_primary', name: 'Core-Prio-4096', role: 'bridge', x: -4, y: 0, radius: 7, online: true, bridgePriority: 4096, bridgeId: '00:01' },
      { id: 'sw_secondary', name: 'Core-Prio-8192', role: 'bridge', x: 4, y: 0, radius: 7, online: true, bridgePriority: 8192, bridgeId: '00:02' },
      { id: 'sw_access', name: 'Access-Prio-32768', role: 'bridge', x: 0, y: 4, radius: 7, online: true, bridgePriority: 32768, bridgeId: '00:03' }
    ],
    expectedOutcome: 'Core-Prio-4096 wins election. Changing its priority to 65535 immediately shifts Root Bridge to Core-Prio-8192.'
  },

  // 12. Equal-Cost Path Deterministic Tie-Breaking
  {
    id: 'equal_cost_paths',
    name: '12. Equal-Cost Paths: Deterministic Tie-Breaking',
    category: 'DIJKSTRA',
    description: 'Two parallel paths offering identical cumulative cost.',
    learningGoal: 'Demonstrate deterministic tie-breaking: when multiple paths share equal cost, tie-breakers prevent routing oscillation.',
    initialMode: 'DIJKSTRA',
    initialCostModel: 'distance',
    sourceId: 'src',
    targetId: 'dst',
    initialNodes: [
      { id: 'src', name: 'Source', role: 'gateway', x: -5, y: 0, radius: 6, online: true },
      { id: 'path_a', name: 'Path-Alpha', role: 'router', x: 0, y: 3, radius: 6, online: true },
      { id: 'path_b', name: 'Path-Beta', role: 'router', x: 0, y: -3, radius: 6, online: true },
      { id: 'dst', name: 'Destination', role: 'endpoint', x: 5, y: 0, radius: 6, online: true }
    ],
    expectedOutcome: 'Both Path-Alpha and Path-Beta have identical cost (5.83 + 5.83 = 11.66). Deterministic tie-breaker selects Path-Alpha consistently.'
  }
];

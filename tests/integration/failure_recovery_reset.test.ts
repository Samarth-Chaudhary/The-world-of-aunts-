/**
 * @file tests/integration/failure_recovery_reset.test.ts
 * @description Hardening tests for:
 * 1. Failure and Partition recovery (link down, bridge down, partition, recomputation).
 * 2. Reconnection and full canonical snapshot synchronization.
 * 3. Repeated atomic resets clearing all obsolete packets, timers, and overrides.
 */

import { describe, it, expect } from 'vitest';
import {
  NetworkNode,
  NetworkEdge,
  buildCandidateGraph,
  computeSTP,
  computeDijkstra,
  computeMST,
  PacketSimulationEngine,
  CLASSROOM_SCENARIOS
} from '../../packages/shared/src/index';
import { SessionManager } from '../../apps/server/src/session/manager';

describe('Phase 10 Hardening: Failure, Partition, Reconnection, and Reset Invariants', () => {
  it('handles bridge failure and automatically recomputes alternative STP forwarding topology', () => {
    // 3 switches in a triangle
    const nodes: NetworkNode[] = [
      { id: 's1', name: 'RootSwitch', role: 'bridge', x: 0, y: 0, radius: 6, online: true, bridgePriority: 4096 },
      { id: 's2', name: 'SwitchB', role: 'bridge', x: 4, y: 0, radius: 6, online: true, bridgePriority: 32768 },
      { id: 's3', name: 'SwitchC', role: 'bridge', x: 2, y: 4, radius: 6, online: true, bridgePriority: 32768 }
    ];

    const edges = buildCandidateGraph(nodes, 'distance');
    const stp1 = computeSTP(nodes, edges);
    expect(stp1.rootBridgeId).toBe('s1');
    expect(stp1.blockedEdgeIds.length).toBe(1); // 1 redundant link blocked

    // Fail SwitchB
    const failedNodes = nodes.map((n) => (n.id === 's2' ? { ...n, online: false } : n));
    const failedEdges = buildCandidateGraph(failedNodes, 'distance');

    const stp2 = computeSTP(failedNodes, failedEdges);
    expect(stp2.rootBridgeId).toBe('s1');
    // Only the direct edge between s1 and s3 remains active; no blocked edge
    expect(stp2.forwardingEdgeIds.length).toBe(1);
    expect(stp2.blockedEdgeIds.length).toBe(0);

    // Restore SwitchB
    const restoredNodes = failedNodes.map((n) => (n.id === 's2' ? { ...n, online: true } : n));
    const restoredEdges = buildCandidateGraph(restoredNodes, 'distance');
    const stp3 = computeSTP(restoredNodes, restoredEdges);
    expect(stp3.blockedEdgeIds.length).toBe(1);
    expect(stp3.rootBridgeId).toBe('s1');
  });

  it('correctly reports unreachable target during network partition and drops packets', () => {
    // 4 nodes in a strict chain: A - B - C - D (each adjacent distance = 5, radius = 3)
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'NodeA', role: 'bridge', x: 0, y: 0, radius: 3, online: true },
      { id: 'B', name: 'NodeB', role: 'bridge', x: 5, y: 0, radius: 3, online: true },
      { id: 'C', name: 'NodeC', role: 'bridge', x: 10, y: 0, radius: 3, online: true },
      { id: 'D', name: 'NodeD', role: 'bridge', x: 15, y: 0, radius: 3, online: true }
    ];
    const edges = buildCandidateGraph(nodes, 'distance');

    const dij1 = computeDijkstra(nodes, edges, 'A', 'D');
    expect(dij1.reachable).toBe(true);
    expect(dij1.hopCount).toBe(3);

    // Fail Node B -> cuts network into {A} and {C, D}
    const partitionedNodes = nodes.map((n) => (n.id === 'B' ? { ...n, online: false } : n));
    const partitionedEdges = buildCandidateGraph(partitionedNodes, 'distance');

    const dij2 = computeDijkstra(partitionedNodes, partitionedEdges, 'A', 'D');
    expect(dij2.reachable).toBe(false);
    expect(dij2.totalCost).toBe(Infinity);
    expect(dij2.pathNodeIds).toEqual([]);

    // Packet engine must immediately drop packet with no_route when stepping through partitioned state
    const engine = new PacketSimulationEngine();
    const pkt = engine.sendPacket('A', 'D', ['A', 'B', 'C', 'D'], ['e_A_B', 'e_B_C', 'e_C_D']);
    expect(pkt).not.toBeNull();

    // Step simulation on the partitioned network
    const step = engine.step(500, partitionedNodes, partitionedEdges, dij2, (src, dst) => ({
      route: [],
      edgeIds: []
    }));

    // The packet must be dropped because node B is offline
    expect(step.droppedEvents.length).toBe(1);
    expect(step.droppedEvents[0].dropReason).toBe('node_down');
  });

  it('clears all stale state across 25 repeated scenario resets', () => {
    const engine = new PacketSimulationEngine();

    for (let i = 0; i < 25; i++) {
      // Pick scenario
      const scenario = CLASSROOM_SCENARIOS[i % CLASSROOM_SCENARIOS.length];

      // Inject packets
      engine.sendPacket(scenario.sourceId, scenario.targetId, [scenario.sourceId, scenario.targetId], ['e1']);
      engine.startContinuous(scenario.sourceId, scenario.targetId, 10);
      engine.step(100, scenario.initialNodes, [], null);

      // Perform atomic reset
      engine.reset();

      expect(engine.getPackets().length).toBe(0);
      expect(engine.getMetrics().inFlightCount).toBe(0);
      expect(engine.getMetrics().totalGenerated).toBe(0);
      expect(engine.getMetrics().deliveredCount).toBe(0);
      expect(engine.getMetrics().droppedCount).toBe(0);
    }
  });

  it('preserves session snapshot and handles participant reconnection within grace period', () => {
    const manager = new SessionManager();
    const session = manager.createSession('RECONN_TEST', 'host-secret-123');

    // Student joins
    const joinRes = manager.joinSession('RECONN_TEST', 'socket-old-1', 'Student-Bob', 'student');
    expect(joinRes).not.toBeNull();
    const participantId = joinRes!.participant.id;
    const assignedNode = joinRes!.participant.assignedNodeId;

    // Disconnect occurs -> marks participant status 'reconnecting' and sets grace timer
    manager.handleDisconnect('socket-old-1');
    const pOffline = session.participants.get('socket-old-1');
    expect(pOffline?.status).toBe('reconnecting');

    // Reconnection occurs with new socket ID
    const reconnRes = manager.reconnectParticipant('RECONN_TEST', 'socket-new-2', participantId);
    expect(reconnRes).not.toBeNull();
    expect(reconnRes!.participant.assignedNodeId).toBe(assignedNode);
    expect(reconnRes!.participant.status).toBe('connected');

    // Canonical snapshot reflects active participant
    const snapshot = manager.getSnapshot(session);
    expect(snapshot.participants.find((p) => p.id === participantId)?.status).toBe('connected');
  });
});

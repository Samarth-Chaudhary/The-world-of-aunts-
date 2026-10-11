/**
 * @file tests/unit/packet.test.ts
 * @description Unit tests for PacketSimulationEngine:
 * delivery, blocked STP port drops, transit failure interruption,
 * storm replication bounding, metric reconciliation, and reset behavior.
 */

import { describe, it, expect } from 'vitest';
import { PacketSimulationEngine } from '../../packages/shared/src/simulation/packetEngine';
import { computeSTP } from '../../packages/shared/src/algorithms/stp';
import { NetworkNode, NetworkEdge } from '../../packages/shared/src/types/index';

describe('Packet Simulation Engine', () => {
  it('advances a packet along a valid route to delivery', () => {
    const engine = new PacketSimulationEngine({ hopDurationMs: 100 });
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'A', role: 'gateway', x: 0, y: 0, radius: 5, online: true },
      { id: 'B', name: 'B', role: 'bridge', x: 2, y: 0, radius: 5, online: true },
      { id: 'C', name: 'C', role: 'endpoint', x: 4, y: 0, radius: 5, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: 'e_AB', sourceId: 'A', targetId: 'B', cost: 1, online: true },
      { id: 'e_BC', sourceId: 'B', targetId: 'C', cost: 1, online: true }
    ];

    const pkt = engine.sendPacket('A', 'C', ['A', 'B', 'C'], ['e_AB', 'e_BC']);
    expect(pkt).toBeDefined();
    expect(pkt?.status).toBe('in_transit');

    // Step 50ms: progress halfway on hop 0 (A -> B)
    engine.step(50, nodes, edges, null);
    let currentPackets = engine.getPackets();
    expect(currentPackets[0].currentHopIndex).toBe(0);
    expect(currentPackets[0].progress).toBeCloseTo(0.5, 1);

    // Step another 60ms: completes hop 0, advances to hop 1 (B -> C)
    engine.step(60, nodes, edges, null);
    currentPackets = engine.getPackets();
    expect(currentPackets[0].currentHopIndex).toBe(1);

    // Step another 100ms: completes hop 1, reaches destination C
    const stepResult = engine.step(100, nodes, edges, null);
    expect(stepResult.deliveredEvents).toHaveLength(1);
    expect(stepResult.deliveredEvents[0].status).toBe('delivered');

    const metrics = engine.getMetrics();
    expect(metrics.totalGenerated).toBe(1);
    expect(metrics.deliveredCount).toBe(1);
    expect(metrics.droppedCount).toBe(0);
    expect(metrics.deliverySuccessRate).toBe(100);
  });

  it('drops packet when attempting to traverse an STP blocked port', () => {
    const engine = new PacketSimulationEngine({ hopDurationMs: 100 });
    // Triangle: root, B, C with link B-C blocked
    const nodes: NetworkNode[] = [
      { id: 'root', name: 'Root', role: 'bridge', x: 0, y: 0, radius: 5, online: true, bridgePriority: 4096, bridgeId: '00:00' },
      { id: 'b', name: 'Bridge B', role: 'bridge', x: -3, y: 4, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:0B' },
      { id: 'c', name: 'Bridge C', role: 'bridge', x: 3, y: 4, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:0C' }
    ];
    const edges: NetworkEdge[] = [
      { id: 'root<->b', sourceId: 'root', targetId: 'b', cost: 4, online: true },
      { id: 'root<->c', sourceId: 'root', targetId: 'c', cost: 4, online: true },
      { id: 'b<->c', sourceId: 'b', targetId: 'c', cost: 4, online: true }
    ];

    const stpResult = computeSTP(nodes, edges);
    expect(stpResult.blockedEdgeIds).toContain('b<->c');

    // Attempt to illegally send packet across blocked link b <-> c
    engine.sendPacket('b', 'c', ['b', 'c'], ['b<->c']);

    const stepResult = engine.step(10, nodes, edges, stpResult);
    expect(stepResult.droppedEvents).toHaveLength(1);
    expect(stepResult.droppedEvents[0].status).toBe('dropped');
    expect(stepResult.droppedEvents[0].dropReason).toBe('blocked_port');

    const metrics = engine.getMetrics();
    expect(metrics.droppedCount).toBe(1);
    expect(metrics.deliveredCount).toBe(0);
    expect(metrics.deliverySuccessRate).toBe(0);
  });

  it('drops packet when link fails mid-transit', () => {
    const engine = new PacketSimulationEngine({ hopDurationMs: 100 });
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'A', role: 'gateway', x: 0, y: 0, radius: 5, online: true },
      { id: 'B', name: 'B', role: 'endpoint', x: 2, y: 0, radius: 5, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: 'e_AB', sourceId: 'A', targetId: 'B', cost: 1, online: true }
    ];

    engine.sendPacket('A', 'B', ['A', 'B'], ['e_AB']);
    engine.step(50, nodes, edges, null); // halfway in transit

    // Edge fails suddenly!
    const failedEdges: NetworkEdge[] = [
      { id: 'e_AB', sourceId: 'A', targetId: 'B', cost: 1, online: false }
    ];

    const stepResult = engine.step(10, nodes, failedEdges, null);
    expect(stepResult.droppedEvents).toHaveLength(1);
    expect(stepResult.droppedEvents[0].dropReason).toBe('link_down');
  });

  it('enforces strict packet cap during storm mode replication', () => {
    const engine = new PacketSimulationEngine({
      hopDurationMs: 20,
      stormMaxPackets: 15 // Strict cap
    });

    const nodes: NetworkNode[] = [
      { id: '1', name: 'N1', role: 'bridge', x: 0, y: 0, radius: 5, online: true },
      { id: '2', name: 'N2', role: 'bridge', x: 2, y: 0, radius: 5, online: true },
      { id: '3', name: 'N3', role: 'bridge', x: 2, y: 2, radius: 5, online: true },
      { id: '4', name: 'N4', role: 'bridge', x: 0, y: 2, radius: 5, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: '1-2', sourceId: '1', targetId: '2', cost: 1, online: true },
      { id: '2-3', sourceId: '2', targetId: '3', cost: 1, online: true },
      { id: '3-4', sourceId: '3', targetId: '4', cost: 1, online: true },
      { id: '4-1', sourceId: '4', targetId: '1', cost: 1, online: true }
    ];

    const stormResult = { mode: 'STORM' as const, duplicateEventsCount: 8, activeLoopsCount: 1, explanation: [], topologyRevision: 1 };

    engine.sendPacket('1', '3', ['1', '2', '3'], ['1-2', '2-3']);

    // Advance 10 steps to allow replication
    for (let i = 0; i < 10; i++) {
      engine.step(25, nodes, edges, stormResult);
    }

    const packets = engine.getPackets();
    // Cannot exceed strict budget
    expect(packets.length).toBeLessThanOrEqual(15);
  });

  it('resets cleanly without residual state', () => {
    const engine = new PacketSimulationEngine();
    engine.sendPacket('A', 'B', ['A', 'B'], ['e1']);
    expect(engine.getPackets().length).toBe(1);

    engine.reset();
    expect(engine.getPackets().length).toBe(0);
    expect(engine.getMetrics().totalGenerated).toBe(0);
    expect(engine.getMetrics().deliveredCount).toBe(0);
    expect(engine.isRunning()).toBe(false);
  });
});

/**
 * @file tests/unit/stp.test.ts
 * @description Unit tests for Spanning Tree Protocol (STP) educational engine:
 * root election, root-path costs, port roles/states, cycle loop-prevention,
 * deterministic tie-breaking, and topology failure recovery.
 */

import { describe, it, expect } from 'vitest';
import { computeSTP } from '../../packages/shared/src/algorithms/stp';
import { NetworkNode, NetworkEdge } from '../../packages/shared/src/types/index';

describe('Spanning Tree Protocol (STP) Educational Model', () => {
  it('elects root bridge based on lowest priority, tie-breaking by bridge ID', () => {
    const nodes: NetworkNode[] = [
      { id: 'sw_1', name: 'Switch 1', role: 'bridge', x: 0, y: 0, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:01' },
      { id: 'sw_2', name: 'Switch 2', role: 'bridge', x: 2, y: 0, radius: 5, online: true, bridgePriority: 4096, bridgeId: '00:02' }, // Lowest priority
      { id: 'sw_3', name: 'Switch 3', role: 'bridge', x: 4, y: 0, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:03' }
    ];

    const edges: NetworkEdge[] = [
      { id: 'sw_1<->sw_2', sourceId: 'sw_1', targetId: 'sw_2', cost: 10, online: true },
      { id: 'sw_2<->sw_3', sourceId: 'sw_2', targetId: 'sw_3', cost: 10, online: true }
    ];

    const result = computeSTP(nodes, edges);
    expect(result.rootBridgeId).toBe('sw_2');
    expect(result.rootPathCosts['sw_2']).toBe(0);
    expect(result.rootPathCosts['sw_1']).toBe(10);
    expect(result.rootPathCosts['sw_3']).toBe(10);
  });

  it('permits instructor root pinning for teaching demonstrations', () => {
    const nodes: NetworkNode[] = [
      { id: 'sw_1', name: 'Switch 1', role: 'bridge', x: 0, y: 0, radius: 5, online: true, bridgePriority: 4096, bridgeId: '00:01' },
      { id: 'sw_2', name: 'Switch 2', role: 'bridge', x: 2, y: 0, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:02' }
    ];
    const edges: NetworkEdge[] = [
      { id: 'sw_1<->sw_2', sourceId: 'sw_1', targetId: 'sw_2', cost: 4, online: true }
    ];

    // Pin sw_2 despite sw_1 having lower priority
    const result = computeSTP(nodes, edges, 'sw_2');
    expect(result.rootBridgeId).toBe('sw_2');
    expect(result.ports['sw_2->sw_1'].role).toBe('designated');
    expect(result.ports['sw_1->sw_2'].role).toBe('root');
  });

  it('breaks cycles in a triangle topology by blocking redundant port (NOT deleting the physical link)', () => {
    // Triangle: sw_root (prio 4096), sw_b (prio 32768), sw_c (prio 32768)
    const nodes: NetworkNode[] = [
      { id: 'root', name: 'Root', role: 'bridge', x: 0, y: 0, radius: 5, online: true, bridgePriority: 4096, bridgeId: '00:00' },
      { id: 'b', name: 'Bridge B', role: 'bridge', x: -3, y: 4, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:0B' },
      { id: 'c', name: 'Bridge C', role: 'bridge', x: 3, y: 4, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:0C' }
    ];

    const edges: NetworkEdge[] = [
      { id: 'root<->b', sourceId: 'root', targetId: 'b', cost: 4, online: true },
      { id: 'root<->c', sourceId: 'root', targetId: 'c', cost: 4, online: true },
      { id: 'b<->c', sourceId: 'b', targetId: 'c', cost: 4, online: true } // Redundant cycle edge
    ];

    const result = computeSTP(nodes, edges);

    expect(result.rootBridgeId).toBe('root');
    expect(result.forwardingEdgeIds).toContain('root<->b');
    expect(result.forwardingEdgeIds).toContain('root<->c');
    expect(result.blockedEdgeIds).toContain('b<->c');

    // Port roles: Root ports on B and C point to Root
    expect(result.ports['b->root'].role).toBe('root');
    expect(result.ports['b->root'].state).toBe('forwarding');

    expect(result.ports['c->root'].role).toBe('root');
    expect(result.ports['c->root'].state).toBe('forwarding');

    // On segment b<->c, bridge b has lower ID ('00:0B' vs '00:0C'), so b gets Designated Port, c gets Alternate/Blocked Port
    expect(result.ports['b->c'].role).toBe('designated');
    expect(result.ports['b->c'].state).toBe('forwarding');

    expect(result.ports['c->b'].role).toBe('alternate');
    expect(result.ports['c->b'].state).toBe('blocking');
  });

  it('unblocks redundant port when a primary root-link fails (topology recovery)', () => {
    const nodes: NetworkNode[] = [
      { id: 'root', name: 'Root', role: 'bridge', x: 0, y: 0, radius: 5, online: true, bridgePriority: 4096, bridgeId: '00:00' },
      { id: 'b', name: 'Bridge B', role: 'bridge', x: -3, y: 4, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:0B' },
      { id: 'c', name: 'Bridge C', role: 'bridge', x: 3, y: 4, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:0C' }
    ];

    // Primary link root<->c FAILS (online = false)
    const edgesWithFailure: NetworkEdge[] = [
      { id: 'root<->b', sourceId: 'root', targetId: 'b', cost: 4, online: true },
      { id: 'root<->c', sourceId: 'root', targetId: 'c', cost: 4, online: false }, // FAILED
      { id: 'b<->c', sourceId: 'b', targetId: 'c', cost: 4, online: true }
    ];

    const result = computeSTP(nodes, edgesWithFailure);

    // Now C must reach root through B!
    expect(result.rootBridgeId).toBe('root');
    expect(result.rootPathCosts['c']).toBe(8); // 4 + 4
    expect(result.forwardingEdgeIds).toContain('root<->b');
    expect(result.forwardingEdgeIds).toContain('b<->c'); // b<->c transitioned from blocked to forwarding!
    expect(result.blockedEdgeIds).toHaveLength(0);

    expect(result.ports['c->b'].role).toBe('root');
    expect(result.ports['c->b'].state).toBe('forwarding');
  });

  it('handles isolated and disconnected bridge nodes gracefully', () => {
    const nodes: NetworkNode[] = [
      { id: 'root', name: 'Root', role: 'bridge', x: 0, y: 0, radius: 5, online: true, bridgePriority: 4096, bridgeId: '00:00' },
      { id: 'isolated', name: 'Isolated', role: 'bridge', x: 50, y: 50, radius: 5, online: true, bridgePriority: 32768, bridgeId: '00:99' }
    ];
    const edges: NetworkEdge[] = []; // No edges

    const result = computeSTP(nodes, edges);
    expect(result.rootBridgeId).toBe('root');
    expect(result.rootPathCosts['isolated']).toBe(Infinity);
  });
});

/**
 * @file tests/unit/storm.test.ts
 * @description Unit tests for broadcast storm pedagogical demonstration model.
 */

import { describe, it, expect } from 'vitest';
import { computeStormModel } from '../../packages/shared/src/algorithms/storm';
import { NetworkNode, NetworkEdge } from '../../packages/shared/src/types/index';

describe('Broadcast Storm Model (Loop Prevention Disabled)', () => {
  it('detects zero loops on a tree or linear chain', () => {
    const nodes: NetworkNode[] = [
      { id: '1', name: 'N1', role: 'bridge', x: 0, y: 0, radius: 5, online: true },
      { id: '2', name: 'N2', role: 'bridge', x: 2, y: 0, radius: 5, online: true },
      { id: '3', name: 'N3', role: 'bridge', x: 4, y: 0, radius: 5, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: '1<->2', sourceId: '1', targetId: '2', cost: 1, online: true },
      { id: '2<->3', sourceId: '2', targetId: '3', cost: 1, online: true }
    ];

    const result = computeStormModel(nodes, edges);
    expect(result.activeLoopsCount).toBe(0);
    expect(result.duplicateEventsCount).toBe(0);
  });

  it('detects redundant cycles in a cyclic mesh graph', () => {
    // 3 nodes with 3 edges -> 1 cycle (3 - 3 + 1 = 1)
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'A', role: 'bridge', x: 0, y: 0, radius: 5, online: true },
      { id: 'B', name: 'B', role: 'bridge', x: 2, y: 0, radius: 5, online: true },
      { id: 'C', name: 'C', role: 'bridge', x: 1, y: 2, radius: 5, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: 'A<->B', sourceId: 'A', targetId: 'B', cost: 1, online: true },
      { id: 'B<->C', sourceId: 'B', targetId: 'C', cost: 1, online: true },
      { id: 'A<->C', sourceId: 'A', targetId: 'C', cost: 1, online: true }
    ];

    const result = computeStormModel(nodes, edges);
    expect(result.activeLoopsCount).toBe(1);
    expect(result.duplicateEventsCount).toBeGreaterThan(0);
    expect(result.explanation[0]).toContain('LOOP PREVENTION DISABLED');
  });
});

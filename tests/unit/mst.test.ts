/**
 * @file tests/unit/mst.test.ts
 * @description Unit tests for Minimum Spanning Tree / Forest (Kruskal) algorithm:
 * known fixtures, cycle breaking, spanning forests on disconnected graphs,
 * and regression proof that MST is distinct from Dijkstra shortest path.
 */

import { describe, it, expect } from 'vitest';
import { computeMST } from '../../packages/shared/src/algorithms/mst';
import { computeDijkstra } from '../../packages/shared/src/algorithms/dijkstra';
import { NetworkNode, NetworkEdge } from '../../packages/shared/src/types/index';

describe('Minimum Spanning Tree (MST) Engine', () => {
  it('finds minimum total weight in a triangle cycle fixture', () => {
    // Triangle: edges weights 2, 3, 7. MST must pick weights 2 and 3 -> total weight = 5
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'A', role: 'bridge', x: 0, y: 0, radius: 5, online: true },
      { id: 'B', name: 'B', role: 'bridge', x: 2, y: 0, radius: 5, online: true },
      { id: 'C', name: 'C', role: 'bridge', x: 1, y: 2, radius: 5, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: 'A<->B', sourceId: 'A', targetId: 'B', cost: 2, online: true },
      { id: 'B<->C', sourceId: 'B', targetId: 'C', cost: 3, online: true },
      { id: 'A<->C', sourceId: 'A', targetId: 'C', cost: 7, online: true }
    ];

    const result = computeMST(nodes, edges);
    expect(result.isForest).toBe(false);
    expect(result.componentCount).toBe(1);
    expect(result.selectedEdgeIds.sort()).toEqual(['A<->B', 'B<->C']);
    expect(result.totalWeight).toBe(5);
  });

  it('selects exactly V - 1 edges in a 4-node dense cyclic graph without cycles', () => {
    // 4 nodes (K4): 6 candidate edges
    const nodes: NetworkNode[] = [
      { id: '1', name: 'N1', role: 'bridge', x: 0, y: 0, radius: 5, online: true },
      { id: '2', name: 'N2', role: 'bridge', x: 2, y: 0, radius: 5, online: true },
      { id: '3', name: 'N3', role: 'bridge', x: 2, y: 2, radius: 5, online: true },
      { id: '4', name: 'N4', role: 'bridge', x: 0, y: 2, radius: 5, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: '1<->2', sourceId: '1', targetId: '2', cost: 1, online: true },
      { id: '2<->3', sourceId: '2', targetId: '3', cost: 2, online: true },
      { id: '3<->4', sourceId: '3', targetId: '4', cost: 3, online: true },
      { id: '4<->1', sourceId: '4', targetId: '1', cost: 4, online: true },
      { id: '1<->3', sourceId: '1', targetId: '3', cost: 5, online: true },
      { id: '2<->4', sourceId: '2', targetId: '4', cost: 6, online: true }
    ];

    const result = computeMST(nodes, edges);
    // Tree of 4 vertices has exactly 3 edges
    expect(result.selectedEdgeIds).toHaveLength(3);
    // Lowest 3 non-cycle edges: 1<->2 (1), 2<->3 (2), 3<->4 (3) -> total 6
    expect(result.totalWeight).toBe(6);
    expect(result.selectedEdgeIds.sort()).toEqual(['1<->2', '2<->3', '3<->4']);
  });

  it('yields Minimum Spanning Forest when graph is partitioned/disconnected', () => {
    const nodes: NetworkNode[] = [
      { id: 'A1', name: 'A1', role: 'bridge', x: 0, y: 0, radius: 3, online: true },
      { id: 'A2', name: 'A2', role: 'bridge', x: 1, y: 0, radius: 3, online: true },
      { id: 'B1', name: 'B1', role: 'bridge', x: 20, y: 0, radius: 3, online: true },
      { id: 'B2', name: 'B2', role: 'bridge', x: 21, y: 0, radius: 3, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: 'A1<->A2', sourceId: 'A1', targetId: 'A2', cost: 10, online: true },
      { id: 'B1<->B2', sourceId: 'B1', targetId: 'B2', cost: 15, online: true }
    ];

    const result = computeMST(nodes, edges);
    expect(result.isForest).toBe(true);
    expect(result.componentCount).toBe(2);
    expect(result.selectedEdgeIds.sort()).toEqual(['A1<->A2', 'B1<->B2']);
    expect(result.totalWeight).toBe(25);
    expect(result.explanation[0]).toContain('Minimum Spanning Forest');
  });

  it('regression proof: MST and Dijkstra are NOT interchangeable', () => {
    // Setup a graph where:
    // S -> A has weight 4
    // A -> T has weight 4
    // S -> T has weight 5
    const nodes: NetworkNode[] = [
      { id: 'S', name: 'S', role: 'gateway', x: 0, y: 0, radius: 10, online: true },
      { id: 'A', name: 'A', role: 'router', x: 2, y: 2, radius: 10, online: true },
      { id: 'T', name: 'T', role: 'endpoint', x: 4, y: 0, radius: 10, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: 'S<->A', sourceId: 'S', targetId: 'A', cost: 4, online: true },
      { id: 'A<->T', sourceId: 'A', targetId: 'T', cost: 4, online: true },
      { id: 'S<->T', sourceId: 'S', targetId: 'T', cost: 5, online: true }
    ];

    // 1. Dijkstra from S to T:
    // Route 1: S -> T has cost 5.
    // Route 2: S -> A -> T has cost 8.
    // Dijkstra picks edge S<->T!
    const dijkstraResult = computeDijkstra(nodes, edges, 'S', 'T');
    expect(dijkstraResult.pathEdgeIds).toEqual(['S<->T']);
    expect(dijkstraResult.totalCost).toBe(5);

    // 2. Kruskal MST on the same graph:
    // Edges sorted by weight: S<->A (4), A<->T (4), S<->T (5).
    // DSU picks S<->A (4), then A<->T (4) (now all 3 nodes are connected!).
    // Edge S<->T (5) is discarded because it forms a cycle!
    // Total weight = 8.
    const mstResult = computeMST(nodes, edges);
    expect(mstResult.selectedEdgeIds.sort()).toEqual(['A<->T', 'S<->A']);
    expect(mstResult.selectedEdgeIds).not.toContain('S<->T');
    expect(mstResult.totalWeight).toBe(8);

    // Concrete assertion: The edge chosen by Dijkstra (S<->T) was NOT chosen by MST
    expect(dijkstraResult.pathEdgeIds[0]).not.toEqual(mstResult.selectedEdgeIds[0]);
  });
});

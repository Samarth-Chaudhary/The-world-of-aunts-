/**
 * @file tests/unit/dijkstra.test.ts
 * @description Unit tests for Dijkstra Shortest Path algorithm:
 * chain, triangle, weighted diamond, dense cyclic, disconnected, equal-cost ties,
 * invalid endpoints, failures, and non-destruction of alternate edges.
 */

import { describe, it, expect } from 'vitest';
import { computeDijkstra } from '../../packages/shared/src/algorithms/dijkstra';
import { NetworkNode, NetworkEdge } from '../../packages/shared/src/types/index';

describe('Dijkstra Shortest Path Engine', () => {
  it('finds path in a simple linear chain A ➔ B ➔ C', () => {
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'A', role: 'gateway', x: 0, y: 0, radius: 5, online: true },
      { id: 'B', name: 'B', role: 'router', x: 2, y: 0, radius: 5, online: true },
      { id: 'C', name: 'C', role: 'endpoint', x: 4, y: 0, radius: 5, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: 'A<->B', sourceId: 'A', targetId: 'B', cost: 3.5, online: true },
      { id: 'B<->C', sourceId: 'B', targetId: 'C', cost: 4.5, online: true }
    ];

    const result = computeDijkstra(nodes, edges, 'A', 'C');
    expect(result.reachable).toBe(true);
    expect(result.pathNodeIds).toEqual(['A', 'B', 'C']);
    expect(result.pathEdgeIds).toEqual(['A<->B', 'B<->C']);
    expect(result.totalCost).toBe(8.0);
    expect(result.hopCount).toBe(2);
  });

  it('selects lowest accumulated cost in a weighted diamond topology', () => {
    // S -> A (cost 1) -> T (cost 10) = 11
    // S -> B (cost 5) -> T (cost 2) = 7 (SHORTEST)
    const nodes: NetworkNode[] = [
      { id: 'S', name: 'Source', role: 'gateway', x: 0, y: 0, radius: 5, online: true },
      { id: 'A', name: 'Upper', role: 'router', x: 3, y: 2, radius: 5, online: true },
      { id: 'B', name: 'Lower', role: 'router', x: 3, y: -2, radius: 5, online: true },
      { id: 'T', name: 'Target', role: 'endpoint', x: 6, y: 0, radius: 5, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: 'S<->A', sourceId: 'S', targetId: 'A', cost: 1, online: true },
      { id: 'A<->T', sourceId: 'A', targetId: 'T', cost: 10, online: true },
      { id: 'S<->B', sourceId: 'S', targetId: 'B', cost: 5, online: true },
      { id: 'B<->T', sourceId: 'B', targetId: 'T', cost: 2, online: true }
    ];

    const result = computeDijkstra(nodes, edges, 'S', 'T');
    expect(result.reachable).toBe(true);
    expect(result.pathNodeIds).toEqual(['S', 'B', 'T']);
    expect(result.totalCost).toBe(7);
    expect(result.hopCount).toBe(2);
  });

  it('handles deterministic tie-breaking on equal-cost paths', () => {
    // Path 1: S -> A -> T (cost 2 + 2 = 4)
    // Path 2: S -> B -> T (cost 2 + 2 = 4)
    // Deterministic tie-breaker should consistently select lower ID predecessor 'A'
    const nodes: NetworkNode[] = [
      { id: 'S', name: 'Source', role: 'gateway', x: 0, y: 0, radius: 5, online: true },
      { id: 'A', name: 'A', role: 'router', x: 2, y: 2, radius: 5, online: true },
      { id: 'B', name: 'B', role: 'router', x: 2, y: -2, radius: 5, online: true },
      { id: 'T', name: 'Target', role: 'endpoint', x: 4, y: 0, radius: 5, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: 'S<->A', sourceId: 'S', targetId: 'A', cost: 2, online: true },
      { id: 'A<->T', sourceId: 'A', targetId: 'T', cost: 2, online: true },
      { id: 'S<->B', sourceId: 'S', targetId: 'B', cost: 2, online: true },
      { id: 'B<->T', sourceId: 'B', targetId: 'T', cost: 2, online: true }
    ];

    const result = computeDijkstra(nodes, edges, 'S', 'T');
    expect(result.reachable).toBe(true);
    expect(result.totalCost).toBe(4);
    expect(result.pathNodeIds).toEqual(['S', 'A', 'T']);
  });

  it('detects unreachable target in disconnected topology without hanging', () => {
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'A', role: 'gateway', x: 0, y: 0, radius: 5, online: true },
      { id: 'B', name: 'B', role: 'router', x: 2, y: 0, radius: 5, online: true },
      { id: 'X', name: 'X', role: 'endpoint', x: 20, y: 0, radius: 5, online: true } // Disconnected island
    ];
    const edges: NetworkEdge[] = [
      { id: 'A<->B', sourceId: 'A', targetId: 'B', cost: 2, online: true }
    ];

    const result = computeDijkstra(nodes, edges, 'A', 'X');
    expect(result.reachable).toBe(false);
    expect(result.pathNodeIds).toHaveLength(0);
    expect(result.totalCost).toBe(Infinity);
    expect(result.explanation[0]).toContain('No route available');
  });

  it('gracefully handles invalid endpoint IDs and offline nodes', () => {
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'A', role: 'gateway', x: 0, y: 0, radius: 5, online: true },
      { id: 'B', name: 'B', role: 'endpoint', x: 2, y: 0, radius: 5, online: false } // OFFLINE
    ];
    const edges: NetworkEdge[] = [
      { id: 'A<->B', sourceId: 'A', targetId: 'B', cost: 2, online: true }
    ];

    // Target is offline
    const resOffline = computeDijkstra(nodes, edges, 'A', 'B');
    expect(resOffline.reachable).toBe(false);

    // Non-existent ID
    const resMissing = computeDijkstra(nodes, edges, 'A', 'UNKNOWN_ID');
    expect(resMissing.reachable).toBe(false);
  });

  it('re-routes when a intermediate route edge fails', () => {
    const nodes: NetworkNode[] = [
      { id: 'S', name: 'S', role: 'gateway', x: 0, y: 0, radius: 5, online: true },
      { id: 'A', name: 'A', role: 'router', x: 2, y: 2, radius: 5, online: true },
      { id: 'B', name: 'B', role: 'router', x: 2, y: -2, radius: 5, online: true },
      { id: 'T', name: 'T', role: 'endpoint', x: 4, y: 0, radius: 5, online: true }
    ];
    // S-A-T is primary (cost 1+1=2), S-B-T is backup (cost 3+3=6)
    const edgesWithFail: NetworkEdge[] = [
      { id: 'S<->A', sourceId: 'S', targetId: 'A', cost: 1, online: false }, // FAILED LINK
      { id: 'A<->T', sourceId: 'A', targetId: 'T', cost: 1, online: true },
      { id: 'S<->B', sourceId: 'S', targetId: 'B', cost: 3, online: true },
      { id: 'B<->T', sourceId: 'B', targetId: 'T', cost: 3, online: true }
    ];

    const result = computeDijkstra(nodes, edgesWithFail, 'S', 'T');
    expect(result.reachable).toBe(true);
    expect(result.pathNodeIds).toEqual(['S', 'B', 'T']);
    expect(result.totalCost).toBe(6);
  });

  it('regression: does NOT delete non-route edges or label them as STP blocked', () => {
    const nodes: NetworkNode[] = [
      { id: 'S', name: 'S', role: 'gateway', x: 0, y: 0, radius: 5, online: true },
      { id: 'A', name: 'A', role: 'router', x: 2, y: 0, radius: 5, online: true },
      { id: 'B', name: 'B', role: 'router', x: 4, y: 0, radius: 5, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: 'S<->A', sourceId: 'S', targetId: 'A', cost: 1, online: true },
      { id: 'S<->B', sourceId: 'S', targetId: 'B', cost: 10, online: true }, // Longer alternate edge
      { id: 'A<->B', sourceId: 'A', targetId: 'B', cost: 1, online: true }
    ];

    const result = computeDijkstra(nodes, edges, 'S', 'B');
    // Shortest route is S -> A -> B (cost 2)
    expect(result.pathNodeIds).toEqual(['S', 'A', 'B']);
    expect(result.pathEdgeIds).toEqual(['S<->A', 'A<->B']);

    // Edge S<->B is NOT in pathEdgeIds, but it remains a valid candidate edge (not deleted)
    expect(result.pathEdgeIds).not.toContain('S<->B');
  });

  it('records detailed relaxation steps and alternative path comparisons', () => {
    const nodes: NetworkNode[] = [
      { id: 'S', name: 'Source', role: 'gateway', x: 0, y: 0, radius: 5, online: true },
      { id: 'A', name: 'Upper', role: 'router', x: 3, y: 2, radius: 5, online: true },
      { id: 'B', name: 'Lower', role: 'router', x: 3, y: -2, radius: 5, online: true },
      { id: 'T', name: 'Target', role: 'endpoint', x: 6, y: 0, radius: 5, online: true }
    ];
    const edges: NetworkEdge[] = [
      { id: 'S<->A', sourceId: 'S', targetId: 'A', cost: 2, online: true },
      { id: 'A<->T', sourceId: 'A', targetId: 'T', cost: 8, online: true }, // Total S-A-T = 10
      { id: 'S<->B', sourceId: 'S', targetId: 'B', cost: 4, online: true },
      { id: 'B<->T', sourceId: 'B', targetId: 'T', cost: 3, online: true }  // Total S-B-T = 7 (CHOSEN)
    ];

    const result = computeDijkstra(nodes, edges, 'S', 'T');
    expect(result.reachable).toBe(true);
    expect(result.pathNodeIds).toEqual(['S', 'B', 'T']);
    expect(result.totalCost).toBe(7);

    // Verify steps recorded
    expect(result.steps.length).toBeGreaterThan(0);
    const step1 = result.steps[0];
    expect(step1.settledNodeId).toBe('S');
    expect(step1.settledCost).toBe(0);

    // Verify alternative paths evaluated
    expect(result.alternativePaths.length).toBe(2);
    const chosen = result.alternativePaths.find(p => p.status === 'chosen');
    const suboptimal = result.alternativePaths.find(p => p.status === 'suboptimal');

    expect(chosen).toBeDefined();
    expect(chosen?.pathNodeIds).toEqual(['S', 'B', 'T']);
    expect(chosen?.totalCost).toBe(7);

    expect(suboptimal).toBeDefined();
    expect(suboptimal?.pathNodeIds).toEqual(['S', 'A', 'T']);
    expect(suboptimal?.totalCost).toBe(10);
    expect(suboptimal?.costDifference).toBe(3);
    expect(suboptimal?.rejectionReason).toContain('Suboptimal path rejected');
  });

  it('correctly handles isolated source with no peers in range', () => {
    const nodes: NetworkNode[] = [
      { id: 'ep_1', name: 'Client-Host-1', role: 'endpoint', x: -20, y: -20, radius: 4, online: true },
      { id: 'r_1', name: 'Router-Alpha', role: 'router', x: 0, y: 0, radius: 5, online: true },
      { id: 'gw_1', name: 'Server-Base', role: 'gateway', x: 2, y: 0, radius: 5, online: true }
    ];
    // No edges connect to ep_1 because it is far out of range
    const edges: NetworkEdge[] = [
      { id: 'r_1<->gw_1', sourceId: 'r_1', targetId: 'gw_1', cost: 2, online: true }
    ];

    const result = computeDijkstra(nodes, edges, 'ep_1', 'gw_1');
    expect(result.reachable).toBe(false);
    expect(result.pathNodeIds).toEqual([]);
    expect(result.pathEdgeIds).toEqual([]);
    expect(result.totalCost).toBe(Infinity);
    expect(result.explanation.some(e => e.includes('no peer nodes within wireless range'))).toBe(true);
  });
});

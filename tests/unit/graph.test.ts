/**
 * @file tests/unit/graph.test.ts
 * @description Unit tests for planar proximity candidate graph generation,
 * distance formulas, boundaries, offline nodes, duplicate edge prevention,
 * and graph metric calculations.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateEdgeCost,
  buildCandidateGraph,
  findConnectedComponents,
  calculateGraphMetrics
} from '../../packages/shared/src/graph/candidate';
import { NetworkNode, NetworkEdge } from '../../packages/shared/src/types/index';

describe('Planar Proximity and Graph Geometry', () => {
  it('correctly calculates Euclidean distance between coordinates', () => {
    // 3-4-5 right triangle
    const d1 = calculateDistance(0, 0, 3, 4);
    expect(d1).toBeCloseTo(5.0, 4);

    // Same point
    const d2 = calculateDistance(2.5, -3.5, 2.5, -3.5);
    expect(d2).toBe(0);

    // Negative coordinates
    const d3 = calculateDistance(-5, -5, 5, 5);
    expect(d3).toBeCloseTo(Math.sqrt(200), 4);
  });

  it('forms candidate edge exactly at threshold d <= rA + rB', () => {
    const nodeA: NetworkNode = { id: 'A', name: 'Node A', role: 'bridge', x: 0, y: 0, radius: 3, online: true };
    const nodeB: NetworkNode = { id: 'B', name: 'Node B', role: 'bridge', x: 5, y: 0, radius: 2, online: true };

    // Distance is 5. Sum of radii is 3 + 2 = 5. Exactly on threshold.
    const edgesAtThreshold = buildCandidateGraph([nodeA, nodeB], 'distance');
    expect(edgesAtThreshold).toHaveLength(1);
    expect(edgesAtThreshold[0].id).toBe('edge_A-B');
    expect(edgesAtThreshold[0].cost).toBeCloseTo(5.0, 1);

    // Move Node B slightly further: x = 5.1 -> distance 5.1 > 5.0 -> link broken
    const nodeB_Far: NetworkNode = { ...nodeB, x: 5.1 };
    const edgesOutside = buildCandidateGraph([nodeA, nodeB_Far], 'distance');
    expect(edgesOutside).toHaveLength(0);

    // Move Node B slightly closer: x = 4.9 -> distance 4.9 <= 5.0 -> link intact
    const nodeB_Near: NetworkNode = { ...nodeB, x: 4.9 };
    const edgesInside = buildCandidateGraph([nodeA, nodeB_Near], 'distance');
    expect(edgesInside).toHaveLength(1);
  });

  it('prevents duplicate edges and orders edge keys canonically', () => {
    const nodes: NetworkNode[] = [
      { id: 'node_2', name: 'Two', role: 'bridge', x: 0, y: 0, radius: 5, online: true },
      { id: 'node_1', name: 'One', role: 'bridge', x: 2, y: 0, radius: 5, online: true }
    ];

    const edges = buildCandidateGraph(nodes, 'distance');
    expect(edges).toHaveLength(1);
    // Canonical key sorts node_1 before node_2
    expect(edges[0].id).toBe('edge_node_1-node_2');
    expect(edges[0].sourceId).toBe('node_1');
    expect(edges[0].targetId).toBe('node_2');
  });

  it('does not create edges for offline nodes', () => {
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'Node A', role: 'bridge', x: 0, y: 0, radius: 5, online: true },
      { id: 'B', name: 'Node B', role: 'bridge', x: 2, y: 0, radius: 5, online: false }, // OFFLINE
      { id: 'C', name: 'Node C', role: 'bridge', x: 4, y: 0, radius: 5, online: true }
    ];

    const edges = buildCandidateGraph(nodes, 'distance');
    // Only A and C are online, distance is 4 <= 5 + 5 = 10
    expect(edges).toHaveLength(1);
    expect(edges[0].id).toBe('edge_A-C');
  });

  it('calculates edge cost models correctly (distance, capacity, manual)', () => {
    const nA: NetworkNode = { id: 'A', name: 'A', role: 'bridge', x: 0, y: 0, radius: 10, online: true };
    const nB: NetworkNode = { id: 'B', name: 'B', role: 'bridge', x: 10, y: 0, radius: 10, online: true };

    const costDist = calculateEdgeCost(nA, nB, 'distance');
    expect(costDist).toBe(10); // direct distance

    const costCap = calculateEdgeCost(nA, nB, 'capacity');
    expect(costCap).toBeGreaterThan(0);

    const costManual = calculateEdgeCost(nA, nB, 'manual', 42);
    expect(costManual).toBe(42);
  });

  it('finds connected components correctly in partitioned topologies', () => {
    const nodes: NetworkNode[] = [
      { id: 'A1', name: 'A1', role: 'bridge', x: 0, y: 0, radius: 2, online: true },
      { id: 'A2', name: 'A2', role: 'bridge', x: 1, y: 0, radius: 2, online: true },
      { id: 'B1', name: 'B1', role: 'bridge', x: 20, y: 0, radius: 2, online: true },
      { id: 'B2', name: 'B2', role: 'bridge', x: 21, y: 0, radius: 2, online: true }
    ];

    const edges = buildCandidateGraph(nodes, 'distance');
    const components = findConnectedComponents(nodes, edges);

    expect(components).toHaveLength(2);
    expect(components[0].sort()).toEqual(['A1', 'A2']);
    expect(components[1].sort()).toEqual(['B1', 'B2']);
  });

  it('calculates graph metrics accurately without hardcoded values', () => {
    const nodes: NetworkNode[] = [
      { id: 'A', name: 'A', role: 'bridge', x: 0, y: 0, radius: 3, online: true },
      { id: 'B', name: 'B', role: 'bridge', x: 2, y: 0, radius: 3, online: true },
      { id: 'C', name: 'C', role: 'bridge', x: 4, y: 0, radius: 3, online: true }
    ];

    const edges = buildCandidateGraph(nodes, 'distance');
    const metrics = calculateGraphMetrics(nodes, edges, 2);

    expect(metrics.nodeCount).toBe(3);
    expect(metrics.onlineNodes).toBe(3);
    expect(metrics.connectedComponents).toBe(1);
    expect(metrics.forwardingEdges).toBe(2);
  });
});

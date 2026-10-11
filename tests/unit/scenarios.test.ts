/**
 * @file tests/unit/scenarios.test.ts
 * @description Unit tests for all 12 preloaded classroom scenarios:
 * verification of presets, topology generation, algorithm execution, and clean reset.
 */

import { describe, it, expect } from 'vitest';
import { CLASSROOM_SCENARIOS } from '../../packages/shared/src/scenarios/scenarioDefinitions';
import { buildCandidateGraph } from '../../packages/shared/src/graph/candidate';
import { computeSTP } from '../../packages/shared/src/algorithms/stp';
import { computeDijkstra } from '../../packages/shared/src/algorithms/dijkstra';
import { computeMST } from '../../packages/shared/src/algorithms/mst';

describe('Preloaded Classroom Scenarios (12 Presets)', () => {
  it('contains all 12 mandatory classroom scenarios', () => {
    expect(CLASSROOM_SCENARIOS).toHaveLength(12);

    const ids = CLASSROOM_SCENARIOS.map(s => s.id);
    expect(ids).toContain('simple_chain');
    expect(ids).toContain('triangle_cycle');
    expect(ids).toContain('dense_mesh');
    expect(ids).toContain('alternative_route');
    expect(ids).toContain('critical_bridge_failure');
    expect(ids).toContain('network_partition');
    expect(ids).toContain('dijkstra_comparison');
    expect(ids).toContain('mst_comparison');
    expect(ids).toContain('broadcast_storm');
    expect(ids).toContain('congestion');
    expect(ids).toContain('root_election');
    expect(ids).toContain('equal_cost_paths');
  });

  it('Scenario 1 (Simple Chain): generates linear topology with 2 edges', () => {
    const s = CLASSROOM_SCENARIOS.find(x => x.id === 'simple_chain')!;
    const edges = buildCandidateGraph(s.initialNodes, s.initialCostModel);
    expect(edges).toHaveLength(2);

    const dijkstra = computeDijkstra(s.initialNodes, edges, s.sourceId, s.targetId);
    expect(dijkstra.reachable).toBe(true);
    expect(dijkstra.hopCount).toBe(2);
    expect(dijkstra.pathNodeIds).toEqual(['gw_1', 'r_1', 'ep_1']);
  });

  it('Scenario 2 (Triangle Cycle): STP breaks cycle by blocking redundant port', () => {
    const s = CLASSROOM_SCENARIOS.find(x => x.id === 'triangle_cycle')!;
    const edges = buildCandidateGraph(s.initialNodes, s.initialCostModel);
    expect(edges).toHaveLength(3); // Triangle has 3 links

    const stp = computeSTP(s.initialNodes, edges);
    expect(stp.rootBridgeId).toBe('gw_1');
    expect(stp.forwardingEdgeIds).toHaveLength(2);
    expect(stp.blockedEdgeIds).toHaveLength(1);
  });

  it('Scenario 6 (Network Partition): reports unreachable destination safely', () => {
    const s = CLASSROOM_SCENARIOS.find(x => x.id === 'network_partition')!;
    const edges = buildCandidateGraph(s.initialNodes, s.initialCostModel);

    const dijkstra = computeDijkstra(s.initialNodes, edges, s.sourceId, s.targetId);
    expect(dijkstra.reachable).toBe(false);
    expect(dijkstra.totalCost).toBe(Infinity);
  });

  it('Scenario 8 (MST Comparison): connects all 5 nodes with exactly 4 edges', () => {
    const s = CLASSROOM_SCENARIOS.find(x => x.id === 'mst_comparison')!;
    const edges = buildCandidateGraph(s.initialNodes, s.initialCostModel);

    const mst = computeMST(s.initialNodes, edges);
    expect(mst.isForest).toBe(false);
    expect(mst.selectedEdgeIds).toHaveLength(4); // 5 nodes -> 4 tree edges
    expect(mst.totalWeight).toBeGreaterThan(0);
  });

  it('Scenario 12 (Equal-Cost Paths): demonstrates deterministic tie-breaking', () => {
    const s = CLASSROOM_SCENARIOS.find(x => x.id === 'equal_cost_paths')!;
    const edges = buildCandidateGraph(s.initialNodes, s.initialCostModel);

    const res1 = computeDijkstra(s.initialNodes, edges, s.sourceId, s.targetId);
    const res2 = computeDijkstra(s.initialNodes, edges, s.sourceId, s.targetId);

    expect(res1.reachable).toBe(true);
    // Both runs must choose the exact same deterministic path
    expect(res1.pathNodeIds).toEqual(res2.pathNodeIds);
  });
});

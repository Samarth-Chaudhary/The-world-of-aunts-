/**
 * @file algorithms/dijkstra.ts
 * @description Dijkstra Shortest Path algorithm with actual step-by-step mathematical logic,
 * greedy relaxation trace, deterministic tie-breaking, and alternative path comparison.
 * 
 * CORE CONTRACT:
 * - Pure function independent of Three.js, React, or DOM.
 * - Follows Dijkstra's exact mathematical logic:
 *   1. Initialize dist[source] = 0, dist[v] = Infinity for all v != source.
 *   2. Unvisited set Q contains all active nodes. Visited set S is empty.
 *   3. Greedily extract vertex u in Q with minimum tentative distance dist[u].
 *   4. For each neighbor v of u, relax edge (u, v): if dist[u] + cost(u, v) < dist[v], update dist[v] and prev[v].
 *   5. Final path is reconstructed by backtracking from target to source via predecessors.
 *   6. Compares alternative simple paths and records mathematical justifications for why they were rejected.
 */

import {
  NetworkNode,
  NetworkEdge,
  DijkstraResult,
  DijkstraStep,
  DijkstraRelaxationStep,
  DijkstraAlternativePath
} from '../types/index.js';

export function computeDijkstra(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  sourceId: string,
  targetId: string,
  topologyRevision = 1
): DijkstraResult {
  const explanation: string[] = [];
  const activeNodes = new Set(nodes.filter(n => n.online).map(n => n.id));
  const activeEdges = edges.filter(
    e => e.online && activeNodes.has(e.sourceId) && activeNodes.has(e.targetId)
  );

  // Validation: Endpoints must exist and be online
  if (!activeNodes.has(sourceId) || !activeNodes.has(targetId)) {
    const reason = !activeNodes.has(sourceId)
      ? `Source node '${sourceId}' is offline or does not exist.`
      : `Target node '${targetId}' is offline or does not exist.`;
    explanation.push(`Dijkstra Route Calculation Aborted: ${reason}`);
    return {
      mode: 'DIJKSTRA',
      sourceId,
      targetId,
      pathNodeIds: [],
      pathEdgeIds: [],
      totalCost: Infinity,
      hopCount: 0,
      reachable: false,
      explanation,
      allDistances: {},
      predecessors: {},
      steps: [],
      alternativePaths: [],
      topologyRevision
    };
  }

  // Same node trivial route
  if (sourceId === targetId) {
    explanation.push(`Source and target are identical node '${sourceId}'. Path cost is 0.`);
    return {
      mode: 'DIJKSTRA',
      sourceId,
      targetId,
      pathNodeIds: [sourceId],
      pathEdgeIds: [],
      totalCost: 0,
      hopCount: 0,
      reachable: true,
      explanation,
      allDistances: { [sourceId]: 0 },
      predecessors: { [sourceId]: null },
      steps: [
        {
          stepNumber: 1,
          settledNodeId: sourceId,
          settledCost: 0,
          unvisitedNodeIds: [],
          visitedNodeIds: [sourceId],
          relaxations: [],
          tentativeDistances: { [sourceId]: 0 },
          predecessors: { [sourceId]: null }
        }
      ],
      alternativePaths: [
        {
          pathNodeIds: [sourceId],
          totalCost: 0,
          hopCount: 0,
          status: 'chosen',
          costDifference: 0,
          rejectionReason: 'Trivial self-loop route.'
        }
      ],
      topologyRevision
    };
  }

  // Build Adjacency List
  const adj = new Map<string, Array<{ neighborId: string; edge: NetworkEdge }>>();
  for (const id of activeNodes) {
    adj.set(id, []);
  }

  for (const edge of activeEdges) {
    adj.get(edge.sourceId)?.push({ neighborId: edge.targetId, edge });
    adj.get(edge.targetId)?.push({ neighborId: edge.sourceId, edge });
  }

  // Sort adjacency list by neighbor ID for deterministic execution
  for (const neighbors of adj.values()) {
    neighbors.sort((a, b) => a.neighborId.localeCompare(b.neighborId));
  }

  // Classical Dijkstra Data Structures
  const dist: Record<string, number> = {};
  const prevMap = new Map<string, { prevNodeId: string; edgeId: string }>();
  const predecessors: Record<string, string | null> = {};

  for (const id of activeNodes) {
    dist[id] = Infinity;
    predecessors[id] = null;
  }
  dist[sourceId] = 0;

  const unvisited = new Set<string>(activeNodes);
  const visited = new Set<string>();
  const steps: DijkstraStep[] = [];
  let stepNumber = 1;

  // Main Greedy Settlement Loop
  while (unvisited.size > 0) {
    // 1. Greedily find unvisited vertex with minimum tentative distance
    let currentMinNode: string | null = null;
    let minDistance = Infinity;

    for (const node of unvisited) {
      const d = dist[node];
      if (d < minDistance) {
        minDistance = d;
        currentMinNode = node;
      } else if (d === minDistance && currentMinNode !== null) {
        // Deterministic tie-breaker
        if (node.localeCompare(currentMinNode) < 0) {
          currentMinNode = node;
        }
      }
    }

    // If smallest tentative distance is Infinity, remaining unvisited vertices are disconnected
    if (currentMinNode === null || minDistance === Infinity) {
      break;
    }

    const u = currentMinNode;
    unvisited.delete(u);
    visited.add(u);

    const relaxations: DijkstraRelaxationStep[] = [];

    // 2. Relax all outgoing candidate edges from u
    for (const { neighborId: v, edge } of adj.get(u) || []) {
      const edgeWeight = Math.max(0, edge.cost);
      const priorDist = dist[v];

      if (visited.has(v)) {
        relaxations.push({
          neighborId: v,
          edgeId: edge.id,
          edgeCost: edgeWeight,
          priorDistance: priorDist,
          newCalculatedDistance: minDistance + edgeWeight,
          action: 'rejected_already_visited',
          reason: `Node '${v}' has already been settled with finalized optimal cost ${priorDist.toFixed(1)}.`
        });
        continue;
      }

      const calculatedDist = minDistance + edgeWeight;

      if (calculatedDist < priorDist) {
        // Successful Relaxation
        dist[v] = calculatedDist;
        prevMap.set(v, { prevNodeId: u, edgeId: edge.id });
        predecessors[v] = u;

        relaxations.push({
          neighborId: v,
          edgeId: edge.id,
          edgeCost: edgeWeight,
          priorDistance: priorDist,
          newCalculatedDistance: calculatedDist,
          action: 'relaxed',
          reason: `Relaxed: Path via '${u}' (${minDistance.toFixed(1)} + ${edgeWeight.toFixed(1)} = ${calculatedDist.toFixed(1)}) improves upon prior distance (${priorDist === Infinity ? '∞' : priorDist.toFixed(1)}).`
        });
      } else if (calculatedDist === priorDist) {
        // Tie breaker on equal distance
        const existing = prevMap.get(v);
        if (existing && u.localeCompare(existing.prevNodeId) < 0) {
          prevMap.set(v, { prevNodeId: u, edgeId: edge.id });
          predecessors[v] = u;
          relaxations.push({
            neighborId: v,
            edgeId: edge.id,
            edgeCost: edgeWeight,
            priorDistance: priorDist,
            newCalculatedDistance: calculatedDist,
            action: 'tied_tiebreaker_swapped',
            reason: `Equal cost ${calculatedDist.toFixed(1)}; deterministic tie-breaker preferred lower predecessor ID '${u}' over '${existing.prevNodeId}'.`
          });
        } else {
          relaxations.push({
            neighborId: v,
            edgeId: edge.id,
            edgeCost: edgeWeight,
            priorDistance: priorDist,
            newCalculatedDistance: calculatedDist,
            action: 'tied_tiebreaker_kept',
            reason: `Equal cost ${calculatedDist.toFixed(1)}; existing predecessor '${existing?.prevNodeId}' retained over '${u}'.`
          });
        }
      } else {
        // Candidate cost is worse
        relaxations.push({
          neighborId: v,
          edgeId: edge.id,
          edgeCost: edgeWeight,
          priorDistance: priorDist,
          newCalculatedDistance: calculatedDist,
          action: 'rejected_higher_cost',
          reason: `Rejected: Candidate path via '${u}' (${calculatedDist.toFixed(1)}) is higher than existing best distance (${priorDist.toFixed(1)}).`
        });
      }
    }

    steps.push({
      stepNumber: stepNumber++,
      settledNodeId: u,
      settledCost: minDistance,
      unvisitedNodeIds: Array.from(unvisited),
      visitedNodeIds: Array.from(visited),
      relaxations,
      tentativeDistances: { ...dist },
      predecessors: { ...predecessors }
    });
  }

  const reachable = dist[targetId] < Infinity;
  if (!reachable) {
    const sourceDegree = adj.get(sourceId)?.length ?? 0;
    if (sourceDegree === 0) {
      explanation.push(
        `Source node '${sourceId}' has no peer nodes within wireless range. Wireless transmission range is exhausted; no data flow can occur.`
      );
    } else {
      explanation.push(
        `No route available: Target node '${targetId}' is disconnected from source '${sourceId}' in the active topology.`
      );
    }
    explanation.push(
      `Dijkstra settled all ${visited.size} reachable nodes; remaining nodes have tentative distance of ∞.`
    );
    return {
      mode: 'DIJKSTRA',
      sourceId,
      targetId,
      pathNodeIds: [],
      pathEdgeIds: [],
      totalCost: Infinity,
      hopCount: 0,
      reachable: false,
      explanation,
      allDistances: dist,
      predecessors,
      steps,
      alternativePaths: [],
      topologyRevision
    };
  }

  // 3. Reconstruct Shortest Path by Backtracking from targetId to sourceId
  const pathNodeIds: string[] = [];
  const pathEdgeIds: string[] = [];
  let curr = targetId;

  while (curr !== sourceId) {
    pathNodeIds.unshift(curr);
    const p = prevMap.get(curr);
    if (!p) break;
    pathEdgeIds.unshift(p.edgeId);
    curr = p.prevNodeId;
  }
  pathNodeIds.unshift(sourceId);

  const hopCount = pathEdgeIds.length;
  const optimalCost = dist[targetId];

  // 4. Explore Alternative Simple Paths via DFS to explain why they were rejected
  const alternativePaths: DijkstraAlternativePath[] = [];
  const discoveredPaths: Array<{ nodes: string[]; cost: number; edges: string[] }> = [];

  function dfsFindPaths(
    current: string,
    currentPath: string[],
    currentEdges: string[],
    accumulatedCost: number,
    visitedInDfs: Set<string>
  ) {
    if (discoveredPaths.length >= 10) return;
    if (current === targetId) {
      discoveredPaths.push({
        nodes: [...currentPath],
        cost: accumulatedCost,
        edges: [...currentEdges]
      });
      return;
    }

    for (const { neighborId, edge } of adj.get(current) || []) {
      if (!visitedInDfs.has(neighborId)) {
        visitedInDfs.add(neighborId);
        currentPath.push(neighborId);
        currentEdges.push(edge.id);

        dfsFindPaths(
          neighborId,
          currentPath,
          currentEdges,
          accumulatedCost + Math.max(0, edge.cost),
          visitedInDfs
        );

        currentPath.pop();
        currentEdges.pop();
        visitedInDfs.delete(neighborId);
      }
    }
  }

  const dfsVisited = new Set<string>([sourceId]);
  dfsFindPaths(sourceId, [sourceId], [], 0, dfsVisited);

  // Sort alternative paths by cost
  discoveredPaths.sort((a, b) => a.cost - b.cost || a.nodes.length - b.nodes.length);

  for (const alt of discoveredPaths) {
    const isOptimal =
      alt.nodes.length === pathNodeIds.length &&
      alt.nodes.every((n, i) => n === pathNodeIds[i]);

    if (isOptimal) {
      alternativePaths.push({
        pathNodeIds: alt.nodes,
        totalCost: alt.cost,
        hopCount: alt.nodes.length - 1,
        status: 'chosen',
        costDifference: 0,
        rejectionReason: 'CHOSEN: Mathematically proven shortest route with lowest cumulative cost.'
      });
    } else {
      const costDiff = alt.cost - optimalCost;
      const reason =
        costDiff > 0
          ? `Suboptimal path rejected: cumulative cost of ${alt.cost.toFixed(1)} is higher by +${costDiff.toFixed(1)} than the chosen path (${optimalCost.toFixed(1)}).`
          : `Equal cost route (${alt.cost.toFixed(1)}) rejected by deterministic tie-breaker in favor of lexicographically lower predecessor.`;

      alternativePaths.push({
        pathNodeIds: alt.nodes,
        totalCost: alt.cost,
        hopCount: alt.nodes.length - 1,
        status: 'suboptimal',
        costDifference: costDiff,
        rejectionReason: reason
      });
    }
  }

  explanation.push(
    `Optimal Path Found: ${pathNodeIds.join(' ➔ ')} (Total Cost: ${optimalCost.toFixed(1)}, Hops: ${hopCount}).`
  );
  explanation.push(
    `Why this path was chosen: Dijkstra's greedy invariant settled each hop with minimal cumulative distance. All alternative routes required a higher accumulated cost.`
  );
  if (alternativePaths.length > 1) {
    explanation.push(
      `Compared ${alternativePaths.length} candidate paths; ${alternativePaths.length - 1} competing route(s) were rejected due to higher link costs.`
    );
  }

  return {
    mode: 'DIJKSTRA',
    sourceId,
    targetId,
    pathNodeIds,
    pathEdgeIds,
    totalCost: optimalCost,
    hopCount,
    reachable: true,
    explanation,
    allDistances: dist,
    predecessors,
    steps,
    alternativePaths,
    topologyRevision
  };
}

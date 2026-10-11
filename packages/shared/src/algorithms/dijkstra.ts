/**
 * @file algorithms/dijkstra.ts
 * @description Dijkstra Shortest Path algorithm with deterministic tie-breaking.
 * 
 * CORE CONTRACT:
 * - Pure function independent of Three.js or DOM.
 * - Handles invalid endpoints, disconnected components, and failed nodes.
 * - Non-route edges remain valid candidate links; NEVER label them as STP blocked ports.
 */

import { NetworkNode, NetworkEdge, DijkstraResult } from '../types/index.js';

export function computeDijkstra(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  sourceId: string,
  targetId: string,
  topologyRevision = 1
): DijkstraResult {
  const explanation: string[] = [];
  const activeNodes = new Set(nodes.filter(n => n.online).map(n => n.id));
  const activeEdges = edges.filter(e => e.online && activeNodes.has(e.sourceId) && activeNodes.has(e.targetId));

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

  // Distances and predecessors
  const dist: Record<string, number> = {};
  const prev = new Map<string, { prevNodeId: string; edgeId: string }>();

  for (const id of activeNodes) {
    dist[id] = Infinity;
  }
  dist[sourceId] = 0;

  const pq: Array<{ id: string; cost: number }> = [{ id: sourceId, cost: 0 }];

  while (pq.length > 0) {
    // Deterministic priority queue sort: lowest cost, tie-break by node ID
    pq.sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
    const { id: u, cost: d } = pq.shift()!;

    if (d > dist[u]) continue;
    if (u === targetId) break; // Reached target with shortest distance

    for (const { neighborId: v, edge } of adj.get(u) || []) {
      const weight = Math.max(0, edge.cost);
      const newDist = d + weight;

      if (newDist < dist[v]) {
        dist[v] = newDist;
        prev.set(v, { prevNodeId: u, edgeId: edge.id });
        pq.push({ id: v, cost: newDist });
      } else if (newDist === dist[v]) {
        // Deterministic tie-breaker: prefer path through lower predecessor ID
        const existing = prev.get(v);
        if (existing && u.localeCompare(existing.prevNodeId) < 0) {
          prev.set(v, { prevNodeId: u, edgeId: edge.id });
        }
      }
    }
  }

  const reachable = dist[targetId] < Infinity;
  if (!reachable) {
    explanation.push(`No route available: '${targetId}' is disconnected from '${sourceId}' in the current physical topology.`);
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
      topologyRevision
    };
  }

  // Reconstruct path
  const pathNodeIds: string[] = [];
  const pathEdgeIds: string[] = [];
  let curr = targetId;

  while (curr !== sourceId) {
    pathNodeIds.unshift(curr);
    const p = prev.get(curr);
    if (!p) break;
    pathEdgeIds.unshift(p.edgeId);
    curr = p.prevNodeId;
  }
  pathNodeIds.unshift(sourceId);

  const hopCount = pathEdgeIds.length;
  explanation.push(`Shortest Path Found: ${pathNodeIds.join(' ➔ ')} (Total Cost: ${dist[targetId]}, Hops: ${hopCount}).`);
  explanation.push(`Dijkstra evaluates accumulated end-to-end path cost; alternate links remain unselected but viable.`);

  return {
    mode: 'DIJKSTRA',
    sourceId,
    targetId,
    pathNodeIds,
    pathEdgeIds,
    totalCost: dist[targetId],
    hopCount,
    reachable: true,
    explanation,
    allDistances: dist,
    topologyRevision
  };
}

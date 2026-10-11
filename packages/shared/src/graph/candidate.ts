/**
 * @file graph/candidate.ts
 * @description Pure functions for deterministic candidate-edge generation,
 * distance metrics, and graph components.
 * 
 * STRICT RULE: Completely independent of React, Three.js, DOM, and Sockets.
 */

import { NetworkNode, NetworkEdge, CostModel, GraphMetrics } from '../types/index.js';

/**
 * Euclidean distance between two nodes in 2D simulation plane
 * Formula: d(A,B) = sqrt((xA - xB)^2 + (yA - yB)^2)
 */
export function calculateDistance(
  a: { x: number; y: number } | number,
  b: { x: number; y: number } | number,
  x2?: number,
  y2?: number
): number {
  if (typeof a === 'number' && typeof b === 'number' && typeof x2 === 'number' && typeof y2 === 'number') {
    const dx = a - x2;
    const dy = b - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }
  const p1 = a as { x: number; y: number };
  const p2 = b as { x: number; y: number };
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Computes edge cost according to active cost model
 */
export function calculateEdgeCost(
  arg1: number | { x: number; y: number },
  arg2: CostModel | { x: number; y: number },
  arg3?: CostModel | number,
  arg4?: number
): number {
  let distance: number;
  let costModel: CostModel;
  let manualCost: number | undefined;

  if (typeof arg1 === 'number') {
    distance = arg1;
    costModel = arg2 as CostModel;
    manualCost = typeof arg3 === 'number' ? arg3 : undefined;
  } else {
    const p1 = arg1;
    const p2 = arg2 as { x: number; y: number };
    distance = calculateDistance(p1, p2);
    costModel = arg3 as CostModel;
    manualCost = arg4;
  }

  if (costModel === 'manual' && typeof manualCost === 'number') {
    return Math.max(1, Math.round(manualCost));
  }
  if (costModel === 'capacity') {
    if (distance <= 4) return 2;   // 10 Gbps tier -> cost 2
    if (distance <= 8) return 4;   // 1 Gbps tier -> cost 4
    if (distance <= 12) return 19; // 100 Mbps tier -> cost 19
    return 100;                    // 10 Mbps tier -> cost 100
  }
  // Distance-inspired simulated cost: 1 unit per distance rounded
  return Math.max(1, Math.round(distance));
}

/**
 * Builds candidate connectivity graph based on simulated proximity:
 * Candidate condition: distance(A, B) <= radius(A) + radius(B)
 * Both nodes must be online to form a candidate link.
 */
export function buildCandidateGraph(
  nodes: NetworkNode[],
  costModel: CostModel = 'distance',
  existingEdges: NetworkEdge[] = []
): NetworkEdge[] {
  const existingEdgeMap = new Map<string, NetworkEdge>();
  for (const edge of existingEdges) {
    const key = getCanonicalEdgeKey(edge.sourceId, edge.targetId);
    existingEdgeMap.set(key, edge);
  }

  const edges: NetworkEdge[] = [];
  const onlineNodes = nodes.filter(n => n.online);
  const n = onlineNodes.length;

  for (let i = 0; i < n; i++) {
    const a = onlineNodes[i];
    for (let j = i + 1; j < n; j++) {
      const b = onlineNodes[j];
      const dist = calculateDistance(a, b);
      const threshold = a.radius + b.radius;

      if (dist <= threshold) {
        const canonicalKey = getCanonicalEdgeKey(a.id, b.id);
        const existing = existingEdgeMap.get(canonicalKey);

        const edgeCost = existing?.manualCost !== undefined && costModel === 'manual'
          ? existing.manualCost
          : calculateEdgeCost(dist, costModel, existing?.manualCost);

        const isOnline = existing ? existing.online : true;

        edges.push({
          id: `edge_${canonicalKey}`,
          sourceId: a.id < b.id ? a.id : b.id,
          targetId: a.id < b.id ? b.id : a.id,
          cost: edgeCost,
          online: isOnline,
          manualCost: existing?.manualCost
        });
      }
    }
  }

  // Deterministic sorting by ID
  edges.sort((a, b) => a.id.localeCompare(b.id));
  return edges;
}

export function getCanonicalEdgeKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
}

/**
 * Find connected components using Breadth-First Search
 */
export function findConnectedComponents(nodes: NetworkNode[], edges: NetworkEdge[]): string[][] {
  const activeNodes = nodes.filter(n => n.online);
  const nodeIds = new Set(activeNodes.map(n => n.id));
  const adj = new Map<string, string[]>();

  for (const id of nodeIds) {
    adj.set(id, []);
  }

  for (const edge of edges) {
    if (edge.online && nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId)) {
      adj.get(edge.sourceId)?.push(edge.targetId);
      adj.get(edge.targetId)?.push(edge.sourceId);
    }
  }

  const visited = new Set<string>();
  const components: string[][] = [];

  for (const id of nodeIds) {
    if (!visited.has(id)) {
      const comp: string[] = [];
      const queue: string[] = [id];
      visited.add(id);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        comp.push(curr);
        for (const neighbor of adj.get(curr) || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      comp.sort();
      components.push(comp);
    }
  }

  components.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
  return components;
}

/**
 * Calculates global graph summary metrics
 */
export function calculateGraphMetrics(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  activeForwardingEdgesCount = 0
): GraphMetrics {
  const onlineNodes = nodes.filter(n => n.online);
  const onlineEdges = edges.filter(e => e.online);
  const components = findConnectedComponents(nodes, edges);

  const totalDegree = onlineEdges.length * 2;
  const meanDegree = onlineNodes.length > 0 ? totalDegree / onlineNodes.length : 0;

  const mean = Number(meanDegree.toFixed(2));
  return {
    nodeCount: nodes.length,
    onlineNodeCount: onlineNodes.length,
    edgeCount: onlineEdges.length,
    connectedComponentCount: components.length,
    meanDegree: mean,
    activeForwardingEdgesCount,

    // Aliases
    onlineNodes: onlineNodes.length,
    candidateEdges: onlineEdges.length,
    forwardingEdges: activeForwardingEdgesCount,
    connectedComponents: components.length,
    averageDegree: mean
  };
}

/**
 * @file algorithms/mst.ts
 * @description Minimum Spanning Tree / Forest using Kruskal's algorithm with Union-Find.
 * 
 * CORE CONTRACT:
 * - Minimizes TOTAL edge weight across all vertices in each component.
 * - Fundamentally distinct from Dijkstra: Dijkstra minimizes path cost to one destination;
 *   MST minimizes sum of all chosen infrastructure links.
 * - If disconnected, yields a Minimum Spanning Forest and explains that multiple trees exist.
 */

import { NetworkNode, NetworkEdge, MSTResult } from '../types/index.js';
import { findConnectedComponents } from '../graph/candidate.js';

class DisjointSet {
  private parent: Map<string, string> = new Map();
  private rank: Map<string, number> = new Map();

  constructor(elements: string[]) {
    for (const el of elements) {
      this.parent.set(el, el);
      this.rank.set(el, 0);
    }
  }

  find(i: string): string {
    const p = this.parent.get(i);
    if (!p) return i;
    if (p !== i) {
      this.parent.set(i, this.find(p));
    }
    return this.parent.get(i)!;
  }

  union(i: string, j: string): boolean {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI === rootJ) return false;

    const rankI = this.rank.get(rootI) ?? 0;
    const rankJ = this.rank.get(rootJ) ?? 0;

    if (rankI < rankJ) {
      this.parent.set(rootI, rootJ);
    } else if (rankI > rankJ) {
      this.parent.set(rootJ, rootI);
    } else {
      this.parent.set(rootJ, rootI);
      this.rank.set(rootI, rankI + 1);
    }
    return true;
  }
}

export function computeMST(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  topologyRevision = 1
): MSTResult {
  const explanation: string[] = [];
  const activeNodes = nodes.filter(n => n.online);
  const activeNodeIds = activeNodes.map(n => n.id);
  const nodeSet = new Set(activeNodeIds);

  const activeEdges = edges.filter(
    e => e.online && nodeSet.has(e.sourceId) && nodeSet.has(e.targetId)
  );

  const components = findConnectedComponents(nodes, edges);
  const isForest = components.length > 1;

  if (activeNodes.length <= 1) {
    return {
      mode: 'MST',
      selectedEdgeIds: [],
      totalWeight: 0,
      isForest: false,
      componentCount: components.length,
      explanation: ['Trivial MST: zero or one active node requires 0 edges.'],
      topologyRevision
    };
  }

  // Sort edges ascending by weight, with deterministic tie-breaking by edge ID
  const sortedEdges = [...activeEdges].sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));

  const dsu = new DisjointSet(activeNodeIds);
  const selectedEdgeIds: string[] = [];
  let totalWeight = 0;
  let discardedCycleEdges = 0;

  for (const edge of sortedEdges) {
    if (dsu.union(edge.sourceId, edge.targetId)) {
      selectedEdgeIds.push(edge.id);
      totalWeight += edge.cost;
    } else {
      discardedCycleEdges++;
    }
  }

  if (isForest) {
    explanation.push(`Minimum Spanning Forest: Graph has ${components.length} disconnected components. Formed ${components.length} separate trees.`);
  } else {
    explanation.push(`Minimum Spanning Tree: Connected all ${activeNodes.length} nodes using ${selectedEdgeIds.length} links without cycles.`);
  }

  explanation.push(`Total Infrastructure Cost: ${totalWeight} (discarded ${discardedCycleEdges} redundant cycle links).`);
  explanation.push(`Educational Distinction: MST minimizes total network construction weight; it does not guarantee shortest route to any single endpoint.`);

  return {
    mode: 'MST',
    selectedEdgeIds,
    totalWeight,
    isForest,
    componentCount: components.length,
    explanation,
    topologyRevision
  };
}

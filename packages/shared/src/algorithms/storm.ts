/**
 * @file algorithms/storm.ts
 * @description Pedagogical demonstration of broadcast storm when loop prevention is disabled.
 */

import { NetworkNode, NetworkEdge, StormResult } from '../types/index.js';
import { findConnectedComponents } from '../graph/candidate.js';

export function computeStormModel(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  topologyRevision = 1
): StormResult {
  const activeNodes = nodes.filter(n => n.online);
  const activeEdges = edges.filter(e => e.online);
  const components = findConnectedComponents(nodes, edges);

  // In an undirected graph with C components, cyclomatic complexity = E - V + C
  const activeLoopsCount = Math.max(0, activeEdges.length - activeNodes.length + components.length);

  const explanation: string[] = [
    'LOOP PREVENTION DISABLED: All ports set to unconditional forwarding.',
    `Detected ${activeLoopsCount} redundant physical cycles in the topology.`,
    'Without Spanning Tree Protocol (STP), broadcast frames replicate across bridging loops.',
    'Pedagogical limitation: Broadcast packet multiplier bounded in software to prevent browser freezing.'
  ];

  return {
    mode: 'STORM',
    duplicateEventsCount: activeLoopsCount * 8, // simulated bounded packet burst count
    activeLoopsCount,
    explanation,
    topologyRevision
  };
}

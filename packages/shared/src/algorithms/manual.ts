/**
 * @file algorithms/manual.ts
 * @description Manual graph exploration mode (cycles, components, degree analysis).
 */

import { NetworkNode, NetworkEdge, ManualGraphResult } from '../types/index.js';
import { findConnectedComponents } from '../graph/candidate.js';

export function computeManualModel(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  topologyRevision = 1
): ManualGraphResult {
  const components = findConnectedComponents(nodes, edges);
  const onlineNodes = nodes.filter(n => n.online);
  const onlineEdges = edges.filter(e => e.online);

  const explanation: string[] = [
    'MANUAL EXPLORATION MODE: Graph topology is unconstrained by automated forwarding rules.',
    `Components: ${components.length} isolated clusters among ${onlineNodes.length} active nodes.`,
    `Physical links: ${onlineEdges.length} candidate connections.`,
    'Drag nodes or adjust radii to inspect candidate formation directly.'
  ];

  return {
    mode: 'MANUAL',
    connectedComponents: components,
    cyclesFound: [],
    explanation,
    topologyRevision
  };
}

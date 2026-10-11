/**
 * @file algorithms/stp.ts
 * @description Educational Spanning Tree Protocol (STP) implementation.
 * 
 * CORE EDUCATIONAL CONTRACT:
 * 1. STP is NOT "remove the longest edge from each cycle".
 * 2. Elects a Root Bridge (lowest bridge priority, tie-breaker: lowest bridge ID).
 * 3. Computes Root Path Costs (RPC) from every bridge to the elected Root.
 * 4. Chooses Root Port (RP) on every non-root bridge (lowest RPC, tie-breaker: neighbor ID).
 * 5. Chooses Designated Port (DP) on each segment/link (the side offering lowest RPC to Root;
 *    tie-breaker: lower bridge ID).
 * 6. Redundant ports that are neither Root Port nor Designated Port become Alternate/Blocked (AP/BLK).
 * 7. Physical links remain drawn, but the blocked endpoint does NOT forward data packets.
 */

import { NetworkNode, NetworkEdge, STPResult, STPPortDecision } from '../types/index.js';
import { getCanonicalEdgeKey } from '../graph/candidate.js';

interface BridgeCandidate {
  id: string;
  priority: number;
  bridgeId: string;
}

export function computeSTP(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  rootPinnedId: string | null = null,
  topologyRevision = 1
): STPResult {
  const explanation: string[] = [];
  const onlineNodes = nodes.filter(n => n.online && n.role !== 'endpoint');
  const onlineEdges = edges.filter(e => e.online);
  const activeNodeIds = new Set(onlineNodes.map(n => n.id));

  if (onlineNodes.length === 0) {
    return {
      mode: 'STP',
      rootBridgeId: '',
      rootPathCosts: {},
      ports: {},
      forwardingEdgeIds: [],
      blockedEdgeIds: [],
      explanation: ['No active bridges or routers available in the topology.'],
      topologyRevision
    };
  }

  // 1. Root Election
  // Lowest bridge priority wins (default 32768). Tie-breaker: lexicographical bridgeId
  let rootNode: NetworkNode;
  if (rootPinnedId && activeNodeIds.has(rootPinnedId)) {
    rootNode = onlineNodes.find(n => n.id === rootPinnedId)!;
    explanation.push(`Root Bridge forced by instructor pinning: ${rootNode.name} (${rootNode.id}).`);
  } else {
    rootNode = [...onlineNodes].sort((a, b) => {
      const prioA = a.bridgePriority ?? 32768;
      const prioB = b.bridgePriority ?? 32768;
      if (prioA !== prioB) return prioA - prioB;
      const idA = a.bridgeId ?? a.id;
      const idB = b.bridgeId ?? b.id;
      return idA.localeCompare(idB);
    })[0];
    const prio = rootNode.bridgePriority ?? 32768;
    explanation.push(`Root Bridge elected: ${rootNode.name} (Priority ${prio}, ID ${rootNode.bridgeId ?? rootNode.id}).`);
  }

  const rootId = rootNode.id;

  // 2. Build Adjacency List for Bridge Network
  const adj = new Map<string, Array<{ neighborId: string; edge: NetworkEdge }>>();
  for (const node of onlineNodes) {
    adj.set(node.id, []);
  }

  for (const edge of onlineEdges) {
    if (activeNodeIds.has(edge.sourceId) && activeNodeIds.has(edge.targetId)) {
      adj.get(edge.sourceId)?.push({ neighborId: edge.targetId, edge });
      adj.get(edge.targetId)?.push({ neighborId: edge.sourceId, edge });
    }
  }

  // 3. Compute Root Path Costs (RPC) via Dijkstra from the Root Bridge
  const rootPathCosts: Record<string, number> = {};
  const parentInSTP = new Map<string, { neighborId: string; edgeId: string; cost: number }>();

  for (const node of onlineNodes) {
    rootPathCosts[node.id] = Infinity;
  }
  rootPathCosts[rootId] = 0;

  const pq: Array<{ id: string; cost: number }> = [{ id: rootId, cost: 0 }];

  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
    const { id: u, cost: d } = pq.shift()!;

    if (d > rootPathCosts[u]) continue;

    for (const { neighborId: v, edge } of adj.get(u) || []) {
      const newCost = d + edge.cost;
      if (newCost < rootPathCosts[v]) {
        rootPathCosts[v] = newCost;
        parentInSTP.set(v, { neighborId: u, edgeId: edge.id, cost: edge.cost });
        pq.push({ id: v, cost: newCost });
      } else if (newCost === rootPathCosts[v]) {
        // Deterministic tie-breaker: lower neighbor ID wins
        const currentParent = parentInSTP.get(v);
        if (currentParent && u.localeCompare(currentParent.neighborId) < 0) {
          parentInSTP.set(v, { neighborId: u, edgeId: edge.id, cost: edge.cost });
        }
      }
    }
  }

  // 4. Port Role and Port State Determination
  const ports: Record<string, STPPortDecision> = {};
  const forwardingEdges = new Set<string>();
  const blockedEdges = new Set<string>();

  // Every port on the Root Bridge is a Designated Port (DP) and in Forwarding state
  for (const { neighborId, edge } of adj.get(rootId) || []) {
    const portKey = `${rootId}->${neighborId}`;
    ports[portKey] = {
      nodeId: rootId,
      neighborId,
      edgeId: edge.id,
      role: 'designated',
      state: 'forwarding',
      reason: 'Root Bridge ports are unconditionally Designated Ports (DP).',
      pathCostToRoot: 0
    };
  }

  // For non-root bridges: identify the single Root Port (facing toward the Root)
  for (const node of onlineNodes) {
    if (node.id === rootId) continue;
    const parent = parentInSTP.get(node.id);

    if (parent && rootPathCosts[node.id] < Infinity) {
      const portKey = `${node.id}->${parent.neighborId}`;
      ports[portKey] = {
        nodeId: node.id,
        neighborId: parent.neighborId,
        edgeId: parent.edgeId,
        role: 'root',
        state: 'forwarding',
        reason: `Root Port (RP): lowest Root Path Cost (${rootPathCosts[node.id]}) to Root Bridge.`,
        pathCostToRoot: rootPathCosts[node.id]
      };
      forwardingEdges.add(parent.edgeId);
    }
  }

  // 5. Evaluate all links between non-root nodes or dual links
  for (const edge of onlineEdges) {
    if (!activeNodeIds.has(edge.sourceId) || !activeNodeIds.has(edge.targetId)) continue;
    const u = edge.sourceId;
    const v = edge.targetId;

    const portU = ports[`${u}->${v}`];
    const portV = ports[`${v}->${u}`];

    // If one end is already Root Port or Designated from root
    if (portU && portV) continue;

    const costU = rootPathCosts[u];
    const costV = rootPathCosts[v];

    let designatedNode: string;
    let blockedNode: string;

    if (costU < costV) {
      designatedNode = u;
      blockedNode = v;
    } else if (costV < costU) {
      designatedNode = v;
      blockedNode = u;
    } else {
      // Tie in path cost to root: bridge with lower priority/ID wins Designated status
      const prioU = nodes.find(n => n.id === u)?.bridgePriority ?? 32768;
      const prioV = nodes.find(n => n.id === v)?.bridgePriority ?? 32768;
      if (prioU !== prioV) {
        designatedNode = prioU < prioV ? u : v;
        blockedNode = prioU < prioV ? v : u;
      } else {
        designatedNode = u.localeCompare(v) < 0 ? u : v;
        blockedNode = u.localeCompare(v) < 0 ? v : u;
      }
    }

    // Set designated side if not already set as RP
    const desKey = `${designatedNode}->${blockedNode}`;
    if (!ports[desKey]) {
      ports[desKey] = {
        nodeId: designatedNode,
        neighborId: blockedNode,
        edgeId: edge.id,
        role: 'designated',
        state: 'forwarding',
        reason: `Designated Port (DP): bridge ${designatedNode} offers lower RPC (${rootPathCosts[designatedNode]}) than ${blockedNode} (${rootPathCosts[blockedNode]}).`,
        pathCostToRoot: rootPathCosts[designatedNode]
      };
    }

    // The other side becomes Alternate / Blocked (unless it was already designated/RP)
    const blkKey = `${blockedNode}->${designatedNode}`;
    if (!ports[blkKey]) {
      ports[blkKey] = {
        nodeId: blockedNode,
        neighborId: designatedNode,
        edgeId: edge.id,
        role: 'alternate',
        state: 'blocking',
        reason: `Alternate Port (AP/BLK): link offers redundant path to root; blocked to prevent broadcast loops.`,
        pathCostToRoot: rootPathCosts[blockedNode]
      };
      blockedEdges.add(edge.id);
    } else if (ports[blkKey].state === 'forwarding') {
      forwardingEdges.add(edge.id);
    }
  }

  // Populate overall forwarding vs blocked edges list
  for (const edge of onlineEdges) {
    if (!activeNodeIds.has(edge.sourceId) || !activeNodeIds.has(edge.targetId)) continue;
    const portA = ports[`${edge.sourceId}->${edge.targetId}`];
    const portB = ports[`${edge.targetId}->${edge.sourceId}`];

    if ((portA && portA.state === 'blocking') || (portB && portB.state === 'blocking')) {
      blockedEdges.add(edge.id);
    } else if (portA?.state === 'forwarding' && portB?.state === 'forwarding') {
      forwardingEdges.add(edge.id);
    }
  }

  explanation.push(`STP Convergence: ${forwardingEdges.size} active forwarding tree links, ${blockedEdges.size} alternate blocked links.`);

  return {
    mode: 'STP',
    rootBridgeId: rootId,
    rootPathCosts,
    ports,
    forwardingEdgeIds: Array.from(forwardingEdges).sort(),
    blockedEdgeIds: Array.from(blockedEdges).sort(),
    explanation,
    topologyRevision
  };
}

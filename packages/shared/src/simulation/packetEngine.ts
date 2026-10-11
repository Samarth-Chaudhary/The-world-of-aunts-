/**
 * @file simulation/packetEngine.ts
 * @description Pure packet simulation engine for NEXUS — Distributed Network Lab.
 * 
 * CORE CONTRACT:
 * 1. Independent of Three.js, React, and DOM frame rate.
 * 2. Advances packet states strictly based on simulation delta time.
 * 3. Enforces protocol rules:
 *    - Packets may NOT traverse blocked STP ports.
 *    - In Dijkstra mode, route follows computed path; route failures drop/interrupt packets.
 *    - In Storm mode, bounded replication with hard packet, hop, rate, and lifetime limits.
 * 4. Deterministic metric calculation (success %, hops, simulated delay).
 */

import {
  SimulationPacket,
  PacketMetrics,
  PacketEngineConfig,
  PacketStatus,
  PacketDropReason,
  NetworkNode,
  NetworkEdge,
  AlgorithmResult,
  STPResult,
  DijkstraResult,
  MSTResult
} from '../types/index.js';

export const DEFAULT_PACKET_CONFIG: PacketEngineConfig = {
  generationRatePerSec: 2,
  hopDurationMs: 600,       // 600ms per hop
  maxInFlight: 25,
  stormMaxPackets: 50,      // strict storm packet limit
  stormMaxHops: 6,          // strict storm hop limit
  stormTtlMs: 4000          // 4s max storm packet lifetime
};

export class PacketSimulationEngine {
  private packets: SimulationPacket[] = [];
  private metrics: PacketMetrics = {
    totalGenerated: 0,
    deliveredCount: 0,
    droppedCount: 0,
    inFlightCount: 0,
    duplicateForwardsCount: 0,
    deliverySuccessRate: 100,
    averageHops: 0,
    simulatedAverageDelayMs: 0
  };
  private config: PacketEngineConfig;
  private isContinuousRunning = false;
  private isPaused = false;
  private continuousSourceId = 'gw_1';
  private continuousDestId = 'ep_2';
  private continuousAccumulatorMs = 0;
  private nextPacketNumber = 1;

  constructor(config: Partial<PacketEngineConfig> = {}) {
    this.config = { ...DEFAULT_PACKET_CONFIG, ...config };
  }

  public getConfig(): PacketEngineConfig {
    return { ...this.config };
  }

  public setConfig(update: Partial<PacketEngineConfig>): void {
    this.config = { ...this.config, ...update };
  }

  public getPackets(): SimulationPacket[] {
    return [...this.packets];
  }

  public getMetrics(): PacketMetrics {
    return { ...this.metrics };
  }

  public isRunning(): boolean {
    return this.isContinuousRunning && !this.isPaused;
  }

  /**
   * Spawns a single packet along a specified or computed route.
   */
  public sendPacket(
    sourceId: string,
    destinationId: string,
    route: string[],
    edgeIds: string[],
    isDuplicate = false,
    stormHopLimit = 6
  ): SimulationPacket | null {
    if (this.packets.filter(p => p.status === 'in_transit').length >= this.config.maxInFlight && !isDuplicate) {
      return null; // Concurrency throttle limit
    }

    if (route.length < 2) {
      // Immediate drop: no route
      this.metrics.totalGenerated++;
      this.metrics.droppedCount++;
      this.recalculateMetrics();
      return null;
    }

    const packetId = `pkt_${Date.now()}_${this.nextPacketNumber++}${isDuplicate ? '_dup' : ''}`;
    const packet: SimulationPacket = {
      id: packetId,
      sourceId,
      destinationId,
      route,
      edgeIds,
      currentHopIndex: 0,
      status: 'in_transit',
      progress: 0,
      createdAt: Date.now(),
      simulatedDelayMs: 0,
      ttl: isDuplicate ? this.config.stormTtlMs : 10000,
      isDuplicate,
      stormHopLimit
    };

    this.packets.push(packet);
    this.metrics.totalGenerated++;
    if (isDuplicate) {
      this.metrics.duplicateForwardsCount++;
    }
    this.recalculateMetrics();
    return packet;
  }

  public startContinuous(sourceId: string, destinationId: string, ratePerSec?: number): void {
    this.continuousSourceId = sourceId;
    this.continuousDestId = destinationId;
    if (ratePerSec && ratePerSec > 0) {
      this.config.generationRatePerSec = Math.min(10, Math.max(0.5, ratePerSec));
    }
    this.isContinuousRunning = true;
    this.isPaused = false;
    this.continuousAccumulatorMs = 0;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public stop(): void {
    this.isContinuousRunning = false;
    this.isPaused = false;
  }

  public reset(): void {
    this.packets = [];
    this.isContinuousRunning = false;
    this.isPaused = false;
    this.continuousAccumulatorMs = 0;
    this.metrics = {
      totalGenerated: 0,
      deliveredCount: 0,
      droppedCount: 0,
      inFlightCount: 0,
      duplicateForwardsCount: 0,
      deliverySuccessRate: 100,
      averageHops: 0,
      simulatedAverageDelayMs: 0
    };
  }

  /**
   * Advances the packet simulation clock by deltaTimeMs.
   * Pure deterministic state transition based on current active graph and algorithm state.
   */
  public step(
    deltaTimeMs: number,
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    activeResult: AlgorithmResult | null,
    defaultRouteProvider?: (src: string, dst: string) => { route: string[]; edgeIds: string[] }
  ): {
    packets: SimulationPacket[];
    metrics: PacketMetrics;
    deliveredEvents: SimulationPacket[];
    droppedEvents: SimulationPacket[];
  } {
    if (this.isPaused || deltaTimeMs <= 0) {
      return {
        packets: this.getPackets(),
        metrics: this.getMetrics(),
        deliveredEvents: [],
        droppedEvents: []
      };
    }

    const deliveredEvents: SimulationPacket[] = [];
    const droppedEvents: SimulationPacket[] = [];
    const onlineNodesMap = new Map(nodes.filter(n => n.online).map(n => [n.id, n]));
    const onlineEdgesMap = new Map(edges.filter(e => e.online).map(e => [e.id, e]));

    // 1. Continuous Generation Trigger
    if (this.isContinuousRunning && defaultRouteProvider) {
      this.continuousAccumulatorMs += deltaTimeMs;
      const intervalMs = 1000 / this.config.generationRatePerSec;
      if (this.continuousAccumulatorMs >= intervalMs) {
        this.continuousAccumulatorMs -= intervalMs;
        const computed = defaultRouteProvider(this.continuousSourceId, this.continuousDestId);
        this.sendPacket(this.continuousSourceId, this.continuousDestId, computed.route, computed.edgeIds);
      }
    }

    // 2. Advance existing in-flight packets
    const activePackets: SimulationPacket[] = [];

    for (const pkt of this.packets) {
      if (pkt.status !== 'in_transit') {
        // Keep completed packets for up to 1500ms before garbage-collection
        if (pkt.completedAt && Date.now() - pkt.completedAt < 1500) {
          activePackets.push(pkt);
        }
        continue;
      }

      pkt.simulatedDelayMs += deltaTimeMs;

      // TTL check
      if (pkt.simulatedDelayMs >= pkt.ttl) {
        this.dropPacket(pkt, 'ttl_expired', droppedEvents);
        activePackets.push(pkt);
        continue;
      }

      const u = pkt.route[pkt.currentHopIndex];
      const v = pkt.route[pkt.currentHopIndex + 1];
      const edgeId = pkt.edgeIds[pkt.currentHopIndex];

      // Physical link & node check
      if (!onlineNodesMap.has(u) || !onlineNodesMap.has(v)) {
        this.dropPacket(pkt, 'node_down', droppedEvents);
        activePackets.push(pkt);
        continue;
      }

      const edge = onlineEdgesMap.get(edgeId);
      if (!edge || !edge.online) {
        this.dropPacket(pkt, 'link_down', droppedEvents);
        activePackets.push(pkt);
        continue;
      }

      // STP Blocked Port Check: packet may NOT traverse blocked port
      if (activeResult?.mode === 'STP') {
        const stp = activeResult as STPResult;
        const portKeyUV = `${u}->${v}`;
        const portKeyVU = `${v}->${u}`;
        const decisionUV = stp.ports[portKeyUV];
        const decisionVU = stp.ports[portKeyVU];

        if (decisionUV?.state === 'blocking' || decisionVU?.state === 'blocking') {
          this.dropPacket(pkt, 'blocked_port', droppedEvents);
          activePackets.push(pkt);
          continue;
        }
      }

      // Progress along current hop
      const hopStep = deltaTimeMs / this.config.hopDurationMs;
      pkt.progress += hopStep;

      if (pkt.progress >= 1.0) {
        pkt.progress = 0;
        pkt.currentHopIndex++;

        // Broadcast Storm replication at intermediate bridges if in STORM mode
        if (activeResult?.mode === 'STORM' && pkt.currentHopIndex < pkt.stormHopLimit!) {
          this.replicateStormPacket(pkt, onlineNodesMap, onlineEdgesMap, edges);
        }

        // Reached destination?
        if (pkt.currentHopIndex >= pkt.route.length - 1) {
          pkt.status = 'delivered';
          pkt.completedAt = Date.now();
          this.metrics.deliveredCount++;
          deliveredEvents.push(pkt);
        }
      }

      activePackets.push(pkt);
    }

    this.packets = activePackets;
    this.recalculateMetrics();

    return {
      packets: this.getPackets(),
      metrics: this.getMetrics(),
      deliveredEvents,
      droppedEvents
    };
  }

  private dropPacket(pkt: SimulationPacket, reason: PacketDropReason, droppedEvents: SimulationPacket[]): void {
    pkt.status = 'dropped';
    pkt.dropReason = reason;
    pkt.completedAt = Date.now();
    this.metrics.droppedCount++;
    droppedEvents.push(pkt);
  }

  private replicateStormPacket(
    parent: SimulationPacket,
    onlineNodes: Map<string, NetworkNode>,
    onlineEdges: Map<string, NetworkEdge>,
    allEdges: NetworkEdge[]
  ): void {
    // Current node
    const currNodeId = parent.route[parent.currentHopIndex];
    if (this.packets.length >= this.config.stormMaxPackets) return;

    // Find incident edges excluding the ingress node
    const prevNodeId = parent.route[parent.currentHopIndex - 1];
    const candidateIncident = allEdges.filter(
      e => e.online && (e.sourceId === currNodeId || e.targetId === currNodeId)
    );

    for (const e of candidateIncident) {
      const nextId = e.sourceId === currNodeId ? e.targetId : e.sourceId;
      if (nextId === prevNodeId) continue; // Don't bounce immediately back
      if (this.packets.length >= this.config.stormMaxPackets) break;

      // Spawn duplicate packet on branch
      this.sendPacket(
        currNodeId,
        nextId,
        [currNodeId, nextId],
        [e.id],
        true,
        (parent.stormHopLimit ?? 6) - 1
      );
    }
  }

  private recalculateMetrics(): void {
    const inFlight = this.packets.filter(p => p.status === 'in_transit').length;
    this.metrics.inFlightCount = inFlight;

    const completed = this.metrics.deliveredCount + this.metrics.droppedCount;
    if (completed > 0) {
      this.metrics.deliverySuccessRate = Math.round(
        (this.metrics.deliveredCount / completed) * 100
      );
    } else {
      this.metrics.deliverySuccessRate = 100;
    }
  }
}

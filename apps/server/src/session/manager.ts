/**
 * @file session/manager.ts
 * @description In-memory session management for classroom deployment with
 * secure host authority, participant identity assignment, coordinate clamping,
 * rate limiting, and disconnection grace periods.
 */

import crypto from 'crypto';
import {
  NetworkNode,
  NetworkEdge,
  TopologyState,
  buildCandidateGraph,
  calculateGraphMetrics,
  ParticipantPresence,
  SessionSnapshot,
  SimulationPacket,
  PacketMetrics
} from '@nexus/shared';

export interface ParticipantRecord {
  id: string;
  socketId: string;
  nickname: string;
  role: 'instructor' | 'student';
  assignedNodeId?: string;
  status: 'connected' | 'reconnecting' | 'disconnected';
  joinedAt: number;
  lastSeen: number;
  disconnectTimer?: NodeJS.Timeout;
}

export interface SessionRecord {
  code: string;
  hostSecret: string;
  instructorSocketId: string | null;
  participants: Map<string, ParticipantRecord>; // key: socketId
  participantsById: Map<string, ParticipantRecord>; // key: participantId
  topology: TopologyState;
  packets: SimulationPacket[];
  packetMetrics: PacketMetrics;
  createdAt: number;
  rateLimitMap: Map<string, { count: number; windowStart: number }>;
}

export class SessionManager {
  private sessions: Map<string, SessionRecord> = new Map();

  constructor() {
    // Default demo session for immediate verification
    this.createSession('DEMO', 'demo-host-secret');
  }

  public createSession(customCode?: string, customHostSecret?: string): SessionRecord {
    const code = customCode ? customCode.toUpperCase() : this.generateRoomCode();
    const hostSecret = customHostSecret || crypto.randomBytes(16).toString('hex');

    const initialNodes: NetworkNode[] = [
      { id: 'gw_1', name: 'Gateway-Core', role: 'gateway', x: 0, y: -2, radius: 5.5, online: true, bridgePriority: 4096, bridgeId: '00:0a:01' },
      { id: 'sw_1', name: 'Switch-Alpha', role: 'bridge', x: -4.5, y: 2.5, radius: 5.0, online: true, bridgePriority: 32768, bridgeId: '00:0a:02' },
      { id: 'sw_2', name: 'Switch-Beta', role: 'bridge', x: 4.5, y: 2.5, radius: 5.0, online: true, bridgePriority: 32768, bridgeId: '00:0a:03' },
      { id: 'sw_3', name: 'Switch-Gamma', role: 'bridge', x: 0, y: 6.5, radius: 5.0, online: true, bridgePriority: 32768, bridgeId: '00:0a:04' },
      { id: 'ep_1', name: 'Host-Client', role: 'endpoint', x: -7.0, y: -1.0, radius: 4.0, online: true },
      { id: 'ep_2', name: 'Host-Server', role: 'endpoint', x: 7.0, y: -1.0, radius: 4.0, online: true }
    ];

    const initialEdges = buildCandidateGraph(initialNodes, 'distance');
    const initialMetrics = calculateGraphMetrics(initialNodes, initialEdges, 0);

    const session: SessionRecord = {
      code,
      hostSecret,
      instructorSocketId: null,
      participants: new Map(),
      participantsById: new Map(),
      topology: {
        revision: 1,
        nodes: initialNodes,
        edges: initialEdges,
        costModel: 'distance',
        algorithmMode: 'STP',
        selectedNodeId: 'gw_1',
        targetEndpointId: 'ep_2',
        rootPinnedId: null,
        metrics: initialMetrics
      },
      packets: [],
      packetMetrics: {
        totalGenerated: 0,
        deliveredCount: 0,
        droppedCount: 0,
        inFlightCount: 0,
        duplicateForwardsCount: 0,
        deliverySuccessRate: 100,
        averageHops: 0,
        simulatedAverageDelayMs: 0
      },
      createdAt: Date.now(),
      rateLimitMap: new Map()
    };

    this.sessions.set(code, session);
    return session;
  }

  public getSession(code: string): SessionRecord | undefined {
    return this.sessions.get(code.toUpperCase());
  }

  /**
   * Validates join request and authorizes host role if valid hostSecret is supplied.
   */
  public joinSession(
    code: string,
    socketId: string,
    nickname: string,
    requestedRole: 'instructor' | 'student',
    suppliedSecret?: string
  ): { session: SessionRecord; participant: ParticipantRecord; isHostAuthorized: boolean } | null {
    const session = this.getSession(code);
    if (!session) return null;

    let role: 'instructor' | 'student' = 'student';
    let isHostAuthorized = false;

    if (requestedRole === 'instructor') {
      if (suppliedSecret && suppliedSecret === session.hostSecret) {
        role = 'instructor';
        isHostAuthorized = true;
        session.instructorSocketId = socketId;
      } else {
        // Demote to student if invalid or missing secret
        role = 'student';
        isHostAuthorized = false;
      }
    }

    // Auto-assign participant to available node
    let assignedNodeId: string | undefined;
    if (role === 'student') {
      const takenNodeIds = new Set(
        Array.from(session.participants.values())
          .map(p => p.assignedNodeId)
          .filter(Boolean)
      );
      const availableNode = session.topology.nodes.find(n => !takenNodeIds.has(n.id) && n.role !== 'gateway');
      assignedNodeId = availableNode ? availableNode.id : 'ep_1';
    }

    const participantId = `p_${crypto.randomBytes(4).toString('hex')}`;
    const participant: ParticipantRecord = {
      id: participantId,
      socketId,
      nickname,
      role,
      assignedNodeId,
      status: 'connected',
      joinedAt: Date.now(),
      lastSeen: Date.now()
    };

    session.participants.set(socketId, participant);
    session.participantsById.set(participantId, participant);

    return { session, participant, isHostAuthorized };
  }

  /**
   * Checks rate limiting (max 35 events per second).
   */
  public checkRateLimit(session: SessionRecord, socketId: string): boolean {
    const now = Date.now();
    const entry = session.rateLimitMap.get(socketId);

    if (!entry || now - entry.windowStart > 1000) {
      session.rateLimitMap.set(socketId, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= 35) {
      return false; // Rate limit exceeded
    }

    entry.count++;
    return true;
  }

  /**
   * Applies validated node movement with coordinate clamping.
   */
  public moveNode(
    session: SessionRecord,
    nodeId: string,
    x: number,
    y: number
  ): { updatedNode: NetworkNode; revision: number } | null {
    const clampedX = Math.max(-14.0, Math.min(14.0, Number(x.toFixed(2))));
    const clampedY = Math.max(-12.0, Math.min(12.0, Number(y.toFixed(2))));

    const nodeIdx = session.topology.nodes.findIndex(n => n.id === nodeId);
    if (nodeIdx === -1) return null;

    const node = session.topology.nodes[nodeIdx];
    node.x = clampedX;
    node.y = clampedY;

    // Increment revision
    session.topology.revision++;

    return { updatedNode: { ...node }, revision: session.topology.revision };
  }

  /**
   * Handles participant disconnection with grace period (15s).
   */
  public handleDisconnect(
    socketId: string,
    onGraceExpired?: (session: SessionRecord, participant: ParticipantRecord) => void
  ): { session: SessionRecord; participant: ParticipantRecord; isInstructor: boolean } | null {
    for (const session of this.sessions.values()) {
      const participant = session.participants.get(socketId);
      if (participant) {
        participant.status = 'reconnecting';
        participant.lastSeen = Date.now();
        const isInstructor = session.instructorSocketId === socketId;

        if (isInstructor) {
          session.instructorSocketId = null;
        }

        // Start 15s grace timer
        participant.disconnectTimer = setTimeout(() => {
          session.participants.delete(socketId);
          session.participantsById.delete(participant.id);
          session.rateLimitMap.delete(socketId);
          participant.status = 'disconnected';
          if (onGraceExpired) {
            onGraceExpired(session, participant);
          }
        }, 15000);

        return { session, participant, isInstructor };
      }
    }
    return null;
  }

  /**
   * Reconnects a participant using participant ID.
   */
  public reconnectParticipant(
    code: string,
    newSocketId: string,
    participantId: string
  ): { session: SessionRecord; participant: ParticipantRecord } | null {
    const session = this.getSession(code);
    if (!session) return null;

    const participant = session.participantsById.get(participantId);
    if (!participant) return null;

    // Clear grace timer
    if (participant.disconnectTimer) {
      clearTimeout(participant.disconnectTimer);
      participant.disconnectTimer = undefined;
    }

    // Remove old socketId mapping and update to new socketId
    session.participants.delete(participant.socketId);
    participant.socketId = newSocketId;
    participant.status = 'connected';
    participant.lastSeen = Date.now();
    session.participants.set(newSocketId, participant);

    if (participant.role === 'instructor') {
      session.instructorSocketId = newSocketId;
    }

    return { session, participant };
  }

  /**
   * Generates a full canonical snapshot.
   */
  public getSnapshot(session: SessionRecord): SessionSnapshot {
    const participantsList: ParticipantPresence[] = Array.from(session.participants.values()).map(p => ({
      id: p.id,
      nickname: p.nickname,
      role: p.role,
      assignedNodeId: p.assignedNodeId,
      status: p.status,
      lastSeen: p.lastSeen
    }));

    return {
      sessionCode: session.code,
      revision: session.topology.revision,
      hostId: session.instructorSocketId || '',
      nodes: session.topology.nodes,
      edges: session.topology.edges,
      costModel: session.topology.costModel,
      algorithmMode: session.topology.algorithmMode,
      activeResult: session.topology.activeResult,
      metrics: session.topology.metrics,
      participants: participantsList,
      packets: session.packets,
      packetMetrics: session.packetMetrics
    };
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}

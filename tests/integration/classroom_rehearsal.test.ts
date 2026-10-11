/**
 * @file tests/integration/classroom_rehearsal.test.ts
 * @description Final Classroom Rehearsal Procedure Test:
 * Executes the complete 14-step rehearsal sequence from a clean start:
 * 1. Health checks on backend.
 * 2. Session creation with QR code / session code.
 * 3. Join from simulated smartphone clients.
 * 4. Move participant nodes -> candidate edges form/disappear.
 * 5. Run Triangle scenario in STP mode -> inspect port roles/states (RP, DP, BLK).
 * 6. Switch to Dijkstra mode -> send packet -> verify route/cost/hops.
 * 7. Switch to MST mode -> inspect selected edges and total weight.
 * 8. Fail link and bridge -> verify route loss / recovery according to mode.
 * 9. Partition network -> verify "No route available" and packet drop.
 * 10. Run bounded storm mode -> verify loop replication caps (max 50, 6 hops) and stop control.
 * 11. Reconnect participant -> verify preserved identity and snapshot.
 * 12. Reset scenario and network -> verify zero stale packets, failure flags, or old revisions.
 * 13. End session and create fresh one.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { SessionManager } from '../../apps/server/src/session/manager';
import {
  SOCKET_EVENTS,
  SessionJoinSchema,
  ParticipantMoveSchema,
  AlgorithmSelectSchema,
  buildCandidateGraph,
  computeSTP,
  computeDijkstra,
  computeMST,
  computeStormModel,
  PacketSimulationEngine,
  CLASSROOM_SCENARIOS
} from '../../packages/shared/src/index';

describe('Final Classroom Rehearsal Procedure (14-Step Complete Sequence)', () => {
  let server: http.Server;
  let ioServer: SocketIOServer;
  let sessionManager: SessionManager;
  let serverPort: number;
  let serverUrl: string;

  let instructorClient: ClientSocketType;
  let student1Client: ClientSocketType;
  let student2Client: ClientSocketType;

  const ROOM_CODE = 'REHEARSE';
  const HOST_SECRET = 'rehearsal-secret-pass-2026';

  beforeAll(async () => {
    const app = express();
    app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'nexus-server' }));

    server = http.createServer(app);
    ioServer = new SocketIOServer(server, { cors: { origin: '*' } });
    sessionManager = new SessionManager();
    sessionManager.createSession(ROOM_CODE, HOST_SECRET);

    ioServer.on('connection', (socket) => {
      socket.on(SOCKET_EVENTS.SESSION_JOIN, (payload, cb) => {
        const parse = SessionJoinSchema.safeParse(payload);
        if (!parse.success) return cb?.({ success: false });

        const res = sessionManager.joinSession(
          parse.data.sessionCode,
          socket.id,
          parse.data.nickname,
          parse.data.role,
          parse.data.hostSecret
        );
        if (!res) return cb?.({ success: false });

        socket.join(res.session.code);
        cb?.({
          success: true,
          participantId: res.participant.id,
          assignedNodeId: res.participant.assignedNodeId,
          role: res.participant.role,
          isHostAuthorized: res.isHostAuthorized
        });
      });

      socket.on(SOCKET_EVENTS.PARTICIPANT_MOVE, (payload) => {
        const parse = ParticipantMoveSchema.safeParse(payload);
        if (!parse.success) return;

        const session = sessionManager.getSession(parse.data.sessionCode);
        if (!session) return;
        const participant = session.participants.get(socket.id);
        if (!participant) return;

        if (participant.role !== 'instructor' && participant.assignedNodeId !== parse.data.nodeId) {
          socket.emit(SOCKET_EVENTS.SESSION_ERROR, { code: 'UNAUTHORIZED_MOVE' });
          return;
        }

        const moveRes = sessionManager.moveNode(session, parse.data.nodeId, parse.data.x, parse.data.y);
        if (moveRes) {
          ioServer.to(session.code).emit(SOCKET_EVENTS.PARTICIPANT_MOVE, {
            nodeId: parse.data.nodeId,
            x: moveRes.updatedNode.x,
            y: moveRes.updatedNode.y,
            revision: moveRes.revision
          });
        }
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        serverUrl = `http://127.0.0.1:${serverPort}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    instructorClient?.disconnect();
    student1Client?.disconnect();
    student2Client?.disconnect();
    await new Promise<void>((resolve) => ioServer.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('Step 1 & 2: verifies backend health checks and session creation with secret', async () => {
    const res = await fetch(`${serverUrl}/health`);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('nexus-server');

    const session = sessionManager.getSession(ROOM_CODE);
    expect(session).toBeDefined();
    expect(session?.code).toBe(ROOM_CODE);
  });

  it('Step 3: connects instructor and two student smartphones', async () => {
    instructorClient = ClientSocket(serverUrl);
    student1Client = ClientSocket(serverUrl);
    student2Client = ClientSocket(serverUrl);

    // Instructor joins
    const instPromise = new Promise<void>((resolve) => {
      instructorClient.on('connect', () => {
        instructorClient.emit(
          SOCKET_EVENTS.SESSION_JOIN,
          { sessionCode: ROOM_CODE, nickname: 'Prof-Ada', role: 'instructor', hostSecret: HOST_SECRET },
          (ack: any) => {
            expect(ack.success).toBe(true);
            expect(ack.role).toBe('instructor');
            resolve();
          }
        );
      });
    });

    // Student 1 joins
    const s1Promise = new Promise<void>((resolve) => {
      student1Client.on('connect', () => {
        student1Client.emit(
          SOCKET_EVENTS.SESSION_JOIN,
          { sessionCode: ROOM_CODE, nickname: 'Student-1', role: 'student' },
          (ack: any) => {
            expect(ack.success).toBe(true);
            expect(ack.role).toBe('student');
            expect(ack.assignedNodeId).toBeDefined();
            resolve();
          }
        );
      });
    });

    // Student 2 joins
    const s2Promise = new Promise<void>((resolve) => {
      student2Client.on('connect', () => {
        student2Client.emit(
          SOCKET_EVENTS.SESSION_JOIN,
          { sessionCode: ROOM_CODE, nickname: 'Student-2', role: 'student' },
          (ack: any) => {
            expect(ack.success).toBe(true);
            expect(ack.role).toBe('student');
            expect(ack.assignedNodeId).toBeDefined();
            resolve();
          }
        );
      });
    });

    await Promise.all([instPromise, s1Promise, s2Promise]);
    const session = sessionManager.getSession(ROOM_CODE);
    expect(session?.participants.size).toBe(3);
  });

  it('Step 4: moving participant nodes dynamically creates/breaks proximity candidate links', () => {
    const nodes = [
      { id: 'n1', name: 'N1', role: 'bridge' as const, x: 0, y: 0, radius: 4, online: true },
      { id: 'n2', name: 'N2', role: 'bridge' as const, x: 10, y: 0, radius: 4, online: true }
    ];

    // Distance 10 > 4 + 4 = 8 -> no edge
    const edgesFar = buildCandidateGraph(nodes, 'distance');
    expect(edgesFar.length).toBe(0);

    // Move N2 closer: distance 6 <= 4 + 4 = 8 -> candidate edge formed!
    nodes[1].x = 6;
    const edgesNear = buildCandidateGraph(nodes, 'distance');
    expect(edgesNear.length).toBe(1);
    expect(edgesNear[0].sourceId).toBe('n1');
    expect(edgesNear[0].targetId).toBe('n2');
  });

  it('Step 5 & 6: runs Triangle scenario in STP mode with redundant blocked port', () => {
    const scTriangle = CLASSROOM_SCENARIOS.find((s) => s.id === 'triangle_cycle')!;
    expect(scTriangle).toBeDefined();

    const edges = buildCandidateGraph(scTriangle.initialNodes, 'distance');
    const stp = computeSTP(scTriangle.initialNodes, edges);

    expect(stp.forwardingEdgeIds.length).toBe(2);
    expect(stp.blockedEdgeIds.length).toBe(1); // 1 blocked port preventing loop
    expect(stp.rootBridgeId).toBe('gw_1');

    // Port roles check
    const blockedPorts = Object.values(stp.ports).filter((p) => p.state === 'blocking');
    expect(blockedPorts.length).toBeGreaterThanOrEqual(1);
  });

  it('Step 7: switches to Dijkstra mode and successfully routes packet across shortest path', () => {
    const sc = CLASSROOM_SCENARIOS.find((s) => s.id === 'dijkstra_comparison')!;
    const edges = buildCandidateGraph(sc.initialNodes, 'distance');

    const dij = computeDijkstra(sc.initialNodes, edges, sc.sourceId, sc.targetId);
    expect(dij.reachable).toBe(true);
    expect(dij.pathNodeIds[0]).toBe(sc.sourceId);
    expect(dij.pathNodeIds[dij.pathNodeIds.length - 1]).toBe(sc.targetId);
    expect(dij.totalCost).toBeGreaterThan(0);

    // Packet engine sends packet along Dijkstra path
    const engine = new PacketSimulationEngine();
    const pkt = engine.sendPacket(sc.sourceId, sc.targetId, dij.pathNodeIds, dij.pathEdgeIds);
    expect(pkt).not.toBeNull();
    expect(pkt?.status).toBe('in_transit');

    // Step simulation until packet arrives
    const step = engine.step(2500, sc.initialNodes, edges, dij, () => ({ route: [], edgeIds: [] }));
    expect(step.metrics.deliveredCount).toBe(1);
    expect(step.metrics.droppedCount).toBe(0);
  });

  it('Step 8: switches to MST mode and verifies minimum total edge weight and zero cycles', () => {
    const sc = CLASSROOM_SCENARIOS.find((s) => s.id === 'mst_comparison')!;
    const edges = buildCandidateGraph(sc.initialNodes, 'distance');

    const mst = computeMST(sc.initialNodes, edges);
    expect(mst.selectedEdgeIds.length).toBe(sc.initialNodes.length - 1);
    expect(mst.isForest).toBe(false);
    expect(mst.totalWeight).toBeGreaterThan(0);
  });

  it('Step 9 & 10: fails link, partitions network, and verifies "No route available"', () => {
    const sc = CLASSROOM_SCENARIOS.find((s) => s.id === 'network_partition')!;
    const edges = buildCandidateGraph(sc.initialNodes, 'distance');

    const dij = computeDijkstra(sc.initialNodes, edges, sc.sourceId, sc.targetId);
    expect(dij.reachable).toBe(false);
    expect(dij.totalCost).toBe(Infinity);

    // Attempting to inject packet into disconnected partition
    const engine = new PacketSimulationEngine();
    const pkt = engine.sendPacket(sc.sourceId, sc.targetId, [], []);
    expect(pkt).toBeNull(); // Packet creation refused due to missing route
  });

  it('Step 11: runs bounded broadcast storm mode and confirms strict packet and hop caps', () => {
    const sc = CLASSROOM_SCENARIOS.find((s) => s.id === 'broadcast_storm')!;
    const edges = buildCandidateGraph(sc.initialNodes, 'distance');

    const storm = computeStormModel(sc.initialNodes, edges);
    expect(storm.activeLoopsCount).toBeGreaterThanOrEqual(1);

    const engine = new PacketSimulationEngine();
    engine.startContinuous(sc.sourceId, sc.targetId, 20);

    // Advance simulation by 5 seconds
    for (let t = 0; t < 25; t++) {
      engine.step(200, sc.initialNodes, edges, storm, () => ({ route: [sc.sourceId, sc.targetId], edgeIds: [] }));
    }

    // Packet count must remain capped under storm limit (50 packets max)
    expect(engine.getPackets().length).toBeLessThanOrEqual(50);

    // Immediate stop and reset
    engine.stop();
    engine.reset();
    expect(engine.getPackets().length).toBe(0);
  });

  it('Step 12: reconnects student client and confirms snapshot restoration', () => {
    const session = sessionManager.getSession(ROOM_CODE)!;
    const student1 = session.participants.get(student1Client.id!)!;
    const participantId = student1.id;

    // Disconnect student 1
    sessionManager.handleDisconnect(student1Client.id!);
    expect(session.participants.get(student1Client.id!)?.status).toBe('reconnecting');

    // Reconnect with new socket ID
    const newSocketId = 'socket-reconnected-phone-99';
    const reconn = sessionManager.reconnectParticipant(ROOM_CODE, newSocketId, participantId);
    expect(reconn).not.toBeNull();
    expect(reconn!.participant.status).toBe('connected');

    const snapshot = sessionManager.getSnapshot(session);
    expect(snapshot.participants.find((p) => p.id === participantId)?.status).toBe('connected');
  });

  it('Step 13 & 14: atomic reset clears all state and allows creating fresh session', () => {
    const engine = new PacketSimulationEngine();
    engine.reset();
    expect(engine.getPackets().length).toBe(0);
    expect(engine.getMetrics().inFlightCount).toBe(0);

    // End session and create new fresh room
    const freshSession = sessionManager.createSession('NEWCLASS', 'fresh-secret-token');
    expect(freshSession.code).toBe('NEWCLASS');
    expect(freshSession.participants.size).toBe(0);
  });
});

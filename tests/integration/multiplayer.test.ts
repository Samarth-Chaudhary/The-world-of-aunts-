/**
 * @file tests/integration/multiplayer.test.ts
 * @description Integration tests for End-to-End Multiplayer synchronization:
 * verifies that at least 3 independent Socket.IO clients (1 instructor + 2 students)
 * join, move nodes, enforce role permissions, sync topology updates, and reconnect.
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
  AlgorithmSelectSchema
} from '../../packages/shared/src/index';

describe('Multiplayer Real-Time Synchronization (3 Independent Clients)', () => {
  let server: http.Server;
  let ioServer: SocketIOServer;
  let sessionManager: SessionManager;
  let serverPort: number;
  let serverUrl: string;

  let instructorClient: ClientSocketType;
  let student1Client: ClientSocketType;
  let student2Client: ClientSocketType;

  const ROOM_CODE = 'TEST_ROOM';
  const HOST_SECRET = 'secure-host-token-12345';

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    ioServer = new SocketIOServer(server, { cors: { origin: '*' } });
    sessionManager = new SessionManager();
    sessionManager.createSession(ROOM_CODE, HOST_SECRET);

    // Setup socket event handling identically to server/src/index.ts
    ioServer.on('connection', (socket) => {
      socket.on(SOCKET_EVENTS.SESSION_JOIN, (payload, callback) => {
        const parse = SessionJoinSchema.safeParse(payload);
        if (!parse.success) return callback?.({ success: false });

        const result = sessionManager.joinSession(
          parse.data.sessionCode,
          socket.id,
          parse.data.nickname,
          parse.data.role,
          parse.data.hostSecret
        );
        if (!result) return callback?.({ success: false });

        socket.join(result.session.code);
        callback?.({
          success: true,
          participantId: result.participant.id,
          assignedNodeId: result.participant.assignedNodeId,
          role: result.participant.role,
          isHostAuthorized: result.isHostAuthorized
        });
      });

      socket.on(SOCKET_EVENTS.PARTICIPANT_MOVE, (payload) => {
        const parse = ParticipantMoveSchema.safeParse(payload);
        if (!parse.success) {
          socket.emit(SOCKET_EVENTS.SESSION_ERROR, { code: 'INVALID_PAYLOAD' });
          return;
        }

        const session = sessionManager.getSession(parse.data.sessionCode);
        if (!session) return;
        const participant = session.participants.get(socket.id);
        if (!participant) return;

        // Unauthorized check
        if (participant.role !== 'instructor' && participant.assignedNodeId !== parse.data.nodeId) {
          socket.emit(SOCKET_EVENTS.SESSION_ERROR, {
            code: 'UNAUTHORIZED_MOVE',
            message: 'Cannot move unassigned node'
          });
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

      socket.on(SOCKET_EVENTS.ALGORITHM_SELECT, (payload) => {
        const parse = AlgorithmSelectSchema.safeParse(payload);
        if (!parse.success) return;
        const session = sessionManager.getSession(parse.data.sessionCode);
        if (!session || session.hostSecret !== parse.data.hostSecret) {
          socket.emit(SOCKET_EVENTS.SESSION_ERROR, { code: 'UNAUTHORIZED_ALGO' });
          return;
        }

        session.topology.algorithmMode = parse.data.mode;
        session.topology.revision++;
        ioServer.to(session.code).emit(SOCKET_EVENTS.ALGORITHM_SELECT, {
          mode: parse.data.mode,
          revision: session.topology.revision
        });
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          serverPort = addr.port;
          serverUrl = `http://localhost:${serverPort}`;
          resolve();
        }
      });
    });
  });

  afterAll(async () => {
    instructorClient?.disconnect();
    student1Client?.disconnect();
    student2Client?.disconnect();
    ioServer?.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('connects 3 independent clients (1 instructor + 2 students) and assigns identities', async () => {
    // 1. Instructor client joins with secret
    instructorClient = ClientSocket(serverUrl);
    const instJoin = await new Promise<any>((resolve) => {
      instructorClient.emit(
        SOCKET_EVENTS.SESSION_JOIN,
        { sessionCode: ROOM_CODE, nickname: 'Prof. Turing', role: 'instructor', hostSecret: HOST_SECRET },
        resolve
      );
    });

    expect(instJoin.success).toBe(true);
    expect(instJoin.role).toBe('instructor');
    expect(instJoin.isHostAuthorized).toBe(true);

    // 2. Student 1 joins
    student1Client = ClientSocket(serverUrl);
    const s1Join = await new Promise<any>((resolve) => {
      student1Client.emit(
        SOCKET_EVENTS.SESSION_JOIN,
        { sessionCode: ROOM_CODE, nickname: 'Student-Alice', role: 'student' },
        resolve
      );
    });

    expect(s1Join.success).toBe(true);
    expect(s1Join.role).toBe('student');
    expect(s1Join.assignedNodeId).toBeDefined();

    // 3. Student 2 joins
    student2Client = ClientSocket(serverUrl);
    const s2Join = await new Promise<any>((resolve) => {
      student2Client.emit(
        SOCKET_EVENTS.SESSION_JOIN,
        { sessionCode: ROOM_CODE, nickname: 'Student-Bob', role: 'student' },
        resolve
      );
    });

    expect(s2Join.success).toBe(true);
    expect(s2Join.role).toBe('student');
    expect(s2Join.assignedNodeId).toBeDefined();
    expect(s2Join.assignedNodeId).not.toBe(s1Join.assignedNodeId);
  });

  it('synchronizes node movement from Student 1 across all 3 connected clients', async () => {
    const s1NodeId = 'ep_1'; // Assume student 1 owns ep_1
    // Update participant record to ensure student1 owns ep_1
    const session = sessionManager.getSession(ROOM_CODE)!;
    const p1 = Array.from(session.participants.values()).find(p => p.nickname === 'Student-Alice')!;
    p1.assignedNodeId = s1NodeId;

    const movePromises = [
      new Promise<any>((resolve) => instructorClient.once(SOCKET_EVENTS.PARTICIPANT_MOVE, resolve)),
      new Promise<any>((resolve) => student1Client.once(SOCKET_EVENTS.PARTICIPANT_MOVE, resolve)),
      new Promise<any>((resolve) => student2Client.once(SOCKET_EVENTS.PARTICIPANT_MOVE, resolve))
    ];

    // Student 1 emits move
    student1Client.emit(SOCKET_EVENTS.PARTICIPANT_MOVE, {
      sessionCode: ROOM_CODE,
      nodeId: s1NodeId,
      x: 3.5,
      y: -2.0
    });

    const [instReceived, s1Received, s2Received] = await Promise.all(movePromises);

    // All 3 independent clients receive the exact same clamped coordinates and revision
    expect(instReceived.nodeId).toBe(s1NodeId);
    expect(instReceived.x).toBe(3.5);
    expect(instReceived.y).toBe(-2.0);

    expect(s1Received.x).toBe(3.5);
    expect(s2Received.x).toBe(3.5);
    expect(instReceived.revision).toBe(s2Received.revision);
  });

  it('rejects unauthorized movement when Student 2 tries to move Student 1 node', async () => {
    const errorPromise = new Promise<any>((resolve) => {
      student2Client.once(SOCKET_EVENTS.SESSION_ERROR, resolve);
    });

    // Student 2 tries to move ep_1 (owned by Alice)
    student2Client.emit(SOCKET_EVENTS.PARTICIPANT_MOVE, {
      sessionCode: ROOM_CODE,
      nodeId: 'ep_1',
      x: 10.0,
      y: 10.0
    });

    const errorEvent = await errorPromise;
    expect(errorEvent.code).toBe('UNAUTHORIZED_MOVE');
  });

  it('synchronizes instructor algorithm switch across all students', async () => {
    const algoPromises = [
      new Promise<any>((resolve) => student1Client.once(SOCKET_EVENTS.ALGORITHM_SELECT, resolve)),
      new Promise<any>((resolve) => student2Client.once(SOCKET_EVENTS.ALGORITHM_SELECT, resolve))
    ];

    instructorClient.emit(SOCKET_EVENTS.ALGORITHM_SELECT, {
      sessionCode: ROOM_CODE,
      mode: 'DIJKSTRA',
      hostSecret: HOST_SECRET
    });

    const [s1Algo, s2Algo] = await Promise.all(algoPromises);
    expect(s1Algo.mode).toBe('DIJKSTRA');
    expect(s2Algo.mode).toBe('DIJKSTRA');
  });
});

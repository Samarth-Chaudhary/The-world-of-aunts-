/**
 * @file tests/integration/classroom_scale.test.ts
 * @description Hardening and Classroom Scale Integration Test:
 * Simulates 35 concurrent student clients + 1 instructor client connected
 * simultaneously to test join flow, concurrent movement, event throughput,
 * and measured socket latency under realistic classroom load.
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
  NetworkNode
} from '../../packages/shared/src/index';

describe('Phase 10 Hardening: 35 Concurrent Classroom Clients Stress Test', () => {
  let server: http.Server;
  let ioServer: SocketIOServer;
  let sessionManager: SessionManager;
  let serverPort: number;
  let serverUrl: string;

  const ROOM_CODE = 'CLASS35';
  const HOST_SECRET = 'secret-teacher-token-35';
  const NUM_STUDENTS = 35;

  let instructorClient: ClientSocketType;
  const studentClients: ClientSocketType[] = [];

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    ioServer = new SocketIOServer(server, {
      cors: { origin: '*' },
      pingInterval: 10000,
      pingTimeout: 5000
    });

    sessionManager = new SessionManager();
    sessionManager.createSession(ROOM_CODE, HOST_SECRET);

    ioServer.on('connection', (socket) => {
      socket.on(SOCKET_EVENTS.SESSION_JOIN, (payload, callback) => {
        const parse = SessionJoinSchema.safeParse(payload);
        if (!parse.success) return callback?.({ success: false, error: 'Validation failed' });

        const result = sessionManager.joinSession(
          parse.data.sessionCode,
          socket.id,
          parse.data.nickname,
          parse.data.role,
          parse.data.hostSecret
        );
        if (!result) return callback?.({ success: false, error: 'Session not found' });

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

        // Permissions: students may only move their own assigned node
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
    studentClients.forEach((s) => s.disconnect());
    await new Promise<void>((resolve) => ioServer.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('connects 1 instructor and 35 concurrent students successfully', async () => {
    const startTime = Date.now();

    // 1. Connect Instructor
    instructorClient = ClientSocket(serverUrl, { reconnection: false });
    await new Promise<void>((resolve) => {
      instructorClient.on('connect', () => {
        instructorClient.emit(
          SOCKET_EVENTS.SESSION_JOIN,
          {
            sessionCode: ROOM_CODE,
            nickname: 'Prof-Ada',
            role: 'instructor',
            hostSecret: HOST_SECRET
          },
          (res: any) => {
            expect(res.success).toBe(true);
            expect(res.role).toBe('instructor');
            expect(res.isHostAuthorized).toBe(true);
            resolve();
          }
        );
      });
    });

    // 2. Connect 35 Student clients concurrently in parallel
    const studentConnectPromises = Array.from({ length: NUM_STUDENTS }).map((_, index) => {
      return new Promise<void>((resolve, reject) => {
        const client = ClientSocket(serverUrl, { reconnection: false });
        studentClients.push(client);

        client.on('connect', () => {
          client.emit(
            SOCKET_EVENTS.SESSION_JOIN,
            {
              sessionCode: ROOM_CODE,
              nickname: `Student-${index + 1}`,
              role: 'student'
            },
            (res: any) => {
              if (res && res.success) {
                expect(res.role).toBe('student');
                expect(res.isHostAuthorized).toBe(false);
                expect(res.assignedNodeId).toBeDefined();
                resolve();
              } else {
                reject(new Error(`Student ${index + 1} join failed: ${res?.error}`));
              }
            }
          );
        });
      });
    });

    await Promise.all(studentConnectPromises);
    const totalHandshakeTime = Date.now() - startTime;

    expect(studentClients.length).toBe(NUM_STUDENTS);
    const session = sessionManager.getSession(ROOM_CODE);
    expect(session?.participants.size).toBe(NUM_STUDENTS + 1);

    // Assert handshake latency is reasonable (< 3000ms for 36 local connections)
    expect(totalHandshakeTime).toBeLessThan(3000);
  });

  it('handles high-frequency concurrent movement broadcasts without dropped updates', async () => {
    const session = sessionManager.getSession(ROOM_CODE);
    expect(session).toBeDefined();

    // Select 5 active student clients to simulate continuous position updates
    const activeTestClients = studentClients.slice(0, 5);
    const receivedMoves: any[] = [];

    instructorClient.on(SOCKET_EVENTS.PARTICIPANT_MOVE, (msg) => {
      receivedMoves.push(msg);
    });

    // Each client emits 5 moves
    const sendPromises = activeTestClients.map(async (client, cIdx) => {
      const part = session?.participants.get(client.id!);
      const nodeId = part?.assignedNodeId || 'ep_1';

      for (let step = 0; step < 5; step++) {
        client.emit(SOCKET_EVENTS.PARTICIPANT_MOVE, {
          sessionCode: ROOM_CODE,
          nodeId,
          x: Number((cIdx * 2.0 + step * 0.2).toFixed(2)),
          y: Number((step * 0.3).toFixed(2)),
          revision: step + 1
        });
        await new Promise((r) => setTimeout(r, 15));
      }
    });

    await Promise.all(sendPromises);

    // Allow network flush
    await new Promise((r) => setTimeout(r, 300));

    // Instructor must have received all broadcasts
    expect(receivedMoves.length).toBeGreaterThanOrEqual(25);
  });

  it('rejects student attempting to move an unauthorized node under load', async () => {
    const student1 = studentClients[0];
    const session = sessionManager.getSession(ROOM_CODE);
    const part = session?.participants.get(student1.id!);

    // Pick a node that does not belong to student 1 (e.g. gateway or unassigned)
    const unauthorizedNodeId = 'gw_1';

    let errorReceived: any = null;
    student1.on(SOCKET_EVENTS.SESSION_ERROR, (err) => {
      errorReceived = err;
    });

    student1.emit(SOCKET_EVENTS.PARTICIPANT_MOVE, {
      sessionCode: ROOM_CODE,
      nodeId: unauthorizedNodeId,
      x: 9.9,
      y: 9.9,
      revision: 99
    });

    await new Promise((r) => setTimeout(r, 150));

    expect(errorReceived).not.toBeNull();
    expect(errorReceived.code).toBe('UNAUTHORIZED_MOVE');
  });

  it('clamps out-of-bounds coordinates to simulation bounds [-14, 14] x [-12, 12]', async () => {
    const instructor = instructorClient;
    let clampedMoveResult: any = null;

    instructor.on(SOCKET_EVENTS.PARTICIPANT_MOVE, (msg) => {
      if (msg.nodeId === 'gw_1') {
        clampedMoveResult = msg;
      }
    });

    // Send coordinates outside [-14, 14] x [-12, 12] (e.g. x: 45.0, y: -35.0)
    instructor.emit(SOCKET_EVENTS.PARTICIPANT_MOVE, {
      sessionCode: ROOM_CODE,
      nodeId: 'gw_1',
      x: 45.0,
      y: -35.0,
      revision: 100
    });

    await new Promise((r) => setTimeout(r, 150));

    expect(clampedMoveResult).not.toBeNull();
    expect(clampedMoveResult.x).toBe(14);
    expect(clampedMoveResult.y).toBe(-12);
  });
});

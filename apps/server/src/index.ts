/**
 * @file index.ts
 * @description Node.js + Express + Socket.IO server for NEXUS Distributed Network Lab.
 * Enforces Zod runtime validation, host authorization, coordinate clamping,
 * rate limiting, and session snapshots.
 */

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import {
  SOCKET_EVENTS,
  SessionCreateSchema,
  SessionJoinSchema,
  ParticipantMoveSchema,
  AlgorithmSelectSchema,
  TopologyUpdateSchema,
  PacketCommandSchema,
  ScenarioCommandSchema,
  SimulationResetSchema,
  SnapshotRequestSchema
} from '@nexus/shared';
import { SessionManager } from './session/manager.js';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const sessionManager = new SessionManager();

// ============================================================================
// HEALTH & REST ENDPOINTS
// ============================================================================
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'nexus-server',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/sessions', (req, res) => {
  const parseResult = SessionCreateSchema.safeParse(req.body || {});
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid session payload', details: parseResult.error.errors });
  }

  const { roomCode } = parseResult.data;
  const session = sessionManager.createSession(roomCode);
  res.status(201).json({
    code: session.code,
    hostSecret: session.hostSecret,
    createdAt: session.createdAt
  });
});

app.get('/api/sessions/:code', (req, res) => {
  const session = sessionManager.getSession(req.params.code);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({
    code: session.code,
    instructorConnected: session.instructorSocketId !== null,
    participantCount: session.participants.size,
    createdAt: session.createdAt,
    topologyRevision: session.topology.revision
  });
});

// ============================================================================
// SOCKET.IO REAL-TIME BROKER
// ============================================================================
io.on('connection', (socket) => {
  // 1. Session Join
  socket.on(SOCKET_EVENTS.SESSION_JOIN, (payload, callback) => {
    const parseResult = SessionJoinSchema.safeParse(payload);
    if (!parseResult.success) {
      socket.emit(SOCKET_EVENTS.SESSION_ERROR, {
        code: 'VALIDATION_FAILED',
        message: 'Invalid session:join payload',
        details: parseResult.error.errors
      });
      if (typeof callback === 'function') callback({ success: false, error: 'Malformed join request' });
      return;
    }

    const { sessionCode, nickname, role, hostSecret } = parseResult.data;
    const result = sessionManager.joinSession(sessionCode, socket.id, nickname, role, hostSecret);

    if (!result) {
      socket.emit(SOCKET_EVENTS.SESSION_ERROR, {
        code: 'SESSION_NOT_FOUND',
        message: `Session '${sessionCode}' does not exist.`
      });
      if (typeof callback === 'function') callback({ success: false, error: 'Session not found' });
      return;
    }

    const { session, participant, isHostAuthorized } = result;
    socket.join(session.code);

    const snapshot = sessionManager.getSnapshot(session);

    if (typeof callback === 'function') {
      callback({
        success: true,
        participantId: participant.id,
        assignedNodeId: participant.assignedNodeId,
        role: participant.role,
        isHostAuthorized,
        hostSecret: isHostAuthorized ? session.hostSecret : undefined,
        snapshot
      });
    }

    // Broadcast presence update
    io.to(session.code).emit(SOCKET_EVENTS.PARTICIPANT_PRESENCE, {
      type: 'joined',
      participant: {
        id: participant.id,
        nickname: participant.nickname,
        role: participant.role,
        assignedNodeId: participant.assignedNodeId,
        status: 'connected',
        lastSeen: participant.lastSeen
      },
      totalParticipants: session.participants.size
    });
  });

  // 2. Snapshot Request (Full state recovery)
  socket.on(SOCKET_EVENTS.SESSION_SNAPSHOT_REQUEST, (payload) => {
    const parse = SnapshotRequestSchema.safeParse(payload);
    if (!parse.success) return;
    const session = sessionManager.getSession(parse.data.sessionCode);
    if (session) {
      socket.emit(SOCKET_EVENTS.SESSION_SNAPSHOT, sessionManager.getSnapshot(session));
    }
  });

  // 3. Participant Move (Rate-limited, role-checked, clamped)
  socket.on(SOCKET_EVENTS.PARTICIPANT_MOVE, (payload) => {
    const parseResult = ParticipantMoveSchema.safeParse(payload);
    if (!parseResult.success) {
      socket.emit(SOCKET_EVENTS.SESSION_ERROR, {
        code: 'INVALID_MOVE_PAYLOAD',
        message: 'Node position payload failed schema validation.'
      });
      return;
    }

    const { sessionCode, nodeId, x, y } = parseResult.data;
    const session = sessionManager.getSession(sessionCode);
    if (!session) return;

    // Rate limiting check (~35 updates/sec)
    if (!sessionManager.checkRateLimit(session, socket.id)) {
      return; // Drop excess update
    }

    const participant = session.participants.get(socket.id);
    if (!participant) return;

    // Permission check: Students may move ONLY their assigned node
    if (participant.role !== 'instructor' && participant.assignedNodeId !== nodeId) {
      socket.emit(SOCKET_EVENTS.SESSION_ERROR, {
        code: 'UNAUTHORIZED_MOVE',
        message: `Forbidden: you can move only your assigned node '${participant.assignedNodeId}'.`
      });
      return;
    }

    // Apply movement with coordinate clamping
    const moveResult = sessionManager.moveNode(session, nodeId, x, y);
    if (moveResult) {
      // Broadcast accepted movement to room
      io.to(session.code).emit(SOCKET_EVENTS.PARTICIPANT_MOVE, {
        nodeId,
        x: moveResult.updatedNode.x,
        y: moveResult.updatedNode.y,
        revision: moveResult.revision,
        participantId: participant.id
      });
    }
  });

  // 4. Authoritative Topology Update (Instructor only)
  socket.on(SOCKET_EVENTS.TOPOLOGY_UPDATE, (payload) => {
    const parseResult = TopologyUpdateSchema.safeParse(payload);
    if (!parseResult.success) return;

    const { sessionCode, revision, hostSecret, nodes, edges } = parseResult.data;
    const session = sessionManager.getSession(sessionCode);
    if (!session || session.hostSecret !== hostSecret) return;

    // Guard against stale revisions
    if (revision < session.topology.revision) {
      return; // Stale update rejected
    }

    session.topology.nodes = nodes as any;
    session.topology.edges = edges as any;
    session.topology.revision = revision;

    socket.to(session.code).emit(SOCKET_EVENTS.TOPOLOGY_UPDATE, {
      revision,
      nodes,
      edges
    });
  });

  // 5. Algorithm Mode Switch (Instructor only)
  socket.on(SOCKET_EVENTS.ALGORITHM_SELECT, (payload) => {
    const parseResult = AlgorithmSelectSchema.safeParse(payload);
    if (!parseResult.success) return;

    const { sessionCode, mode, hostSecret } = parseResult.data;
    const session = sessionManager.getSession(sessionCode);
    if (!session || session.hostSecret !== hostSecret) return;

    session.topology.algorithmMode = mode;
    session.topology.revision++;

    io.to(session.code).emit(SOCKET_EVENTS.ALGORITHM_SELECT, {
      mode,
      revision: session.topology.revision
    });
  });

  // 6. Packet Commands
  socket.on(SOCKET_EVENTS.PACKET_COMMAND, (payload) => {
    const parseResult = PacketCommandSchema.safeParse(payload);
    if (!parseResult.success) return;

    const { sessionCode, action, ratePerSec, sourceId, destinationId } = parseResult.data;
    const session = sessionManager.getSession(sessionCode);
    if (!session) return;

    io.to(session.code).emit(SOCKET_EVENTS.PACKET_COMMAND, {
      action,
      ratePerSec,
      sourceId,
      destinationId
    });
  });

  // 7. Scenario Command (Instructor only)
  socket.on(SOCKET_EVENTS.SCENARIO_COMMAND, (payload) => {
    const parseResult = ScenarioCommandSchema.safeParse(payload);
    if (!parseResult.success) return;

    const { sessionCode, scenarioId, hostSecret } = parseResult.data;
    const session = sessionManager.getSession(sessionCode);
    if (!session || session.hostSecret !== hostSecret) return;

    io.to(session.code).emit(SOCKET_EVENTS.SCENARIO_COMMAND, {
      scenarioId
    });
  });

  // 8. Simulation Reset (Instructor only)
  socket.on(SOCKET_EVENTS.SIMULATION_RESET, (payload) => {
    const parseResult = SimulationResetSchema.safeParse(payload);
    if (!parseResult.success) return;

    const { sessionCode, scope, hostSecret } = parseResult.data;
    const session = sessionManager.getSession(sessionCode);
    if (!session || session.hostSecret !== hostSecret) return;

    io.to(session.code).emit(SOCKET_EVENTS.SIMULATION_RESET, {
      scope
    });
  });

  // 9. Disconnect with Grace Period
  socket.on('disconnect', () => {
    const result = sessionManager.handleDisconnect(socket.id, (session, participant) => {
      // Grace period expired: notify room
      io.to(session.code).emit(SOCKET_EVENTS.PARTICIPANT_PRESENCE, {
        type: 'left',
        participantId: participant.id,
        totalParticipants: session.participants.size
      });
    });

    if (result) {
      const { session, participant, isInstructor } = result;

      // Broadcast temporary reconnecting status
      io.to(session.code).emit(SOCKET_EVENTS.PARTICIPANT_PRESENCE, {
        type: 'reconnecting',
        participantId: participant.id,
        isInstructor,
        totalParticipants: session.participants.size
      });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[NEXUS SERVER] Running on port ${PORT}`);
  console.log(`[NEXUS SERVER] Health endpoint: http://localhost:${PORT}/health`);
});

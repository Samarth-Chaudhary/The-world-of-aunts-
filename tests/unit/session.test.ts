/**
 * @file tests/unit/session.test.ts
 * @description Unit tests for SessionManager: host authorization,
 * student identity auto-assignment, permission enforcement, coordinate clamping,
 * rate limiting, and disconnection grace period.
 */

import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../apps/server/src/session/manager';

describe('Server Session & Authorization Engine', () => {
  it('creates sessions with unique room code and secure host secret', () => {
    const manager = new SessionManager();
    const session = manager.createSession('ROOM1');

    expect(session.code).toBe('ROOM1');
    expect(session.hostSecret).toBeDefined();
    expect(session.hostSecret.length).toBeGreaterThan(10);
    expect(session.topology.nodes).toHaveLength(6);
  });

  it('authorizes instructor ONLY with valid host secret; demotes unverified host claims', () => {
    const manager = new SessionManager();
    const session = manager.createSession('TEST1', 'super-secret-host-key');

    // 1. Legitimate instructor with correct secret
    const legitJoin = manager.joinSession('TEST1', 'sock_1', 'Professor', 'instructor', 'super-secret-host-key');
    expect(legitJoin).not.toBeNull();
    expect(legitJoin?.isHostAuthorized).toBe(true);
    expect(legitJoin?.participant.role).toBe('instructor');

    // 2. Impostor claiming instructor role without valid secret
    const fakeJoin = manager.joinSession('TEST1', 'sock_2', 'Attacker', 'instructor', 'wrong-secret');
    expect(fakeJoin).not.toBeNull();
    expect(fakeJoin?.isHostAuthorized).toBe(false);
    expect(fakeJoin?.participant.role).toBe('student'); // Demoted to student!
  });

  it('auto-assigns node identities to student participants', () => {
    const manager = new SessionManager();
    const session = manager.createSession('CLASS');

    const join1 = manager.joinSession('CLASS', 'sock_s1', 'Alice', 'student');
    const join2 = manager.joinSession('CLASS', 'sock_s2', 'Bob', 'student');

    expect(join1?.participant.assignedNodeId).toBeDefined();
    expect(join2?.participant.assignedNodeId).toBeDefined();
    expect(join1?.participant.assignedNodeId).not.toBe(join2?.participant.assignedNodeId);
  });

  it('clamps coordinates strictly within mathematical boundaries [-14, 14] x [-12, 12]', () => {
    const manager = new SessionManager();
    const session = manager.createSession('BOUNDS');

    // Attempt to move node way outside boundary (e.g. x=999, y=-500)
    const result = manager.moveNode(session, 'gw_1', 999, -500);
    expect(result).not.toBeNull();
    expect(result?.updatedNode.x).toBe(14.0);
    expect(result?.updatedNode.y).toBe(-12.0);

    // Coordinate inside boundary remains unchanged
    const resultNormal = manager.moveNode(session, 'gw_1', 3.5, 4.2);
    expect(resultNormal?.updatedNode.x).toBe(3.5);
    expect(resultNormal?.updatedNode.y).toBe(4.2);
  });

  it('enforces rate limiting on rapid updates (> 35 per second)', () => {
    const manager = new SessionManager();
    const session = manager.createSession('RATE');

    // First 35 updates pass
    for (let i = 0; i < 35; i++) {
      const allowed = manager.checkRateLimit(session, 'socket_rapid');
      expect(allowed).toBe(true);
    }

    // 36th update within the same second is rejected
    const excess = manager.checkRateLimit(session, 'socket_rapid');
    expect(excess).toBe(false);
  });

  it('manages disconnection grace period and restores identity on reconnection', () => {
    const manager = new SessionManager();
    const session = manager.createSession('RECONN');

    const joined = manager.joinSession('RECONN', 'sock_orig', 'Charlie', 'student')!;
    const pId = joined.participant.id;

    // Disconnect socket
    const disconnectResult = manager.handleDisconnect('sock_orig');
    expect(disconnectResult).not.toBeNull();
    expect(disconnectResult?.participant.status).toBe('reconnecting');

    // Reconnect with new socket ID before grace expires
    const reconnected = manager.reconnectParticipant('RECONN', 'sock_new', pId);
    expect(reconnected).not.toBeNull();
    expect(reconnected?.participant.status).toBe('connected');
    expect(reconnected?.participant.socketId).toBe('sock_new');
    expect(reconnected?.participant.nickname).toBe('Charlie');
  });
});

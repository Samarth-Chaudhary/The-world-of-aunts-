/**
 * @file validation/schemas.ts
 * @description Zod runtime validation schemas for the NEXUS real-time protocol.
 * Enforces strict typing, coordinate clamping, and authorization payload structure.
 */

import { z } from 'zod';

export const SessionCreateSchema = z.object({
  instructorName: z.string().min(1).max(50).default('Instructor'),
  roomCode: z.string().min(3).max(10).optional()
});

export const SessionJoinSchema = z.object({
  sessionCode: z.string().min(2).max(10).transform(s => s.trim().toUpperCase()),
  nickname: z.string().min(1).max(30).default('Student'),
  role: z.enum(['instructor', 'student']).default('student'),
  hostSecret: z.string().optional()
});

export const ParticipantMoveSchema = z.object({
  sessionCode: z.string().min(2).max(10).transform(s => s.trim().toUpperCase()),
  nodeId: z.string().min(1).max(50),
  x: z.number().min(-100).max(100),
  y: z.number().min(-100).max(100),
  revision: z.number().int().nonnegative().optional()
});

export const UpdateNodeRadiusSchema = z.object({
  sessionCode: z.string().min(2).max(10).transform(s => s.trim().toUpperCase()),
  nodeId: z.string().min(1).max(50),
  radius: z.number().min(1).max(20)
});

export const AlgorithmSelectSchema = z.object({
  sessionCode: z.string().min(2).max(10).transform(s => s.trim().toUpperCase()),
  mode: z.enum(['STP', 'DIJKSTRA', 'MST', 'STORM', 'MANUAL']),
  hostSecret: z.string().min(1, 'Host authentication token is required')
});

export const AlgorithmResultSchema = z.object({
  sessionCode: z.string().min(2).max(10).transform(s => s.trim().toUpperCase()),
  revision: z.number().int().nonnegative(),
  hostSecret: z.string().min(1),
  result: z.record(z.any())
});

export const TopologyUpdateSchema = z.object({
  sessionCode: z.string().min(2).max(10).transform(s => s.trim().toUpperCase()),
  revision: z.number().int().nonnegative(),
  hostSecret: z.string().min(1),
  nodes: z.array(z.record(z.any())),
  edges: z.array(z.record(z.any()))
});

export const PacketCommandSchema = z.object({
  sessionCode: z.string().min(2).max(10).transform(s => s.trim().toUpperCase()),
  action: z.enum(['send_one', 'start_continuous', 'pause', 'resume', 'stop', 'reset', 'set_rate']),
  ratePerSec: z.number().min(0.1).max(20).optional(),
  sourceId: z.string().optional(),
  destinationId: z.string().optional()
});

export const ScenarioCommandSchema = z.object({
  sessionCode: z.string().min(2).max(10).transform(s => s.trim().toUpperCase()),
  scenarioId: z.string().min(1),
  hostSecret: z.string().min(1, 'Host authentication token is required')
});

export const SimulationResetSchema = z.object({
  sessionCode: z.string().min(2).max(10).transform(s => s.trim().toUpperCase()),
  scope: z.enum(['scenario', 'network', 'session']),
  hostSecret: z.string().min(1, 'Host authentication token is required')
});

export const SnapshotRequestSchema = z.object({
  sessionCode: z.string().min(2).max(10).transform(s => s.trim().toUpperCase())
});

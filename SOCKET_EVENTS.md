# NEXUS Socket.IO Event Reference & Protocol Contracts

All events in NEXUS are strictly typed and runtime-validated using Zod schemas in `packages/shared/src/validation/schemas.ts`. Event strings are centralized in `SOCKET_EVENTS` (`packages/shared/src/types/index.ts`).

---

## 1. Event Contracts Table

| Event Name | Direction | Authorized Sender | Validation Schema | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `session:create` | Client -> Server | Instructor | `SessionCreateSchema` | Create a new session room with host secret. |
| `session:join` | Client -> Server | Anyone | `SessionJoinSchema` | Join session; server validates role and assigns node. |
| `session:snapshot` | Server -> Client | Server | `SessionSnapshot` | Full canonical state snapshot sent upon join/reconnect. |
| `session:snapshot:request` | Client -> Server | Authorized Member | `SnapshotRequestSchema` | Client requests authoritative state recovery. |
| `participant:move` | Client -> Server | Participant | `ParticipantMoveSchema` | Participant requests movement for their assigned node. |
| `participant:presence` | Server -> Client | Server | Runtime payload | Broadcasts join, reconnect, or leave events. |
| `node:update_radius` | Client -> Server | Instructor | `UpdateNodeRadiusSchema` | Instructor adjusts a node's proximity aura radius. |
| `algorithm:select` | Client -> Server | Instructor | `AlgorithmSelectSchema` | Instructor selects active protocol mode (STP, Dijkstra, MST, etc.). |
| `algorithm:result` | Client -> Server | Instructor | `AlgorithmResultSchema` | Instructor publishes computed algorithm state. |
| `topology:update` | Client -> Server | Instructor | `TopologyUpdateSchema` | Instructor publishes accepted graph revisions. |
| `packet:command` | Client -> Server | Instructor | `PacketCommandSchema` | Controls packet generation (send 1, stream, rate, pause, stop). |
| `scenario:command` | Client -> Server | Instructor | `ScenarioCommandSchema` | Loads, steps, or executes a preloaded classroom scenario. |
| `simulation:reset` | Client -> Server | Instructor | `SimulationResetSchema` | Executes scenario, network, or full session reset. |
| `session:error` | Server -> Client | Server | Runtime error | Rejects unauthorized actions, malformed payloads, rate violations. |

---

## 2. Event Payload Schemas & Validation Rules

### `session:join`
```typescript
{
  sessionCode: string;     // 2-10 chars, trimmed, uppercase
  nickname: string;        // 1-30 chars, default "Student"
  role: "instructor" | "student";
  hostSecret?: string;     // Required to obtain instructor permissions
}
```
- **Security Rule**: Clients claiming `role: 'instructor'` without a matching `hostSecret` are automatically demoted to `student` with an assigned node.

### `participant:move`
```typescript
{
  sessionCode: string;
  nodeId: string;
  x: number;               // -100 to 100 in schema, clamped to [-14.0, 14.0] by server
  y: number;               // -100 to 100 in schema, clamped to [-12.0, 12.0] by server
  revision?: number;       // Monotonically increasing sequence number
}
```
- **Permission Rule**: Students may only move their own assigned `nodeId`. Attempts to move any other node are rejected with `UNAUTHORIZED_MOVE`.
- **Rate Limit**: Maximum 35 events per second per socket connection. Excess messages are dropped.

### `algorithm:select`
```typescript
{
  sessionCode: string;
  mode: "STP" | "DIJKSTRA" | "MST" | "STORM" | "MANUAL";
  hostSecret: string;      // Verified server-side
}
```

### `simulation:reset`
```typescript
{
  sessionCode: string;
  scope: "scenario" | "network" | "session";
  hostSecret: string;
}
```
- `scenario`: Restores initial coordinates and parameters of active scenario.
- `network`: Resets network topology, clearing failures and temporary overrides while keeping participants connected.
- `session`: Authoritative atomic purge of all packets, metrics, event logs, and participant assignments.

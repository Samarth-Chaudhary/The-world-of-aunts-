# NEXUS System Architecture & State Authority Model

## 1. High-Level Architecture Overview

NEXUS operates as a real-time distributed application bridging a browser-based 3D simulation with multiple student devices connected over Socket.IO.

```
+-------------------------------------------------------------------------------+
|                       Instructor Command Center Browser                       |
|  - Maintains canonical graph computation state                                |
|  - Calculates candidate links from accepted coordinates (d <= r_A + r_B)       |
|  - Executes pure protocol algorithms: STP (802.1D), Dijkstra, Kruskal MST     |
|  - Manages deterministic packet simulation engine                             |
|  - Publishes versioned topology revisions to backend server                   |
+---------------------------------------+---------------------------------------+
                                        | WebSocket (Socket.IO)
                                        | Events: topology:update, algorithm:result, packet:state
+---------------------------------------v---------------------------------------+
|                         NEXUS Session Broker Server                           |
|  - Express HTTP server + persistent Socket.IO room manager                    |
|  - Runtime payload validation using Zod schemas                               |
|  - Role authorization: Instructor holds secret token; students have node IDs  |
|  - Rate limits participant movements (35 events/sec per node)                 |
|  - Enforces coordinate bounds: clamped to [-14.0, 14.0] x [-12.0, 12.0]       |
|  - Disconnection grace periods (15 seconds) & canonical snapshots             |
|  - NEVER runs Three.js or rendering code                                      |
+---------------------------------------+---------------------------------------+
                                        | WebSocket (Socket.IO)
                                        | Events: participant:move, session:snapshot, presence
+---------------------------------------v---------------------------------------+
|                         Student Mobile Viewports (x30-50)                     |
|  - Displays immediate local response to student node interaction              |
|  - Submits throttled position updates for assigned node only                  |
|  - Renders accepted shared state and interpolates remote movement             |
|  - 3D Viewport or accessible 2D Planar SVG Viewport                           |
|  - Reconnection detection and full state snapshot resynchronization           |
+-------------------------------------------------------------------------------+
```

---

## 2. State Authority Model & Invariants

1. **Graph Computation Authority**:
   - The instructor browser holds graph computation authority.
   - Algorithms (STP root elections, Dijkstra shortest paths, MST spanning trees, and packet progression) run on the instructor client using the pure `@nexus/shared` engine.
   - If the instructor browser disconnects, authoritative simulation changes pause and connected clients display a reconnecting status until the instructor reconnects or a fresh session is established.

2. **The Server is a Lightweight Broker**:
   - The server maintains room membership, verifies participant authentication, and caches the current canonical snapshot.
   - It validates every incoming payload against Zod runtime schemas before emitting to the room.
   - It strictly rejects unauthorized actions (e.g. students trying to change algorithm modes or move nodes other than their assigned device).

3. **Student Browser Responsibilities**:
   - Student clients can only control their assigned node.
   - Movement updates are throttled to 25 updates/sec and clamped within simulation boundary limits.
   - In student view, participants see their local 1-hop proximity neighbors and port statuses.

---

## 3. Strict State Domain Separation

To avoid synchronization defects, state in NEXUS is segmented into seven isolated domains:

| State Domain | Source of Truth | Synchronized Via | Description |
| :--- | :--- | :--- | :--- |
| **1. Session & Presence** | Backend Server | `session:join`, `participant:presence` | Active room codes, participant list, connection status, grace periods. |
| **2. Node Coordinates** | Client + Server Clamping | `participant:move` | 2D coordinates $(x, y)$ on the bounded plane $[-14, 14] \times [-12, 12]$. |
| **3. Candidate Graph** | Pure Math Function | Computed locally from $(x, y, r)$ | Planar proximity rule: $d(A, B) \le r_A + r_B$. |
| **4. Algorithm Results** | Instructor Engine | `algorithm:result` | Root bridge ID, RPC, RP/DP/AP port roles, shortest path hops, MST total weight. |
| **5. Packet Simulation** | Packet Engine | `packet:command`, `packet:state` | In-flight packets, progress $t \in [0, 1]$, delivered/dropped counts, storm replication. |
| **6. UI State** | Local React Component | Local state only | Selected node, open drawers, active tabs, camera angles. |
| **7. Render Transforms** | Three.js / SVG Canvas | Local animation frames | Mesh positions, line materials, pulse scales, and camera matrices. |

---

## 4. Reconnection & Resilience Protocol

1. **Connection Drops**:
   - When a student's socket disconnects, the server marks the participant status as `'reconnecting'` and starts a **15-second grace period timer**.
   - If the student reconnects within 15 seconds, their identity, nickname, and assigned node ID are preserved without creating a duplicate participant.
   - If the grace period expires, the participant is formally removed and the node is released for other students.

2. **Snapshot Resynchronization**:
   - On reconnect, if incremental event delivery fails, the client emits `session:snapshot:request`.
   - The server responds with the complete authoritative `SessionSnapshot`, resetting the client state cleanly without stale artifacts.

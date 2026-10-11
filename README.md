# The-world-of-aunts- — NEXUS Distributed Network Lab
**Interactive 3D Network Protocol Simulation & Multiplayer Classroom Lab**

NEXUS is an educational 3D network simulator designed for teaching distributed computer networking protocols in university classrooms. An instructor presents an interactive 3D command center on a lecture screen/projector while 30–50 students connect concurrently from mobile smartphones to act as virtual network bridges, routers, and endpoints.

---

## 🌟 Key Features

1. **State-Separated Protocol Engine**:
   - **Spanning Tree Protocol (STP)**: Full educational IEEE 802.1D model with Root Bridge election, Root Path Cost (RPC) calculation, Port Roles (Root Port `RP`, Designated Port `DP`, Alternate/Blocked Port `AP`), and deterministic link failover.
   - **Dijkstra Shortest Path**: Source-to-target lowest-cost path routing with selectable metrics (Euclidean distance, link capacity delay, manual costs) and deterministic tie-breaking.
   - **Minimum Spanning Tree (MST - Kruskal)**: Global infrastructure cost minimization with Disjoint-Set Union (DSU) and spanning forest handling for partitioned networks.
   - **Broadcast Storm Mode**: Bounded cyclic frame replication demonstration ($E - V + C$ loops) with strict packet, rate, hop, and lifetime safety caps.
   - **Manual Forwarding**: User-controlled link state configuration.

2. **Frame-Rate-Independent Packet Simulation**:
   - Discrete packet lifecycle: `created`, `in_transit`, `delivered`, `dropped`.
   - Realistic drop detection: drops packets on blocked STP ports (`blocked_port`), link failure during transit (`link_failed`), offline destination (`node_down`), or network partition (`no_route`).
   - Single send, continuous streaming with configurable rate (1–20 pkts/s), pause/resume, and real-time delivery metrics.

3. **Multiplayer Classroom Synchronization (Socket.IO)**:
   - Authority model: Instructor browser computes graph topology and runs algorithm engines; Node.js backend serves as a secure, lightweight broker validating Zod schemas, checking revisions, clamping coordinates ($[-14, 14] \times [-12, 12]$), and rate-limiting (35 events/s).
   - Mobile-first student interface: Virtual D-Pad / touch radar, 1-hop neighbor link states, personal assigned node badge, and connection recovery.
   - QR Code Join Workflow: Dynamic SVG QR code modal with customizable LAN IP for seamless mobile device onboarding.

4. **12 Preloaded Classroom Scenarios**:
   - *Simple Chain*, *Triangle Cycle*, *Dense Mesh*, *Alternative Route*, *Critical Bridge Failure*, *Network Partition*, *Dijkstra Comparison*, *MST Comparison*, *Broadcast Storm*, *Congestion Delay*, *Root Election*, and *Equal-Cost Paths*.
   - Run, Pause, Step, Replay, and 3 distinct Reset actions (*Reset Scenario*, *Reset Network*, *Reset Entire Session*).

5. **Visual Polish & Universal Accessibility**:
   - Retrained cinematic 3D lighting, camera angle presets (Isometric, Top-Down, Perspective).
   - High-contrast Projector Scaling Mode for lecture halls.
   - Accessible 2D Planar SVG Fallback view for devices without WebGL.
   - Reduced Motion mode for users sensitive to animations.
   - 16-term beginner-friendly interactive networking glossary.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (tested on Node v20 LTS and v24)
- npm v9+

### 1. Installation
```bash
git clone <repo-url>
cd nexus-network-lab
npm install
```

### 2. Start Services
Run backend and frontend in separate terminals:

```bash
# Terminal 1: Backend Session Server (Port 3001)
npm run dev:server

# Terminal 2: Frontend Web App (Port 5173)
npm run dev:web
```

- Open `http://localhost:5173` in your browser.
- Verify backend health at `http://localhost:3001/health`.

### 3. Running Automated Tests & Hardening
```bash
# Run complete test suite (54 unit and integration tests)
npm test

# Run strict TypeScript verification across all packages
npm run typecheck

# Build production bundles
npm run build
```

---

## 📂 Monorepo Structure

```
nexus-network-lab/
├── apps/
│   ├── server/             # Express + Socket.IO validation broker
│   │   ├── src/
│   │   │   ├── session/    # In-memory session manager, grace period, snapshots
│   │   │   └── index.ts    # Server entrypoint with Zod event validation
│   │   └── package.json
│   └── web/                # React 18 + React Three Fiber + TailwindCSS frontend
│       ├── src/
│       │   ├── app/        # App shell and layout manager
│       │   ├── components/ # TopBar, LeftPanel, RightPanel, BottomBar, StudentView, QRCodeModal, Fallback2DView
│       │   ├── scene/      # 3D R3F Viewport: NetworkScene, NetworkNode3D, NetworkEdge3D, NetworkPacket3D
│       │   ├── state/      # Reactive Zustand store (networkStore)
│       │   └── styles/     # Design system and projector mode CSS
│       └── package.json
├── packages/
│   └── shared/             # Pure algorithm and protocol contracts
│       ├── src/
│       │   ├── algorithms/ # computeSTP, computeDijkstra, computeMST, computeStorm
│       │   ├── graph/      # Planar Euclidean distance & candidate graph builder
│       │   ├── simulation/ # Pure PacketSimulationEngine
│       │   ├── scenarios/  # 12 preloaded classroom scenarios
│       │   ├── validation/ # Zod runtime schemas for all socket events
│       │   └── types/      # NetworkNode, NetworkEdge, AlgorithmResult, SOCKET_EVENTS
│       └── package.json
├── tests/
│   ├── unit/               # Pure graph, STP, Dijkstra, MST, storm, packet, scenario tests
│   └── integration/        # 35-client stress test, multi-client sync, failure & reset tests
├── docs/                   # Documentation and guides
├── Dockerfile              # Multi-stage production Dockerfile
├── docker-compose.yml      # Local container orchestration
└── package.json            # npm workspaces root
```

---

## 📚 Documentation Reference Links

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System boundaries, state authority model, and data flow.
- [ALGORITHMS.md](./docs/ALGORITHMS.md) — Mathematical specifications of STP, Dijkstra, MST, and storm engine.
- [SOCKET_EVENTS.md](./docs/SOCKET_EVENTS.md) — Event contracts, Zod schemas, permissions, and revision semantics.
- [LOCAL_SETUP.md](./docs/LOCAL_SETUP.md) — Step-by-step local development and air-gapped Wi-Fi setup.
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) — Production hosting, CORS, HTTPS, Docker, and health checks.
- [CLASSROOM_GUIDE.md](./docs/CLASSROOM_GUIDE.md) — Operating guide for educators, scenarios walkthrough, and scripts.

# NEXUS Classroom Operating Guide & Scenario Demonstration Scripts

This guide provides instructors with step-by-step procedures to run interactive networking lab lectures using NEXUS.

---

## 1. Pre-Lecture Setup (5 Minutes Before Class)

1. Connect the instructor laptop to the lecture hall projector.
2. Start the backend and web services:
   ```bash
   npm run dev:server
   npm run dev:web -- --host 0.0.0.0
   ```
3. Open `http://localhost:5173` on the instructor laptop.
4. Click **Invite** in the top navigation bar to display the **Classroom Join QR Code**.
5. Enter the laptop's LAN IP (e.g. `192.168.1.50`) so phones can connect over classroom Wi-Fi.
6. Toggle **Projector Mode** in the top-right overlay to scale typography, labels, and line widths for auditorium visibility.

---

## 2. Walkthrough Scripts for the 12 Classroom Scenarios

### Scenario 1: Simple Chain (One Obvious Path)
- **Concept**: Baseline path formation across linearly aligned nodes.
- **Action**: Select *Simple Chain (1)* from the presets dropdown.
- **Instruction**: Ask students: "If Node A wants to reach Node D, what is the path?" Click **Send 1** to show single packet traversal.

### Scenario 2: Triangle Cycle (Loop Prevention)
- **Concept**: Three switches with redundant connections ($A \leftrightarrow B \leftrightarrow C \leftrightarrow A$).
- **Action**: Load *Triangle Cycle (2)* in **STP** mode.
- **Instruction**: Direct attention to the red dashed edge with the `BLK` badge. Explain why STP blocks this port: without it, broadcast frames would circulate infinitely.

### Scenario 3: Dense Mesh (Connected Graph vs Loop-Free Topology)
- **Concept**: A dense 5-node complete mesh with 10 candidate edges.
- **Action**: Load *Dense Mesh (3)* in **STP** mode.
- **Instruction**: Contrast the 10 geometric candidate edges with the exactly $V - 1 = 4$ forwarding links selected by STP. All other redundant edges are placed in blocking state.

### Scenario 4: Alternative Route (Active Link Failure & Recovery)
- **Concept**: Dynamic self-healing layer-2 topology.
- **Action**: Load *Alternative Route (4)*. Note the active forwarding path and the blocked alternate link.
- **Demonstration**: Click **Fail** on the active primary bridge.
- **Result**: Observe the blocked alternate port instantly transition from `BLK` to `FWD`. Click **Send 1** to verify packets now reach the target across the backup path.

### Scenario 5: Critical Bridge Failure (Node Loss & Rerouting)
- **Concept**: Intermediate bridge failure.
- **Action**: Load *Critical Bridge Failure (5)*.
- **Instruction**: Turn off the intermediate core switch. In Dijkstra mode, show route loss; then restore node to demonstrate deterministic recovery.

### Scenario 6: Network Partition (Unreachable Target)
- **Concept**: Disconnected graph components.
- **Action**: Load *Network Partition (6)*.
- **Instruction**: In Dijkstra mode, attempt sending a packet across the partition. The packet engine immediately aborts/drops with reason `'no_route'`. In MST mode, observe the **Spanning Forest** indicator with 2 components.

### Scenario 7: Dijkstra Comparison (Path Costs vs Hop Counts)
- **Concept**: Shortest physical distance vs highest bandwidth / lowest delay.
- **Action**: Load *Dijkstra Comparison (7)*.
- **Instruction**: Toggle between **Distance Metric** and **Capacity Metric** in the top navigation. Show how changing the cost metric alters the chosen path between source and target!

### Scenario 8: MST Comparison (Global Infrastructure Optimization)
- **Concept**: Kruskal MST minimizes total link expenditure $\sum w(e)$.
- **Action**: Load *MST Comparison (8)* in **MST** mode, then compare with **Dijkstra** mode.
- **Teaching Point**: An MST minimizes global wiring costs, but does not guarantee the shortest point-to-point route for every pair of endpoints.

### Scenario 9: Broadcast Storm (Loop Prevention Disabled)
- **Concept**: Why Spanning Tree Protocol is essential.
- **Action**: Load *Broadcast Storm (9)* in **STORM** mode.
- **Instruction**: Point out the cyclomatic loop counter ($E - V + C$). Click **Send 1** to observe duplicated packet forwarding.
- **Safety**: Demonstrate the built-in bounds (50 packet cap, 6 hops max) and click **Stop** to halt replication immediately.

### Scenario 10: Congestion Delay (Queue & Utilization)
- **Concept**: Buffer queuing delay when traffic volume exceeds link capacity.
- **Action**: Load *Congestion (10)*. Start continuous packet generation at 10 pkts/s to observe delay accumulation and buffer saturation.

### Scenario 11: Root Election (Bridge Priority & Deterministic Selection)
- **Concept**: How modifying bridge priority forces root bridge handover.
- **Action**: Load *Root Election (11)*.
- **Demonstration**: In the left panel, click the `-` priority button on `Switch-Beta` to lower its priority from `32768` to `4096`.
- **Result**: `Switch-Beta` instantly becomes the elected Root Bridge, and all non-root bridges recompute their Root Ports toward Beta!

### Scenario 12: Equal-Cost Paths (Deterministic Tie-Breaking)
- **Concept**: Predictable routing when two alternate routes have identical cumulative costs.
- **Action**: Load *Equal-Cost Paths (12)*.
- **Instruction**: Explain how lexicographical node/port ID ordering guarantees deterministic, repeatable behavior without route flapping.

---

## 3. Reset Controls Reference

NEXUS provides three clearly separated reset controls in the top navigation bar:

1. **Reset Scenario**:
   - Resets nodes, coordinates, weights, and algorithm mode to the initial baseline of the *active preset scenario*.
   - Clears in-flight packets. Keeps room participants connected.
2. **Reset Network**:
   - Clears all simulated node/edge failure flags, unpins custom root assignments, and restores the standard 6-node test network topology.
   - Preserves session room membership and active participants.
3. **Reset Entire Session**:
   - Performs a complete, authoritative atomic purge of all packets, simulation metrics, event logs, and participant assignments.
   - Cleanses the session state completely.

# NEXUS Algorithm Specifications, Educational Models & Limitations

## 1. Global Algorithm Invariants

NEXUS teaches students the mathematical distinctions between graph algorithms in distributed systems. Under no circumstances are STP, Dijkstra, and MST presented as interchangeable.

| Dimension | STP (IEEE 802.1D Educational Model) | Dijkstra Shortest Path | Minimum Spanning Tree (Kruskal) |
| :--- | :--- | :--- | :--- |
| **Objective** | Create a loop-free layer-2 broadcast topology | Find lowest-cost path from single source to destination | Minimize sum of all edge weights in entire network |
| **Edge Decision** | Disables redundant ports; physical link remains visible | Marks active route hops; other links remain viable | Selects $V - 1$ global links; non-selected edges remain candidate |
| **Port State** | Forwarding (`FWD`), Blocking (`BLK`), Alternate (`AP`), Root Port (`RP`) | N/A (all route links forward traffic) | N/A (tree edges forward, non-tree edges inactive) |
| **Tie-Breaking** | Lowest bridge priority -> lowest MAC (`bridgeId`) -> lowest port ID | Deterministic node ID lexicographical ordering | Edge index in sorted weight array |
| **Failure Response** | Dynamic convergence: blocked ports transition to forwarding | Recalculates alternate shortest path or flags unreachable partition | Spanning forest returned if disconnected |

---

## 2. Spanning Tree Protocol (STP) Educational Model

STP is **NOT** "remove the longest edge from every cycle". NEXUS implements an educational adaptation of IEEE 802.1D:

### Step 1: Root Bridge Election
- Every switch broadcasts BPDUs containing `(bridgePriority, bridgeId)`.
- The switch with the lowest numeric priority (default `32768`, Gateway `4096`) wins election.
- **Tie-Breaker**: If priorities match, the switch with the lexicographically smallest `bridgeId` (e.g. `00:0a:01`) wins.
- Instructors can pin a root bridge or adjust bridge priorities (`+4096` / `-4096`) to demonstrate election transitions in real time.

### Step 2: Root Path Cost (RPC)
- Each switch determines its lowest cost path to the elected Root Bridge:
  $$\text{RPC}(v) = \min_{u \in \text{neighbors}(v)} (\text{RPC}(u) + \text{cost}(u, v))$$
- Root Bridge RPC is always `0`.

### Step 3: Port Role & State Assignment
- **Root Port (RP)**: On every non-root bridge, exactly one port offering the lowest RPC to the Root is assigned as the Root Port (Forwarding).
- **Designated Port (DP)**: On each physical segment connecting two switches, the switch with the lower RPC to the root assigns its port as Designated (Forwarding).
- **Alternate / Blocked Port (AP / BLK)**: Redundant ports that are neither RP nor DP are placed into the **Blocking** state.
- **Physical Link Preservation**: Blocking a port does **not** erase the physical edge. The edge is drawn as a crimson dashed line with a `BLK` badge. Packets attempting traversal across a blocked port are immediately dropped by the packet engine with reason `'blocked_port'`.

---

## 3. Dijkstra Shortest Path Routing

- Operates on the candidate proximity graph $G = (V, E)$.
- Evaluates shortest paths using configurable cost models:
  1. **Euclidean Distance Metric**: $w(e) = \sqrt{(x_1 - x_2)^2 + (y_1 - y_2)^2}$.
  2. **Capacity / Queuing Metric**: Synthetic queue delay representing interface bandwidth.
  3. **Manual Cost**: User-configured integer weights.
- **Partition Handling**: If source and destination belong to different connected components, Dijkstra returns `{ reachable: false, totalCost: Infinity, pathNodeIds: [] }`.
- Packet engine drops any packet routed to an unreachable partition with reason `'no_route'`.

---

## 4. Minimum Spanning Tree (MST - Kruskal)

- Implements Kruskal's algorithm using a Disjoint-Set Union (DSU) structure with rank optimization and path compression.
- Edges are sorted in non-decreasing order of weight.
- Spanning Forest: If the graph contains $C > 1$ disconnected components, Kruskal constructs an MST for each component, resulting in a **Spanning Forest** of $V - C$ total edges.

---

## 5. Broadcast Storm Model (Loop-Prevention Disabled)

- Demonstrates the failure mode that STP was engineered to prevent.
- When loop prevention is disabled:
  - All ports forward frames unconditionally.
  - Number of fundamental cyclomatic loops is calculated:
    $$M = |E| - |V| + C$$
  - Every broadcast packet arriving at a switch with degree $k$ replicates into $k - 1$ duplicate packets.
- **Safety Caps & Bounds**:
  - Maximum packet cap: 50 packets total.
  - Maximum hop limit: 6 hops.
  - Lifetime limit: 8.0 seconds.
  - Immediate `Stop` and `Reset` action available in the UI.

---

## 6. Documented Limitations & Teaching Abstractions

1. **Planar Proximity vs Real Wireless RF**:
   - NEXUS uses the Euclidean geometric formula $d \le r_A + r_B$ to form candidate connections.
   - This represents a teaching abstraction for ad-hoc proximity. It does not measure physical radio frequency attenuation, multipath interference, or hardware RSSI.
2. **Synthetic Queue Latency vs Network Ping**:
   - The route delay reported in the packet engine is simulated transmission time based on metric weights. It is labeled separately from measured WebSocket latency between browser and server.
3. **Bridge Priority Steps**:
   - In accordance with IEEE 802.1t, bridge priority increments/decrements in blocks of `4096`.

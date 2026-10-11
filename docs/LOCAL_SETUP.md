# NEXUS Local Setup & Classroom Network Configuration Guide

## 1. System Requirements

- **Operating System**: Windows 10/11, macOS 12+, or Ubuntu 20.04+
- **Node.js**: v18.0.0 or later (Node.js 20 LTS recommended)
- **npm**: v9.0.0 or later

---

## 2. Step-by-Step Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd nexus-network-lab

# 2. Install monorepo dependencies across all workspaces
npm install

# 3. Verify toolchain and compile all TypeScript packages
npm run typecheck
```

---

## 3. Local Development (Single Machine)

Start backend server and web application in separate terminal windows:

### Terminal 1: Backend Session Server (Port 3001)
```bash
npm run dev:server
```
Output:
```
[NEXUS SERVER] Running on port 3001
[NEXUS SERVER] Health endpoint: http://localhost:3001/health
```

### Terminal 2: Web Frontend Command Center (Port 5173)
```bash
npm run dev:web
```
Access the application at `http://localhost:5173`.

---

## 4. Classroom Wi-Fi Network Setup (Phones Connecting to Laptop)

In a physical classroom or lecture hall where students join from their smartphones:

### Step 1: Find Laptop's Local Area Network (LAN) IP
- **Windows**: Open PowerShell or Command Prompt and run `ipconfig`. Find your Wi-Fi adapter's **IPv4 Address** (e.g. `192.168.1.50`).
- **macOS / Linux**: Open Terminal and run `ipconfig getifaddr en0` or `hostname -I` (e.g. `192.168.1.50`).

### Step 2: Bind Development Servers to `0.0.0.0`
To allow phones on the same Wi-Fi router to reach your laptop:
```bash
# In apps/web: run with host flag
npm run dev:web -- --host 0.0.0.0
```

### Step 3: Configure Reachable Backend URL
In `apps/web/.env` or via Vite environment variables:
```env
VITE_SERVER_URL=http://192.168.1.50:3001
```

### Step 4: Display Classroom Join QR Code
1. Open the instructor dashboard at `http://localhost:5173`.
2. Click the **Invite** button next to the **ROOM** badge in the top navigation bar.
3. In the QR Code Modal, enter your laptop's LAN IP (`192.168.1.50`) into the **Host / LAN IP** field.
4. The QR code dynamically updates to `http://192.168.1.50:5173/?room=DEMO&role=student`.
5. Students scan the QR code with their mobile device camera.

### Critical Classroom Wi-Fi Notes:
- **`localhost` Trap**: A student's smartphone browsing to `http://localhost:5173` looks for a web server running *on the smartphone itself*. Always use the instructor's LAN IP or a deployed domain in the QR code.
- **Client Isolation**: Some university campus guest networks enforce AP client isolation, preventing peer-to-peer communication between laptops and phones. If connections are blocked by campus Wi-Fi, use a portable Wi-Fi hotspot, mobile phone tethering, or deploy to a public hosting URL (see `DEPLOYMENT.md`).
- **Firewall**: Ensure the Windows Defender or macOS firewall allows incoming connections on ports `3001` (backend) and `5173` (frontend).

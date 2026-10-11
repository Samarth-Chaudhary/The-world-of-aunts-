# NEXUS Production Deployment & Hosting Guide

## 1. Hosting Architecture Overview

NEXUS consists of two deployable units:
1. **Frontend (`@nexus/web`)**: Static Single-Page Application (HTML, CSS, JS, Three.js). Can be hosted on any static edge CDN (Vercel, Netlify, Cloudflare Pages, AWS S3 + CloudFront, or Nginx).
2. **Backend (`@nexus/server`)**: Persistent Node.js process with active Socket.IO WebSocket connections. Must be hosted on a persistent compute provider (Render, Fly.io, Railway, DigitalOcean App Platform, or AWS ECS/EC2).

---

## 2. Environment Variables Specification

### Server (`apps/server/.env`)
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | `3001` | TCP port for HTTP and WebSocket traffic. |
| `HOST` | Optional | `0.0.0.0` | Network interface to bind. |
| `CLIENT_ORIGIN` | Optional | `*` | Allowed CORS origin (e.g. `https://nexus.youruniversity.edu`). |
| `HOST_SECRET` | Required in prod | N/A | Privileged authorization secret required for instructor actions. |
| `NODE_ENV` | Optional | `production` | Set to `production` for production optimizations. |

### Web Frontend (`apps/web/.env`)
| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_SERVER_URL` | Required in prod | `http://localhost:3001` | Public HTTPS/WSS URL of the persistent session backend. |

> [!WARNING]
> Never place server secrets or `HOST_SECRET` into `VITE_` variables. All `VITE_` variables are bundled into client JavaScript and publicly visible in student browsers.

---

## 3. Production Deployment Options

### Option A: Containerized Deployment via Docker & Docker Compose
The repository includes a production multi-stage `Dockerfile` and `docker-compose.yml`:

```bash
# Build and start both backend and frontend containers
docker compose up -d --build

# Inspect logs
docker compose logs -f

# Verify backend health check
curl -f http://localhost:3001/health
```

### Option B: Cloud Hosting (Render / Railway / Fly.io)
1. **Deploy Backend (`apps/server`)**:
   - Create a Web Service pointing to `apps/server`.
   - Build Command: `npm install && npm run build --workspace=@nexus/shared && npm run build --workspace=@nexus/server`
   - Start Command: `node apps/server/dist/index.js`
   - Set environment variable `PORT=3001` and `HOST_SECRET=<your-random-token>`.
   - Note the assigned backend URL: `https://nexus-server.onrender.com`.

2. **Deploy Frontend (`apps/web`)**:
   - Create a Static Site pointing to `apps/web`.
   - Build Command: `npm install && npm run build --workspace=@nexus/shared && npm run build --workspace=@nexus/web`
   - Publish Directory: `apps/web/dist`
   - Set environment variable `VITE_SERVER_URL=https://nexus-server.onrender.com`.
   - Note the frontend URL: `https://nexus-lab.vercel.app`.

3. **Update Backend CORS**:
   - On the backend service, set `CLIENT_ORIGIN=https://nexus-lab.vercel.app`.

---

## 4. HTTPS, WSS & Security Best Practices

- In production, always serve both frontend and backend over **HTTPS** / **WSS**.
- Modern mobile browsers require HTTPS for certain Web APIs and camera permissions.
- Socket.IO automatically upgrades to secure WebSockets (`wss://`) when the page is served over `https://`.
- In-Memory State Note: The prototype stores session state in memory. If the backend process restarts during class, active session state is cleared. Students will automatically reconnect and request a fresh snapshot. For enterprise multi-server horizontal scaling, a Redis Socket.IO adapter can be introduced.

# Multi-stage Dockerfile for NEXUS Distributed Network Lab
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/server/package*.json ./apps/server/
COPY apps/web/package*.json ./apps/web/
RUN npm ci

COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY apps/web ./apps/web

RUN npm run build --workspace=@nexus/shared
RUN npm run build --workspace=@nexus/server
RUN npm run build --workspace=@nexus/web

# Target 1: Node.js Socket.IO Session Server
FROM node:20-alpine AS server
WORKDIR /app
COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=base /app/apps/server/dist ./apps/server/dist
COPY --from=base /app/apps/server/package.json ./apps/server/package.json

EXPOSE 3001
CMD ["node", "apps/server/dist/index.js"]

# Target 2: Static Web Client via Nginx
FROM nginx:alpine AS web
COPY --from=base /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

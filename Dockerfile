# syntax=docker/dockerfile:1
# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build
#   Installs all dependencies (including dev) and compiles TypeScript → dist/
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests first so Docker can cache the install layer
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — Production
#   Lean image: only compiled JS + production node_modules
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production

# docker-cli is needed so this server can spawn the official SonarQube MCP
# server container (mcp/sonarqube) at runtime via the mounted Docker socket.
# curl + tar are used below to fetch the Aikido MCP tarball directly from npm.
RUN apk add --no-cache docker-cli curl tar

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Bake the official Aikido MCP server (@aikidosec/mcp) into the image.
# We fetch the tarball directly rather than installing via npm because the
# package declares platform-specific optional deps (e.g. @esbuild/aix-ppc64)
# in its npm-shrinkwrap.json that cause `npm ci` to fail cross-platform.
# The published tarball contains a pre-bundled dist/index.js — no build needed.
RUN mkdir -p /opt/aikido-mcp \
    && curl -sSL https://registry.npmjs.org/@aikidosec/mcp/-/mcp-1.0.5.tgz \
       | tar -xz -C /opt/aikido-mcp --strip-components=1

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# MCP servers communicate over stdio — no ports to expose
# All configuration is injected via environment variables at runtime

CMD ["node", "dist/index.js"]

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

# Run as non-root for security
RUN addgroup -S mcp && adduser -S mcp -G mcp

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Drop to non-root user
USER mcp

# MCP servers communicate over stdio — no ports to expose
# All configuration is injected via environment variables at runtime

CMD ["node", "dist/index.js"]

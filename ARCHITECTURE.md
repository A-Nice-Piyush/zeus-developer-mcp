# Architecture — How Zeus MCP Works

This document explains how the server is structured, how one Docker image ends up spawning multiple child processes, and how all their tools appear as a single flat list to the AI.

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Your Machine                                                       │
│                                                                     │
│  AI Editor (VS Code / Claude Code)                                  │
│       │                                                             │
│       │  MCP protocol (JSON-RPC over stdio)                         │
│       ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  zeus-mcp  (Docker container)                               │   │
│  │                                                             │   │
│  │  Node.js process — src/index.ts                             │   │
│  │       │                                                     │   │
│  │       └── src/server.ts  (createServer)                     │   │
│  │              │                                              │   │
│  │              ├── Jira tools          (direct HTTP)          │   │
│  │              ├── Confluence tools    (direct HTTP)          │   │
│  │              ├── Veracode tools      (direct HTTP)          │   │
│  │              │                                              │   │
│  │              ├── SonarQube proxy ──────────────────────────────►│
│  │              │   spawns child:                              │   │
│  │              │   docker run mcp/sonarqube                   │   │
│  │              │                                              │   │
│  │              └── Aikido proxy                               │   │
│  │                  spawns child:                              │   │
│  │                  npx @aikidosec/mcp                         │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────┐   ┌─────────────────────┐                 │
│  │  mcp/sonarqube      │   │  @aikidosec/mcp      │                 │
│  │  (Docker container) │   │  (npx process)       │                 │
│  └─────────────────────┘   └─────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Startup Sequence

When the AI editor launches the MCP server, this is the exact sequence of events:

```
1. Editor runs:
   docker run --rm -i -v /var/run/docker.sock:/var/run/docker.sock ... zeus-mcp:latest

2. Container starts → node dist/index.js
   └─ loads .env / environment variables
   └─ calls createServer(config)  [src/server.ts]

3. createServer() runs sequentially:
   a. Creates McpServer instance
   b. Registers Jira tools      (immediate, no I/O)
   c. Registers Confluence tools (immediate, no I/O)
   d. Registers Veracode tools   (immediate, if env vars set)
   e. await registerSonarQubeMcpProxy(server)
      └─ checks SONARQUBE_TOKEN
      └─ spawns: docker run --init --rm -i mcp/sonarqube
      └─ connects MCP client to that container via stdio
      └─ calls tools/list on the SonarQube server
      └─ gets back 60+ tool definitions
      └─ registers each tool in our server (with default project key injection)
   f. await registerAikidoMcpProxy(server)
      └─ checks AIKIDO_API_KEY
      └─ spawns: npx -y @aikidosec/mcp
      └─ connects MCP client to that process via stdio
      └─ calls tools/list on the Aikido server
      └─ gets back tool definitions
      └─ registers each tool in our server

4. Server connects to StdioServerTransport
5. Editor receives the full tool list — one flat list of 30+ tools
6. "Zeus MCP server started on stdio" logged to stderr
```

---

## The Proxy Mechanism

The SonarQube and Aikido integrations use a **proxy pattern** rather than a custom client. Here's why and how:

### Why proxy instead of a custom client?

Both SonarQube and Aikido publish their own official MCP servers. Rather than re-implementing their APIs (which would mean maintaining API clients, keeping up with API changes, and duplicating schema definitions), we proxy the official servers. This means:

- We always get the full, up-to-date tool set from the official server
- Bug fixes and new tools from the vendor arrive automatically on next pull
- We don't own any SonarQube or Aikido API client code

### How the proxy works

Each proxy (`src/tools/sonarqube/proxy.ts`, `src/tools/aikido/proxy.ts`) does the same four things:

**Step 1 — Spawn the upstream server as a child process**

```
SonarQube:  docker run --init --rm -i -e SONARQUBE_TOKEN ... mcp/sonarqube
Aikido:     npx -y @aikidosec/mcp
```

The child process communicates over stdio using the MCP JSON-RPC protocol, just like our server does with the editor.

**Step 2 — Connect as an MCP client**

We use `@modelcontextprotocol/sdk`'s `Client` + `StdioClientTransport` to connect to the child process. Zeus acts as both a server (to the editor) and a client (to the child).

**Step 3 — Discover all tools**

We call `client.listTools()`. This returns the complete list of tool names, descriptions, and JSON Schema input definitions from the upstream server.

**Step 4 — Re-register each tool in our server**

For every tool the upstream server exposes, we register an identical tool in our `McpServer`. When the tool is called:
1. Our handler receives the arguments
2. It calls `client.callTool({ name, arguments })` on the upstream server
3. It returns the result directly to the editor

The editor never knows there are child processes — it just sees a flat list of tools.

```
Editor calls: search_sonar_issues_in_projects({ projectKey: "my-project" })
                       │
                       ▼
              Zeus handler (proxy)
                       │
                       ▼
              client.callTool("search_sonar_issues_in_projects", args)
                       │  JSON-RPC over stdio
                       ▼
              mcp/sonarqube container
                       │
                       ▼
              SonarQube REST API
                       │
                       ▼  (result flows back up the same chain)
              Editor receives result
```

### JSON Schema → Zod conversion

MCP tool schemas are defined in JSON Schema. Our `McpServer` (from the SDK) expects Zod schemas. Each proxy has a `jsonSchemaToZod()` function that converts the upstream JSON Schema properties into equivalent Zod types so they can be registered correctly.

---

## Default Project Key Injection (SonarQube)

The SonarQube proxy adds one extra behaviour: when `SONARQUBE_PROJECT_KEY` is set, it inspects each tool's schema for optional project-identifier parameters (`projectKey`, `component`, `project`, `componentKey`). If the caller omits one of those, the proxy fills it in with the configured default before forwarding the call.

This means you never have to tell the AI "the project key is X" — it just works.

---

## Why the Docker Socket Mount?

```
-v /var/run/docker.sock:/var/run/docker.sock
```

Zeus runs inside a Docker container. When it needs to spawn the SonarQube MCP server, it runs `docker run mcp/sonarqube`. To do that from inside a container, it needs access to the **host's Docker daemon** — which is exposed via the Unix socket at `/var/run/docker.sock`.

By mounting the socket into the Zeus container, `docker` commands inside the container talk to the same Docker daemon that's running on your machine. The SonarQube container spawned this way appears alongside zeus-mcp in `docker ps` — it's a sibling container on the host, not a nested one.

```
Host Docker daemon
    │
    ├── zeus-mcp container  (you started this)
    │       │
    │       └── calls docker via /var/run/docker.sock
    │
    └── mcp/sonarqube container  (Zeus started this, runs on host daemon)
```

Aikido uses `npx` instead of Docker, so it doesn't need the socket — it runs as a regular child process inside the Zeus container.

---

## File Structure

```
src/
  index.ts              Entry point: loads env, calls createServer, connects stdio transport
  server.ts             Wires up all tools; async because proxies need await
  config.ts             Typed config loaders for Atlassian and Veracode env vars

  clients/
    http-client.ts      Atlassian HTTP client (Basic Auth, auto-retry on 429)
    jira-client.ts      Jira REST API v3
    jira-agile-client.ts  Jira Agile API v1 (boards, sprints)
    confluence-client.ts  Confluence REST API v2
    veracode-client.ts  Veracode XML API v5 (HMAC-SHA256 request signing)

  tools/
    jira/               7 Jira MCP tools (direct client calls)
    confluence/         5 Confluence MCP tools (direct client calls)
    veracode/           6 Veracode MCP tools (direct client calls)
    sonarqube/
      proxy.ts          Spawns mcp/sonarqube, proxies all 60+ tools
      index.ts          Re-exports registerSonarQubeMcpProxy
    aikido/
      proxy.ts          Spawns @aikidosec/mcp, proxies all tools
      index.ts          Re-exports registerAikidoMcpProxy

  resources/
    index.ts            MCP resources for Jira and Confluence (used by some editors)

  converters/
    adf-to-markdown.ts  Atlassian Document Format → markdown
    storage-to-markdown.ts  Confluence storage format → markdown
    drawio-to-text.ts   Draw.io diagram → readable text
    truncation.ts       Truncates oversized API responses

  types/
    jira.ts / confluence.ts / veracode.ts   TypeScript interfaces for API responses

  utils/
    git.ts              getCurrentBranch() — runs git rev-parse in GIT_REPO_PATH
```

---

## Environment Variable Flow

```
mcp.json (editor config)
    │
    │  docker run -e VAR_NAME ...
    ▼
zeus-mcp container environment
    │
    ├── read directly by:  Jira, Confluence, Veracode clients
    │
    ├── docker run -e SONARQUBE_TOKEN -e SONARQUBE_URL ...
    │   ▼
    │   mcp/sonarqube container environment
    │
    └── process.env passed to npx child
        ▼
        @aikidosec/mcp process environment
```

All env vars flow from your `mcp.json` through each layer via Docker `-e` flags (for SonarQube) or inherited `process.env` (for Aikido via npx). Nothing is hardcoded.

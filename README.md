# Zeus MCP Server

A single Docker image that gives your AI assistant (Claude Code, VS Code Copilot, Cursor, etc.) access to **Jira, Confluence, Veracode, SonarQube, and Aikido Security** — all through natural language.

Pull one image. Add one config file. Get 30+ tools.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration Reference](#configuration-reference)
  - [Atlassian — Jira & Confluence](#atlassian--jira--confluence-required)
  - [Veracode](#veracode-optional)
  - [SonarQube](#sonarqube-optional)
  - [Aikido Security](#aikido-security-optional)
- [VS Code Setup](#vs-code-setup)
- [Claude Code Setup](#claude-code-setup)
- [Available Tools](#available-tools)
- [Troubleshooting](#troubleshooting)
- [Building Locally](#building-locally)

---

## How It Works

You run one Docker container. Inside it, the Zeus MCP server starts up, connects to Atlassian directly, and on-demand spawns child processes for SonarQube and Aikido (their own official MCP servers). All of this is invisible — your AI sees one flat list of tools.

```
AI Assistant (VS Code / Claude Code)
        │  MCP protocol over stdio
        ▼
┌─────────────────────────────────────────┐
│           zeus-mcp  (Docker)            │
│                                         │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ Jira tools  │  │ Confluence tools │  │
│  └─────────────┘  └──────────────────┘  │
│  ┌─────────────┐                        │
│  │Veracode tool│  (built-in client)     │
│  └─────────────┘                        │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  SonarQube proxy                │    │
│  │  spawns: docker run mcp/sonarqu │    │──► SonarQube server (Docker)
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Aikido proxy                   │    │
│  │  spawns: npx @aikidosec/mcp     │    │──► Aikido MCP (npx)
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for a deep-dive on how the proxy mechanism works.

---

## Prerequisites

- **Docker Desktop** running on your machine
- An **Atlassian Cloud** account (Jira + Confluence) — required
- Credentials for any optional integrations you want to use

---

## Quick Start

### 1. Pull the image

```bash
docker pull ghcr.io/a-nice-piyush/zeus_dev_mcp:latest
```

Or use the locally built image (if you built from source):

```bash
# tag is zeus-mcp:latest when built locally
```

### 2. Create your config file

Pick the section for your editor below, create the file, and fill in your credentials. **Add this file to `.gitignore` — it contains secrets.**

### 3. Reload MCP in your editor

In VS Code: `Ctrl+Shift+P` → `MCP: Restart Server`  
In Claude Code: restart the session

---

## Configuration Reference

### Atlassian — Jira & Confluence (required)

**Where to get the API token:**
1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token** → give it a name → copy it

| Variable | Description |
|---|---|
| `ATLASSIAN_BASE_URL` | Your Atlassian Cloud URL, e.g. `https://yourcompany.atlassian.net` |
| `ATLASSIAN_EMAIL` | Your Atlassian account email |
| `ATLASSIAN_API_TOKEN` | API token from the link above (not your password) |

---

### Veracode (optional)

Tools are automatically disabled if these are not set.

**Where to get credentials:**
1. Log into the Veracode web UI via SSO
2. Click your name (top right) → **API Credentials** → **Generate API Credentials**
3. Copy the **API ID** (32-char hex) and **API Secret Key** (128-char hex)

> Credentials expire after 1 year and are separate from your SSO login.

| Variable | Description |
|---|---|
| `VERACODE_API_ID` | 32-character hex API ID |
| `VERACODE_API_KEY` | 128-character hex API secret key |
| `VERACODE_APP_NAME` | Default Veracode app profile name (optional) |
| `GITHUB_TOKEN` | GitHub PAT with `Actions:read` scope — used to match PRs to scans |
| `GITHUB_REPO` | Repository in `owner/repo` format, e.g. `inContact/POCR` |

---

### SonarQube (optional)

Tools are automatically disabled if `SONARQUBE_TOKEN` is not set. **Requires Docker Desktop running** — Zeus spawns the official `mcp/sonarqube` container on demand.

**Where to get the token:**
1. Log into SonarQube via SAML/SSO
2. Go to **My Account** → **Security** → **Generate Tokens**
3. Token type: **User Token** (not Global Analysis or Project Analysis — those are for CI scanners only)
4. Copy the token

| Variable | Description |
|---|---|
| `SONARQUBE_TOKEN` | User token from above |
| `SONARQUBE_URL` | Your SonarQube server URL, e.g. `https://sonar.yourcompany.com`. Omit for SonarQube Cloud (defaults to `https://sonarcloud.io`). Use `https://sonarqube.us` for Cloud US region. |
| `SONARQUBE_ORG` | Organisation key — set for SonarQube Cloud, omit for SonarQube Server |
| `SONARQUBE_PROJECT_KEY` | Default project key — tools use this automatically so you don't have to repeat it |
| `SONARQUBE_READ_ONLY` | Set to `true` to disable write operations (optional) |
| `TELEMETRY_DISABLED` | Set to `true` to opt out of SonarQube MCP telemetry (optional) |

**Finding your project key:** In SonarQube, open your project → **Project Information** → copy the key shown there.

---

### Aikido Security (optional)

Tools are automatically disabled if `AIKIDO_API_KEY` is not set. Zeus spawns the official `@aikidosec/mcp` package via `npx` on demand.

**Where to get the API key:**
1. Log into [app.aikido.dev](https://app.aikido.dev)
2. Go to **Settings** → **Integrations** → **Public REST API**
3. Click **Generate API Key** — copy it immediately (shown only once)
4. The key needs at minimum `basics:read` and `issues:read` permissions

| Variable | Description |
|---|---|
| `AIKIDO_API_KEY` | API key from above |

---

### Shared / Other

| Variable | Description |
|---|---|
| `NODE_TLS_REJECT_UNAUTHORIZED` | Set to `0` if behind a corporate TLS proxy that intercepts HTTPS |
| `GIT_REPO_PATH` | Local path to your repo — used by Veracode tools to auto-detect the current Git branch |

---

## VS Code Setup

Create `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "zeus-mcp": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "/var/run/docker.sock:/var/run/docker.sock",
        "-e", "ATLASSIAN_BASE_URL",
        "-e", "ATLASSIAN_EMAIL",
        "-e", "ATLASSIAN_API_TOKEN",
        "-e", "VERACODE_API_ID",
        "-e", "VERACODE_API_KEY",
        "-e", "VERACODE_APP_NAME",
        "-e", "GITHUB_TOKEN",
        "-e", "GITHUB_REPO",
        "-e", "SONARQUBE_TOKEN",
        "-e", "SONARQUBE_URL",
        "-e", "SONARQUBE_ORG",
        "-e", "SONARQUBE_PROJECT_KEY",
        "-e", "SONARQUBE_READ_ONLY",
        "-e", "TELEMETRY_DISABLED",
        "-e", "AIKIDO_API_KEY",
        "-e", "NODE_TLS_REJECT_UNAUTHORIZED",
        "ghcr.io/a-nice-piyush/zeus_dev_mcp:latest"
      ],
      "env": {
        "NODE_TLS_REJECT_UNAUTHORIZED": "0",

        "ATLASSIAN_BASE_URL":  "https://yourcompany.atlassian.net",
        "ATLASSIAN_EMAIL":     "you@yourcompany.com",
        "ATLASSIAN_API_TOKEN": "ATATT3x...",

        "VERACODE_API_ID":  "your-32-char-hex-id",
        "VERACODE_API_KEY": "your-128-char-hex-key",
        "VERACODE_APP_NAME": "your-veracode-app-name",
        "GITHUB_TOKEN": "ghp_...",
        "GITHUB_REPO":  "owner/repo",

        "SONARQUBE_TOKEN":       "squ_...",
        "SONARQUBE_URL":         "https://sonar.yourcompany.com",
        "SONARQUBE_PROJECT_KEY": "your-project-key",

        "AIKIDO_API_KEY": "your-aikido-api-key"
      }
    }
  }
}
```

> The `-v /var/run/docker.sock:/var/run/docker.sock` mount lets the container spawn the SonarQube child container on your host's Docker daemon.

---

## Claude Code Setup

Create `.mcp.json` in your project root (or add to `~/.claude/claude_desktop_config.json` for global use):

```json
{
  "mcpServers": {
    "zeus-mcp": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "/var/run/docker.sock:/var/run/docker.sock",
        "-e", "ATLASSIAN_BASE_URL",
        "-e", "ATLASSIAN_EMAIL",
        "-e", "ATLASSIAN_API_TOKEN",
        "-e", "VERACODE_API_ID",
        "-e", "VERACODE_API_KEY",
        "-e", "VERACODE_APP_NAME",
        "-e", "GITHUB_TOKEN",
        "-e", "GITHUB_REPO",
        "-e", "SONARQUBE_TOKEN",
        "-e", "SONARQUBE_URL",
        "-e", "SONARQUBE_ORG",
        "-e", "SONARQUBE_PROJECT_KEY",
        "-e", "AIKIDO_API_KEY",
        "-e", "NODE_TLS_REJECT_UNAUTHORIZED",
        "ghcr.io/a-nice-piyush/zeus_dev_mcp:latest"
      ],
      "env": {
        "NODE_TLS_REJECT_UNAUTHORIZED": "0",
        "ATLASSIAN_BASE_URL":  "https://yourcompany.atlassian.net",
        "ATLASSIAN_EMAIL":     "you@yourcompany.com",
        "ATLASSIAN_API_TOKEN": "ATATT3x...",
        "VERACODE_API_ID":     "your-api-id",
        "VERACODE_API_KEY":    "your-api-key",
        "VERACODE_APP_NAME":   "your-app-name",
        "GITHUB_TOKEN":        "ghp_...",
        "GITHUB_REPO":         "owner/repo",
        "SONARQUBE_TOKEN":     "squ_...",
        "SONARQUBE_URL":       "https://sonar.yourcompany.com",
        "SONARQUBE_PROJECT_KEY": "your-project-key",
        "AIKIDO_API_KEY":      "your-aikido-api-key"
      }
    }
  }
}
```

---

## Available Tools

### Jira (7 tools) — always on

| Tool | What it does |
|---|---|
| `jira_search_issues` | Search issues using JQL |
| `jira_get_issue` | Full issue details: description, acceptance criteria, comments, status |
| `jira_get_epic` | Epic with all child stories grouped by status (Done / In Progress / To Do) |
| `jira_get_sprint` | Active sprint issues for a board or project |
| `jira_list_projects` | List all accessible Jira projects |
| `jira_add_comment` | Add a comment to an issue |
| `jira_update_status` | Transition an issue to a new status (e.g. In Progress → In Review) |

### Confluence (5 tools) — always on

| Tool | What it does |
|---|---|
| `confluence_search` | Search content using CQL |
| `confluence_get_page` | Get page content as readable markdown |
| `confluence_get_page_children` | List child pages for navigation |
| `confluence_list_spaces` | List available spaces |
| `confluence_add_comment` | Add a footer comment to a page |

### Veracode (6 tools) — requires `VERACODE_API_ID` + `VERACODE_API_KEY`

| Tool | What it does |
|---|---|
| `veracode_list_apps` | List all Veracode app profiles |
| `veracode_list_builds` | List recent scans/builds for an app |
| `veracode_find_scan_for_pr` | Find the Veracode scan triggered by the current branch/PR |
| `veracode_upload_and_scan` | Upload an artifact and start a new SAST scan |
| `veracode_get_scan_status` | Check if a scan is complete |
| `veracode_get_findings` | Get vulnerability findings with file path, line number, and remediation guidance |

### SonarQube (60+ tools) — requires `SONARQUBE_TOKEN`

Proxied from the official [SonarQube MCP server](https://github.com/SonarSource/sonarqube-mcp-server). Includes tools for issues, quality gates, measures, security hotspots, rules, coverage, sources, webhooks, and more. The `SONARQUBE_PROJECT_KEY` is automatically injected so you never need to specify it.

Key tools include: `search_sonar_issues_in_projects`, `get_project_quality_gate_status`, `get_component_measures`, `search_security_hotspots`, `search_my_sonarqube_projects`, `show_rule`, `get_raw_source`, and many more.

### Aikido Security (6 tools) — requires `AIKIDO_API_KEY`

Proxied from the official [@aikidosec/mcp](https://www.npmjs.com/package/@aikidosec/mcp) package.

| Tool | What it does |
|---|---|
| `list_repositories` | List all monitored repositories |
| `search_repository_by_name` | Find a repository by name |
| `get_issues` | Security issues filtered by severity and type (sast, container, iac) |
| `get_issue_details` | Full issue details with remediation guidance |
| `get_open_issue_groups` | Open issues grouped by vulnerability type |
| `get_issue_group_details` | Details on a specific issue group |

---

## Troubleshooting

### Tools not showing up

- Check Docker Desktop is running
- Check the server stderr output — each disabled integration logs a `tools disabled:` message with the reason
- Verify the required env vars are set and not empty

### 401 Unauthorized

| Integration | Check |
|---|---|
| Atlassian | `ATLASSIAN_EMAIL` + `ATLASSIAN_API_TOKEN` (not your password) |
| Veracode | `VERACODE_API_ID` is 32-char hex, `VERACODE_API_KEY` is 128-char hex |
| SonarQube | Token must be **User Token** type — not Global Analysis or Project Analysis token |

### TLS / certificate errors

Set `NODE_TLS_REJECT_UNAUTHORIZED=0` if behind a corporate proxy that intercepts HTTPS. Already included in the example configs above.

### SonarQube: project not found

Verify `SONARQUBE_PROJECT_KEY` matches exactly. Find it in SonarQube → your project → **Project Information**.

### SonarQube: no data for a branch

SonarQube only holds data for branches that have been scanned in CI. If the branch has never been analyzed, results will be empty.

### Veracode: scan not found for PR

- The CI-triggered scan may still be running — check Veracode UI
- Ensure `GITHUB_TOKEN` has `Actions:read` scope
- Ensure `GITHUB_REPO` matches the correct `owner/repo`

### Docker socket error (SonarQube tools fail)

The `-v /var/run/docker.sock:/var/run/docker.sock` mount in the run command is required so the Zeus container can spawn the SonarQube child container. Make sure it is present in your config.

---

## Building Locally

```bash
# Clone the repo
git clone <this-repo>
cd zeus_dev_mcp

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Build Docker image
docker build -t zeus-mcp:latest .
```

To use the locally built image, replace `ghcr.io/a-nice-piyush/zeus_dev_mcp:latest` with `zeus-mcp:latest` in your config file.

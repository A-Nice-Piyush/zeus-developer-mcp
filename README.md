# Developer MCP Server

An MCP (Model Context Protocol) server that connects AI assistants to developer tools — Jira, Confluence, Veracode SAST, and SonarQube — through a single server. It enables AI-driven workflows: read Jira stories, search Confluence docs, check security scan results, and fix code — all via natural language.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Atlassian (Jira & Confluence) Setup](#atlassian-jira--confluence-setup)
- [Veracode Setup](#veracode-setup)
- [SonarQube Setup](#sonarqube-setup)
- [Git Branch Auto-Detection](#git-branch-auto-detection)
- [VS Code MCP Configuration](#vs-code-mcp-configuration)
- [Claude Code Configuration](#claude-code-configuration)
- [Build & Run](#build--run)
- [Available Tools](#available-tools)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your credentials (see sections below)

# 3. Build
npm run build

# 4. Run
npm start
```

---

## Prerequisites

- **Node.js** v18+ (required for native `fetch`)
- **Atlassian Cloud account** (Jira & Confluence) — required
- **Veracode API credentials** — optional
- **SonarQube User Token** — optional
- **GitHub PAT** — optional (for Veracode PR-to-scan matching)

---

## Environment Variables

All configuration is done through environment variables. Copy `.env.example` to `.env` and fill in your values.

### Required (Atlassian)

| Variable | Description | Example |
|---|---|---|
| `ATLASSIAN_BASE_URL` | Your Atlassian Cloud URL | `https://yourcompany.atlassian.net` |
| `ATLASSIAN_EMAIL` | Your Atlassian account email | `you@company.com` |
| `ATLASSIAN_API_TOKEN` | API token (not your password) | `ATATT3x...` |

### Optional (Veracode)

| Variable | Description | Example |
|---|---|---|
| `VERACODE_API_ID` | Veracode API credential ID (32-char hex) | `a1b2c3d4...` |
| `VERACODE_API_KEY` | Veracode API secret key (128-char hex) | `e5f6a7b8...` |
| `VERACODE_APP_NAME` | Default Veracode app profile name | `my-app-name` |
| `GITHUB_TOKEN` | GitHub PAT with `Actions:read` scope | `ghp_abc123...` |
| `GITHUB_REPO` | Repository in `owner/repo` format | `inContact/POCR` |

### Optional (SonarQube)

| Variable | Description | Example |
|---|---|---|
| `SONARQUBE_BASE_URL` | SonarQube instance URL | `https://sonar.nice.com` |
| `SONARQUBE_TOKEN` | User token from SonarQube UI | `squ_abc123...` |
| `SONARQUBE_PROJECT_KEY` | Default project key | `my-project-key` |

### Optional (Shared)

| Variable | Description | Example |
|---|---|---|
| `GIT_REPO_PATH` | Local repo path for auto branch detection | `C:\Users\you\repos\POCR` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Set to `0` for corporate TLS proxies | `0` |

---

## Atlassian (Jira & Confluence) Setup

Jira and Confluence tools are **always registered** — they are the base integration.

### 1. Generate an API Token

1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Give it a label (e.g. `mcp-server`)
4. Copy the token

### 2. Configure

```
ATLASSIAN_BASE_URL=https://yourcompany.atlassian.net
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=your-api-token
```

### Authentication

All Jira and Confluence API calls use HTTP Basic Authentication:
```
Authorization: Basic {base64(email:apiToken)}
```

---

## Veracode Setup

Veracode tools are **optional**. If `VERACODE_API_ID` and `VERACODE_API_KEY` are not set, they are silently disabled.

### 1. Generate API Credentials

1. Log into the Veracode web UI via SAML/SSO
2. Click your name (top right) > **API Credentials**
3. Click **Generate API Credentials**
4. Copy the **API ID** and **API Secret Key**

> API credentials are valid for **1 year** and are separate from your SSO login.

### 2. Configure GitHub (for PR-to-scan matching)

The `veracode_find_scan_for_pr` tool resolves your current branch to a GitHub PR, finds the CI workflow run, and matches it to a Veracode scan. This requires:

- `GITHUB_TOKEN` — A PAT with `Actions:read` and `Contents:read` scopes
- `GITHUB_REPO` — Repository in `owner/repo` format (e.g. `inContact/POCR`)

### Authentication

Veracode uses per-request HMAC-SHA256 signing. This is handled automatically by the client.

---

## SonarQube Setup

SonarQube tools are **optional**. If `SONARQUBE_BASE_URL` and `SONARQUBE_TOKEN` are not set, they are silently disabled.

### 1. Generate a User Token

SAML/SSO is for the web UI only. The API requires a **User Token**:

1. Log into SonarQube via SAML
2. Go to **My Account** > **Security** > **Generate Tokens**
3. Token type: **User Token** (not Global Analysis or Project Analysis)
4. Give it a name (e.g. `mcp-server`)
5. Copy the token

> **Do NOT use** Global Analysis Token or Project Analysis Token — those are for scanners/CI only and cannot read issues or reports.

### 2. Find Your Project Key

Run `sonarqube_list_projects` after setup to find the correct project key, or check your SonarQube project settings page.

### Authentication

```
Authorization: Bearer {SONARQUBE_TOKEN}
```

---

## Git Branch Auto-Detection

Veracode and SonarQube tools **auto-detect the current Git branch** so developers don't need to specify it. Set `GIT_REPO_PATH` to the local path of your repository:

```
GIT_REPO_PATH=C:\Users\you\Documents\POCR
```

The server runs `git rev-parse --abbrev-ref HEAD` in this directory to detect the branch.

---

## VS Code MCP Configuration

Create or update `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "dev-mcp": {
      "command": "node",
      "args": ["C:/path/to/pocr_dev_mcp/dist/index.js"],
      "env": {
        "NODE_TLS_REJECT_UNAUTHORIZED": "0",

        "ATLASSIAN_BASE_URL": "https://yourcompany.atlassian.net",
        "ATLASSIAN_EMAIL": "your-email@company.com",
        "ATLASSIAN_API_TOKEN": "your-api-token",

        "VERACODE_API_ID": "your-api-id",
        "VERACODE_API_KEY": "your-api-secret-key",
        "VERACODE_APP_NAME": "your-veracode-app-name",

        "GITHUB_TOKEN": "ghp_your-token",
        "GITHUB_REPO": "owner/repo",

        "SONARQUBE_BASE_URL": "https://sonar.nice.com",
        "SONARQUBE_TOKEN": "your-sonarqube-user-token",
        "SONARQUBE_PROJECT_KEY": "your-project-key",

        "GIT_REPO_PATH": "C:/path/to/your/repo"
      }
    }
  }
}
```

After configuring, restart the MCP server in VS Code (Ctrl+Shift+P > "MCP: Restart Server").

---

## Claude Code Configuration

Add to your Claude Code MCP settings (`~/.claude/claude_desktop_config.json` or project-level):

```json
{
  "mcpServers": {
    "dev-mcp": {
      "command": "node",
      "args": ["C:/path/to/pocr_dev_mcp/dist/index.js"],
      "env": {
        "NODE_TLS_REJECT_UNAUTHORIZED": "0",
        "ATLASSIAN_BASE_URL": "https://yourcompany.atlassian.net",
        "ATLASSIAN_EMAIL": "your-email@company.com",
        "ATLASSIAN_API_TOKEN": "your-api-token",
        "VERACODE_API_ID": "your-api-id",
        "VERACODE_API_KEY": "your-api-secret-key",
        "VERACODE_APP_NAME": "your-veracode-app-name",
        "GITHUB_TOKEN": "ghp_your-token",
        "GITHUB_REPO": "owner/repo",
        "SONARQUBE_BASE_URL": "https://sonar.nice.com",
        "SONARQUBE_TOKEN": "your-sonarqube-user-token",
        "SONARQUBE_PROJECT_KEY": "your-project-key",
        "GIT_REPO_PATH": "C:/path/to/your/repo"
      }
    }
  }
}
```

---

## Build & Run

```bash
# Install dependencies
npm install

# Build (compiles TypeScript to dist/)
npm run build

# Run the server
npm start

# Development mode (auto-reloads)
npm run dev
```

Rebuild and restart the MCP server after any code changes.

---

## Available Tools

### Jira (7 tools) — always registered

| Tool | Description |
|---|---|
| `jira_search_issues` | Search issues using JQL |
| `jira_get_issue` | Get detailed issue info (description, comments, status) |
| `jira_get_epic` | Get epic with all child stories grouped by status |
| `jira_get_sprint` | Get active sprint issues for a board/project |
| `jira_list_projects` | List all accessible projects |
| `jira_add_comment` | Add a comment to an issue |
| `jira_update_status` | Transition an issue to a new status |

### Confluence (5 tools) — always registered

| Tool | Description |
|---|---|
| `confluence_search` | Search content using CQL |
| `confluence_get_page` | Get page content as markdown |
| `confluence_get_page_children` | Get child pages |
| `confluence_list_spaces` | List available spaces |
| `confluence_add_comment` | Add a comment to a page |

### Veracode (6 tools) — optional

| Tool | Description |
|---|---|
| `veracode_list_apps` | List all Veracode app profiles |
| `veracode_list_builds` | List recent scans/builds |
| `veracode_find_scan_for_pr` | Find scan for current branch/PR with findings |
| `veracode_upload_and_scan` | Upload artifact and start a SAST scan |
| `veracode_get_scan_status` | Check scan status |
| `veracode_get_findings` | Get vulnerability findings from a completed scan |

### SonarQube (3 tools) — optional

| Tool | Description |
|---|---|
| `sonarqube_list_projects` | List accessible SonarQube projects |
| `sonarqube_get_report` | High-level report: quality gate, metrics, issue counts |
| `sonarqube_get_issues` | Detailed issues with file path, line number, rule |

---

## Project Structure

```
src/
  index.ts                              # Entry point — loads config, starts server
  server.ts                             # Creates MCP server, registers all tools
  config.ts                             # Config loaders for all integrations
  utils/
    git.ts                              # getCurrentBranch() — auto-detects branch
  clients/
    http-client.ts                      # Atlassian HTTP client (Basic Auth, retry on 429)
    jira-client.ts                      # Jira REST API v3
    jira-agile-client.ts               # Jira Agile API v1 (boards, sprints)
    confluence-client.ts                # Confluence REST API v2
    veracode-client.ts                  # Veracode XML API v5 (HMAC-SHA256 auth)
    sonarqube-client.ts                 # SonarQube Web API (Bearer token auth)
  tools/
    jira/                               # 7 Jira MCP tools
    confluence/                         # 5 Confluence MCP tools
    veracode/                           # 6 Veracode MCP tools
    sonarqube/                          # 3 SonarQube MCP tools
  resources/
    index.ts                            # MCP resources for Jira & Confluence
  converters/
    adf-to-markdown.ts                  # Atlassian Document Format to markdown
    storage-to-markdown.ts              # Confluence storage format to markdown
    drawio-to-text.ts                   # Draw.io diagram to text
    truncation.ts                       # Content truncation utilities
  types/
    jira.ts                             # Jira type definitions
    confluence.ts                       # Confluence type definitions
    veracode.ts                         # Veracode type definitions
    sonarqube.ts                        # SonarQube type definitions
```

---

## Documentation

Detailed integration guides and usage prompts:

| Document | Description |
|---|---|
| [JIRA-CONFLUENCE-MCP.md](JIRA-CONFLUENCE-MCP.md) | Jira & Confluence integration — architecture, API reference, workflows |
| [VERACODE-MCP.md](VERACODE-MCP.md) | Veracode integration — HMAC auth, PR-to-scan matching, findings |
| [SONARQUBE-MCP.md](SONARQUBE-MCP.md) | SonarQube integration — quality gates, metrics, issue drill-down |
| [DEV-PROMPTS.md](DEV-PROMPTS.md) | Copy-paste prompts for developer workflows (Jira & Confluence) |
| [SECURITY-SCAN-PROMPTS.md](SECURITY-SCAN-PROMPTS.md) | Copy-paste prompts for security scanning (Veracode & SonarQube) |

---

## Troubleshooting

### 401 Unauthorized

| Integration | Check |
|---|---|
| Atlassian | Verify `ATLASSIAN_EMAIL` + `ATLASSIAN_API_TOKEN` (not your password) |
| Veracode | Verify `VERACODE_API_ID` (32-char hex) + `VERACODE_API_KEY` (128-char hex) |
| SonarQube | Verify `SONARQUBE_TOKEN` is a **User Token** (not Global/Project Analysis token) |

### TLS Certificate Error

If behind a corporate proxy:
```
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Tools Not Showing Up

- Veracode tools require both `VERACODE_API_ID` and `VERACODE_API_KEY`
- SonarQube tools require both `SONARQUBE_BASE_URL` and `SONARQUBE_TOKEN`
- Check the server stderr for "tools disabled" messages
- Rebuild (`npm run build`) and restart the MCP server

### Branch Not Auto-Detected

- Set `GIT_REPO_PATH` to the local repo path (not the MCP server path)
- Ensure `git` is available on `PATH`
- The path must be the repo root (where `.git/` lives)

### Rate Limiting (Atlassian)

The HTTP client automatically retries on HTTP 429 with exponential backoff (up to 3 retries). If you consistently hit rate limits, reduce request frequency.

### Veracode Scan Not Found

- The CI-triggered scan may still be running
- Ensure `GITHUB_TOKEN` has `Actions:read` scope
- Check that `GITHUB_REPO` matches the correct org/repo

### SonarQube No Data for Branch

- SonarQube only has data for branches that have been analyzed in CI
- If the branch has never been scanned, results will be empty

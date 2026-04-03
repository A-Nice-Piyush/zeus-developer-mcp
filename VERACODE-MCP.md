# Veracode MCP Integration

An MCP (Model Context Protocol) server extension that connects AI assistants to Veracode SAST scanning. It enables an AI to look up scans triggered by GitHub Actions CI, retrieve vulnerability findings with file/line context, and guide code fixes — all through natural language conversation.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [How It Works](#how-it-works)
- [Setup & Configuration](#setup--configuration)
- [Tools Reference](#tools-reference)
- [Authentication](#authentication)
- [PR-to-Scan Matching](#pr-to-scan-matching)
- [Findings & Severity Filtering](#findings--severity-filtering)
- [AI-Assisted Vulnerability Fix Workflow](#ai-assisted-vulnerability-fix-workflow)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
+---------------------+          +---------------------+          +------------------------+
|                     |   MCP    |                     |   HMAC   |                        |
|   AI Assistant      |<-------->|   MCP Server        |<-------->|   Veracode XML API v5  |
|   (VS Code / CLI)   |  Tools   |   (Node.js)         |  SHA-256 |   analysiscenter       |
|                     |          |                     |          |   .veracode.com        |
+---------------------+          +----------+----------+          +------------------------+
                                            |
                                            | REST API
                                            v
                                 +---------------------+
                                 |                     |
                                 |   GitHub API        |
                                 |   api.github.com    |
                                 |                     |
                                 +---------------------+
```

The MCP server sits between the AI assistant and two external APIs:

1. **Veracode XML API v5** — Lists apps, lists builds, fetches scan reports, uploads artifacts
2. **GitHub REST API** — Resolves branches to PRs, finds workflow runs to match CI-triggered scans

---

## How It Works

### Core Flow: Branch to Veracode Findings

The most common usage pattern is retrieving findings from a CI-triggered scan. The branch is **auto-detected** from `GIT_REPO_PATH` — no parameters needed.

```
  User says: "Check Veracode findings"
                           |
                           v
              +---------------------------+
              | 0. Auto-detect Branch     |
              |    git rev-parse          |
              |    --abbrev-ref HEAD      |
              |    (from GIT_REPO_PATH)   |
              +------------+--------------+
                           |
                   branch: "feature/auth-fix"
                           |
                           v
              +---------------------------+
              | 1. Resolve Branch to PR   |
              |    GitHub API:            |
              |    GET /repos/{o}/{r}/    |
              |    pulls?head={branch}    |
              +------------+--------------+
                           |
                   PR #42, head SHA abc123
                           |
                           v
              +---------------------------+
              | 2. Find Workflow Runs     |
              |    GitHub API:            |
              |    GET /repos/{o}/{r}/    |
              |    actions/runs?          |
              |    head_sha=abc123        |
              +------------+--------------+
                           |
                   Run ID: 22214671698
                   Run Number: 2574
                   Attempt: 1
                           |
                           v
              +---------------------------+
              | 3. Build Search Tokens    |
              |                           |
              |  "22214671698-2574-1"     |
              |  "22214671698-2574"       |
              |  "22214671698"            |
              +------------+--------------+
                           |
                           v
              +---------------------------+
              | 4. Search Veracode Builds |
              |    Veracode API:          |
              |    getbuildlist.do        |
              |                           |
              |  Match: scan name         |
              |  .includes(token)         |
              +------------+--------------+
                           |
                  Build ID: 28485932
                  Scan: "Scan from Github
                  job: 22214671698-2574-1"
                           |
                           v
              +---------------------------+
              | 5. Fetch Detailed Report  |
              |    Veracode API:          |
              |    detailedreport.do?     |
              |    build_id=28485932      |
              +------------+--------------+
                           |
                           v
              +---------------------------+
              | 6. Filter & Format        |
              |                           |
              |  - Exclude mitigated/     |
              |    fixed findings         |
              |  - Filter by severity     |
              |  - Group by severity      |
              |  - Include file path,     |
              |    line number, CWE,      |
              |    remediation guidance   |
              +---------------------------+
                           |
                           v
              AI presents findings and
              can directly edit the files
              to fix vulnerabilities
```

### Scan Name Convention

GitHub Actions' `veracode-uploadandscan-action` names scans using a predictable pattern:

```
Scan from Github job: {run_id}-{run_number}-{run_attempt}
```

Example: `Scan from Github job: 22214671698-2574-1`

The tool extracts `run_id`, `run_number`, and `run_attempt` from the GitHub workflow run, constructs search tokens, and matches them against Veracode build names using a **substring search** (`.includes()`).

---

## Setup & Configuration

### Prerequisites

1. **Node.js** v18+ (for native `fetch`)
2. **Veracode API Credentials** (API ID + Secret Key)
3. **GitHub Personal Access Token** (for PR/scan lookup)

### Environment Variables

Set these in your `.vscode/mcp.json` (VS Code) or `.env` file:

| Variable | Required | Description |
|---|---|---|
| `VERACODE_API_ID` | Yes | Veracode API credential ID (32-char hex) |
| `VERACODE_API_KEY` | Yes | Veracode API secret key (128-char hex) |
| `VERACODE_APP_NAME` | Recommended | Default Veracode app profile name |
| `GITHUB_TOKEN` | For PR lookup | GitHub PAT with `Actions:read` scope |
| `GITHUB_REPO` | For PR lookup | Repository in `owner/repo` format |
| `GIT_REPO_PATH` | Recommended | Local repo path for auto branch detection |
| `NODE_TLS_REJECT_UNAUTHORIZED` | If behind proxy | Set to `"0"` for corporate TLS proxies |

### Obtaining Veracode API Credentials

1. Log into the Veracode web UI via SAML/SSO
2. Click your name (top right) -> **API Credentials**
3. Click **Generate API Credentials**
4. Copy the **API ID** and **API Secret Key**

> API credentials are valid for **1 year** and are separate from your SSO login.

### VS Code MCP Configuration

In `.vscode/mcp.json`:

```json
{
  "servers": {
    "atlassian": {
      "command": "node",
      "args": ["path/to/pocr_dev_mcp/dist/index.js"],
      "env": {
        "NODE_TLS_REJECT_UNAUTHORIZED": "0",
        "GIT_REPO_PATH": "C:/path/to/your/repo",
        "VERACODE_API_ID": "your-api-id",
        "VERACODE_API_KEY": "your-api-secret-key",
        "VERACODE_APP_NAME": "your-veracode-app-name",
        "GITHUB_TOKEN": "ghp_your-token",
        "GITHUB_REPO": "owner/repo"
      }
    }
  }
}
```

### Build

```bash
npm run build    # compiles TypeScript to dist/
```

Restart the MCP server in VS Code after each rebuild.

---

## Tools Reference

The integration provides **6 MCP tools**:

### `veracode_list_apps`

Lists all Veracode application profiles you have access to.

| Parameter | Type | Required | Description |
|---|---|---|---|
| *(none)* | | | |

**Use when:** You need to confirm the correct app name or check what's available.

---

### `veracode_list_builds`

Lists recent scans/builds for a Veracode application.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `appName` | string | No | `VERACODE_APP_NAME` env | Veracode application profile name |
| `limit` | number | No | 10 | Number of recent builds to show (1-50) |

**Use when:** You need to see recent scan names and their build IDs.

---

### `veracode_find_scan_for_pr`

The primary tool. Finds the Veracode scan triggered by CI for a pull request or branch, and returns findings. **Auto-detects the current branch if no parameters are provided.**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `prNumber` | number | No | | GitHub PR number (e.g. 42) |
| `branchName` | string | No | Auto-detected from `GIT_REPO_PATH` | Git branch name |
| `appName` | string | No | `VERACODE_APP_NAME` env | Veracode application profile name |
| `repo` | string | No | `GITHUB_REPO` env | GitHub repo in `owner/repo` format |
| `minSeverity` | number | No | 3 | Minimum severity (0-5). Default: Medium+ |

**Use when:** You want to see Veracode findings. Just call it with no parameters.

---

### `veracode_upload_and_scan`

Uploads a local ZIP build artifact and starts a new SAST scan.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `filePath` | string | Yes | | Absolute path to the ZIP file |
| `appName` | string | No | `VERACODE_APP_NAME` env | Veracode application profile name |

Scans typically take **10-25 minutes**. Poll with `veracode_get_scan_status`.

---

### `veracode_get_scan_status`

Checks the status of a Veracode scan.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `appName` | string | No | `VERACODE_APP_NAME` env | App name (returns latest scan) |
| `buildId` | string | No | | Specific build ID to check |

**Status progression:** `Pre-Scan Submitted` -> `Scan In Process` -> `Results Ready` -> `Published`

---

### `veracode_get_findings`

Fetches vulnerability findings from a completed scan.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `appName` | string | No | `VERACODE_APP_NAME` env | App name (uses latest scan) |
| `buildId` | string | No | | Specific build ID |
| `minSeverity` | number | No | 3 | Minimum severity (0-5) |
| `maxResults` | number | No | 30 | Maximum findings to return (1-200) |

---

## Authentication

### Veracode HMAC-SHA256

The Veracode API uses per-request HMAC-SHA256 signing (not Basic Auth, not OAuth).

```
  API Secret Key (hex string)
         |
         v
  hex-decode to raw bytes (keyBytes)
         |
         v
  hmacNonce = HMAC-SHA256(keyBytes,  nonceBytes)     <-- 16 random BYTES
         |
         v
  hmacDate  = HMAC-SHA256(hmacNonce, timestamp)       <-- millisecond epoch
         |
         v
  hmacSig   = HMAC-SHA256(hmacDate,  "vcode_request_version_1")
         |
         v
  signature = HMAC-SHA256(hmacSig,   data).hex()
         |
         v
  Header: VERACODE-HMAC-SHA-256 id={apiId},ts={timestamp},nonce={nonceHex},sig={signature}
```

Where `data` = `"id={apiId}&host=analysiscenter.veracode.com&url={urlPath}&method={METHOD}"`

> **Critical implementation detail:** The nonce must be passed as **raw bytes** (16 byte Buffer) to the HMAC chain, not as a hex string. The hex representation is only used in the Authorization header. Getting this wrong results in 401 errors with "Invalid signature".

### GitHub API

Standard Bearer token authentication:

```
Authorization: Bearer {GITHUB_TOKEN}
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

---

## PR-to-Scan Matching

### The Problem

Veracode scans triggered by CI don't have a direct link back to the PR. The only connection is the **scan name** which embeds the GitHub Actions **run ID**.

### The Solution

```
GitHub PR #42
       |
       | head SHA: abc123
       |
       v
GitHub Actions Run
       |
       | run ID:      22214671698
       | run_number:  2574
       | run_attempt: 1
       |
       v
Search tokens (tried in order):
       |
       | 1. "22214671698-2574-1"   (most specific)
       | 2. "22214671698-2574"     (without attempt)
       | 3. "22214671698"          (just run ID)
       |
       v
Veracode Build List
       |
       | version: "Scan from Github job: 22214671698-2574-1"
       |                                 ^^^^^^^^^^^^^^^^^^^
       |                                 .includes(token) = true!
       |
       v
Matched Build ID: 28485932
```

### Workflow Run Discovery

Two strategies in parallel:

1. **By head SHA** — `GET /actions/runs?head_sha={sha}` — catches push-triggered runs
2. **By branch + event** — `GET /actions/runs?branch={ref}&event=pull_request` — catches PR event-triggered runs

Results are de-duplicated by run ID and filtered to only include runs whose SHA matches the PR head or that explicitly reference the PR.

---

## Findings & Severity Filtering

### Severity Levels

| Level | Name | Description |
|---|---|---|
| 5 | Very High | Critical vulnerabilities requiring immediate attention |
| 4 | High | Serious security issues |
| 3 | Medium | Moderate risk (default minimum filter) |
| 2 | Low | Minor issues |
| 1 | Very Low | Minimal risk |
| 0 | Informational | Best practice suggestions |

### Mitigation Filtering

Findings are filtered at the API client level to match what the Veracode dashboard shows:

- **Included:** Findings with `remediation_status` of `"New"`, `"Open"`, or empty
- **Excluded:** Findings with `remediation_status` of `"Fixed"` or `"Mitigated"`

### Output Format

```
=== SEVERITY SUMMARY ===
  High: 3 findings
  Medium: 25 findings
  Total: 28 findings

=== HIGH (3) ===

[FLAW-101] Improper Neutralization of Special Elements (CWE-89)
  File: DataAccess/QueryBuilder.cs, Line: 45
  Description: User input concatenated into SQL query...
  Remediation: Use parameterized queries...
```

---

## AI-Assisted Vulnerability Fix Workflow

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  "Check Veracode"|---->|  "Show me the    |---->|  "Fix the SQL    |
|  (zero params)   |     |   high severity  |     |   injection in   |
|                  |     |   findings"      |     |   QueryBuilder   |
|                  |     |                  |     |   line 45"       |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
  veracode_find_scan_for_pr  (already loaded)        AI reads file,
  auto-detects branch        filters to High         understands context,
                                                     edits code directly
```

---

## Project Structure

```
src/
  utils/
    git.ts                     # getCurrentBranch() — auto-detects branch
                               #   from GIT_REPO_PATH env var
  clients/
    veracode-client.ts         # Veracode XML API v5 client
                               #   - HMAC-SHA256 per-request auth
                               #   - XML response parsing (regex-based)
  tools/
    veracode/
      index.ts                 # Registers all 6 Veracode tools
      list-apps.ts             # veracode_list_apps
      list-builds.ts           # veracode_list_builds
      upload-scan.ts           # veracode_upload_and_scan
      get-scan-status.ts       # veracode_get_scan_status
      get-findings.ts          # veracode_get_findings
      find-scan-for-pr.ts      # veracode_find_scan_for_pr
  types/
    veracode.ts                # TypeScript interfaces
  config.ts                    # loadVeracodeConfig()
  server.ts                    # Conditional tool registration
```

---

## Troubleshooting

### 401 Unauthorized

- Verify `VERACODE_API_ID` is a 32-character hex string (no hyphens)
- Verify `VERACODE_API_KEY` is a 128-character hex string
- Check for non-hex characters: the key must be `[0-9a-f]` only
- Ensure credentials haven't expired (valid for 1 year from generation)
- Run `node test-veracode-auth.mjs` for diagnostics

### TLS Certificate Error

**Error:** `fetch failed - unable to get local issuer certificate`

**Fix:** Add `"NODE_TLS_REJECT_UNAUTHORIZED": "0"` to your mcp.json env block.

### No PR Found for Branch

- Ensure the branch has an open (or recently closed/merged) PR
- Check that `GITHUB_REPO` is in `owner/repo` format and matches the correct org

### Could Not Match GitHub Run to Veracode Scan

- The Veracode scan triggered by CI hasn't finished yet
- The scan naming convention doesn't match
- The build list doesn't go back far enough

### Findings Count Mismatch with Dashboard

- Rebuild with `npm run build` and restart the MCP server (mitigation filter excludes `"Fixed"` and `"Mitigated"` findings)

### Scan Status "Unknown"

The `getbuildinfo.do` endpoint sometimes returns "Unknown" for completed scans. `veracode_find_scan_for_pr` works around this by going directly to `detailedreport.do`.

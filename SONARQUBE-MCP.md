# SonarQube MCP Integration

An MCP server extension that connects AI assistants to SonarQube code quality and security analysis. It enables an AI to fetch quality gate status, issue counts, and detailed findings with file/line context — so it can guide code fixes through natural language conversation.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [How It Works](#how-it-works)
- [Setup & Configuration](#setup--configuration)
- [Tools Reference](#tools-reference)
- [Authentication](#authentication)
- [Issue Categories & Severity](#issue-categories--severity)
- [AI-Assisted Fix Workflow](#ai-assisted-fix-workflow)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
+---------------------+          +---------------------+          +------------------------+
|                     |   MCP    |                     |  Bearer  |                        |
|   AI Assistant      |<-------->|   MCP Server        |<-------->|   SonarQube API        |
|   (VS Code / CLI)   |  Tools   |   (Node.js)         |  Token   |   sonar.nice.com       |
|                     |          |                     |          |                        |
+---------------------+          +----------+----------+          +------------------------+
                                            |
                                            | git rev-parse
                                            v
                                 +---------------------+
                                 |                     |
                                 |   Local Git Repo    |
                                 |   (GIT_REPO_PATH)   |
                                 |                     |
                                 +---------------------+
```

The MCP server communicates with:

1. **SonarQube Web API** — Quality gates, issues, measures, hotspots
2. **Local Git repo** — Auto-detects the current branch (no manual input needed)

---

## How It Works

### Core Flow: Zero-Parameter Report

The developer just says "Check SonarQube" — everything is auto-detected.

```
  User says: "Check SonarQube"
                      |
                      v
         +---------------------------+
         | 1. Auto-detect Branch     |
         |    git rev-parse          |
         |    --abbrev-ref HEAD      |
         |    (from GIT_REPO_PATH)   |
         +------------+--------------+
                      |
              branch: "feature/auth-fix"
                      |
                      v
         +---------------------------+
         | 2. Quality Gate Status    |
         |    GET /api/qualitygates/ |
         |    project_status?        |
         |    projectKey=X&branch=Y  |
         +------------+--------------+
                      |
              PASSED / FAILED
                      |
                      v
         +---------------------------+
         | 3. Project Metrics        |
         |    GET /api/measures/     |
         |    component?metricKeys=  |
         |    bugs,vulnerabilities,  |
         |    code_smells,coverage...|
         +------------+--------------+
                      |
                      v
         +---------------------------+
         | 4. Issue Counts by Type   |
         |    & Severity (facets)    |
         |    GET /api/issues/search |
         |    ?facets=types,         |
         |    severities&ps=1        |
         +------------+--------------+
                      |
                      v
         +---------------------------+
         | 5. Security Hotspots      |
         |    GET /api/hotspots/     |
         |    search?status=         |
         |    TO_REVIEW              |
         +---------------------------+
                      |
                      v
         AI presents overview:
         Quality Gate: PASSED
         Bugs: 5, Vulns: 12, Smells: 45
         Hotspots to Review: 3

         "Which categories do you
          want to drill into?"
                      |
                      v
         User: "Vulnerabilities"
                      |
                      v
         +---------------------------+
         | 6. Detailed Issues        |
         |    GET /api/issues/search |
         |    ?types=VULNERABILITY   |
         |    &resolved=false        |
         +---------------------------+
                      |
                      v
         AI shows findings with
         file, line, rule, severity
         and can fix the code
```

### Two-Step Interaction Pattern

The integration is designed for a **report → drill-down** workflow:

1. **`sonarqube_get_report`** — Shows the overview with counts. The AI then asks the user which categories to focus on.
2. **`sonarqube_get_issues`** — Returns detailed findings for the chosen category, with file paths and line numbers for code fixes.

---

## Setup & Configuration

### Prerequisites

1. **Node.js** v18+
2. **SonarQube User Token** (generated from the SonarQube web UI)
3. **SonarQube Project Key** (visible in project settings or URL)

### Obtaining a SonarQube User Token

SAML/SSO is for the web UI only. The API requires a **User Token**:

1. Log into SonarQube (`sonar.nice.com`) via SAML
2. Go to **My Account** > **Security** > **Generate Tokens**
3. Token type: **User Token**
4. Give it a name (e.g. `mcp-server`)
5. Copy the token — this goes into `SONARQUBE_TOKEN`

> **Do NOT use** Global Analysis Token or Project Analysis Token — those are for scanners/CI only and cannot read issues or reports.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SONARQUBE_BASE_URL` | Yes | SonarQube instance URL (e.g. `https://sonar.nice.com`) |
| `SONARQUBE_TOKEN` | Yes | User token from SonarQube UI |
| `SONARQUBE_PROJECT_KEY` | Recommended | Default project key |
| `GIT_REPO_PATH` | Recommended | Local repo path for auto branch detection |
| `NODE_TLS_REJECT_UNAUTHORIZED` | If behind proxy | Set to `"0"` for corporate TLS proxies |

### VS Code MCP Configuration

Add to the `env` block in `.vscode/mcp.json`:

```json
{
  "SONARQUBE_BASE_URL": "https://sonar.nice.com",
  "SONARQUBE_TOKEN": "your-user-token",
  "SONARQUBE_PROJECT_KEY": "your-project-key",
  "GIT_REPO_PATH": "C:/path/to/your/repo"
}
```

---

## Tools Reference

The integration provides **3 MCP tools**:

### `sonarqube_list_projects`

Lists SonarQube projects you have access to. Use to find the correct project key.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | string | No | | Search filter by name or key |
| `maxResults` | number | No | 25 | Max projects to return (1-100) |

**Output:**
```
Project Key            Project Name          Last Analysis
---------------------  --------------------  -------------------
my-service             My Service            2026-04-01T10:30:00
other-service          Other Service         2026-03-28T14:15:00

(2 projects total)
```

---

### `sonarqube_get_report`

**Primary entry point.** Gets a high-level report for a project/branch. **Auto-detects the current branch if not specified.**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `projectKey` | string | No | `SONARQUBE_PROJECT_KEY` env | Project key |
| `branch` | string | No | Auto-detected from `GIT_REPO_PATH` | Branch name |

**Output:**
```
=== SonarQube Report: my-service ===
Branch: feature/auth-fix

Quality Gate: PASSED
  [OK] new_reliability_rating: 1 (threshold: GT 1)
  [OK] new_security_rating: 1 (threshold: GT 1)

=== METRICS ===
  Bugs:                5
  Vulnerabilities:     12
  Code Smells:         45
  Security Hotspots:   3
  Coverage:            78.5%
  Duplicated Lines:    2.1%

=== OPEN ISSUES BY TYPE ===
  BUG: 5
  VULNERABILITY: 12
  CODE_SMELL: 45
  Total: 62

=== OPEN ISSUES BY SEVERITY ===
  BLOCKER: 1
  CRITICAL: 3
  MAJOR: 18
  MINOR: 30
  INFO: 10

Security Hotspots to Review: 3

---
To drill into specific issues, use sonarqube_get_issues with:
  types: ["VULNERABILITY"] and/or ["BUG", "CODE_SMELL"]
  severities: ["BLOCKER", "CRITICAL"] for highest priority
Ask the user which categories they want to focus on.
```

**Use when:** You want a quick overview. The AI will then ask which category to drill into.

---

### `sonarqube_get_issues`

Fetches detailed issues filtered by type and/or severity. **Auto-detects the current branch if not specified.**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `projectKey` | string | No | `SONARQUBE_PROJECT_KEY` env | Project key |
| `branch` | string | No | Auto-detected from `GIT_REPO_PATH` | Branch name |
| `types` | array | No | All types | `["VULNERABILITY"]`, `["BUG"]`, `["CODE_SMELL"]` |
| `severities` | array | No | All severities | `["BLOCKER","CRITICAL","MAJOR","MINOR","INFO"]` |
| `statuses` | array | No | Open issues | `["OPEN","CONFIRMED","REOPENED"]` |
| `maxResults` | number | No | 50 | Max issues to return (1-500) |

**Output:**
```
Project: my-service
Branch: feature/auth-fix
Types: VULNERABILITY

=== SEVERITY SUMMARY ===
  CRITICAL: 3
  MAJOR: 7
  MINOR: 2
  Showing 12 of 12 total

=== CRITICAL (3) ===

[VULNERABILITY] Use a strong cipher algorithm
  Rule: csharpsquid:S5547
  File: Services/CryptoHelper.cs, Line: 42
  Effort: 30min
  Tags: cwe, owasp-a3

[VULNERABILITY] Make sure this SQL query is safe
  Rule: csharpsquid:S3649
  File: DataAccess/UserRepository.cs, Line: 87
  Effort: 1h

=== MAJOR (7) ===
...
```

**Use when:** You've seen the report and want to drill into specific categories.

---

## Authentication

### Bearer Token

SonarQube uses simple Bearer token authentication:

```
Authorization: Bearer {SONARQUBE_TOKEN}
Accept: application/json
```

The token is a **User Token** generated from the SonarQube UI. It inherits the permissions of the user who generated it.

---

## Issue Categories & Severity

### Issue Types

| Type | Description |
|---|---|
| `VULNERABILITY` | Security vulnerability — exploitable weakness |
| `BUG` | Reliability issue — code that is wrong or will crash |
| `CODE_SMELL` | Maintainability issue — confusing, duplicated, or complex code |

**Security Hotspots** are separate and tracked via `sonarqube_get_report`. They represent security-sensitive code that needs manual review.

### Severity Levels

| Severity | Description | Priority |
|---|---|---|
| `BLOCKER` | Bug or vulnerability that breaks the build or is critical | Fix immediately |
| `CRITICAL` | Serious security or reliability issue | Fix before merge |
| `MAJOR` | Significant quality issue | Should fix |
| `MINOR` | Minor issue | Nice to fix |
| `INFO` | Informational / best practice | Low priority |

### Default Filters

- **`sonarqube_get_report`** — Shows all open issues (all types, all severities) as faceted counts
- **`sonarqube_get_issues`** — Defaults to open issues only (`OPEN`, `CONFIRMED`, `REOPENED`). Excludes `RESOLVED` and `CLOSED`.

---

## AI-Assisted Fix Workflow

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
| "Check SonarQube"|---->| "Vulnerabilities"|---->| "Fix the SQL     |
|  (zero params)   |     |  (user chooses)  |     |  injection in    |
|                  |     |                  |     |  UserRepo:87"    |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
  sonarqube_get_report     sonarqube_get_issues      AI reads file,
  auto-detects branch      types:["VULNERABILITY"]   proposes fix,
  shows overview           returns file+line info    user approves
```

### Example Conversation

```
User:  "Check SonarQube"

AI:    Calls sonarqube_get_report() — branch auto-detected as "feature/auth-fix"
       -> Quality Gate: FAILED
       -> Bugs: 5, Vulnerabilities: 12, Code Smells: 45
       -> "Which categories would you like to focus on?"

User:  "Vulnerabilities"

AI:    Calls sonarqube_get_issues(types: ["VULNERABILITY"])
       -> 12 vulnerabilities found
       -> 3 CRITICAL, 7 MAJOR, 2 MINOR
       -> Shows file paths, line numbers, rules

User:  "Fix the SQL injection in UserRepository.cs line 87"

AI:    Reads the file, finds the raw SQL concatenation
       Proposes parameterized query fix
       User approves -> AI edits the file
```

---

## Project Structure

```
src/
  utils/
    git.ts                      # getCurrentBranch() — auto-detects branch
  clients/
    sonarqube-client.ts         # SonarQube Web API client
                                #   - Bearer token auth
                                #   - JSON responses
                                #   - Methods: searchProjects, searchIssues,
                                #     getQualityGateStatus, getMeasures,
                                #     searchHotspots
  tools/
    sonarqube/
      index.ts                  # Registers all 3 SonarQube tools
      list-projects.ts          # sonarqube_list_projects
      get-report.ts             # sonarqube_get_report
      get-issues.ts             # sonarqube_get_issues
  types/
    sonarqube.ts                # TypeScript interfaces for all API responses
  config.ts                     # loadSonarQubeConfig() — returns null if
                                #   SONARQUBE_BASE_URL or SONARQUBE_TOKEN not set
  server.ts                     # Conditional tool registration
```

### SonarQube API Endpoints Used

| Endpoint | Used By | Purpose |
|---|---|---|
| `GET /api/projects/search` | `list-projects` | List accessible projects |
| `GET /api/issues/search` | `get-report`, `get-issues` | Fetch issues with facets |
| `GET /api/qualitygates/project_status` | `get-report` | Quality gate pass/fail |
| `GET /api/measures/component` | `get-report` | Numeric metrics |
| `GET /api/hotspots/search` | `get-report` | Security hotspots to review |

### Conditional Registration

SonarQube tools are **optional**. If `SONARQUBE_BASE_URL` or `SONARQUBE_TOKEN` are not set, the server starts with only Jira/Confluence/Veracode tools:

```
SonarQube tools disabled: SONARQUBE_BASE_URL and SONARQUBE_TOKEN not set
```

---

## Troubleshooting

### 401 Unauthorized

- Verify you're using a **User Token** (not Global Analysis or Project Analysis)
- Ensure the token hasn't expired
- Check that the token has permissions to the project

### 403 Forbidden

- The token user may not have access to the project
- Ask your SonarQube admin to grant "Browse" permission on the project

### TLS Certificate Error

**Fix:** Add `"NODE_TLS_REJECT_UNAUTHORIZED": "0"` to your mcp.json env block.

### No Branch Data

- SonarQube only has data for branches that have been analyzed
- Ensure your CI pipeline runs SonarQube analysis for the branch
- If the branch has never been scanned, SonarQube will return empty results

### Quality Gate / Metrics "Unable to retrieve"

- The project may not have a quality gate assigned
- Some metrics (like coverage) require test analysis to be configured in CI

### Hotspot Counts Missing

- The `/api/hotspots/search` endpoint was introduced in SonarQube 8.x
- If your instance runs an older version, hotspot data is silently skipped

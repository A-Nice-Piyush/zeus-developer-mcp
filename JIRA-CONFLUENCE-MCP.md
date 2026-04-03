# Jira & Confluence MCP Integration

An MCP server extension that connects AI assistants to Atlassian Cloud Jira and Confluence. It enables an AI to read Jira stories/epics, understand requirements, manage sprint work, search Confluence documentation, and tie it all together — so developers can go from ticket to code with minimal effort.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [How It Works](#how-it-works)
- [Setup & Configuration](#setup--configuration)
- [Jira Tools Reference](#jira-tools-reference)
- [Confluence Tools Reference](#confluence-tools-reference)
- [Authentication](#authentication)
- [AI-Assisted Implementation Workflow](#ai-assisted-implementation-workflow)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
+---------------------+          +---------------------+          +------------------------+
|                     |   MCP    |                     |  Basic   |                        |
|   AI Assistant      |<-------->|   MCP Server        |<-------->|   Atlassian Cloud      |
|   (VS Code / CLI)   |  Tools   |   (Node.js)         |  Auth    |   yourco.atlassian.net |
|                     |          |                     |          |                        |
+---------------------+          +---------------------+          +--------+---------------+
                                                                           |
                                                          +----------------+----------------+
                                                          |                                 |
                                                  +-------v-------+               +---------v-------+
                                                  |               |               |                 |
                                                  |   Jira REST   |               |  Confluence     |
                                                  |   API v3      |               |  REST API v2    |
                                                  |               |               |                 |
                                                  +---------------+               +-----------------+
```

The MCP server provides unified access to:

1. **Jira REST API v3** — Issues, epics, sprints, transitions, comments
2. **Jira Agile API v1** — Boards, sprints, sprint issues
3. **Confluence REST API v2** — Pages, spaces, search, comments

---

## How It Works

### Story-to-Code Workflow

The most powerful pattern: AI reads a Jira story, understands the requirements, searches Confluence for design docs, and implements the code.

```
  User says: "Implement PROJ-123"
                      |
                      v
         +---------------------------+
         | 1. Read Jira Story        |
         |    jira_get_issue          |
         |    GET /rest/api/3/       |
         |    issue/PROJ-123         |
         +------------+--------------+
                      |
              Summary, Description,
              Acceptance Criteria,
              Status, Assignee,
              Recent Comments
                      |
                      v
         +---------------------------+
         | 2. Move to In Progress    |
         |    jira_update_status      |
         |    POST /rest/api/3/      |
         |    issue/PROJ-123/        |
         |    transitions            |
         +------------+--------------+
                      |
                      v
         +---------------------------+
         | 3. Search Confluence      |
         |    (optional)             |
         |    confluence_search       |
         |    for related design docs|
         +------------+--------------+
                      |
                      v
         +---------------------------+
         | 4. AI Implements Code     |
         |    Reads files, makes     |
         |    changes based on       |
         |    requirements           |
         +------------+--------------+
                      |
                      v
         +---------------------------+
         | 5. Add Jira Comment       |
         |    jira_add_comment        |
         |    Summary of changes,    |
         |    files modified         |
         +------------+--------------+
                      |
                      v
         +---------------------------+
         | 6. Move to In Review      |
         |    jira_update_status      |
         +---------------------------+
```

### Epic Planning Workflow

```
  User says: "Plan epic PROJ-50"
                      |
                      v
         +---------------------------+
         | 1. Get Epic + Children    |
         |    jira_get_epic           |
         |    Shows all stories      |
         |    grouped by status:     |
         |    Done / In Progress /   |
         |    To Do                  |
         +------------+--------------+
                      |
                      v
         AI presents:
         "Epic: Authentication Revamp"
         Done: 3 stories
         In Progress: 2 stories
         To Do: 5 stories

         "Here are the remaining
          stories. Which one should
          I implement?"
```

---

## Setup & Configuration

### Prerequisites

1. **Atlassian Cloud account** (e.g. `yourcompany.atlassian.net`)
2. **Atlassian API Token** (generated from your Atlassian account)

### Obtaining an Atlassian API Token

1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Give it a label (e.g. `mcp-server`)
4. Copy the token

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ATLASSIAN_BASE_URL` | Yes | e.g. `https://yourcompany.atlassian.net` |
| `ATLASSIAN_EMAIL` | Yes | Your Atlassian account email |
| `ATLASSIAN_API_TOKEN` | Yes | API token from step above |

### VS Code MCP Configuration

In `.vscode/mcp.json`:

```json
{
  "servers": {
    "atlassian": {
      "command": "node",
      "args": ["path/to/pocr_dev_mcp/dist/index.js"],
      "env": {
        "ATLASSIAN_BASE_URL": "https://yourcompany.atlassian.net",
        "ATLASSIAN_EMAIL": "your-email@company.com",
        "ATLASSIAN_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

> Jira/Confluence tools are **always registered** (they're the base integration). Veracode and SonarQube are optional add-ons.

---

## Jira Tools Reference

### `jira_search_issues`

Search Jira issues using JQL (Jira Query Language).

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `jql` | string | Yes | | JQL query string |
| `maxResults` | number | No | 20 | Max results (1-50) |

**Example JQL queries:**
```
project = PROJ AND status = "In Progress"
project = PROJ AND type = Bug AND status != Done ORDER BY priority DESC
assignee = currentUser() AND sprint in openSprints()
project = PROJ AND labels = "security" AND created >= -7d
```

---

### `jira_get_issue`

Get detailed information about a specific Jira issue.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `issueKey` | string | Yes | e.g. `PROJ-123` |

**Returns:** Summary, description, status, assignee, priority, labels, linked issues, recent comments, and attachments.

---

### `jira_get_epic`

Get an epic with all its child stories/tasks, grouped by status.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `epicKey` | string | Yes | e.g. `PROJ-50` |

**Returns:** Epic details + all child issues grouped as Done / In Progress / To Do, with progress overview.

---

### `jira_get_sprint`

Get the current/active sprint issues for a board.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `boardId` | number | No* | Board ID (if known) |
| `projectKey` | string | No* | Project key to find the board |

*Provide either `boardId` or `projectKey`.

**Returns:** Active sprint name, dates, and all issues with status.

---

### `jira_list_projects`

List all accessible Jira projects.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `maxResults` | number | No | 50 | Max results (1-100) |

---

### `jira_add_comment`

Add a comment to a Jira issue.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `issueKey` | string | Yes | e.g. `PROJ-123` |
| `comment` | string | Yes | Comment text |

**Use when:** Documenting implementation details, fixes applied, or status updates on a ticket.

---

### `jira_update_status`

Transition a Jira issue to a new status.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `issueKey` | string | Yes | e.g. `PROJ-123` |
| `statusName` | string | Yes | Target status, e.g. `"In Progress"`, `"Done"` |

The tool fetches available transitions and matches by name. If the requested status is not available, it shows valid transitions.

---

## Confluence Tools Reference

### `confluence_search`

Search Confluence content using CQL (Confluence Query Language).

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `cql` | string | Yes | | CQL query string |
| `limit` | number | No | 10 | Max results (1-25) |

**Example CQL queries:**
```
type=page AND space=DEV AND text~"deployment"
type=page AND title~"architecture"
type=page AND ancestor=12345
type=page AND space=PROJ AND lastModified>now("-30d")
```

---

### `confluence_get_page`

Get a Confluence page content converted to readable markdown.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `pageId` | string | Yes | Confluence page ID (numeric string) |

**Returns:** Page title, space, and full content converted from Atlassian Document Format (ADF) or storage format to readable markdown.

Use `confluence_search` to find page IDs.

---

### `confluence_get_page_children`

Get child pages of a Confluence page.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `pageId` | string | Yes | | Parent page ID |
| `limit` | number | No | 25 | Max results (1-50) |

**Use when:** Navigating a documentation hierarchy.

---

### `confluence_list_spaces`

List available Confluence spaces.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | number | No | 50 | Max results (1-100) |

---

### `confluence_add_comment`

Add a footer comment to a Confluence page.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `pageId` | string | Yes | Confluence page ID |
| `comment` | string | Yes | Comment text |

---

## Authentication

### Atlassian Basic Auth

All Jira and Confluence API calls use HTTP Basic Authentication:

```
Authorization: Basic {base64(email:apiToken)}
```

Where `email` is your Atlassian account email and `apiToken` is the API token generated from your Atlassian account security settings.

### HTTP Client Features

| Feature | Detail |
|---|---|
| **Auth** | Basic Auth (email:apiToken) |
| **Timeout** | 30 seconds (standard), 120 seconds (uploads) |
| **Rate Limiting** | Auto-retry on HTTP 429 (up to 3 retries with exponential backoff) |
| **Error Handling** | Custom `AtlassianApiError` with parsed error messages |

---

## AI-Assisted Implementation Workflow

### Simple: Read Story and Implement

```
User:  "Implement PROJ-123"

AI:    Calls jira_get_issue("PROJ-123")
       -> Story: "Add rate limiting to API endpoints"
       -> Description: "Apply rate limiting middleware to all public endpoints.
          Use Redis-based sliding window. Max 100 req/min per API key."
       -> Acceptance Criteria:
          - Rate limit applied to /api/* routes
          - Redis backend for distributed rate tracking
          - 429 response with Retry-After header

       "I'll implement this. Let me start by reading the relevant files..."

AI:    Reads existing middleware, router config, Redis client
       Implements rate limiting middleware
       Updates route configuration
       Adds tests

AI:    Calls jira_add_comment("PROJ-123", "Implemented rate limiting:
       - Added RateLimitMiddleware with Redis sliding window
       - Applied to all /api/* routes (100 req/min per API key)
       - Returns 429 with Retry-After header
       Files: src/middleware/rate-limit.ts, src/routes/api.ts")
```

### Advanced: Epic Breakdown with Confluence Research

```
User:  "Plan the implementation of epic PROJ-50"

AI:    Calls jira_get_epic("PROJ-50")
       -> Epic: "Authentication Revamp"
       -> Done: PROJ-51, PROJ-52, PROJ-53
       -> In Progress: PROJ-54
       -> To Do: PROJ-55, PROJ-56, PROJ-57, PROJ-58, PROJ-59

AI:    Calls confluence_search('type=page AND space=DEV AND text~"authentication"')
       -> Found: "Auth Architecture v2" (page 12345)

AI:    Calls confluence_get_page("12345")
       -> Reads design document with architecture decisions, API contracts, data models

AI:    "Here's the implementation plan based on the epic and design doc:

       1. PROJ-55: Implement OAuth2 provider integration (depends on design doc section 3)
       2. PROJ-56: Add token refresh endpoint (prerequisite for PROJ-57)
       3. PROJ-57: Update session management (uses new token from PROJ-56)
       4. PROJ-58: Add MFA support (independent, can be parallel)
       5. PROJ-59: Migration script for existing users (should be last)

       Which story should I start with?"
```

---

## Project Structure

```
src/
  clients/
    http-client.ts             # AtlassianHttpClient — base HTTP client
                               #   Basic Auth, retry on 429, 30s timeout
    jira-client.ts             # JiraClient — Jira REST API v3
                               #   searchIssues, getIssue, getEpicWithChildren,
                               #   listProjects, addComment, transitionIssue
    jira-agile-client.ts       # JiraAgileClient — Jira Agile API v1
                               #   getActiveSprint, getSprintIssues,
                               #   listBoards, getBoardByProject
    confluence-client.ts       # ConfluenceClient — Confluence REST API v2
                               #   search, getPage, getChildPages,
                               #   listSpaces, addComment
  tools/
    jira/
      index.ts                 # Registers all 7 Jira tools
      search-issues.ts         # jira_search_issues
      get-issue.ts             # jira_get_issue
      get-epic.ts              # jira_get_epic
      get-sprint.ts            # jira_get_sprint
      list-projects.ts         # jira_list_projects
      add-comment.ts           # jira_add_comment
      update-status.ts         # jira_update_status
    confluence/
      index.ts                 # Registers all 5 Confluence tools
      search.ts                # confluence_search
      get-page.ts              # confluence_get_page
      get-page-children.ts     # confluence_get_page_children
      list-spaces.ts           # confluence_list_spaces
      add-comment.ts           # confluence_add_comment
  resources/
    index.ts                   # Registers MCP resources for Jira and Confluence
  converters/
    adf-to-markdown.ts         # Converts Atlassian Document Format to markdown
  config.ts                    # loadConfig() — reads Atlassian env vars
  server.ts                    # Creates server, registers all tools
```

### Jira REST API Endpoints Used

| Endpoint | Used By | Purpose |
|---|---|---|
| `POST /rest/api/3/search/jql` | `jira_search_issues` | JQL search |
| `GET /rest/api/3/issue/{key}` | `jira_get_issue`, `jira_get_epic` | Get issue details |
| `GET /rest/api/3/project/search` | `jira_list_projects` | List projects |
| `POST /rest/api/3/issue/{key}/comment` | `jira_add_comment` | Add comment |
| `GET /rest/api/3/issue/{key}/transitions` | `jira_update_status` | Get available transitions |
| `POST /rest/api/3/issue/{key}/transitions` | `jira_update_status` | Transition issue |
| `GET /rest/agile/1.0/board` | `jira_get_sprint` | List/find boards |
| `GET /rest/agile/1.0/board/{id}/sprint` | `jira_get_sprint` | Get active sprint |
| `GET /rest/agile/1.0/sprint/{id}/issue` | `jira_get_sprint` | Get sprint issues |

### Confluence REST API Endpoints Used

| Endpoint | Used By | Purpose |
|---|---|---|
| `GET /wiki/rest/api/content/search` | `confluence_search` | CQL search |
| `GET /wiki/api/v2/pages/{id}` | `confluence_get_page` | Get page content |
| `GET /wiki/api/v2/pages/{id}/children` | `confluence_get_page_children` | List child pages |
| `GET /wiki/api/v2/spaces` | `confluence_list_spaces` | List spaces |
| `POST /wiki/api/v2/footer-comments` | `confluence_add_comment` | Add comment |

---

## Troubleshooting

### 401 Unauthorized

- Verify `ATLASSIAN_EMAIL` matches your Atlassian account email
- Verify `ATLASSIAN_API_TOKEN` is a valid API token (not your password)
- Regenerate the token at [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens)

### 403 Forbidden

- Your account may not have access to the specific project or space
- Check project permissions in Jira or space permissions in Confluence

### 404 Not Found

- Verify `ATLASSIAN_BASE_URL` is correct (e.g. `https://yourcompany.atlassian.net`)
- Ensure the issue key or page ID exists

### 429 Too Many Requests

The HTTP client automatically retries on 429 with exponential backoff (up to 3 retries). If you consistently hit rate limits, reduce the frequency of your requests.

### Transition Not Available

When using `jira_update_status`, the target status must be a valid transition from the current status. The tool will show available transitions if the requested one isn't valid.

Common transitions: `To Do` -> `In Progress` -> `In Review` -> `Done`

### Confluence Page Content Empty or Garbled

- The page may use a format that's difficult to convert (e.g. embedded macros, draw.io diagrams)
- The tool tries ADF format first, then falls back to storage format
- Some content (like embedded images or complex tables) may not render perfectly in text

# Using the Zeus MCP Server in Your Project

This MCP server provides tools for Jira, Confluence, Veracode, and SonarQube.
It is distributed as a Docker image — no Node.js installation required.

**Prerequisites:** Docker Desktop must be running.

---

## Step 1 — Pull the image

```bash
docker pull ghcr.io/a-nice-piyush/zeus_dev_mcp:latest
```

---

## Step 2 — Add to your project's MCP config

Pick the section for your tool below, create the file in your **project root**, and fill in your credentials.
**Add the config file to your `.gitignore` so credentials are never committed.**

---

### Claude Code — `.mcp.json`

```json
{
  "mcpServers": {
    "zeus-mcp": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "ATLASSIAN_BASE_URL",
        "-e", "ATLASSIAN_EMAIL",
        "-e", "ATLASSIAN_API_TOKEN",
        "-e", "VERACODE_API_ID",
        "-e", "VERACODE_API_KEY",
        "-e", "VERACODE_APP_NAME",
        "-e", "SONARQUBE_BASE_URL",
        "-e", "SONARQUBE_TOKEN",
        "-e", "SONARQUBE_PROJECT_KEY",
        "-e", "GITHUB_TOKEN",
        "-e", "GITHUB_REPO",
        "-e", "NODE_TLS_REJECT_UNAUTHORIZED",
        "ghcr.io/a-nice-piyush/zeus_dev_mcp:latest"
      ],
      "env": {
        "ATLASSIAN_BASE_URL":           "https://yourcompany.atlassian.net",
        "ATLASSIAN_EMAIL":              "you@company.com",
        "ATLASSIAN_API_TOKEN":          "your-atlassian-api-token",
        "VERACODE_API_ID":              "your-veracode-api-id",
        "VERACODE_API_KEY":             "your-veracode-api-key",
        "VERACODE_APP_NAME":            "your-app-name",
        "SONARQUBE_BASE_URL":           "https://sonar.nice.com",
        "SONARQUBE_TOKEN":              "your-sonarqube-token",
        "SONARQUBE_PROJECT_KEY":        "your-project-key",
        "GITHUB_TOKEN":                 "ghp_your-github-token",
        "GITHUB_REPO":                  "my-org/my-repo",
        "NODE_TLS_REJECT_UNAUTHORIZED": "0"
      }
    }
  }
}
```

Add to `.gitignore`:

```
.mcp.json
```

---

### GitHub Copilot in VSCode — `.vscode/mcp.json`

Create a `.vscode/` folder in your project root if it doesn't exist, then create this file inside it.

```json
{
  "servers": {
    "zeus-mcp": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "ATLASSIAN_BASE_URL",
        "-e", "ATLASSIAN_EMAIL",
        "-e", "ATLASSIAN_API_TOKEN",
        "-e", "VERACODE_API_ID",
        "-e", "VERACODE_API_KEY",
        "-e", "VERACODE_APP_NAME",
        "-e", "SONARQUBE_BASE_URL",
        "-e", "SONARQUBE_TOKEN",
        "-e", "SONARQUBE_PROJECT_KEY",
        "-e", "GITHUB_TOKEN",
        "-e", "GITHUB_REPO",
        "-e", "NODE_TLS_REJECT_UNAUTHORIZED",
        "ghcr.io/a-nice-piyush/zeus_dev_mcp:latest"
      ],
      "env": {
        "ATLASSIAN_BASE_URL":           "https://yourcompany.atlassian.net",
        "ATLASSIAN_EMAIL":              "you@company.com",
        "ATLASSIAN_API_TOKEN":          "your-atlassian-api-token",
        "VERACODE_API_ID":              "your-veracode-api-id",
        "VERACODE_API_KEY":             "your-veracode-api-key",
        "VERACODE_APP_NAME":            "your-app-name",
        "SONARQUBE_BASE_URL":           "https://sonar.nice.com",
        "SONARQUBE_TOKEN":              "your-sonarqube-token",
        "SONARQUBE_PROJECT_KEY":        "your-project-key",
        "GITHUB_TOKEN":                 "ghp_your-github-token",
        "GITHUB_REPO":                  "my-org/my-repo",
        "NODE_TLS_REJECT_UNAUTHORIZED": "0"
      }
    }
  }
}
```

Add to `.gitignore`:

```
.vscode/mcp.json
```

---

## Step 3 — Where to get each credential

| Variable | Where to get it |
|---|---|
| `ATLASSIAN_API_TOKEN` | https://id.atlassian.com/manage-profile/security/api-tokens |
| `VERACODE_API_ID` / `VERACODE_API_KEY` | Veracode Platform > My Profile > API Credentials |
| `SONARQUBE_TOKEN` | SonarQube > My Account > Security > Generate Token |
| `GITHUB_TOKEN` | GitHub > Settings > Developer settings > Personal access tokens (needs `Actions:read`, `Contents:read`) |

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `ATLASSIAN_BASE_URL` | Yes | Atlassian Cloud URL, e.g. `https://yourcompany.atlassian.net` |
| `ATLASSIAN_EMAIL` | Yes | Email address associated with your Atlassian account |
| `ATLASSIAN_API_TOKEN` | Yes | Atlassian API token |
| `VERACODE_API_ID` | Optional | Veracode API ID — Veracode tools are disabled if omitted |
| `VERACODE_API_KEY` | Optional | Veracode API key |
| `VERACODE_APP_NAME` | Optional | Default Veracode application profile name |
| `SONARQUBE_BASE_URL` | Optional | SonarQube instance URL — SonarQube tools are disabled if omitted |
| `SONARQUBE_TOKEN` | Optional | SonarQube user token |
| `SONARQUBE_PROJECT_KEY` | Optional | SonarQube project key |
| `GITHUB_TOKEN` | Optional | GitHub PAT used by Veracode PR scan tools |
| `GITHUB_REPO` | Optional | Repository in `owner/repo` format |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Optional | Set to `0` if your network uses self-signed SSL certificates |

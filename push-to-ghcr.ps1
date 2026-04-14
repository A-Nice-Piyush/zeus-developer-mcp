# push-to-ghcr.ps1 - Build and push the MCP server image to GitHub Container Registry
#
# Requirements:
#   - Docker Desktop running
#   - A GitHub Personal Access Token (classic) with the write:packages scope
#     Create one at: https://github.com/settings/tokens/new
#
# Usage (from PowerShell in the project folder):
#   .\push-to-ghcr.ps1
#
# Or supply values inline:
#   $env:GITHUB_USERNAME="myuser"; $env:GITHUB_TOKEN="ghp_xxx"; .\push-to-ghcr.ps1

$ErrorActionPreference = "Stop"

$REGISTRY = "ghcr.io"

# --- 1. Load credentials ---
$SECRETS_FILE = ".ghcr-secrets.ps1"
if (Test-Path $SECRETS_FILE) {
    Write-Host "Loading credentials from $SECRETS_FILE"
    . ".\$SECRETS_FILE"
}

if (-not $env:GITHUB_USERNAME) {
    $env:GITHUB_USERNAME = Read-Host "GitHub username"
}

if (-not $env:GITHUB_TOKEN) {
    $secureToken = Read-Host "GitHub Personal Access Token (write:packages)" -AsSecureString
    $env:GITHUB_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    )
}

# --- 2. Derive image name ---
# GitHub usernames may only contain alphanumeric characters and hyphens.
# If the user supplied an email address, strip the domain and warn them to confirm.
$rawUsername = $env:GITHUB_USERNAME
if ($rawUsername -match "@") {
    $rawUsername = $rawUsername.Split("@")[0]
    Write-Host "Note: stripped email domain - candidate username is '$rawUsername'."
}
# Replace dots (invalid in GitHub usernames) with hyphens
$safeUsername = $rawUsername.ToLower() -replace "\.", "-"

# Validate: only alphanumeric + hyphens allowed
if ($safeUsername -match "[^a-z0-9\-]") {
    Write-Host ""
    Write-Host "ERROR: '$safeUsername' is not a valid GitHub username (only letters, numbers, hyphens allowed)."
    Write-Host "Set your real GitHub username and try again:"
    Write-Host '  $env:GITHUB_USERNAME = "your-github-username"'
    Write-Host "  .\push-to-ghcr.ps1"
    exit 1
}
Write-Host "Using GitHub username: $safeUsername"

if (-not $env:IMAGE_REPO) {
    $env:IMAGE_REPO = "$safeUsername/zeus_dev_mcp"
}
$IMAGE = "$REGISTRY/$($env:IMAGE_REPO)"

# --- 3. Determine version tag ---
$GIT_SHA = ""
try {
    $GIT_SHA = (git rev-parse --short HEAD 2>$null).Trim()
} catch {}
$VERSION_TAG = if ($GIT_SHA) { "sha-$GIT_SHA" } else { "" }

Write-Host ""
Write-Host "Registry : $REGISTRY"
Write-Host "Image    : $IMAGE"
Write-Host "Tags     : latest$(if ($VERSION_TAG) { ", $VERSION_TAG" })"
Write-Host ""

# --- 4. Log in to GHCR ---
Write-Host ">>> Logging in to $REGISTRY ..."
$env:GITHUB_TOKEN | docker login $REGISTRY --username $env:GITHUB_USERNAME --password-stdin
if ($LASTEXITCODE -ne 0) { throw "Docker login failed" }

# --- 5. Build ---
Write-Host ""
Write-Host ">>> Building image ..."
$buildArgs = @("build", "--tag", "${IMAGE}:latest")
if ($VERSION_TAG) { $buildArgs += @("--tag", "${IMAGE}:${VERSION_TAG}") }
$buildArgs += "."

docker @buildArgs
if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }

# --- 6. Push ---
Write-Host ""
Write-Host ">>> Pushing ${IMAGE}:latest ..."
docker push "${IMAGE}:latest"
if ($LASTEXITCODE -ne 0) { throw "Docker push failed" }

if ($VERSION_TAG) {
    Write-Host ">>> Pushing ${IMAGE}:${VERSION_TAG} ..."
    docker push "${IMAGE}:${VERSION_TAG}"
    if ($LASTEXITCODE -ne 0) { throw "Docker push (sha tag) failed" }
}

# --- 7. Done ---
Write-Host ""
Write-Host "Done. Image available at:"
Write-Host "  ${IMAGE}:latest"
if ($VERSION_TAG) { Write-Host "  ${IMAGE}:${VERSION_TAG}" }
Write-Host ""
Write-Host "Add this to your mcp.json:"
Write-Host @"
{
  "mcpServers": {
    "atlassian": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "ATLASSIAN_BASE_URL",
        "-e", "ATLASSIAN_EMAIL",
        "-e", "ATLASSIAN_API_TOKEN",
        "${IMAGE}:latest"
      ],
      "env": {
        "ATLASSIAN_BASE_URL": "https://yourcompany.atlassian.net",
        "ATLASSIAN_EMAIL":    "you@company.com",
        "ATLASSIAN_API_TOKEN":"your-token-here"
      }
    }
  }
}
"@

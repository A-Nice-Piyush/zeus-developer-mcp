#!/usr/bin/env bash
# push-to-ghcr.sh — Build and push the MCP server image to GitHub Container Registry
# ─────────────────────────────────────────────────────────────────────────────
# Requirements:
#   - Docker Desktop running
#   - A GitHub Personal Access Token (classic) with the  write:packages  scope
#     Create one at: https://github.com/settings/tokens/new
#     (check: write:packages, read:packages, delete:packages)
#
# Usage:
#   chmod +x push-to-ghcr.sh
#   ./push-to-ghcr.sh
#
# Or supply values inline:
#   GITHUB_USERNAME=myuser GITHUB_TOKEN=ghp_xxx ./push-to-ghcr.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REGISTRY="ghcr.io"

# ── 1. Load credentials ───────────────────────────────────────────────────────
# Check for a local secrets file first (never committed — see .gitignore)
SECRETS_FILE=".ghcr-secrets"
if [[ -f "$SECRETS_FILE" ]]; then
  echo "Loading credentials from $SECRETS_FILE"
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
fi

if [[ -z "${GITHUB_USERNAME:-}" ]]; then
  read -rp "GitHub username: " GITHUB_USERNAME
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  read -rsp "GitHub Personal Access Token (write:packages): " GITHUB_TOKEN
  echo
fi

# ── 2. Derive image name ──────────────────────────────────────────────────────
# Default: ghcr.io/<your-username>/zeus_dev_mcp
#   Override by setting IMAGE_REPO before running, e.g.:
#   IMAGE_REPO=my-org/my-mcp-server ./push-to-ghcr.sh
IMAGE_REPO="${IMAGE_REPO:-${GITHUB_USERNAME}/zeus_dev_mcp}"
IMAGE="${REGISTRY}/${IMAGE_REPO}"

# ── 3. Determine version tag ──────────────────────────────────────────────────
# Uses the git short SHA; falls back to "latest" if git is unavailable
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "")
VERSION_TAG="${GIT_SHA:+sha-${GIT_SHA}}"

echo ""
echo "Registry : ${REGISTRY}"
echo "Image    : ${IMAGE}"
echo "Tags     : latest${VERSION_TAG:+, ${VERSION_TAG}}"
echo ""

# ── 4. Log in to GHCR ────────────────────────────────────────────────────────
echo ">>> Logging in to ${REGISTRY} ..."
echo "${GITHUB_TOKEN}" | docker login "${REGISTRY}" \
  --username "${GITHUB_USERNAME}" \
  --password-stdin

# ── 5. Build ──────────────────────────────────────────────────────────────────
echo ""
echo ">>> Building image ..."
docker build \
  --tag "${IMAGE}:latest" \
  ${VERSION_TAG:+--tag "${IMAGE}:${VERSION_TAG}"} \
  .

# ── 6. Push ───────────────────────────────────────────────────────────────────
echo ""
echo ">>> Pushing ${IMAGE}:latest ..."
docker push "${IMAGE}:latest"

if [[ -n "${VERSION_TAG}" ]]; then
  echo ">>> Pushing ${IMAGE}:${VERSION_TAG} ..."
  docker push "${IMAGE}:${VERSION_TAG}"
fi

# ── 7. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "✓ Done. Image available at:"
echo "  ${IMAGE}:latest"
[[ -n "${VERSION_TAG}" ]] && echo "  ${IMAGE}:${VERSION_TAG}"
echo ""
echo "Add this to your mcp.json:"
cat <<EOF
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
EOF

/**
 * Uploads an SVG architecture diagram to the Confluence page
 * and replaces the draw.io macro + old code block with an image.
 *
 * Usage: node update-confluence-diagram.mjs
 */

import "dotenv/config";

const BASE_URL = process.env.ATLASSIAN_BASE_URL || "https://nice-ce-cxone-prod.atlassian.net";
const EMAIL = process.env.ATLASSIAN_EMAIL || "piyush.bora@nice.com";
const TOKEN = process.env.ATLASSIAN_API_TOKEN;

if (!TOKEN) {
  console.error("Missing ATLASSIAN_API_TOKEN");
  process.exit(1);
}

const AUTH = Buffer.from(`${EMAIL}:${TOKEN}`).toString("base64");
const PAGE_ID = "3544416375";
const SPACE_KEY = "IN";
const FILE_NAME = "mcp-architecture.svg";

// ── Step 1: Build SVG ──

function buildSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1020 440" font-family="Segoe UI, Arial, sans-serif">
  <defs>
    <filter id="shadow" x="-4%" y="-4%" width="108%" height="112%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.12"/>
    </filter>
    <marker id="arrow" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-auto">
      <path d="M 0 0 L 10 3 L 0 6 Z" fill="#555"/>
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-auto">
      <path d="M 0 0 L 10 3 L 0 6 Z" fill="#4A86C8"/>
    </marker>
    <marker id="arrow-purple" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-auto">
      <path d="M 0 0 L 10 3 L 0 6 Z" fill="#8B6CAF"/>
    </marker>
  </defs>

  <!-- Background -->
  <rect width="1020" height="440" rx="12" fill="#FAFBFC"/>

  <!-- ═══ AI Assistant ═══ -->
  <rect x="30" y="120" width="200" height="95" rx="12" fill="#DAE8FC" stroke="#6C8EBF" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="130" y="158" text-anchor="middle" font-size="15" font-weight="bold" fill="#2D4A7A">AI Assistant</text>
  <text x="130" y="180" text-anchor="middle" font-size="12" fill="#4A6FA0">VS Code / Claude Code</text>
  <text x="130" y="196" text-anchor="middle" font-size="12" fill="#4A6FA0">Copilot Chat</text>

  <!-- ═══ MCP Server ═══ -->
  <rect x="360" y="100" width="220" height="130" rx="12" fill="#D5E8D4" stroke="#82B366" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="470" y="135" text-anchor="middle" font-size="17" font-weight="bold" fill="#3B6E2E">ZEUS</text>
  <text x="470" y="155" text-anchor="middle" font-size="9.5" fill="#4E8A3E">Zero-Effort Utility for Software</text>
  <line x1="410" y1="172" x2="530" y2="172" stroke="#82B366" stroke-width="0.8"/>
  <text x="470" y="192" text-anchor="middle" font-size="11" fill="#4E8A3E">Jira (7) · Confluence (5)</text>
  <text x="470" y="210" text-anchor="middle" font-size="11" fill="#4E8A3E">Veracode (6) · SonarQube (3)</text>

  <!-- ═══ Arrow: AI → MCP ═══ -->
  <line x1="230" y1="165" x2="355" y2="165" stroke="#4A86C8" stroke-width="2.5" marker-end="url(#arrow-blue)"/>
  <rect x="258" y="143" width="70" height="20" rx="4" fill="#EBF2FA"/>
  <text x="293" y="157" text-anchor="middle" font-size="10" font-weight="600" fill="#4A86C8">MCP Tools</text>

  <!-- ═══ External APIs group ═══ -->
  <rect x="700" y="40" width="290" height="300" rx="10" fill="#F8F9FA" stroke="#D0D5DD" stroke-width="1" stroke-dasharray="6,3"/>
  <text x="845" y="65" text-anchor="middle" font-size="13" font-weight="600" fill="#666">External APIs</text>

  <!-- Jira -->
  <rect x="720" y="80" width="250" height="48" rx="8" fill="#FFF2CC" stroke="#D6B656" stroke-width="1.2" filter="url(#shadow)"/>
  <text x="845" y="101" text-anchor="middle" font-size="13" font-weight="bold" fill="#8C6D1F">Jira</text>
  <text x="845" y="118" text-anchor="middle" font-size="10" fill="#A68B3C">REST API v3 + Agile API v1</text>

  <!-- Confluence -->
  <rect x="720" y="140" width="250" height="48" rx="8" fill="#FFF2CC" stroke="#D6B656" stroke-width="1.2" filter="url(#shadow)"/>
  <text x="845" y="161" text-anchor="middle" font-size="13" font-weight="bold" fill="#8C6D1F">Confluence</text>
  <text x="845" y="178" text-anchor="middle" font-size="10" fill="#A68B3C">REST API v2</text>

  <!-- Veracode -->
  <rect x="720" y="200" width="250" height="48" rx="8" fill="#F8CECC" stroke="#B85450" stroke-width="1.2" filter="url(#shadow)"/>
  <text x="845" y="221" text-anchor="middle" font-size="13" font-weight="bold" fill="#8B3A37">Veracode</text>
  <text x="845" y="238" text-anchor="middle" font-size="10" fill="#A8504D">XML API v5 · HMAC-SHA256</text>

  <!-- SonarQube -->
  <rect x="720" y="260" width="250" height="48" rx="8" fill="#F8CECC" stroke="#B85450" stroke-width="1.2" filter="url(#shadow)"/>
  <text x="845" y="281" text-anchor="middle" font-size="13" font-weight="bold" fill="#8B3A37">SonarQube</text>
  <text x="845" y="298" text-anchor="middle" font-size="10" fill="#A8504D">Web API · Bearer Token</text>

  <!-- ═══ Arrows: MCP → APIs ═══ -->
  <line x1="580" y1="130" x2="715" y2="104" stroke="#D6B656" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="580" y1="150" x2="715" y2="164" stroke="#D6B656" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="580" y1="180" x2="715" y2="224" stroke="#B85450" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="580" y1="200" x2="715" y2="284" stroke="#B85450" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- ═══ Local Git Repo ═══ -->
  <rect x="400" y="340" width="180" height="65" rx="10" fill="#E1D5E7" stroke="#9673A6" stroke-width="1.2" filter="url(#shadow)"/>
  <text x="490" y="366" text-anchor="middle" font-size="13" font-weight="bold" fill="#5B3D6E">Local Git Repo</text>
  <text x="490" y="385" text-anchor="middle" font-size="10" fill="#7B5D92">Auto-detect branch</text>
  <text x="490" y="398" text-anchor="middle" font-size="9" fill="#9080A0">(GIT_REPO_PATH)</text>

  <!-- Arrow: MCP → Git (dashed) -->
  <line x1="480" y1="230" x2="488" y2="335" stroke="#9673A6" stroke-width="1.8" stroke-dasharray="5,3" marker-end="url(#arrow-purple)"/>
  <text x="510" y="280" font-size="10" fill="#7B5D92">git rev-parse</text>

  <!-- ═══ GitHub API ═══ -->
  <rect x="110" y="340" width="180" height="65" rx="10" fill="#E1D5E7" stroke="#9673A6" stroke-width="1.2" filter="url(#shadow)"/>
  <text x="200" y="366" text-anchor="middle" font-size="13" font-weight="bold" fill="#5B3D6E">GitHub API</text>
  <text x="200" y="385" text-anchor="middle" font-size="10" fill="#7B5D92">PR &amp; Workflow Lookup</text>
  <text x="200" y="398" text-anchor="middle" font-size="9" fill="#9080A0">(GITHUB_TOKEN)</text>

  <!-- Arrow: MCP → GitHub (dashed) -->
  <line x1="400" y1="225" x2="285" y2="335" stroke="#9673A6" stroke-width="1.8" stroke-dasharray="5,3" marker-end="url(#arrow-purple)"/>
  <text x="305" y="280" font-size="10" fill="#7B5D92">PR lookup</text>
</svg>`;
}

// ── Step 2: Upload SVG as attachment ──

async function uploadSvg() {
  const svg = buildSvg();
  const boundary = "----FormBoundary" + Date.now();
  const body =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${FILE_NAME}"\r\n` +
    `Content-Type: image/svg+xml\r\n\r\n` +
    svg +
    `\r\n--${boundary}--\r\n`;

  // Check for existing attachment
  const listRes = await fetch(
    `${BASE_URL}/wiki/rest/api/content/${PAGE_ID}/child/attachment?filename=${encodeURIComponent(FILE_NAME)}`,
    { headers: { Authorization: `Basic ${AUTH}`, Accept: "application/json" } }
  );
  const listData = await listRes.json();
  const existing = listData.results && listData.results.length > 0 ? listData.results[0] : null;

  const url = existing
    ? `${BASE_URL}/wiki/rest/api/content/${PAGE_ID}/child/attachment/${existing.id}/data`
    : `${BASE_URL}/wiki/rest/api/content/${PAGE_ID}/child/attachment`;

  console.log(existing ? `Updating existing SVG attachment...` : `Uploading new SVG attachment...`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${AUTH}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "X-Atlassian-Token": "nocheck",
    },
    body,
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status}\n${await res.text()}`);
  const data = await res.json();
  console.log(`SVG uploaded: ${FILE_NAME}`);
  return data;
}

// ── Step 3: Update page — remove drawio macro & code block, add image ──

async function updatePage() {
  const getRes = await fetch(
    `${BASE_URL}/wiki/rest/api/content/${PAGE_ID}?expand=version,body.storage`,
    { headers: { Authorization: `Basic ${AUTH}`, Accept: "application/json" } }
  );
  if (!getRes.ok) throw new Error(`Get page failed: ${getRes.status}`);
  const page = await getRes.json();
  let content = page.body.storage.value;

  // Remove existing drawio macro if present
  const drawioRegex = /<ac:structured-macro ac:name="drawio"[^>]*>[\s\S]*?<\/ac:structured-macro>/g;
  content = content.replace(drawioRegex, "");

  // Remove existing code block with ASCII diagram if present
  const codeBlockRegex = /<ac:structured-macro ac:name="code"[^>]*>[\s\S]*?<\/ac:structured-macro>/;
  content = content.replace(codeBlockRegex, "");

  // Insert image macro after the Architecture heading
  const imageMacro = `<ac:image ac:width="900"><ri:attachment ri:filename="${FILE_NAME}"/></ac:image>`;

  if (content.includes("<h4>Architecture</h4>")) {
    content = content.replace("<h4>Architecture</h4>", `<h4>Architecture</h4>\n${imageMacro}`);
  } else {
    console.log("Warning: Could not find Architecture heading.");
  }

  const nextVersion = page.version.number + 1;
  const updateRes = await fetch(`${BASE_URL}/wiki/rest/api/content/${PAGE_ID}`, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${AUTH}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      type: "page",
      title: page.title,
      space: { key: SPACE_KEY },
      version: { number: nextVersion },
      body: { storage: { value: content, representation: "storage" } },
    }),
  });

  if (!updateRes.ok) throw new Error(`Update failed: ${updateRes.status}\n${await updateRes.text()}`);
  const updated = await updateRes.json();
  console.log(`\nPage updated (v${nextVersion})!`);
  console.log(`URL: ${BASE_URL}/wiki${updated._links.webui}`);
}

// ── Main ──

async function main() {
  await uploadSvg();
  await updatePage();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

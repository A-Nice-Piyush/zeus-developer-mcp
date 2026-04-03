/**
 * Comprehensive Veracode HMAC auth diagnostic.
 * Tests against BOTH the XML API and REST API endpoints.
 * Also validates key encoding and round-trip.
 *
 * Run: node test-veracode-auth.mjs
 */
import { createHmac, randomBytes } from "crypto";
import { readFileSync } from "fs";

// Read credentials directly from mcp.json to rule out env-var encoding issues
let API_ID, API_KEY;
try {
  const mcpJson = JSON.parse(readFileSync("C:/Users/pbora/OneDrive - NICE Ltd/Documents/POCR/.vscode/mcp.json", "utf-8"));
  const env = mcpJson.servers.atlassian.env;
  API_ID = env.VERACODE_API_ID;
  API_KEY = env.VERACODE_API_KEY;
  console.log("Read credentials from mcp.json directly.");
} catch {
  API_ID = process.env.VERACODE_API_ID;
  API_KEY = process.env.VERACODE_API_KEY;
  console.log("Using env vars.");
}

const REQUEST_VERSION = "vcode_request_version_1";

function generateAuth(host, urlPath, method) {
  const nonce = randomBytes(16).toString("hex");
  const ts = Date.now().toString();
  const data = `id=${API_ID}&host=${host}&url=${urlPath}&method=${method}`;

  const kb = Buffer.from(API_KEY, "hex");
  const h1 = createHmac("sha256", kb).update(nonce).digest();
  const h2 = createHmac("sha256", h1).update(ts).digest();
  const h3 = createHmac("sha256", h2).update(REQUEST_VERSION).digest();
  const sig = createHmac("sha256", h3).update(data).digest("hex");

  return `VERACODE-HMAC-SHA-256 id=${API_ID},ts=${ts},nonce=${nonce},sig=${sig}`;
}

async function testEndpoint(label, host, urlPath, method, acceptHeader) {
  const auth = generateAuth(host, urlPath, method);
  const url = `https://${host}${urlPath}`;
  console.log(`\n--- ${label} ---`);
  console.log(`  ${method} ${url}`);
  try {
    const resp = await fetch(url, {
      method,
      headers: { Authorization: auth, Accept: acceptHeader },
    });
    const body = await resp.text();
    console.log(`  Status: ${resp.status} ${resp.statusText}`);
    // For HTML responses, just show the title
    if (body.includes("<html")) {
      const m = body.match(/<title>(.*?)<\/title>/i);
      console.log(`  Response: HTML page — "${m ? m[1] : "(no title)"}"`);
    } else {
      console.log(`  Response: ${body.slice(0, 600)}`);
    }
    return resp.status;
  } catch (err) {
    console.log(`  Error: ${err.message}${err.cause ? " — " + err.cause.message : ""}`);
    return -1;
  }
}

// Diagnostics
console.log("\n=== Veracode Auth Diagnostic ===\n");
console.log(`API ID        : ${API_ID}  (${API_ID.length} chars)`);
console.log(`API KEY       : ${API_KEY.slice(0, 8)}...${API_KEY.slice(-8)}  (${API_KEY.length} chars)`);
const keyBytes = Buffer.from(API_KEY, "hex");
console.log(`Decoded bytes : ${keyBytes.length}`);
console.log(`Round-trip OK : ${keyBytes.toString("hex") === API_KEY.toLowerCase()}`);
// Check for non-hex chars
const nonHex = API_KEY.match(/[^0-9a-fA-F]/g);
console.log(`Non-hex chars : ${nonHex ? JSON.stringify(nonHex) : "none (good)"}`);

// Test 1: REST API — applications list (gives proper JSON errors)
await testEndpoint(
  "REST API — list apps",
  "api.veracode.com",
  "/appsec/v1/applications",
  "GET",
  "application/json",
);

// Test 2: XML API — app list
await testEndpoint(
  "XML API v5 — list apps",
  "analysiscenter.veracode.com",
  "/api/5.0/getapplist.do",
  "GET",
  "text/xml",
);

// Test 3: REST API with hyphenated API ID
const origId = API_ID;
if (!API_ID.includes("-") && API_ID.length === 32) {
  // Try adding hyphens as UUID format
  const hyphenated = `${API_ID.slice(0,8)}-${API_ID.slice(8,12)}-${API_ID.slice(12,16)}-${API_ID.slice(16,20)}-${API_ID.slice(20)}`;
  API_ID = hyphenated;  // temporarily override
  console.log(`\n  Also testing with hyphenated ID: ${API_ID}`);
  await testEndpoint(
    "REST API — hyphenated ID",
    "api.veracode.com",
    "/appsec/v1/applications",
    "GET",
    "application/json",
  );
  API_ID = origId;  // restore
}

console.log("\n=== Done ===");

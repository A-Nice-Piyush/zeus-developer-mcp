import { statSync } from "fs";
import { basename } from "path";
import { createHmac, randomBytes } from "crypto";
import type { VeracodeApp, VeracodeBuildInfo, VeracodeFlaw, VeracodeConfig } from "../types/veracode.js";

const VERACODE_HOST = "analysiscenter.veracode.com";
const VERACODE_BASE_URL = `https://${VERACODE_HOST}`;
const HMAC_SHA_256 = "VERACODE-HMAC-SHA-256";
const REQUEST_VERSION = "vcode_request_version_1";

const SEVERITY_NAMES: Record<number, string> = {
  0: "Informational",
  1: "Very Low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Very High",
};

export class VeracodeApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: string,
  ) {
    super(`Veracode API error ${status}: ${statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`);
    this.name = "VeracodeApiError";
  }
}

/**
 * Extracts all values of a named attribute from every occurrence of a tag in XML.
 * e.g. extractXmlAttr(xml, "app", "app_id") returns all app_id values from <app ...> elements.
 */
function extractXmlAttr(xml: string, tag: string, attr: string): string[] {
  const results: string[] = [];
  const tagRegex = new RegExp(`<${tag}\\s[^>]*>`, "gi");
  const attrRegex = new RegExp(`${attr}="([^"]*)"`, "i");
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(xml)) !== null) {
    const attrMatch = attrRegex.exec(match[0]);
    if (attrMatch) {
      results.push(attrMatch[1]);
    }
  }
  return results;
}

/**
 * Extracts tag elements as attribute maps.
 */
function extractXmlElements(xml: string, tag: string): Record<string, string>[] {
  const results: Record<string, string>[] = [];
  const tagRegex = new RegExp(`<${tag}\\s([^>]*)(?:/>|>)`, "gi");
  const attrPairRegex = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(xml)) !== null) {
    const attrs: Record<string, string> = {};
    const attrsStr = match[1];
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrPairRegex.exec(attrsStr)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    results.push(attrs);
  }
  return results;
}

export class VeracodeClient {
  private apiId: string;
  private apiSecret: string;

  constructor(config: VeracodeConfig) {
    this.apiId = config.apiId;
    this.apiSecret = config.apiKey;
  }

  /**
   * Generates a Veracode HMAC-SHA256 Authorization header for a single request.
   * Must be called per-request because it embeds a timestamp and random nonce.
   *
   * Algorithm per Veracode docs (https://docs.veracode.com/r/c_hmac_signing_example_node):
   *   data      = "id={id}&host={host}&url={urlPath}&method={METHOD}"
   *   keyBytes  = hex-decode(apiSecret)
   *   hmacNonce = HMAC-SHA256(keyBytes,  nonce)
   *   hmacDate  = HMAC-SHA256(hmacNonce, timestamp)
   *   hmacSig   = HMAC-SHA256(hmacDate,  "vcode_request_version_1")
   *   sig       = HMAC-SHA256(hmacSig,   data).hex()
   *   header    = "VERACODE-HMAC-SHA-256 id={id},ts={timestamp},nonce={nonce},sig={sig}"
   */
  private generateAuthHeader(urlPath: string, method: string): string {
    const nonceBytes = randomBytes(16);
    const nonce = nonceBytes.toString("hex");
    const timestamp = Date.now().toString();
    const data = `id=${this.apiId}&host=${VERACODE_HOST}&url=${urlPath}&method=${method}`;

    const keyBytes = Buffer.from(this.apiSecret, "hex");
    const hmacNonce = createHmac("sha256", keyBytes).update(nonceBytes).digest();
    const hmacDate = createHmac("sha256", hmacNonce).update(timestamp).digest();
    const hmacSig = createHmac("sha256", hmacDate).update(REQUEST_VERSION).digest();
    const sig = createHmac("sha256", hmacSig).update(data).digest("hex");

    return `${HMAC_SHA_256} id=${this.apiId},ts=${timestamp},nonce=${nonce},sig=${sig}`;
  }

  private async getXml(urlPath: string): Promise<string> {
    const url = `${VERACODE_BASE_URL}${urlPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: this.generateAuthHeader(urlPath, "GET"),
          Accept: "text/xml",
        },
        signal: controller.signal,
      });
      const body = await response.text();
      if (!response.ok) {
        throw new VeracodeApiError(response.status, response.statusText, body);
      }
      return body;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async postXml(path: string, params?: Record<string, string>): Promise<string> {
    let urlPath = path;
    if (params && Object.keys(params).length > 0) {
      urlPath += "?" + new URLSearchParams(params).toString();
    }
    const url = `${VERACODE_BASE_URL}${urlPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: this.generateAuthHeader(urlPath, "POST"),
          Accept: "text/xml",
        },
        signal: controller.signal,
      });
      const body = await response.text();
      if (!response.ok) {
        throw new VeracodeApiError(response.status, response.statusText, body);
      }
      return body;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getAppList(): Promise<VeracodeApp[]> {
    const xml = await this.getXml("/api/5.0/getapplist.do");
    const appIds = extractXmlAttr(xml, "app", "app_id");
    const appNames = extractXmlAttr(xml, "app", "app_name");
    return appIds.map((appId, i) => ({
      appId,
      appName: appNames[i] ?? "",
    }));
  }

  async findAppId(appName: string): Promise<string> {
    const apps = await this.getAppList();
    const app = apps.find(
      (a) => a.appName.toLowerCase() === appName.toLowerCase(),
    );
    if (!app) {
      const names = apps.map((a) => a.appName).join(", ");
      throw new Error(
        `App "${appName}" not found. Available apps: ${names || "(none)"}`,
      );
    }
    return app.appId;
  }

  async createBuild(appId: string): Promise<string> {
    const scanName = `MCP-Scan-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
    const xml = await this.postXml("/api/5.0/createbuild.do", {
      app_id: appId,
      version: scanName,
    });
    const buildIds = extractXmlAttr(xml, "build", "build_id");
    if (!buildIds[0]) {
      throw new Error(`createbuild.do did not return a build_id. Response: ${xml.slice(0, 300)}`);
    }
    return buildIds[0];
  }

  async uploadFile(appId: string, filePath: string): Promise<void> {
    statSync(filePath); // throws if file not found

    const urlPath = `/api/5.0/uploadfile.do?app_id=${encodeURIComponent(appId)}`;
    const url = `${VERACODE_BASE_URL}${urlPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 min for uploads

    try {
      const { readFileSync } = await import("fs");
      const fileBuffer = readFileSync(filePath);
      const fileName = basename(filePath);
      const blob = new Blob([fileBuffer], { type: "application/zip" });
      const formData = new FormData();
      formData.append("file", blob, fileName);

      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: this.generateAuthHeader(urlPath, "POST") },
        body: formData,
        signal: controller.signal,
      });
      const body = await response.text();
      if (!response.ok) {
        throw new VeracodeApiError(response.status, response.statusText, body);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async beginPrescan(appId: string): Promise<void> {
    await this.postXml("/api/5.0/beginprescan.do", {
      app_id: appId,
      auto_scan: "true",
    });
  }

  async getBuildInfo(appId: string): Promise<VeracodeBuildInfo> {
    const xml = await this.getXml(
      `/api/5.0/getbuildinfo.do?app_id=${encodeURIComponent(appId)}`,
    );
    const buildIds = extractXmlAttr(xml, "build", "build_id");
    const versions = extractXmlAttr(xml, "build", "version");
    const statusValues = extractXmlAttr(xml, "analysis_unit", "status");
    const submittedDates = extractXmlAttr(xml, "analysis_unit", "submitted_date");
    const publishedDates = extractXmlAttr(xml, "build", "results_ready_date");
    return {
      buildId: buildIds[0] ?? "",
      scanName: versions[0] ?? "",
      status: statusValues[0] ?? "Unknown",
      submittedDate: submittedDates[0],
      publishedDate: publishedDates[0],
    };
  }

  async getBuildList(appId: string): Promise<Array<{ buildId: string; version: string }>> {
    const xml = await this.getXml(
      `/api/5.0/getbuildlist.do?app_id=${encodeURIComponent(appId)}`,
    );
    const elements = extractXmlElements(xml, "build");
    return elements
      .map((attrs) => ({
        buildId: attrs["build_id"] ?? "",
        version: attrs["version"] ?? "",
      }))
      .filter((b) => b.buildId)
      .reverse(); // newest first
  }

  async getBuildInfoById(buildId: string): Promise<VeracodeBuildInfo> {
    const xml = await this.getXml(
      `/api/5.0/getbuildinfo.do?build_id=${encodeURIComponent(buildId)}`,
    );
    const buildIds = extractXmlAttr(xml, "build", "build_id");
    const versions = extractXmlAttr(xml, "build", "version");
    const statusValues = extractXmlAttr(xml, "analysis_unit", "status");
    const submittedDates = extractXmlAttr(xml, "analysis_unit", "submitted_date");
    const publishedDates = extractXmlAttr(xml, "build", "results_ready_date");
    return {
      buildId: buildIds[0] ?? buildId,
      scanName: versions[0] ?? "",
      status: statusValues[0] ?? "Unknown",
      submittedDate: submittedDates[0],
      publishedDate: publishedDates[0],
    };
  }

  async getDetailedReport(buildId: string): Promise<VeracodeFlaw[]> {
    const xml = await this.getXml(
      `/api/5.0/detailedreport.do?build_id=${encodeURIComponent(buildId)}`,
    );
    const flawElements = extractXmlElements(xml, "flaw");
    return flawElements
      .map((attrs) => {
        const severity = parseInt(attrs["severity"] ?? "0", 10);
        const remediationStatus = attrs["remediation_status"] ?? "";
        const mitigationStatus = attrs["mitigation_status_desc"] ?? "";
        return {
          flawId: attrs["issueid"] ?? attrs["flaw_id"] ?? "",
          cweName: attrs["cwename"] ?? "",
          cweId: attrs["cweid"] ?? "",
          severity,
          severityName: SEVERITY_NAMES[severity] ?? String(severity),
          filePath: attrs["sourcefile"] ?? attrs["inputvector"] ?? "",
          lineNumber: attrs["line"] ?? "",
          description: decodeXmlEntities(attrs["description"] ?? ""),
          remediation: decodeXmlEntities(attrs["remediation"] ?? ""),
          categoryName: attrs["categoryname"] ?? "",
          remediationStatus,
          mitigationStatus,
        };
      })
      .filter((flaw) => {
        const status = flaw.remediationStatus.toLowerCase();
        // Keep only open/new flaws — exclude fixed and mitigated
        return status !== "fixed" && status !== "mitigated";
      });
  }
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

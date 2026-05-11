import type { AikidoCodeRepo, AikidoConfig, AikidoIssue } from "../types/aikido.js";

const AIKIDO_BASE_URL = "https://app.aikido.dev";
const TOKEN_PATH = "/api/oauth/token";
const REPOS_PATH = "/api/public/v1/repositories/code";
const ISSUES_EXPORT_PATH = "/api/public/v1/issues/export";

// Refresh token 60s before its stated expiry to avoid races with slow requests.
const TOKEN_REFRESH_MARGIN_MS = 60_000;

export class AikidoApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: string,
  ) {
    super(`Aikido API error ${status}: ${statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`);
    this.name = "AikidoApiError";
  }
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface IssueExportRaw {
  id: number;
  type?: string;
  issue_type?: string;
  severity?: string;
  severity_score?: number;
  status?: string;
  title?: string;
  rule?: string;
  cve_id?: string;
  cwe_id?: string;
  file_path?: string;
  start_line?: number;
  end_line?: number;
  language?: string;
  first_detected_at?: string;
  affected_package?: string;
  fix_version?: string;
  code_repo_id?: number;
  code_repo_name?: string;
  sla_remediate_by?: number;
  [key: string]: unknown;
}

export class AikidoClient {
  private clientId: string;
  private clientSecret: string;
  private cachedToken?: string;
  private tokenExpiresAt = 0;

  constructor(config: AikidoConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt - TOKEN_REFRESH_MARGIN_MS) {
      return this.cachedToken;
    }

    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const response = await fetch(`${AIKIDO_BASE_URL}${TOKEN_PATH}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
    });

    const bodyText = await response.text();
    if (!response.ok) {
      throw new AikidoApiError(response.status, response.statusText, bodyText);
    }

    const parsed = JSON.parse(bodyText) as TokenResponse;
    if (!parsed.access_token) {
      throw new Error(`Aikido token response missing access_token: ${bodyText.slice(0, 200)}`);
    }

    this.cachedToken = parsed.access_token;
    this.tokenExpiresAt = Date.now() + (parsed.expires_in ?? 3600) * 1000;
    return this.cachedToken;
  }

  private async getJson<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(`${AIKIDO_BASE_URL}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const token = await this.getAccessToken();
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const bodyText = await response.text();
    if (response.status === 401) {
      // Token may have been revoked; clear cache and retry once.
      this.cachedToken = undefined;
      this.tokenExpiresAt = 0;
      const retryToken = await this.getAccessToken();
      const retry = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${retryToken}`, Accept: "application/json" },
      });
      const retryBody = await retry.text();
      if (!retry.ok) {
        throw new AikidoApiError(retry.status, retry.statusText, retryBody);
      }
      return JSON.parse(retryBody) as T;
    }
    if (!response.ok) {
      throw new AikidoApiError(response.status, response.statusText, bodyText);
    }

    return JSON.parse(bodyText) as T;
  }

  async listCodeRepos(filterName?: string): Promise<AikidoCodeRepo[]> {
    const repos = await this.getJson<Record<string, unknown>[]>(REPOS_PATH, {
      per_page: 200,
      filter_name: filterName,
    });

    return repos.map((r) => ({
      id: Number(r.id),
      name: String(r.name ?? ""),
      externalRepoId: r.external_repo_id as string | undefined,
      provider: r.provider as string | undefined,
      active: r.active as boolean | undefined,
      defaultBranch: r.default_branch as string | undefined,
    }));
  }

  async findRepoIdByName(repoName: string): Promise<{ id: number; name: string }> {
    // Try filter first (server-side), then fall back to a case-insensitive match.
    const filtered = await this.listCodeRepos(repoName);
    const needle = repoName.toLowerCase();

    const exact = filtered.find((r) => r.name.toLowerCase() === needle);
    if (exact) return { id: exact.id, name: exact.name };

    const suffix = filtered.find((r) => r.name.toLowerCase().endsWith(`/${needle}`));
    if (suffix) return { id: suffix.id, name: suffix.name };

    if (filtered.length === 1) return { id: filtered[0].id, name: filtered[0].name };

    if (filtered.length === 0) {
      throw new Error(
        `No Aikido code repository found matching "${repoName}". Use aikido_list_repos to see available repos.`,
      );
    }

    const names = filtered.map((r) => r.name).join(", ");
    throw new Error(
      `Multiple Aikido repos match "${repoName}": ${names}. Pass the full name exactly.`,
    );
  }

  async exportIssues(opts: {
    codeRepoId?: number;
    codeRepoName?: string;
    status?: "all" | "open" | "ignored" | "snoozed" | "closed";
    severities?: string; // comma-separated: critical,high,medium,low
    issueType?: string;
  }): Promise<AikidoIssue[]> {
    const raw = await this.getJson<IssueExportRaw[]>(ISSUES_EXPORT_PATH, {
      format: "json",
      filter_status: opts.status ?? "open",
      filter_code_repo_id: opts.codeRepoId,
      filter_code_repo_name: opts.codeRepoName,
      filter_severities: opts.severities,
      filter_issue_type: opts.issueType,
    });

    return raw.map((i) => ({
      id: Number(i.id),
      issueType: String(i.issue_type ?? i.type ?? ""),
      severity: String(i.severity ?? ""),
      severityScore: i.severity_score,
      status: String(i.status ?? ""),
      title: i.title,
      rule: i.rule,
      cve: i.cve_id,
      cwe: i.cwe_id,
      filePath: i.file_path,
      startLine: i.start_line,
      endLine: i.end_line,
      language: i.language,
      firstDetectedAt: i.first_detected_at,
      affectedPackage: i.affected_package,
      fixVersion: i.fix_version,
      codeRepoId: i.code_repo_id,
      codeRepoName: i.code_repo_name,
      slaRemediateBy: i.sla_remediate_by,
      raw: i,
    }));
  }
}

import type {
  SonarQubeProjectSearchResponse,
  SonarQubeIssueSearchResponse,
  SonarQubeQualityGateResponse,
  SonarQubeMeasuresResponse,
  SonarQubeHotspotSearchResponse,
} from "../types/sonarqube.js";
import type { SonarQubeConfig } from "../config.js";

export class SonarQubeApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: string,
  ) {
    super(`SonarQube API error ${status}: ${statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`);
    this.name = "SonarQubeApiError";
  }
}

export class SonarQubeClient {
  private baseUrl: string;
  private token: string;

  constructor(config: SonarQubeConfig) {
    this.baseUrl = config.baseUrl;
    this.token = config.token;
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== ""),
      );
      if (Object.keys(cleanParams).length > 0) {
        url += "?" + new URLSearchParams(cleanParams).toString();
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      const body = await response.text();
      if (!response.ok) {
        throw new SonarQubeApiError(response.status, response.statusText, body);
      }
      return JSON.parse(body) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async searchProjects(query?: string, pageSize = 50, page = 1): Promise<SonarQubeProjectSearchResponse> {
    const params: Record<string, string> = {
      ps: String(pageSize),
      p: String(page),
    };
    if (query) params.q = query;
    return this.get<SonarQubeProjectSearchResponse>("/api/projects/search", params);
  }

  async searchIssues(options: {
    projectKey: string;
    branch?: string;
    types?: string;
    severities?: string;
    statuses?: string;
    resolved?: boolean;
    facets?: string;
    pageSize?: number;
    page?: number;
  }): Promise<SonarQubeIssueSearchResponse> {
    const params: Record<string, string> = {
      componentKeys: options.projectKey,
      ps: String(options.pageSize ?? 100),
      p: String(options.page ?? 1),
      additionalFields: "_all",
    };
    if (options.branch) params.branch = options.branch;
    if (options.types) params.types = options.types;
    if (options.severities) params.severities = options.severities;
    if (options.statuses) params.statuses = options.statuses;
    if (options.resolved !== undefined) params.resolved = String(options.resolved);
    if (options.facets) params.facets = options.facets;
    return this.get<SonarQubeIssueSearchResponse>("/api/issues/search", params);
  }

  async getQualityGateStatus(projectKey: string, branch?: string): Promise<SonarQubeQualityGateResponse> {
    const params: Record<string, string> = { projectKey };
    if (branch) params.branch = branch;
    return this.get<SonarQubeQualityGateResponse>("/api/qualitygates/project_status", params);
  }

  async getMeasures(projectKey: string, metricKeys: string[], branch?: string): Promise<SonarQubeMeasuresResponse> {
    const params: Record<string, string> = {
      component: projectKey,
      metricKeys: metricKeys.join(","),
    };
    if (branch) params.branch = branch;
    return this.get<SonarQubeMeasuresResponse>("/api/measures/component", params);
  }

  async searchHotspots(options: {
    projectKey: string;
    branch?: string;
    status?: string;
    pageSize?: number;
    page?: number;
  }): Promise<SonarQubeHotspotSearchResponse> {
    const params: Record<string, string> = {
      projectKey: options.projectKey,
      ps: String(options.pageSize ?? 100),
      p: String(options.page ?? 1),
    };
    if (options.branch) params.branch = options.branch;
    if (options.status) params.status = options.status;
    return this.get<SonarQubeHotspotSearchResponse>("/api/hotspots/search", params);
  }
}

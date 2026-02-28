import { AtlassianConfig } from "../config.js";

export class AtlassianApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public errorMessages: string[],
  ) {
    super(`Atlassian API error ${status}: ${errorMessages.join(", ") || statusText}`);
    this.name = "AtlassianApiError";
  }
}

export class AtlassianHttpClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: AtlassianConfig) {
    this.baseUrl = config.baseUrl;
    this.authHeader = "Basic " + Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    return this.request<T>("GET", url);
  }

  async getText(path: string): Promise<string> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        headers: { Authorization: this.authHeader },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new AtlassianApiError(response.status, response.statusText, []);
      }
      return response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  async getBase64(path: string): Promise<{ data: string; mimeType: string }> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        headers: { Authorization: this.authHeader },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new AtlassianApiError(response.status, response.statusText, []);
      }
      const mimeType =
        response.headers.get("Content-Type")?.split(";")[0]?.trim() || "image/png";
      const buffer = await response.arrayBuffer();
      return { data: Buffer.from(buffer).toString("base64"), mimeType };
    } finally {
      clearTimeout(timeout);
    }
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", `${this.baseUrl}${path}`, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", `${this.baseUrl}${path}`, body);
  }

  private async request<T>(method: string, url: string, body?: unknown, retries = 3): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        Accept: "application/json",
      };
      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (response.status === 429 && retries > 0) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : (4 - retries) * 1000;
        const jitter = Math.random() * 500;
        await new Promise((r) => setTimeout(r, waitMs + jitter));
        return this.request<T>(method, url, body, retries - 1);
      }

      if (!response.ok) {
        let errorMessages: string[] = [];
        try {
          const errorBody = await response.json() as Record<string, unknown>;
          if (Array.isArray(errorBody.errorMessages)) {
            errorMessages = errorBody.errorMessages as string[];
          } else if (typeof errorBody.message === "string") {
            errorMessages = [errorBody.message];
          } else if (Array.isArray(errorBody.errors)) {
            errorMessages = (errorBody.errors as Array<{ message?: string }>).map(
              (e) => e.message || JSON.stringify(e),
            );
          }
        } catch {
          // response body wasn't JSON
        }
        throw new AtlassianApiError(response.status, response.statusText, errorMessages);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}

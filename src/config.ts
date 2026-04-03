export interface AtlassianConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface VeracodeConfig {
  apiId: string;
  apiKey: string;
  defaultAppName?: string;
  github?: {
    token: string;
    repo: string; // "owner/repo" e.g. "inContact/POCR"
  };
}

export function loadConfig(): AtlassianConfig {
  const baseUrl = process.env.ATLASSIAN_BASE_URL;
  const email = process.env.ATLASSIAN_EMAIL;
  const apiToken = process.env.ATLASSIAN_API_TOKEN;

  if (!baseUrl) {
    throw new Error("ATLASSIAN_BASE_URL environment variable is required (e.g., https://yourcompany.atlassian.net)");
  }
  if (!email) {
    throw new Error("ATLASSIAN_EMAIL environment variable is required");
  }
  if (!apiToken) {
    throw new Error("ATLASSIAN_API_TOKEN environment variable is required (generate at id.atlassian.com/manage-profile/security/api-tokens)");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    email,
    apiToken,
  };
}

export interface SonarQubeConfig {
  baseUrl: string;
  token: string;
  defaultProjectKey?: string;
}

export function loadVeracodeConfig(): VeracodeConfig | null {
  const apiId = process.env.VERACODE_API_ID;
  const apiKey = process.env.VERACODE_API_KEY;
  if (!apiId || !apiKey) {
    return null;
  }
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO; // format: "owner/repo"
  return {
    apiId,
    apiKey,
    defaultAppName: process.env.VERACODE_APP_NAME,
    github: githubToken && githubRepo ? { token: githubToken, repo: githubRepo } : undefined,
  };
}

export function loadSonarQubeConfig(): SonarQubeConfig | null {
  const baseUrl = process.env.SONARQUBE_BASE_URL;
  const token = process.env.SONARQUBE_TOKEN;
  if (!baseUrl || !token) {
    return null;
  }
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    token,
    defaultProjectKey: process.env.SONARQUBE_PROJECT_KEY,
  };
}

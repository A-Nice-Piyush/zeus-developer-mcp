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

export interface AikidoConfig {
  clientId: string;
  clientSecret: string;
  defaultRepoName?: string;
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

export function loadAikidoConfig(): AikidoConfig | null {
  const clientId = process.env.AIKIDO_CLIENT_ID;
  const clientSecret = process.env.AIKIDO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    defaultRepoName: process.env.AIKIDO_DEFAULT_REPO_NAME,
  };
}

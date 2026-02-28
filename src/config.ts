export interface AtlassianConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
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

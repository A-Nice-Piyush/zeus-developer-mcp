import { AtlassianHttpClient } from "./http-client.js";
import type { JiraSearchResult, JiraIssue, JiraProject, JiraTransition, JiraAttachment } from "../types/jira.js";

const DEFAULT_FIELDS = [
  "summary", "status", "assignee", "reporter", "priority",
  "description", "comment", "labels", "components", "issuetype",
  "created", "updated", "parent", "attachment",
].join(",");

export class JiraClient {
  constructor(private http: AtlassianHttpClient) {}

  async searchIssues(jql: string, maxResults: number = 20, fields?: string[]): Promise<JiraSearchResult> {
    return this.http.post<JiraSearchResult>("/rest/api/3/search/jql", {
      jql,
      maxResults: Math.min(maxResults, 50),
      fields: fields || DEFAULT_FIELDS.split(","),
    });
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.http.get<JiraIssue>(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
      fields: DEFAULT_FIELDS,
      expand: "renderedFields",
    });
  }

  async getEpicWithChildren(epicKey: string): Promise<{ epic: JiraIssue; children: JiraIssue[] }> {
    const [epic, searchResult] = await Promise.all([
      this.getIssue(epicKey),
      this.searchIssues(`"Epic Link" = ${epicKey} OR parent = ${epicKey} ORDER BY rank ASC`, 50),
    ]);
    return { epic, children: searchResult.issues };
  }

  async listProjects(maxResults: number = 50): Promise<JiraProject[]> {
    const result = await this.http.get<{ values: JiraProject[] }>("/rest/api/3/project/search", {
      maxResults: String(Math.min(maxResults, 100)),
      orderBy: "name",
    });
    return result.values;
  }

  async addComment(issueKey: string, commentText: string): Promise<void> {
    await this.http.post(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
      body: textToAdf(commentText),
    });
  }

  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    const result = await this.http.get<{ transitions: JiraTransition[] }>(
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`,
    );
    return result.transitions;
  }

  async getAttachmentImage(
    attachment: JiraAttachment,
  ): Promise<{ data: string; mimeType: string } | null> {
    if (!attachment.mimeType.startsWith("image/")) return null;
    if (attachment.size > 5 * 1024 * 1024) return null;
    try {
      return await this.http.getBase64(attachment.content);
    } catch {
      return null;
    }
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.http.post(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, {
      transition: { id: transitionId },
    });
  }
}

/** Convert plain text to a minimal ADF document (required by JIRA v3 API) */
function textToAdf(text: string): object {
  return {
    version: 1,
    type: "doc",
    content: text.split("\n\n").map((paragraph) => ({
      type: "paragraph",
      content: [{ type: "text", text: paragraph }],
    })),
  };
}

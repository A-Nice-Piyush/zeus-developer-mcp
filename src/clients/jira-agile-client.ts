import { AtlassianHttpClient } from "./http-client.js";
import type { JiraIssue, JiraSprint, JiraBoard } from "../types/jira.js";

export class JiraAgileClient {
  constructor(private http: AtlassianHttpClient) {}

  async getActiveSprint(boardId: number): Promise<JiraSprint | null> {
    const result = await this.http.get<{ values: JiraSprint[] }>(
      `/rest/agile/1.0/board/${boardId}/sprint`,
      { state: "active" },
    );
    return result.values[0] || null;
  }

  async getSprintIssues(sprintId: number, maxResults: number = 50): Promise<JiraIssue[]> {
    const result = await this.http.get<{ issues: JiraIssue[] }>(
      `/rest/agile/1.0/sprint/${sprintId}/issue`,
      {
        maxResults: String(Math.min(maxResults, 50)),
        fields: "summary,status,assignee,priority,issuetype,labels",
      },
    );
    return result.issues;
  }

  async listBoards(maxResults: number = 50): Promise<JiraBoard[]> {
    const result = await this.http.get<{ values: JiraBoard[] }>("/rest/agile/1.0/board", {
      maxResults: String(Math.min(maxResults, 50)),
    });
    return result.values;
  }

  async getBoardByProject(projectKey: string): Promise<JiraBoard | null> {
    const result = await this.http.get<{ values: JiraBoard[] }>("/rest/agile/1.0/board", {
      projectKeyOrId: projectKey,
      maxResults: "1",
    });
    return result.values[0] || null;
  }
}

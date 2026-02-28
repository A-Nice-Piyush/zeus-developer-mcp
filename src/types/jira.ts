export interface JiraSearchResult {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description: unknown;
    status: { name: string; statusCategory: { name: string } };
    assignee: { displayName: string; emailAddress: string } | null;
    reporter: { displayName: string } | null;
    priority: { name: string } | null;
    issuetype: { name: string; subtask: boolean };
    labels: string[];
    components: { name: string }[];
    created: string;
    updated: string;
    parent?: { key: string; fields: { summary: string } };
    comment?: { comments: JiraComment[]; total: number };
    attachment?: JiraAttachment[];
  };
}

export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  content: string;
  created: string;
  author: { displayName: string };
}

export interface JiraComment {
  id: string;
  author: { displayName: string };
  body: unknown;
  created: string;
  updated: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  style: string;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: { name: string };
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate: string;
  endDate: string;
  goal?: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: string;
  location: { projectKey: string; projectName: string };
}

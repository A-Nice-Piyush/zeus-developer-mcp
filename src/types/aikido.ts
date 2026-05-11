export interface AikidoCodeRepo {
  id: number;
  name: string;
  externalRepoId?: string;
  provider?: string;
  active?: boolean;
  defaultBranch?: string;
}

export interface AikidoIssue {
  id: number;
  issueType: string;
  severity: string;
  severityScore?: number;
  status: string;
  title?: string;
  rule?: string;
  cve?: string;
  cwe?: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  language?: string;
  firstDetectedAt?: string;
  affectedPackage?: string;
  fixVersion?: string;
  codeRepoId?: number;
  codeRepoName?: string;
  slaRemediateBy?: number;
  raw: Record<string, unknown>;
}

export interface AikidoConfig {
  clientId: string;
  clientSecret: string;
  defaultRepoName?: string;
}

export interface VeracodeApp {
  appId: string;
  appName: string;
}

export interface VeracodeBuildInfo {
  buildId: string;
  scanName: string;
  status: string;
  submittedDate?: string;
  publishedDate?: string;
}

export interface VeracodeFlaw {
  flawId: string;
  cweName: string;
  cweId: string;
  severity: number;
  severityName: string;
  filePath: string;
  lineNumber: string;
  description: string;
  remediation: string;
  categoryName: string;
  remediationStatus: string;
  mitigationStatus: string;
}

export interface VeracodeConfig {
  apiId: string;
  apiKey: string;
  defaultAppName?: string;
}

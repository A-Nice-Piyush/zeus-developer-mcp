export interface SonarQubePaging {
  pageIndex: number;
  pageSize: number;
  total: number;
}

// /api/projects/search
export interface SonarQubeProject {
  key: string;
  name: string;
  qualifier: string;
  lastAnalysisDate?: string;
}

export interface SonarQubeProjectSearchResponse {
  components: SonarQubeProject[];
  paging: SonarQubePaging;
}

// /api/issues/search
export interface SonarQubeTextRange {
  startLine: number;
  endLine: number;
  startOffset: number;
  endOffset: number;
}

export interface SonarQubeIssue {
  key: string;
  rule: string;
  severity: string;
  component: string;
  project: string;
  line?: number;
  message: string;
  type: string;
  status: string;
  effort?: string;
  tags: string[];
  textRange?: SonarQubeTextRange;
}

export interface SonarQubeFacetValue {
  val: string;
  count: number;
}

export interface SonarQubeFacet {
  property: string;
  values: SonarQubeFacetValue[];
}

export interface SonarQubeComponent {
  key: string;
  path?: string;
  name: string;
}

export interface SonarQubeIssueSearchResponse {
  total: number;
  p: number;
  ps: number;
  paging: SonarQubePaging;
  issues: SonarQubeIssue[];
  facets: SonarQubeFacet[];
  components: SonarQubeComponent[];
}

// /api/qualitygates/project_status
export interface SonarQubeQualityGateCondition {
  status: string;
  metricKey: string;
  comparator: string;
  errorThreshold: string;
  actualValue: string;
}

export interface SonarQubeQualityGateResponse {
  projectStatus: {
    status: string;
    conditions: SonarQubeQualityGateCondition[];
  };
}

// /api/measures/component
export interface SonarQubeMeasure {
  metric: string;
  value: string;
}

export interface SonarQubeMeasuresResponse {
  component: {
    key: string;
    name: string;
    measures: SonarQubeMeasure[];
  };
}

// /api/hotspots/search
export interface SonarQubeHotspot {
  key: string;
  component: string;
  project: string;
  securityCategory: string;
  vulnerabilityProbability: string;
  status: string;
  line?: number;
  message: string;
}

export interface SonarQubeHotspotSearchResponse {
  hotspots: SonarQubeHotspot[];
  paging: SonarQubePaging;
}

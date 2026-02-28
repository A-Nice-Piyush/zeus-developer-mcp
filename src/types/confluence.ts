export interface ConfluenceSearchResult {
  results: ConfluenceSearchItem[];
  totalSize: number;
  _links: { next?: string };
}

export interface ConfluenceSearchItem {
  id: string;
  type: string;
  title: string;
  space: { key: string; name: string };
  excerpt?: string;
  _links: { webui: string };
}

export interface ConfluencePage {
  id: string;
  title: string;
  status: string;
  spaceId: string;
  version?: { number: number; createdAt: string };
  body?: {
    atlas_doc_format?: { value: string };
    storage?: { value: string };
  };
  _links: { webui: string; base?: string };
}

export interface ConfluencePageV1 {
  id: string;
  type: string;
  title: string;
  space: { key: string; name: string };
  body?: {
    storage?: { value: string };
    view?: { value: string };
  };
  version: { number: number; when: string };
  _links: { webui: string; base: string };
}

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
  description?: { plain?: { value: string } };
  _links: { webui: string };
}

import { AtlassianHttpClient } from "./http-client.js";
import type {
  ConfluenceSearchResult,
  ConfluencePage,
  ConfluenceSpace,
} from "../types/confluence.js";

export class ConfluenceClient {
  constructor(private http: AtlassianHttpClient) {}

  async search(cql: string, limit: number = 10): Promise<ConfluenceSearchResult> {
    return this.http.get<ConfluenceSearchResult>("/wiki/rest/api/content/search", {
      cql,
      limit: String(Math.min(limit, 25)),
    });
  }

  async getPage(pageId: string): Promise<ConfluencePage> {
    // Try v2 API with ADF format first
    try {
      return await this.http.get<ConfluencePage>(`/wiki/api/v2/pages/${pageId}`, {
        "body-format": "atlas_doc_format",
      });
    } catch {
      // Fall back to v2 with storage format
      return this.http.get<ConfluencePage>(`/wiki/api/v2/pages/${pageId}`, {
        "body-format": "storage",
      });
    }
  }

  async getChildPages(pageId: string, limit: number = 25): Promise<ConfluencePage[]> {
    const result = await this.http.get<{ results: ConfluencePage[] }>(
      `/wiki/api/v2/pages/${pageId}/children`,
      { limit: String(Math.min(limit, 50)) },
    );
    return result.results;
  }

  async listSpaces(limit: number = 50): Promise<ConfluenceSpace[]> {
    const result = await this.http.get<{ results: ConfluenceSpace[] }>("/wiki/api/v2/spaces", {
      limit: String(Math.min(limit, 100)),
      sort: "name",
    });
    return result.results;
  }

  async addComment(pageId: string, commentText: string): Promise<void> {
    await this.http.post("/wiki/api/v2/footer-comments", {
      pageId,
      body: {
        representation: "storage",
        value: `<p>${escapeHtml(commentText)}</p>`,
      },
    });
  }

  /** Fetch the XHTML storage XML for a page (v1 API). Used for draw.io attachment detection. */
  async getPageStorageXml(pageId: string): Promise<string | null> {
    try {
      const result = await this.http.get<{ body: { storage: { value: string } } }>(
        `/wiki/rest/api/content/${pageId}`,
        { expand: "body.storage" },
      );
      return result.body?.storage?.value ?? null;
    } catch {
      return null;
    }
  }

  /** Fetch a page attachment by filename and return its raw text content. */
  async getAttachmentContent(pageId: string, filename: string): Promise<string | null> {
    try {
      const result = await this.http.get<{
        results: Array<{ _links: { download: string } }>;
      }>(`/wiki/rest/api/content/${pageId}/child/attachment`, {
        filename,
        limit: "1",
      });
      const downloadPath = result.results[0]?._links?.download;
      if (!downloadPath) return null;
      return this.http.getText(downloadPath);
    } catch {
      return null;
    }
  }

  /** Fetch a page attachment image as base64. Skips files larger than 5 MB. */
  async getAttachmentImage(
    pageId: string,
    filename: string,
  ): Promise<{ data: string; mimeType: string } | null> {
    try {
      const result = await this.http.get<{
        results: Array<{
          extensions: { fileSize: number; mediaType: string };
          _links: { download: string };
        }>;
      }>(`/wiki/rest/api/content/${pageId}/child/attachment`, {
        filename,
        limit: "1",
        expand: "extensions",
      });

      const attachment = result.results[0];
      if (!attachment) return null;

      const MAX_BYTES = 5 * 1024 * 1024;
      if (attachment.extensions.fileSize > MAX_BYTES) return null;

      const downloadPath = attachment._links.download;
      if (!downloadPath) return null;

      return this.http.getBase64(downloadPath);
    } catch {
      return null;
    }
  }

  async getSpaceByKey(spaceKey: string): Promise<ConfluenceSpace | null> {
    const result = await this.http.get<{ results: ConfluenceSpace[] }>("/wiki/api/v2/spaces", {
      keys: spaceKey,
      limit: "1",
    });
    return result.results[0] || null;
  }

  async getRootPages(spaceKey: string, limit: number = 25): Promise<ConfluencePage[]> {
    // Use v1 CQL search to find top-level pages in a space
    const result = await this.search(
      `type=page AND space="${spaceKey}" AND ancestor=null`,
      limit,
    );
    return result.results.map((item) => ({
      id: item.id,
      title: item.title,
      status: "current",
      spaceId: "",
      _links: { webui: item._links.webui },
    }));
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

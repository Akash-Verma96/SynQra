
import crypto from "node:crypto";
import { firecrawl } from "../config/firecrawl.config.js";

export async function crawlWebsite(
  websiteUrl,
  {
    limit = 20,
    maxDiscoveryDepth = 2,
    includePaths,
    excludePaths,
  } = {}
) {
  try {
    // Validate URL
    const url = new URL(websiteUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Only HTTP and HTTPS URLs are supported.");
    }

    console.log(`Starting website crawl: ${websiteUrl}`);

    // Crawl website and extract Markdown
    const response = await firecrawl.crawl(websiteUrl, {
      limit,
      maxDiscoveryDepth,
      includePaths,
      excludePaths,

      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
      },

      pollInterval: 5,
    });

    const pages = response.data ?? [];

    if (!pages.length) {
      throw new Error("No pages were extracted from the website.");
    }

    // Generate unique filename
    const fileId = crypto.randomUUID();
    const fileName = `website-${fileId}.md`;

    console.log(`Website crawl completed: ${pages.length} pages`);

    return {
      success: true,
      fileName,
      pages,
      totalPages: pages.length,
    };

  } catch (error) {
    console.error("Website crawling failed:", error);
    throw error;
  }
}


import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { firecrawl } from "../config/firecrawl.config.js";

const OUTPUT_DIR = path.resolve("uploads/websites");

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

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

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

    // Combine all crawled pages into one Markdown file
    const markdown = pages
      .filter((page) => page.markdown?.trim())
      .map((page) => {
        const sourceUrl = page.metadata?.sourceURL ?? websiteUrl;
        const title = page.metadata?.title ?? "Untitled Page";

        return [
          `# ${title}`,
          `Source: ${sourceUrl}`,
          "",
          page.markdown,
        ].join("\n");
      })
      .join("\n\n---\n\n");

    if (!markdown.trim()) {
      throw new Error("No readable Markdown content found.");
    }

    // Generate unique filename
    const fileId = crypto.randomUUID();
    const fileName = `website-${fileId}.md`;

    const filePath = path.join(OUTPUT_DIR, fileName);

    // Save Markdown
    await fs.writeFile(filePath, markdown, "utf-8");

    console.log(`Website crawl completed: ${pages.length} pages`);

    return {
      success: true,
      fileName,
      filePath,
      totalPages: pages.length,
      totalCharacters: markdown.length,
    };

  } catch (error) {
    console.error("Website crawling failed:", error);
    throw error;
  }
}

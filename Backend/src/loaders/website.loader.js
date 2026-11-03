// website.loader.js
import { Document } from "@langchain/core/documents";

export function loadWebsitePages(pages) {
  return pages
    .filter((page) => page.markdown?.trim())
    .map((page) =>
      new Document({
        pageContent: page.markdown,

        metadata: {
          source: page.metadata?.sourceURL ?? page.url,
          title: page.metadata?.title ?? "Untitled",
          sourceType: "website"
        }
      })
    );
}
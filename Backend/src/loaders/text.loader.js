// text.loader.js
import fs from "node:fs/promises";
import { Document } from "@langchain/core/documents";

export async function loadText(filePath, type) {
  const content = await fs.readFile(filePath, "utf-8");

  return [
    new Document({
      pageContent: content,
      metadata: {
        source: filePath,
        sourceType: type
      }
    })
  ];
}
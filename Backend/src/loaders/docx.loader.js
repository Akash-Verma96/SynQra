// docx.loader.js
import mammoth from "mammoth";
import { Document } from "@langchain/core/documents";

export async function loadDOCX(filePath) {
  const result = await mammoth.extractRawText({
    path: filePath
  });

  return [
    new Document({
      pageContent: result.value,
      metadata: {
        source: filePath,
        sourceType: "docx"
      }
    })
  ];
}
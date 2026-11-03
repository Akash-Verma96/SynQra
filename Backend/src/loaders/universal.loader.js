// universal.loader.js
import path from "node:path";

import { loadPDF } from "./pdf.loader.js";
import { loadDOCX } from "./docx.loader.js";
import { loadText } from "./text.loader.js";
import { loadSRT } from "./srt.loader.js";

export async function loadSource(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".pdf":
      return await loadPDF(filePath);

    case ".docx":
      return await loadDOCX(filePath);

    case ".md":
      return await loadText(filePath, "markdown");

    case ".txt":
      return await loadText(filePath, "text");

    // case ".srt":
    //   return await loadSRT(filePath);

    default:
      throw new Error(
        `Unsupported file format: ${extension}`
      );
  }
}
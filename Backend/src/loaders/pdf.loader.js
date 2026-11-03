// pdf.loader.js
import { PDFLoader } from
  "@langchain/community/document_loaders/fs/pdf";

export async function loadPDF(filePath) {
  const loader = new PDFLoader(filePath, {
    splitPages: true
  });

  const docs = await loader.load();

  return docs.map((doc, index) => ({
    ...doc,
    metadata: {
      ...doc.metadata,
      sourceType: "pdf",
      source: filePath,
      page: doc.metadata.loc?.pageNumber ?? index + 1
    }
  }));
}
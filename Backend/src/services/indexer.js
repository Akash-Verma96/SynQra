import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getVectorStore } from "../config/qdrant.config.js";

const BATCH_SIZE = 32;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

/**
 * Universal LangChain Document Indexer segregated by User ID
 *
 * @param {Document[]} documents
 * @param {Object} options
 * @param {string} options.userId - The unique identifier of the user/tenant
 */
export async function indexDocuments(
  documents,
  {
    userId, // 1. Destructure userId explicitly to ensure it is provided
    batchSize = BATCH_SIZE,
    metadata = {},
  } = {}
) {
  if (!userId) {
    throw new Error("A valid 'userId' is required to index documents securely.");
  }

  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error("Documents must be a non-empty array.");
  }

  const vectorStore = await getVectorStore();

  let totalChunks = 0;
  let totalIndexed = 0;
  let batch = [];

  // Process one document at a time.
  for (const doc of documents) {
    if (!doc?.pageContent?.trim()) continue;

    // Preserve original metadata and bind the userId to the payload
    const normalizedDoc = {
      ...doc,
      metadata: {
        ...doc.metadata,
        ...metadata,
        user_id: userId, // 2. Map userId strictly to a consistent field like 'user_id'
      },
    };

    // Split only the current document.
    const chunks = await splitter.splitDocuments([normalizedDoc]);

    // Insert chunks in controlled batches.
    for (const chunk of chunks) {
      batch.push(chunk);
      totalChunks++;

      if (batch.length >= batchSize) {
        await vectorStore.addDocuments(batch);

        totalIndexed += batch.length;
        batch = [];

        console.log(`Indexed ${totalIndexed} chunks for user: ${userId}`);
      }
    }
  }

  // Insert remaining chunks.
  if (batch.length > 0) {
    await vectorStore.addDocuments(batch);
    totalIndexed += batch.length;
  }

  return {
    success: true,
    totalDocuments: documents.length,
    totalChunks,
    totalIndexed,
  };
}


import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceTransformersEmbeddings } from
  "@langchain/community/embeddings/huggingface_transformers";
import { QdrantVectorStore } from "@langchain/qdrant";

import { serverConfig } from "../config/index.js";

const BATCH_SIZE = 32;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

let embeddingsInstance = null;
let vectorStoreInstance = null;

// Reuse embeddings model instead of loading it for every request.
function getEmbeddings() {
  if (!embeddingsInstance) {
    embeddingsInstance = new HuggingFaceTransformersEmbeddings({
      modelName: "Xenova/all-MiniLM-L6-v2",
      batchSize: BATCH_SIZE,
    });
  }

  return embeddingsInstance;
}

// Reuse Qdrant connection and embedding instance.
async function getVectorStore() {
  if (!vectorStoreInstance) {
    vectorStoreInstance = await QdrantVectorStore.fromExistingCollection(
      getEmbeddings(),
      {
        url: serverConfig.qdrant.url,
        collectionName: serverConfig.qdrant.collection,
      }
    );
  }

  return vectorStoreInstance;
}

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

/**
 * Universal LangChain Document Indexer
 *
 * @param {Document[]} documents
 * @param {Object} options
 */
export async function indexDocuments(
  documents,
  {
    batchSize = BATCH_SIZE,
    metadata = {},
  } = {}
) {
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

    // Preserve original metadata and add common metadata.
    const normalizedDoc = {
      ...doc,
      metadata: {
        ...doc.metadata,
        ...metadata,
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

        console.log(`Indexed ${totalIndexed} chunks`);
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

import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { QdrantVectorStore } from "@langchain/qdrant";

import { serverConfig } from "../config/index.js";
import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrantClient = new QdrantClient({
    url: serverConfig.qdrant.url,
    apiKey: serverConfig.qdrant.apiKey,
});


const BATCH_SIZE = 32;
let embeddingsInstance = null;
let vectorStoreInstance = null;

// Reuse embeddings model instead of loading it for every request.
export function getEmbeddings() {
  if (!embeddingsInstance) {
    embeddingsInstance = new HuggingFaceTransformersEmbeddings({
      modelName: "Xenova/all-MiniLM-L6-v2",
      batchSize: BATCH_SIZE,
    });
  }

  return embeddingsInstance;
}


// Reuse Qdrant connection and embedding instance.
export async function getVectorStore() {
  if (!vectorStoreInstance) {
    vectorStoreInstance = await QdrantVectorStore.fromExistingCollection(
      getEmbeddings(),
      {
        url: serverConfig.qdrant.url,
        apiKey: serverConfig.qdrant.apiKey,
        collectionName: serverConfig.qdrant.collection,
      }
    );
  }

  return vectorStoreInstance;
}
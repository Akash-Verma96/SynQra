import { getFinalResponse, hydeDocument, rewriteQuery } from "./rag.js";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { QdrantVectorStore } from '@langchain/qdrant';
import { serverConfig } from "../config/index.js";
import { rankDocumentsRRF } from "./ranker.js";

export async function queryFromSource(query) {
    // 1. Generate query variations
    const { stepBack, rewritten, subQueries } = await rewriteQuery(query);
    const hyde = await hydeDocument(query);

    // 2. Bundle the original query alongside all variations
    const allQueries = [
        { label: "original", text: query },
        { label: "rewritten", text: rewritten },
        { label: "stepBack", text: stepBack },
        { label: "hyde", text: hyde },
        ...subQueries.map((q, i) => ({ label: `subQuery${i + 1}`, text: q })),
    ].filter((q) => typeof q.text === "string" && q.text.trim().length > 0);

    // 3. Initialize embeddings and connect to Qdrant
    const embeddings = new HuggingFaceTransformersEmbeddings({
        modelName: "Xenova/all-MiniLM-L6-v2",
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings, {
            url: serverConfig.qdrant.url,
            collectionName: serverConfig.qdrant.collection,
        }
    );

    const retriever = vectorStore.asRetriever({ k: 2 });

    // 4. Run retrievals for ALL queries concurrently
    const retrievalPromises = allQueries.map(async (q) => {
        const docs = await retriever.invoke(q.text);
        // Optional: Attach the label to know which query found which document
        return docs.map(doc => ({ ...doc, matchedQuery: q.label }));
    });

    // 5. Wait for all searches to finish and flatten the array
    const nestedResults = await Promise.all(retrievalPromises);
  
    const rankedDocs = rankDocumentsRRF(nestedResults,3)

    console.log(`Retrieved ${rankedDocs.length} top ranked documents`);

    // Map the ranked docs to extract only the pageContent and join them with a separator
    const context = rankedDocs
        .map((doc, index) => `[Document ${index + 1}]\n${doc.pageContent}`)
        .join('\n\n-------------------------\n\n');

    const finalResponse = await getFinalResponse(context,query)

    return finalResponse
}
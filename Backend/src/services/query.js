import { getFinalResponse, hydeDocument, rewriteQuery } from "./rag.js";
import { rankDocumentsRRF } from "./ranker.js";
import { getVectorStore } from "../config/qdrant.config.js";

export async function queryFromSource(userId,query, conversationHistory = []) {

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

 
    const vectorStore = await getVectorStore();

    const retriever = vectorStore.asRetriever({
        k: 5,
        filter: {
            must: [
                {
                    key: "metadata.user_id",
                    match: {
                        value: userId
                    }
                }
            ]
        }
    });
    const retrievalPromises = allQueries.map(async (q, index) => {
    const docs = await retriever.invoke(q.text);

    return docs.map(doc => ({
        ...doc,
        matchedQuery: q.label
    }));
});


const nestedResults = await Promise.all(retrievalPromises);


console.log("Retrieved:", nestedResults.length);

    const rankedDocs = rankDocumentsRRF(nestedResults,3)
    
    console.log(`Retrieved ${rankedDocs.length} top ranked documents`);

    // Map the ranked docs to extract only the pageContent and join them with a separator
    const context = rankedDocs
        .map((doc, index) => `[Document ${index + 1}]\n${doc.pageContent}`)
        .join('\n\n-------------------------\n\n');

    const priorMessages = Array.isArray(conversationHistory)
        ? conversationHistory
            .filter((message) => message && typeof message.content === 'string' && message.content.trim())
            .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
            .join('\n\n')
        : '';

    const finalResponse = await getFinalResponse(
        context,
        priorMessages
            ? `Previous conversation:\n${priorMessages}\n\nCurrent question: ${query}`
            : query
    );

    return finalResponse
}
/**
 * Ranks documents using Reciprocal Rank Fusion (RRF)
 * @param {Array<Array<Object>>} nestedResults - Array of document arrays from multiple queries
 * @param {number} topK - Number of top documents to return
 * @returns {Array<Object>} - Top ranked documents
 */
export function rankDocumentsRRF(nestedResults, topK = 3) {
    const rrfConstant = 60; // Standard constant used in RRF algorithms
    const documentScores = new Map();
    const documentMap = new Map();

    // Iterate through the results of each query
    nestedResults.forEach((docList) => {
        docList.forEach((doc, rank) => {
            // Use pageContent as a unique identifier (or doc.metadata.id if available)
            const docId = doc.pageContent; 
            
            // Calculate RRF score for this position: 1 / (rank + k)
            // Note: rank is 0-indexed, so we add 1 for the math
            const currentScore = documentScores.get(docId) || 0;
            const rrfScore = 1 / (rank + 1 + rrfConstant);
            
            documentScores.set(docId, currentScore + rrfScore);
            
            // Store the actual document object if we haven't seen it
            if (!documentMap.has(docId)) {
                documentMap.set(docId, doc);
            }
        });
    });

    // Convert map to array, sort by score descending, and slice topK
    const rankedDocs = Array.from(documentScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topK)
        .map(([docId, score]) => {
            return {
                ...documentMap.get(docId),
                rrfScore: score // Optional: attach score to see the math in action
            };
        });

    return rankedDocs;
}
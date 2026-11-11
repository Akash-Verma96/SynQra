import { qdrantClient } from "../../config/qdrant.config.js";
import { serverConfig } from "../../config/index.js";

async function migrateQdrant() {
    const collectionName = serverConfig.qdrant.collection;

    // Verify collection exists
    const collection = await qdrantClient.getCollection(collectionName);

    console.log("Collection verified:", collectionName);

    // Create index for multi-tenant filtering
    await qdrantClient.createPayloadIndex(
        collectionName,
        {
            field_name: "metadata.user_id",
            field_schema: "keyword",
        }
    );

    console.log("Qdrant payload index migration completed.");
}

migrateQdrant()
    .catch((error) => {
        console.error("Qdrant migration failed:", error);
        process.exitCode = 1;
    });
import dotenv from 'dotenv';
dotenv.config();


export const serverConfig = {
    PORT: Number(process.env.PORT) || 3001, // process.env.PORT is a string, so we need to convert it to a number
    REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
    REDIS_HOST: process.env.REDIS_HOST || "localhost",
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
    DATABASE_URL: process.env.DATABASE_URL || "",
    qdrant: {
        url: process.env.QDRANT_URL || "http://127.0.0.1:6333",
        collection: process.env.QDRANT_COLLECTION || "documents",
    },
    openai: {
        chatmodel: "openai/gpt-oss-20b"
    },
    postgres: {
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
        GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || ""
    }
}

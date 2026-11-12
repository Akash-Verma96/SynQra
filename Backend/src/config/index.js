import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(configDirectory, '../..');
const inheritedEnvironmentKeys = new Set(Object.keys(process.env));

const readEnvFile = (filePath) => {
    try {
        return dotenv.parse(fs.readFileSync(filePath));
    } catch (error) {
        if (error.code === 'ENOENT') return {};
        throw error;
    }
};

const baseEnvironment = readEnvFile(path.join(backendDirectory, '.env'));
const requestedEnvironment = (
    process.env.APP_ENV ||
    baseEnvironment.APP_ENV ||
    process.env.NODE_ENV ||
    baseEnvironment.NODE_ENV ||
    'local'
).toLowerCase();

if (!['local', 'production'].includes(requestedEnvironment)) {
    throw new Error(`Invalid APP_ENV: ${requestedEnvironment}. Use "local" or "production".`);
}

const environmentFile = readEnvFile(path.join(backendDirectory, `.env.${requestedEnvironment}`));

// Host-provided variables take priority, then the selected environment file,
// then the base .env file.
for (const [key, value] of Object.entries(baseEnvironment)) {
    if (!inheritedEnvironmentKeys.has(key)) process.env[key] = value;
}
for (const [key, value] of Object.entries(environmentFile)) {
    if (!inheritedEnvironmentKeys.has(key)) process.env[key] = value;
}
process.env.APP_ENV = requestedEnvironment;

const LOCAL_BACKEND_URL = 'http://localhost:3001';
const LOCAL_FRONTEND_URL = 'http://localhost:5173';
const PRODUCTION_BACKEND_URL = 'https://synqra-rai9.onrender.com';
const PRODUCTION_FRONTEND_URL = 'https://synqra-pearl.vercel.app';

const APP_ENV = requestedEnvironment;
const isProduction = APP_ENV === 'production';

const resolveUrl = (configuredUrl, localUrl, productionUrl) => {
    if (configuredUrl) return configuredUrl.replace(/\/$/, '');
    return isProduction ? productionUrl : localUrl;
};

const backendUrl = resolveUrl(process.env.BACKEND_URL, LOCAL_BACKEND_URL, PRODUCTION_BACKEND_URL);
const frontendUrl = resolveUrl(process.env.FRONTEND_URL, LOCAL_FRONTEND_URL, PRODUCTION_FRONTEND_URL);

export const appEnvironment = {
    mode: APP_ENV,
    isProduction,
    backendUrl,
    frontendUrl,
    apiBaseUrl: `${backendUrl}/api/v1`,
    uploadsBaseUrl: `${backendUrl}/uploads`,
    allowedOrigins: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        frontendUrl,
    ],
};

export const serverConfig = {
    APP_ENV: APP_ENV,
    PORT: Number(process.env.PORT) || 3001,
    REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    DATABASE_URL: process.env.DATABASE_URL || '',
    backendUrl,
    frontendUrl,
    apiBaseUrl: `${backendUrl}/api/v1`,
    uploadsBaseUrl: `${backendUrl}/uploads`,
    qdrant: {
        url: process.env.QDRANT_CLUSTER_END_POINT || 'http://127.0.0.1:6333',
        apiKey: process.env.QDRANT_API_KEY || '',
        collection: process.env.QDRANT_COLLECTION || 'documents',
    },
    openai: {
        chatmodel: 'openai/gpt-oss-20b',
    },
    postgres: {
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
        GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || `${backendUrl}/api/v1/google/callback`,
    },
};

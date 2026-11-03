import Redis from "ioredis";
import { serverConfig } from "./index.js";

let redisInstance = null;

export function getRedisClient() {
    try {
        if (redisInstance) {
            return redisInstance;
        }

        const redisConfig = {
            host: serverConfig.REDIS_HOST || '127.0.0.1',
            port: parseInt(serverConfig.REDIS_PORT || '6379', 10),
            maxRetriesPerRequest: null, 
        };

        redisInstance = new Redis(redisConfig);

        redisInstance.on('connect', () => {
            console.log('🔄 Connecting to Redis...');
        });

        redisInstance.on('ready', () => {
            console.log('✅ Redis client is ready and connected successfully.');
        });

        redisInstance.on('error', (error) => {
            console.error('❌ Redis connection error:', error.message);
        });

        return redisInstance;

    } catch (error) {
        console.error("Error while establishing Redis connection:", error);
        throw error;
    }
}

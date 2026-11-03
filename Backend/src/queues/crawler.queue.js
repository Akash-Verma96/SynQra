import {Queue} from 'bullmq';
import { getRedisClient } from '../config/redis.config.js';

export const CRAWLER_QUEUE = 'crwal-queue';

export const crawlQueue = new Queue(CRAWLER_QUEUE,{
    connection: getRedisClient()
})
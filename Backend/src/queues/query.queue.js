import {Queue} from 'bullmq';
import { getRedisClient } from '../config/redis.config.js';

export const QUERY_QUEUE = 'query-queue';

export const queryQueue = new Queue(QUERY_QUEUE,{
    connection: getRedisClient()
})
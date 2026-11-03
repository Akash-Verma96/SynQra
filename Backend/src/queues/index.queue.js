import {Queue} from 'bullmq';
import { getRedisClient } from '../config/redis.config.js';

export const INDEX_QUEUE = 'index-queue';

export const indexQueue = new Queue(INDEX_QUEUE,{
    connection: getRedisClient()
})
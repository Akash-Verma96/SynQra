import {Queue} from 'bullmq';
import { getRedisClient } from '../config/redis.config.js';

export const YT_QUEUE = 'yt-queue';

export const ytQueue = new Queue(YT_QUEUE,{
    connection: getRedisClient()
})
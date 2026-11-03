import { crawlQueue } from "../queues/crawler.queue.js";
import { indexQueue } from "../queues/index.queue.js";
import { queryQueue } from "../queues/query.queue.js";


export const INDEX_PAYLOAD = 'index-payload:data';
export const QUERY_PAYLOAD = 'query-payload:data';
export const CRWAL_PAYLOAD = 'crwal-payload:data';

export const addToIndexQueue = async (data) =>{
    const job = await indexQueue.add(INDEX_PAYLOAD, data);
    console.log(`✅ Data added to index queue`);
    return job;
}

export const addToQueryQueue = async (data) =>{
    const job = await queryQueue.add(QUERY_PAYLOAD, data);
    console.log(`✅ query added to query queue`);
    return job;
}

export const addToCrwalQueue = async(data) =>{
    const job = await crawlQueue.add(CRWAL_PAYLOAD,data);
    console.log(`✅ URL added to crawl queue`);
    return job;
}
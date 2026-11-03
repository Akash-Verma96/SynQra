import { Worker } from "bullmq";
import { getRedisClient } from "../config/redis.config.js";
import { INDEX_QUEUE } from "../queues/index.queue.js";
import { addToIndexQueue, CRWAL_PAYLOAD, INDEX_PAYLOAD, QUERY_PAYLOAD } from "../producers/index.producer.js";
import { indexDocuments } from "../services/indexer.js";
import { QUERY_QUEUE } from "../queues/query.queue.js";
import { queryFromSource } from "../services/query.js";
import { loadSource } from "../loaders/universal.loader.js";
import { CRAWLER_QUEUE } from "../queues/crawler.queue.js";
import { crawlWebsite } from "../utils/crawlWebsite.js";

export function setUpIndexWorker(){
    const indexWorker = new Worker(INDEX_QUEUE, async (job)=>{

        if(job.name !== INDEX_PAYLOAD){
            throw new Error(`Invalid job name: ${job.name}`);
        }

        console.log(`🔄 Processing Indexing name: ${job.data.originalName}`);
        
        const documents = await loadSource(job.data.filePath)

        const result = await indexDocuments(documents,{
            metadata: documents.metadata
        })

        console.log(result);

        return result;
    },{
        connection: getRedisClient()
    })

    indexWorker.on("completed", (job) => console.log(`✅ indexing job ${job.id} completed`));
    indexWorker.on("failed", (job, err) => console.error(`❌ indexing job ${job?.id} failed:`, err.message));
}

export function setUpQUERYWorker(){
    const queryWorker = new Worker(QUERY_QUEUE, async (job)=>{

        if(job.name !== QUERY_PAYLOAD){
            throw new Error(`Invalid job name: ${job.name}`);
        }

        console.log(`🔄 Processing Query : ${job.data.query}`);

        const result = await queryFromSource(job.data.query);
        return result;
    },{
        connection: getRedisClient()
    })

    queryWorker.on("completed", (job) => console.log(`✅ Query job ${job.id} completed`));
    queryWorker.on("failed", (job, err) => console.error(`❌ Query job ${job?.id} failed:`, err.message));
}

export function setUpCrwalWorker(){
    const crwalWorker = new Worker(CRAWLER_QUEUE, async (job)=>{

        if(job.name !== CRWAL_PAYLOAD){
            throw new Error(`Invalid job name: ${job.name}`);
        }

        console.log(`🔄 Processing crwaling : ${job.data.url}`);

        const website = await crawlWebsite(
            job.data.url,
            {
                limit: 30,
                maxDiscoveryDepth: 3,
            }
        );
        // const result = await queryFromSource(job.data.query);
        console.log(website);
        
        console.log(`🔄 Processing Indexing name: ${website.fileName}`);

        const indexingJob = await addToIndexQueue({
            filePath: website.filePath,
            originalName: website.fileName,
            mimeType: website.mimetype,
            size: website.totalPages,
        });

        return indexingJob;
    },{
        connection: getRedisClient()
    })

    crwalWorker.on("completed", (job) => console.log(`✅ Crawaler job ${job.id} completed`));
    crwalWorker.on("failed", (job, err) => console.error(`❌ Crawaler job ${job?.id} failed:`, err.message));
}
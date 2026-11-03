import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { addToCrwalQueue, addToIndexQueue, addToQueryQueue, addToYtQueue } from "./producers/index.producer.js";
import { queryQueue } from "./queues/query.queue.js";
import { indexQueue } from "./queues/index.queue.js";
import { crawlQueue } from "./queues/crawler.queue.js";
import { ytQueue } from "./queues/ytTranscript.queue.js";
import { Document } from "@langchain/core/documents";
import { indexDocuments } from "./services/indexer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads");

// Ensure the uploads directory exists.
fs.mkdirSync(uploadDir, { recursive: true });

// --- Multer config: store PDFs on disk with a unique name ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomUUID()}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    // Define the specific document MIME types
    const allowedDocs = [
      "application/pdf", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // DOCX
    ];

    // Accept if it's in the allowedDocs array OR if it starts with "image/"
    if (allowedDocs.includes(file.mimetype) || file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    
    // Reject anything else
    cb(new Error("Only PDF, DOCX, and image files are allowed"));
  },
});

const fileUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedDocs = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ];

    if (allowedDocs.includes(file.mimetype) || file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }

    cb(new Error("Only PDF, DOCX, image, text, Excel, and PowerPoint files are allowed"));
  },
});

const indexRouter = express.Router()
indexRouter.use(express.json());

indexRouter.get("/health", (_req, res) => res.json({ status: "ok" }));

// --- GET /index/:id : poll for the status/result of an indexing job ---
indexRouter.get("/index/:id", async (req, res) => {
  try {
    const job = await indexQueue.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();

    if (state === "completed") {
      return res.json({ jobId: job.id, status: state, result: job.returnvalue });
    }
    if (state === "failed") {
      return res.status(200).json({ jobId: job.id, status: state, error: job.failedReason });
    }

    // waiting | active | delayed | paused
    return res.json({ jobId: job.id, status: state });
  } catch (err) {
    console.error("Failed to fetch indexing job:", err);
    return res.status(500).json({ error: "Failed to fetch job" });
  }
});

// --- POST /index : upload one or more source files and enqueue indexing jobs ---
indexRouter.post("/index", fileUpload.array("files", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded (field: 'files')" });
  }

  try {
    const jobs = await Promise.all(
      req.files.map(async (file) => {
        const job = await addToIndexQueue({
          filePath: file.path,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        });

        return {
          jobId: job.id,
          file: {
            originalName: file.originalname,
            storedAs: file.filename,
            size: file.size,
            mimeType: file.mimetype,
          },
        };
      }),
    );

    return res.status(202).json({
      message: "Files uploaded and queued for indexing",
      jobs,
    });
  } catch (err) {
    console.error("Failed to enqueue indexing jobs:", err);
    return res.status(500).json({ error: "Failed to queue files for indexing" });
  }
});

// Legacy single-file fallback for compatibility with older clients.
indexRouter.post("/index/single", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded (field: 'file')" });
  }

  try {
    const job = await addToIndexQueue({
      filePath: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    return res.status(202).json({
      message: "File uploaded and queued for indexing",
      jobId: job.id,
      file: {
        originalName: req.file.originalname,
        storedAs: req.file.filename,
        size: req.file.size,
      },
    });
  } catch (err) {
    console.error("Failed to enqueue indexing job:", err);
    return res.status(500).json({ error: "Failed to queue file for indexing" });
  }
});

// --- GET /crawl/:id : poll for the status/result of a crawl job ---
indexRouter.get("/crawl/:id", async (req, res) => {
  try {
    const job = await crawlQueue.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();

    if (state === "completed") {
      return res.json({ jobId: job.id, status: state, result: job.returnvalue });
    }
    if (state === "failed") {
      return res.status(200).json({ jobId: job.id, status: state, error: job.failedReason });
    }

    return res.json({ jobId: job.id, status: state });
  } catch (err) {
    console.error("Failed to fetch crawl job:", err);
    return res.status(500).json({ error: "Failed to fetch crawl job" });
  }
});

indexRouter.get("/youtube/:id", async (req, res) => {
  try {
    const job = await ytQueue.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();

    if (state === "completed") {
      return res.json({ jobId: job.id, status: state, result: job.returnvalue });
    }
    if (state === "failed") {
      return res.status(200).json({ jobId: job.id, status: state, error: job.failedReason });
    }

    return res.json({ jobId: job.id, status: state });
  } catch (err) {
    console.error("Failed to fetch YouTube job:", err);
    return res.status(500).json({ error: "Failed to fetch YouTube job" });
  }
});

indexRouter.post('/url', async (req, res) => {
  const { websiteUrl, youtubeUrl, text, sourceName } = req.body;

  try {
    if (websiteUrl) {
      const job = await addToCrwalQueue({
        url: websiteUrl,
        sourceName: sourceName || websiteUrl,
      });

      return res.status(202).json({
        message: "Website URL uploaded and queued for crawling",
        jobId: job.id,
        sourceType: 'website',
        file: { url: websiteUrl }
      });
    }

    if (youtubeUrl) {
      const job = await addToYtQueue({
        url: youtubeUrl,
        sourceName: sourceName || youtubeUrl,
      });

      return res.status(202).json({
        message: "YouTube URL uploaded and queued for transcription",
        jobId: job.id,
        sourceType: 'youtube',
        file: { url: youtubeUrl }
      });
    }

    if (typeof text === 'string' && text.trim().length > 0) {
      const documents = [
        new Document({
          pageContent: text,
          metadata: {
            source: 'user',
            type: 'text',
            sourceName: sourceName || 'Text snippet',
          },
        }),
      ];

      const result = await indexDocuments(documents, { metadata: { source: 'user', type: 'text' } });

      return res.json({ message: 'Content processed successfully', data: result, sourceType: 'text' });
    }

    return res.status(400).json({ error: 'Provide a websiteUrl, youtubeUrl, or text payload' });
  } catch (error) {
    res.status(500).json({ message: "Processing failed", error: error.message });
  }
});

// --- POST /query : enqueue a RAG query job, return the job id to poll ---
indexRouter.post("/query", async (req, res) => {
  const query = req.body?.query;
  if (typeof query !== "string" || query.trim().length === 0) {
    return res
      .status(400)
      .json({ error: "Body must include a non-empty 'query' string" });
  }

  try {
    const job = await addToQueryQueue({ query: query.trim() });

    return res.status(202).json({
      message: "Query queued",
      jobId: job.id,
      poll: `/query/${job.id}`,
    });
  } catch (err) {
    console.error("Failed to enqueue query job:", err);
    return res.status(500).json({ error: "Failed to queue query" });
  }
});

// --- GET /query/:id : poll for the status/result of a query job ---
indexRouter.get("/query/:id", async (req, res) => {
  try {
    const job = await queryQueue.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();

    if (state === "completed") {
      return res.json({
        jobId: job.id,
        status: state,
        result: job.returnvalue,
      });
    }
    if (state === "failed") {
      return res.status(200).json({ jobId: job.id, status: state, error: job.failedReason });
    }

    // waiting | active | delayed | paused
    return res.json({ jobId: job.id, status: state });
  } catch (err) {
    console.error("Failed to fetch query job:", err);
    return res.status(500).json({ error: "Failed to fetch job" });
  }
});

// Multer / route error handler.
indexRouter.use((err, _req, res, _next) => {
  console.error(err);
  return res.status(400).json({ error: err.message });
});

export default indexRouter
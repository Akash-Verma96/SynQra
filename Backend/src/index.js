import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { addToCrwalQueue, addToIndexQueue, addToQueryQueue } from "./producers/index.producer.js";
import { queryQueue } from "./queues/query.queue.js";
import { indexQueue } from "./queues/index.queue.js";
import { getYoutubeTranscript } from "./utils/youtubeTranscript.js";

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

// --- POST /index : upload a PDF and enqueue an indexing job ---
indexRouter.post("/index", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "No PDF file uploaded (field: 'file')" });
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

indexRouter.post('/url', async (req, res) => {
  const { websiteUrl, youtubeUrl, text } = req.body;

  try {
    if (websiteUrl) {
      
      const job = await addToCrwalQueue({
        url: websiteUrl,
      });

    return res.status(202).json({
      message: "Url uploaded and queued for crwaling",
      jobId: job.id,
      file: {
        url: websiteUrl
      },
    });

    } else if (youtubeUrl) {

      const transcript = await getYoutubeTranscript(youtubeUrl);

      // const docs = [
      //   new Document({
      //     pageContent: transcript.text,
      //     metadata: {
      //       source: videoUrl,
      //       type: "youtube",
      //       language: transcript.language,
      //     },
      //   }),
      // ];

      // await indexDocuments(docs);

      console.log(transcript.segments.length);
    } else {
      console.log(text);
    }
    
    res.json({ message: "Content processed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Processing failed" });
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
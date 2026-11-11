import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import { addToCrwalQueue, addToIndexQueue, addToQueryQueue, addToYtQueue } from "../producers/index.producer.js";
import { queryQueue } from "../queues/query.queue.js";
import { indexQueue } from "../queues/index.queue.js";
import { crawlQueue } from "../queues/crawler.queue.js";
import { ytQueue } from "../queues/ytTranscript.queue.js";
import { Document } from "@langchain/core/documents";
import { indexDocuments } from "../services/indexer.js";
import authRouter from "./auth.router.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

const sanitizeCloudinaryPublicId = (fileName = "") => {
  const base = path.basename(fileName, path.extname(fileName));
  return base
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "file";
};

const getCloudinaryResourceType = (fileName = "", providedType) => {
  const requested = String(providedType || "").trim().toLowerCase();
  const ext = path.extname(fileName).toLowerCase();

  if (requested) {
    if (["image", "raw", "auto"].includes(requested)) return requested;
    if (requested === "pdf") return "image";
    if (requested === "document") return "raw";
  }

  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".avif", ".heic", ".heif"].includes(ext)) {
    return "image";
  }

  if ([".pdf"].includes(ext)) {
    return "image";
  }

  return "raw";
};

const getCloudinaryFolder = (userId, fileName = "", resourceType) => {
  const ext = path.extname(fileName).toLowerCase();
  const baseFolder = `${userId}`;

  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".avif", ".heic", ".heif"].includes(ext)) {
    return `synqra/${baseFolder}/images`;
  }

  if ([".pdf"].includes(ext) || resourceType === "image") {
    return `synqra/${baseFolder}/pdf`;
  }

  if ([".docx", ".doc"].includes(ext)) {
    return `synqra/${baseFolder}/docx`;
  }

  if ([".xlsx", ".xls", ".csv"].includes(ext)) {
    return `synqra/${baseFolder}/excel`;
  }

  if ([".ppt", ".pptx"].includes(ext)) {
    return `synqra/${baseFolder}/ppt`;
  }

  if ([".txt", ".md", ".rtf"].includes(ext)) {
    return `synqra/${baseFolder}/text`;
  }

  return `synqra/${baseFolder}/raw`;
};

const fileUpload = multer({
  storage: multer.memoryStorage(),
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

const indexRouter = express.Router();
indexRouter.use(express.json());

indexRouter.use("/", authRouter);

indexRouter.post("/cloudinary/signature", requireAuth, async (req, res) => {
  try {
    const fileName = typeof req.body?.fileName === "string" ? req.body.fileName.trim() : "";
    const requestedResourceType = typeof req.body?.resourceType === "string" ? req.body.resourceType.trim() : "";

    if (!fileName) {
      return res.status(400).json({ error: "fileName is required" });
    }

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ error: "Cloudinary environment variables are not configured" });
    }

    const resourceType = getCloudinaryResourceType(fileName, requestedResourceType);
    const folder = getCloudinaryFolder(req.user.id, fileName, resourceType);
    const publicId = `${crypto.randomUUID()}-${sanitizeCloudinaryPublicId(fileName)}`;
    const timestamp = Math.round(Date.now() / 1000);

    const paramsToSign = {
      folder,
      public_id: publicId,
      timestamp,
      type: "upload",
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      apiSecret
    );

    return res.status(200).json({
      success: true,
      cloudName,
      apiKey,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      timestamp,
      signature,
      folder,
      public_id: publicId,
      type: "upload",
      fileName,
    });
  } catch (error) {
    console.error("Cloudinary signature generation failed:", error);
    return res.status(500).json({ error: "Failed to generate Cloudinary upload signature" });
  }
});

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
indexRouter.post("/index",requireAuth, fileUpload.array("files", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded (field: 'files')" });
  }

  try {
    const jobs = await Promise.all(
      req.files.map(async (file) => {
        const job = await addToIndexQueue({
          userId: req.user.id,
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
// indexRouter.post("/index/single",requireAuth, upload.single("file"), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ error: "No file uploaded (field: 'file')" });
//   }

//   try {
//     const job = await addToIndexQueue({
//       userId: req.user.id,
//       filePath: req.file.path,
//       originalName: req.file.originalname,
//       mimeType: req.file.mimetype,
//       size: req.file.size,
//     });

//     return res.status(202).json({
//       message: "File uploaded and queued for indexing",
//       jobId: job.id,
//       file: {
//         originalName: req.file.originalname,
//         storedAs: req.file.filename,
//         size: req.file.size,
//       },
//     });
//   } catch (err) {
//     console.error("Failed to enqueue indexing job:", err);
//     return res.status(500).json({ error: "Failed to queue file for indexing" });
//   }
// });

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

indexRouter.post('/url',requireAuth, async (req, res) => {
  const { websiteUrl, youtubeUrl, text, sourceName } = req.body;

  try {
    if (websiteUrl) {
      const job = await addToCrwalQueue({
        userId: req.user.id,
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
        userId: req.user.id,
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
      console.log(req.user.id)

      const result = await indexDocuments(documents, { userId: req.user.id, metadata: { source: 'user', type: 'text' } });

      return res.json({ message: 'Content processed successfully', data: result, sourceType: 'text' });
    }

    return res.status(400).json({ error: 'Provide a websiteUrl, youtubeUrl, or text payload' });
  } catch (error) {
    res.status(500).json({ message: "Processing failed", error: error.message });
  }
});

// --- POST /query : enqueue a RAG query job, return the job id to poll ---
indexRouter.post("/query",requireAuth, async (req, res) => {
  const query = req.body?.query;
  const conversationHistory = Array.isArray(req.body?.conversationHistory)
    ? req.body.conversationHistory
    : [];

  if (typeof query !== "string" || query.trim().length === 0) {
    return res
      .status(400)
      .json({ error: "Body must include a non-empty 'query' string" });
  }

  try {
    const job = await addToQueryQueue({
      userId: req.user.id,
      query: query.trim(),
      conversationHistory,
    });

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
    return res.status(500).json({ error: "Failed to fetch query job" });
  } });

// --- POST /index/cloudinary : enqueue an indexing job for a Cloudinary asset ---
indexRouter.post("/index/cloudinary", requireAuth, async (req, res) => {
  try {
    const cloudinaryUrl = typeof req.body?.cloudinaryUrl === "string" ? req.body.cloudinaryUrl.trim() : "";
    const publicId = typeof req.body?.publicId === "string" ? req.body.publicId.trim() : "";
    const originalName = typeof req.body?.originalName === "string" ? req.body.originalName.trim() : "";
    const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType.trim() : "application/octet-stream";
    const size = Number(req.body?.size ?? 0);
    const resourceType = typeof req.body?.resourceType === "string" ? req.body.resourceType.trim() : "";
    const folder = typeof req.body?.folder === "string" ? req.body.folder.trim() : "";

    if (!cloudinaryUrl || !publicId || !originalName) {
      return res.status(400).json({ error: "cloudinaryUrl, publicId, and originalName are required" });
    }

    try {
      const parsedUrl = new URL(cloudinaryUrl);
      if (!parsedUrl.hostname.includes("cloudinary.com") && !parsedUrl.hostname.includes("res.cloudinary.com")) {
        return res.status(400).json({ error: "cloudinaryUrl must be a valid Cloudinary URL" });
      }
    } catch {
      return res.status(400).json({ error: "cloudinaryUrl must be a valid URL" });
    }

    const normalizedResourceType = getCloudinaryResourceType(originalName, resourceType || mimeType);
    const normalizedFolder = folder || getCloudinaryFolder(req.user.id, originalName, normalizedResourceType);

    const job = await addToIndexQueue({
      userId: req.user.id,
      filePath: cloudinaryUrl,
      cloudinaryUrl,
      publicId,
      originalName,
      mimeType,
      size,
      resourceType: normalizedResourceType,
      folder: normalizedFolder,
      sourceType: "cloudinary",
    });

    return res.status(202).json({
      message: "Cloudinary source queued for indexing",
      jobId: job.id,
      file: {
        originalName,
        secureUrl: cloudinaryUrl,
        publicId,
        mimeType,
        size,
        resourceType: normalizedResourceType,
        folder: normalizedFolder,
      },
    });
  } catch (error) {
    console.error("Failed to queue Cloudinary source for indexing:", error);
    return res.status(500).json({ error: "Failed to queue Cloudinary asset for indexing" });
  }
});

export default indexRouter;
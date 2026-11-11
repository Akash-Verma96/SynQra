import fs from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { loadSource } from "../loaders/universal.loader.js";

export const fetchSourceFromCloudinary = async (url, filename) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Cloudinary download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  const tempDir = path.join(os.tmpdir(), "synqra");

  await fs.mkdir(tempDir, { recursive: true });

  const filePath = path.join(
    tempDir,
    `${randomUUID()}-${path.basename(filename)}`
  );

  await fs.writeFile(filePath, buffer);

  return filePath;
};


export const loadCloudinarySource = async (url, filename) => {
  let filePath;

  try {
    // Download file
    filePath = await fetchSourceFromCloudinary(url, filename);

    // Existing loader remains unchanged
    const docs = await loadSource(filePath);

    return docs;

  } finally {
    // Always clean temporary file
    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }
  }
};
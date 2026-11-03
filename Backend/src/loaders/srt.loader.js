// srt.loader.js
import fs from "node:fs/promises";
import { Document } from "@langchain/core/documents";

function timestampToSeconds(timestamp) {
  const [hours, minutes, rest] = timestamp.split(":");
  const [seconds, milliseconds] = rest.split(",");

  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(milliseconds) / 1000
  );
}

function parseSRT(content) {
  const blocks = content.trim().split(/\r?\n\s*\r?\n/);

  return blocks
    .map((block) => {
      const lines = block.split(/\r?\n/);

      const timeIndex = lines.findIndex((line) =>
        line.includes("-->")
      );

      if (timeIndex === -1) return null;

      const [start, end] = lines[timeIndex]
        .split("-->")
        .map((value) => value.trim());

      const text = lines
        .slice(timeIndex + 1)
        .join(" ")
        .replace(/<[^>]*>/g, "")
        .trim();

      if (!text) return null;

      return {
        start: timestampToSeconds(start),
        end: timestampToSeconds(end),
        text
      };
    })
    .filter(Boolean);
}

function groupSegments(segments, maxChars = 1200) {
  const groups = [];
  let current = [];

  let currentLength = 0;

  for (const segment of segments) {
    if (
      current.length > 0 &&
      currentLength + segment.text.length > maxChars
    ) {
      groups.push(current);
      current = [];
      currentLength = 0;
    }

    current.push(segment);
    currentLength += segment.text.length;
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

export async function loadSRT(filePath) {
  const content = await fs.readFile(filePath, "utf-8");

  const segments = parseSRT(content);
  const groups = groupSegments(segments);

  return groups.map((group, index) => {
    const start = group[0].start;
    const end = group[group.length - 1].end;

    return new Document({
      pageContent: group
        .map((segment) => segment.text)
        .join(" "),

      metadata: {
        source: filePath,
        sourceType: "audio_transcript",
        segmentIndex: index,
        startTime: start,
        endTime: end
      }
    });
  });
}
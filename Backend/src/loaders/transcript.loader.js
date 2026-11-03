// groq-transcript.loader.js
import { Document } from "@langchain/core/documents";

export function loadGroqTranscript(response) {
  const segments = response.segments ?? [];

  if (segments.length > 0) {
    const groups = groupTranscriptSegments(segments);

    return groups.map((group, index) =>
      new Document({
        pageContent: group
          .map((segment) => segment.text)
          .join(" "),

        metadata: {
          sourceType: "audio_transcript",
          segmentIndex: index,
          startTime: group[0].start,
          endTime: group[group.length - 1].end
        }
      })
    );
  }

  // Fallback for plain text transcription
  return [
    new Document({
      pageContent: response.text ?? "",
      metadata: {
        sourceType: "audio_transcript"
      }
    })
  ].filter((doc) => doc.pageContent.trim());
}

function groupTranscriptSegments(segments, maxChars = 1200) {
  const groups = [];
  let current = [];
  let length = 0;

  for (const segment of segments) {
    if (current.length && length + segment.text.length > maxChars) {
      groups.push(current);
      current = [];
      length = 0;
    }

    current.push(segment);
    length += segment.text.length;
  }

  if (current.length) groups.push(current);

  return groups;
}

import { fetchTranscript } from "youtube-transcript";

export async function getYoutubeTranscript(videoUrl) {
    console.log(videoUrl);
  try {
    const segments = await fetchTranscript(videoUrl, {
      lang: "en",
    });

    if (!segments || segments.length === 0) {
      throw new Error("No captions available for this video.");
    }

    const fullText = segments
      .map((segment) => segment.text)
      .join(" ");

    return {
      success: true,
      source: "youtube_captions",
      language: "en",
      text: fullText,
      segments: segments.map((segment) => ({
        text: segment.text,
        start: segment.offset ?? segment.start,
        duration: segment.duration,
      })),
    };

  } catch (error) {
    console.error("YouTube transcript error:", error.message);
    throw new Error(`Failed to fetch YouTube captions: ${error.message}`);
  }
}

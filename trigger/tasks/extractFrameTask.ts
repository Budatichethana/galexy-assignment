import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { task } from "@trigger.dev/sdk";
import ffmpeg from "fluent-ffmpeg";

export type ExtractFrameTaskInput = {
  videoUrl: string;
  timestamp: number | `${number}%`;
};

export type ExtractFrameTaskOutput = {
  imageUrl: string;
};

type VideoMetadata = {
  durationSeconds: number;
};

function guessVideoExtension(contentType: string | null): string {
  if (!contentType) {
    return ".mp4";
  }

  if (contentType.includes("mp4")) return ".mp4";
  if (contentType.includes("webm")) return ".webm";
  if (contentType.includes("quicktime") || contentType.includes("mov")) return ".mov";
  if (contentType.includes("x-matroska") || contentType.includes("mkv")) return ".mkv";

  return ".mp4";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function downloadVideoToTempFile(videoUrl: string): Promise<string> {
  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const ext = guessVideoExtension(response.headers.get("content-type"));
  const inputPath = path.join(tmpdir(), `extract-frame-input-${randomUUID()}${ext}`);

  await fs.writeFile(inputPath, bytes);

  return inputPath;
}

function getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (error, metadata) => {
      if (error) {
        reject(new Error(`Failed to probe video metadata: ${error.message}`));
        return;
      }

      const durationFromFormat = metadata.format?.duration;
      const durationFromStream = metadata.streams
        .map((stream) => stream.duration)
        .find((duration) => isFiniteNumber(duration));

      const durationSeconds = durationFromFormat ?? durationFromStream;

      if (!isFiniteNumber(durationSeconds) || durationSeconds <= 0) {
        reject(new Error("Invalid video duration"));
        return;
      }

      resolve({ durationSeconds });
    });
  });
}

function parsePercentageTimestamp(timestamp: string): number {
  const match = timestamp.trim().match(/^([0-9]+(?:\.[0-9]+)?)%$/);

  if (!match) {
    throw new Error("Invalid timestamp format. Use seconds (number) or percentage (e.g. '50%')");
  }

  const percentage = Number.parseFloat(match[1]);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new Error("Percentage timestamp must be between 0% and 100%");
  }

  return percentage;
}

function resolveSeekTimeSeconds(
  timestamp: number | `${number}%`,
  durationSeconds: number,
): number {
  if (typeof timestamp === "number") {
    if (!isFiniteNumber(timestamp) || timestamp < 0) {
      throw new Error("Timestamp in seconds must be a non-negative number");
    }

    if (timestamp > durationSeconds) {
      throw new Error("Timestamp exceeds video duration");
    }

    return timestamp;
  }

  const percentage = parsePercentageTimestamp(timestamp);
  return (percentage / 100) * durationSeconds;
}

function extractFrameToTempImage(
  inputPath: string,
  seekTimeSeconds: number,
): Promise<string> {
  const outputPath = path.join(tmpdir(), `extract-frame-output-${randomUUID()}.jpg`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(seekTimeSeconds)
      .outputOptions("-frames:v", "1")
      .output(outputPath)
      .on("end", () => {
        resolve(outputPath);
      })
      .on("error", (error) => {
        reject(new Error(`FFmpeg frame extraction failed: ${error.message}`));
      })
      .run();
  });
}

async function uploadExtractedFramePlaceholder(outputPath: string): Promise<string> {
  const fileName = path.basename(outputPath);
  return `https://temp-storage.example.com/frames/${fileName}`;
}

export const extractFrameTask = task({
  id: "extract-frame-task",
  run: async (payload: ExtractFrameTaskInput): Promise<ExtractFrameTaskOutput> => {
    if (!payload.videoUrl?.trim()) {
      throw new Error("videoUrl is required");
    }

    const inputPath = await downloadVideoToTempFile(payload.videoUrl.trim());
    let outputPath: string | null = null;

    try {
      const { durationSeconds } = await getVideoMetadata(inputPath);
      const seekTimeSeconds = resolveSeekTimeSeconds(payload.timestamp, durationSeconds);

      outputPath = await extractFrameToTempImage(inputPath, seekTimeSeconds);

      const imageUrl = await uploadExtractedFramePlaceholder(outputPath);
      return { imageUrl };
    } finally {
      await Promise.allSettled([
        fs.unlink(inputPath),
        outputPath ? fs.unlink(outputPath) : Promise.resolve(),
      ]);
    }
  },
});

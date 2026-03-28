import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { task } from "@trigger.dev/sdk";
import ffmpeg from "fluent-ffmpeg";

export type CropImageTaskInput = {
  imageUrl: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
};

export type CropImageTaskOutput = {
  croppedImageUrl: string;
};

type NormalizedCrop = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function ensurePercentInRange(label: string, value: unknown): number {
  if (!isFiniteNumber(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be a number between 0 and 100`);
  }

  return value;
}

function validateAndNormalizeCrop(input: CropImageTaskInput): NormalizedCrop {
  const xPercent = ensurePercentInRange("x_percent", input.x_percent);
  const yPercent = ensurePercentInRange("y_percent", input.y_percent);
  const widthPercent = ensurePercentInRange("width_percent", input.width_percent);
  const heightPercent = ensurePercentInRange("height_percent", input.height_percent);

  if (widthPercent <= 0 || heightPercent <= 0) {
    throw new Error("width_percent and height_percent must be greater than 0");
  }

  if (xPercent + widthPercent > 100 || yPercent + heightPercent > 100) {
    throw new Error("Crop area must stay within image bounds (0-100%)");
  }

  return { xPercent, yPercent, widthPercent, heightPercent };
}

function guessExtension(contentType: string | null): string {
  if (!contentType) {
    return ".img";
  }

  if (contentType.includes("png")) {
    return ".png";
  }

  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return ".jpg";
  }

  if (contentType.includes("webp")) {
    return ".webp";
  }

  return ".img";
}

async function downloadImageToTempFile(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const ext = guessExtension(response.headers.get("content-type"));
  const inputPath = path.join(tmpdir(), `crop-input-${randomUUID()}${ext}`);

  await fs.writeFile(inputPath, bytes);

  return inputPath;
}

type ImageDimensions = {
  width: number;
  height: number;
};

function getImageDimensions(inputPath: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (error, metadata) => {
      if (error) {
        reject(new Error(`Failed to probe image metadata: ${error.message}`));
        return;
      }

      const videoStream = metadata.streams.find((stream) => stream.codec_type === "video");
      const width = videoStream?.width;
      const height = videoStream?.height;

      if (!width || !height) {
        reject(new Error("Unable to read image dimensions"));
        return;
      }

      resolve({ width, height });
    });
  });
}

function toCropPixels(crop: NormalizedCrop, dimensions: ImageDimensions) {
  const x = Math.max(0, Math.round((crop.xPercent / 100) * dimensions.width));
  const y = Math.max(0, Math.round((crop.yPercent / 100) * dimensions.height));

  let cropWidth = Math.max(
    1,
    Math.round((crop.widthPercent / 100) * dimensions.width),
  );
  let cropHeight = Math.max(
    1,
    Math.round((crop.heightPercent / 100) * dimensions.height),
  );

  if (x + cropWidth > dimensions.width) {
    cropWidth = Math.max(1, dimensions.width - x);
  }

  if (y + cropHeight > dimensions.height) {
    cropHeight = Math.max(1, dimensions.height - y);
  }

  return { x, y, cropWidth, cropHeight };
}

async function runFfmpegCrop(
  inputPath: string,
  crop: NormalizedCrop,
): Promise<string> {
  const dimensions = await getImageDimensions(inputPath);
  const { x, y, cropWidth, cropHeight } = toCropPixels(crop, dimensions);
  const outputPath = path.join(tmpdir(), `crop-output-${randomUUID()}.png`);

  const cropFilter = `crop=${cropWidth}:${cropHeight}:${x}:${y}`;

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters(cropFilter)
      .outputOptions("-frames:v", "1")
      .output(outputPath)
      .on("end", () => {
        resolve();
      })
      .on("error", (error) => {
        reject(new Error(`FFmpeg crop failed: ${error.message}`));
      })
      .run();
  });

  return outputPath;
}

async function uploadCroppedImagePlaceholder(outputPath: string): Promise<string> {
  // Placeholder only: replace with S3/Cloudinary/Blob upload and return public URL.
  const fileName = path.basename(outputPath);
  return `https://temp-storage.example.com/crops/${fileName}`;
}

export const cropImageTask = task({
  id: "crop-image-task",
  run: async (payload: CropImageTaskInput): Promise<CropImageTaskOutput> => {
    if (!payload.imageUrl?.trim()) {
      throw new Error("imageUrl is required");
    }

    // Step 1: Validate and normalize crop parameters.
    const crop = validateAndNormalizeCrop(payload);

    // Step 2: Download source image to local temp storage.
    const inputPath = await downloadImageToTempFile(payload.imageUrl.trim());
    let outputPath: string | null = null;

    try {
      // Step 3: Process image with FFmpeg and get local output path.
      outputPath = await runFfmpegCrop(inputPath, crop);

      // Step 4: Upload processed file and return URL.
      const croppedImageUrl = await uploadCroppedImagePlaceholder(outputPath);

      return { croppedImageUrl };
    } finally {
      await Promise.allSettled([
        fs.unlink(inputPath),
        outputPath ? fs.unlink(outputPath) : Promise.resolve(),
      ]);
    }
  },
});

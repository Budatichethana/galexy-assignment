import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Transloadit } from "transloadit";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

function getExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "video/mp4":
      return ".mp4";
    case "video/quicktime":
      return ".mov";
    case "video/webm":
      return ".webm";
    default:
      return "";
  }
}

type AssemblyResultItem = {
  ssl_url?: string | null;
};

function pickResultUrl(results: Record<string, AssemblyResultItem[]> | undefined): string | null {
  const originalResults = results?.[":original"];
  if (!originalResults || originalResults.length === 0) {
    return null;
  }

  return originalResults[0]?.ssl_url ?? null;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const mimeType = file.type;
    const isSupported = IMAGE_TYPES.has(mimeType) || VIDEO_TYPES.has(mimeType);

    if (!isSupported) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 },
      );
    }

    const extension = getExtension(mimeType);
    if (!extension) {
      return NextResponse.json({ error: "Unsupported file extension" }, { status: 400 });
    }

    const authKey = process.env.TRANSLOADIT_KEY;
    const authSecret = process.env.TRANSLOADIT_SECRET;
    const templateId = process.env.TRANSLOADIT_TEMPLATE_ID;

    if (!authKey || !authSecret || !templateId) {
      return NextResponse.json(
        { error: "Transloadit environment variables are not configured" },
        { status: 500 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadKey = `${file.name || "upload"}${extension}`;

    const client = new Transloadit({
      authKey,
      authSecret,
    });

    const assembly = await client.createAssembly({
      uploads: {
        [uploadKey]: buffer,
      },
      params: {
        template_id: templateId,
      },
      waitForCompletion: true,
    });

    if (assembly.error || assembly.ok !== "ASSEMBLY_COMPLETED") {
      const reason =
        assembly.error
        || assembly.message
        || "Transloadit assembly did not complete";
      return NextResponse.json({ error: reason }, { status: 500 });
    }

    const url = pickResultUrl(
      assembly.results as Record<string, AssemblyResultItem[]> | undefined,
    );

    if (!url) {
      return NextResponse.json(
        { error: "No uploaded file URL found in assembly.results[:original][0].ssl_url" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

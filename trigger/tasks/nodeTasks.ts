import { task } from "@trigger.dev/sdk";
import {
  NODE_TASK_IDS,
  type NodeExecutionPayload,
  type NodeTaskOutput,
} from "../../src/lib/triggerTasks";

function toAbsoluteImageUrl(imageUrl: string): string | null {
  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Resolve local relative URLs when app base URL is available.
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL
    || process.env.APP_BASE_URL
    || process.env.VERCEL_URL;

  if (!appBaseUrl) {
    return null;
  }

  const normalizedBase = appBaseUrl.startsWith("http")
    ? appBaseUrl
    : `https://${appBaseUrl}`;

  return new URL(trimmed, normalizedBase).toString();
}

function buildBaseInput(payload: NodeExecutionPayload) {
  const combinedInputs = [
    ...payload.chainedInputs,
    payload.manualInput?.trim() || "",
  ].filter(Boolean);

  return combinedInputs.join(", ") || payload.label || "manual input";
}

export const textNodeTask = task({
  id: NODE_TASK_IDS.text,
  run: async (payload: NodeExecutionPayload): Promise<NodeTaskOutput> => {
    const input = buildBaseInput(payload);
    return { output: `Text: ${input}` };
  },
});

export const imageNodeTask = task({
  id: NODE_TASK_IDS.image,
  run: async (payload: NodeExecutionPayload): Promise<NodeTaskOutput> => {
    const imageUrl = payload.images?.[0]?.trim() || payload.manualInput?.trim();

    if (!imageUrl) {
      throw new Error("Image node requires an uploaded image URL");
    }

    return { output: imageUrl };
  },
});

export const videoNodeTask = task({
  id: NODE_TASK_IDS.video,
  run: async (payload: NodeExecutionPayload): Promise<NodeTaskOutput> => {
    const videoUrl = payload.video?.trim() || payload.manualInput?.trim();

    if (!videoUrl) {
      throw new Error("Video node requires an uploaded video URL");
    }

    return { output: videoUrl };
  },
});

export const cropNodeTask = task({
  id: NODE_TASK_IDS.crop,
  run: async (payload: NodeExecutionPayload): Promise<NodeTaskOutput> => {
    const input = buildBaseInput(payload);
    return { output: `Crop mock processed: ${input}` };
  },
});

export const frameNodeTask = task({
  id: NODE_TASK_IDS.frame,
  run: async (payload: NodeExecutionPayload): Promise<NodeTaskOutput> => {
    const input = buildBaseInput(payload);
    return { output: `Frame mock processed: ${input}` };
  },
});

export const llmNodeTask = task({
  id: NODE_TASK_IDS.llm,
  run: async (payload: NodeExecutionPayload): Promise<NodeTaskOutput> => {
    const apiKey = process.env.GROQ_API_KEY;
    const textModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const visionModel = process.env.GROQ_VISION_MODEL || textModel;

    const chainedText = payload.chainedInputs.join("\n");
    const userPrompt = payload.userMessage?.trim() || payload.manualInput?.trim() || chainedText || "Give a concise response";
    const systemPrompt = payload.systemPrompt?.trim() || "You are a helpful assistant.";
    const imageUrls = (payload.images ?? [])
      .map(toAbsoluteImageUrl)
      .filter((value): value is string => Boolean(value));
    const hasImages = imageUrls.length > 0;

    if (!apiKey) {
      return {
        output: hasImages
          ? `LLM mock multimodal response: ${userPrompt}`
          : `LLM mock response: ${userPrompt}`,
      };
    }

    const textContent = [
      chainedText ? `Upstream Inputs:\n${chainedText}` : "",
      `Prompt:\n${userPrompt}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const userMessageContent = hasImages
      ? [
          { type: "text", text: textContent },
          ...imageUrls.map((url) => ({
            type: "image_url",
            image_url: { url },
          })),
        ]
      : textContent;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: hasImages ? visionModel : textModel,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userMessageContent,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq request failed: ${errorText}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const output = json.choices?.[0]?.message?.content?.trim() || "No response";

    return { output };
  },
});

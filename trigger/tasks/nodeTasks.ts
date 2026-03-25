import { task } from "@trigger.dev/sdk";
import {
  NODE_TASK_IDS,
  type NodeExecutionPayload,
  type NodeTaskOutput,
} from "../../src/lib/triggerTasks";

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
    const input = buildBaseInput(payload);
    return { output: `Image mock processed: ${input}` };
  },
});

export const videoNodeTask = task({
  id: NODE_TASK_IDS.video,
  run: async (payload: NodeExecutionPayload): Promise<NodeTaskOutput> => {
    const input = buildBaseInput(payload);
    return { output: `Video mock processed: ${input}` };
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
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const chainedText = payload.chainedInputs.join("\n");
    const userPrompt = payload.userMessage?.trim() || payload.manualInput?.trim() || chainedText || "Give a concise response";
    const systemPrompt = payload.systemPrompt?.trim() || "You are a helpful assistant.";

    if (!apiKey) {
      return {
        output: `LLM mock response: ${userPrompt}`,
      };
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: [
                chainedText ? `Upstream Inputs:\n${chainedText}` : "",
                `Prompt:\n${userPrompt}`,
              ]
                .filter(Boolean)
                .join("\n\n"),
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

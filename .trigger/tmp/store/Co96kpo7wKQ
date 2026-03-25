import {
  task
} from "../../chunk-RYRROL4P.mjs";
import "../../chunk-APURKYSJ.mjs";
import "../../chunk-ZYL3UHFR.mjs";
import "../../chunk-USHNXJ63.mjs";
import "../../chunk-IB4V73K4.mjs";
import {
  __name,
  init_esm
} from "../../chunk-244PAGAH.mjs";

// trigger/tasks/nodeTasks.ts
init_esm();

// src/lib/triggerTasks.ts
init_esm();
var NODE_TASK_IDS = {
  text: "text-node-task",
  image: "image-node-task",
  video: "video-node-task",
  llm: "llm-node-task",
  crop: "crop-node-task",
  frame: "frame-node-task"
};

// trigger/tasks/nodeTasks.ts
function buildBaseInput(payload) {
  const combinedInputs = [
    ...payload.chainedInputs,
    payload.manualInput?.trim() || ""
  ].filter(Boolean);
  return combinedInputs.join(", ") || payload.label || "manual input";
}
__name(buildBaseInput, "buildBaseInput");
var textNodeTask = task({
  id: NODE_TASK_IDS.text,
  run: /* @__PURE__ */ __name(async (payload) => {
    const input = buildBaseInput(payload);
    return { output: `Text: ${input}` };
  }, "run")
});
var imageNodeTask = task({
  id: NODE_TASK_IDS.image,
  run: /* @__PURE__ */ __name(async (payload) => {
    const input = buildBaseInput(payload);
    return { output: `Image mock processed: ${input}` };
  }, "run")
});
var videoNodeTask = task({
  id: NODE_TASK_IDS.video,
  run: /* @__PURE__ */ __name(async (payload) => {
    const input = buildBaseInput(payload);
    return { output: `Video mock processed: ${input}` };
  }, "run")
});
var cropNodeTask = task({
  id: NODE_TASK_IDS.crop,
  run: /* @__PURE__ */ __name(async (payload) => {
    const input = buildBaseInput(payload);
    return { output: `Crop mock processed: ${input}` };
  }, "run")
});
var frameNodeTask = task({
  id: NODE_TASK_IDS.frame,
  run: /* @__PURE__ */ __name(async (payload) => {
    const input = buildBaseInput(payload);
    return { output: `Frame mock processed: ${input}` };
  }, "run")
});
var llmNodeTask = task({
  id: NODE_TASK_IDS.llm,
  run: /* @__PURE__ */ __name(async (payload) => {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const chainedText = payload.chainedInputs.join("\n");
    const userPrompt = payload.userMessage?.trim() || payload.manualInput?.trim() || chainedText || "Give a concise response";
    const systemPrompt = payload.systemPrompt?.trim() || "You are a helpful assistant.";
    if (!apiKey) {
      return {
        output: `LLM mock response: ${userPrompt}`
      };
    }
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: [
                chainedText ? `Upstream Inputs:
${chainedText}` : "",
                `Prompt:
${userPrompt}`
              ].filter(Boolean).join("\n\n")
            }
          ]
        })
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq request failed: ${errorText}`);
    }
    const json = await response.json();
    const output = json.choices?.[0]?.message?.content?.trim() || "No response";
    return { output };
  }, "run")
});
export {
  cropNodeTask,
  frameNodeTask,
  imageNodeTask,
  llmNodeTask,
  textNodeTask,
  videoNodeTask
};
//# sourceMappingURL=nodeTasks.mjs.map

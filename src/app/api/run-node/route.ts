import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";
import { runs } from "@trigger.dev/sdk/v3";
import {
  NODE_TASK_IDS,
  type NodeExecutionPayload,
  type WorkflowNodeType,
} from "@/lib/triggerTasks";

type CropConfig = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type RunNodeInputs = {
  chainedInputs?: string[];
  systemPrompt?: string;
  userMessage?: string;
  images?: string[];
  video?: string;
  cropConfig?: CropConfig;
  timestamp?: number | `${number}%`;
  manualInput?: string;
  label?: string;
};

type RunNodeRequest = {
  nodeId?: string;
  nodeType?: WorkflowNodeType;
  inputs?: RunNodeInputs;
};

type NodeOutputType = "text" | "image" | "video";

function isWorkflowNodeType(value: unknown): value is WorkflowNodeType {
  return (
    value === "text"
    || value === "image"
    || value === "video"
    || value === "llm"
    || value === "crop"
    || value === "frame"
  );
}

function getOutputTypeForNodeType(nodeType: WorkflowNodeType): NodeOutputType {
  switch (nodeType) {
    case "text":
    case "llm":
      return "text";
    case "image":
    case "crop":
    case "frame":
      return "image";
    case "video":
      return "video";
    default:
      return "text";
  }
}

function buildGenericPayload(payload: RunNodeRequest): NodeExecutionPayload {
  const nodeType = payload.nodeType as WorkflowNodeType;
  const inputs = payload.inputs ?? {};

  return {
    nodeId: payload.nodeId || "unknown-node",
    nodeType,
    label: inputs.label,
    manualInput: inputs.manualInput,
    chainedInputs: inputs.chainedInputs ?? [],
    systemPrompt: inputs.systemPrompt,
    userMessage: inputs.userMessage,
    images: inputs.images,
    video: inputs.video,
  };
}

async function triggerNodeTask(payload: RunNodeRequest) {
  const nodeType = payload.nodeType as WorkflowNodeType;
  const inputs = payload.inputs ?? {};

  switch (nodeType) {
    case "text":
      return tasks.trigger(NODE_TASK_IDS.text, buildGenericPayload(payload));
    case "image":
      return tasks.trigger(NODE_TASK_IDS.image, buildGenericPayload(payload));
    case "video":
      return tasks.trigger(NODE_TASK_IDS.video, buildGenericPayload(payload));
    case "llm":
      return tasks.trigger(NODE_TASK_IDS.llm, buildGenericPayload(payload));
    case "crop": {
      const imageUrl = inputs.images?.[0]?.trim();
      const cropConfig = inputs.cropConfig;

      if (!imageUrl || !cropConfig) {
        throw new Error("Crop node requires images[0] and cropConfig");
      }

      return tasks.trigger("crop-image-task", {
        imageUrl,
        x_percent: cropConfig.xPercent,
        y_percent: cropConfig.yPercent,
        width_percent: cropConfig.widthPercent,
        height_percent: cropConfig.heightPercent,
      });
    }
    case "frame": {
      const videoUrl = inputs.video?.trim();
      const timestamp = inputs.timestamp;

      if (!videoUrl || timestamp === undefined) {
        throw new Error("Frame node requires video and timestamp");
      }

      return tasks.trigger("extract-frame-task", {
        videoUrl,
        timestamp,
      });
    }
    default:
      throw new Error(`Unsupported node type: ${String(nodeType)}`);
  }
};

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const payload = (await request.json()) as RunNodeRequest;

    if (!payload.nodeId || !isWorkflowNodeType(payload.nodeType)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const handle = await triggerNodeTask(payload);

    const result = await runs.poll(handle.id);

    if (!result.isSuccess) {
      const errorMessage = result.error?.message ?? "Task failed";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const taskOutput = result.output as
      | { output?: string; croppedImageUrl?: string; imageUrl?: string }
      | undefined;

    const output = taskOutput?.output
      || taskOutput?.croppedImageUrl
      || taskOutput?.imageUrl
      || "No output";
    const type = getOutputTypeForNodeType(payload.nodeType);

    return NextResponse.json({
      output,
      type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

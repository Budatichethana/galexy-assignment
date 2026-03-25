import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";
import { runs } from "@trigger.dev/sdk/v3";
import { NODE_TASK_IDS } from "@/lib/triggerTasks";

type RunNodeRequest = {
  prompt?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RunNodeRequest;
    const prompt = payload.prompt?.trim();

    if (!prompt) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const handle = await tasks.trigger(NODE_TASK_IDS.llm, {
      nodeId: "api-llm",
      nodeType: "llm",
      chainedInputs: [],
      manualInput: prompt,
      userMessage: prompt,
    });

    const result = await runs.poll(handle.id);

    if (!result.isSuccess) {
      const errorMessage = result.error?.message ?? "Task failed";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const taskOutput = result.output as { output?: string } | undefined;
    const output = taskOutput?.output || "No output";

    return NextResponse.json({
      output,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

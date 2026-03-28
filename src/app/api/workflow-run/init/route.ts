import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  initializeWorkflowRun,
} from "@/lib/executionLogger";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    console.log("Auth userId:", userId);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      workflowId?: string;
    };

    if (!body.workflowId) {
      return NextResponse.json(
        { error: "workflowId is required" },
        { status: 400 },
      );
    }

    const run = await initializeWorkflowRun(body.workflowId, userId);

    return NextResponse.json({ runId: run.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initialize workflow run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

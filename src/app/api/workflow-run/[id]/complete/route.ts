import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  completeWorkflowRun,
} from "@/lib/executionLogger";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: "success" | "failed";
    };

    if (!id) {
      return NextResponse.json({ error: "Run ID is required" }, { status: 400 });
    }

    const status = body.status || "success";
    const run = await completeWorkflowRun(id, userId, status);

    return NextResponse.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete workflow run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

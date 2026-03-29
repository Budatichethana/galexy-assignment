import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getWorkflowRuns,
} from "@/lib/executionLogger";
import { formatPrismaError } from "@/lib/prismaRetry";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authState = await auth();
    const userId = authState.userId?.trim();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const workflowId = id?.trim();

    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID is required" }, { status: 400 });
    }

    const runs = await getWorkflowRuns(workflowId, userId);

    return NextResponse.json({ runs });
  } catch (error) {
    const message = formatPrismaError(error) || "Failed to fetch workflow runs";
    const status = /required|invalid/i.test(message) ? 400 : 500;

    console.error("[WorkflowRuns API] GET failed", {
      message,
      error,
    });

    return NextResponse.json({ error: message }, { status });
  }
}

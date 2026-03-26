import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getWorkflowRuns,
} from "@/lib/executionLogger";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Workflow ID is required" }, { status: 400 });
    }

    const runs = await getWorkflowRuns(id, userId);

    return NextResponse.json({ runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch workflow runs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

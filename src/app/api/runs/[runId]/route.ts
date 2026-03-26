import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getRunDetails,
} from "@/lib/executionLogger";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { runId } = await context.params;

    if (!runId) {
      return NextResponse.json({ error: "Run ID is required" }, { status: 400 });
    }

    const run = await getRunDetails(runId, userId);

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch run details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

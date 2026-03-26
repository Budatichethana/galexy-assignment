import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  initializeNodeRun,
} from "@/lib/executionLogger";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = (await request.json()) as {
      runId?: string;
      nodeId?: string;
      nodeType?: string;
      input?: unknown;
    };

    if (!body.runId || !body.nodeId || !body.nodeType) {
      return NextResponse.json(
        { error: "runId, nodeId, and nodeType are required" },
        { status: 400 },
      );
    }

    const nodeRun = await initializeNodeRun(
      body.runId,
      body.nodeId,
      body.nodeType,
      body.input,
    );

    return NextResponse.json({ nodeRunId: nodeRun.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initialize node run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

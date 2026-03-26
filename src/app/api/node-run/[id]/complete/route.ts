import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  completeNodeRun,
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
      output?: unknown;
    };

    if (!id) {
      return NextResponse.json({ error: "Node run ID is required" }, { status: 400 });
    }

    const nodeRun = await completeNodeRun(id, body.output);

    return NextResponse.json(nodeRun);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete node run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

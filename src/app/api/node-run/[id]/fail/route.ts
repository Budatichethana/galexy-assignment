import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  failNodeRun,
} from "@/lib/executionLogger";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    console.log("Auth userId:", userId);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      error?: string;
    };

    if (!id) {
      return NextResponse.json({ error: "Node run ID is required" }, { status: 400 });
    }

    const errorMessage = body.error || "Unknown error";
    const nodeRun = await failNodeRun(id, errorMessage);

    return NextResponse.json(nodeRun);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fail node run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

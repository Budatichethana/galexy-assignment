import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = (await request.json()) as {
      nodes?: unknown;
      edges?: unknown;
      name?: string;
    };

    if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
      return NextResponse.json(
        { error: "nodes and edges must be arrays" },
        { status: 400 },
      );
    }

    // Using random string ID, matching DB schema
    const id = crypto.randomUUID();

    const workflow = await prisma.workflow.create({
      data: {
        id,
        userId,
        name: body.name || "Untitled Workflow",
        nodes: body.nodes as any,
        edges: body.edges as any,
      },
    });

    return NextResponse.json({ workflowId: workflow.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save workflow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

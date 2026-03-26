import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

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
      return NextResponse.json({ error: "workflow id is required" }, { status: 400 });
    }

    const workflow = await prisma.workflow.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!workflow) {
      return NextResponse.json({ error: "workflow not found" }, { status: 404 });
    }

    return NextResponse.json(workflow);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch workflow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "workflow id is required" }, { status: 400 });
    }

    const body = await request.json();
    const { nodes, edges, name } = body;

    const workflow = await prisma.workflow.updateMany({
      where: {
        id,
        userId,
      },
      data: {
        ...(nodes !== undefined && { nodes: nodes as any }),
        ...(edges !== undefined && { edges: edges as any }),
        ...(name !== undefined && { name }),
      },
    });

    if (workflow.count === 0) {
      return NextResponse.json({ error: "workflow not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update workflow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

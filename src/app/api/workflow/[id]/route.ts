import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { formatPrismaError, withPrismaRetry } from "@/lib/prismaRetry";

function maskIdentifier(value: string | null | undefined): string {
  if (!value) {
    return "missing";
  }

  if (value.length <= 8) {
    return "***";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

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
    const authState = await auth();
    const userId = authState.userId;

    console.log("[Workflow API] PATCH auth check", {
      hasUserId: Boolean(userId),
      userId: maskIdentifier(userId),
    });

    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      console.warn("[Workflow API] PATCH unauthorized - missing userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workflowId } = await context.params;

    console.log("[Workflow API] PATCH params", {
      workflowId: maskIdentifier(workflowId),
      hasWorkflowId: Boolean(workflowId),
    });

    if (!workflowId) {
      return NextResponse.json({ error: "workflow id is required" }, { status: 400 });
    }

    const body = await request.json();
    const { nodes, edges, name } = body;

    if (nodes !== undefined && !Array.isArray(nodes)) {
      return NextResponse.json({ error: "nodes must be an array" }, { status: 400 });
    }

    if (edges !== undefined && !Array.isArray(edges)) {
      return NextResponse.json({ error: "edges must be an array" }, { status: 400 });
    }

    const existingWorkflow = await withPrismaRetry(() =>
      prisma.workflow.findUnique({
        where: {
          id: workflowId,
        },
        select: {
          id: true,
          userId: true,
        },
      }),
    );

    console.log("[Workflow API] PATCH workflow lookup", {
      found: Boolean(existingWorkflow),
      workflowOwner: maskIdentifier(existingWorkflow?.userId),
      requester: maskIdentifier(userId),
    });

    if (!existingWorkflow || existingWorkflow.userId !== userId) {
      return NextResponse.json({ error: "workflow not found or unauthorized" }, { status: 404 });
    }

    await withPrismaRetry(() =>
      prisma.workflow.update({
        where: {
          id: workflowId,
        },
        data: {
          ...(nodes !== undefined && { nodes: nodes as any }),
          ...(edges !== undefined && { edges: edges as any }),
          ...(name !== undefined && { name }),
          updatedAt: new Date(),
        },
      }),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = formatPrismaError(error) || "Failed to update workflow";
    console.error("[Workflow API] PATCH failed", {
      message,
      error,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

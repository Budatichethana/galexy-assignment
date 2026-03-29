import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { formatPrismaError, withPrismaRetry } from "@/lib/prismaRetry";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;
    const workflowId = id?.trim();

    if (!workflowId) {
      return NextResponse.json({ error: "workflow id is required" }, { status: 400 });
    }

    const existingWorkflow = await withPrismaRetry(() =>
      prisma.workflow.findUnique({
        where: { id: workflowId },
        select: { id: true, userId: true },
      }),
    );

    if (!existingWorkflow) {
      return NextResponse.json({ error: "workflow not found" }, { status: 404 });
    }

    if (existingWorkflow.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const deletionResult = await withPrismaRetry(() =>
      prisma.$transaction(async (tx) => {
        // Safe manual cleanup first; cascade also protects against orphans.
        const removedNodeRuns = await tx.nodeRun.deleteMany({
          where: {
            run: {
              workflowId,
              userId,
            },
          },
        });

        const removedWorkflowRuns = await tx.workflowRun.deleteMany({
          where: {
            workflowId,
            userId,
          },
        });

        const removedWorkflow = await tx.workflow.deleteMany({
          where: {
            id: workflowId,
            userId,
          },
        });

        return {
          removedNodeRuns: removedNodeRuns.count,
          removedWorkflowRuns: removedWorkflowRuns.count,
          removedWorkflow: removedWorkflow.count,
        };
      }),
    );

    if (deletionResult.removedWorkflow === 0) {
      return NextResponse.json({ error: "workflow not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deleted: {
        workflowId,
        workflow: deletionResult.removedWorkflow,
        workflowRuns: deletionResult.removedWorkflowRuns,
        nodeRuns: deletionResult.removedNodeRuns,
      },
    });
  } catch (error) {
    const message = formatPrismaError(error) || "Failed to delete workflow";

    console.error("[Workflows API] DELETE failed", {
      message,
      error,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import prisma from "./prisma";
import { formatPrismaError, withPrismaRetry } from "./prismaRetry";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Initialize a new workflow run
 * Called when workflow execution starts
 */
export async function initializeWorkflowRun(workflowId: string, userId: string) {
  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      userId,
      status: "running",
    },
  });
  return run;
}

/**
 * Initialize a node run
 * Called before node execution
 */
export async function initializeNodeRun(
  runId: string,
  nodeId: string,
  nodeType: string,
  input: unknown,
) {
  const nodeRun = await prisma.nodeRun.create({
    data: {
      runId,
      nodeId,
      nodeType,
      status: "running",
      input: input as unknown as any,
    },
  });
  return nodeRun;
}

/**
 * Mark node as completed successfully
 */
export async function completeNodeRun(
  nodeRunId: string,
  output: unknown,
) {
  const nodeRun = await prisma.nodeRun.update({
    where: { id: nodeRunId },
    data: {
      status: "success",
      output: output as unknown as any,
      completedAt: new Date(),
    },
  });
  return nodeRun;
}

/**
 * Mark node as failed
 */
export async function failNodeRun(
  nodeRunId: string,
  error: string,
) {
  const nodeRun = await prisma.nodeRun.update({
    where: { id: nodeRunId },
    data: {
      status: "failed",
      error,
      completedAt: new Date(),
    },
  });
  return nodeRun;
}

/**
 * Complete workflow run
 */
export async function completeWorkflowRun(
  runId: string,
  userId: string,
  status: "success" | "failed",
) {
  const run = await prisma.workflowRun.updateMany({
    where: { id: runId, userId },
    data: {
      status,
      completedAt: new Date(),
    },
  });
  return run;
}

/**
 * Get all runs for a workflow
 */
export async function getWorkflowRuns(workflowId: string, userId: string) {
  const normalizedWorkflowId = workflowId?.trim();
  const normalizedUserId = userId?.trim();

  if (!normalizedWorkflowId) {
    throw new Error("workflowId is required");
  }

  if (!normalizedUserId) {
    throw new Error("userId is required");
  }

  const maxConsistencyRetries = 2;
  const consistencyDelayMs = 150;

  try {
    for (let attempt = 0; attempt <= maxConsistencyRetries; attempt += 1) {
      const runs = await withPrismaRetry(() =>
        prisma.workflowRun.findMany({
          where: { workflowId: normalizedWorkflowId, userId: normalizedUserId },
          include: {
            nodeRuns: {
              orderBy: { startedAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
      );

      if (runs.length > 0 || attempt === maxConsistencyRetries) {
        return runs;
      }

      // Workflow runs may be created immediately before this read; retry briefly to avoid racey empty reads.
      await sleep(consistencyDelayMs);
    }

    return [];
  } catch (error) {
    console.error("[ExecutionLogger] getWorkflowRuns failed", {
      workflowId: normalizedWorkflowId,
      userId: normalizedUserId,
      error,
      message: formatPrismaError(error),
    });
    throw error;
  }
}

/**
 * Get run details with all node runs
 */
export async function getRunDetails(runId: string, userId: string) {
  const run = await prisma.workflowRun.findFirst({
    where: { id: runId, userId },
    include: {
      nodeRuns: {
        orderBy: { startedAt: "asc" },
      },
    },
  });
  return run;
}

import prisma from "./prisma";

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
  const runs = await prisma.workflowRun.findMany({
    where: { workflowId, userId },
    include: {
      nodeRuns: {
        orderBy: { startedAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return runs;
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

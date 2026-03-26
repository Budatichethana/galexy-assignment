import { randomUUID } from "node:crypto";
import { Pool } from "pg";

type WorkflowRecord = {
  id: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var workflowPool: any;
}

function getPool(): any {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!global.workflowPool) {
    global.workflowPool = new Pool({ connectionString: databaseUrl });
  }

  return global.workflowPool;
}

let tableReadyPromise: Promise<void> | null = null;

async function ensureTableReady() {
  if (!tableReadyPromise) {
    tableReadyPromise = getPool()
      .query(`
        CREATE TABLE IF NOT EXISTS workflows (
          id text PRIMARY KEY,
          nodes jsonb NOT NULL,
          edges jsonb NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `)
      .then(() => undefined);
  }

  await tableReadyPromise;
}

export async function saveWorkflow(nodes: unknown[], edges: unknown[]) {
  await ensureTableReady();

  const id = randomUUID();
  await getPool().query(
    `
      INSERT INTO workflows (id, nodes, edges)
      VALUES ($1, $2::jsonb, $3::jsonb)
    `,
    [id, JSON.stringify(nodes), JSON.stringify(edges)],
  );

  return { id };
}

export async function getWorkflowById(id: string): Promise<WorkflowRecord | null> {
  await ensureTableReady();

  const result = await getPool().query(
    `
      SELECT id, nodes, edges, created_at
      FROM workflows
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as {
    id: string;
    nodes: unknown[];
    edges: unknown[];
    created_at: Date;
  };
  return {
    id: row.id,
    nodes: row.nodes,
    edges: row.edges,
    createdAt: row.created_at.toISOString(),
  };
}

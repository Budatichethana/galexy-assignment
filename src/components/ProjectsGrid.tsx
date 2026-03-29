"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Workflow = {
  id: string;
  name: string;
  updatedAt: string;
};

const FETCH_RETRY_DELAYS_MS = [350, 800, 1500];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWorkflowsWithRetry(): Promise<Workflow[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= FETCH_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch("/api/workflows", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.status}`);
      }

      const data = (await response.json()) as { workflows?: Workflow[] };
      return data.workflows || [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Failed to fetch workflows");

      if (attempt === FETCH_RETRY_DELAYS_MS.length) {
        throw lastError;
      }

      await sleep(FETCH_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError ?? new Error("Failed to fetch workflows");
}

const previewGradients = [
  "bg-[linear-gradient(135deg,#d9d9d9_0%,#6a6f78_44%,#111318_100%)]",
  "bg-[linear-gradient(135deg,#d6ae6b_0%,#8d6234_48%,#1b130f_100%)]",
  "bg-[linear-gradient(135deg,#6e9cc6_0%,#395a7f_50%,#0d1420_100%)]",
];

function formatUpdatedAt(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString();
}

function BaseCard({
  children,
  onClick,
  className,
  isLoading,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  isLoading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`group w-full rounded-lg border border-white/10 bg-zinc-900/55 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-zinc-800/70 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] disabled:opacity-60 disabled:cursor-not-allowed ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function ProjectsGrid() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null);

  const refreshWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const workflowsData = await fetchWorkflowsWithRetry();
      setWorkflows(workflowsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch workflows";
      setError(message);
      console.error("Error fetching workflows:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch workflows on mount
  useEffect(() => {
    void refreshWorkflows();
  }, [refreshWorkflows]);

  const handleCreateWorkflow = () => {
    router.push("/builder?new=1");
  };

  const handleOpenWorkflow = (workflowId: string) => {
    router.push(`/builder?workflowId=${workflowId}`);
  };

  const handleDeleteWorkflow = useCallback(
    async (event: React.MouseEvent, workflowId: string) => {
      event.stopPropagation();
      setActionError(null);

      const shouldDelete = window.confirm(
        "Are you sure you want to delete this workflow? This action cannot be undone.",
      );

      if (!shouldDelete) {
        return;
      }

      const previousWorkflows = workflows;
      setDeletingWorkflowId(workflowId);
      setWorkflows((currentWorkflows) =>
        currentWorkflows.filter((workflow) => workflow.id !== workflowId),
      );

      try {
        const response = await fetch(`/api/workflows/${encodeURIComponent(workflowId)}`, {
          method: "DELETE",
        });

        const payload = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Failed to delete workflow");
        }
      } catch (deleteError) {
        setWorkflows(previousWorkflows);
        const message =
          deleteError instanceof Error ? deleteError.message : "Failed to delete workflow";
        setActionError(message);
      } finally {
        setDeletingWorkflowId(null);
      }
    },
    [workflows],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/10 bg-zinc-900/55 p-3 animate-pulse"
          >
            <div className="mb-3 aspect-[16/10] rounded-lg bg-white/5" />
            <div className="h-4 bg-white/10 rounded mb-2" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-sm text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs bg-red-500/20 hover:bg-red-500/30 px-3 py-2 rounded transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (workflows.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        <BaseCard
          onClick={handleCreateWorkflow}
          className="border-dashed border-zinc-600/60 bg-zinc-900/40 hover:border-zinc-400/70 hover:bg-zinc-800/60"
        >
          <div className="mb-3 flex aspect-[16/10] w-full items-center justify-center rounded-lg border border-dashed border-zinc-500/60 bg-gradient-to-br from-zinc-700/10 to-zinc-900/60">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg text-zinc-900">
              +
            </span>
          </div>
          <p className="text-base font-semibold leading-tight text-zinc-100">New Workflow</p>
          <p className="mt-0.5 text-xs text-zinc-400">Start from scratch</p>
        </BaseCard>

        <div className="col-span-1 lg:col-span-2 xl:col-span-3 rounded-lg border border-white/5 bg-zinc-900/30 p-6 flex flex-col items-center justify-center min-h-[200px]">
          <p className="text-sm text-zinc-400 mb-4">No workflows yet</p>
          <button
            onClick={handleCreateWorkflow}
            className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Create Your First Workflow
          </button>
        </div>
      </div>
    );
  }

  // Normal state with workflows
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {actionError ? (
        <div className="col-span-full rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {actionError}
        </div>
      ) : null}

      <BaseCard
        onClick={handleCreateWorkflow}
        className="border-dashed border-zinc-600/60 bg-zinc-900/40 hover:border-zinc-400/70 hover:bg-zinc-800/60"
      >
        <div className="mb-3 flex aspect-[16/10] w-full items-center justify-center rounded-lg border border-dashed border-zinc-500/60 bg-gradient-to-br from-zinc-700/10 to-zinc-900/60">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg text-zinc-900">
            +
          </span>
        </div>
        <p className="text-base font-semibold leading-tight text-zinc-100">New Workflow</p>
        <p className="mt-0.5 text-xs text-zinc-400">Start from scratch</p>
      </BaseCard>

      {workflows.map((workflow, index) => {
        const isDeleting = deletingWorkflowId === workflow.id;

        return (
          <div
            key={workflow.id}
            className="group relative w-full rounded-lg border border-white/10 bg-zinc-900/55 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-zinc-800/70 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
          >
            <button
              type="button"
              onClick={() => handleOpenWorkflow(workflow.id)}
              disabled={isDeleting}
              className="w-full text-left disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div
                className={`mb-3 aspect-[16/10] rounded-lg border border-white/10 ${previewGradients[index % previewGradients.length]}`}
              />
              <p className="text-base font-semibold leading-tight text-zinc-100">{workflow.name}</p>
              <p className="mt-0.5 text-xs text-zinc-400">Updated {formatUpdatedAt(workflow.updatedAt)}</p>
            </button>

            <button
              type="button"
              onClick={(event) => void handleDeleteWorkflow(event, workflow.id)}
              disabled={isDeleting}
              className="absolute right-2 top-2 rounded-md border border-rose-300/20 bg-black/35 px-2 py-1 text-[11px] font-medium text-rose-200 transition-colors hover:border-rose-300/40 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

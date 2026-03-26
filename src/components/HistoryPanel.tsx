import { useState, useEffect } from "react";

interface NodeRun {
  id: string;
  nodeId: string;
  nodeType: string;
  status: string;
  input: unknown;
  output: unknown;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  nodeRuns?: NodeRun[];
}

interface HistoryPanelProps {
  workflowId: string;
}

export function HistoryPanel({ workflowId }: HistoryPanelProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch runs
  useEffect(() => {
    if (!workflowId) return;

    const fetchRuns = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/workflows/${encodeURIComponent(workflowId)}/runs`,
        );
        const data = (await response.json()) as { runs?: WorkflowRun[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch runs");
        }

        setRuns(data.runs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch runs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRuns();
  }, [workflowId]);

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    return duration.toFixed(2);
  };

  return (
    <div className="absolute right-4 bottom-4 z-20 w-96 max-h-96 flex flex-col rounded-2xl border border-white/15 bg-black/55 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold tracking-wide text-zinc-100">
          Execution History
        </p>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-red-400">{error}</div>
      )}

      {isLoading && (
        <div className="px-4 py-4 text-center text-xs text-zinc-400">
          Loading...
        </div>
      )}

      {!isLoading && !selectedRun && (
        <div className="flex-1 overflow-y-auto">
          {runs.length === 0 ? (
            <div className="px-4 py-4 text-center text-xs text-zinc-400">
              No runs yet
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-cyan-300 truncate">
                      {run.id.substring(0, 8)}...
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        run.status === "success"
                          ? "bg-green-500/20 text-green-300"
                          : run.status === "failed"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-yellow-500/20 text-yellow-300"
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {formatDuration(run.startedAt, run.completedAt)}s
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && selectedRun && (
        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => setSelectedRun(null)}
            className="w-full px-4 py-2 text-left text-xs text-cyan-300 hover:bg-white/10"
          >
            ← Back to runs
          </button>

          <div className="px-4 py-3 border-b border-white/10">
            <div className="text-xs text-zinc-400 mb-2">
              Run: {selectedRun.id.substring(0, 8)}
            </div>
            <div className="text-xs text-zinc-300">
              Status:{" "}
              <span
                className={
                  selectedRun.status === "success"
                    ? "text-green-300"
                    : "text-red-300"
                }
              >
                {selectedRun.status}
              </span>
            </div>
            <div className="text-xs text-zinc-300">
              Duration:{" "}
              {formatDuration(
                selectedRun.startedAt,
                selectedRun.completedAt,
              )}
              s
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {selectedRun.nodeRuns?.map((nodeRun) => (
              <div key={nodeRun.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-cyan-200">
                    Node {nodeRun.nodeId}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {nodeRun.nodeType}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      nodeRun.status === "success"
                        ? "bg-green-500/20 text-green-300"
                        : nodeRun.status === "failed"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-yellow-500/20 text-yellow-300"
                    }`}
                  >
                    {nodeRun.status}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {formatDuration(
                      nodeRun.startedAt,
                      nodeRun.completedAt,
                    )}
                    s
                  </span>
                </div>

                {nodeRun.error && (
                  <div className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded truncate">
                    {nodeRun.error}
                  </div>
                )}

                {nodeRun.output !== null && nodeRun.output !== undefined && (
                  <div className="mt-2 text-xs text-zinc-300 bg-white/5 p-2 rounded max-h-16 overflow-hidden">
                    <div className="text-zinc-500 mb-1">Output:</div>
                    <div className="line-clamp-3">
                      {typeof nodeRun.output === "string"
                        ? (nodeRun.output as string)
                        : JSON.stringify(nodeRun.output)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

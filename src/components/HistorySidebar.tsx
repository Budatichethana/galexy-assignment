"use client";

import { useState, useEffect } from "react";
import { RunItem } from "./RunItem";
import { NodeRunItem } from "./NodeRunItem";
import { StatusDot } from "./StatusDot";

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

interface HistorySidebarProps {
  workflowId: string;
}

function calculateDuration(start: string, end?: string): string {
  const startTime = new Date(start);
  const endTime = end ? new Date(end) : new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;

  if (duration < 1) return "< 1s";
  if (duration < 60) return `${duration.toFixed(1)}s`;
  return `${(duration / 60).toFixed(1)}m`;
}

export function HistorySidebar({ workflowId }: HistorySidebarProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Fetch runs on mount
  useEffect(() => {
    if (!workflowId) return;

    const fetchRuns = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/workflows/${encodeURIComponent(workflowId)}/runs`,
        );
        const data = (await response.json()) as { runs?: WorkflowRun[] };

        if (response.ok && data.runs) {
          setRuns(data.runs);
          if (data.runs.length > 0 && !selectedRun) {
            setSelectedRun(data.runs[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch runs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRuns();
  }, [workflowId]);

  // Fetch run details when selected run changes
  useEffect(() => {
    if (!selectedRun) return;

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const response = await fetch(
          `/api/runs/${encodeURIComponent(selectedRun.id)}`,
        );
        const data = (await response.json()) as WorkflowRun;

        if (response.ok) {
          setSelectedRun(data);
        }
      } catch (error) {
        console.error("Failed to fetch run details:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedRun?.id]);

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-white/5 border-l border-white/10 backdrop-blur-xl flex flex-col shadow-2xl">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-4">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
          Execution History
        </h2>
        <p className="text-xs text-zinc-400 mt-1">Recent workflow runs</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Runs List */}
        <div
          className={`border-r border-white/10 flex flex-col overflow-hidden transition-all ${
            selectedRun ? "w-32" : "w-full"
          }`}
        >
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-zinc-500">Loading runs...</p>
            </div>
          ) : runs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-xs text-zinc-500 text-center">
                No workflow runs yet
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-1 p-2">
                {runs.map((run) => (
                  <RunItem
                    key={run.id}
                    runId={run.id}
                    status={run.status as "success" | "failed" | "running"}
                    duration={calculateDuration(
                      run.startedAt,
                      run.completedAt,
                    )}
                    isSelected={selectedRun?.id === run.id}
                    onClick={() => setSelectedRun(run)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Details Panel */}
        {selectedRun && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Details Header */}
            <div className="border-b border-white/10 px-4 py-3 bg-white/5">
              <div className="flex items-center gap-2 mb-2">
                <StatusDot
                  status={
                    selectedRun.status as
                      | "success"
                      | "failed"
                      | "running"
                  }
                />
                <span className="text-xs font-semibold text-zinc-200">
                  {selectedRun.status.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-zinc-400">
                Duration:{" "}
                <span className="text-zinc-300 font-mono">
                  {calculateDuration(
                    selectedRun.startedAt,
                    selectedRun.completedAt,
                  )}
                </span>
              </div>
              <div className="text-xs text-zinc-500 mt-1 font-mono break-all">
                {selectedRun.id}
              </div>
            </div>

            {/* Node Runs List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-zinc-500">Loading details...</p>
                </div>
              ) : selectedRun.nodeRuns && selectedRun.nodeRuns.length > 0 ? (
                <div className="p-3 space-y-3">
                  {selectedRun.nodeRuns.map((nodeRun) => (
                    <NodeRunItem
                      key={nodeRun.id}
                      nodeId={nodeRun.nodeId}
                      nodeType={nodeRun.nodeType}
                      status={nodeRun.status as "success" | "failed" | "running"}
                      duration={calculateDuration(
                        nodeRun.startedAt,
                        nodeRun.completedAt,
                      )}
                      error={nodeRun.error}
                      output={nodeRun.output}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-4">
                  <p className="text-xs text-zinc-500 text-center">
                    No node executions
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

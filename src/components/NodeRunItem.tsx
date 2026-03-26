"use client";

import { StatusDot } from "./StatusDot";

interface NodeRunItemProps {
  nodeId: string;
  nodeType: string;
  status: "success" | "failed" | "running";
  duration: string;
  error?: string;
  output?: unknown;
}

export function NodeRunItem({
  nodeId,
  nodeType,
  status,
  duration,
  error,
  output,
}: NodeRunItemProps) {
  return (
    <div className="border-l-2 border-white/10 pl-3 py-2">
      <div className="flex items-start gap-2">
        <StatusDot status={status} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-300 truncate">
              {nodeId}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
              {nodeType}
            </span>
          </div>

          <div className="mt-1 text-xs text-zinc-400">{duration}s</div>

          {error && (
            <div className="mt-2 text-xs text-red-400 bg-red-500/10 p-1.5 rounded truncate">
              {error}
            </div>
          )}

          {output !== null && output !== undefined && status === "success" && (
            <div className="mt-2 text-xs text-zinc-300 bg-white/5 p-1.5 rounded max-h-20 overflow-hidden line-clamp-3">
              {typeof output === "string"
                ? (output as string)
                : JSON.stringify(output).substring(0, 100)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

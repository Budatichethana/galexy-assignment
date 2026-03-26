"use client";

import { StatusDot } from "./StatusDot";

interface RunItemProps {
  runId: string;
  status: "success" | "failed" | "running";
  duration: string;
  isSelected: boolean;
  onClick: () => void;
}

export function RunItem({
  runId,
  status,
  duration,
  isSelected,
  onClick,
}: RunItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
        isSelected
          ? "bg-white/10 border border-white/20"
          : "hover:bg-white/5 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2">
        <StatusDot status={status} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-cyan-300 truncate">
            {runId.substring(0, 8)}...
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">{duration}</div>
        </div>
      </div>
    </button>
  );
}
